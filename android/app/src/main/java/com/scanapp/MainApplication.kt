package com.scanapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

/**
 * Android 应用级入口。
 *
 * 这里负责初始化 React Native Host 和自动链接的原生依赖。
 * 未来的扫描模块可以作为独立 Package 接入，但不应把相机或 PDF 业务逻辑
 * 直接堆在 Application 中，因为 Application 的生命周期长、职责边界很宽。
 */
class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          /*
           * 默认使用 React Native 自动链接。
           * 如果后续某个扫描原生依赖无法自动链接，再在这里手动添加 Package；
           * 具体实现应保持在独立模块中，不要把模块本体放进这个入口文件。
           */
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // 初始化 React Native。扫描模块自身的资源和线程应在模块内部管理。
    loadReactNative(this)
  }
}
