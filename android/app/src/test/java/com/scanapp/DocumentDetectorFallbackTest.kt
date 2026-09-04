package com.scanapp

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DocumentDetectorFallbackTest {
  @Test
  fun fairScanShortCircuitsOpenCv() {
    var openCvCalled = false
    val fair = DocumentDetector.Detection(FloatArray(8), 0.8f, DocumentDetector.Source.FAIRSCAN)
    val result = DocumentDetector.chooseDetection(
      fairScan = { fair },
      openCv = { openCvCalled = true; null },
      fallback = { error("fallback should not run") },
    )
    assertEquals(DocumentDetector.Source.FAIRSCAN, result.source)
    assertFalse(openCvCalled)
  }

  @Test
  fun unavailableFairScanUsesOpenCvThenFallback() {
    val openCv = DocumentDetector.Detection(FloatArray(8), 0.7f, DocumentDetector.Source.OPENCV)
    assertEquals(DocumentDetector.Source.OPENCV, DocumentDetector.chooseDetection({ null }, { openCv }, { error("unused") }).source)
    val fallback = DocumentDetector.Detection(FloatArray(8), 0.2f, DocumentDetector.Source.FALLBACK)
    val result = DocumentDetector.chooseDetection({ null }, { null }, { fallback })
    assertEquals(DocumentDetector.Source.FALLBACK, result.source)
    assertTrue(result.confidence < 0.3f)
  }
}
