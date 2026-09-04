package com.scanapp

import com.scanapp.fairscan.imageprocessing.ImageSize
import com.scanapp.fairscan.imageprocessing.Point
import com.scanapp.fairscan.imageprocessing.Quad
import com.scanapp.fairscan.imageprocessing.Mode
import com.scanapp.fairscan.imageprocessing.detectionThresholds
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FairScanDocumentDetectorTest {
  @Test
  fun analysisModesPreserveCaptureImportAndLiveSemantics() {
    assertEquals(Mode.CAPTURE, AnalysisMode.CAPTURE.toFairScanMode())
    assertEquals(Mode.IMPORT, AnalysisMode.IMPORT.toFairScanMode())
    assertEquals(Mode.LIVE_ANALYSIS, AnalysisMode.LIVE_ANALYSIS.toFairScanMode())
  }

  @Test
  fun captureAndImportUseAdaptiveThresholdsWhileLiveUsesOneFastThreshold() {
    assertTrue(Mode.CAPTURE.detectionThresholds().size > 1)
    assertTrue(Mode.IMPORT.detectionThresholds().size > 1)
    assertEquals(listOf(0.9), Mode.LIVE_ANALYSIS.detectionThresholds())
  }

  @Test
  fun mapsMaskQuadToNormalizedOriginalCoordinatesInClockwiseOrder() {
    val mapped = FairScanDocumentDetector.mapQuadToNormalized(
      Quad(Point(26, 22), Point(232, 18), Point(238, 230), Point(20, 236)),
      ImageSize(256, 256),
    )

    assertNotNull(mapped)
    mapped!!
    assertNear(0.1016, mapped.topLeft.x)
    assertNear(0.0859, mapped.topLeft.y)
    assertNear(0.9063, mapped.topRight.x)
    assertNear(0.0703, mapped.topRight.y)
    assertNear(0.9297, mapped.bottomRight.x)
    assertNear(0.8984, mapped.bottomRight.y)
    assertTrue(QuadGeometry.isValidNormalizedQuad(mapped))
  }

  @Test
  fun refusesOutOfBoundsOrDegenerateMappedQuad() {
    assertNull(
      FairScanDocumentDetector.mapQuadToNormalized(
        Quad(Point(-2, 10), Point(230, 10), Point(230, 210), Point(10, 210)),
        ImageSize(256, 256),
      ),
    )
    val selfIntersecting = FairScanDocumentDetector.mapQuadToNormalized(
      Quad(Point(20, 20), Point(230, 230), Point(230, 20), Point(20, 230)),
      ImageSize(256, 256),
    )
    assertNull(selfIntersecting)
  }

  @Test
  fun mapsMaskCoordinatesBackToNonSquareOriginalImage() {
    val mapped = FairScanDocumentDetector.mapQuadToNormalized(
      Quad(Point(25, 20), Point(230, 20), Point(230, 230), Point(25, 230)),
      ImageSize(256, 256),
      ImageSize(1024, 768),
    )

    assertNotNull(mapped)
    mapped!!
    assertNear(0.0977, mapped.topLeft.x)
    assertNear(0.0781, mapped.topLeft.y)
    assertNear(0.8984, mapped.bottomRight.x)
    assertNear(0.8984, mapped.bottomRight.y)
  }

  @Test
  fun canonicalizesUnorderedQuadToTopLeftTopRightBottomRightBottomLeft() {
    val mapped = FairScanDocumentDetector.mapQuadToNormalized(
      Quad(Point(230, 230), Point(25, 230), Point(25, 20), Point(230, 20)),
      ImageSize(256, 256),
    )

    assertNotNull(mapped)
    mapped!!
    assertNear(25.0 / 256.0, mapped.topLeft.x)
    assertNear(20.0 / 256.0, mapped.topLeft.y)
    assertNear(230.0 / 256.0, mapped.topRight.x)
    assertNear(20.0 / 256.0, mapped.topRight.y)
    assertNear(230.0 / 256.0, mapped.bottomRight.x)
    assertNear(230.0 / 256.0, mapped.bottomRight.y)
    assertNear(25.0 / 256.0, mapped.bottomLeft.x)
    assertNear(230.0 / 256.0, mapped.bottomLeft.y)
  }

  private fun assertNear(expected: Double, actual: Double) {
    assertTrue("expected=$expected actual=$actual", kotlin.math.abs(expected - actual) < 0.0001)
  }
}
