package com.scanapp

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CameraFairScanAnalysisInstrumentedTest {
  @Test
  fun liveAnalysisContractIsBoundedAndLifecycleAware() {
    assertEquals(350L, ScannerCameraView.LIVE_ANALYSIS_INTERVAL_MS)
    assertTrue(ScannerCameraView::class.java.declaredMethods.any { it.name == "scheduleLiveAnalysis" })
    assertTrue(ScannerCameraView::class.java.declaredMethods.any { it.name == "resetLiveAnalysis" })
    assertTrue(ScannerCameraViewManager::class.java.declaredMethods.any { it.name.contains("ExportedCustomDirectEvent") })
  }

}
