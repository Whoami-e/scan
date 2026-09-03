package com.scanapp

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.RectF
import android.graphics.SurfaceTexture
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCharacteristics
import android.media.ImageReader
import android.util.Size
import android.view.Surface
import android.view.TextureView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.abs
import kotlin.math.max

class ScannerCameraView(context: Context) : TextureView(context), TextureView.SurfaceTextureListener {
  private val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
  private var camera: CameraDevice? = null
  private var session: CameraCaptureSession? = null
  private var previewSurface: Surface? = null
  private var previewRequest: android.hardware.camera2.CaptureRequest? = null
  private var flashOn = false
  private var imageReader: ImageReader? = null
  private val captureLock = Any()
  private var pendingCapture: PendingCapture? = null
  private val captureExecutor = Executors.newSingleThreadExecutor()
  private val mainHandler = android.os.Handler(android.os.Looper.getMainLooper())
  private var cameraEnabled = true
  private var openingCamera = false
  private var sensorOrientation = 0
  private var previewSize: Size? = null

  init {
    surfaceTextureListener = this
    isOpaque = true
    activeView = this
  }

  fun setCameraEnabled(enabled: Boolean) {
    cameraEnabled = enabled
    if (enabled && isAvailable) openCamera()
    if (!enabled) closeCamera()
  }

  fun onPermissionResult(requestCode: Int, grantResults: IntArray) {
    if (requestCode != REQUEST_CAMERA || grantResults.firstOrNull() != PackageManager.PERMISSION_GRANTED) return
    post {
      if (cameraEnabled && isAvailable) openCamera()
    }
  }

  fun onHostResume() {
    post {
      if (cameraEnabled && isAvailable && context.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
        openCamera()
      }
    }
  }

  fun onHostPause() {
    post {
      clearPendingCapture("CAMERA_PAUSED", "相机已暂停")
      closeCamera()
    }
  }

  fun setFlashOn(enabled: Boolean) {
    flashOn = enabled
    session?.let { startPreview(it) }
  }

  fun capture(promise: Promise) {
    val device = camera ?: run {
      promise.reject("CAMERA_NOT_READY", "相机预览尚未准备好")
      return
    }
    val captureSurface = imageReader?.surface ?: run {
      promise.reject("CAMERA_NOT_READY", "照片输出尚未准备好")
      return
    }
    try {
      val capture = synchronized(captureLock) {
        if (pendingCapture != null) {
          null
        } else {
          PendingCapture(promise).also { pendingCapture = it }
        }
      }
      if (capture == null) {
        promise.reject("CAPTURE_BUSY", "正在保存上一张照片")
        return
      }
      val activeSession = session ?: run {
        clearPendingCapture("CAMERA_NOT_READY", "相机拍摄会话尚未准备好")
        return
      }
      val request = device.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE).apply {
        addTarget(captureSurface)
        set(android.hardware.camera2.CaptureRequest.CONTROL_MODE, android.hardware.camera2.CameraMetadata.CONTROL_MODE_AUTO)
        set(android.hardware.camera2.CaptureRequest.CONTROL_AF_MODE, android.hardware.camera2.CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
        set(android.hardware.camera2.CaptureRequest.CONTROL_AE_MODE, if (flashOn) android.hardware.camera2.CaptureRequest.CONTROL_AE_MODE_ON_ALWAYS_FLASH else android.hardware.camera2.CaptureRequest.CONTROL_AE_MODE_ON)
      }.build()
      // The repeating preview request continues while the still capture is processed.
      // Restarting it here causes a visible Surface/AE transition on some devices.
      activeSession.capture(request, null, null)
    } catch (error: Exception) {
      settleCapture(captureFor(promise), error)
    }
  }

  private fun openCamera() {
    if (!cameraEnabled || camera != null || openingCamera) return
    if (context.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      val activity = (context as? ReactContext)?.currentActivity ?: return
      activity.requestPermissions(arrayOf(Manifest.permission.CAMERA), REQUEST_CAMERA)
      return
    }
    val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
      cameraManager.getCameraCharacteristics(id).get(android.hardware.camera2.CameraCharacteristics.LENS_FACING) == android.hardware.camera2.CameraCharacteristics.LENS_FACING_BACK
    } ?: return
    val characteristics = cameraManager.getCameraCharacteristics(cameraId)
    sensorOrientation = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
    previewSize = choosePreviewSize(characteristics)
    val jpegSize = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
      ?.getOutputSizes(ImageFormat.JPEG)
      ?.maxByOrNull { it.width.toLong() * it.height.toLong() }
      ?: Size(1920, 1080)
    imageReader?.close()
    imageReader = ImageReader.newInstance(jpegSize.width, jpegSize.height, ImageFormat.JPEG, 2).apply {
      setOnImageAvailableListener({ reader ->
        val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
        val capture = synchronized(captureLock) { pendingCapture }
        val bytes: ByteArray
        try {
          val buffer = image.planes[0].buffer
          bytes = ByteArray(buffer.remaining())
          buffer.get(bytes)
        } finally {
          image.close()
        }
        if (capture == null) return@setOnImageAvailableListener
        val future = captureExecutor.submit { processCaptureImage(bytes, capture) }
        capture.future = future
        mainHandler.postDelayed({
          if (capture.settled.compareAndSet(false, true)) {
            future.cancel(true)
            synchronized(captureLock) {
              if (pendingCapture === capture) pendingCapture = null
            }
            capture.promise.reject("CAPTURE_TIMEOUT", "照片处理超时，请重试")
          }
        }, CAPTURE_PROCESSING_TIMEOUT_MS)
      }, null)
    }
    openingCamera = true
    try {
      cameraManager.openCamera(cameraId, object : CameraDevice.StateCallback() {
        override fun onOpened(device: CameraDevice) { openingCamera = false; camera = device; createPreviewSession(device) }
        override fun onDisconnected(device: CameraDevice) { openingCamera = false; device.close(); camera = null }
        override fun onError(device: CameraDevice, error: Int) { openingCamera = false; device.close(); camera = null }
      }, null)
    } catch (_: SecurityException) { openingCamera = false }
  }

  private fun createPreviewSession(device: CameraDevice) {
    val texture = surfaceTexture ?: return
    val selectedPreviewSize = previewSize ?: Size(1920, 1080)
    texture.setDefaultBufferSize(selectedPreviewSize.width, selectedPreviewSize.height)
    applyPreviewTransform(width, height)
    previewSurface?.release()
    previewSurface = Surface(texture)
    val outputs = listOfNotNull(previewSurface, imageReader?.surface)
    device.createCaptureSession(outputs, object : CameraCaptureSession.StateCallback() {
      override fun onConfigured(newSession: CameraCaptureSession) { session = newSession; startPreview(newSession) }
      override fun onConfigureFailed(newSession: CameraCaptureSession) { session = null }
    }, null)
  }

  private fun startPreview(target: CameraCaptureSession) {
    val device = camera ?: return
    val surface = previewSurface ?: return
    previewRequest = device.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
      addTarget(surface)
      set(android.hardware.camera2.CaptureRequest.CONTROL_MODE, android.hardware.camera2.CameraMetadata.CONTROL_MODE_AUTO)
      set(android.hardware.camera2.CaptureRequest.FLASH_MODE, if (flashOn) android.hardware.camera2.CaptureRequest.FLASH_MODE_TORCH else android.hardware.camera2.CaptureRequest.FLASH_MODE_OFF)
    }.build()
    target.setRepeatingRequest(previewRequest!!, null, null)
  }

  private fun choosePreviewSize(characteristics: CameraCharacteristics): Size {
    val sizes = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
      ?.getOutputSizes(SurfaceTexture::class.java)
      ?.filter { it.width >= 640 && it.height >= 480 }
      .orEmpty()
    if (sizes.isEmpty()) return Size(1920, 1080)

    val targetRatio = if (width > 0 && height > 0) {
      max(width, height).toFloat() / minOf(width, height).toFloat()
    } else {
      16f / 9f
    }
    return sizes.minWithOrNull(
      compareBy<Size> {
        val longSide = max(it.width, it.height).toFloat()
        val shortSide = minOf(it.width, it.height).toFloat()
        abs(longSide / shortSide - targetRatio)
      }.thenByDescending { it.width.toLong() * it.height.toLong() },
    ) ?: Size(1920, 1080)
  }

  private fun applyPreviewTransform(viewWidth: Int, viewHeight: Int) {
    val selectedPreviewSize = previewSize ?: return
    if (viewWidth <= 0 || viewHeight <= 0) return

    val previewRotationDegrees = calculatePreviewRotation()
    val quarterTurn = previewRotationDegrees == 90 || previewRotationDegrees == 270
    val rotatedPreviewWidth = if (quarterTurn) {
      selectedPreviewSize.height.toFloat()
    } else {
      selectedPreviewSize.width.toFloat()
    }
    val rotatedPreviewHeight = if (quarterTurn) {
      selectedPreviewSize.width.toFloat()
    } else {
      selectedPreviewSize.height.toFloat()
    }
    val viewRect = RectF(0f, 0f, viewWidth.toFloat(), viewHeight.toFloat())
    val bufferRect = RectF(0f, 0f, rotatedPreviewWidth, rotatedPreviewHeight)
    val centerX = viewRect.centerX()
    val centerY = viewRect.centerY()
    bufferRect.offset(centerX - bufferRect.centerX(), centerY - bufferRect.centerY())
    val matrix = Matrix()
    matrix.setRectToRect(viewRect, bufferRect, Matrix.ScaleToFit.CENTER)
    val scale = max(viewWidth.toFloat() / rotatedPreviewWidth, viewHeight.toFloat() / rotatedPreviewHeight)
    matrix.postScale(scale, scale, centerX, centerY)
    matrix.postRotate(previewRotationDegrees.toFloat(), centerX, centerY)
    setTransform(matrix)
  }

  private fun calculatePreviewRotation(): Int {
    val displayRotation = display?.rotation ?: Surface.ROTATION_0
    val displayDegrees = when (displayRotation) {
      Surface.ROTATION_90 -> 90
      Surface.ROTATION_180 -> 180
      Surface.ROTATION_270 -> 270
      else -> 0
    }
    return displayDegrees
  }

  private fun calculateImageRotation(): Int {
    return imageRotationFor(sensorOrientation, display?.rotation ?: Surface.ROTATION_0)
  }

  private fun rotateBitmap(source: Bitmap, degrees: Int): Bitmap {
    if (degrees == 0) return source
    val matrix = Matrix().apply { postRotate(degrees.toFloat()) }
    return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
  }

  private fun closeCamera() {
    openingCamera = false
    session?.close()
    session = null
    previewSurface?.release()
    previewSurface = null
    camera?.close()
    camera = null
    imageReader?.close()
    imageReader = null
    previewSize = null
    clearPendingCapture("CAMERA_CLOSED", "相机已关闭")
  }

  private fun processCaptureImage(bytes: ByteArray, capture: PendingCapture) {
    var bitmap: Bitmap? = null
    var normalizedBitmap: Bitmap? = null
    try {
      bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        ?: throw IllegalStateException("照片无法读取")
      val imageRotationDegrees = calculateImageRotation()
      normalizedBitmap = rotateBitmap(bitmap, imageRotationDegrees)
      val output = File(context.cacheDir, "scan-${System.currentTimeMillis()}.jpg")
      FileOutputStream(output).use { stream ->
        if (!normalizedBitmap.compress(Bitmap.CompressFormat.JPEG, 94, stream)) {
          throw IllegalStateException("照片保存失败")
        }
      }
      mainHandler.post {
        settleCapture(capture, com.facebook.react.bridge.Arguments.createMap().apply {
          putString("imagePath", "file://${output.absolutePath}")
        })
      }
    } catch (error: Exception) {
      mainHandler.post { settleCapture(capture, error) }
    } finally {
      if (normalizedBitmap != null && normalizedBitmap !== bitmap) normalizedBitmap.recycle()
      bitmap?.recycle()
    }
  }

  private fun captureFor(promise: Promise): PendingCapture? = synchronized(captureLock) {
    pendingCapture?.takeIf { it.promise === promise }
  }

  private fun clearPendingCapture(code: String, message: String) {
    val capture = synchronized(captureLock) {
      pendingCapture.also { pendingCapture = null }
    } ?: return
    capture.future?.cancel(true)
    if (capture.settled.compareAndSet(false, true)) capture.promise.reject(code, message)
  }

  private fun settleCapture(capture: PendingCapture?, result: Any) {
    if (capture == null || !capture.settled.compareAndSet(false, true)) return
    synchronized(captureLock) {
      if (pendingCapture === capture) pendingCapture = null
    }
    if (result is Throwable) {
      capture.promise.reject("CAPTURE_FAILED", result.message, result)
    } else {
      capture.promise.resolve(result)
    }
  }

  private class PendingCapture(val promise: Promise) {
    val settled = AtomicBoolean(false)
    var future: Future<*>? = null
  }

  override fun onSurfaceTextureAvailable(surface: SurfaceTexture, w: Int, h: Int) { openCamera() }
  override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, w: Int, h: Int) { applyPreviewTransform(w, h) }
  override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean { closeCamera(); return true }
  override fun onSurfaceTextureUpdated(surface: SurfaceTexture) = Unit

  companion object {
    const val REQUEST_CAMERA = 4101
    const val CAPTURE_PROCESSING_TIMEOUT_MS = 15_000L
    var activeView: ScannerCameraView? = null

    @JvmStatic
    fun imageRotationFor(sensorOrientation: Int, displayRotation: Int): Int {
      val displayDegrees = when (displayRotation) {
        Surface.ROTATION_90 -> 90
        Surface.ROTATION_180 -> 180
        Surface.ROTATION_270 -> 270
        else -> 0
      }
      return (sensorOrientation - displayDegrees + 360) % 360
    }
  }
}
