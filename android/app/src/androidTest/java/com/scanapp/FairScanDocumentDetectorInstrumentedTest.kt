package com.scanapp

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scanapp.fairscan.imageprocessing.ImageSize
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.opencv.android.OpenCVLoader
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import kotlin.math.abs

@RunWith(AndroidJUnit4::class)
class FairScanDocumentDetectorInstrumentedTest {
  @Test
  fun controlledMasksProduceNormalizedClockwiseDocumentQuads() {
    ensureOpenCvLoaded()
    val frontFacing = filledMask(256, 256, intArrayOf(24, 20, 232, 236))
    val tilted = polygonMask(256, 256, floatArrayOf(30f, 40f, 218f, 22f, 236f, 224f, 18f, 232f))
    try {
      val front = FairScanDocumentDetector.detectProbabilityMask(frontFacing, ImageSize(256, 256), AnalysisMode.CAPTURE)
      val card = FairScanDocumentDetector.detectProbabilityMask(tilted, ImageSize(256, 256), AnalysisMode.IMPORT)

      assertDetection(front, 0.09, 0.07, 0.91, 0.93)
      assertNotNull(card)
      assertTrue(QuadGeometry.isValidNormalizedQuad(card!!.quad))
      assertTrue(card.confidence in 0f..1f)
      assertEquals(DocumentDetector.Source.FAIRSCAN, card.source)
    } finally {
      frontFacing.release()
      tilted.release()
    }
  }

  @Test
  fun selectsTheLargestDocumentCandidateAndSurvivesBrokenEdges() {
    ensureOpenCvLoaded()
    val twoCandidates = Mat.zeros(256, 256, CvType.CV_32FC1)
    val brokenEdges = Mat.zeros(256, 256, CvType.CV_32FC1)
    try {
      Imgproc.rectangle(twoCandidates, org.opencv.core.Point(18.0, 20.0), org.opencv.core.Point(106.0, 120.0), org.opencv.core.Scalar(1.0), -1)
      Imgproc.rectangle(twoCandidates, org.opencv.core.Point(120.0, 30.0), org.opencv.core.Point(238.0, 232.0), org.opencv.core.Scalar(1.0), -1)
      Imgproc.rectangle(brokenEdges, org.opencv.core.Point(24.0, 22.0), org.opencv.core.Point(232.0, 234.0), org.opencv.core.Scalar(1.0), -1)
      Imgproc.line(brokenEdges, org.opencv.core.Point(118.0, 22.0), org.opencv.core.Point(146.0, 22.0), org.opencv.core.Scalar(0.0), 8)
      Imgproc.line(brokenEdges, org.opencv.core.Point(232.0, 112.0), org.opencv.core.Point(232.0, 140.0), org.opencv.core.Scalar(0.0), 8)

      val largest = FairScanDocumentDetector.detectProbabilityMask(twoCandidates, ImageSize(1024, 768), AnalysisMode.CAPTURE)
      val repaired = FairScanDocumentDetector.detectProbabilityMask(brokenEdges, ImageSize(1024, 768), AnalysisMode.CAPTURE)

      assertNotNull(largest)
      assertTrue(largest!!.quad.topLeft.x > 0.40)
      assertNotNull(repaired)
      assertTrue(QuadGeometry.isValidNormalizedQuad(repaired!!.quad))
    } finally {
      twoCandidates.release()
      brokenEdges.release()
    }
  }

  @Test
  fun emptyMaskReturnsNullWithoutPretendingToBeAConfidentDocument() {
    ensureOpenCvLoaded()
    val empty = Mat.zeros(256, 256, CvType.CV_32FC1)
    try {
      assertNull(FairScanDocumentDetector.detectProbabilityMask(empty, ImageSize(256, 256), AnalysisMode.CAPTURE))
    } finally {
      empty.release()
    }
  }

  private fun assertDetection(detection: FairScanDocumentDetector.Detection?, left: Double, top: Double, right: Double, bottom: Double) {
    assertNotNull(detection)
    detection!!
    assertEquals(DocumentDetector.Source.FAIRSCAN, detection.source)
    assertTrue(detection.confidence in 0f..1f)
    assertTrue(QuadGeometry.isValidNormalizedQuad(detection.quad))
    assertNear(left, detection.quad.topLeft.x, 0.02)
    assertNear(top, detection.quad.topLeft.y, 0.02)
    assertNear(right, detection.quad.bottomRight.x, 0.02)
    assertNear(bottom, detection.quad.bottomRight.y, 0.02)
  }

  private fun filledMask(width: Int, height: Int, bounds: IntArray): Mat = Mat.zeros(height, width, CvType.CV_32FC1).also { mask ->
    Imgproc.rectangle(mask, org.opencv.core.Point(bounds[0].toDouble(), bounds[1].toDouble()), org.opencv.core.Point(bounds[2].toDouble(), bounds[3].toDouble()), org.opencv.core.Scalar(1.0), -1)
  }

  private fun polygonMask(width: Int, height: Int, points: FloatArray): Mat = Mat.zeros(height, width, CvType.CV_32FC1).also { mask ->
    val polygon = org.opencv.core.MatOfPoint(*points.asList().chunked(2).map { org.opencv.core.Point(it[0].toDouble(), it[1].toDouble()) }.toTypedArray())
    try {
      Imgproc.fillConvexPoly(mask, polygon, org.opencv.core.Scalar(1.0))
    } finally {
      polygon.release()
    }
  }

  private fun ensureOpenCvLoaded() {
    if (!OpenCVLoader.initDebug()) System.loadLibrary("opencv_java4")
  }

  private fun assertNear(expected: Double, actual: Double, tolerance: Double) {
    assertTrue("expected=$expected actual=$actual", abs(expected - actual) <= tolerance)
  }
}
