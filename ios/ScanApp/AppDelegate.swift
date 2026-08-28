import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

/// iOS 应用入口。
///
/// 当前只负责创建 React Native 工厂并启动根组件。相机、图像处理和 PDF
/// 生成应通过独立原生模块接入，避免把业务逻辑集中到 AppDelegate。
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Delegate 负责提供 JS Bundle 地址和 React Native 依赖。
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "ScanApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // Debug 模式从 Metro 获取 Bundle，便于热更新和调试。
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    // Release 模式读取随 App 打包的静态 Bundle。
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
