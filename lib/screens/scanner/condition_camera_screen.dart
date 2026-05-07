import 'dart:async';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../widgets/scanner/condition_capture_overlay.dart';
import '../../services/scanner/native_quad_detector.dart';
import '../../services/scanner_v3/convergence_state_v1.dart';
import '../../services/scanner_v3/scanner_v3_live_loop_controller.dart';
import '../../services/scanner_v4/scanner_v4_diagnostic_capture_v1.dart';
import '../../services/scanner_v4/scanner_v4_diagnostic_test_runner_v1.dart';
import '../../services/scanner_v4/scanner_v4_debug_action_bus_v1.dart';
import 'widgets/scanner_v3_camera_overlay.dart';

class ConditionCameraScreen extends StatefulWidget {
  final String title;
  final String? hintText;
  final bool enableScannerV3LiveLoopPrototype;
  final bool autoStartScannerV4DiagnosticTest;

  const ConditionCameraScreen({
    super.key,
    required this.title,
    this.hintText,
    this.enableScannerV3LiveLoopPrototype = false,
    this.autoStartScannerV4DiagnosticTest = false,
  });

  @override
  State<ConditionCameraScreen> createState() => _ConditionCameraScreenState();
}

class _ConditionCameraScreenState extends State<ConditionCameraScreen> {
  static const double _minNativeBridgeConfidence = 0.45;

  final GlobalKey _previewAreaKey = GlobalKey();
  CameraController? _controller;
  Future<void>? _initFuture;
  bool _takingPicture = false;
  StreamSubscription<AccelerometerEvent>? _accelSub;
  StreamSubscription<String>? _scannerV4DebugActionSub;
  OverlayMode _overlayMode = OverlayMode.neutral;
  String _liveStatus = 'Align card inside frame';
  DateTime _lastQuadUpdate = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastAccelUpdate = DateTime.fromMillisecondsSinceEpoch(0);
  final NativeQuadDetector _quadDetector = NativeQuadDetector();
  List<Offset>? _quadPoints;
  Offset? _lastFocusTapNorm;
  DateTime _lastFocusTapAt = DateTime.fromMillisecondsSinceEpoch(0);
  bool _focusApisReady = false;
  bool _didLogInitFocusModeError = false;
  bool _didLogInitExposureModeError = false;
  bool _didLogTapFocusError = false;
  bool _didLogTapExposureError = false;
  bool _streaming = false;
  bool _processingScannerV3LiveLoopFrame = false;
  ScannerV3LiveLoopController? _scannerV3LoopController;
  ScannerV3LiveLoopState _scannerV3LoopState = ScannerV3LiveLoopState.initial;
  final bool _scannerV3ArtifactExportEnabled = kDebugMode;
  bool _scannerV3FlashEnabled = false;
  bool _scannerV3DebugExpanded = false;
  final ScannerV4DiagnosticCaptureV1 _scannerV4DiagnosticCapture =
      ScannerV4DiagnosticCaptureV1();
  late final ScannerV4DiagnosticTestRunnerV1 _scannerV4DiagnosticTestRunner;
  String? _scannerV4DiagnosticsLastExportPath;
  bool _scannerV4AutoTestStartedFromLaunch = false;
  ResolutionPreset _cameraResolutionPreset = ResolutionPreset.high;
  Size? _cameraPreviewSize;
  Size? _cameraInputSize;
  String? _cameraInitFallbackReason;
  bool get _canShoot => !_takingPicture && _overlayMode == OverlayMode.ready;
  bool get _useScannerV3LiveLoop =>
      widget.enableScannerV3LiveLoopPrototype || widget.title == 'Scan Card';

  @override
  void initState() {
    super.initState();
    _scannerV4DiagnosticTestRunner = ScannerV4DiagnosticTestRunnerV1(
      capture: _scannerV4DiagnosticCapture,
    )..addListener(_handleScannerV4AutoTestChanged);
    if (kDebugMode) {
      _scannerV4DebugActionSub =
          ScannerV4DebugActionBusV1.attachScannerActionListener((action) {
            if (action != ScannerV4DebugActionBusV1.scannerV4AutoTestAction) {
              return;
            }
            debugPrint(
              '[scanner_v4_auto_test] adb_action_starting_auto_test_existing_scanner',
            );
            _startScannerV4AutoTest();
          });
    }
    if (_useScannerV3LiveLoop) {
      _scannerV3LoopController = ScannerV3LiveLoopController(
        exportArtifactsOnLock: _scannerV3ArtifactExportEnabled,
        onLockArtifactExported: (result) {
          if (!kDebugMode) return;
          if (result.success) {
            debugPrint(
              '[scanner_v3_lock_export] saved=${result.outputDirectory}',
            );
          } else {
            debugPrint('[scanner_v3_lock_export] skipped=${result.error}');
          }
        },
      );
    }
    _initCamera();
  }

  Future<void> _initCamera() async {
    final cams = await availableCameras();
    CameraDescription? back;
    for (final cam in cams) {
      if (cam.lensDirection == CameraLensDirection.back) {
        back = cam;
        break;
      }
    }
    back ??= cams.isNotEmpty ? cams.first : null;
    if (back == null) return;
    final controller = await _createInitializedCameraController(back);
    if (controller == null) return;
    _controller = controller;
    _initFuture = _configureInitializedCamera(controller).then((_) async {
      try {
        await controller.setFocusMode(FocusMode.auto);
      } catch (e) {
        if (kDebugMode && !_didLogInitFocusModeError) {
          debugPrint('[FOCUS] setFocusMode(auto) skipped: $e');
          _didLogInitFocusModeError = true;
        }
      }
      try {
        await controller.setExposureMode(ExposureMode.auto);
      } catch (e) {
        if (kDebugMode && !_didLogInitExposureModeError) {
          debugPrint('[FOCUS] setExposureMode(auto) skipped: $e');
          _didLogInitExposureModeError = true;
        }
      }
      _focusApisReady = true;
      _startStream();
      _maybeAutoStartScannerV4DiagnosticTest();
    });
    if (mounted) {
      setState(() {});
    }
    _startSensors();
  }

  Future<CameraController?> _createInitializedCameraController(
    CameraDescription camera,
  ) async {
    final presets = _useScannerV3LiveLoop
        ? const <ResolutionPreset>[
            ResolutionPreset.veryHigh,
            ResolutionPreset.high,
            ResolutionPreset.medium,
          ]
        : const <ResolutionPreset>[ResolutionPreset.high];
    Object? firstError;

    for (final preset in presets) {
      final controller = CameraController(
        camera,
        preset,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.yuv420,
      );
      try {
        await controller.initialize();
        _cameraResolutionPreset = preset;
        _cameraPreviewSize = controller.value.previewSize;
        _cameraInitFallbackReason = firstError == null
            ? null
            : 'fallback_to_${_resolutionPresetLabel(preset)}:$firstError';
        if (kDebugMode) {
          debugPrint(
            '[scanner_camera] preset=${_resolutionPresetLabel(preset)} '
            'preview=${_formatSize(_cameraPreviewSize)} '
            'fallback=${_cameraInitFallbackReason ?? "none"}',
          );
        }
        return controller;
      } catch (error) {
        firstError ??= error;
        if (kDebugMode) {
          debugPrint(
            '[scanner_camera] init failed preset=${_resolutionPresetLabel(preset)} error=$error',
          );
        }
        unawaited(controller.dispose());
      }
    }

    if (kDebugMode) {
      debugPrint('[scanner_camera] all camera presets failed: $firstError');
    }
    return null;
  }

  Future<void> _configureInitializedCamera(CameraController controller) async {
    _cameraPreviewSize = controller.value.previewSize;
  }

  Future<void> _handlePreviewTap(TapDownDetails details) async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    final context = _previewAreaKey.currentContext;
    final renderObject = context?.findRenderObject();
    if (renderObject is! RenderBox || !renderObject.hasSize) return;
    final size = renderObject.size;
    if (size.width <= 0 || size.height <= 0) return;

    final local = renderObject.globalToLocal(details.globalPosition);
    final nx = (local.dx / size.width).clamp(0.0, 1.0).toDouble();
    final ny = (local.dy / size.height).clamp(0.0, 1.0).toDouble();
    final norm = Offset(nx, ny);

    final tapAt = DateTime.now();
    if (mounted) {
      setState(() {
        _lastFocusTapNorm = norm;
        _lastFocusTapAt = tapAt;
      });
    }
    Future.delayed(const Duration(milliseconds: 650), () {
      if (!mounted) return;
      if (_lastFocusTapAt == tapAt) {
        setState(() {
          _lastFocusTapNorm = null;
        });
      }
    });

    if (controller.value.focusPointSupported) {
      try {
        await controller.setFocusPoint(norm);
      } catch (e) {
        if (kDebugMode && !_didLogTapFocusError && _focusApisReady) {
          debugPrint('[FOCUS] setFocusPoint skipped: $e');
          _didLogTapFocusError = true;
        }
      }
    }

    if (controller.value.exposurePointSupported) {
      try {
        await controller.setExposurePoint(norm);
      } catch (e) {
        if (kDebugMode && !_didLogTapExposureError && _focusApisReady) {
          debugPrint('[FOCUS] setExposurePoint skipped: $e');
          _didLogTapExposureError = true;
        }
      }
    }
  }

  void _startStream() {
    if (_controller == null ||
        _streaming ||
        !_controller!.value.isInitialized) {
      return;
    }
    _streaming = true;
    _controller!.startImageStream((image) async {
      final imageSize = Size(image.width.toDouble(), image.height.toDouble());
      if (_cameraInputSize != imageSize && mounted) {
        setState(() {
          _cameraInputSize = imageSize;
        });
      }
      final now = DateTime.now();
      if (now.difference(_lastQuadUpdate).inMilliseconds < 200) return;
      _lastQuadUpdate = now;
      final rotation = _controller?.description.sensorOrientation ?? 0;
      final quadDetection = await _detectNativeQuad(image, rotation);
      final points = quadDetection.success ? quadDetection.pointsNorm : null;

      if (points != null) {
        if (mounted &&
            (_quadPoints != points || _overlayMode != OverlayMode.ready)) {
          setState(() {
            _quadPoints = points;
            _overlayMode = OverlayMode.ready;
            _liveStatus = 'Ready';
          });
        }
      } else {
        if (_quadPoints != null || _overlayMode != OverlayMode.neutral) {
          setState(() {
            _quadPoints = null;
            _overlayMode = OverlayMode.neutral;
            _liveStatus = 'Align card inside frame';
          });
        }
      }
      await _processScannerV3LiveLoopFrame(
        image,
        rotation,
        points,
        quadDetection,
      );
    });
  }

  Future<void> _processScannerV3LiveLoopFrame(
    CameraImage image,
    int rotation,
    List<Offset>? points,
    _NativeQuadDetection quadDetection,
  ) async {
    final controller = _scannerV3LoopController;
    if (controller == null) return;
    if (_processingScannerV3LiveLoopFrame) return;
    _processingScannerV3LiveLoopFrame = true;

    ScannerV3LiveLoopState? nextState;
    try {
      nextState = await controller.processCameraFrame(
        image: image,
        sensorRotation: rotation,
        quadPointsNorm: points,
        quadDetectorSnapshot: ScannerV3QuadDetectorSnapshot(
          registered: quadDetection.registered,
          called: quadDetection.called,
          success: quadDetection.success,
          confidence: quadDetection.confidence,
          elapsedMs: quadDetection.elapsedMs,
          failureReason: quadDetection.failureReason,
          rawResponse: quadDetection.rawResponse,
        ),
      );
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('[scanner_v3_live_loop] identity pipeline error: $error');
        debugPrint('$stackTrace');
      }
      nextState = null;
    } finally {
      _processingScannerV3LiveLoopFrame = false;
    }
    if (nextState == null || !mounted) return;

    final state = nextState;
    _recordScannerV4Diagnostics(state, quadDetection, points);
    setState(() {
      _scannerV3LoopState = state;
    });
  }

  void _recordScannerV4Diagnostics(
    ScannerV3LiveLoopState state,
    _NativeQuadDetection quadDetection,
    List<Offset>? points,
  ) {
    if (!kDebugMode || !_scannerV4DiagnosticCapture.enabled) return;
    _scannerV4DiagnosticCapture.record(
      ScannerV4DiagnosticSnapshotV1.fromLivePath(
        timestamp: DateTime.now(),
        state: state,
        nativeRegistered: quadDetection.registered,
        nativeCalled: quadDetection.called,
        nativeSuccess: quadDetection.success,
        nativeConfidence: quadDetection.confidence,
        nativeElapsedMs: quadDetection.elapsedMs,
        nativeFailureReason: quadDetection.failureReason,
        pointsPresent:
            quadDetection.pointsNorm != null &&
            quadDetection.pointsNorm!.length == 4,
        nativeRawResponse: quadDetection.rawResponse,
        testPhase: _scannerV4DiagnosticTestRunner.currentCapturePhaseId,
      ),
    );
  }

  Future<_NativeQuadDetection> _detectNativeQuad(
    CameraImage image,
    int rotation,
  ) async {
    final stopwatch = Stopwatch()..start();
    final rawResponse = await _quadDetector.detect(image, rotation);
    stopwatch.stop();

    if (rawResponse == null) {
      return _NativeQuadDetection(
        registered: true,
        called: true,
        success: false,
        elapsedMs: stopwatch.elapsedMilliseconds,
        failureReason: 'no_native_quad_response',
      );
    }

    final points = _extractQuadPoints(rawResponse);
    final rawSuccess = rawResponse['success'] == true;
    final confidence = _asDouble(rawResponse['confidence']);
    final failureReason = _nativeQuadFailureReason(
      rawSuccess: rawSuccess,
      pointsPresent: points != null,
      confidence: confidence,
      rawResponse: rawResponse,
    );
    return _NativeQuadDetection(
      registered: true,
      called: true,
      success: failureReason == null,
      pointsNorm: points,
      confidence: confidence,
      elapsedMs:
          _asInt(rawResponse['elapsed_ms']) ??
          _asInt(rawResponse['elapsedMs']) ??
          stopwatch.elapsedMilliseconds,
      failureReason: failureReason,
      rawResponse: rawResponse,
    );
  }

  String? _nativeQuadFailureReason({
    required bool rawSuccess,
    required bool pointsPresent,
    required double? confidence,
    required Map<String, dynamic> rawResponse,
  }) {
    if (!rawSuccess) return 'native_success_false';
    if (!pointsPresent) {
      return _asString(rawResponse['failure_reason']) ??
          _asString(rawResponse['failureReason']) ??
          'quad_points_unparseable';
    }
    if (confidence == null) return 'native_confidence_missing';
    if (confidence < _minNativeBridgeConfidence) {
      return 'native_confidence_below_bridge_floor';
    }
    return null;
  }

  List<Offset>? _extractQuadPoints(Map<String, dynamic> rawResponse) {
    final rawPoints =
        rawResponse['points'] ??
        rawResponse['points_norm'] ??
        rawResponse['quad'] ??
        rawResponse['quad_norm'];
    if (rawPoints is! List || rawPoints.length < 4) return null;

    final points = <Offset>[];
    if (rawPoints.length == 8 && rawPoints.every((value) => value is num)) {
      for (var i = 0; i < 8; i += 2) {
        points.add(
          Offset(
            (rawPoints[i] as num).toDouble(),
            (rawPoints[i + 1] as num).toDouble(),
          ),
        );
      }
      return points;
    }

    for (final point in rawPoints.take(4)) {
      if (point is Map) {
        final x = _asDouble(point['x'] ?? point['dx']);
        final y = _asDouble(point['y'] ?? point['dy']);
        if (x == null || y == null) return null;
        points.add(Offset(x, y));
      } else if (point is List && point.length >= 2) {
        final x = _asDouble(point[0]);
        final y = _asDouble(point[1]);
        if (x == null || y == null) return null;
        points.add(Offset(x, y));
      } else {
        return null;
      }
    }

    return points.length == 4 ? points : null;
  }

  double? _asDouble(Object? value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.round();
    if (value is String) return int.tryParse(value);
    return null;
  }

  String? _asString(Object? value) {
    if (value == null) return null;
    return value.toString();
  }

  @override
  void dispose() {
    final controller = _controller;
    _controller = null;
    _streaming = false;
    _accelSub?.cancel();
    _scannerV4DebugActionSub?.cancel();
    _scannerV4DiagnosticTestRunner
      ..removeListener(_handleScannerV4AutoTestChanged)
      ..dispose();
    unawaited(controller?.dispose());
    super.dispose();
  }

  Future<void> _takePicture() async {
    final controller = _controller;
    if (controller == null) {
      debugPrint('[SHUTTER] takePicture blocked: controller=null');
      return;
    }
    if (!controller.value.isInitialized) {
      debugPrint('[SHUTTER] takePicture blocked: controller not initialized');
      return;
    }
    if (_takingPicture) {
      debugPrint('[SHUTTER] takePicture blocked: already taking');
      return;
    }
    setState(() {
      _takingPicture = true;
    });
    final wasStreaming = controller.value.isStreamingImages;
    try {
      if (wasStreaming) {
        await controller.stopImageStream();
        _streaming = false;
      }
      final file = await controller.takePicture();
      if (!mounted) return;
      Navigator.of(context).pop(file);
    } catch (e, st) {
      debugPrint('[SHUTTER] takePicture ERROR: $e');
      debugPrint('$st');
      if (wasStreaming && mounted) {
        _startStream();
      }
      setState(() {
        _takingPicture = false;
      });
      rethrow;
    }
  }

  void _startSensors() {
    _accelSub = accelerometerEventStream().listen((event) {
      final now = DateTime.now();
      if (now.difference(_lastAccelUpdate).inMilliseconds < 100) return;
      _lastAccelUpdate = now;
      final mag = math.sqrt(event.x * event.x + event.y * event.y);
      OverlayMode nextMode = OverlayMode.neutral;
      String nextStatus = widget.hintText ?? 'Align card inside frame';
      if (mag < 2.0) {
        nextMode = OverlayMode.ready;
        nextStatus = 'Ready';
      } else if (mag < 3.5) {
        nextMode = OverlayMode.warn;
        nextStatus = 'Straighten / reduce tilt';
      } else {
        nextMode = OverlayMode.warn;
        nextStatus = 'Too tilted';
      }
      if (mounted) {
        setState(() {
          _overlayMode = nextMode;
          _liveStatus = nextStatus;
        });
      }
    });
  }

  void _resetScannerV3Loop() {
    _scannerV3LoopController?.reset();
    if (!mounted) return;
    setState(() {
      _scannerV3LoopState = ScannerV3LiveLoopState.initial;
      _scannerV3DebugExpanded = false;
    });
  }

  void _toggleScannerV4Diagnostics(bool enabled) {
    if (!kDebugMode) return;
    if (_scannerV4DiagnosticTestRunner.isRunning) return;
    setState(() {
      if (enabled) {
        _scannerV4DiagnosticCapture.start();
        _scannerV4DiagnosticsLastExportPath = null;
      } else {
        _scannerV4DiagnosticCapture.stop();
      }
    });
    debugPrint('[scanner_v4_diagnostics] ${enabled ? "enabled" : "disabled"}');
  }

  void _handleScannerV4AutoTestChanged() {
    if (!mounted) return;
    setState(() {});
  }

  void _startScannerV4AutoTest() {
    if (!kDebugMode) return;
    setState(() {
      _scannerV3DebugExpanded = true;
      _scannerV4DiagnosticsLastExportPath = null;
    });
    _scannerV4DiagnosticTestRunner.start();
  }

  void _maybeAutoStartScannerV4DiagnosticTest() {
    if (!kDebugMode ||
        !widget.autoStartScannerV4DiagnosticTest ||
        _scannerV4AutoTestStartedFromLaunch ||
        !_useScannerV3LiveLoop) {
      return;
    }
    _scannerV4AutoTestStartedFromLaunch = true;
    debugPrint('[scanner_v4_auto_test] adb_action_starting_auto_test');
    if (mounted) {
      setState(() {
        _scannerV3DebugExpanded = false;
        _scannerV4DiagnosticsLastExportPath = null;
      });
    }
    _scannerV4DiagnosticTestRunner.start();
  }

  void _cancelScannerV4AutoTest() {
    if (!kDebugMode) return;
    _scannerV4DiagnosticTestRunner.cancel();
  }

  Future<void> _exportScannerV4AutoTestReport() async {
    if (!kDebugMode) return;
    final result = await _scannerV4DiagnosticTestRunner.exportLastReport();
    if (!mounted) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger?.showSnackBar(
      SnackBar(
        content: Text(
          result.path != null
              ? 'Scanner V4 auto test saved: ${result.path}'
              : 'Scanner V4 auto test printed to console',
        ),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  Future<void> _exportScannerV4Diagnostics() async {
    if (!kDebugMode) return;
    final result = await _scannerV4DiagnosticCapture.exportReport();
    if (!mounted) return;
    setState(() {
      _scannerV4DiagnosticsLastExportPath = result.path;
    });
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger?.showSnackBar(
      SnackBar(
        content: Text(
          result.path != null
              ? 'Scanner V4 diagnostics saved: ${result.path}'
              : 'Scanner V4 diagnostics printed to console',
        ),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  void _openManualSearch() {
    Navigator.of(context).maybePop();
  }

  Future<void> _toggleScannerV3Flash() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    final next = !_scannerV3FlashEnabled;
    try {
      await controller.setFlashMode(next ? FlashMode.torch : FlashMode.off);
      if (!mounted) return;
      setState(() {
        _scannerV3FlashEnabled = next;
      });
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[scanner_v3_flash] toggle skipped: $error');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    assert(
      _overlayMode != OverlayMode.ready || (_canShoot || _takingPicture),
      'Invariant violated: overlayMode=ready but shutter cannot shoot. Do not reintroduce split readiness.',
    );
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: _useScannerV3LiveLoop,
      appBar: _useScannerV3LiveLoop
          ? null
          : AppBar(
              title: Text(widget.title),
              leading: IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
      body: SafeArea(
        top: !_useScannerV3LiveLoop,
        bottom: !_useScannerV3LiveLoop,
        child: Column(
          children: [
            Expanded(
              child: FutureBuilder<void>(
                future: _initFuture,
                builder: (context, snap) {
                  if (snap.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (_controller == null ||
                      !_controller!.value.isInitialized) {
                    return const Center(child: Text('Camera not available'));
                  }
                  return LayoutBuilder(
                    builder: (context, constraints) {
                      final paddingH = 16.0;
                      final paddingV = 24.0;
                      final available = Size(
                        constraints.maxWidth,
                        constraints.maxHeight,
                      );
                      final guideWidth = available.width - paddingH * 2;
                      final guideHeight = guideWidth / 0.716;
                      double finalGuideHeight = guideHeight;
                      double finalGuideWidth = guideWidth;
                      if (finalGuideHeight > available.height - paddingV * 2) {
                        finalGuideHeight = available.height - paddingV * 2;
                        finalGuideWidth = finalGuideHeight * 0.716;
                      }
                      final left = (available.width - finalGuideWidth) / 2;
                      final top = (available.height - finalGuideHeight) / 2;
                      final guideRect = Rect.fromLTWH(
                        left,
                        top,
                        finalGuideWidth,
                        finalGuideHeight,
                      );
                      return GestureDetector(
                        key: _previewAreaKey,
                        behavior: HitTestBehavior.translucent,
                        onTapDown: (details) {
                          unawaited(_handlePreviewTap(details));
                        },
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: CameraPreview(_controller!),
                            ),
                            if (_useScannerV3LiveLoop)
                              ScannerV3CameraOverlay(
                                state: _scannerV3LoopState,
                                guideRect: guideRect,
                                quadPointsNorm: _quadPoints,
                                focusTapNorm: _lastFocusTapNorm,
                                exportEnabled: _scannerV3ArtifactExportEnabled,
                                flashEnabled: _scannerV3FlashEnabled,
                                debugExpanded: _scannerV3DebugExpanded,
                                cameraPresetLabel: _resolutionPresetLabel(
                                  _cameraResolutionPreset,
                                ),
                                cameraPreviewSize: _cameraPreviewSize,
                                cameraInputSize: _cameraInputSize,
                                cameraInitFallbackReason:
                                    _cameraInitFallbackReason,
                                diagnosticsEnabled:
                                    _scannerV4DiagnosticCapture.enabled,
                                diagnosticsFrameCount:
                                    _scannerV4DiagnosticCapture.frameCount,
                                diagnosticsLastExportPath:
                                    _scannerV4DiagnosticsLastExportPath,
                                autoTestStatus:
                                    _scannerV4DiagnosticTestRunner.status,
                                onClose: () => Navigator.of(context).pop(),
                                onToggleFlash: () {
                                  unawaited(_toggleScannerV3Flash());
                                },
                                onToggleDebug: () {
                                  setState(() {
                                    _scannerV3DebugExpanded =
                                        !_scannerV3DebugExpanded;
                                  });
                                },
                                onTryAgain: _resetScannerV3Loop,
                                onSearchManually: _openManualSearch,
                                onToggleDiagnostics:
                                    _toggleScannerV4Diagnostics,
                                onExportDiagnostics: () {
                                  unawaited(_exportScannerV4Diagnostics());
                                },
                                onStartAutoTest: _startScannerV4AutoTest,
                                onCancelAutoTest: _cancelScannerV4AutoTest,
                                onExportAutoTestReport: () {
                                  unawaited(_exportScannerV4AutoTestReport());
                                },
                              )
                            else
                              IgnorePointer(
                                ignoring: true,
                                child: ConditionCaptureOverlay(
                                  guideRect: guideRect,
                                  statusText: _liveStatus,
                                  isReady: _overlayMode == OverlayMode.ready,
                                  mode: _overlayMode,
                                  quadPointsNorm: _quadPoints,
                                  focusTapNorm: _lastFocusTapNorm,
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
            if (!_useScannerV3LiveLoop)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: GestureDetector(
                  onTap: _canShoot ? _takePicture : null,
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _takingPicture
                          ? theme.colorScheme.primary.withValues(alpha: 0.3)
                          : _canShoot
                          ? theme.colorScheme.primary
                          : theme.colorScheme.primary.withValues(alpha: 0.4),
                      boxShadow: [
                        BoxShadow(
                          color: theme.colorScheme.primary.withValues(
                            alpha: 0.25,
                          ),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.circle,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

String _resolutionPresetLabel(ResolutionPreset preset) {
  switch (preset) {
    case ResolutionPreset.low:
      return 'low';
    case ResolutionPreset.medium:
      return 'medium';
    case ResolutionPreset.high:
      return 'high';
    case ResolutionPreset.veryHigh:
      return 'veryHigh';
    case ResolutionPreset.ultraHigh:
      return 'ultraHigh';
    case ResolutionPreset.max:
      return 'max';
  }
}

String _formatSize(Size? size) {
  if (size == null) return 'unknown';
  return '${size.width.round()}x${size.height.round()}';
}

class _NativeQuadDetection {
  const _NativeQuadDetection({
    required this.registered,
    required this.called,
    required this.success,
    this.pointsNorm,
    this.confidence,
    this.elapsedMs,
    this.failureReason,
    this.rawResponse,
  });

  final bool registered;
  final bool called;
  final bool success;
  final List<Offset>? pointsNorm;
  final double? confidence;
  final int? elapsedMs;
  final String? failureReason;
  final Map<String, dynamic>? rawResponse;
}
