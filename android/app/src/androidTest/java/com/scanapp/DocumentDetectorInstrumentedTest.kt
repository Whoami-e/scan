package com.scanapp

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.math.abs

@RunWith(AndroidJUnit4::class)
class DocumentDetectorInstrumentedTest {
  @Test
  fun detectsAxisAlignedWhiteRectangleInClockwiseCornerOrder() {
    val bitmap = Bitmap.createBitmap(640, 480, Bitmap.Config.ARGB_8888)
    try {
      val canvas = Canvas(bitmap)
      canvas.drawColor(Color.rgb(24, 28, 32))
      canvas.drawRect(96f, 72f, 544f, 408f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE })

      val detection = DocumentDetector.detect(bitmap)

      assertEquals(DocumentDetector.Source.OPENCV, detection.source)
      assertTrue(detection.confidence in 0f..1f)
      assertNear(detection.cornersPx[0], 96f, 14f)
      assertNear(detection.cornersPx[1], 72f, 14f)
      assertNear(detection.cornersPx[2], 544f, 14f)
      assertNear(detection.cornersPx[3], 72f, 14f)
      assertNear(detection.cornersPx[4], 544f, 14f)
      assertNear(detection.cornersPx[5], 408f, 14f)
      assertNear(detection.cornersPx[6], 96f, 14f)
      assertNear(detection.cornersPx[7], 408f, 14f)
      assertClockwise(detection.cornersPx)
    } finally {
      bitmap.recycle()
    }
  }

  @Test
  fun detectsTiltedQuadrilateralWithClockwiseCorners() {
    val bitmap = Bitmap.createBitmap(800, 600, Bitmap.Config.ARGB_8888)
    try {
      val canvas = Canvas(bitmap)
      canvas.drawColor(Color.rgb(22, 25, 29))
      val path = Path().apply {
        moveTo(152f, 116f)
        lineTo(636f, 78f)
        lineTo(686f, 484f)
        lineTo(106f, 452f)
        close()
      }
      canvas.drawPath(path, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE })

      val detection = DocumentDetector.detect(bitmap)

      assertEquals(DocumentDetector.Source.OPENCV, detection.source)
      assertTrue(detection.confidence in 0f..1f)
      assertTrue(detection.cornersPx.size == 8)
      assertNear(detection.cornersPx[0], 152f, 20f)
      assertNear(detection.cornersPx[1], 116f, 20f)
      assertNear(detection.cornersPx[2], 636f, 20f)
      assertNear(detection.cornersPx[3], 78f, 20f)
      assertNear(detection.cornersPx[4], 686f, 20f)
      assertNear(detection.cornersPx[5], 484f, 20f)
      assertNear(detection.cornersPx[6], 106f, 20f)
      assertNear(detection.cornersPx[7], 452f, 20f)
      assertClockwise(detection.cornersPx)
    } finally {
      bitmap.recycle()
    }
  }

  @Test
  fun usesLowConfidenceFallbackForPureColorBackground() {
    val bitmap = Bitmap.createBitmap(320, 240, Bitmap.Config.ARGB_8888)
    try {
      bitmap.eraseColor(Color.rgb(128, 128, 128))

      val detection = DocumentDetector.detect(bitmap)

      assertEquals(DocumentDetector.Source.FALLBACK, detection.source)
      assertTrue(detection.confidence in 0f..0.5f)
      assertEquals(8, detection.cornersPx.size)
    } finally {
      bitmap.recycle()
    }
  }

  @Test
  fun usesLowConfidenceFallbackForEmptyBitmap() {
    val bitmap = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
    try {
      val detection = DocumentDetector.detect(bitmap)

      assertEquals(DocumentDetector.Source.FALLBACK, detection.source)
      assertTrue(detection.confidence in 0f..0.5f)
      assertEquals(8, detection.cornersPx.size)
    } finally {
      bitmap.recycle()
    }
  }

  @Test
  fun rescalesDetectionFrom720PixelWorkingCopyToOriginalBitmap() {
    val bitmap = Bitmap.createBitmap(1440, 900, Bitmap.Config.ARGB_8888)
    try {
      val canvas = Canvas(bitmap)
      canvas.drawColor(Color.rgb(24, 28, 32))
      canvas.drawRect(180f, 120f, 1260f, 780f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE })

      val detection = DocumentDetector.detect(bitmap)

      assertEquals(DocumentDetector.Source.OPENCV, detection.source)
      assertNear(detection.cornersPx[0], 180f, 24f)
      assertNear(detection.cornersPx[1], 120f, 24f)
      assertNear(detection.cornersPx[2], 1260f, 24f)
      assertNear(detection.cornersPx[3], 120f, 24f)
      assertNear(detection.cornersPx[4], 1260f, 24f)
      assertNear(detection.cornersPx[5], 780f, 24f)
      assertNear(detection.cornersPx[6], 180f, 24f)
      assertNear(detection.cornersPx[7], 780f, 24f)
      assertClockwise(detection.cornersPx)
    } finally {
      bitmap.recycle()
    }
  }

  private fun assertNear(actual: Float, expected: Float, tolerance: Float) {
    assertTrue("expected=$expected actual=$actual", abs(actual - expected) <= tolerance)
  }

  private fun assertClockwise(corners: FloatArray) {
    var area = 0f
    for (index in 0 until 4) {
      val next = (index + 1) % 4
      area += corners[index * 2] * corners[next * 2 + 1] - corners[index * 2 + 1] * corners[next * 2]
    }
    assertTrue("expected clockwise image-space corners, area=$area", area > 0f)
  }
}
