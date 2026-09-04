package com.scanapp

import android.content.Context
import android.graphics.Bitmap
import com.scanapp.fairscan.imageprocessing.ImageSize
import com.scanapp.fairscan.imageprocessing.Mask
import com.scanapp.fairscan.imageprocessing.Quad
import com.scanapp.fairscan.imageprocessing.detectDocumentQuad
import com.scanapp.fairscan.segmentation.FairScanSegmentationService
import com.scanapp.fairscan.segmentation.SegmentationAnalysis
import com.scanapp.fairscan.segmentation.SegmentationAvailability
import kotlin.math.abs
import org.opencv.android.OpenCVLoader
import org.opencv.core.CvType
import org.opencv.core.Mat

/** Adapts the FairScan probability-map pipeline to the app's normalized geometry. */
class FairScanDocumentDetector(
  context: Context,
  private val segmentation: FairScanSegmentationService = FairScanSegmentationService(context),
) : AutoCloseable {
  data class Detection(
    val quad: ScanQuad,
    val confidence: Float,
    val source: DocumentDetector.Source = DocumentDetector.Source.FAIRSCAN,
  )

  fun detect(bitmap: Bitmap, mode: AnalysisMode = AnalysisMode.CAPTURE): Detection? {
    if (bitmap.isRecycled || bitmap.width < 2 || bitmap.height < 2) return null
    val analysis = segmentation.analyze(bitmap) ?: return null
    if (analysis.availability != SegmentationAvailability.READY) {
      analysis.probabilityMask.release()
      return null
    }
    return try {
      detectAnalysis(analysis, mode)
    } finally {
      analysis.probabilityMask.release()
    }
  }

  override fun close() = segmentation.close()

  private fun detectAnalysis(analysis: SegmentationAnalysis, mode: AnalysisMode): Detection? =
    detectProbabilityMask(analysis.probabilityMask, analysis.originalSize, mode)

  companion object {
    /** Runs the upstream detector on a caller-owned CV_32F probability mask. */
    fun detectProbabilityMask(mask: Mat, originalSize: ImageSize, mode: AnalysisMode): Detection? {
      if (mask.empty() || mask.rows() < 2 || mask.cols() < 2 || mask.type() != CvType.CV_32FC1) return null
      ensureOpenCvLoaded()
      val fairMask = object : Mask {
        override val width: Int = mask.cols()
        override val height: Int = mask.rows()
        // The detector only reads the probability map. Returning the caller-owned
        // Mat avoids an otherwise unbounded clone on every live-analysis frame.
        override fun toMat(): Mat = mask
      }
      val quad = try {
        detectDocumentQuad(fairMask, originalSize, mode.toFairScanMode())
      } catch (_: Throwable) {
        null
      }
      if (quad == null) return null
      val normalized = mapQuadToNormalized(quad, ImageSize(mask.cols(), mask.rows()), originalSize) ?: return null
      val area = normalizedArea(normalized)
      if (area < 0.02) return null
      val confidence = (0.55 + area.coerceIn(0.0, 0.4)).toFloat().coerceIn(0f, 0.99f)
      return Detection(normalized, confidence)
    }

    fun mapQuadToNormalized(quad: Quad, maskSize: ImageSize): ScanQuad? {
      return mapQuadToNormalized(quad, maskSize, maskSize)
    }

    fun mapQuadToNormalized(quad: Quad, maskSize: ImageSize, originalSize: ImageSize): ScanQuad? {
      if (maskSize.width <= 0.0 || maskSize.height <= 0.0) return null
      if (originalSize.width <= 0.0 || originalSize.height <= 0.0) return null
      if (!quad.isConvex()) return null
      val scaleX = originalSize.width / maskSize.width
      val scaleY = originalSize.height / maskSize.height
      val points = listOf(quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft)
      val topLeft = points.minByOrNull { it.x + it.y } ?: return null
      val bottomRight = points.maxByOrNull { it.x + it.y } ?: return null
      val topRight = points.minByOrNull { it.y - it.x } ?: return null
      val bottomLeft = points.maxByOrNull { it.y - it.x } ?: return null
      if (setOf(topLeft, topRight, bottomRight, bottomLeft).size != 4) return null
      val mapped = ScanQuad(
        ScanPoint(topLeft.x * scaleX / originalSize.width, topLeft.y * scaleY / originalSize.height),
        ScanPoint(topRight.x * scaleX / originalSize.width, topRight.y * scaleY / originalSize.height),
        ScanPoint(bottomRight.x * scaleX / originalSize.width, bottomRight.y * scaleY / originalSize.height),
        ScanPoint(bottomLeft.x * scaleX / originalSize.width, bottomLeft.y * scaleY / originalSize.height),
      )
      if (listOf(mapped.topLeft, mapped.topRight, mapped.bottomRight, mapped.bottomLeft)
          .any { !it.x.isFinite() || !it.y.isFinite() || it.x < 0.0 || it.x > 1.0 || it.y < 0.0 || it.y > 1.0 }) return null
      return mapped.takeIf(QuadGeometry::isValidNormalizedQuad)
    }

    private fun normalizedArea(quad: ScanQuad): Double {
      val points = listOf(quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft)
      return abs(points.indices.sumOf { i ->
        val a = points[i]
        val b = points[(i + 1) % points.size]
        a.x * b.y - a.y * b.x
      }) / 2.0
    }

    private fun ensureOpenCvLoaded() {
      if (!OpenCVLoader.initDebug()) System.loadLibrary("opencv_java4")
    }
  }
}
