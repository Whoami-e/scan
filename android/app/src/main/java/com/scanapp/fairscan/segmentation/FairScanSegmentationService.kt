/*
 * Copyright 2025-2026 The FairScan authors
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <https://www.gnu.org/licenses/>.
 */
// Upstream: FairScan v2.2.0 (2297341), original path: app/src/main/java/org/fairscan/app/domain/ImageSegmentation.kt.
// Local changes: package namespace adapted, hash-gated asset loading, and synchronous API for Camera2 callers.
package com.scanapp.fairscan.segmentation

import android.content.Context
import android.graphics.Bitmap
import com.scanapp.fairscan.imageprocessing.ImageSize
import com.scanapp.fairscan.imageprocessing.AnalysisMode
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock
import android.util.Log
import org.opencv.android.OpenCVLoader
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.tensorflow.lite.DataType
import org.tensorflow.lite.Interpreter

enum class SegmentationAvailability {
  READY,
  ASSET_MISSING,
  HASH_MISMATCH,
  INTERPRETER_ERROR,
  OUTPUT_INVALID,
}

data class SegmentationAnalysis(
  val probabilityMask: Mat,
  val maskSize: ImageSize,
  val originalSize: ImageSize,
  val availability: SegmentationAvailability,
)

/** Local, hash-gated LiteRT inference. No network access is performed here. */
class FairScanSegmentationService(private val context: Context) : AutoCloseable {
  companion object {
    const val MODEL_ASSET = "models/fairscan-document-segmentation.tflite"
    const val HASH_ASSET = "models/fairscan-document-segmentation.tflite.sha256"
    const val INPUT_WIDTH = 256
    const val INPUT_HEIGHT = 256

    internal fun verifyAssetFiles(model: File, manifest: File): SegmentationAvailability {
      if (!model.isFile || !manifest.isFile) return SegmentationAvailability.ASSET_MISSING
      val expected = manifest.useLines { lines ->
        lines.firstOrNull()?.trim()?.split(Regex("\\s+"))?.firstOrNull()
      }?.lowercase()
      if (expected == null || !expected.matches(Regex("[0-9a-f]{64}"))) {
        return SegmentationAvailability.HASH_MISMATCH
      }
      val digest = MessageDigest.getInstance("SHA-256")
      model.inputStream().use { input ->
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        while (true) {
          val count = input.read(buffer)
          if (count < 0) break
          digest.update(buffer, 0, count)
        }
      }
      val actual = digest.digest().joinToString("") { "%02x".format(it) }
      return if (actual == expected) SegmentationAvailability.READY else SegmentationAvailability.HASH_MISMATCH
    }
  }

  private val lock = ReentrantLock()
  private var interpreter: Interpreter? = null
  val availability: SegmentationAvailability

  init {
    availability = try {
      val model = materializeAsset(MODEL_ASSET)
      val manifest = materializeAsset(HASH_ASSET)
      val verified = verifyAssetFiles(model, manifest)
      if (verified != SegmentationAvailability.READY) {
        verified
      } else {
        interpreter = Interpreter(model, Interpreter.Options().apply { numThreads = 1 })
        if (!validModel(interpreter!!)) {
          interpreter?.close()
          interpreter = null
          SegmentationAvailability.OUTPUT_INVALID
        } else {
          SegmentationAvailability.READY
        }
      }
    } catch (_: java.io.FileNotFoundException) {
      SegmentationAvailability.ASSET_MISSING
    } catch (_: Throwable) {
      interpreter = null
      SegmentationAvailability.INTERPRETER_ERROR
    }
  }

  fun analyze(bitmap: Bitmap, mode: AnalysisMode = AnalysisMode.CAPTURE): SegmentationAnalysis? {
    val current = interpreter ?: return null
    if (bitmap.isRecycled || bitmap.width <= 0 || bitmap.height <= 0) return null
    return try {
      lock.withLock {
        val input = ByteBuffer.allocateDirect(INPUT_WIDTH * INPUT_HEIGHT * 3 * 4).order(ByteOrder.nativeOrder())
        val scaled = Bitmap.createScaledBitmap(bitmap, INPUT_WIDTH, INPUT_HEIGHT, true)
        val pixels = IntArray(INPUT_WIDTH * INPUT_HEIGHT)
        try {
          scaled.getPixels(pixels, 0, INPUT_WIDTH, 0, 0, INPUT_WIDTH, INPUT_HEIGHT)
        } finally {
          if (scaled !== bitmap) scaled.recycle()
        }
        pixels.forEach { pixel ->
          input.putFloat(((pixel shr 16) and 0xff) / 127.5f - 1f)
          input.putFloat(((pixel shr 8) and 0xff) / 127.5f - 1f)
          input.putFloat((pixel and 0xff) / 127.5f - 1f)
        }
        input.rewind()
        val output = ByteBuffer.allocateDirect(INPUT_WIDTH * INPUT_HEIGHT * 4)
          .order(ByteOrder.nativeOrder())
        current.run(input, output)
        output.rewind()
        val outputFloats = FloatArray(INPUT_WIDTH * INPUT_HEIGHT)
        output.asFloatBuffer().get(outputFloats)
        if (!OpenCVLoader.initDebug()) {
          System.loadLibrary("opencv_java4")
        }
        var mask: Mat? = Mat(INPUT_HEIGHT, INPUT_WIDTH, CvType.CV_32FC1)
        try {
          val row = FloatArray(INPUT_WIDTH)
          for (y in 0 until INPUT_HEIGHT) {
            for (x in 0 until INPUT_WIDTH) {
              val value = outputFloats[y * INPUT_WIDTH + x]
              if (!value.isFinite()) return@withLock null
              row[x] = value.coerceIn(0f, 1f)
            }
            mask!!.put(y, 0, row)
          }
          val result = SegmentationAnalysis(mask!!, ImageSize(INPUT_WIDTH, INPUT_HEIGHT), ImageSize(bitmap.width, bitmap.height), SegmentationAvailability.READY)
          mask = null
          result
        } finally {
          mask?.release()
        }
      }
    } catch (_: Throwable) {
      Log.w("FairScanSegmentation", "inference unavailable")
      null
    }
  }

  override fun close() {
    lock.withLock {
      interpreter?.close()
      interpreter = null
    }
  }

  private fun materializeAsset(path: String): File {
    val target = File(context.cacheDir, "fairscan-model-cache/${path.substringAfterLast('/')}")
    target.parentFile?.mkdirs()
    context.assets.open(path).use { input -> target.outputStream().use { output -> input.copyTo(output) } }
    return target
  }

  private fun validModel(candidate: Interpreter): Boolean {
    if (candidate.inputTensorCount != 1 || candidate.outputTensorCount != 1) return false
    val input = candidate.getInputTensor(0)
    val output = candidate.getOutputTensor(0)
    return input.dataType() == DataType.FLOAT32 && input.shape().contentEquals(intArrayOf(1, INPUT_HEIGHT, INPUT_WIDTH, 3)) && output.dataType() == DataType.FLOAT32 && output.shape().contentEquals(intArrayOf(1, INPUT_HEIGHT, INPUT_WIDTH, 1))
  }
}
