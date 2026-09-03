package com.scanapp

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.math.abs

@RunWith(AndroidJUnit4::class)
class PerspectiveWarperInstrumentedTest {
  @Test
  fun frontFacingRectanglePreservesAspectRatio() {
    val source = Bitmap.createBitmap(400, 300, Bitmap.Config.ARGB_8888)
    try {
      Canvas(source).drawColor(Color.WHITE)
      val result = PerspectiveWarper.warp(source, quad(0.10, 0.10, 0.90, 0.10, 0.90, 0.90, 0.10, 0.90))

      try {
        assertEquals(321, result.width)
        assertEquals(241, result.height)
        assertTrue(abs(result.width.toFloat() / result.height - 4f / 3f) < 0.02f)
      } finally {
        result.recycle()
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun tiltedQuadrilateralIsWarpedToAnApproximateRectangle() {
    val source = Bitmap.createBitmap(400, 300, Bitmap.Config.ARGB_8888)
    try {
      Canvas(source).apply {
        drawColor(Color.DKGRAY)
        drawRect(50f, 40f, 350f, 260f, Paint().apply { color = Color.WHITE })
      }
      val result = PerspectiveWarper.warp(source, quad(0.20, 0.20, 0.80, 0.13, 0.825, 0.80, 0.175, 0.87))

      try {
        assertTrue(result.width >= 240)
        assertTrue(result.width <= source.width)
        assertTrue(result.height >= 180)
        assertTrue(result.height <= source.height)
        assertTrue(abs(result.width.toFloat() / result.height - 1.33f) < 0.12f)
      } finally {
        result.recycle()
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun fullImageQuadDoesNotUpscaleTheSource() {
    val source = Bitmap.createBitmap(400, 300, Bitmap.Config.ARGB_8888)
    try {
      val result = PerspectiveWarper.warp(source, quad(0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0))

      try {
        assertEquals(source.width, result.width)
        assertEquals(source.height, result.height)
      } finally {
        result.recycle()
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun invalidQuadInputsFailInsteadOfReturningTheSourceBitmap() {
    val source = Bitmap.createBitmap(100, 100, Bitmap.Config.ARGB_8888)
    try {
      assertFails { PerspectiveWarper.warp(source, quad(0.1, 0.1, 0.9, 0.9, 0.9, 0.1, 0.1, 0.9)) }
      assertFails { PerspectiveWarper.warp(source, quad(0.1, 0.1, 0.1, 0.1, 0.9, 0.9, 0.1, 0.9)) }
      assertFails { PerspectiveWarper.warp(source, quad(-0.1, 0.1, 0.9, 0.1, 0.9, 0.9, 0.1, 0.9)) }
    } finally {
      source.recycle()
    }
  }

  private fun quad(vararg values: Double): ScanQuad = ScanQuad(
    ScanPoint(values[0], values[1]),
    ScanPoint(values[2], values[3]),
    ScanPoint(values[4], values[5]),
    ScanPoint(values[6], values[7]),
  )

  private fun assertFails(block: () -> Unit) {
    try {
      block()
      throw AssertionError("expected invalid crop to fail")
    } catch (_: IllegalArgumentException) {
      // Expected validation failure.
    }
  }
}
