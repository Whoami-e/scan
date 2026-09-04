package com.scanapp.fairscan.segmentation

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Matrix
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FairScanSegmentationServiceInstrumentedTest {
  @Test
  fun analysisMapsNormalizedMaskToTheRotatedOriginalBitmap() {
    val source = Bitmap.createBitmap(48, 80, Bitmap.Config.ARGB_8888)
    source.eraseColor(Color.BLACK)
    // Use a document-shaped region so the bundled model receives a meaningful
    // spatial signal instead of a mostly black image with one isolated pixel.
    for (y in 10 until 70) {
      for (x in 6 until 42) source.setPixel(x, y, Color.WHITE)
    }
    val rotated = Bitmap.createBitmap(source, 0, 0, source.width, source.height, Matrix().apply { postRotate(90f) }, true)
    source.recycle()
    val service = FairScanSegmentationService(ApplicationProvider.getApplicationContext())

    try {
      assertEquals(SegmentationAvailability.READY, service.availability)
      val analysis = service.analyze(rotated)
      assertNotNull("verified asset should produce an analysis", analysis)
      analysis!!
      try {
        assertEquals(rotated.width.toDouble(), analysis.originalSize.width, 0.0)
        assertEquals(rotated.height.toDouble(), analysis.originalSize.height, 0.0)
        assertEquals(256.0, analysis.maskSize.width, 0.0)
        assertEquals(256.0, analysis.maskSize.height, 0.0)
        assertEquals(SegmentationAvailability.READY, analysis.availability)
        for (row in 0 until analysis.probabilityMask.rows()) {
          for (column in 0 until analysis.probabilityMask.cols()) {
            assertTrue(analysis.probabilityMask.get(row, column)[0] in 0.0..1.0)
          }
        }
        val maskValues = (0 until analysis.probabilityMask.rows()).flatMap { row ->
          (0 until analysis.probabilityMask.cols()).map { column -> analysis.probabilityMask.get(row, column)[0] }
        }
        assertTrue("fixture should produce a non-constant probability field", maskValues.toSet().size > 1)
      } finally {
        analysis.probabilityMask.release()
      }

      listOf(
        com.scanapp.fairscan.imageprocessing.AnalysisMode.IMPORT,
        com.scanapp.fairscan.imageprocessing.AnalysisMode.LIVE_ANALYSIS,
      ).forEach { mode ->
        val modeAnalysis = service.analyze(rotated, mode)
        assertNotNull(modeAnalysis)
        modeAnalysis?.probabilityMask?.release()
      }
    } finally {
      service.close()
      rotated.recycle()
    }
  }
}
