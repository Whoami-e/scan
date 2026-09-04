package com.scanapp

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.common.MapBuilder

class ScannerCameraViewManager : SimpleViewManager<ScannerCameraView>() {
  override fun getName(): String = "ScannerCameraView"
  override fun createViewInstance(context: ThemedReactContext): ScannerCameraView = ScannerCameraView(context)

  @ReactProp(name = "enabled", defaultBoolean = true)
  fun setEnabled(view: ScannerCameraView, enabled: Boolean) = view.setCameraEnabled(enabled)

  @ReactProp(name = "flashOn", defaultBoolean = false)
  fun setFlashOn(view: ScannerCameraView, enabled: Boolean) = view.setFlashOn(enabled)

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    MapBuilder.of("topDocumentCorners", MapBuilder.of("registrationName", "onDocumentCorners"))
}
