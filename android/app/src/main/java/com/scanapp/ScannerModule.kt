package com.scanapp

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Arguments
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Matrix
import android.net.Uri
import android.content.Intent
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max
import kotlin.math.min

class ScannerModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "ScannerModule"

  @ReactMethod
  fun capturePhoto(promise: Promise) {
    ScannerCameraView.activeView?.capture(promise) ?: promise.reject("CAMERA_NOT_READY", "相机预览尚未准备好")
  }

  @ReactMethod
  fun setFlash(enabled: Boolean, promise: Promise) {
    ScannerCameraView.activeView?.setFlashOn(enabled)
    promise.resolve(null)
  }

  @ReactMethod
  fun detectDocumentEdges(imagePath: String, promise: Promise) {
    try {
      val bitmap = loadBitmap(imagePath) ?: throw IllegalStateException("图片无法读取")
      val sampleWidth = min(320, bitmap.width)
      val sampleHeight = max(1, (bitmap.height.toFloat() * sampleWidth / bitmap.width).toInt())
      val sample = Bitmap.createScaledBitmap(bitmap, sampleWidth, sampleHeight, true)
      var borderTotal = 0L
      var borderCount = 0
      for (x in 0 until sampleWidth) {
        borderTotal += luminance(sample.getPixel(x, 0)); borderTotal += luminance(sample.getPixel(x, sampleHeight - 1)); borderCount += 2
      }
      for (y in 1 until sampleHeight - 1) {
        borderTotal += luminance(sample.getPixel(0, y)); borderTotal += luminance(sample.getPixel(sampleWidth - 1, y)); borderCount += 2
      }
      val threshold = (borderTotal.toFloat() / borderCount + 18f).coerceIn(110f, 235f)
      var minX = sampleWidth; var minY = sampleHeight; var maxX = 0; var maxY = 0; var hits = 0
      for (y in 0 until sampleHeight) for (x in 0 until sampleWidth) {
        if (luminance(sample.getPixel(x, y)) >= threshold) {
          minX = min(minX, x); minY = min(minY, y); maxX = max(maxX, x); maxY = max(maxY, y); hits += 1
        }
      }
      val valid = hits > sampleWidth * sampleHeight * 0.12 && maxX - minX > sampleWidth * 0.35 && maxY - minY > sampleHeight * 0.35
      val left = if (valid) minX.toDouble() / sampleWidth else 0.08
      val top = if (valid) minY.toDouble() / sampleHeight else 0.08
      val right = if (valid) maxX.toDouble() / sampleWidth else 0.92
      val bottom = if (valid) maxY.toDouble() / sampleHeight else 0.92
      val corners = Arguments.createMap().apply {
        putMap("topLeft", point(left, top)); putMap("topRight", point(right, top)); putMap("bottomRight", point(right, bottom)); putMap("bottomLeft", point(left, bottom))
      }
      promise.resolve(Arguments.createMap().apply { putMap("corners", corners); putDouble("confidence", if (valid) 0.72 else 0.2) })
      sample.recycle()
    } catch (error: Exception) {
      promise.reject("DETECT_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun cropAndWarp(imagePath: String, corners: ReadableMap, promise: Promise) {
    processImage(imagePath, corners, promise)
  }

  @ReactMethod
  fun rotateImage(imagePath: String, degrees: Int, promise: Promise) {
    try {
      val bitmap = loadBitmap(imagePath) ?: throw IllegalStateException("图片无法读取")
      val normalizedDegrees = ((degrees % 360) + 360) % 360
      if (normalizedDegrees == 0) {
        promise.resolve(Arguments.createMap().apply { putString("processedImagePath", imagePath) })
        return
      }
      val matrix = Matrix().apply { postRotate(normalizedDegrees.toFloat()) }
      val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
      val output = File(context.cacheDir, "scan-rotate-${System.currentTimeMillis()}.jpg")
      FileOutputStream(output).use { stream -> rotated.compress(Bitmap.CompressFormat.JPEG, 94, stream) }
      rotated.recycle()
      promise.resolve(Arguments.createMap().apply { putString("processedImagePath", "file://${output.absolutePath}") })
    } catch (error: Exception) {
      promise.reject("ROTATE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun enhanceImage(imagePath: String, mode: String, promise: Promise) {
    try {
      val bitmap = loadBitmap(imagePath) ?: throw IllegalStateException("图片无法读取")
      val output = File(context.cacheDir, "scan-enhanced-${System.currentTimeMillis()}.jpg")
      val result = bitmap.copy(Bitmap.Config.ARGB_8888, true)
      val canvas = Canvas(result)
      val paint = Paint(Paint.ANTI_ALIAS_FLAG)
      val matrix = ColorMatrix()
      when (mode) {
        "grayscale" -> matrix.setSaturation(0f)
        "enhanced" -> matrix.set(floatArrayOf(
          1.12f, 0f, 0f, 0f, -8f,
          0f, 1.12f, 0f, 0f, -8f,
          0f, 0f, 1.12f, 0f, -8f,
          0f, 0f, 0f, 1f, 0f,
        ))
      }
      paint.colorFilter = ColorMatrixColorFilter(matrix)
      canvas.drawBitmap(bitmap, 0f, 0f, paint)
      FileOutputStream(output).use { stream -> result.compress(Bitmap.CompressFormat.JPEG, 92, stream) }
      promise.resolve(Arguments.createMap().apply { putString("processedImagePath", "file://${output.absolutePath}") })
    } catch (error: Exception) {
      promise.reject("ENHANCE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun createPdf(pageImagePaths: com.facebook.react.bridge.ReadableArray, outputName: String, options: ReadableMap, promise: Promise) {
    try {
      val safeName = outputName.replace(Regex("[^a-zA-Z0-9一-龥._ -]"), "_").let { if (it.endsWith(".pdf", true)) it else "$it.pdf" }
      val output = File(context.filesDir, safeName)
      val requestedOrientation = if (options.hasKey("orientation")) options.getString("orientation") else "auto"
      val pdf = android.graphics.pdf.PdfDocument()
      for (index in 0 until pageImagePaths.size()) {
        val path = pageImagePaths.getString(index) ?: continue
        val bitmap = loadBitmap(path) ?: continue
        val landscape = when (requestedOrientation) {
          "landscape" -> true
          "portrait" -> false
          else -> bitmap.width > bitmap.height
        }
        val pageWidth = if (landscape) 842 else 595
        val pageHeight = if (landscape) 595 else 842
        val pageInfo = android.graphics.pdf.PdfDocument.PageInfo.Builder(pageWidth, pageHeight, index + 1).create()
        val page = pdf.startPage(pageInfo)
        val canvas = page.canvas
        val margin = (pageWidth * 10f / 210f)
        val target = RectF(margin, margin, pageWidth - margin, pageHeight - margin)
        val scale = min(target.width() / bitmap.width, target.height() / bitmap.height)
        val drawW = bitmap.width * scale
        val drawH = bitmap.height * scale
        val left = (pageWidth - drawW) / 2f
        val top = (pageHeight - drawH) / 2f
        canvas.drawBitmap(bitmap, null, RectF(left, top, left + drawW, top + drawH), null)
        pdf.finishPage(page)
      }
      FileOutputStream(output).use { pdf.writeTo(it) }
      pdf.close()
      promise.resolve(Arguments.createMap().apply { putString("pdfPath", "file://${output.absolutePath}") })
    } catch (error: Exception) {
      promise.reject("PDF_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun listPdfNames(promise: Promise) {
    val result = Arguments.createArray()
    context.filesDir.listFiles()?.filter { it.isFile && it.extension.equals("pdf", true) }?.forEach { result.pushString(it.name) }
    promise.resolve(result)
  }

  @ReactMethod
  fun openFile(filePath: String, promise: Promise) {
    try {
      val file = File(Uri.parse(filePath).path ?: filePath)
      val uri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", file)
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, "application/pdf")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("OPEN_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun shareFile(filePath: String, promise: Promise) {
    try {
      val file = File(Uri.parse(filePath).path ?: filePath)
      val uri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", file)
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(Intent.createChooser(intent, "分享 PDF").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("SHARE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun exportLogs(promise: Promise) {
    try {
      val output = File(context.cacheDir, "scan-logs.txt")
      output.writeText("scan-app\nstatus=ok\n")
      promise.resolve(Arguments.createMap().apply { putString("logFilePath", "file://${output.absolutePath}") })
    } catch (error: Exception) {
      promise.reject("LOG_EXPORT_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun saveDocument(documentId: String, serialized: String, promise: Promise) {
    context.getSharedPreferences("scan-documents", android.content.Context.MODE_PRIVATE).edit().putString(documentId, serialized).apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun createWorkspace(documentId: String, promise: Promise) {
    try {
      val workspace = File(context.filesDir, "scan/${safeSegment(documentId)}").apply { mkdirs() }
      promise.resolve(workspace.absolutePath)
    } catch (error: Exception) {
      promise.reject("WORKSPACE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun deleteWorkspace(documentId: String, promise: Promise) {
    try {
      File(context.filesDir, "scan/${safeSegment(documentId)}").deleteRecursively()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("WORKSPACE_DELETE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun removeFile(filePath: String, promise: Promise) {
    try {
      File(Uri.parse(filePath).path ?: filePath).delete()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("FILE_DELETE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun loadDocuments(promise: Promise) {
    val values = context.getSharedPreferences("scan-documents", android.content.Context.MODE_PRIVATE).all.values.filterIsInstance<String>()
    val result = Arguments.createArray()
    values.forEach { result.pushString(it) }
    promise.resolve(result)
  }

  @ReactMethod
  fun deleteDocument(documentId: String, promise: Promise) {
    context.getSharedPreferences("scan-documents", android.content.Context.MODE_PRIVATE).edit().remove(documentId).apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun savePageImage(documentId: String, pageId: String, imagePath: String, kind: String, promise: Promise) {
    try {
      val workspace = File(context.filesDir, "scan/${safeSegment(documentId)}").apply { mkdirs() }
      val sourceUri = Uri.parse(imagePath)
      val extension = if (kind == "processed") "-processed.jpg" else "-original.jpg"
      val destination = File(workspace, safeSegment(pageId) + extension)
      if (sourceUri.scheme == "content") {
        context.contentResolver.openInputStream(sourceUri)?.use { input -> destination.outputStream().use { output -> input.copyTo(output) } }
      } else {
        File(sourceUri.path ?: imagePath).copyTo(destination, overwrite = true)
      }
      promise.resolve("file://${destination.absolutePath}")
    } catch (error: Exception) {
      promise.reject("PAGE_SAVE_FAILED", error.message, error)
    }
  }

  private fun safeSegment(value: String): String = value.replace(Regex("[^a-zA-Z0-9._-]"), "_").take(96)

  private fun point(x: Double, y: Double) = Arguments.createMap().apply { putDouble("x", x); putDouble("y", y) }

  private fun luminance(color: Int): Int = (0.299f * android.graphics.Color.red(color) + 0.587f * android.graphics.Color.green(color) + 0.114f * android.graphics.Color.blue(color)).toInt()

  private fun processImage(imagePath: String, corners: ReadableMap, promise: Promise) {
    try {
      val bitmap = loadBitmap(imagePath) ?: throw IllegalStateException("图片无法读取")
      val tl = corners.getMap("tl") ?: corners.getMap("topLeft") ?: throw IllegalArgumentException("缺少左上角")
      val tr = corners.getMap("tr") ?: corners.getMap("topRight") ?: throw IllegalArgumentException("缺少右上角")
      val br = corners.getMap("br") ?: corners.getMap("bottomRight") ?: throw IllegalArgumentException("缺少右下角")
      val bl = corners.getMap("bl") ?: corners.getMap("bottomLeft") ?: throw IllegalArgumentException("缺少左下角")
      val src = floatArrayOf(
        tl.getDouble("x").toFloat() * bitmap.width, tl.getDouble("y").toFloat() * bitmap.height,
        tr.getDouble("x").toFloat() * bitmap.width, tr.getDouble("y").toFloat() * bitmap.height,
        br.getDouble("x").toFloat() * bitmap.width, br.getDouble("y").toFloat() * bitmap.height,
        bl.getDouble("x").toFloat() * bitmap.width, bl.getDouble("y").toFloat() * bitmap.height,
      )
      val outW = max(1, ((src[2] - src[0] + src[4] - src[6]) / 2f).toInt())
      val outH = max(1, ((src[5] - src[1] + src[7] - src[3]) / 2f).toInt())
      val outputBitmap = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
      val matrix = android.graphics.Matrix()
      matrix.setPolyToPoly(src, 0, floatArrayOf(0f, 0f, outW.toFloat(), 0f, outW.toFloat(), outH.toFloat(), 0f, outH.toFloat()), 0, 4)
      Canvas(outputBitmap).drawBitmap(bitmap, matrix, Paint(Paint.ANTI_ALIAS_FLAG))
      val output = File(context.cacheDir, "scan-crop-${System.currentTimeMillis()}.jpg")
      FileOutputStream(output).use { stream -> outputBitmap.compress(Bitmap.CompressFormat.JPEG, 94, stream) }
      promise.resolve(Arguments.createMap().apply { putString("processedImagePath", "file://${output.absolutePath}") })
    } catch (error: Exception) {
      promise.reject("CROP_FAILED", error.message, error)
    }
  }

  private fun loadBitmap(path: String): Bitmap? {
    val uri = Uri.parse(path)
    return if (uri.scheme == "content") {
      context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
    } else {
      BitmapFactory.decodeFile(uri.path ?: path)
    }
  }
}
