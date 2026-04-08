import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

class CameraTestScreen extends StatefulWidget {
  const CameraTestScreen({super.key});

  @override
  State<CameraTestScreen> createState() => _CameraTestScreenState();
}

class _CameraTestScreenState extends State<CameraTestScreen> {
  final GlobalKey _previewKey = GlobalKey();
  CameraController? _controller;
  List<CameraDescription> _cameras = const [];
  ResolutionPreset _preset = ResolutionPreset.high;
  FocusMode _focusMode = FocusMode.auto;
  String _status = 'Initializing camera...';
  String? _error;
  bool _initializing = true;
  bool _streaming = false;
  int _frameCount = 0;
  double _lastFrameGapMs = 0;
  double _averageFrameGapMs = 0;
  DateTime? _lastFrameAt;

  @override
  void initState() {
    super.initState();
    unawaited(_initializeCamera());
  }

  @override
  void dispose() {
    unawaited(_disposeController(_controller));
    _controller = null;
    super.dispose();
  }

  Future<void> _initializeCamera({ResolutionPreset? preset}) async {
    final nextPreset = preset ?? _preset;
    final previous = _controller;
    _controller = null;
    _streaming = false;
    _frameCount = 0;
    _lastFrameGapMs = 0;
    _averageFrameGapMs = 0;
    _lastFrameAt = null;
    if (mounted) {
      setState(() {
        _initializing = true;
        _error = null;
        _status = 'Initializing ${nextPreset.name} camera...';
      });
    }

    await _disposeController(previous);

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        throw CameraException(
          'no_cameras',
          'Use a physical iPhone for this harness.',
        );
      }

      final selectedCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        selectedCamera,
        nextPreset,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.yuv420,
      );

      await controller.initialize();
      await controller.setFocusMode(_focusMode);
      await controller.setExposureMode(ExposureMode.auto);
      if (controller.value.focusPointSupported) {
        await controller.setFocusPoint(null);
      }
      if (controller.value.exposurePointSupported) {
        await controller.setExposurePoint(null);
      }

      await controller.startImageStream((image) {
        final now = DateTime.now();
        final previousFrameAt = _lastFrameAt;
        _lastFrameAt = now;
        _frameCount += 1;
        if (previousFrameAt != null) {
          final gapMs = now.difference(previousFrameAt).inMicroseconds / 1000.0;
          _lastFrameGapMs = gapMs;
          final sampleCount = _frameCount - 1;
          if (sampleCount == 1) {
            _averageFrameGapMs = gapMs;
          } else {
            _averageFrameGapMs =
                ((_averageFrameGapMs * (sampleCount - 1)) + gapMs) /
                sampleCount;
          }
        }
        print('Frame: ${now.millisecondsSinceEpoch}');
        if (mounted && _frameCount % 15 == 0) {
          setState(() {});
        }
      });

      _cameras = cameras;
      _controller = controller;
      _preset = nextPreset;
      _streaming = true;
      if (mounted) {
        setState(() {
          _initializing = false;
          _status =
              'Streaming ${selectedCamera.name} at ${nextPreset.name}. Move a card in and out to test autofocus.';
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _initializing = false;
          _streaming = false;
          _error = '$error';
          _status = 'Camera initialization failed.';
        });
      }
    }
  }

  Future<void> _disposeController(CameraController? controller) async {
    if (controller == null) return;
    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
    } catch (_) {
      // Controller teardown can race with init; ignore cleanup-only errors.
    }
    await controller.dispose();
  }

  Future<void> _applyFocusMode(FocusMode mode) async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      await controller.setFocusMode(mode);
      if (mode == FocusMode.auto && controller.value.focusPointSupported) {
        await controller.setFocusPoint(null);
      }
      if (!mounted) return;
      setState(() {
        _focusMode = mode;
        _status = 'Focus mode set to ${mode.name}.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _status = 'Unable to change focus mode.';
      });
    }
  }

  Future<void> _setCenterFocus() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      if (controller.value.focusPointSupported) {
        await controller.setFocusPoint(const Offset(0.5, 0.5));
      }
      if (controller.value.exposurePointSupported) {
        await controller.setExposurePoint(const Offset(0.5, 0.5));
      }
      if (!mounted) return;
      setState(() {
        _status = 'Focus point set to center.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _status = 'Unable to set manual focus point.';
      });
    }
  }

  Future<void> _handlePreviewTap(TapDownDetails details) async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    final box = _previewKey.currentContext?.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return;

    final localPosition = box.globalToLocal(details.globalPosition);
    final normalized = Offset(
      (localPosition.dx / box.size.width).clamp(0.0, 1.0).toDouble(),
      (localPosition.dy / box.size.height).clamp(0.0, 1.0).toDouble(),
    );

    try {
      if (controller.value.focusPointSupported) {
        await controller.setFocusPoint(normalized);
      }
      if (controller.value.exposurePointSupported) {
        await controller.setExposurePoint(normalized);
      }
      if (!mounted) return;
      setState(() {
        _status =
            'Manual focus at (${normalized.dx.toStringAsFixed(2)}, ${normalized.dy.toStringAsFixed(2)}).';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
        _status = 'Unable to focus at tapped point.';
      });
    }
  }

  Future<void> _switchPreset(ResolutionPreset preset) async {
    if (_preset == preset) return;
    await _initializeCamera(preset: preset);
  }

  String _fpsLabel(double averageGapMs) {
    if (averageGapMs <= 0) return '--';
    return (1000.0 / averageGapMs).toStringAsFixed(1);
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final isReady = controller != null && controller.value.isInitialized;

    return Scaffold(
      appBar: AppBar(title: const Text('Camera Test')),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Container(
                color: Colors.black,
                alignment: Alignment.center,
                child: !isReady
                    ? _LoadingState(
                        status: _status,
                        error: _error,
                        initializing: _initializing,
                      )
                    : Stack(
                        fit: StackFit.expand,
                        children: [
                          SizedBox.expand(
                            key: _previewKey,
                            child: GestureDetector(
                              onTapDown: _handlePreviewTap,
                              child: CameraPreview(controller),
                            ),
                          ),
                          Positioned(
                            top: 12,
                            left: 12,
                            right: 12,
                            child: _StatsPanel(
                              cameraName: controller.description.name,
                              cameraCount: _cameras.length,
                              status: _status,
                              preset: _preset,
                              focusMode: _focusMode,
                              frameCount: _frameCount,
                              isStreaming: _streaming,
                              lastFrameGapMs: _lastFrameGapMs,
                              averageFrameGapMs: _averageFrameGapMs,
                              fpsLabel: _fpsLabel(_averageFrameGapMs),
                            ),
                          ),
                        ],
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SegmentedButton<ResolutionPreset>(
                    segments: const [
                      ButtonSegment(
                        value: ResolutionPreset.medium,
                        label: Text('Medium'),
                      ),
                      ButtonSegment(
                        value: ResolutionPreset.high,
                        label: Text('High'),
                      ),
                    ],
                    selected: {_preset},
                    onSelectionChanged: (selection) {
                      final next = selection.first;
                      unawaited(_switchPreset(next));
                    },
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.tonal(
                          onPressed: () =>
                              unawaited(_applyFocusMode(FocusMode.auto)),
                          child: const Text('Auto focus'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.tonal(
                          onPressed: () =>
                              unawaited(_applyFocusMode(FocusMode.locked)),
                          child: const Text('Lock focus'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => unawaited(_setCenterFocus()),
                    child: const Text('Center Focus Point'),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tap the preview to test manual focus/exposure points. Move a card toward and away from the lens while watching the frame timing and focus response.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState({
    required this.status,
    required this.error,
    required this.initializing,
  });

  final String status;
  final String? error;
  final bool initializing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (initializing) const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            error ?? status,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge?.copyWith(color: Colors.white),
          ),
        ],
      ),
    );
  }
}

class _StatsPanel extends StatelessWidget {
  const _StatsPanel({
    required this.cameraName,
    required this.cameraCount,
    required this.status,
    required this.preset,
    required this.focusMode,
    required this.frameCount,
    required this.isStreaming,
    required this.lastFrameGapMs,
    required this.averageFrameGapMs,
    required this.fpsLabel,
  });

  final String cameraName;
  final int cameraCount;
  final String status;
  final ResolutionPreset preset;
  final FocusMode focusMode;
  final int frameCount;
  final bool isStreaming;
  final double lastFrameGapMs;
  final double averageFrameGapMs;
  final String fpsLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: DefaultTextStyle(
          style: theme.textTheme.bodySmall!.copyWith(color: Colors.white),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Camera test harness',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text('Camera: $cameraName ($cameraCount detected)'),
              Text('Preset: ${preset.name}'),
              Text('Focus: ${focusMode.name}'),
              Text('Streaming: ${isStreaming ? 'yes' : 'no'}'),
              Text('Frames: $frameCount'),
              Text('Last frame gap: ${lastFrameGapMs.toStringAsFixed(1)}ms'),
              Text(
                'Average frame gap: ${averageFrameGapMs.toStringAsFixed(1)}ms',
              ),
              Text('Approx FPS: $fpsLabel'),
              const SizedBox(height: 6),
              Text(status),
            ],
          ),
        ),
      ),
    );
  }
}
