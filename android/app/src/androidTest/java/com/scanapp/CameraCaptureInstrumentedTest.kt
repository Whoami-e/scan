package com.scanapp

import android.view.Surface
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CameraCaptureInstrumentedTest {
  @Test
  fun cameraViewExposesPauseCleanupAndOrientationContract() {
    val cameraMethods = ScannerCameraView::class.java.declaredMethods.map { it.name }.toSet()
    val activityMethods = MainActivity::class.java.declaredMethods.map { it.name }.toSet()

    assertTrue("onHostPause must clear pending captures", "onHostPause" in cameraMethods)
    assertTrue("clearPendingCapture must be independently testable", "clearPendingCapture" in cameraMethods)
    assertTrue("activity must forward pause", "onPause" in activityMethods)
    assertTrue("orientation must be exposed as a pure calculation", "calculateImageRotation" in cameraMethods)
  }

  @Test
  fun backCameraRotationMatchesSensorAndDisplayOrientation() {
    assertEquals(90, ScannerCameraView.imageRotationFor(90, Surface.ROTATION_0))
    assertEquals(0, ScannerCameraView.imageRotationFor(90, Surface.ROTATION_90))
    assertEquals(270, ScannerCameraView.imageRotationFor(90, Surface.ROTATION_180))
    assertEquals(180, ScannerCameraView.imageRotationFor(90, Surface.ROTATION_270))
  }
}
