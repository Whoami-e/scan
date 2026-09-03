package com.scanapp

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Android 主 Activity。
 *
 * 当前这里只负责把 Android Activity 生命周期交给 React Native。
 * 相机预览、边缘识别和图像处理不要直接写进这个类，应通过独立的原生模块
 * 暴露给 `src/native/scannerModule.ts`，这样页面层和 Android 生命周期可以解耦。
 */
class MainActivity : ReactActivity() {

  /**
   * 返回 JavaScript 侧注册的根组件名称。
   *
   * 这个名称必须和 `index.js` 中的 `AppRegistry.registerComponent` 保持一致；
   * 如果修改应用名称，需要同时检查 Android、iOS 和 JavaScript 三处配置。
   */
  override fun getMainComponentName(): String = "ScanApp"

  /**
   * 创建 React Native Activity Delegate。
   *
   * `fabricEnabled` 来自 RN 新架构入口配置，当前沿用脚手架默认值。
   * 后续接入原生扫描模块时，应优先让模块兼容新架构，而不是在页面层绕过
   * React Native 的模块注册机制。
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray,
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == ScannerCameraView.REQUEST_CAMERA) {
      ScannerCameraView.activeView?.onPermissionResult(requestCode, grantResults)
    }
  }

  override fun onResume() {
    super.onResume()
    ScannerCameraView.activeView?.onHostResume()
  }

  override fun onPause() {
    ScannerCameraView.activeView?.onHostPause()
    super.onPause()
  }
}
