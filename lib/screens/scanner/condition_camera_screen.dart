import 'dart:async';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../widgets/scanner/condition_capture_overlay.dart';
import '../../services/scanner/native_condition_camera_bridge.dart';
import '../../services/scanner/native_quad_detector.dart';
import '../../services/scanner/scanner_native_camera_guardrail.dart';
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
  static const bool _scannerV3CameraQualityProbeEnabled = bool.fromEnvironment(
    'SCANNER_V3_CAMERA_QUALITY_PROBE',
  );
  static const double _minNativeBridgeConfidence = 0.45;
  static const Duration _selectedCardRetention = Duration(seconds: 30);
  static const Duration _selectedCardIdentityFreshness = Duration(
    milliseconds: 320,
  );
  static const double _selectedCardCenterDeadband = 0.030;
  static const double _selectedCardSizeDeadband = 0.050;
  static const double _selectedCardSlowSmoothing = 0.04;
  static const double _selectedCardFastSmoothing = 0.12;
  static const double _cardTapHitSlop = 0.025;
  static const double _cardTapNearestMaxDistance = 0.14;
  static const Duration _cardCandidateRetention = Duration(milliseconds: 900);
  static const Duration _pendingCardSelectionRetention = Duration(
    milliseconds: 2200,
  );
  static const Duration _scannerV3AnalysisInterval = Duration(
    milliseconds: 220,
  );
  static const Duration _scannerV3AutoFocusCooldown = Duration(
    milliseconds: 1400,
  );
  static const double _scannerV3AutoFocusMoveThreshold = 0.075;
  static const double _scannerV3AutoFocusSizeThreshold = 0.12;
  static const Duration _scannerV3FocusIndicatorDuration = Duration(
    milliseconds: 520,
  );
  static const double _scannerV3QuadCenterPublishDeadband = 0.020;
  static const double _scannerV3QuadSizePublishDeadband = 0.030;
  static const int _scannerV3DisplayQuadMinHits = 2;
  static const int _scannerV3DisplayQuadMaxMisses = 3;
  static const double _scannerV3DisplayQuadMatchIou = 0.16;
  static const double _scannerV3DisplayQuadMatchCenter = 0.14;
  static const Duration _scannerV3DisplayPublishMinInterval = Duration(
    milliseconds: 420,
  );
  static const Duration _scannerV3DisplayPublishForceInterval = Duration(
    milliseconds: 1100,
  );
  static const Duration _scannerV3RevealGrace = Duration(seconds: 8);
  static const int _scannerV3ScanMemoryLimit = 10;
  static const List<int> _scannerV3GuidedSlotOptions = <int>[1, 2, 4];

  final GlobalKey _previewAreaKey = GlobalKey();
  CameraController? _controller;
  Future<void>? _initFuture;
  bool _takingPicture = false;
  StreamSubscription<AccelerometerEvent>? _accelSub;
  StreamSubscription<String>? _scannerV4DebugActionSub;
  OverlayMode _overlayMode = OverlayMode.neutral;
  String _liveStatus = 'Align card inside frame';
  DateTime _lastQuadUpdate = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastScannerV3OverlayPublishAt = DateTime.fromMillisecondsSinceEpoch(
    0,
  );
  DateTime _lastAccelUpdate = DateTime.fromMillisecondsSinceEpoch(0);
  final NativeQuadDetector _quadDetector = NativeQuadDetector();
  List<Offset>? _quadPoints;
  List<List<Offset>>? _quadPointSets;
  List<_ScannerV3DisplayQuadTrack> _scannerV3DisplayQuadTracks =
      <_ScannerV3DisplayQuadTrack>[];
  int _scannerV3NextDisplayQuadTrackId = 1;
  DateTime _cardCandidateLastSeenAt = DateTime.fromMillisecondsSinceEpoch(0);
  List<Offset>? _selectedCardQuadNorm;
  DateTime _selectedCardLastSeenAt = DateTime.fromMillisecondsSinceEpoch(0);
  Offset? _pendingCardSelectionTapNorm;
  DateTime? _pendingCardSelectionTapAt;
  Offset? _lastFocusTapNorm;
  DateTime _lastFocusTapAt = DateTime.fromMillisecondsSinceEpoch(0);
  Rect? _lastAutoFocusBoundsNorm;
  DateTime _lastAutoFocusAt = DateTime.fromMillisecondsSinceEpoch(0);
  bool _focusRequestInFlight = false;
  bool _focusApisReady = false;
  bool _didLogInitFocusModeError = false;
  bool _didLogInitExposureModeError = false;
  bool _didLogTapFocusError = false;
  bool _didLogTapExposureError = false;
  bool _didLogAutoFocusError = false;
  bool _didLogAutoExposureError = false;
  bool _streaming = false;
  bool _processingScannerV3FrameTick = false;
  bool _processingScannerV3LiveLoopFrame = false;
  ScannerV3LiveLoopController? _scannerV3LoopController;
  ScannerV3LiveLoopState _scannerV3LoopState = ScannerV3LiveLoopState.initial;
  bool _scannerV3IdentityRevealRequested = false;
  DateTime? _scannerV3IdentityRevealRequestedAt;
  String? _scannerV3LastRememberedCandidateId;
  List<ScannerV3ScanMemoryEntry> _scannerV3ScanMemory =
      const <ScannerV3ScanMemoryEntry>[];
  int _scannerV3GuidedSlotCount = 1;
  int _scannerV3ActiveGuidedSlotIndex = 0;
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
  int? _lastScannerFrameRotation;
  bool _nativeConditionCameraReady = false;
  NativeConditionCameraMetrics? _nativeConditionCameraMetrics;
  Timer? _nativeConditionCameraMetricsTimer;
  final _ScannerCameraFpsCounter _cameraStreamFpsCounter =
      _ScannerCameraFpsCounter();
  final _ScannerCameraFpsCounter _scannerV3AnalysisFpsCounter =
      _ScannerCameraFpsCounter();
  final _ScannerCameraFpsCounter _scannerV3LiveLoopFpsCounter =
      _ScannerCameraFpsCounter();
  bool get _canShoot => !_takingPicture && _overlayMode == OverlayMode.ready;
  bool get _useScannerV3LiveLoop =>
      widget.enableScannerV3LiveLoopPrototype || widget.title == 'Scan Card';
  bool get _useNativeConditionCamera =>
      _useScannerV3LiveLoop &&
      ScannerNativeCameraGuardrail.nativeConditionCameraRequestedForScanCard(
        defaultTargetPlatform,
      );
  bool get _useScannerV3GuidedSlots => _useScannerV3LiveLoop;

  @override
  void initState() {
    super.initState();
    if (_useScannerV3LiveLoop) {
      unawaited(_enterScannerV3ImmersiveMode());
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        unawaited(_enterScannerV3ImmersiveMode());
      });
    }
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
      unawaited(_scannerV3LoopController!.warmIdentityService());
    }
    _initCamera();
  }

  Future<void> _enterScannerV3ImmersiveMode() async {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
    );
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  Future<void> _restoreScannerV3SystemUi() async {
    await SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: SystemUiOverlay.values,
    );
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );
  }

  Future<void> _initCamera() async {
    if (_useNativeConditionCamera) {
      _initFuture = _initNativeConditionCamera();
      if (mounted) {
        setState(() {});
      }
      return;
    }

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
      _focusApisReady = true;
      _startStream();
      _maybeAutoStartScannerV4DiagnosticTest();
      unawaited(_warmScannerCameraFocusAndExposure(controller));
    });
    if (mounted) {
      setState(() {});
    }
    _startSensors();
  }

  Future<void> _warmScannerCameraFocusAndExposure(
    CameraController controller,
  ) async {
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
    unawaited(
      _requestCameraFocusPoint(
        const Offset(0.5, 0.48),
        force: true,
        showIndicator: false,
        source: _ScannerV3FocusSource.auto,
      ),
    );
  }

  Future<void> _initNativeConditionCamera() async {
    _cameraInitFallbackReason = null;
    _cameraPreviewSize = null;
    _cameraInputSize = null;
    NativeConditionCameraBridge.attachFrameListener(
      _handleNativeConditionCameraFrame,
      onDetection: _handleNativeConditionCameraDetection,
    );
    _nativeConditionCameraReady = true;
    unawaited(_consumeNativeConditionCameraPrewarmFrame());
    _startNativeConditionCameraMetricsPolling();
    _maybeAutoStartScannerV4DiagnosticTest();
  }

  Future<void> _consumeNativeConditionCameraPrewarmFrame() async {
    try {
      final frame = await NativeConditionCameraBridge.consumePrewarmFrame();
      if (!mounted || frame == null) return;
      if (kDebugMode) {
        debugPrint('[scanner_prewarm] consumed_frame=1');
      }
      await _handleNativeConditionCameraFrame(
        frame.image,
        frame.sensorRotation,
        frame.nativeQuadResponse,
      );
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[scanner_prewarm] consume_frame_failed=$error');
      }
    }
  }

  void _startNativeConditionCameraMetricsPolling() {
    _nativeConditionCameraMetricsTimer?.cancel();
    _nativeConditionCameraMetricsTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) {
        unawaited(_refreshNativeConditionCameraMetrics());
      },
    );
    unawaited(_refreshNativeConditionCameraMetrics());
  }

  Future<void> _refreshNativeConditionCameraMetrics() async {
    if (!_useNativeConditionCamera || !mounted) return;
    try {
      final metrics = await NativeConditionCameraBridge.getMetrics();
      if (!mounted) return;
      setState(() {
        _nativeConditionCameraMetrics = metrics;
        _cameraPreviewSize = metrics.previewSize;
        _cameraInputSize = metrics.analysisSize;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _cameraInitFallbackReason = 'native_metrics_unavailable:$error';
      });
    }
  }

  Future<CameraController?> _createInitializedCameraController(
    CameraDescription camera,
  ) async {
    final presets = _useScannerV3LiveLoop
        ? _scannerV3CameraQualityProbeEnabled
              ? const <ResolutionPreset>[
                  ResolutionPreset.veryHigh,
                  ResolutionPreset.high,
                  ResolutionPreset.medium,
                ]
              : const <ResolutionPreset>[
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
    if (!_useNativeConditionCamera &&
        (controller == null || !controller.value.isInitialized)) {
      return;
    }

    final context = _previewAreaKey.currentContext;
    final renderObject = context?.findRenderObject();
    if (renderObject is! RenderBox || !renderObject.hasSize) return;
    final size = renderObject.size;
    if (size.width <= 0 || size.height <= 0) return;

    final local = renderObject.globalToLocal(details.globalPosition);
    final cameraViewport = _scannerCameraViewportRect(size);
    final nx = ((local.dx - cameraViewport.left) / cameraViewport.width)
        .clamp(0.0, 1.0)
        .toDouble();
    final ny = ((local.dy - cameraViewport.top) / cameraViewport.height)
        .clamp(0.0, 1.0)
        .toDouble();
    final norm = Offset(nx, ny);
    final selectedCardQuad = _cardQuadAtTap(norm);
    final selectedCardChanged = selectedCardQuad == null
        ? false
        : !_isSameSelectedCard(selectedCardQuad);

    final tapAt = DateTime.now();
    final selectedBounds = selectedCardQuad == null
        ? null
        : _quadBounds(selectedCardQuad);
    final focusNorm = selectedBounds?.center ?? norm;
    if (mounted) {
      setState(() {
        if (selectedCardQuad != null) {
          if (selectedCardChanged) {
            _scannerV3LoopController?.reset();
            _scannerV3LoopState =
                _scannerV3LoopController?.state ??
                ScannerV3LiveLoopState.initial;
            _scannerV3IdentityRevealRequested = false;
            _scannerV3IdentityRevealRequestedAt = null;
            _scannerV3LastRememberedCandidateId = null;
          }
          _selectedCardQuadNorm = selectedCardQuad;
          _selectedCardLastSeenAt = tapAt;
          if (_useScannerV3GuidedSlots) {
            _scannerV3ActiveGuidedSlotIndex = _scannerV3SlotIndexForQuad(
              selectedCardQuad,
            );
          }
          _pendingCardSelectionTapNorm = null;
          _pendingCardSelectionTapAt = null;
          _quadPointSets = _selectedCardFirst(_quadPointSets, selectedCardQuad);
          _quadPoints = selectedCardQuad;
        } else if (_useScannerV3LiveLoop) {
          _pendingCardSelectionTapNorm = norm;
          _pendingCardSelectionTapAt = tapAt;
        } else {
          _lastFocusTapNorm = focusNorm;
          _lastFocusTapAt = tapAt;
        }
      });
    }
    _lastAutoFocusBoundsNorm = selectedBounds;
    if (selectedCardQuad != null || _useScannerV3LiveLoop) {
      if (_useNativeConditionCamera) return;
      unawaited(
        _requestCameraFocusPoint(
          focusNorm,
          force: true,
          showIndicator: true,
          source: _ScannerV3FocusSource.tap,
        ),
      );
      return;
    }

    await _requestCameraFocusPoint(
      focusNorm,
      force: true,
      showIndicator: true,
      source: _ScannerV3FocusSource.tap,
    );
  }

  Future<void> _requestCameraFocusPoint(
    Offset norm, {
    required bool force,
    required bool showIndicator,
    required _ScannerV3FocusSource source,
  }) async {
    final controller = _controller;
    if (controller == null ||
        !controller.value.isInitialized ||
        !_focusApisReady) {
      return;
    }
    final now = DateTime.now();
    if (!force &&
        now.difference(_lastAutoFocusAt) < _scannerV3AutoFocusCooldown) {
      return;
    }
    if (_focusRequestInFlight) return;

    final clampedNorm = Offset(
      norm.dx.clamp(0.0, 1.0).toDouble(),
      norm.dy.clamp(0.0, 1.0).toDouble(),
    );
    _focusRequestInFlight = true;
    _lastAutoFocusAt = now;
    if (showIndicator && mounted) {
      setState(() {
        _lastFocusTapNorm = clampedNorm;
        _lastFocusTapAt = now;
      });
      _clearFocusIndicatorAfter(now);
    }

    try {
      if (controller.value.focusPointSupported) {
        try {
          await controller.setFocusPoint(clampedNorm);
        } catch (e) {
          final shouldLogTap =
              source == _ScannerV3FocusSource.tap && !_didLogTapFocusError;
          final shouldLogAuto =
              source == _ScannerV3FocusSource.auto && !_didLogAutoFocusError;
          if (kDebugMode && (shouldLogTap || shouldLogAuto)) {
            debugPrint('[FOCUS] setFocusPoint skipped: $e');
            if (source == _ScannerV3FocusSource.tap) {
              _didLogTapFocusError = true;
            } else {
              _didLogAutoFocusError = true;
            }
          }
        }
      }

      if (controller.value.exposurePointSupported) {
        try {
          await controller.setExposurePoint(clampedNorm);
        } catch (e) {
          final shouldLogTap =
              source == _ScannerV3FocusSource.tap && !_didLogTapExposureError;
          final shouldLogAuto =
              source == _ScannerV3FocusSource.auto && !_didLogAutoExposureError;
          if (kDebugMode && (shouldLogTap || shouldLogAuto)) {
            debugPrint('[FOCUS] setExposurePoint skipped: $e');
            if (source == _ScannerV3FocusSource.tap) {
              _didLogTapExposureError = true;
            } else {
              _didLogAutoExposureError = true;
            }
          }
        }
      }
    } finally {
      _focusRequestInFlight = false;
    }
  }

  void _clearFocusIndicatorAfter(DateTime focusAt) {
    Future.delayed(_scannerV3FocusIndicatorDuration, () {
      if (!mounted) return;
      if (_lastFocusTapAt == focusAt) {
        setState(() {
          _lastFocusTapNorm = null;
        });
      }
    });
  }

  void _startStream() {
    if (_controller == null ||
        _streaming ||
        !_controller!.value.isInitialized) {
      return;
    }
    _streaming = true;
    _controller!.startImageStream((image) async {
      final now = DateTime.now();
      final rotation = _controller?.description.sensorOrientation ?? 0;
      await _handleScannerAnalysisFrame(
        image: image,
        rotation: rotation,
        now: now,
        countStreamFrame: true,
        nativeQuadResponse: null,
      );
    });
  }

  Future<void> _handleNativeConditionCameraFrame(
    CameraImage image,
    int rotation,
    Map<String, dynamic>? nativeQuadResponse,
  ) async {
    final now = DateTime.now();
    _recordScannerCameraFpsTick(_cameraStreamFpsCounter, now);
    await _handleScannerAnalysisFrame(
      image: image,
      rotation: rotation,
      now: now,
      countStreamFrame: false,
      nativeQuadResponse: nativeQuadResponse,
    );
  }

  Future<void> _handleNativeConditionCameraDetection(
    NativeConditionCameraDetection detection,
  ) async {
    if (!mounted) return;
    final now = DateTime.now();
    final imageSize = Size(
      detection.width.toDouble(),
      detection.height.toDouble(),
    );
    if (_cameraInputSize != imageSize && detection.width > 0) {
      setState(() {
        _cameraInputSize = imageSize;
      });
    }
    final quadDetection = _nativeQuadDetectionFromRawResponse(
      detection.nativeQuadResponse,
      fallbackElapsedMs: null,
    );
    _updateScannerV3OverlayFromQuadDetection(
      quadDetection,
      now: now,
      guidedSlotQuadsNorm: _useScannerV3GuidedSlots
          ? _scannerV3GuidedSlotQuadsNorm()
          : null,
    );
  }

  Future<void> _handleScannerAnalysisFrame({
    required CameraImage image,
    required int rotation,
    required DateTime now,
    required bool countStreamFrame,
    Map<String, dynamic>? nativeQuadResponse,
  }) async {
    if (countStreamFrame) {
      _recordScannerCameraFpsTick(_cameraStreamFpsCounter, now);
    }
    _lastScannerFrameRotation = rotation;
    final imageSize = Size(image.width.toDouble(), image.height.toDouble());
    if (_cameraInputSize != imageSize && mounted) {
      setState(() {
        _cameraInputSize = imageSize;
      });
    }
    if (now.difference(_lastQuadUpdate) < _scannerV3AnalysisInterval) return;
    if (_processingScannerV3FrameTick) return;
    _lastQuadUpdate = now;
    _recordScannerCameraFpsTick(_scannerV3AnalysisFpsCounter, now);
    _processingScannerV3FrameTick = true;
    try {
      final frameWatch = Stopwatch()..start();
      final quadDetection = nativeQuadResponse == null
          ? await _detectNativeQuad(image, rotation)
          : _nativeQuadDetectionFromRawResponse(
              nativeQuadResponse,
              fallbackElapsedMs: null,
            );
      final detectorElapsedMs = frameWatch.elapsedMilliseconds;
      final guidedSlotQuads = _useScannerV3GuidedSlots
          ? _scannerV3GuidedSlotQuadsNorm()
          : null;
      final guidedIdentityQuads = _scannerV3ActiveGuidedIdentityQuads(
        guidedSlotQuads,
      );
      final rawIdentityPoints = _updateScannerV3OverlayFromQuadDetection(
        quadDetection,
        now: now,
        guidedSlotQuadsNorm: guidedSlotQuads,
      );
      final selectedCardIdentityTarget = _selectedCardIdentityTargetActive(now);
      final identityPoints = guidedIdentityQuads?.first ?? rawIdentityPoints;
      await _processScannerV3LiveLoopFrame(
        image,
        rotation,
        identityPoints,
        quadDetection,
        guidedSlotQuadsNorm: guidedSlotQuads,
        identityQuadPointSetsNorm: guidedIdentityQuads,
        selectedCardIdentityTarget: selectedCardIdentityTarget,
      );
      if (kDebugMode && _scannerV3LoopState.sampledFrameCount <= 40) {
        final scannerV3BestCandidate = _scannerV3LoopState.bestCandidate;
        debugPrint(
          '[scanner_v3_frame_debug] '
          'total=${frameWatch.elapsedMilliseconds} '
          'detector=$detectorElapsedMs '
          'native=${quadDetection.success ? 1 : 0} '
          'native_conf=${quadDetection.confidence?.toStringAsFixed(2) ?? "none"} '
          'native_quads=${quadDetection.cardQuadsNorm?.length ?? 0} '
          'native_fail=${quadDetection.failureReason ?? "ok"} '
          'native_diag=${_nativeQuadDebugSummary(quadDetection.rawResponse)} '
          'state=${_scannerV3LoopState.identityDecisionState} '
          'reason=${_scannerV3LoopState.lastDecisionReason} '
          'source=${_scannerV3LoopState.selectedQuadSource} '
          'card_present=${_scannerV3LoopState.cardPresent} '
          'card_reason=${_scannerV3LoopState.cardPresentReason} '
          'best=${scannerV3BestCandidate?.name ?? scannerV3BestCandidate?.id ?? "none"} '
          'best_gv=${scannerV3BestCandidate?.gvId ?? "none"} '
          'best_rank=${scannerV3BestCandidate?.bestRank ?? -1} '
          'best_dist=${scannerV3BestCandidate?.vectorDistance?.toStringAsFixed(3) ?? "none"} '
          'best_score=${scannerV3BestCandidate?.score.toStringAsFixed(2) ?? "none"} '
          'gap=${_scannerV3LoopState.identityScoreGap.toStringAsFixed(2)} '
          'frame_gap=${_scannerV3LoopState.identityFrameScoreGap.toStringAsFixed(3)} '
          'crops=${_scannerV3LoopState.identityCropSupportCount} '
          'crop_types=${scannerV3BestCandidate?.contributingCropTypes.join("|") ?? "none"} '
          'recent=${_scannerV3LoopState.identityRecentFrameSupportCount} '
          'accepted=${_scannerV3LoopState.acceptedFrameCount} '
          'sampled=${_scannerV3LoopState.sampledFrameCount}',
        );
      }
    } finally {
      _processingScannerV3FrameTick = false;
    }
  }

  List<Offset>? _updateScannerV3OverlayFromQuadDetection(
    _NativeQuadDetection quadDetection, {
    required DateTime now,
    List<List<Offset>>? guidedSlotQuadsNorm,
  }) {
    if (guidedSlotQuadsNorm != null && guidedSlotQuadsNorm.isNotEmpty) {
      final selected = _selectedCardQuadNorm;
      final displayPointSets = selected == null
          ? guidedSlotQuadsNorm
          : (_selectedCardFirst(guidedSlotQuadsNorm, selected) ??
                guidedSlotQuadsNorm);
      final displayPoints = displayPointSets.isNotEmpty
          ? displayPointSets.first
          : null;
      if (displayPoints != null) {
        _cardCandidateLastSeenAt = now;
        final shouldPublishVisibleFrame =
            _scannerV3VisibleFrameChanged(
              displayPoints,
              displayPointSets,
              now,
            ) ||
            _overlayMode != OverlayMode.ready;
        if (mounted && shouldPublishVisibleFrame) {
          setState(() {
            _quadPoints = displayPoints;
            _quadPointSets = displayPointSets;
            _overlayMode = OverlayMode.ready;
            _liveStatus = 'Ready';
            _lastScannerV3OverlayPublishAt = now;
          });
        } else {
          _quadPoints = displayPoints;
          _quadPointSets = displayPointSets;
        }
      }
      return _selectedCardIdentityTargetActive(now) ? selected : displayPoints;
    }

    final rawPointSets = quadDetection.success
        ? quadDetection.cardQuadsNorm
        : null;
    final displayPointSets = _trackedCardQuads(rawPointSets, now: now);
    final displayPoints =
        displayPointSets != null && displayPointSets.isNotEmpty
        ? displayPointSets.first
        : null;
    final rawIdentityPoints = _selectedCardIdentityTargetActive(now)
        ? _selectedCardQuadNorm
        : rawPointSets != null && rawPointSets.isNotEmpty
        ? rawPointSets.first
        : quadDetection.success
        ? quadDetection.pointsNorm
        : null;

    if (displayPoints != null) {
      _cardCandidateLastSeenAt = now;
      _maybeAutoFocusScannerV3(displayPoints, now: now);
      final shouldPublishVisibleFrame =
          _scannerV3VisibleFrameChanged(displayPoints, displayPointSets, now) ||
          _overlayMode != OverlayMode.ready;
      if (mounted && shouldPublishVisibleFrame) {
        setState(() {
          _quadPoints = displayPoints;
          _quadPointSets = displayPointSets;
          _overlayMode = OverlayMode.ready;
          _liveStatus = 'Ready';
          _lastScannerV3OverlayPublishAt = now;
        });
      }
      return rawIdentityPoints;
    }

    final retainCardCandidates =
        _quadPoints != null &&
        now.difference(_cardCandidateLastSeenAt) <= _cardCandidateRetention;
    if (retainCardCandidates) {
      return rawIdentityPoints;
    }
    if (_quadPoints != null || _overlayMode != OverlayMode.neutral) {
      setState(() {
        _quadPoints = null;
        _quadPointSets = null;
        _scannerV3DisplayQuadTracks = <_ScannerV3DisplayQuadTrack>[];
        _selectedCardQuadNorm = null;
        _lastAutoFocusBoundsNorm = null;
        _overlayMode = OverlayMode.neutral;
        _liveStatus = 'Align card inside frame';
        _lastScannerV3OverlayPublishAt = now;
      });
    }
    return rawIdentityPoints;
  }

  List<List<Offset>>? _scannerV3ActiveGuidedIdentityQuads(
    List<List<Offset>>? guidedSlotQuadsNorm,
  ) {
    if (guidedSlotQuadsNorm == null || guidedSlotQuadsNorm.isEmpty) {
      return null;
    }
    final activeSlotIndex = _scannerV3ActiveGuidedSlotIndex.clamp(
      0,
      guidedSlotQuadsNorm.length - 1,
    );
    final activeSlot = guidedSlotQuadsNorm[activeSlotIndex];
    if (activeSlot.length != 4) return null;
    return <List<Offset>>[List<Offset>.from(activeSlot)];
  }

  String? _scannerV3FixedSlotOccupancyBlockedReason(
    _NativeQuadDetection quadDetection,
    List<List<Offset>> guidedSlotQuadsNorm,
  ) {
    if (guidedSlotQuadsNorm.isEmpty) return 'fixed_slot_missing';
    final activeSlotIndex = _scannerV3ActiveGuidedSlotIndex.clamp(
      0,
      guidedSlotQuadsNorm.length - 1,
    );
    final slotBounds = _quadBounds(guidedSlotQuadsNorm[activeSlotIndex]);
    if (slotBounds == null) return 'fixed_slot_invalid';

    final rawQuads = <List<Offset>>[
      if (quadDetection.cardQuadsNorm != null)
        for (final quad in quadDetection.cardQuadsNorm!)
          if (quad.length == 4) quad,
      if ((quadDetection.cardQuadsNorm == null ||
              quadDetection.cardQuadsNorm!.isEmpty) &&
          quadDetection.pointsNorm != null &&
          quadDetection.pointsNorm!.length == 4)
        quadDetection.pointsNorm!,
    ];
    if (rawQuads.isEmpty) {
      return quadDetection.failureReason == null
          ? 'fixed_slot_card_missing'
          : 'fixed_slot_card_missing:${quadDetection.failureReason}';
    }

    _ScannerV3FixedSlotOccupancy? best;
    for (final rawQuad in rawQuads) {
      final rawBounds = _quadBounds(rawQuad);
      if (rawBounds == null) continue;
      final rawArea = rawBounds.width * rawBounds.height;
      final slotArea = slotBounds.width * slotBounds.height;
      if (rawArea <= 0 || slotArea <= 0) continue;
      final intersection = _rectIntersectionArea(slotBounds, rawBounds);
      final cardInSlot = intersection / rawArea;
      final slotCoverage = intersection / slotArea;
      final areaRatio = rawArea / slotArea;
      final centerDistance = (slotBounds.center - rawBounds.center).distance;
      final slotAspect = slotBounds.width / slotBounds.height;
      final rawAspect = rawBounds.width / rawBounds.height;
      final aspectPenalty = math.log(rawAspect / slotAspect).abs();
      final centerInside = slotBounds.inflate(0.035).contains(rawBounds.center);
      final score =
          (slotCoverage * 2.0) +
          cardInSlot -
          (centerDistance * 0.90) -
          (math.max(0.0, 0.36 - areaRatio) * 1.4) -
          (math.max(0.0, areaRatio - 1.60) * 0.65) -
          (aspectPenalty * 0.25);
      final occupancy = _ScannerV3FixedSlotOccupancy(
        cardInSlot: cardInSlot,
        slotCoverage: slotCoverage,
        areaRatio: areaRatio,
        centerDistance: centerDistance,
        aspectPenalty: aspectPenalty,
        centerInside: centerInside,
        score: score,
      );
      if (best == null || occupancy.score > best.score) {
        best = occupancy;
      }
    }

    final occupancy = best;
    if (occupancy == null) return 'fixed_slot_card_missing';
    if (occupancy.centerInside &&
        occupancy.cardInSlot >= 0.58 &&
        occupancy.slotCoverage >= 0.34 &&
        occupancy.areaRatio >= 0.36 &&
        occupancy.areaRatio <= 1.60 &&
        occupancy.aspectPenalty <= 0.55) {
      return null;
    }
    return 'fixed_slot_card_not_filling_slot:'
        'slot=${occupancy.slotCoverage.toStringAsFixed(2)};'
        'card=${occupancy.cardInSlot.toStringAsFixed(2)};'
        'area=${occupancy.areaRatio.toStringAsFixed(2)};'
        'center=${occupancy.centerDistance.toStringAsFixed(2)};'
        'aspect=${occupancy.aspectPenalty.toStringAsFixed(2)}';
  }

  Future<void> _processScannerV3LiveLoopFrame(
    CameraImage image,
    int rotation,
    List<Offset>? points,
    _NativeQuadDetection quadDetection, {
    List<List<Offset>>? guidedSlotQuadsNorm,
    List<List<Offset>>? identityQuadPointSetsNorm,
    required bool selectedCardIdentityTarget,
  }) async {
    final controller = _scannerV3LoopController;
    if (controller == null) return;
    if (_processingScannerV3LiveLoopFrame) return;
    _processingScannerV3LiveLoopFrame = true;
    _recordScannerCameraFpsTick(_scannerV3LiveLoopFpsCounter, DateTime.now());
    final identityPointSets = <List<Offset>>[
      if (identityQuadPointSetsNorm != null)
        ...identityQuadPointSetsNorm
      else if (guidedSlotQuadsNorm != null)
        ...guidedSlotQuadsNorm
      else if (quadDetection.cardQuadsNorm != null)
        ...quadDetection.cardQuadsNorm!,
    ];
    final hasGuidedSlots =
        guidedSlotQuadsNorm != null && guidedSlotQuadsNorm.isNotEmpty;
    final fixedSlotOccupancyBlockedReason = hasGuidedSlots
        ? _scannerV3FixedSlotOccupancyBlockedReason(
            quadDetection,
            guidedSlotQuadsNorm,
          )
        : null;

    ScannerV3LiveLoopState? nextState;
    try {
      nextState = await controller.processCameraFrame(
        image: image,
        sensorRotation: rotation,
        quadPointsNorm: points,
        quadPointSetsNorm: identityPointSets.isEmpty ? null : identityPointSets,
        guidedSlotTarget: hasGuidedSlots,
        selectedCardTarget: selectedCardIdentityTarget,
        allowIdentityLock: _scannerV3IdentityRevealRequested,
        fixedSlotOccupancyBlockedReason: fixedSlotOccupancyBlockedReason,
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
    final hasVisibleCard =
        _quadPoints != null || (_quadPointSets?.isNotEmpty ?? false);
    final revealRequestedAt = _scannerV3IdentityRevealRequestedAt;
    final revealGraceActive =
        _scannerV3IdentityRevealRequested &&
        revealRequestedAt != null &&
        DateTime.now().difference(revealRequestedAt) <= _scannerV3RevealGrace;
    final clearReveal =
        !state.locked &&
        !revealGraceActive &&
        (_useScannerV3GuidedSlots || !hasVisibleCard) &&
        !state.cardPresent &&
        !state.identityAllowed;
    final rememberLock = _scannerV3IdentityRevealRequested && state.locked;
    final shouldRebuild =
        _scannerV3DebugExpanded ||
        clearReveal ||
        rememberLock ||
        _scannerV3ShouldPublishLoopState(_scannerV3LoopState, state);
    if (shouldRebuild) {
      setState(() {
        _scannerV3LoopState = state;
        if (clearReveal) {
          _scannerV3IdentityRevealRequested = false;
          _scannerV3IdentityRevealRequestedAt = null;
          _scannerV3LastRememberedCandidateId = null;
        }
        if (rememberLock) {
          _rememberScannerV3LockedCard(state);
        }
      });
    } else {
      _scannerV3LoopState = state;
    }
  }

  bool _scannerV3ShouldPublishLoopState(
    ScannerV3LiveLoopState previous,
    ScannerV3LiveLoopState next,
  ) {
    if (previous.identityDecisionState != next.identityDecisionState) {
      return true;
    }
    if (previous.locked != next.locked ||
        previous.lockedCandidateId != next.lockedCandidateId ||
        previous.currentBestCandidateId != next.currentBestCandidateId) {
      return true;
    }
    if (previous.cardPresent != next.cardPresent ||
        previous.identityAllowed != next.identityAllowed ||
        previous.cardPresentReason != next.cardPresentReason ||
        previous.identityBlockedReason != next.identityBlockedReason) {
      return true;
    }
    if (previous.selectedQuadSource != next.selectedQuadSource ||
        previous.quality.accepted != next.quality.accepted) {
      return true;
    }
    if ((previous.confidenceScore - next.confidenceScore).abs() >= 0.04) {
      return true;
    }
    return false;
  }

  bool _scannerV3ShouldDisplayRawDetectorOverlay(ScannerV3LiveLoopState state) {
    if (_useScannerV3GuidedSlots) return false;
    if (_selectedCardQuadNorm != null) return true;
    if (_scannerV3IdentityRevealRequested || state.locked) return false;
    return _scannerV3DebugExpanded &&
        state.cardPresent &&
        state.selectedQuadSource == 'native_detector';
  }

  void _recordScannerCameraFpsTick(
    _ScannerCameraFpsCounter counter,
    DateTime now,
  ) {
    if (!kDebugMode) return;
    final changed = counter.tick(now);
    if (changed && mounted && _scannerV3DebugExpanded) {
      setState(() {});
    }
  }

  bool _scannerV3VisibleFrameChanged(
    List<Offset>? nextPoints,
    List<List<Offset>>? nextPointSets,
    DateTime now,
  ) {
    final elapsedSincePublish = now.difference(_lastScannerV3OverlayPublishAt);
    if (elapsedSincePublish < _scannerV3DisplayPublishMinInterval &&
        _overlayMode == OverlayMode.ready) {
      return false;
    }

    final visuallyDifferent =
        _quadVisuallyDifferent(_quadPoints, nextPoints) ||
        _quadSetsVisuallyDifferent(_quadPointSets, nextPointSets);
    if (!visuallyDifferent) return false;
    if (elapsedSincePublish >= _scannerV3DisplayPublishForceInterval) {
      return true;
    }

    // Keep the selected frame responsive after a long still hold without
    // letting small detector noise rebuild the camera surface every tick.
    return _selectedCardQuadNorm == null ||
        _quadVisuallyDifferent(_selectedCardQuadNorm, nextPoints);
  }

  void _maybeAutoFocusScannerV3(
    List<Offset> quad, {
    required DateTime now,
    bool force = false,
  }) {
    if (!_useScannerV3LiveLoop || !_focusApisReady || _focusRequestInFlight) {
      return;
    }
    final bounds = _quadBounds(quad);
    if (bounds == null) return;
    final previous = _lastAutoFocusBoundsNorm;
    if (!force &&
        previous != null &&
        !_autoFocusTargetChanged(previous, bounds)) {
      return;
    }
    if (!force &&
        now.difference(_lastAutoFocusAt) < _scannerV3AutoFocusCooldown) {
      return;
    }

    _lastAutoFocusBoundsNorm = bounds;
    unawaited(
      _requestCameraFocusPoint(
        bounds.center,
        force: force,
        showIndicator: false,
        source: _ScannerV3FocusSource.auto,
      ),
    );
  }

  bool _autoFocusTargetChanged(Rect previous, Rect next) {
    final centerDistance = (previous.center - next.center).distance;
    final widthScale = previous.width <= 0
        ? 0.0
        : (previous.width - next.width).abs() / previous.width;
    final heightScale = previous.height <= 0
        ? 0.0
        : (previous.height - next.height).abs() / previous.height;
    final sizeScale = math.max(widthScale, heightScale);
    return centerDistance >= _scannerV3AutoFocusMoveThreshold ||
        sizeScale >= _scannerV3AutoFocusSizeThreshold;
  }

  List<Offset>? _cardQuadAtTap(Offset tapNorm) {
    final guidedSlotQuads = _useScannerV3GuidedSlots
        ? _scannerV3GuidedSlotQuadsNorm()
        : null;
    final pointSets = guidedSlotQuads != null && guidedSlotQuads.isNotEmpty
        ? guidedSlotQuads
        : _quadPointSets != null && _quadPointSets!.isNotEmpty
        ? _quadPointSets!
        : _quadPoints == null
        ? const <List<Offset>>[]
        : <List<Offset>>[_quadPoints!];
    List<Offset>? bestQuad;
    var bestDistance = double.infinity;
    for (final quad in pointSets) {
      if (quad.length != 4) continue;
      final bounds = _quadBounds(quad);
      if (bounds == null) {
        continue;
      }
      final distance = (bounds.center - tapNorm).distance;
      if (!bounds.inflate(_cardTapHitSlop).contains(tapNorm)) {
        continue;
      }
      if (distance < bestDistance) {
        bestDistance = distance;
        bestQuad = quad;
      }
    }
    return bestQuad;
  }

  bool _isSameSelectedCard(List<Offset> candidate) {
    final selected = _selectedCardQuadNorm;
    if (selected == null || selected.length != 4 || candidate.length != 4) {
      return false;
    }
    final selectedBounds = _quadBounds(selected);
    final candidateBounds = _quadBounds(candidate);
    if (selectedBounds == null || candidateBounds == null) return false;

    final iou = _rectIou(selectedBounds, candidateBounds);
    final centerDistance =
        (selectedBounds.center - candidateBounds.center).distance;
    final widthDelta = (selectedBounds.width - candidateBounds.width).abs();
    final heightDelta = (selectedBounds.height - candidateBounds.height).abs();
    final similarSize =
        widthDelta <= (_selectedCardSizeDeadband * 1.6) &&
        heightDelta <= (_selectedCardSizeDeadband * 1.6);
    return iou >= 0.42 ||
        (centerDistance <= _selectedCardCenterDeadband * 2.4 && similarSize);
  }

  bool _selectedCardIdentityTargetActive(DateTime now) {
    final selected = _selectedCardQuadNorm;
    if (selected == null || selected.length != 4) return false;
    final age = now.difference(_selectedCardLastSeenAt);
    return !age.isNegative && age <= _selectedCardIdentityFreshness;
  }

  List<List<Offset>>? _trackedCardQuads(
    List<List<Offset>>? rawPointSets, {
    required DateTime now,
  }) {
    final rawQuads = rawPointSets
        ?.where((quad) => quad.length == 4)
        .map(List<Offset>.from)
        .toList();
    final quads = _deduplicatedDisplayQuads(rawQuads ?? <List<Offset>>[]);
    _updateScannerV3DisplayQuadTracks(quads, now);
    final stableDisplayQuads = _stableScannerV3DisplayQuads();
    final immediateDisplayQuads = stableDisplayQuads.isEmpty
        ? quads
        : stableDisplayQuads;
    final pendingTap = _pendingCardSelectionTapNorm;
    final pendingTapAt = _pendingCardSelectionTapAt;
    if (pendingTap != null &&
        pendingTapAt != null &&
        now.difference(pendingTapAt) <= _pendingCardSelectionRetention) {
      final selectedFromPending = _nearestCardQuadToTap(
        pendingTap,
        immediateDisplayQuads,
      );
      if (selectedFromPending != null) {
        _selectedCardQuadNorm = selectedFromPending;
        _selectedCardLastSeenAt = now;
        _pendingCardSelectionTapNorm = null;
        _pendingCardSelectionTapAt = null;
      }
    } else if (pendingTapAt != null) {
      _pendingCardSelectionTapNorm = null;
      _pendingCardSelectionTapAt = null;
    }

    final selected = _selectedCardQuadNorm;
    if (selected == null || selected.length != 4) {
      return immediateDisplayQuads.isEmpty ? null : immediateDisplayQuads;
    }

    final match = _bestSelectedCardMatch(selected, quads);
    if (match != null) {
      final smoothed = _stabilizeSelectedCardQuad(selected, match.quad);
      _selectedCardQuadNorm = smoothed;
      _selectedCardLastSeenAt = now;
      final remaining = _displayQuadsExcludingSelected(
        stableDisplayQuads,
        smoothed,
      );
      return <List<Offset>>[smoothed, ...remaining];
    }

    if (now.difference(_selectedCardLastSeenAt) <= _selectedCardRetention) {
      final remaining = _displayQuadsExcludingSelected(
        stableDisplayQuads,
        selected,
      );
      return <List<Offset>>[selected, ...remaining];
    }

    _selectedCardQuadNorm = null;
    return immediateDisplayQuads.isEmpty ? null : immediateDisplayQuads;
  }

  List<Offset>? _nearestCardQuadToTap(
    Offset tapNorm,
    List<List<Offset>> quads,
  ) {
    List<Offset>? nearestQuad;
    var nearestDistance = double.infinity;
    for (final quad in quads) {
      if (quad.length != 4) continue;
      final bounds = _quadBounds(quad);
      if (bounds == null) continue;
      final distance = (bounds.center - tapNorm).distance;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestQuad = quad;
      }
    }
    return nearestDistance <= _cardTapNearestMaxDistance ? nearestQuad : null;
  }

  void _updateScannerV3DisplayQuadTracks(
    List<List<Offset>> rawQuads,
    DateTime now,
  ) {
    final usedTrackIds = <int>{};
    for (final rawQuad in rawQuads) {
      final track = _bestDisplayQuadTrack(rawQuad, usedTrackIds);
      if (track == null) {
        _scannerV3DisplayQuadTracks.add(
          _ScannerV3DisplayQuadTrack(
            id: _scannerV3NextDisplayQuadTrackId++,
            quad: rawQuad,
            lastSeenAt: now,
          ),
        );
        continue;
      }
      usedTrackIds.add(track.id);
      final nextQuad = _stabilizeDisplayQuad(track.quad, rawQuad);
      track
        ..quad = nextQuad
        ..hits += 1
        ..misses = 0
        ..lastSeenAt = now;
    }

    final retained = <_ScannerV3DisplayQuadTrack>[];
    for (final track in _scannerV3DisplayQuadTracks) {
      if (!usedTrackIds.contains(track.id) && track.lastSeenAt != now) {
        track.misses += 1;
      }
      final allowedMisses = track.visible ? _scannerV3DisplayQuadMaxMisses : 1;
      if (track.misses <= allowedMisses) {
        retained.add(track);
      }
    }
    _scannerV3DisplayQuadTracks = retained;
  }

  List<List<Offset>> _deduplicatedDisplayQuads(List<List<Offset>> quads) {
    final deduped = <List<Offset>>[];
    for (final quad in quads) {
      final bounds = _quadBounds(quad);
      if (bounds == null) continue;
      var duplicate = false;
      for (var index = 0; index < deduped.length; index += 1) {
        final existing = deduped[index];
        final existingBounds = _quadBounds(existing);
        if (existingBounds == null) continue;
        final iou = _rectIou(bounds, existingBounds);
        final overlapRatio = _rectMinOverlapRatio(bounds, existingBounds);
        final areaRatio = _rectAreaRatio(bounds, existingBounds);
        final centerDistance = (bounds.center - existingBounds.center).distance;
        if (iou >= 0.30 ||
            centerDistance <= 0.10 ||
            (iou >= 0.14 && centerDistance <= 0.30 && areaRatio >= 1.25) ||
            (overlapRatio >= 0.30 && areaRatio >= 1.25)) {
          if (_preferDisplayQuadBounds(bounds, existingBounds)) {
            deduped[index] = quad;
          }
          duplicate = true;
          break;
        }
      }
      if (!duplicate) {
        deduped.add(quad);
      }
    }
    return deduped;
  }

  bool _preferDisplayQuadBounds(Rect candidate, Rect existing) {
    final candidateArea = candidate.width * candidate.height;
    final existingArea = existing.width * existing.height;
    final overlapRatio = _rectMinOverlapRatio(candidate, existing);
    final areaRatio = _rectAreaRatio(candidate, existing);
    if (overlapRatio >= 0.72 && areaRatio >= 1.8) {
      return candidateArea > existingArea;
    }

    final candidateScore = _displayQuadVisualScore(candidate);
    final existingScore = _displayQuadVisualScore(existing);
    if ((candidateScore - existingScore).abs() <= 0.08) {
      if (candidateArea < existingArea * 0.82) return true;
      if (existingArea < candidateArea * 0.82) return false;
    }
    return candidateScore < existingScore;
  }

  _ScannerV3DisplayQuadTrack? _bestDisplayQuadTrack(
    List<Offset> nextQuad,
    Set<int> usedTrackIds,
  ) {
    final nextBounds = _quadBounds(nextQuad);
    if (nextBounds == null) return null;
    _ScannerV3DisplayQuadTrack? bestTrack;
    var bestScore = double.negativeInfinity;
    for (final track in _scannerV3DisplayQuadTracks) {
      if (usedTrackIds.contains(track.id)) continue;
      final previousBounds = _quadBounds(track.quad);
      if (previousBounds == null) continue;
      final centerDistance =
          (previousBounds.center - nextBounds.center).distance;
      final iou = _rectIou(previousBounds, nextBounds);
      if (iou < _scannerV3DisplayQuadMatchIou &&
          centerDistance > _scannerV3DisplayQuadMatchCenter) {
        continue;
      }
      final score = iou - (centerDistance * 0.8);
      if (score > bestScore) {
        bestScore = score;
        bestTrack = track;
      }
    }
    return bestTrack;
  }

  List<List<Offset>> _stableScannerV3DisplayQuads() {
    final visibleTracks =
        _scannerV3DisplayQuadTracks
            .where((track) => track.hits >= _scannerV3DisplayQuadMinHits)
            .toList()
          ..sort((a, b) {
            final aBounds = _quadBounds(a.quad);
            final bBounds = _quadBounds(b.quad);
            if (aBounds == null || bBounds == null) return 0;
            final scoreCompare = _displayQuadVisualScore(
              aBounds,
            ).compareTo(_displayQuadVisualScore(bBounds));
            if (scoreCompare != 0) return scoreCompare;
            return aBounds.center.dx.compareTo(bBounds.center.dx);
          });

    final filteredTracks = visibleTracks
        .where((track) {
          final bounds = _quadBounds(track.quad);
          return bounds != null && _displayQuadVisualScore(bounds) <= 0.42;
        })
        .take(3)
        .toList(growable: false);
    final displayTracks = filteredTracks.isNotEmpty
        ? filteredTracks
        : visibleTracks.take(1).toList(growable: false);
    displayTracks.sort((a, b) {
      final aBounds = _quadBounds(a.quad);
      final bBounds = _quadBounds(b.quad);
      if (aBounds == null || bBounds == null) return 0;
      return aBounds.center.dx.compareTo(bBounds.center.dx);
    });

    for (final track in displayTracks) {
      track.visible = true;
    }
    return <List<Offset>>[
      for (final track in displayTracks) List<Offset>.from(track.quad),
    ];
  }

  double _displayQuadVisualScore(Rect bounds) {
    if (bounds.width <= 0 || bounds.height <= 0) return double.infinity;
    final cameraAspect = _scannerCameraDisplayAspectRatio ?? (2 / 3);
    final expectedAspect =
        ScannerV3LiveLoopController.targetAspectRatio / cameraAspect;
    final aspect = bounds.width / bounds.height;
    final aspectPenalty = (math.log(aspect / expectedAspect)).abs();
    final area = bounds.width * bounds.height;
    final areaPenalty = area < 0.035
        ? (0.035 - area) * 4
        : area > 0.26
        ? (area - 0.26) * 3
        : 0.0;
    return aspectPenalty + areaPenalty;
  }

  List<List<Offset>> _displayQuadsExcludingSelected(
    List<List<Offset>> quads,
    List<Offset> selected,
  ) {
    final selectedBounds = _quadBounds(selected);
    if (selectedBounds == null) return quads;
    return <List<Offset>>[
      for (final quad in quads)
        if (!_quadMatchesBounds(quad, selectedBounds)) quad,
    ];
  }

  bool _quadMatchesBounds(List<Offset> quad, Rect selectedBounds) {
    final bounds = _quadBounds(quad);
    if (bounds == null) return false;
    final iou = _rectIou(selectedBounds, bounds);
    final centerDistance = (selectedBounds.center - bounds.center).distance;
    return iou >= 0.35 || centerDistance <= 0.06;
  }

  List<Offset> _stabilizeDisplayQuad(List<Offset> previous, List<Offset> next) {
    if (!_quadVisuallyDifferent(previous, next)) return previous;
    final previousBounds = _quadBounds(previous);
    final nextBounds = _quadBounds(next);
    if (previousBounds == null || nextBounds == null) return next;
    final centerDistance = (previousBounds.center - nextBounds.center).distance;
    final sizeDelta =
        (previousBounds.width - nextBounds.width).abs() +
        (previousBounds.height - nextBounds.height).abs();
    final t = centerDistance > 0.08 || sizeDelta > 0.16 ? 0.20 : 0.10;
    return _lerpQuad(previous, next, t);
  }

  _SelectedCardMatch? _bestSelectedCardMatch(
    List<Offset> selected,
    List<List<Offset>> quads,
  ) {
    _SelectedCardMatch? best;
    for (var i = 0; i < quads.length; i += 1) {
      final quad = quads[i];
      if (quad.length != 4) continue;
      final selectedBounds = _quadBounds(selected);
      final bounds = _quadBounds(quad);
      if (selectedBounds == null || bounds == null) continue;
      final selectedArea = selectedBounds.width * selectedBounds.height;
      final candidateArea = bounds.width * bounds.height;
      if (selectedArea <= 0 || candidateArea <= 0) continue;
      final areaScale = candidateArea / selectedArea;
      if (areaScale < 0.88 || areaScale > 1.55) continue;
      final iou = _rectIou(selectedBounds, bounds);
      final centerDistance = (selectedBounds.center - bounds.center).distance;
      final score = iou - (centerDistance * 0.55);
      final matches = iou >= 0.16 || centerDistance <= 0.20;
      if (!matches) continue;
      if (best == null || score > best.score) {
        best = _SelectedCardMatch(index: i, quad: quad, score: score);
      }
    }
    return best;
  }

  List<Offset> _stabilizeSelectedCardQuad(
    List<Offset> selected,
    List<Offset> detected,
  ) {
    final selectedBounds = _quadBounds(selected);
    final detectedBounds = _quadBounds(detected);
    if (selectedBounds == null || detectedBounds == null) return selected;

    final centerDistance =
        (selectedBounds.center - detectedBounds.center).distance;
    final widthDelta = (selectedBounds.width - detectedBounds.width).abs();
    final heightDelta = (selectedBounds.height - detectedBounds.height).abs();
    if (centerDistance <= _selectedCardCenterDeadband &&
        widthDelta <= _selectedCardSizeDeadband &&
        heightDelta <= _selectedCardSizeDeadband) {
      return selected;
    }

    final smoothing = centerDistance > 0.075
        ? _selectedCardFastSmoothing
        : _selectedCardSlowSmoothing;
    return _lerpQuad(selected, detected, smoothing);
  }

  List<List<Offset>>? _selectedCardFirst(
    List<List<Offset>>? pointSets,
    List<Offset> selected,
  ) {
    final quads = pointSets?.where((quad) => quad.length == 4).toList();
    if (quads == null || quads.isEmpty) return <List<Offset>>[selected];
    final match = _bestSelectedCardMatch(selected, quads);
    if (match == null) return <List<Offset>>[selected, ...quads];
    return <List<Offset>>[
      selected,
      for (var i = 0; i < quads.length; i += 1)
        if (i != match.index) quads[i],
    ];
  }

  Rect? _quadBounds(List<Offset> quad) {
    if (quad.length != 4) return null;
    var minX = double.infinity;
    var minY = double.infinity;
    var maxX = double.negativeInfinity;
    var maxY = double.negativeInfinity;
    for (final point in quad) {
      if (point.dx < minX) minX = point.dx;
      if (point.dy < minY) minY = point.dy;
      if (point.dx > maxX) maxX = point.dx;
      if (point.dy > maxY) maxY = point.dy;
    }
    if (!minX.isFinite ||
        !minY.isFinite ||
        !maxX.isFinite ||
        !maxY.isFinite ||
        maxX <= minX ||
        maxY <= minY) {
      return null;
    }
    return Rect.fromLTRB(minX, minY, maxX, maxY);
  }

  double _rectIou(Rect a, Rect b) {
    final left = math.max(a.left, b.left);
    final top = math.max(a.top, b.top);
    final right = math.min(a.right, b.right);
    final bottom = math.min(a.bottom, b.bottom);
    if (right <= left || bottom <= top) return 0;
    final intersection = (right - left) * (bottom - top);
    final union = (a.width * a.height) + (b.width * b.height) - intersection;
    if (union <= 0) return 0;
    return intersection / union;
  }

  double _rectMinOverlapRatio(Rect a, Rect b) {
    final intersection = _rectIntersectionArea(a, b);
    if (intersection <= 0) return 0;
    final minArea = math.min(a.width * a.height, b.width * b.height);
    if (minArea <= 0) return 0;
    return intersection / minArea;
  }

  double _rectAreaRatio(Rect a, Rect b) {
    final aArea = a.width * a.height;
    final bArea = b.width * b.height;
    final minArea = math.min(aArea, bArea);
    if (minArea <= 0) return double.infinity;
    return math.max(aArea, bArea) / minArea;
  }

  double _rectIntersectionArea(Rect a, Rect b) {
    final left = math.max(a.left, b.left);
    final top = math.max(a.top, b.top);
    final right = math.min(a.right, b.right);
    final bottom = math.min(a.bottom, b.bottom);
    if (right <= left || bottom <= top) return 0;
    return (right - left) * (bottom - top);
  }

  bool _quadSetsVisuallyDifferent(
    List<List<Offset>>? previous,
    List<List<Offset>>? next,
  ) {
    final previousQuads =
        previous?.where((quad) => quad.length == 4).toList(growable: false) ??
        const <List<Offset>>[];
    final nextQuads =
        next?.where((quad) => quad.length == 4).toList(growable: false) ??
        const <List<Offset>>[];
    if (previousQuads.length != nextQuads.length) return true;
    if (previousQuads.isEmpty) return false;

    final usedPrevious = <int>{};
    for (final nextQuad in nextQuads) {
      var matched = false;
      for (var i = 0; i < previousQuads.length; i += 1) {
        if (usedPrevious.contains(i)) continue;
        if (_quadVisuallyDifferent(previousQuads[i], nextQuad)) continue;
        usedPrevious.add(i);
        matched = true;
        break;
      }
      if (!matched) return true;
    }
    return false;
  }

  bool _quadVisuallyDifferent(List<Offset>? previous, List<Offset>? next) {
    if (previous == null || previous.length != 4) {
      return next != null && next.length == 4;
    }
    if (next == null || next.length != 4) return true;

    final previousBounds = _quadBounds(previous);
    final nextBounds = _quadBounds(next);
    if (previousBounds == null || nextBounds == null) return true;
    final centerDistance = (previousBounds.center - nextBounds.center).distance;
    final widthDelta = (previousBounds.width - nextBounds.width).abs();
    final heightDelta = (previousBounds.height - nextBounds.height).abs();
    return centerDistance > _scannerV3QuadCenterPublishDeadband ||
        widthDelta > _scannerV3QuadSizePublishDeadband ||
        heightDelta > _scannerV3QuadSizePublishDeadband;
  }

  List<Offset> _lerpQuad(List<Offset> from, List<Offset> to, double t) {
    return <Offset>[
      for (var i = 0; i < 4; i += 1) Offset.lerp(from[i], to[i], t)!,
    ];
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
        cameraMetrics: _scannerCameraMetrics(),
        testPhase: _scannerV4DiagnosticTestRunner.currentCapturePhaseId,
      ),
    );
  }

  Map<String, Object?> _scannerCameraMetrics() {
    if (_useNativeConditionCamera) {
      final metrics = _nativeConditionCameraMetrics;
      return <String, Object?>{
        'engine': metrics?.engine ?? 'camerax',
        'status': metrics?.status ?? 'unknown',
        'error': metrics?.error,
        'preset': 'native-camerax',
        'preview_size': _formatSize(metrics?.previewSize),
        'input_size': _formatSize(metrics?.analysisSize),
        'stream_fps': metrics?.analysisFps,
        'native_detection_fps': metrics?.nativeDetectionFps,
        'frame_bridge_fps': metrics?.frameBridgeFps,
        'analysis_fps': _scannerV3AnalysisFpsCounter.fps,
        'live_loop_fps': _scannerV3LiveLoopFpsCounter.fps,
        'fallback_reason': _cameraInitFallbackReason,
      };
    }
    return <String, Object?>{
      'preset': _resolutionPresetLabel(_cameraResolutionPreset),
      'preview_size': _formatSize(_cameraPreviewSize),
      'input_size': _formatSize(_cameraInputSize),
      'stream_fps': _cameraStreamFpsCounter.fps,
      'analysis_fps': _scannerV3AnalysisFpsCounter.fps,
      'live_loop_fps': _scannerV3LiveLoopFpsCounter.fps,
      'fallback_reason': _cameraInitFallbackReason,
    };
  }

  Future<_NativeQuadDetection> _detectNativeQuad(
    CameraImage image,
    int rotation,
  ) async {
    final stopwatch = Stopwatch()..start();
    final rawResponse = await _quadDetector.detect(image, rotation);
    stopwatch.stop();
    return _nativeQuadDetectionFromRawResponse(
      rawResponse,
      fallbackElapsedMs: stopwatch.elapsedMilliseconds,
    );
  }

  _NativeQuadDetection _nativeQuadDetectionFromRawResponse(
    Map<String, dynamic>? rawResponse, {
    required int? fallbackElapsedMs,
  }) {
    if (rawResponse == null) {
      return _NativeQuadDetection(
        registered: true,
        called: true,
        success: false,
        elapsedMs: fallbackElapsedMs,
        failureReason: 'no_native_quad_response',
      );
    }

    final points = _extractQuadPoints(rawResponse);
    final cardQuads = _extractQuadPointSets(rawResponse, fallback: points);
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
      cardQuadsNorm: cardQuads,
      confidence: confidence,
      elapsedMs:
          _asInt(rawResponse['elapsed_ms']) ??
          _asInt(rawResponse['elapsedMs']) ??
          fallbackElapsedMs,
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
    if (!rawSuccess) {
      return _asString(rawResponse['failure_reason']) ??
          _asString(rawResponse['failureReason']) ??
          _asString(
            _nativeQuadDiagnostic(rawResponse, 'selected_failure_reason'),
          ) ??
          'native_success_false';
    }
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

  String _nativeQuadDebugSummary(Map<String, dynamic>? rawResponse) {
    if (rawResponse == null) return 'none';
    final fields = <String>[];
    void add(String label, Object? value) {
      if (value == null) return;
      final text = value.toString();
      if (text.isEmpty) return;
      fields.add('$label=$text');
    }

    add(
      'raw_fail',
      rawResponse['failure_reason'] ?? rawResponse['failureReason'],
    );
    add(
      'sel_fail',
      _nativeQuadDiagnostic(rawResponse, 'selected_failure_reason'),
    );
    add('cand', _nativeQuadDiagnostic(rawResponse, 'candidate_score_count'));
    add(
      'best',
      _formatNativeQuadDiagnosticDouble(
        _nativeQuadDiagnostic(rawResponse, 'best_candidate_score'),
      ),
    );
    add('seed', _nativeQuadDiagnostic(rawResponse, 'seed_pixel_count'));
    add('edge', _nativeQuadDiagnostic(rawResponse, 'edge_pixel_count'));
    add(
      'source',
      _nativeQuadDiagnostic(rawResponse, 'selected_candidate_source'),
    );
    add(
      'area',
      _formatNativeQuadDiagnosticDouble(
        _nativeQuadDiagnostic(rawResponse, 'best_candidate_area'),
      ),
    );
    return fields.isEmpty ? 'none' : fields.join(',');
  }

  Object? _nativeQuadDiagnostic(Map<String, dynamic> rawResponse, String key) {
    final diagnostics = rawResponse['diagnostics'];
    return diagnostics is Map ? diagnostics[key] : null;
  }

  String? _formatNativeQuadDiagnosticDouble(Object? value) {
    final parsed = _asDouble(value);
    return parsed?.toStringAsFixed(3);
  }

  List<Offset>? _extractQuadPoints(Map<String, dynamic> rawResponse) {
    final rawPoints =
        rawResponse['points'] ??
        rawResponse['points_norm'] ??
        rawResponse['quad'] ??
        rawResponse['quad_norm'];
    return _extractQuadPointsFromRaw(rawPoints);
  }

  List<List<Offset>>? _extractQuadPointSets(
    Map<String, dynamic> rawResponse, {
    required List<Offset>? fallback,
  }) {
    final rawCandidates =
        rawResponse['card_candidates'] ??
        rawResponse['candidates'] ??
        rawResponse['quads'];
    final pointSets = <List<Offset>>[];
    if (rawCandidates is List) {
      for (final candidate in rawCandidates) {
        Object? rawPoints;
        if (candidate is Map) {
          rawPoints =
              candidate['points'] ??
              candidate['points_norm'] ??
              candidate['quad'] ??
              candidate['quad_norm'];
        } else {
          rawPoints = candidate;
        }
        final points = _extractQuadPointsFromRaw(rawPoints);
        if (points != null) {
          pointSets.add(points);
        }
      }
    }
    if (pointSets.isNotEmpty) return pointSets;
    return fallback == null ? null : <List<Offset>>[fallback];
  }

  List<Offset>? _extractQuadPointsFromRaw(Object? rawPoints) {
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
    if (_useScannerV3LiveLoop) {
      unawaited(_restoreScannerV3SystemUi());
    }
    _nativeConditionCameraMetricsTimer?.cancel();
    if (_useNativeConditionCamera) {
      NativeConditionCameraBridge.detachFrameListener();
      unawaited(NativeConditionCameraBridge.stopSession());
    }
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
      if (_useScannerV3LiveLoop) return;
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
      _scannerV3IdentityRevealRequested = false;
      _scannerV3IdentityRevealRequestedAt = null;
      _scannerV3LastRememberedCandidateId = null;
      _scannerV3DebugExpanded = false;
      _quadPoints = null;
      _quadPointSets = null;
      _scannerV3DisplayQuadTracks = <_ScannerV3DisplayQuadTrack>[];
      _scannerV3NextDisplayQuadTrackId = 1;
      _cardCandidateLastSeenAt = DateTime.fromMillisecondsSinceEpoch(0);
      _selectedCardQuadNorm = null;
      _lastAutoFocusBoundsNorm = null;
      _lastFocusTapNorm = null;
    });
  }

  void _handleScannerV3Shutter() {
    if (_scannerV3IdentityRevealRequested && _scannerV3LoopState.locked) {
      unawaited(HapticFeedback.selectionClick());
      unawaited(SystemSound.play(SystemSoundType.click));
      _resetScannerV3Loop();
      return;
    }
    unawaited(HapticFeedback.mediumImpact());
    unawaited(SystemSound.play(SystemSoundType.click));
    final bufferedLockState = _scannerV3LoopController
        ?.revealBufferedIdentityLock();
    final requestedAt = DateTime.now();
    if (!mounted) return;
    setState(() {
      _scannerV3IdentityRevealRequested = true;
      _scannerV3IdentityRevealRequestedAt = requestedAt;
      _lastQuadUpdate = DateTime.fromMillisecondsSinceEpoch(0);
      _scannerV3LastRememberedCandidateId = null;
      if (bufferedLockState != null) {
        _scannerV3LoopState = bufferedLockState;
        _rememberScannerV3LockedCard(bufferedLockState);
      } else if (_scannerV3LoopState.locked) {
        _rememberScannerV3LockedCard(_scannerV3LoopState);
      }
    });
  }

  void _rememberScannerV3LockedCard(ScannerV3LiveLoopState state) {
    final candidateId = state.lockedCandidateId ?? state.currentBestCandidateId;
    final candidate = state.candidateById(candidateId) ?? state.bestCandidate;
    if (candidateId == null || candidateId.isEmpty) return;
    if (_scannerV3LastRememberedCandidateId == candidateId) return;
    _scannerV3LastRememberedCandidateId = candidateId;

    final existingIndex = _scannerV3ScanMemory.indexWhere(
      (entry) => entry.candidateId == candidateId,
    );
    final existing = existingIndex >= 0
        ? _scannerV3ScanMemory[existingIndex]
        : null;
    final nextEntry = ScannerV3ScanMemoryEntry(
      candidateId: candidateId,
      name: candidate?.name ?? existing?.name,
      setCode: candidate?.setCode ?? existing?.setCode,
      number: candidate?.number ?? existing?.number,
      imageUrl: candidate?.imageUrl ?? existing?.imageUrl,
      count: (existing?.count ?? 0) + 1,
    );
    final nextMemory = <ScannerV3ScanMemoryEntry>[nextEntry];
    for (final entry in _scannerV3ScanMemory) {
      if (entry.candidateId == candidateId) continue;
      nextMemory.add(entry);
      if (nextMemory.length >= _scannerV3ScanMemoryLimit) break;
    }
    _scannerV3ScanMemory = List<ScannerV3ScanMemoryEntry>.unmodifiable(
      nextMemory,
    );
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

  void _setScannerV3GuidedSlotCount(int count) {
    if (!_scannerV3GuidedSlotOptions.contains(count)) return;
    if (_scannerV3GuidedSlotCount == count) return;
    _scannerV3LoopController?.reset();
    if (!mounted) return;
    setState(() {
      _scannerV3GuidedSlotCount = count;
      _scannerV3ActiveGuidedSlotIndex = 0;
      _scannerV3LoopState =
          _scannerV3LoopController?.state ?? ScannerV3LiveLoopState.initial;
      _scannerV3IdentityRevealRequested = false;
      _scannerV3IdentityRevealRequestedAt = null;
      _scannerV3LastRememberedCandidateId = null;
      _selectedCardQuadNorm = null;
      _pendingCardSelectionTapNorm = null;
      _pendingCardSelectionTapAt = null;
      _scannerV3DisplayQuadTracks = <_ScannerV3DisplayQuadTrack>[];
      final slots = _scannerV3GuidedSlotQuadsNorm();
      _quadPointSets = slots;
      _quadPoints = slots.isEmpty ? null : slots.first;
      _overlayMode = slots.isEmpty ? OverlayMode.neutral : OverlayMode.ready;
      _liveStatus = slots.isEmpty ? 'Align card inside frame' : 'Ready';
    });
  }

  List<List<Offset>> _scannerV3GuidedSlotQuadsNorm() {
    final aspect = _scannerV3DisplayQuadTargetAspect;
    switch (_scannerV3GuidedSlotCount) {
      case 4:
        return _scannerV3GuidedSlotGrid(
          columns: 2,
          rows: 2,
          aspect: aspect,
          maxTotalWidth: 0.80,
          maxTotalHeight: 0.58,
          gapX: 0.050,
          gapY: 0.046,
          centerY: 0.44,
        );
      case 2:
        return _scannerV3GuidedSlotGrid(
          columns: 2,
          rows: 1,
          aspect: aspect,
          maxTotalWidth: 0.82,
          maxTotalHeight: 0.38,
          gapX: 0.050,
          gapY: 0,
          centerY: 0.41,
        );
      case 1:
      default:
        return _scannerV3GuidedSlotGrid(
          columns: 1,
          rows: 1,
          aspect: aspect,
          maxTotalWidth: 0.52,
          maxTotalHeight: 0.46,
          gapX: 0,
          gapY: 0,
          centerY: 0.47,
        );
    }
  }

  double get _scannerV3DisplayQuadTargetAspect {
    final cameraAspect = _scannerCameraDisplayAspectRatio ?? (9 / 16);
    if (!cameraAspect.isFinite || cameraAspect <= 0) {
      return 1.25;
    }
    return (ScannerV3LiveLoopController.targetAspectRatio / cameraAspect)
        .clamp(0.42, 2.20)
        .toDouble();
  }

  List<List<Offset>> _scannerV3GuidedSlotGrid({
    required int columns,
    required int rows,
    required double aspect,
    required double maxTotalWidth,
    required double maxTotalHeight,
    required double gapX,
    required double gapY,
    required double centerY,
  }) {
    if (columns <= 0 || rows <= 0 || aspect <= 0) {
      return const <List<Offset>>[];
    }
    var slotWidth = (maxTotalWidth - (gapX * (columns - 1))) / columns;
    var slotHeight = slotWidth / aspect;
    final totalHeight = (slotHeight * rows) + (gapY * (rows - 1));
    if (totalHeight > maxTotalHeight) {
      slotHeight = (maxTotalHeight - (gapY * (rows - 1))) / rows;
      slotWidth = slotHeight * aspect;
    }
    if ((slotWidth * columns) + (gapX * (columns - 1)) > maxTotalWidth) {
      slotWidth = (maxTotalWidth - (gapX * (columns - 1))) / columns;
      slotHeight = slotWidth / aspect;
    }

    final gridWidth = (slotWidth * columns) + (gapX * (columns - 1));
    final gridHeight = (slotHeight * rows) + (gapY * (rows - 1));
    final startX = ((1 - gridWidth) / 2).clamp(0.0, 1.0).toDouble();
    final startY = (centerY - (gridHeight / 2))
        .clamp(0.035, math.max(0.035, 0.965 - gridHeight))
        .toDouble();
    final slots = <List<Offset>>[];
    for (var row = 0; row < rows; row += 1) {
      for (var column = 0; column < columns; column += 1) {
        final left = startX + (column * (slotWidth + gapX));
        final top = startY + (row * (slotHeight + gapY));
        slots.add(
          _scannerV3RectQuadNorm(
            Rect.fromLTWH(left, top, slotWidth, slotHeight),
          ),
        );
      }
    }
    return slots;
  }

  List<Offset> _scannerV3RectQuadNorm(Rect rect) {
    final left = rect.left.clamp(0.0, 1.0).toDouble();
    final top = rect.top.clamp(0.0, 1.0).toDouble();
    final right = rect.right.clamp(0.0, 1.0).toDouble();
    final bottom = rect.bottom.clamp(0.0, 1.0).toDouble();
    return <Offset>[
      Offset(left, top),
      Offset(right, top),
      Offset(right, bottom),
      Offset(left, bottom),
    ];
  }

  int _scannerV3SlotIndexForQuad(List<Offset> quad) {
    final slots = _scannerV3GuidedSlotQuadsNorm();
    var bestIndex = 0;
    var bestDistance = double.infinity;
    final bounds = _quadBounds(quad);
    if (bounds == null) return bestIndex;
    for (var i = 0; i < slots.length; i += 1) {
      final slotBounds = _quadBounds(slots[i]);
      if (slotBounds == null) continue;
      final distance = (slotBounds.center - bounds.center).distance;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  double? get _scannerCameraDisplayAspectRatio {
    final sourceSize = _cameraInputSize ?? _cameraPreviewSize;
    if (sourceSize == null || sourceSize.width <= 0 || sourceSize.height <= 0) {
      return null;
    }
    final rotation =
        _lastScannerFrameRotation ?? _controller?.description.sensorOrientation;
    final rightAngle = rotation != null && rotation % 180 != 0;
    final displayWidth = rightAngle ? sourceSize.height : sourceSize.width;
    final displayHeight = rightAngle ? sourceSize.width : sourceSize.height;
    if (displayWidth <= 0 || displayHeight <= 0) return null;
    return displayWidth / displayHeight;
  }

  Rect _scannerCameraViewportRect(Size available) {
    if (available.width <= 0 || available.height <= 0) {
      return Rect.zero;
    }
    final cameraAspect =
        _scannerCameraDisplayAspectRatio ?? available.width / available.height;
    if (!cameraAspect.isFinite || cameraAspect <= 0) {
      return Offset.zero & available;
    }

    final containerAspect = available.width / available.height;
    double width;
    double height;
    if (containerAspect > cameraAspect) {
      width = available.width;
      height = width / cameraAspect;
    } else {
      height = available.height;
      width = height * cameraAspect;
    }

    return Rect.fromLTWH(
      (available.width - width) / 2,
      (available.height - height) / 2,
      width,
      height,
    );
  }

  Widget _buildScannerCameraSurface({
    required Size available,
    required Widget child,
  }) {
    final viewport = _scannerCameraViewportRect(available);
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: ClipRect(
        child: Stack(
          fit: StackFit.expand,
          children: [
            Positioned.fromRect(
              rect: viewport,
              child: RepaintBoundary(child: child),
            ),
          ],
        ),
      ),
    );
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
                  if (_useNativeConditionCamera &&
                      !_nativeConditionCameraReady) {
                    return const Center(child: Text('Camera not available'));
                  }
                  if (!_useNativeConditionCamera &&
                      (_controller == null ||
                          !_controller!.value.isInitialized)) {
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
                      final cameraViewportRect = _scannerCameraViewportRect(
                        available,
                      );
                      final guidedSlotQuads = _useScannerV3GuidedSlots
                          ? _scannerV3GuidedSlotQuadsNorm()
                          : const <List<Offset>>[];
                      final showRawDetectorOverlay =
                          _scannerV3ShouldDisplayRawDetectorOverlay(
                            _scannerV3LoopState,
                          );
                      final scannerOverlayPointSets = showRawDetectorOverlay
                          ? _quadPointSets
                          : null;
                      final scannerOverlayPoints =
                          scannerOverlayPointSets != null &&
                              scannerOverlayPointSets.isNotEmpty
                          ? scannerOverlayPointSets.first
                          : showRawDetectorOverlay
                          ? _quadPoints
                          : null;
                      return Stack(
                        fit: StackFit.expand,
                        children: [
                          GestureDetector(
                            key: _previewAreaKey,
                            behavior: HitTestBehavior.opaque,
                            onTapDown: (details) {
                              unawaited(_handlePreviewTap(details));
                            },
                            child: _buildScannerCameraSurface(
                              available: available,
                              child: _useNativeConditionCamera
                                  ? const IgnorePointer(
                                      child: AndroidView(
                                        viewType: NativeConditionCameraBridge
                                            .previewViewType,
                                        creationParams: <String, Object?>{
                                          'surface': 'condition_camera',
                                        },
                                        creationParamsCodec:
                                            StandardMessageCodec(),
                                      ),
                                    )
                                  : CameraPreview(_controller!),
                            ),
                          ),
                          if (_useScannerV3LiveLoop)
                            ScannerV3CameraOverlay(
                              state: _scannerV3LoopState,
                              guideRect: guideRect,
                              cameraViewportRect: cameraViewportRect,
                              guidedSlotQuadsNorm: guidedSlotQuads,
                              guidedSlotCount: _scannerV3GuidedSlotCount,
                              activeGuidedSlotIndex:
                                  _scannerV3ActiveGuidedSlotIndex,
                              quadPointsNorm: scannerOverlayPoints,
                              quadPointSetsNorm: scannerOverlayPointSets,
                              selectedQuadNorm: _selectedCardQuadNorm,
                              focusTapNorm: _lastFocusTapNorm,
                              exportEnabled: _scannerV3ArtifactExportEnabled,
                              flashEnabled: _scannerV3FlashEnabled,
                              identityRevealRequested:
                                  _scannerV3IdentityRevealRequested,
                              scanMemory: _scannerV3ScanMemory,
                              debugExpanded: _scannerV3DebugExpanded,
                              cameraPresetLabel: _useNativeConditionCamera
                                  ? 'native-camerax'
                                  : _resolutionPresetLabel(
                                      _cameraResolutionPreset,
                                    ),
                              cameraPreviewSize: _cameraPreviewSize,
                              cameraInputSize: _cameraInputSize,
                              cameraInitFallbackReason:
                                  _cameraInitFallbackReason,
                              cameraStreamFps: _useNativeConditionCamera
                                  ? _nativeConditionCameraMetrics
                                        ?.frameBridgeFps
                                  : _cameraStreamFpsCounter.fps,
                              scannerAnalysisFps: _useNativeConditionCamera
                                  ? _scannerV3AnalysisFpsCounter.fps
                                  : _scannerV3AnalysisFpsCounter.fps,
                              scannerLiveLoopFps: _useNativeConditionCamera
                                  ? _scannerV3LiveLoopFpsCounter.fps
                                  : _scannerV3LiveLoopFpsCounter.fps,
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
                              onGuidedSlotCountChanged:
                                  _setScannerV3GuidedSlotCount,
                              onToggleDebug: () {
                                setState(() {
                                  _scannerV3DebugExpanded =
                                      !_scannerV3DebugExpanded;
                                });
                              },
                              onShutter: _handleScannerV3Shutter,
                              onTryAgain: _resetScannerV3Loop,
                              onSearchManually: _openManualSearch,
                              onToggleDiagnostics: _toggleScannerV4Diagnostics,
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

class _ScannerCameraFpsCounter {
  DateTime _windowStartedAt = DateTime.fromMillisecondsSinceEpoch(0);
  int _frames = 0;
  double? fps;

  bool tick(DateTime now) {
    if (_windowStartedAt.millisecondsSinceEpoch == 0) {
      _windowStartedAt = now;
      _frames = 0;
    }
    _frames += 1;

    final elapsedMs = now.difference(_windowStartedAt).inMilliseconds;
    if (elapsedMs < 1000) return false;

    fps = (_frames * 1000) / elapsedMs;
    _windowStartedAt = now;
    _frames = 0;
    return true;
  }
}

enum _ScannerV3FocusSource { auto, tap }

class _ScannerV3DisplayQuadTrack {
  _ScannerV3DisplayQuadTrack({
    required this.id,
    required this.quad,
    required this.lastSeenAt,
  });

  final int id;
  List<Offset> quad;
  DateTime lastSeenAt;
  int hits = 1;
  int misses = 0;
  bool visible = false;
}

class _ScannerV3FixedSlotOccupancy {
  const _ScannerV3FixedSlotOccupancy({
    required this.cardInSlot,
    required this.slotCoverage,
    required this.areaRatio,
    required this.centerDistance,
    required this.aspectPenalty,
    required this.centerInside,
    required this.score,
  });

  final double cardInSlot;
  final double slotCoverage;
  final double areaRatio;
  final double centerDistance;
  final double aspectPenalty;
  final bool centerInside;
  final double score;
}

class _NativeQuadDetection {
  const _NativeQuadDetection({
    required this.registered,
    required this.called,
    required this.success,
    this.pointsNorm,
    this.cardQuadsNorm,
    this.confidence,
    this.elapsedMs,
    this.failureReason,
    this.rawResponse,
  });

  final bool registered;
  final bool called;
  final bool success;
  final List<Offset>? pointsNorm;
  final List<List<Offset>>? cardQuadsNorm;
  final double? confidence;
  final int? elapsedMs;
  final String? failureReason;
  final Map<String, dynamic>? rawResponse;
}

class _SelectedCardMatch {
  const _SelectedCardMatch({
    required this.index,
    required this.quad,
    required this.score,
  });

  final int index;
  final List<Offset> quad;
  final double score;
}
