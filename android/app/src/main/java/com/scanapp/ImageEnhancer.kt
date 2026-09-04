package com.scanapp

import android.graphics.Bitmap
import kotlin.math.max
import org.opencv.android.OpenCVLoader

/** Small, predictable image enhancement pipeline for the MVP. */
object ImageEnhancer {
  private const val MAX_PROCESSING_EDGE = 2048

  enum class EnhanceMode {
    ORIGINAL,
    GRAYSCALE,
    ENHANCED,
    BLACKWHITE,
  }

  fun apply(source: Bitmap, mode: EnhanceMode): Bitmap {
    require(!source.isRecycled && source.width > 0 && source.height > 0) { "源图片无效" }
    return when (mode) {
      EnhanceMode.ORIGINAL -> source.copy(Bitmap.Config.ARGB_8888, false)
      EnhanceMode.GRAYSCALE -> grayscale(source)
      EnhanceMode.ENHANCED -> enhanced(source)
      EnhanceMode.BLACKWHITE -> blackWhite(source)
    }
  }

  /** Wire-format overload used by the React Native bridge so invalid values fail closed. */
  fun apply(source: Bitmap, mode: String): Bitmap = apply(source, parseMode(mode))

  private fun parseMode(mode: String): EnhanceMode = when (mode) {
    "original" -> EnhanceMode.ORIGINAL
    "grayscale" -> EnhanceMode.GRAYSCALE
    "enhanced" -> EnhanceMode.ENHANCED
    "blackwhite" -> EnhanceMode.BLACKWHITE
    else -> throw IllegalArgumentException("不支持的增强模式: $mode")
  }

  private fun grayscale(source: Bitmap): Bitmap {
    return processBounded(source, com.scanapp.fairscan.imageprocessing.PostProcessing::enhanceGrayImage)
  }

  private fun enhanced(source: Bitmap): Bitmap {
    return processBounded(source, com.scanapp.fairscan.imageprocessing.PostProcessing::enhanceColorImage)
  }

  private fun blackWhite(source: Bitmap): Bitmap {
    return processBounded(source, com.scanapp.fairscan.imageprocessing.PostProcessing::blackWhite)
  }

  private fun processBounded(source: Bitmap, processor: (Bitmap) -> Bitmap): Bitmap {
    var working: Bitmap? = null
    var processed: Bitmap? = null
    var output: Bitmap? = null
    return try {
      ensureOpenCvLoaded()
      working = scaledForProcessing(source)
      processed = processor(working)
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
