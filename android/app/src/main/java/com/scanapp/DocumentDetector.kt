package com.scanapp

import android.graphics.Bitmap
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint
import org.opencv.core.MatOfPoint2f
import org.opencv.core.MatOfInt
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/** OpenCV-backed document edge detection with a deliberately conservative fallback. */
object DocumentDetector {
  const val DETECTION_MAX_EDGE = 720
  private const val FALLBACK_MARGIN = 0.08f
  private const val FALLBACK_CONFIDENCE = 0.2f

  enum class Source { FAIRSCAN, OPENCV, FALLBACK }

  data class Detection(
    val cornersPx: FloatArray,
    val confidence: Float,
    val source: Source,
  )

  fun detect(bitmap: Bitmap, fairScan: FairScanDocumentDetector? = null, mode: AnalysisMode = AnalysisMode.CAPTURE): Detection {
    return chooseDetection(
      fairScan = { fairScan?.detect(bitmap, mode)?.let { result ->
      val p = result.quad
      Detection(floatArrayOf(
        (p.topLeft.x * bitmap.width).toFloat(), (p.topLeft.y * bitmap.height).toFloat(),
        (p.topRight.x * bitmap.width).toFloat(), (p.topRight.y * bitmap.height).toFloat(),
        (p.bottomRight.x * bitmap.width).toFloat(), (p.bottomRight.y * bitmap.height).toFloat(),
        (p.bottomLeft.x * bitmap.width).toFloat(), (p.bottomLeft.y * bitmap.height).toFloat(),
      ), result.confidence.coerceIn(0f, 1f), Source.FAIRSCAN)
    } },
      openCv = { detectWithOpenCv(bitmap) },
      fallback = { fallback(bitmap) },
    )
  }

  internal fun chooseDetection(
    fairScan: () -> Detection?,
    openCv: () -> Detection?,
    fallback: () -> Detection,
  ): Detection = fairScan() ?: openCv() ?: fallback()

  private fun detectWithOpenCv(bitmap: Bitmap): Detection {
    if (bitmap.width < 2 || bitmap.height < 2) return fallback(bitmap)

    var scaled: Bitmap? = null
    var rgba: Mat? = null
    var gray: Mat? = null
    var edges: Mat? = null
    var hierarchy: Mat? = null
    var contours: MutableList<MatOfPoint>? = null
    return try {
      if (!OpenCVLoader.initDebug()) {
        System.loadLibrary("opencv_java4")
      }

      val scale = min(1f, DETECTION_MAX_EDGE.toFloat() / max(bitmap.width, bitmap.height))
      val working = if (scale < 1f) {
        scaled = Bitmap.createScaledBitmap(bitmap, (bitmap.width * scale).toInt().coerceAtLeast(1), (bitmap.height * scale).toInt().coerceAtLeast(1), true)
        scaled!!
      } else bitmap

      rgba = Mat()
      gray = Mat()
      edges = Mat()
      hierarchy = Mat()
      Utils.bitmapToMat(working, rgba)
      Imgproc.cvtColor(rgba, gray, Imgproc.COLOR_RGBA2GRAY)
      Imgproc.GaussianBlur(gray, gray, Size(5.0, 5.0), 0.0)
      Imgproc.Canny(gray, edges, 50.0, 150.0)
      contours = mutableListOf()
      Imgproc.findContours(edges, contours, hierarchy, Imgproc.RETR_LIST, Imgproc.CHAIN_APPROX_SIMPLE)

      val workingArea = working.width.toDouble() * working.height.toDouble()
      var best: Candidate? = null
      contours!!.forEach { contour ->
        val contourPoints = contour.toArray()
        val hullIndices = MatOfInt()
        val hullPoints = MatOfPoint2f()
        val approximation = MatOfPoint2f()
        try {
          Imgproc.convexHull(contour, hullIndices)
          val hull = hullIndices.toArray().map { index -> contourPoints[index] }.toTypedArray()
          if (hull.size < 4) return@forEach
          hullPoints.fromArray(*hull)
          val perimeter = Imgproc.arcLength(hullPoints, true)
          if (perimeter <= 0.0) return@forEach
          Imgproc.approxPolyDP(hullPoints, approximation, perimeter * 0.02, true)
          val points = approximation.toArray()
          if (points.size != 4) return@forEach
          val area = abs(Imgproc.contourArea(approximation))
          val areaRatio = area / workingArea
          if (areaRatio < 0.04 || areaRatio > 0.99) return@forEach
          val ordered = orderCorners(points) ?: return@forEach
          if (!isValidPixelQuad(ordered, working.width, working.height)) return@forEach
          val rectangularity = quadrilateralRectangularity(ordered)
          if (rectangularity < 0.15) return@forEach
          val confidence = (0.45f + (areaRatio.toFloat() * 0.45f) + (rectangularity.toFloat() * 0.1f)).coerceIn(0.5f, 0.99f)
          if (best == null || areaRatio > best!!.areaRatio) best = Candidate(ordered, areaRatio, confidence)
        } finally {
          approximation.release()
          hullPoints.release()
          hullIndices.release()
        }
      }

      val candidate = best ?: return fallback(bitmap)
      val sx = bitmap.width.toFloat() / working.width.toFloat()
      val sy = bitmap.height.toFloat() / working.height.toFloat()
      val corners = FloatArray(8)
      candidate.points.forEachIndexed { index, point ->
        corners[index * 2] = (point.x * sx).toFloat()
        corners[index * 2 + 1] = (point.y * sy).toFloat()
      }
      Detection(corners, candidate.confidence, Source.OPENCV)
    } catch (_: Throwable) {
      fallback(bitmap)
    } finally {
      contours?.forEach { it.release() }
      hierarchy?.release()
      edges?.release()
      gray?.release()
      rgba?.release()
      scaled?.takeIf { it !== bitmap }?.recycle()
    }
  }

  private data class Candidate(val points: Array<Point>, val areaRatio: Double, val confidence: Float)

  private fun fallback(bitmap: Bitmap): Detection {
    val left = bitmap.width * FALLBACK_MARGIN
    val top = bitmap.height * FALLBACK_MARGIN
    val right = bitmap.width * (1f - FALLBACK_MARGIN)
    val bottom = bitmap.height * (1f - FALLBACK_MARGIN)
    return Detection(floatArrayOf(left, top, right, top, right, bottom, left, bottom), FALLBACK_CONFIDENCE, Source.FALLBACK)
  }

  private fun orderCorners(points: Array<Point>): Array<Point>? {
    if (points.size != 4) return null
    val topLeft = points.minByOrNull { it.x + it.y } ?: return null
    val bottomRight = points.maxByOrNull { it.x + it.y } ?: return null
    val topRight = points.minByOrNull { it.y - it.x } ?: return null
    val bottomLeft = points.maxByOrNull { it.y - it.x } ?: return null
    if (setOf(topLeft, topRight, bottomRight, bottomLeft).size != 4) return null
    return arrayOf(topLeft, topRight, bottomRight, bottomLeft)
  }

  private fun isValidPixelQuad(points: Array<Point>, width: Int, height: Int): Boolean {
    if (points.size != 4 || width <= 0 || height <= 0) return false
    val normalized = points.map { point -> ScanPoint(point.x / width, point.y / height) }
    return QuadGeometry.isValidNormalizedQuad(
      ScanQuad(normalized[0], normalized[1], normalized[2], normalized[3]),
    )
  }

  private fun quadrilateralRectangularity(points: Array<Point>): Double {
    val lengths = (0..3).map { index ->
      val a = points[index]
      val b = points[(index + 1) % 4]
      val dx = a.x - b.x
      val dy = a.y - b.y
      dx * dx + dy * dy
    }
    val oppositeBalance = min(lengths[0], lengths[2]) / max(lengths[0], lengths[2]) * min(lengths[1], lengths[3]) / max(lengths[1], lengths[3])
    return oppositeBalance.coerceIn(0.0, 1.0)
  }
}
