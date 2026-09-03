package com.scanapp

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import kotlin.math.max
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/** Small, predictable image enhancement pipeline for the MVP. */
object ImageEnhancer {
  private const val MAX_PROCESSING_EDGE = 2048

  enum class EnhanceMode {
    ORIGINAL,
    GRAYSCALE,
    ENHANCED,
  }

  fun apply(source: Bitmap, mode: EnhanceMode): Bitmap {
    require(!source.isRecycled && source.width > 0 && source.height > 0) { "源图片无效" }
    return when (mode) {
      EnhanceMode.ORIGINAL -> source.copy(Bitmap.Config.ARGB_8888, false)
      EnhanceMode.GRAYSCALE -> grayscale(source)
      EnhanceMode.ENHANCED -> enhanced(source)
    }
  }

  /** Wire-format overload used by the React Native bridge so invalid values fail closed. */
  fun apply(source: Bitmap, mode: String): Bitmap = apply(source, parseMode(mode))

  private fun parseMode(mode: String): EnhanceMode = when (mode) {
    "original" -> EnhanceMode.ORIGINAL
    "grayscale" -> EnhanceMode.GRAYSCALE
    "enhanced" -> EnhanceMode.ENHANCED
    else -> throw IllegalArgumentException("不支持的增强模式: $mode")
  }

  private fun grayscale(source: Bitmap): Bitmap {
    var output: Bitmap? = null
    return try {
      output = source.copy(Bitmap.Config.ARGB_8888, true)
      val canvas = Canvas(output!!)
      val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        colorFilter = ColorMatrixColorFilter(ColorMatrix().apply { setSaturation(0f) })
      }
      canvas.drawBitmap(source, 0f, 0f, paint)
      output!!
    } catch (error: Throwable) {
      output?.recycle()
      throw error
    }
  }

  private fun enhanced(source: Bitmap): Bitmap {
    var working: Bitmap? = null
    var input: Mat? = null
    var contrasted: Mat? = null
    var blurred: Mat? = null
    var sharpened: Mat? = null
    var processed: Bitmap? = null
    var output: Bitmap? = null
    return try {
      ensureOpenCvLoaded()
      working = scaledForProcessing(source)
      input = Mat()
      contrasted = Mat()
      blurred = Mat()
      sharpened = Mat()
      Utils.bitmapToMat(working, input)

      // A restrained contrast lift followed by an unsharp mask keeps text crisp without OCR-style thresholding.
      input.convertTo(contrasted, -1, 1.08, -6.0)
      Imgproc.GaussianBlur(contrasted, blurred, Size(0.0, 0.0), 1.1)
      Core.addWeighted(contrasted, 1.12, blurred, -0.12, 0.0, sharpened)

      processed = Bitmap.createBitmap(working.width, working.height, Bitmap.Config.ARGB_8888)
      Utils.matToBitmap(sharpened, processed)
      output = if (processed!!.width == source.width && processed!!.height == source.height) {
        processed
      } else {
        Bitmap.createScaledBitmap(processed!!, source.width, source.height, true).also { processed!!.recycle() }
      }
      processed = null
      output!!
    } catch (error: Throwable) {
      output?.recycle()
      processed?.recycle()
      throw error
    } finally {
      sharpened?.release()
      blurred?.release()
      contrasted?.release()
      input?.release()
      working?.takeIf { it !== source }?.recycle()
    }
  }

  private fun scaledForProcessing(source: Bitmap): Bitmap {
    val longestEdge = max(source.width, source.height)
    if (longestEdge <= MAX_PROCESSING_EDGE) return source
    val scale = MAX_PROCESSING_EDGE.toFloat() / longestEdge
    return Bitmap.createScaledBitmap(
      source,
      (source.width * scale).toInt().coerceAtLeast(1),
      (source.height * scale).toInt().coerceAtLeast(1),
      true,
    )
  }

  private fun ensureOpenCvLoaded() {
    if (!OpenCVLoader.initDebug()) {
      System.loadLibrary("opencv_java4")
    }
  }
}
