package com.scanapp

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Arguments
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.RectF
import android.graphics.Matrix
import android.net.Uri
import android.content.Intent
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
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
    var bitmap: Bitmap? = null
    try {
      bitmap = loadBitmap(imagePath) ?: throw IllegalStateException("图片无法读取")
      val detection = DocumentDetector.detect(bitmap!!)
      val cornersPx = detection.cornersPx
      val corners = Arguments.createMap().apply {
        putMap("topLeft", point(cornersPx[0].toDouble() / bitmap!!.width, cornersPx[1].toDouble() / bitmap!!.height))
        putMap("topRight", point(cornersPx[2].toDouble() / bitmap!!.width, cornersPx[3].toDouble() / bitmap!!.height))
        putMap("bottomRight", point(cornersPx[4].toDouble() / bitmap!!.width, cornersPx[5].toDouble() / bitmap!!.height))
        putMap("bottomLeft", point(cornersPx[6].toDouble() / bitmap!!.width, cornersPx[7].toDouble() / bitmap!!.height))
      }
      promise.resolve(Arguments.createMap().apply {
        putMap("corners", corners)
        putDouble("confidence", detection.confidence.toDouble())
        putString("source", detection.source.name.lowercase())
      })
    } catch (error: Exception) {
      promise.reject("DETECT_FAILED", error.message, error)
    } finally {
      bitmap?.recycle()
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
    var bitmap: Bitmap? = null
    var result: Bitmap? = null
    var output: File? = null
    try {
      bitmap = loadBitmapForEnhancement(imagePath) ?: throw IllegalStateException("图片无法读取")
      result = ImageEnhancer.apply(bitmap!!, mode)
      output = File(context.cacheDir, "scan-enhanced-${System.currentTimeMillis()}.jpg")
      FileOutputStream(output!!).use { stream -> check(result!!.compress(Bitmap.CompressFormat.JPEG, 92, stream)) { "增强图片保存失败" } }
      promise.resolve(Arguments.createMap().apply { putString("processedImagePath", "file://${output!!.absolutePath}") })
    } catch (error: Throwable) {
      output?.delete()
      promise.reject("ENHANCE_FAILED", error.message, error)
    } finally {
      result?.takeIf { it !== bitmap }?.recycle()
      bitmap?.recycle()
    }
  }

  @ReactMethod
  fun createPdf(pageImagePaths: com.facebook.react.bridge.ReadableArray, outputName: String, options: ReadableMap, promise: Promise) {
    try {
      val paths = (0 until pageImagePaths.size()).mapNotNull { pageImagePaths.getString(it) }
      val requestedOrientation = when (options.getString("orientation") ?: "auto") {
        "landscape" -> PdfExporter.Orientation.LANDSCAPE
        "portrait" -> PdfExporter.Orientation.PORTRAIT
        else -> PdfExporter.Orientation.AUTO
      }
      val output = PdfExporter.create(
        context = context,
        pageImages = paths.map { path -> File(Uri.parse(path).path ?: path) },
        outputName = outputName,
        options = PdfExporter.Options(
          marginMillimeters = optionalDouble(options, "marginMillimeters", 10.0).toInt(),
          orientation = requestedOrientation,
          jpegQuality = optionalDouble(options, "jpegQuality", 92.0).toInt(),
        ),
      )
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
      val workspace = ScanFileStore(context).createWorkspace(documentId)
      promise.resolve(workspace.absolutePath)
    } catch (error: Exception) {
      promise.reject("WORKSPACE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun deleteWorkspace(documentId: String, promise: Promise) {
    try {
      ScanFileStore(context).deleteWorkspace(documentId)
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
      promise.resolve(ScanFileStore(context).savePageImage(documentId, pageId, imagePath, kind).toString())
    } catch (error: Exception) {
      promise.reject("PAGE_SAVE_FAILED", error.message, error)
    }
  }

  private fun safeSegment(value: String): String = value.replace(Regex("[^a-zA-Z0-9._-]"), "_").take(96)

  private fun optionalDouble(options: ReadableMap, key: String, fallback: Double): Double =
    if (options.hasKey(key) && !options.isNull(key)) options.getDouble(key) else fallback

  private fun point(x: Double, y: Double) = Arguments.createMap().apply { putDouble("x", x); putDouble("y", y) }

  private fun processImage(imagePath: String, corners: ReadableMap, promise: Promise) {
    var bitmap: Bitmap? = null
    var outputBitmap: Bitmap? = null
    var output: File? = null
    try {
      bitmap = loadBitmap(imagePath) ?: throw IllegalStateException("图片无法读取")
      val quad = readNormalizedQuad(corners)
      outputBitmap = PerspectiveWarper.warp(bitmap!!, quad)
      output = File(context.cacheDir, "scan-crop-${System.currentTimeMillis()}.jpg")
      FileOutputStream(output).use { stream ->
        check(outputBitmap!!.compress(Bitmap.CompressFormat.JPEG, 94, stream)) { "裁剪图片保存失败" }
      }
      promise.resolve(Arguments.createMap().apply { putString("processedImagePath", "file://${output.absolutePath}") })
    } catch (error: Exception) {
      output?.delete()
      promise.reject("CROP_FAILED", error.message, error)
    } finally {
      outputBitmap?.recycle()
      bitmap?.recycle()
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

  private fun loadBitmapForEnhancement(path: String): Bitmap? {
    val uri = Uri.parse(path)
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    if (uri.scheme == "content") {
      context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    } else {
      BitmapFactory.decodeFile(uri.path ?: path, bounds)
    }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

    var sample = 1
    while (kotlin.math.max(bounds.outWidth, bounds.outHeight) / sample > 4096) sample *= 2
    val options = BitmapFactory.Options().apply {
      inSampleSize = sample
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    return if (uri.scheme == "content") {
      context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
    } else {
      BitmapFactory.decodeFile(uri.path ?: path, options)
    }
  }

  private fun readNormalizedQuad(corners: ReadableMap): ScanQuad {
    fun readPoint(primary: String, legacy: String): ScanPoint {
      val map = corners.getMap(primary) ?: corners.getMap(legacy)
        ?: throw IllegalArgumentException("缺少$primary")
      return ScanPoint(map.getDouble("x"), map.getDouble("y"))
    }
    return ScanQuad(
      topLeft = readPoint("topLeft", "tl"),
      topRight = readPoint("topRight", "tr"),
      bottomRight = readPoint("bottomRight", "br"),
      bottomLeft = readPoint("bottomLeft", "bl"),
    )
  }
}
