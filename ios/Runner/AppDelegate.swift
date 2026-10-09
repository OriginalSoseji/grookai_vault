import Flutter
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var notificationDeviceChannel: FlutterMethodChannel?
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "GrookaiNotificationDevice") {
      let channel = FlutterMethodChannel(
        name: "grookai/notifications/device", binaryMessenger: registrar.messenger()
      )
      notificationDeviceChannel = channel
      channel.setMethodCallHandler { call, result in
        if call.method == "clearDelivered" {
          let center = UNUserNotificationCenter.current()
          center.removeAllDeliveredNotifications()
          center.removeAllPendingNotificationRequests()
          result(nil)
        } else {
          result(FlutterMethodNotImplemented)
        }
      }
    }
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "P21Printer") {
      P21PrinterBridge.register(with: registrar)
    }
    if let registrar = engineBridge.pluginRegistry.registrar(
      forPlugin: "ScannerCameraPhase0"
    ) {
      ScannerCameraPhase0Bridge.register(with: registrar)
    }
  }
}
