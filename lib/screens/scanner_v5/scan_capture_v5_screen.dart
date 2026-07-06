import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/scanner_v5/scanner_v5_identity_service.dart';
import '../../services/vault/vault_card_service.dart';

class ScanCaptureV5Screen extends StatefulWidget {
  const ScanCaptureV5Screen({super.key});

  @override
  State<ScanCaptureV5Screen> createState() => _ScanCaptureV5ScreenState();
}

class _ScanCaptureV5ScreenState extends State<ScanCaptureV5Screen>
    with WidgetsBindingObserver {
  static const _sessionLogKey = 'scanner_v5_session_log_jsonl_v1';
  static const _uploadJpegQuality = 85;
  static const _uploadMaxLongEdge = 1200;
  static const _cardAspectRatio = 2.5 / 3.5;

  final _identityService = ScannerV5IdentityService();
  final String _sessionId =
      'scanner_v5_${DateTime.now().toUtc().microsecondsSinceEpoch}';
  CameraController? _controller;
  Future<void>? _cameraFuture;
  bool _capturing = false;
  bool _addingToVault = false;
  String _status = 'Align one card in the frame';
  String? _error;
  ScannerV5IdentifyResult? _result;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
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
      throw StateError('No camera is available on this device.');
    }
    final backCamera = cameras.firstWhere(
      (camera) => camera.lensDirection == CameraLensDirection.back,
      orElse: () => cameras.first,
    );

    Object? lastError;
    for (final preset in const <ResolutionPreset>[
      ResolutionPreset.veryHigh,
      ResolutionPreset.high,
      ResolutionPreset.medium,
    ]) {
      final controller = CameraController(
        backCamera,
        preset,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      try {
        await controller.initialize();
        await _configureCamera(controller);
        _controller = controller;
        if (mounted) setState(() {});
        return;
      } catch (error) {
        lastError = error;
        await controller.dispose();
      }
    }
    throw StateError('Camera failed to start: ${lastError ?? 'unknown'}');
  }

  Future<void> _configureCamera(CameraController controller) async {
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

  Future<void> _captureAndIdentify() async {
    final controller = _controller;
    if (_capturing ||
        controller == null ||
        !controller.value.isInitialized ||
        controller.value.isTakingPicture) {
      return;
    }

    await HapticFeedback.mediumImpact();
    setState(() {
      _capturing = true;
      _error = null;
      _result = null;
      _status = 'Capturing still';
    });

    try {
      await _prepareStill(controller);
      final picture = await controller.takePicture();
      final imageBytes = await _prepareUploadBytes(
        await File(picture.path).readAsBytes(),
      );
      unawaited(_deleteTemporaryCapture(picture.path));
      if (!mounted) return;
      setState(() {
        _status = 'Identifying card';
      });

      final result = await _identityService.identify(imageBytes);
      await _appendSessionLog(result);
      if (!mounted) return;
      setState(() {
        _result = result;
        _capturing = false;
        _status = result.candidates.isEmpty ? 'Try again' : 'Choose match';
        _error = result.candidates.isEmpty
            ? result.retakeHint ?? 'No confident match was found.'
            : null;
      });
      await HapticFeedback.selectionClick();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _capturing = false;
        _status = 'Try again';
        _error = _userFacingError(error);
      });
    }
  }

  Future<void> _prepareStill(CameraController controller) async {
    try {
      await controller.setFocusPoint(const Offset(0.5, 0.5));
    } catch (_) {}
    try {
      await controller.setExposurePoint(const Offset(0.5, 0.5));
    } catch (_) {}
    try {
      await controller.setFocusMode(FocusMode.auto);
    } catch (_) {}
    try {
      await controller.setExposureMode(ExposureMode.auto);
    } catch (_) {}
    await Future<void>.delayed(const Duration(milliseconds: 180));
  }

  Future<void> _deleteTemporaryCapture(String path) async {
    try {
      await File(path).delete();
    } catch (_) {}
  }

  Future<Uint8List> _prepareUploadBytes(Uint8List rawBytes) async {
    final decoded = img.decodeImage(rawBytes);
    if (decoded == null) {
      return rawBytes;
    }
    final oriented = img.bakeOrientation(decoded);
    final slotCrop = _cropToVisualSlot(oriented);
    final resized = _resizeForUpload(slotCrop);
    return Uint8List.fromList(
      img.encodeJpg(resized, quality: _uploadJpegQuality),
    );
  }

  img.Image _cropToVisualSlot(img.Image source) {
    final width = source.width;
    final height = source.height;
    if (width <= 0 || height <= 0) {
      return source;
    }

    var cropWidth = math.min(width * 0.72, height * 0.68 * _cardAspectRatio);
    var cropHeight = cropWidth / _cardAspectRatio;
    if (cropHeight > height * 0.84) {
      cropHeight = height * 0.84;
      cropWidth = cropHeight * _cardAspectRatio;
    }

    final centerX = width / 2;
    final centerY = height * 0.44;
    final x = (centerX - cropWidth / 2)
        .round()
        .clamp(0, math.max(0, width - cropWidth.round()))
        .toInt();
    final y = (centerY - cropHeight / 2)
        .round()
        .clamp(0, math.max(0, height - cropHeight.round()))
        .toInt();
    final w = cropWidth.round().clamp(1, width - x).toInt();
    final h = cropHeight.round().clamp(1, height - y).toInt();

    return img.copyCrop(source, x: x, y: y, width: w, height: h);
  }

  img.Image _resizeForUpload(img.Image source) {
    final longEdge = math.max(source.width, source.height);
    if (longEdge <= _uploadMaxLongEdge) {
      return source;
    }
    final scale = _uploadMaxLongEdge / longEdge;
    return img.copyResize(
      source,
      width: math.max(1, (source.width * scale).round()),
      height: math.max(1, (source.height * scale).round()),
      interpolation: img.Interpolation.average,
    );
  }

  Future<void> _appendSessionLog(ScannerV5IdentifyResult result) async {
    final prefs = await SharedPreferences.getInstance();
    final rows = prefs.getStringList(_sessionLogKey) ?? const <String>[];
    final retainedRows = rows.length > 49
        ? rows.sublist(rows.length - 49)
        : rows;
    final nextRows = <String>[
      ...retainedRows,
      jsonEncode(<String, dynamic>{
        'event_type': 'scanner_v5_identify_result',
        'ts': DateTime.now().toUtc().toIso8601String(),
        'session_id': _sessionId,
        'endpoint': _identityService.endpoint,
        'result': result.toSessionJson(),
      }),
    ];
    await prefs.setStringList(_sessionLogKey, nextRows);
  }

  Future<void> _addCandidateToVault(ScannerV5Candidate candidate) async {
    if (_addingToVault) return;
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null || userId.trim().isEmpty) {
      _showSnack('Sign in to add this card to your Vault.');
      return;
    }
    final cardPrintId = candidate.vaultCardPrintId;
    if (cardPrintId.isEmpty || cardPrintId.startsWith('GV-')) {
      _showSnack('This scanner match cannot be added yet. Try another match.');
      return;
    }

    setState(() => _addingToVault = true);
    try {
      final gvviId = await VaultCardService.addOrIncrementVaultItem(
        client: Supabase.instance.client,
        userId: userId,
        cardId: cardPrintId,
        fallbackName: candidate.name,
        fallbackSetName: candidate.setCode,
        fallbackImageUrl: candidate.imageUrl,
      );
      await _appendConfirmationLog(candidate: candidate, gvviId: gvviId);
      if (!mounted) return;
      _showSnack('Added ${candidate.name} to your Vault.');
    } catch (_) {
      if (!mounted) return;
      _showSnack('Unable to add this card to your Vault.');
    } finally {
      if (mounted) setState(() => _addingToVault = false);
    }
  }

  Future<void> _appendConfirmationLog({
    required ScannerV5Candidate candidate,
    required String gvviId,
  }) async {
    final result = _result;
    final candidates = result?.candidates ?? const <ScannerV5Candidate>[];
    final confirmedRank =
        candidate.rank ??
        candidates.indexWhere(
              (row) => row.vaultCardPrintId == candidate.vaultCardPrintId,
            ) +
            1;
    final payload = <String, dynamic>{
      'event_type': 'scanner_v5_scan/card',
      'ts': DateTime.now().toUtc().toIso8601String(),
      'session_id': _sessionId,
      'confirmed_rank': confirmedRank <= 0 ? null : confirmedRank,
      'gv_id': candidate.gvId,
      'card_id': candidate.cardId,
      'gvvi_id': gvviId,
      'response_mode': result?.mode,
      'response_candidates': candidates
          .map((row) => row.toSessionJson())
          .toList(growable: false),
    };
    final prefs = await SharedPreferences.getInstance();
    final rows = prefs.getStringList(_sessionLogKey) ?? const <String>[];
    final retainedRows = rows.length > 49
        ? rows.sublist(rows.length - 49)
        : rows;
    await prefs.setStringList(_sessionLogKey, <String>[
      ...retainedRows,
      jsonEncode(payload),
    ]);
    debugPrint('[scanner_v5] ${jsonEncode(payload)}');
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  String _userFacingError(Object error) {
    if (error is TimeoutException) {
      return 'Scanner timed out. Try again with the card centered.';
    }
    return 'Scanner could not identify this card. Try again with less glare.';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: const Text('Scan Card'),
        actions: [
          IconButton(
            tooltip: 'Restart camera',
            onPressed: _capturing
                ? null
                : () {
                    _cameraFuture = _initializeCamera();
                    setState(() {
                      _result = null;
                      _error = null;
                      _status = 'Align one card in the frame';
                    });
                  },
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: FutureBuilder<void>(
        future: _cameraFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ScannerV5Message(
              title: 'Camera unavailable',
              message: 'Scanner could not start the camera.',
              actionLabel: 'Try again',
              onAction: () {
                _cameraFuture = _initializeCamera();
                setState(() {});
              },
            );
          }
          final controller = _controller;
          if (controller == null || !controller.value.isInitialized) {
            return const _ScannerV5Message(
              title: 'Camera unavailable',
              message: 'Scanner camera is not ready yet.',
            );
          }
          return Stack(
            children: [
              Positioned.fill(
                child: Center(
                  child: AspectRatio(
                    aspectRatio: controller.value.aspectRatio,
                    child: CameraPreview(controller),
                  ),
                ),
              ),
              Positioned.fill(
                child: _ScannerV5Overlay(
                  status: _status,
                  error: _error,
                  busy: _capturing,
                ),
              ),
              Positioned(
                left: 16,
                right: 16,
                bottom: 24 + MediaQuery.paddingOf(context).bottom,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_result != null)
                      _ResultRail(
                        result: _result!,
                        addingToVault: _addingToVault,
                        onAdd: _addCandidateToVault,
                      ),
                    const SizedBox(height: 14),
                    FilledButton.icon(
                      onPressed: _capturing ? null : _captureAndIdentify,
                      icon: _capturing
                          ? SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: colorScheme.onPrimary,
                              ),
                            )
                          : const Icon(Icons.camera_alt_rounded),
                      label: Text(_capturing ? 'Identifying' : 'Scan card'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(54),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(22),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ResultRail extends StatelessWidget {
  const _ResultRail({
    required this.result,
    required this.addingToVault,
    required this.onAdd,
  });

  final ScannerV5IdentifyResult result;
  final bool addingToVault;
  final ValueChanged<ScannerV5Candidate> onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final candidates = result.candidates.take(3).toList(growable: false);
    if (candidates.isEmpty) {
      return const SizedBox.shrink();
    }
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              result.mode == 'ocr_exact' ? 'Exact number match' : 'Top matches',
              style: theme.textTheme.labelSmall?.copyWith(
                color: colorScheme.primary,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.7,
              ),
            ),
            const SizedBox(height: 8),
            for (final candidate in candidates)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _CandidateRow(
                  candidate: candidate,
                  addingToVault: addingToVault,
                  onAdd: () => onAdd(candidate),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CandidateRow extends StatelessWidget {
  const _CandidateRow({
    required this.candidate,
    required this.addingToVault,
    required this.onAdd,
  });

  final ScannerV5Candidate candidate;
  final bool addingToVault;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final imageUrl = candidate.imageUrl;
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: SizedBox(
            width: 44,
            height: 62,
            child: imageUrl == null
                ? ColoredBox(color: colorScheme.surfaceContainerHighest)
                : Image.network(imageUrl, fit: BoxFit.cover),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                candidate.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                [
                  if (candidate.setCode != null) candidate.setCode,
                  if (candidate.number != null) '#${candidate.number}',
                  if (candidate.gvId != null) candidate.gvId,
                ].join(' · '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: addingToVault ? null : onAdd,
          style: FilledButton.styleFrom(
            visualDensity: VisualDensity.compact,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
          child: Text(addingToVault ? 'Adding' : 'Add'),
        ),
      ],
    );
  }
}

class _ScannerV5Overlay extends StatelessWidget {
  const _ScannerV5Overlay({
    required this.status,
    required this.error,
    required this.busy,
  });

  final String status;
  final String? error;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return IgnorePointer(
      child: CustomPaint(
        painter: _ScannerV5FramePainter(colorScheme: colorScheme),
        child: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: colorScheme.surface.withValues(alpha: 0.78),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: colorScheme.outlineVariant),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (busy)
                    const Padding(
                      padding: EdgeInsets.only(right: 8),
                      child: SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  Flexible(
                    child: Text(
                      error ?? status,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: error == null
                            ? colorScheme.onSurface
                            : colorScheme.error,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ScannerV5FramePainter extends CustomPainter {
  const _ScannerV5FramePainter({required this.colorScheme});

  final ColorScheme colorScheme;

  @override
  void paint(Canvas canvas, Size size) {
    final overlayPaint = Paint()
      ..color = colorScheme.shadow.withValues(alpha: 0.46);
    final frameWidth = size.width * 0.72;
    final frameHeight = frameWidth * 1.4;
    final frame = Rect.fromCenter(
      center: Offset(size.width / 2, size.height * 0.44),
      width: frameWidth.clamp(240, size.width - 40),
      height: frameHeight.clamp(330, size.height - 220),
    );
    final screen = Path()..addRect(Offset.zero & size);
    final cutout = Path()
      ..addRRect(RRect.fromRectAndRadius(frame, const Radius.circular(24)));
    canvas.drawPath(
      Path.combine(PathOperation.difference, screen, cutout),
      overlayPaint,
    );

    final borderPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = colorScheme.primary.withValues(alpha: 0.92);
    canvas.drawRRect(
      RRect.fromRectAndRadius(frame, const Radius.circular(24)),
      borderPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ScannerV5FramePainter oldDelegate) {
    return oldDelegate.colorScheme != colorScheme;
  }
}

class _ScannerV5Message extends StatelessWidget {
  const _ScannerV5Message({
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 18),
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}
