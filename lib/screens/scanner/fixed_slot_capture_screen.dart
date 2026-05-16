import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:grookai_vault/services/scanner/fixed_slot_capture_identity_v1.dart';
import 'package:grookai_vault/services/scanner_v3/vector_candidate_service_v1.dart';

class FixedSlotCaptureScreen extends StatefulWidget {
  const FixedSlotCaptureScreen({super.key});

  @override
  State<FixedSlotCaptureScreen> createState() => _FixedSlotCaptureScreenState();
}

class _FixedSlotCaptureScreenState extends State<FixedSlotCaptureScreen>
    with WidgetsBindingObserver {
  final GlobalKey _previewKey = GlobalKey();
  late final FixedSlotAnnIdentityClientV1 _identityClient;

  CameraController? _controller;
  Future<void>? _cameraFuture;
  bool _capturing = false;
  String _status = 'Place one card in the frame';
  String? _failureReason;
  Candidate? _matchedCard;
  Uint8List? _normalizedPreviewBytes;
  Duration? _annElapsed;
  FixedSlotArtifactFilesV1? _artifactFiles;

  @override
  void initState() {
    super.initState();
    debugPrint(
      '[fixed_slot_capture_v1] surface_opened '
      'scanner_surface=fixed_slot_capture_v1 '
      'identity_mode=still_capture_ann '
      'ocr=false '
      'live_identity_loop=false',
    );
    WidgetsBinding.instance.addObserver(this);
    _identityClient = FixedSlotAnnIdentityClientV1();
    _cameraFuture = _initializeCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_controller?.dispose());
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      unawaited(controller.dispose());
      _controller = null;
    } else if (state == AppLifecycleState.resumed) {
      _cameraFuture = _initializeCamera();
      if (mounted) setState(() {});
    }
  }

  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) {
      throw const FixedSlotCaptureException('no_camera_available');
    }

    final camera = cameras.firstWhere(
      (candidate) => candidate.lensDirection == CameraLensDirection.back,
      orElse: () => cameras.first,
    );
    final presets = <ResolutionPreset>[
      ResolutionPreset.max,
      ResolutionPreset.veryHigh,
      ResolutionPreset.high,
    ];

    Object? lastError;
    for (final preset in presets) {
      final controller = CameraController(
        camera,
        preset,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      try {
        await controller.initialize();
        await _configureStillCamera(controller);
        _controller = controller;
        if (mounted) setState(() {});
        return;
      } catch (error) {
        lastError = error;
        await controller.dispose();
      }
    }

    throw FixedSlotCaptureException(
      'camera_initialization_failed:${lastError ?? 'unknown'}',
    );
  }

  Future<void> _configureStillCamera(CameraController controller) async {
    try {
      await controller.setFlashMode(FlashMode.off);
    } catch (_) {}
    try {
      await controller.setFocusMode(FocusMode.auto);
    } catch (_) {}
    try {
      await controller.setExposureMode(ExposureMode.auto);
    } catch (_) {}
  }

  Future<void> _captureSelectedSlot() async {
    final controller = _controller;
    if (_capturing ||
        controller == null ||
        !controller.value.isInitialized ||
        controller.value.isTakingPicture) {
      return;
    }

    final renderBox =
        _previewKey.currentContext?.findRenderObject() as RenderBox?;
    final previewSize = renderBox?.size;
    if (previewSize == null || previewSize.isEmpty) {
      _setFailure('preview_size_unavailable');
      return;
    }

    await HapticFeedback.mediumImpact();
    final viewportSize = ui.Size(previewSize.width, previewSize.height);
    final slotRect = FixedSlotCaptureGeometryV1.oneCardSlotRect(viewportSize);
    debugPrint(
      '[fixed_slot_capture_v1] capture_started '
      'scanner_surface=fixed_slot_capture_v1',
    );

    setState(() {
      _capturing = true;
      _failureReason = null;
      _matchedCard = null;
      _annElapsed = null;
      _artifactFiles = null;
      _status = 'Capturing still';
    });

    try {
      final picture = await controller.takePicture();
      final stillBytes = await File(picture.path).readAsBytes();
      await _deleteTemporaryCapture(picture.path);
      if (!mounted) return;
      setState(() {
        _status = 'Normalizing card';
      });

      final artifact = await FixedSlotStillProcessorV1.process(
        stillBytes: stillBytes,
        previewViewportSize: viewportSize,
        slotRect: slotRect,
      );
      if (!mounted) return;
      setState(() {
        _normalizedPreviewBytes = artifact.normalizedPngBytes;
        _status = 'Identifying card';
      });

      debugPrint(
        '[fixed_slot_capture_v1] ann_request endpoint=${_identityClient.endpoint}',
      );
      final resolution = await _identityClient.resolve(artifact.annCrops);
      debugPrint(
        '[fixed_slot_capture_v1] result_revealed '
        'matched=${resolution.hasConfidentMatch}',
      );
      final files = await FixedSlotArtifactWriterV1.writeLatest(
        artifact: artifact,
        resolution: resolution,
      );
      if (!mounted) return;

      setState(() {
        _annElapsed = resolution.elapsed;
        _artifactFiles = files;
        _capturing = false;
        if (resolution.hasConfidentMatch) {
          _matchedCard = resolution.candidate;
          _failureReason = null;
          _status = 'Match found';
        } else {
          _matchedCard = null;
          _failureReason = resolution.failureReason ?? 'no_confident_match';
          _status = 'No confident match. Try again.';
        }
      });
      await HapticFeedback.selectionClick();
    } catch (error) {
      if (!mounted) return;
      debugPrint('[fixed_slot_capture_v1] result_revealed matched=false');
      setState(() {
        _capturing = false;
        _matchedCard = null;
        _failureReason = 'capture_failed:${error.runtimeType}';
        _status = 'No confident match. Try again.';
      });
    }
  }

  Future<void> _deleteTemporaryCapture(String path) async {
    try {
      await File(path).delete();
    } catch (_) {}
  }

  void _setFailure(String reason) {
    if (!mounted) return;
    setState(() {
      _capturing = false;
      _matchedCard = null;
      _failureReason = reason;
      _status = 'No confident match. Try again.';
    });
  }

  void _retry() {
    setState(() {
      _status = 'Place one card in the frame';
      _failureReason = null;
      _matchedCard = null;
      _annElapsed = null;
      _artifactFiles = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(child: _buildCameraPreview()),
            const Positioned.fill(child: _FixedSlotOverlay()),
            Positioned(
              left: 20,
              right: 20,
              top: 18,
              child: _buildTopBar(context),
            ),
            Positioned(
              left: 20,
              right: 20,
              bottom: 28,
              child: _buildBottomPanel(theme),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraPreview() {
    return FutureBuilder<void>(
      future: _cameraFuture,
      builder: (context, snapshot) {
        final controller = _controller;
        if (snapshot.hasError) {
          return _PreviewFallback(
            label: 'Camera unavailable',
            detail: snapshot.error.toString(),
          );
        }
        if (controller == null || !controller.value.isInitialized) {
          return const _PreviewFallback(label: 'Starting camera');
        }
        final previewSize = controller.value.previewSize;
        if (previewSize == null) {
          return RepaintBoundary(
            key: _previewKey,
            child: CameraPreview(controller),
          );
        }
        return RepaintBoundary(
          key: _previewKey,
          child: ClipRect(
            child: FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: previewSize.height,
                height: previewSize.width,
                child: CameraPreview(controller),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Row(
      children: [
        IconButton.filled(
          style: IconButton.styleFrom(
            backgroundColor: Colors.black.withValues(alpha: 0.62),
            foregroundColor: Colors.white,
          ),
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.close_rounded),
          tooltip: 'Close scanner',
        ),
        const Spacer(),
        DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.62),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
          ),
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            child: Text(
              'Fixed slot',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomPanel(ThemeData theme) {
    final matched = _matchedCard;
    final title = matched?.name ?? _status;
    final detail = matched == null
        ? _detailText()
        : [
            matched.setCode,
            matched.number,
            '${(matched.similarity * 100).toStringAsFixed(1)}%',
            matched.gvId,
          ].whereType<String>().where((item) => item.isNotEmpty).join('  ');
    final canScan =
        !_capturing && _controller != null && _controller!.value.isInitialized;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.76),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Row(
          children: [
            _buildThumbnail(),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    detail,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.white.withValues(alpha: 0.68),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            if (matched != null || _failureReason != null)
              IconButton.filled(
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: 0.12),
                  foregroundColor: Colors.white,
                ),
                onPressed: _capturing ? null : _retry,
                icon: const Icon(Icons.refresh_rounded),
                tooltip: 'Retry',
              )
            else
              SizedBox.square(
                dimension: 70,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    padding: EdgeInsets.zero,
                    shape: const CircleBorder(),
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    disabledBackgroundColor: Colors.white30,
                  ),
                  onPressed: canScan ? _captureSelectedSlot : null,
                  child: _capturing
                      ? const SizedBox.square(
                          dimension: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            color: Colors.black,
                          ),
                        )
                      : const Icon(Icons.camera_alt_rounded, size: 30),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildThumbnail() {
    final bytes = _normalizedPreviewBytes;
    if (bytes != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.memory(
          bytes,
          width: 48,
          height: 67,
          fit: BoxFit.cover,
          gaplessPlayback: true,
        ),
      );
    }
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withValues(alpha: 0.24)),
      ),
      child: Icon(
        _capturing
            ? Icons.image_search_rounded
            : Icons.center_focus_strong_rounded,
        color: Colors.white,
      ),
    );
  }

  String _detailText() {
    if (_capturing) return 'Still capture is the identity frame';
    if (_failureReason != null) return 'No confident match. Try again.';
    if (_annElapsed != null) {
      return 'Identity ${_annElapsed!.inMilliseconds} ms';
    }
    if (_artifactFiles != null) return 'Artifact exported';
    return 'Tap Scan when the card fills the slot';
  }
}

class _FixedSlotOverlay extends StatelessWidget {
  const _FixedSlotOverlay();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = ui.Size(constraints.maxWidth, constraints.maxHeight);
        final slot = FixedSlotCaptureGeometryV1.oneCardSlotRect(size);
        return CustomPaint(painter: _FixedSlotOverlayPainter(slot: slot));
      },
    );
  }
}

class _FixedSlotOverlayPainter extends CustomPainter {
  const _FixedSlotOverlayPainter({required this.slot});

  final ui.Rect slot;

  @override
  void paint(Canvas canvas, Size size) {
    final scrim = Paint()..color = Colors.black.withValues(alpha: 0.30);
    final full = Offset.zero & size;
    final clearPath = Path()
      ..fillType = PathFillType.evenOdd
      ..addRect(full)
      ..addRRect(RRect.fromRectAndRadius(slot, const Radius.circular(24)));
    canvas.drawPath(clearPath, scrim);

    final framePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..color = Colors.white.withValues(alpha: 0.92);
    canvas.drawRRect(
      RRect.fromRectAndRadius(slot.deflate(2), const Radius.circular(24)),
      framePaint,
    );

    final cornerPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.square
      ..color = const Color(0xFF7BE0A3);
    const corner = 38.0;
    final path = Path()
      ..moveTo(slot.left, slot.top + corner)
      ..lineTo(slot.left, slot.top)
      ..lineTo(slot.left + corner, slot.top)
      ..moveTo(slot.right - corner, slot.top)
      ..lineTo(slot.right, slot.top)
      ..lineTo(slot.right, slot.top + corner)
      ..moveTo(slot.right, slot.bottom - corner)
      ..lineTo(slot.right, slot.bottom)
      ..lineTo(slot.right - corner, slot.bottom)
      ..moveTo(slot.left + corner, slot.bottom)
      ..lineTo(slot.left, slot.bottom)
      ..lineTo(slot.left, slot.bottom - corner);
    canvas.drawPath(path, cornerPaint);
  }

  @override
  bool shouldRepaint(covariant _FixedSlotOverlayPainter oldDelegate) {
    return oldDelegate.slot != slot;
  }
}

class _PreviewFallback extends StatelessWidget {
  const _PreviewFallback({required this.label, this.detail});

  final String label;
  final String? detail;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(color: Color(0xFF101010)),
      child: CustomPaint(
        painter: _PreviewGridPainter(),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.camera_alt_outlined,
                  color: Colors.white70,
                  size: 38,
                ),
                const SizedBox(height: 12),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (detail != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    detail!,
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.58),
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PreviewGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.035)
      ..strokeWidth = 1;
    const step = 48.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
