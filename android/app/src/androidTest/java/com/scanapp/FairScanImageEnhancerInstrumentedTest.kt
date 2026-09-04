package com.scanapp

import android.graphics.Bitmap
import android.graphics.Color
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FairScanImageEnhancerInstrumentedTest {
  @Test
  fun allModesKeepDimensionsAndExpectedChannelSemantics() {
    val source = lowContrastColorDocument(96, 144)
    try {
      val original = ImageEnhancer.apply(source, "original")
      val enhanced = ImageEnhancer.apply(source, "enhanced")
      val grayscale = ImageEnhancer.apply(source, "grayscale")
      val blackwhite = ImageEnhancer.apply(source, "blackwhite")
      try {
        listOf(original, enhanced, grayscale, blackwhite).forEach {
          assertEquals(96, it.width)
          assertEquals(144, it.height)
        }

        assertEquals(source.getPixel(24, 72), original.getPixel(24, 72))
        assertTrue(channelSpread(enhanced.getPixel(72, 72)) > 2)
        assertTrue(luminanceRange(enhanced) > luminanceRange(source))

        val grayPixel = grayscale.getPixel(72, 72)
        assertTrue(abs(Color.red(grayPixel) - Color.green(grayPixel)) <= 1)
        assertTrue(abs(Color.green(grayPixel) - Color.blue(grayPixel)) <= 1)

        for (y in 0 until blackwhite.height step 9) {
          for (x in 0 until blackwhite.width step 7) {
            val pixel = blackwhite.getPixel(x, y)
            assertTrue(Color.red(pixel) == 0 || Color.red(pixel) == 255)
            assertEquals(Color.red(pixel), Color.green(pixel))
            assertEquals(Color.green(pixel), Color.blue(pixel))
          }
        }
      } finally {
        original.recycle()
        enhanced.recycle()
        grayscale.recycle()
        blackwhite.recycle()
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun invalidWireModeFailsWithoutChangingSource() {
    val source = lowContrastColorDocument(32, 48)
    val before = source.getPixel(16, 24)
    try {
      try {
        ImageEnhancer.apply(source, "posterize")
        throw AssertionError("expected invalid enhancement mode to fail")
      } catch (_: IllegalArgumentException) {
        assertEquals(before, source.getPixel(16, 24))
      }
    } finally {
      source.recycle()
    }
  }

  @Test
  fun largeLandscapeImageReturnsAtOriginalOrientationAndSize() {
    val source = lowContrastColorDocument(4097, 5)
    try {
      val enhanced = ImageEnhancer.apply(source, "enhanced")
      try {
        assertEquals(4097, enhanced.width)
        assertEquals(5, enhanced.height)
        assertNotEquals(0, enhanced.getPixel(2048, 2))
      } finally {
        enhanced.recycle()
      }
    } finally {
      source.recycle()
    }
  }

  private fun lowContrastColorDocument(width: Int, height: Int): Bitmap =
    Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { bitmap ->
      for (y in 0 until height) {
        for (x in 0 until width) {
          val base = 104 + (x * 24 / width.coerceAtLeast(1))
          bitmap.setPixel(x, y, Color.rgb(base + 12, base, base - 10))
        }
      }
    }

  private fun channelSpread(pixel: Int): Int {
    val channels = listOf(Color.red(pixel), Color.green(pixel), Color.blue(pixel))
    return channels.maxOrNull()!! - channels.minOrNull()!!
  }

  private fun luminanceRange(bitmap: Bitmap): Int {
    var minimum = 255
    var maximum = 0
    for (y in 0 until bitmap.height step maxOf(1, bitmap.height / 24)) {
      for (x in 0 until bitmap.width step maxOf(1, bitmap.width / 24)) {
        val value = Color.red(bitmap.getPixel(x, y))
        minimum = minOf(minimum, value)
        maximum = maxOf(maximum, value)
      }
    }
    return maximum - minimum
  }
}
