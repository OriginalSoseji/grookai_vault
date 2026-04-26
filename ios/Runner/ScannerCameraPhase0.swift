import AVFoundation
import CoreMotion
import Flutter
import ImageIO
import QuartzCore
import UIKit

fileprivate enum ScannerCameraPhase0Error: Error {
  case cameraUnavailable
  case configurationFailed(String)
  case permissionDenied
  case previewUnavailable
  case captureInProgress
  case notReady
  case captureFailed(String)
}

private enum ScannerCameraPhase0Defaults {
  static let zoom: CGFloat = 1.3
  static let exposureBias: Float = 0.25
  static let captureSettleDelay: TimeInterval = 0.3
  static let stableReadinessDuration: TimeInterval = 0.10
}

final class ScannerCameraPhase0Bridge: NSObject {
  static func register(with registrar: FlutterPluginRegistrar) {
    let bridge = ScannerCameraPhase0Bridge()
    let channel = FlutterMethodChannel(
      name: "grookai/scanner_camera_phase0",
      binaryMessenger: registrar.messenger()
    )
    registrar.addMethodCallDelegate(bridge, channel: channel)

    let factory = ScannerCameraPhase0ViewFactory()
    registrar.register(factory, withId: "grookai/scanner_camera_phase0_preview")
  }
}

extension ScannerCameraPhase0Bridge: FlutterPlugin {
  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    let camera = ScannerCameraPhase0CameraController.shared

    switch call.method {
    case "startSession":
      camera.startSession()
      result(nil)
    case "stopSession":
      camera.stopSession()
      result(nil)
    case "setZoom":
      guard
        let arguments = call.arguments as? [String: Any],
        let zoom = arguments["zoom"] as? NSNumber
      else {
        result(
          FlutterError(
            code: "invalid_zoom",
            message: "Zoom must be provided as a number.",
            details: nil
          )
        )
        return
      }
      camera.setZoom(CGFloat(truncating: zoom))
      result(nil)
    case "setExposureBias":
      guard
        let arguments = call.arguments as? [String: Any],
        let bias = arguments["bias"] as? NSNumber
      else {
        result(
          FlutterError(
            code: "invalid_exposure_bias",
            message: "Exposure bias must be provided as a number.",
            details: nil
          )
        )
        return
      }
      camera.setExposureBias(Float(truncating: bias))
      result(nil)
    case "getReadiness":
      result(camera.readinessPayload())
    case "capture":
      camera.capture { captureResult in
        DispatchQueue.main.async {
          switch captureResult {
          case .success(let payload):
            result(payload)
          case .failure(let error):
            result(error.flutterError)
          }
        }
      }
    default:
      result(FlutterMethodNotImplemented)
    }
  }
}

private extension ScannerCameraPhase0Error {
  var flutterError: FlutterError {
    switch self {
    case .cameraUnavailable:
      return FlutterError(
        code: "camera_unavailable",
        message: "Back camera is unavailable.",
        details: nil
      )
    case .configurationFailed(let message):
      return FlutterError(
        code: "configuration_failed",
        message: message,
        details: nil
      )
    case .permissionDenied:
      return FlutterError(
        code: "permission_denied",
        message: "Camera permission was denied.",
        details: nil
      )
    case .previewUnavailable:
      return FlutterError(
        code: "preview_unavailable",
        message: "Scanner camera preview is not available.",
        details: nil
      )
    case .captureInProgress:
      return FlutterError(
        code: "capture_in_progress",
        message: "A scanner camera capture is already in progress.",
        details: nil
      )
    case .notReady:
      return FlutterError(
        code: "not_ready",
        message: "Scanner is not ready for capture.",
        details: nil
      )
    case .captureFailed(let message):
      return FlutterError(
        code: "capture_failed",
        message: message,
        details: nil
      )
    }
  }
}

private final class ScannerCameraPhase0ViewFactory: NSObject, FlutterPlatformViewFactory {
  func create(
    withFrame frame: CGRect,
    viewIdentifier viewId: Int64,
    arguments args: Any?
  ) -> FlutterPlatformView {
    return ScannerCameraPhase0PlatformView(frame: frame)
  }
}

private final class ScannerCameraPhase0PlatformView: NSObject, FlutterPlatformView {
  private let cameraView: ScannerCameraPhase0View

  init(frame: CGRect) {
    cameraView = ScannerCameraPhase0View(frame: frame)
    super.init()
    cameraView.startSession()
  }

  func view() -> UIView {
    return cameraView
  }

  deinit {
    cameraView.detachPreview()
  }
}

final class ScannerCameraPhase0View: UIView {
  private let controller = ScannerCameraPhase0CameraController.shared
  private let previewLayer = AVCaptureVideoPreviewLayer()

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .black
    previewLayer.videoGravity = .resizeAspectFill
    layer.addSublayer(previewLayer)
    controller.attachPreviewLayer(previewLayer)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer.frame = bounds
  }

  func startSession() {
    controller.startSession()
  }

  func detachPreview() {
    controller.detachPreviewLayer(previewLayer)
  }
}

private final class ScannerCameraPhase0CameraController: NSObject {
  static let shared = ScannerCameraPhase0CameraController()

  private static let sharedSession = AVCaptureSession()

  private let session = ScannerCameraPhase0CameraController.sharedSession
  private let sessionQueue = DispatchQueue(label: "camera.session.queue")
  private let photoOutput = AVCapturePhotoOutput()
  private let motionManager = CMMotionManager()

  private var videoDeviceInput: AVCaptureDeviceInput?
  private var currentZoom: CGFloat = ScannerCameraPhase0Defaults.zoom
  private var currentExposureBias: Float = ScannerCameraPhase0Defaults.exposureBias
  private var didApplyDefaultZoom = false
  private var controlsSettleDeadline = Date.distantPast
  private var lastMotionTimestamp: TimeInterval = 0
  private var lastRotationMagnitude = 0.0
  private var isDeviceStable = false
  private var lastFocusChangeTime = CACurrentMediaTime()
  private var lastExposureChangeTime = CACurrentMediaTime()
  private var readySince: TimeInterval?
  private var isConfigured = false
  private var configurationError: ScannerCameraPhase0Error?
  private var pendingCapture:
    ((Result<[String: Any], ScannerCameraPhase0Error>) -> Void)?

  private override init() {
    super.init()
  }

  func attachPreviewLayer(_ previewLayer: AVCaptureVideoPreviewLayer) {
    DispatchQueue.main.async {
      previewLayer.session = self.session
    }
  }

  func detachPreviewLayer(_ previewLayer: AVCaptureVideoPreviewLayer) {
    DispatchQueue.main.async {
      if let existingSession = previewLayer.session,
        existingSession === self.session {
        previewLayer.session = nil
      }
    }
  }

  func startSession() {
    AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
      guard let self = self else {
        return
      }
      self.sessionQueue.async {
        guard granted else {
          self.configurationError = .permissionDenied
          return
        }

        self.setupSession()
        if self.isConfigured && !self.session.isRunning {
          self.session.startRunning()
        }
        self.startMotionUpdates()
        self.setFocusAndExposureToCenter()
        if !self.didApplyDefaultZoom {
          self.setZoomOnSessionQueue(ScannerCameraPhase0Defaults.zoom)
          self.didApplyDefaultZoom = true
        } else {
          self.setZoomOnSessionQueue(self.currentZoom)
        }
        self.setExposureBiasOnSessionQueue(self.currentExposureBias)
      }
    }
  }

  func stopSession() {
    sessionQueue.async { [weak self] in
      guard let self = self else {
        return
      }
      if self.session.isRunning {
        self.session.stopRunning()
      }
      self.motionManager.stopDeviceMotionUpdates()
    }
  }

  func setZoom(_ zoom: CGFloat) {
    sessionQueue.async { [weak self] in
      self?.setZoomOnSessionQueue(zoom)
    }
  }

  func setExposureBias(_ bias: Float) {
    sessionQueue.async { [weak self] in
      self?.setExposureBiasOnSessionQueue(bias)
    }
  }

  func setFocusAndExposureToCenter() {
    guard let device = videoDeviceInput?.device else {
      return
    }

    do {
      try device.lockForConfiguration()
      defer {
        device.unlockForConfiguration()
      }

      if device.isFocusPointOfInterestSupported {
        device.focusPointOfInterest = CGPoint(x: 0.5, y: 0.5)
        lastFocusChangeTime = CACurrentMediaTime()
        if device.isFocusModeSupported(.continuousAutoFocus) {
          device.focusMode = .continuousAutoFocus
        }
      }

      if device.isExposurePointOfInterestSupported {
        device.exposurePointOfInterest = CGPoint(x: 0.5, y: 0.5)
        lastExposureChangeTime = CACurrentMediaTime()
        if device.isExposureModeSupported(.continuousAutoExposure) {
          device.exposureMode = .continuousAutoExposure
        }
      }

      markControlsNeedSettle()
    } catch {
      print("Focus/Exposure config error: \(error)")
    }
  }

  func isFocusStable() -> Bool {
    return CACurrentMediaTime() - lastFocusChangeTime > 0.15
  }

  func isExposureStable() -> Bool {
    return CACurrentMediaTime() - lastExposureChangeTime > 0.15
  }

  func isReadyForCapture() -> Bool {
    return currentReadiness().ready
  }

  func readinessPayload() -> [String: Any] {
    var payload: [String: Any] = [:]
    sessionQueue.sync {
      let readiness = self.currentReadiness()
      payload = [
        "ready": readiness.ready,
        "deviceStable": readiness.deviceStable,
        "focusStable": readiness.focusStable,
        "exposureStable": readiness.exposureStable,
        "lastMotionTimestamp": self.lastMotionTimestamp,
      ]
    }
    return payload
  }

  func capture(
    completion: @escaping (Result<[String: Any], ScannerCameraPhase0Error>) -> Void
  ) {
    sessionQueue.async { [weak self] in
      guard let self = self else {
        completion(.failure(.previewUnavailable))
        return
      }

      if let configurationError = self.configurationError {
        completion(.failure(configurationError))
        return
      }

      self.setupSession()
      guard self.isConfigured else {
        completion(.failure(.configurationFailed("Camera session is not configured.")))
        return
      }

      guard self.pendingCapture == nil else {
        completion(.failure(.captureInProgress))
        return
      }

      if !self.session.isRunning {
        self.session.startRunning()
        self.setFocusAndExposureToCenter()
        self.setZoomOnSessionQueue(self.currentZoom)
        self.setExposureBiasOnSessionQueue(self.currentExposureBias)
      }

      self.pendingCapture = completion
      self.capturePhotoAfterControlsSettle()
    }
  }

  private func setupSession() {
    guard !isConfigured else {
      return
    }

    session.beginConfiguration()
    session.sessionPreset = .photo

    guard
      let device = AVCaptureDevice.default(
        .builtInWideAngleCamera,
        for: .video,
        position: .back
      )
    else {
      configurationError = .cameraUnavailable
      session.commitConfiguration()
      return
    }

    do {
      let input = try AVCaptureDeviceInput(device: device)
      guard session.canAddInput(input) else {
        configurationError = .configurationFailed("Camera input cannot be added.")
        session.commitConfiguration()
        return
      }
      session.addInput(input)
      videoDeviceInput = input
    } catch {
      configurationError = .configurationFailed(error.localizedDescription)
      session.commitConfiguration()
      return
    }

    guard session.canAddOutput(photoOutput) else {
      configurationError = .configurationFailed("Photo output cannot be added.")
      session.commitConfiguration()
      return
    }
    session.addOutput(photoOutput)

    if photoOutput.isHighResolutionCaptureEnabled == false {
      photoOutput.isHighResolutionCaptureEnabled = true
    }

    session.commitConfiguration()
    isConfigured = true
  }

  private func setZoomOnSessionQueue(_ zoom: CGFloat) {
    guard let device = videoDeviceInput?.device else {
      return
    }

    let zoomFactor = max(1.0, min(zoom, 3.0, device.activeFormat.videoMaxZoomFactor))

    do {
      try device.lockForConfiguration()
      defer {
        device.unlockForConfiguration()
      }
      device.videoZoomFactor = zoomFactor
      currentZoom = zoomFactor
      lastFocusChangeTime = CACurrentMediaTime()
      lastExposureChangeTime = CACurrentMediaTime()
      markControlsNeedSettle()
    } catch {
      print("Zoom error: \(error)")
    }
  }

  private func setExposureBiasOnSessionQueue(_ bias: Float) {
    guard let device = videoDeviceInput?.device else {
      return
    }

    let biasFactor = max(
      device.minExposureTargetBias,
      min(bias, device.maxExposureTargetBias)
    )

    do {
      try device.lockForConfiguration()
      defer {
        device.unlockForConfiguration()
      }
      device.setExposureTargetBias(biasFactor, completionHandler: nil)
      currentExposureBias = biasFactor
      lastExposureChangeTime = CACurrentMediaTime()
      markControlsNeedSettle()
    } catch {
      print("Exposure bias error: \(error)")
    }
  }

  private func markControlsNeedSettle() {
    readySince = nil
    controlsSettleDeadline = Date().addingTimeInterval(
      ScannerCameraPhase0Defaults.captureSettleDelay
    )
  }

  private func startMotionUpdates() {
    guard motionManager.isDeviceMotionAvailable else {
      isDeviceStable = true
      return
    }

    if motionManager.isDeviceMotionActive {
      return
    }

    motionManager.deviceMotionUpdateInterval = 1.0 / 30.0
    motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, _ in
      guard let self = self, let motion = motion else {
        return
      }

      let rotation =
        abs(motion.rotationRate.x) +
        abs(motion.rotationRate.y) +
        abs(motion.rotationRate.z)

      self.sessionQueue.async {
        self.lastMotionTimestamp = motion.timestamp
        self.lastRotationMagnitude = rotation
        self.isDeviceStable = rotation < 0.10
        if !self.isDeviceStable {
          self.readySince = nil
        }
      }
    }
  }

  private func capturePhotoAfterControlsSettle() {
    let delay = max(0, controlsSettleDeadline.timeIntervalSinceNow)
    guard delay > 0 else {
      capturePhotoIfReady()
      return
    }

    sessionQueue.asyncAfter(deadline: .now() + delay) { [weak self] in
      self?.capturePhotoIfReady()
    }
  }

  private func capturePhotoIfReady() {
    guard isReadyForCapture() else {
      completeCapture(.failure(.notReady))
      return
    }

    capturePhotoOnSessionQueue()
  }

  private func currentReadiness() -> (
    ready: Bool,
    deviceStable: Bool,
    focusStable: Bool,
    exposureStable: Bool
  ) {
    let focusStable = isFocusStable()
    let exposureStable = isExposureStable()
    let veryUnstable = lastRotationMagnitude > 0.25
    let rawReady = !veryUnstable && isDeviceStable && focusStable && exposureStable
    let now = CACurrentMediaTime()

    if rawReady {
      if readySince == nil {
        readySince = now
      }
    } else {
      readySince = nil
    }

    let stableReady = readySince.map {
      now - $0 >= ScannerCameraPhase0Defaults.stableReadinessDuration
    } ?? false

    return (
      ready: stableReady,
      deviceStable: isDeviceStable,
      focusStable: focusStable,
      exposureStable: exposureStable
    )
  }

  private func capturePhotoOnSessionQueue() {
    guard pendingCapture != nil else {
      return
    }

    let settings = makePhotoSettings()
    photoOutput.capturePhoto(with: settings, delegate: self)
  }

  private func makePhotoSettings() -> AVCapturePhotoSettings {
    if photoOutput.availablePhotoCodecTypes.contains(.jpeg) {
      let settings = AVCapturePhotoSettings(
        format: [AVVideoCodecKey: AVVideoCodecType.jpeg]
      )
      settings.isHighResolutionPhotoEnabled = true
      return settings
    }

    let settings = AVCapturePhotoSettings()
    settings.isHighResolutionPhotoEnabled = true
    return settings
  }

  private func completeCapture(
    _ result: Result<[String: Any], ScannerCameraPhase0Error>
  ) {
    guard let pendingCapture = pendingCapture else {
      return
    }
    self.pendingCapture = nil
    pendingCapture(result)
  }

  private func imageDimensions(from data: Data) -> (width: Int, height: Int) {
    guard
      let source = CGImageSourceCreateWithData(data as CFData, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil)
        as? [CFString: Any]
    else {
      return (0, 0)
    }

    let width = properties[kCGImagePropertyPixelWidth] as? Int ?? 0
    let height = properties[kCGImagePropertyPixelHeight] as? Int ?? 0
    return (width, height)
  }
}

extension ScannerCameraPhase0CameraController: AVCapturePhotoCaptureDelegate {
  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishProcessingPhoto photo: AVCapturePhoto,
    error: Error?
  ) {
    sessionQueue.async { [weak self] in
      guard let self = self else {
        return
      }

      if let error = error {
        self.completeCapture(.failure(.captureFailed(error.localizedDescription)))
        return
      }

      guard let data = photo.fileDataRepresentation() else {
        self.completeCapture(.failure(.captureFailed("Photo output returned no data.")))
        return
      }

      let filename = "\(UUID().uuidString).jpg"
      let url = URL(fileURLWithPath: NSTemporaryDirectory())
        .appendingPathComponent(filename)

      do {
        try data.write(to: url, options: .atomic)
        let dimensions = self.imageDimensions(from: data)
        let payload: [String: Any] = [
          "imagePath": url.path,
          "width": dimensions.width,
          "height": dimensions.height,
          "fileSize": data.count,
          "zoom": Double(self.currentZoom),
          "exposureBias": Double(self.currentExposureBias),
          "ready": self.isReadyForCapture(),
        ]
        self.completeCapture(.success(payload))
      } catch {
        self.completeCapture(.failure(.captureFailed(error.localizedDescription)))
      }
    }
  }
}
