import 'dart:async';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../widgets/scanner/condition_capture_overlay.dart';
import '../../services/scanner/native_quad_detector.dart';

class ConditionCameraScreen extends StatefulWidget {
  final String title;
  final String? hintText;

  const ConditionCameraScreen({
    super.key,
    required this.title,
    this.hintText,
  });

  @override
  State<ConditionCameraScreen> createState() => _ConditionCameraScreenState();
}

class _ConditionCameraScreenState extends State<ConditionCameraScreen> {
  final GlobalKey _previewAreaKey = GlobalKey();
  CameraController? _controller;
  Future<void>? _initFuture;
  bool _takingPicture = false;
  StreamSubscription<AccelerometerEvent>? _accelSub;
  double _tiltMagnitude = 0;
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
  bool get _canShoot => !_takingPicture && _overlayMode == OverlayMode.ready;

  @override
  void initState() {
    super.initState();
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
    final controller = CameraController(
      back,
      ResolutionPreset.high,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.yuv420,
    );
    _controller = controller;
    _initFuture = controller.initialize().then((_) async {
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
    });
    if (mounted) {
      setState(() {});
    }
    _startSensors();
    _startStream();
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
    if (_controller == null || _streaming) return;
    _streaming = true;
    _controller!.startImageStream((image) async {
      final now = DateTime.now();
      if (now.difference(_lastQuadUpdate).inMilliseconds < 200) return;
      _lastQuadUpdate = now;
      final rotation = _controller?.description.sensorOrientation ?? 0;
      final quad = await _quadDetector.detect(image, rotation);
      List<Offset>? points;
      if (quad != null) {
        final rawPoints = quad['points_norm'];
        if (rawPoints is List && rawPoints.length == 4) {
          points = rawPoints
              .map((p) => Offset(
                    (p as List)[0].toDouble(),
                    (p as List)[1].toDouble(),
                  ))
              .toList();
        }
      }

      if (points != null) {
        if (mounted && (_quadPoints != points || _overlayMode != OverlayMode.ready)) {
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
      if (kDebugMode) {
        debugPrint('[quad] detected=${points != null} overlayMode=$_overlayMode canShoot=$_canShoot');
      }
    });
  }

  @override
  void dispose() {
    _controller?.dispose();
    _accelSub?.cancel();
    if (_controller?.value.isStreamingImages == true) {
      _controller?.stopImageStream();
    }
    super.dispose();
  }

  Future<void> _takePicture() async {
    if (_controller == null) {
      debugPrint('[SHUTTER] takePicture blocked: controller=null');
      return;
    }
    if (!_controller!.value.isInitialized) {
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
    try {
      final file = await _controller!.takePicture();
      if (!mounted) return;
      Navigator.of(context).pop(file);
    } catch (e, st) {
      debugPrint('[SHUTTER] takePicture ERROR: $e');
      debugPrint('$st');
      setState(() {
        _takingPicture = false;
      });
      rethrow;
    }
  }

  void _startSensors() {
    _accelSub = accelerometerEvents.listen((event) {
      final now = DateTime.now();
      if (now.difference(_lastAccelUpdate).inMilliseconds < 100) return;
      _lastAccelUpdate = now;
      final mag = math.sqrt(event.x * event.x + event.y * event.y);
      _tiltMagnitude = mag;
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    assert(
      _overlayMode != OverlayMode.ready || (_canShoot || _takingPicture),
      'Invariant violated: overlayMode=ready but shutter cannot shoot. Do not reintroduce split readiness.',
    );
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: FutureBuilder<void>(
                future: _initFuture,
                builder: (context, snap) {
                  if (snap.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (_controller == null || !_controller!.value.isInitialized) {
                    return const Center(child: Text('Camera not available'));
                  }
                  return LayoutBuilder(
                    builder: (context, constraints) {
                      final paddingH = 16.0;
                      final paddingV = 24.0;
                      final available =
                          Size(constraints.maxWidth, constraints.maxHeight);
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
                      final guideRect =
                          Rect.fromLTWH(left, top, finalGuideWidth, finalGuideHeight);
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
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: GestureDetector(
                onTap: _canShoot
                    ? () async {
                        debugPrint('[SHUTTER] tapped taking=$_takingPicture canShoot=$_canShoot init=${_controller?.value.isInitialized}');
                        await _takePicture();
                      }
                    : null,
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _takingPicture
                        ? theme.colorScheme.primary.withOpacity(0.3)
                        : _canShoot
                            ? theme.colorScheme.primary
                            : theme.colorScheme.primary.withOpacity(0.4),
                    boxShadow: [
                      BoxShadow(
                        color: theme.colorScheme.primary.withOpacity(0.25),
                        blurRadius: 12,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.circle, color: Colors.white, size: 28),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
