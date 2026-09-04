package com.scanapp

import android.graphics.Bitmap
import android.graphics.Color
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.math.abs

@RunWith(AndroidJUnit4::class)
class ImageEnhancerInstrumentedTest {
  @Test
  fun grayscaleMakesEachPixelUseOneLuminanceChannel() {
    val source = Bitmap.createBitmap(intArrayOf(Color.RED, Color.GREEN, Color.BLUE), 3, 1, Bitmap.Config.ARGB_8888)
    try {
      val result = ImageEnhancer.apply(source, ImageEnhancer.EnhanceMode.GRAYSCALE)
      try {
        for (x in 0 until result.width) {
          val pixel = result.getPixel(x, 0)
          assertTrue(abs(Color.red(pixel) - Color.green(pixel)) <= 1)
          assertTrue(abs(Color.green(pixel) - Color.blue(pixel)) <= 1)
        }
        assertTrue(abs(Color.red(result.getPixel(0, 0)) - 54) <= 2)
        assertTrue(abs(Color.red(result.getPixel(1, 0)) - 182) <= 2)
        assertTrue(abs(Color.red(result.getPixel(2, 0)) - 18) <= 2)
      } finally {
        if (result !== source) result.recycle()
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun originalKeepsDimensionsAndPixelsUnchanged() {
    val source = Bitmap.createBitmap(intArrayOf(Color.rgb(20, 40, 60), Color.rgb(180, 160, 140)), 2, 1, Bitmap.Config.ARGB_8888)
    try {
      val result = ImageEnhancer.apply(source, ImageEnhancer.EnhanceMode.ORIGINAL)
      try {
        assertEquals(source.width, result.width)
        assertEquals(source.height, result.height)
        assertNotSame(source, result)
        assertEquals(source.getPixel(0, 0), result.getPixel(0, 0))
        assertEquals(source.getPixel(1, 0), result.getPixel(1, 0))
      } finally {
        if (result !== source) result.recycle()
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun enhancedKeepsSourceDimensions() {
    val source = Bitmap.createBitmap(17, 11, Bitmap.Config.ARGB_8888)
    try {
      source.eraseColor(Color.rgb(90, 110, 130))
      val result = ImageEnhancer.apply(source, ImageEnhancer.EnhanceMode.ENHANCED)
      try {
        assertEquals(17, result.width)
        assertEquals(11, result.height)
        assertNotEquals(0, result.getPixel(8, 5))
      } finally {
        if (result !== source) result.recycle()
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun enhancedRestoresDimensionsAfterWorkingCopyLimit() {
    val source = Bitmap.createBitmap(4097, 3, Bitmap.Config.ARGB_8888)
    try {
      source.eraseColor(Color.rgb(90, 110, 130))
      val result = ImageEnhancer.apply(source, ImageEnhancer.EnhanceMode.ENHANCED)
      try {
        assertEquals(4097, result.width)
        assertEquals(3, result.height)
      } finally {
        if (result !== source) result.recycle()
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun invalidWireModeIsRejectedForEnhanceFailedBridgePath() {
    val source = Bitmap.createBitmap(2, 2, Bitmap.Config.ARGB_8888)
    try {
      try {
        ImageEnhancer.apply(source, "posterize")
        throw AssertionError("expected invalid enhancement mode to fail")
      } catch (_: IllegalArgumentException) {
        // ScannerModule maps this validation failure to ENHANCE_FAILED.
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun blackwhiteProducesBinaryPixels() {
    val source = Bitmap.createBitmap(intArrayOf(Color.BLACK, Color.WHITE, Color.GRAY), 3, 1, Bitmap.Config.ARGB_8888)
    try {
      val result = ImageEnhancer.apply(source, "blackwhite")
      try {
        for (x in 0 until result.width) {
          val pixel = result.getPixel(x, 0)
          assertTrue(Color.red(pixel) == 0 || Color.red(pixel) == 255)
          assertEquals(Color.red(pixel), Color.green(pixel))
          assertEquals(Color.green(pixel), Color.blue(pixel))
        }
      } finally { result.recycle() }
    } finally { source.recycle() }
  }
}
