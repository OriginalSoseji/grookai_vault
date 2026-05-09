import 'dart:async';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  static const Duration _selectedCardRetention = Duration(seconds: 30);
  static const double _selectedCardCenterDeadband = 0.030;
  static const double _selectedCardSizeDeadband = 0.050;
  static const double _selectedCardSlowSmoothing = 0.04;
  static const double _selectedCardFastSmoothing = 0.12;
  static const double _cardTapHitSlop = 0.025;
  static const Duration _cardCandidateRetention = Duration(milliseconds: 900);
  static const Duration _scannerV3AnalysisInterval = Duration(
    milliseconds: 360,
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
  static const int _scannerV3ScanMemoryLimit = 10;

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
  String? _scannerV3LastRememberedCandidateId;
  List<ScannerV3ScanMemoryEntry> _scannerV3ScanMemory =
      const <ScannerV3ScanMemoryEntry>[];
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
            ResolutionPreset.medium,
            ResolutionPreset.high,
            ResolutionPreset.veryHigh,
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
            _scannerV3LastRememberedCandidateId = null;
          }
          _selectedCardQuadNorm = selectedCardQuad;
          _selectedCardLastSeenAt = tapAt;
          _quadPointSets = _selectedCardFirst(_quadPointSets, selectedCardQuad);
          _quadPoints = selectedCardQuad;
        } else if (_useScannerV3LiveLoop) {
          _selectedCardQuadNorm = null;
        } else {
          _lastFocusTapNorm = focusNorm;
          _lastFocusTapAt = tapAt;
        }
      });
    }
    _lastAutoFocusBoundsNorm = selectedBounds;
    if (selectedCardQuad != null || _useScannerV3LiveLoop) {
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
      final imageSize = Size(image.width.toDouble(), image.height.toDouble());
      if (_cameraInputSize != imageSize && mounted) {
        setState(() {
          _cameraInputSize = imageSize;
        });
      }
      final now = DateTime.now();
      if (now.difference(_lastQuadUpdate) < _scannerV3AnalysisInterval) return;
      if (_processingScannerV3FrameTick) return;
      _lastQuadUpdate = now;
      _processingScannerV3FrameTick = true;
      try {
        final rotation = _controller?.description.sensorOrientation ?? 0;
        final quadDetection = await _detectNativeQuad(image, rotation);
        final rawPointSets = quadDetection.success
            ? quadDetection.cardQuadsNorm
            : null;
        final displayPointSets = _trackedCardQuads(rawPointSets, now: now);
        final displayPoints =
            displayPointSets != null && displayPointSets.isNotEmpty
            ? displayPointSets.first
            : null;
        final rawIdentityPoints =
            _selectedCardQuadNorm ??
            (rawPointSets != null && rawPointSets.isNotEmpty
                ? rawPointSets.first
                : quadDetection.success
                ? quadDetection.pointsNorm
                : null);

        if (displayPoints != null) {
          _cardCandidateLastSeenAt = now;
          _maybeAutoFocusScannerV3(displayPoints, now: now);
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
          }
        } else {
          final retainCardCandidates =
              _quadPoints != null &&
              now.difference(_cardCandidateLastSeenAt) <=
                  _cardCandidateRetention;
          if (retainCardCandidates) {
            await _processScannerV3LiveLoopFrame(
              image,
              rotation,
              rawIdentityPoints,
              quadDetection,
            );
            return;
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
        }
        await _processScannerV3LiveLoopFrame(
          image,
          rotation,
          rawIdentityPoints,
          quadDetection,
        );
      } finally {
        _processingScannerV3FrameTick = false;
      }
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
        selectedCardTarget: _selectedCardQuadNorm != null,
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
    final clearReveal =
        !hasVisibleCard && !state.cardPresent && !state.identityAllowed;
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

  void _maybeAutoFocusScannerV3(List<Offset> quad, {required DateTime now}) {
    if (!_useScannerV3LiveLoop || !_focusApisReady || _focusRequestInFlight) {
      return;
    }
    final bounds = _quadBounds(quad);
    if (bounds == null) return;
    final previous = _lastAutoFocusBoundsNorm;
    if (previous != null && !_autoFocusTargetChanged(previous, bounds)) {
      return;
    }
    if (now.difference(_lastAutoFocusAt) < _scannerV3AutoFocusCooldown) {
      return;
    }

    _lastAutoFocusBoundsNorm = bounds;
    unawaited(
      _requestCameraFocusPoint(
        bounds.center,
        force: false,
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
    final pointSets = _quadPointSets != null && _quadPointSets!.isNotEmpty
        ? _quadPointSets!
        : _quadPoints == null
        ? const <List<Offset>>[]
        : <List<Offset>>[_quadPoints!];
    List<Offset>? bestQuad;
    var bestDistance = double.infinity;
    for (final quad in pointSets) {
      if (quad.length != 4) continue;
      final bounds = _quadBounds(quad);
      if (bounds == null ||
          !bounds.inflate(_cardTapHitSlop).contains(tapNorm)) {
        continue;
      }
      final distance = (bounds.center - tapNorm).distance;
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
    final selected = _selectedCardQuadNorm;
    if (selected == null || selected.length != 4) {
      return stableDisplayQuads.isEmpty ? null : stableDisplayQuads;
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
    return stableDisplayQuads.isEmpty ? null : stableDisplayQuads;
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
      for (final existing in deduped) {
        final existingBounds = _quadBounds(existing);
        if (existingBounds == null) continue;
        final iou = _rectIou(bounds, existingBounds);
        final centerDistance = (bounds.center - existingBounds.center).distance;
        if (iou >= 0.55 || centerDistance <= 0.035) {
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
            return aBounds.center.dx.compareTo(bBounds.center.dx);
          });
    for (final track in visibleTracks) {
      track.visible = true;
    }
    return <List<Offset>>[
      for (final track in visibleTracks) List<Offset>.from(track.quad),
    ];
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
      _scannerV3IdentityRevealRequested = false;
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
    if (!mounted) return;
    setState(() {
      _scannerV3IdentityRevealRequested = true;
      if (_scannerV3LoopState.locked) {
        _rememberScannerV3LockedCard(_scannerV3LoopState);
      }
    });
  }

  void _rememberScannerV3LockedCard(ScannerV3LiveLoopState state) {
    final candidate = state.bestCandidate;
    final candidateId = state.lockedCandidateId ?? candidate?.id;
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
                      return Stack(
                        fit: StackFit.expand,
                        children: [
                          GestureDetector(
                            key: _previewAreaKey,
                            behavior: HitTestBehavior.opaque,
                            onTapDown: (details) {
                              unawaited(_handlePreviewTap(details));
                            },
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: RepaintBoundary(
                                child: CameraPreview(_controller!),
                              ),
                            ),
                          ),
                          if (_useScannerV3LiveLoop)
                            ScannerV3CameraOverlay(
                              state: _scannerV3LoopState,
                              guideRect: guideRect,
                              quadPointsNorm: _quadPoints,
                              quadPointSetsNorm: _quadPointSets,
                              selectedQuadNorm: _selectedCardQuadNorm,
                              focusTapNorm: _lastFocusTapNorm,
                              exportEnabled: _scannerV3ArtifactExportEnabled,
                              flashEnabled: _scannerV3FlashEnabled,
                              identityRevealRequested:
                                  _scannerV3IdentityRevealRequested,
                              scanMemory: _scannerV3ScanMemory,
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
