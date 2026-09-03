package com.scanapp

import android.graphics.Bitmap
import kotlin.math.hypot
import kotlin.math.max
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/** Applies a validated four-point perspective transform to a source bitmap. */
object PerspectiveWarper {
  fun warp(source: Bitmap, cornersNormalized: ScanQuad): Bitmap {
    require(!source.isRecycled && source.width > 0 && source.height > 0) { "源图片无效" }
    require(QuadGeometry.isValidNormalizedQuad(cornersNormalized)) { "四角坐标无效" }

    ensureOpenCvLoaded()

    val sourcePoints = cornersNormalized.toPixelPoints(source.width, source.height)
    val targetWidth = (max(
      distance(sourcePoints[0], sourcePoints[1]),
      distance(sourcePoints[3], sourcePoints[2]),
    ).toInt() + 1).coerceIn(1, source.width)
    val targetHeight = (max(
      distance(sourcePoints[0], sourcePoints[3]),
      distance(sourcePoints[1], sourcePoints[2]),
    ).toInt() + 1).coerceIn(1, source.height)

    val sourceMat = Mat()
    val destinationMat = Mat()
    val sourceCorners = MatOfPoint2f(*sourcePoints)
    val destinationCorners = MatOfPoint2f(
      Point(0.0, 0.0),
      Point((targetWidth - 1).toDouble(), 0.0),
      Point((targetWidth - 1).toDouble(), (targetHeight - 1).toDouble()),
      Point(0.0, (targetHeight - 1).toDouble()),
    )
    var transform: Mat? = null
    var output: Bitmap? = null
    try {
      Utils.bitmapToMat(source, sourceMat)
      transform = Imgproc.getPerspectiveTransform(sourceCorners, destinationCorners)
      Imgproc.warpPerspective(
        sourceMat,
        destinationMat,
        transform,
        Size(targetWidth.toDouble(), targetHeight.toDouble()),
        Imgproc.INTER_LINEAR,
        Core.BORDER_REPLICATE,
      )
      check(!destinationMat.empty()) { "透视矫正未生成图片" }
      output = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
      Utils.matToBitmap(destinationMat, output)
      return output
    } catch (error: Throwable) {
      output?.recycle()
      throw error
    } finally {
      transform?.release()
      destinationCorners.release()
      sourceCorners.release()
      destinationMat.release()
      sourceMat.release()
    }
  }

  private fun ensureOpenCvLoaded() {
    if (!OpenCVLoader.initDebug()) {
      System.loadLibrary("opencv_java4")
    }
  }

  private fun ScanQuad.toPixelPoints(width: Int, height: Int): Array<Point> = arrayOf(
    topLeft.toPixelPoint(width, height),
    topRight.toPixelPoint(width, height),
    bottomRight.toPixelPoint(width, height),
    bottomLeft.toPixelPoint(width, height),
  )

  private fun ScanPoint.toPixelPoint(width: Int, height: Int): Point =
    Point(x * width, y * height)

  private fun distance(first: Point, second: Point): Double =
    hypot(second.x - first.x, second.y - first.y)
}
