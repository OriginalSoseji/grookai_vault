import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/scanner_v5/scanner_v5_identity_service.dart';
import '../../services/onboarding/onboarding_ladder_service.dart';
import '../../services/vault/vault_card_service.dart';
import 'widgets/scanner_result_sheet.dart';
import 'widgets/scanner_v5_palette.dart';
import 'widgets/scanner_viewfinder_chrome.dart';

enum ScanCaptureV5Exit { vault }

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

  final _identityService = ScannerV5IdentityService();
  final _imagePicker = ImagePicker();
  final String _sessionId =
      'scanner_v5_${DateTime.now().toUtc().microsecondsSinceEpoch}';
  CameraController? _controller;
  Future<void>? _cameraFuture;
  Size? _previewViewportSize;
  bool _capturing = false;
  bool _addingToVault = false;
  bool _flashEnabled = false;
  bool _showExactAlternates = false;
  String? _toastTitle;
  String? _toastMessage;
  Uint8List? _frozenUploadBytes;
  ScannerV5IdentifyResult? _result;

  @override
  void initState() {
    super.initState();
    unawaited(
      SystemChrome.setPreferredOrientations(const <DeviceOrientation>[
        DeviceOrientation.portraitUp,
      ]),
    );
    WidgetsBinding.instance.addObserver(this);
    _cameraFuture = _initializeCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_controller?.dispose());
    unawaited(SystemChrome.setPreferredOrientations(DeviceOrientation.values));
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
      _flashEnabled = false;
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

    final viewportSize = _previewViewportSize ?? MediaQuery.sizeOf(context);
    await HapticFeedback.mediumImpact();
    setState(() {
      _capturing = true;
      _result = null;
      _toastTitle = null;
      _toastMessage = null;
      _frozenUploadBytes = null;
      _showExactAlternates = false;
    });

    try {
      await _prepareStill(controller);
      final picture = await controller.takePicture();
      final imageBytes = await _prepareUploadBytes(
        await File(picture.path).readAsBytes(),
        viewportSize: viewportSize,
      );
      unawaited(_deleteTemporaryCapture(picture.path));
      if (!mounted) return;
      setState(() {
        _frozenUploadBytes = imageBytes;
      });

      final result = await _identityService.identify(imageBytes);
      await _appendSessionLog(result);
      if (!mounted) return;
      final hasCandidates = result.candidates.isNotEmpty;
      setState(() {
        _result = hasCandidates ? result : null;
        _capturing = false;
        _frozenUploadBytes = hasCandidates ? _frozenUploadBytes : null;
        if (!hasCandidates) {
          _toastTitle = "Couldn't read this card";
          _toastMessage =
              result.retakeHint ?? 'Center one card and reduce glare.';
        }
      });
      await HapticFeedback.selectionClick();
    } catch (error) {
      await _appendIdentifyErrorLog(error);
      if (!mounted) return;
      final copy = scannerV5UserFacingError(error);
      setState(() {
        _capturing = false;
        _result = null;
        _frozenUploadBytes = null;
        _toastTitle = copy.title;
        _toastMessage = copy.message;
      });
    }
  }

  Future<void> _pickPhotoAndIdentify() async {
    if (_capturing || _addingToVault) return;

    final picked = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 100,
      requestFullMetadata: false,
    );
    if (picked == null) return;

    await HapticFeedback.selectionClick();
    setState(() {
      _capturing = true;
      _result = null;
      _toastTitle = null;
      _toastMessage = null;
      _frozenUploadBytes = null;
      _showExactAlternates = false;
    });

    try {
      final imageBytes = scannerV5PrepareImportedPhotoForUpload(
        await File(picked.path).readAsBytes(),
      );
      if (!mounted) return;
      setState(() {
        _frozenUploadBytes = imageBytes;
      });

      final result = await _identityService.identify(imageBytes);
      await _appendSessionLog(result, source: 'photo_library');
      if (!mounted) return;
      final hasCandidates = result.candidates.isNotEmpty;
      setState(() {
        _result = hasCandidates ? result : null;
        _capturing = false;
        _frozenUploadBytes = hasCandidates ? _frozenUploadBytes : null;
        if (!hasCandidates) {
          _toastTitle = "Couldn't read this photo";
          _toastMessage =
              result.retakeHint ?? 'Use a clear photo of one card front.';
        }
      });
      await HapticFeedback.selectionClick();
    } catch (error) {
      await _appendIdentifyErrorLog(error, source: 'photo_library');
      if (!mounted) return;
      final copy = scannerV5UserFacingError(error);
      setState(() {
        _capturing = false;
        _result = null;
        _frozenUploadBytes = null;
        _toastTitle = copy.title;
        _toastMessage = copy.message;
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

  Future<Uint8List> _prepareUploadBytes(
    Uint8List rawBytes, {
    required Size viewportSize,
  }) async {
    final decoded = img.decodeImage(rawBytes);
    if (decoded == null) {
      return rawBytes;
    }
    final oriented = img.bakeOrientation(decoded);
    final slotCrop = _cropToVisualSlot(oriented, viewportSize);
    final resized = _resizeForUpload(slotCrop);
    return Uint8List.fromList(
      img.encodeJpg(resized, quality: _uploadJpegQuality),
    );
  }

  img.Image _cropToVisualSlot(img.Image source, Size viewportSize) {
    final width = source.width;
    final height = source.height;
    if (width <= 0 ||
        height <= 0 ||
        viewportSize.width <= 0 ||
        viewportSize.height <= 0) {
      return source;
    }

    final sourceRect = Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble());
    final viewportAspect = viewportSize.width / viewportSize.height;
    final sourceAspect = width / height;
    late final Rect visibleRegion;
    if (sourceAspect > viewportAspect) {
      final visibleWidth = height * viewportAspect;
      visibleRegion = Rect.fromLTWH(
        (width - visibleWidth) / 2,
        0,
        visibleWidth,
        height.toDouble(),
      );
    } else {
      final visibleHeight = width / viewportAspect;
      visibleRegion = Rect.fromLTWH(
        0,
        (height - visibleHeight) / 2,
        width.toDouble(),
        visibleHeight,
      );
    }

    final guideRect = _ScannerV5GuideGeometry.frameForSize(viewportSize);
    final guideFractions = Rect.fromLTRB(
      guideRect.left / viewportSize.width,
      guideRect.top / viewportSize.height,
      guideRect.right / viewportSize.width,
      guideRect.bottom / viewportSize.height,
    );
    final mappedGuide = Rect.fromLTRB(
      visibleRegion.left + visibleRegion.width * guideFractions.left,
      visibleRegion.top + visibleRegion.height * guideFractions.top,
      visibleRegion.left + visibleRegion.width * guideFractions.right,
      visibleRegion.top + visibleRegion.height * guideFractions.bottom,
    );
    final paddedGuide = mappedGuide.inflate(
      math.min(mappedGuide.width, mappedGuide.height) * 0.04,
    );
    final clamped = Rect.fromLTRB(
      paddedGuide.left.clamp(sourceRect.left, sourceRect.right - 1).toDouble(),
      paddedGuide.top.clamp(sourceRect.top, sourceRect.bottom - 1).toDouble(),
      paddedGuide.right.clamp(sourceRect.left + 1, sourceRect.right).toDouble(),
      paddedGuide.bottom
          .clamp(sourceRect.top + 1, sourceRect.bottom)
          .toDouble(),
    );

    if (clamped != paddedGuide) {
      debugPrint(
        '[scanner_v5] slot crop clamped: source=${width}x$height '
        'viewport=${viewportSize.width.toStringAsFixed(1)}x'
        '${viewportSize.height.toStringAsFixed(1)} '
        'mapped=${_formatRect(paddedGuide)} clamped=${_formatRect(clamped)}',
      );
    }

    final x = clamped.left.floor().clamp(0, width - 1).toInt();
    final y = clamped.top.floor().clamp(0, height - 1).toInt();
    final w = clamped.width.ceil().clamp(1, width - x).toInt();
    final h = clamped.height.ceil().clamp(1, height - y).toInt();

    return img.copyCrop(source, x: x, y: y, width: w, height: h);
  }

  img.Image _resizeForUpload(img.Image source) {
    return scannerV5ResizeForUpload(source);
  }

  Future<void> _appendSessionLog(
    ScannerV5IdentifyResult result, {
    String source = 'live_camera',
  }) async {
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
        'source': source,
        'endpoint': _identityService.endpoint,
        'result': result.toSessionJson(),
      }),
    ];
    await prefs.setStringList(_sessionLogKey, nextRows);
  }

  Future<void> _appendIdentifyErrorLog(
    Object error, {
    String source = 'live_camera',
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final rows = prefs.getStringList(_sessionLogKey) ?? const <String>[];
    final retainedRows = rows.length > 49
        ? rows.sublist(rows.length - 49)
        : rows;
    final nextRows = <String>[
      ...retainedRows,
      jsonEncode(<String, dynamic>{
        'event_type': 'scanner_v5_identify_error',
        'ts': DateTime.now().toUtc().toIso8601String(),
        'session_id': _sessionId,
        'source': source,
        'endpoint': _identityService.endpoint,
        'error_type': scannerV5ErrorType(error),
        'http_status': error is ScannerV5HttpException
            ? error.statusCode
            : null,
      }),
    ];
    await prefs.setStringList(_sessionLogKey, nextRows);
  }

  Future<void> _addCandidateToVault(ScannerV5Candidate candidate) async {
    if (_addingToVault) return;
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null || userId.trim().isEmpty) {
      _showScanNotice(
        'Sign in required',
        'Sign in to add this card to your Vault.',
      );
      return;
    }
    final cardPrintId = candidate.vaultCardPrintId;
    if (cardPrintId.isEmpty || cardPrintId.startsWith('GV-')) {
      _showScanNotice(
        'Could not add this match',
        'Try another candidate or scan the card again.',
      );
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
      await _emitScannerV5VaultAddEnriched(
        userId: userId,
        candidate: candidate,
        gvviId: gvviId,
      );
      unawaited(
        OnboardingLadderService.recordOwnedBestEffort(
          client: Supabase.instance.client,
          cardPrintId: cardPrintId,
          source: 'scan',
        ),
      );
      if (!mounted) return;
      await HapticFeedback.heavyImpact();
      _resetToLiveScanner();
    } catch (_) {
      if (!mounted) return;
      _showScanNotice(
        'Could not add this card',
        'Try again or choose another match.',
      );
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

  Future<void> _emitScannerV5VaultAddEnriched({
    required String userId,
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
    try {
      await Supabase.instance.client.rpc(
        'scanner_v5_emit_vault_add_enriched_v1',
        params: {
          'p_user_id': userId,
          'p_gvvi_id': gvviId,
          'p_card_print_id': candidate.vaultCardPrintId,
          'p_payload': {
            'session_id': _sessionId,
            'confirmed_rank': confirmedRank <= 0 ? null : confirmedRank,
            'gv_id': candidate.gvId,
            'card_id': candidate.cardId,
            'response_mode': result?.mode,
            'response_candidates': candidates
                .map((row) => row.toSessionJson())
                .toList(growable: false),
          },
        },
      );
    } catch (error) {
      debugPrint('[scanner_v5] enrichment_emit_failed: $error');
    }
  }

  void _showScanNotice(String title, String message) {
    if (!mounted) return;
    setState(() {
      _result = null;
      _frozenUploadBytes = null;
      _showExactAlternates = false;
      _toastTitle = title;
      _toastMessage = message;
    });
  }

  void _resetToLiveScanner() {
    if (!mounted) return;
    setState(() {
      _capturing = false;
      _result = null;
      _frozenUploadBytes = null;
      _showExactAlternates = false;
      _toastTitle = null;
      _toastMessage = null;
    });
  }

  Future<void> _toggleFlash() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    final enable = !_flashEnabled;
    try {
      await controller.setFlashMode(enable ? FlashMode.torch : FlashMode.off);
      if (!mounted) return;
      setState(() => _flashEnabled = enable);
    } catch (_) {
      _showScanNotice('Flash unavailable', 'This camera did not accept flash.');
    }
  }

  void _showHistoryStub() {
    _showScanNotice('History coming soon', 'Recent scans will live here.');
  }

  void _popToVault() {
    Navigator.of(context).pop(ScanCaptureV5Exit.vault);
  }

  @override
  Widget build(BuildContext context) {
    final endpointNotConfigured = scannerV5EndpointNotConfiguredForDevice(
      endpoint: _identityService.endpoint,
      isPhysicalDevice: Platform.isAndroid || Platform.isIOS,
    );
    return Scaffold(
      backgroundColor: ScannerV5Palette.bg,
      extendBodyBehindAppBar: true,
      body: FutureBuilder<void>(
        future: _cameraFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const ColoredBox(
              color: ScannerV5Palette.bg,
              child: Center(child: CircularProgressIndicator()),
            );
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
          return LayoutBuilder(
            builder: (context, constraints) {
              final viewportSize = Size(
                constraints.maxWidth,
                constraints.maxHeight,
              );
              _previewViewportSize = viewportSize;
              final frame = _ScannerV5GuideGeometry.frameForSize(viewportSize);
              final previewSize = controller.value.previewSize;
              final frozenBytes = _frozenUploadBytes;
              final hasFrozenFrame = frozenBytes != null;
              final showResultSheet =
                  _result != null && _result!.candidates.isNotEmpty;
              return Stack(
                children: [
                  if (hasFrozenFrame)
                    Positioned.fill(
                      child: _capturing
                          ? ScannerIdentifyingOverlay(
                              imageBytes: frozenBytes,
                              frame: frame,
                            )
                          : _FrozenResultFrame(
                              imageBytes: frozenBytes,
                              frame: frame,
                            ),
                    )
                  else
                    Positioned.fill(
                      child: previewSize == null
                          ? CameraPreview(controller)
                          : FittedBox(
                              fit: BoxFit.cover,
                              clipBehavior: Clip.hardEdge,
                              child: SizedBox(
                                width: previewSize.height,
                                height: previewSize.width,
                                child: CameraPreview(controller),
                              ),
                            ),
                    ),
                  Positioned.fill(
                    child: IgnorePointer(
                      child: CustomPaint(
                        painter: _ScannerV5FramePainter(
                          bracketColor: _toastTitle == null
                              ? Colors.white.withValues(alpha: 0.92)
                              : ScannerV5Palette.amber,
                        ),
                      ),
                    ),
                  ),
                  ScannerViewfinderChrome(
                    flashEnabled: _flashEnabled,
                    captureEnabled:
                        !endpointNotConfigured &&
                        !_capturing &&
                        !_addingToVault,
                    identifying: _capturing,
                    toastTitle: showResultSheet ? null : _toastTitle,
                    toastMessage: showResultSheet ? null : _toastMessage,
                    onClose: () => Navigator.of(context).maybePop(),
                    onFlashToggle: _toggleFlash,
                    onHistory: _showHistoryStub,
                    onCapture: _captureAndIdentify,
                    onPhotos: _pickPhotoAndIdentify,
                    onVault: _popToVault,
                  ),
                  if (endpointNotConfigured)
                    Positioned(
                      left: 18,
                      right: 18,
                      top: MediaQuery.paddingOf(context).top + 58,
                      child: _ScannerEndpointBanner(
                        endpoint: _identityService.endpoint,
                      ),
                    ),
                  if (showResultSheet)
                    ScannerResultSheet(
                      result: _result!,
                      addingToVault: _addingToVault,
                      showExactAlternates: _showExactAlternates,
                      onAddCandidate: _addCandidateToVault,
                      onDismiss: _resetToLiveScanner,
                      onRetake: _resetToLiveScanner,
                      onShowAlternates: () {
                        setState(() => _showExactAlternates = true);
                      },
                    ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}

class ScannerV5ErrorCopy {
  const ScannerV5ErrorCopy({required this.title, required this.message});

  final String title;
  final String message;
}

ScannerV5ErrorCopy scannerV5UserFacingError(Object error) {
  if (error is TimeoutException) {
    return const ScannerV5ErrorCopy(
      title: 'Scanner timed out',
      message: 'Scanner timed out. Try again with the card centered.',
    );
  }
  if (error is ScannerV5UnreachableException) {
    return const ScannerV5ErrorCopy(
      title: 'Scanner offline',
      message:
          "Can't reach the scanner service. Check your connection and try again.",
    );
  }
  if (error is ScannerV5HttpException) {
    if (error.statusCode >= 500) {
      return const ScannerV5ErrorCopy(
        title: 'Scanner service error',
        message: 'Scanner service error — try again in a moment.',
      );
    }
    return ScannerV5ErrorCopy(
      title: 'Scanner request failed',
      message: 'Scanner request failed with status ${error.statusCode}.',
    );
  }
  if (error is ScannerV5ProtocolException) {
    return const ScannerV5ErrorCopy(
      title: 'Scanner response error',
      message: 'Scanner returned an unexpected response.',
    );
  }
  return const ScannerV5ErrorCopy(
    title: 'Scanner error',
    message: 'Scanner could not complete this scan. Try again in a moment.',
  );
}

String scannerV5ErrorType(Object error) {
  if (error is TimeoutException) return 'timeout';
  if (error is ScannerV5UnreachableException) return 'unreachable';
  if (error is ScannerV5HttpException) return 'http';
  if (error is ScannerV5ProtocolException) return 'protocol';
  return error.runtimeType.toString();
}

@visibleForTesting
Uint8List scannerV5PrepareImportedPhotoForUpload(Uint8List rawBytes) {
  final decoded = img.decodeImage(rawBytes);
  if (decoded == null) {
    return rawBytes;
  }
  final oriented = img.bakeOrientation(decoded);
  final resized = scannerV5ResizeForUpload(oriented);
  return Uint8List.fromList(
    img.encodeJpg(
      resized,
      quality: _ScanCaptureV5ScreenState._uploadJpegQuality,
    ),
  );
}

@visibleForTesting
img.Image scannerV5ResizeForUpload(img.Image source) {
  final longEdge = math.max(source.width, source.height);
  if (longEdge <= _ScanCaptureV5ScreenState._uploadMaxLongEdge) {
    return source;
  }
  final scale = _ScanCaptureV5ScreenState._uploadMaxLongEdge / longEdge;
  return img.copyResize(
    source,
    width: math.max(1, (source.width * scale).round()),
    height: math.max(1, (source.height * scale).round()),
    interpolation: img.Interpolation.average,
  );
}

bool scannerV5EndpointNotConfiguredForDevice({
  required String endpoint,
  required bool isPhysicalDevice,
}) {
  if (!isPhysicalDevice) return false;
  final uri = Uri.tryParse(endpoint);
  final host = uri?.host.trim().toLowerCase();
  return host == '127.0.0.1' || host == 'localhost' || host == '10.0.2.2';
}

class _ScannerEndpointBanner extends StatelessWidget {
  const _ScannerEndpointBanner({required this.endpoint});

  final String endpoint;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: ScannerV5Palette.sheet.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: ScannerV5Palette.amber.withValues(alpha: 0.34),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(
              Icons.warning_amber_rounded,
              color: ScannerV5Palette.amber,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Scanner endpoint not configured',
                    style: TextStyle(
                      color: ScannerV5Palette.text,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Build with the public Scanner V5 endpoint before testing on this device.',
                    style: TextStyle(
                      color: ScannerV5Palette.dim(0.66),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      height: 1.25,
                    ),
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

class _FrozenResultFrame extends StatelessWidget {
  const _FrozenResultFrame({required this.imageBytes, required this.frame});

  final Uint8List imageBytes;
  final Rect frame;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(
          child: ColoredBox(color: ScannerV5Palette.frozenBg),
        ),
        Positioned.fromRect(
          rect: frame,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.memory(imageBytes, fit: BoxFit.cover),
          ),
        ),
      ],
    );
  }
}

class _ScannerV5GuideGeometry {
  const _ScannerV5GuideGeometry._();

  static const widthFraction = 0.72;
  static const centerYFraction = 0.44;
  static const cardAspectRatio = 2.5 / 3.5;
  static const radius = Radius.circular(18);

  static Rect frameForSize(Size size) {
    if (size.width <= 0 || size.height <= 0) {
      return Rect.zero;
    }

    final maxWidth = math.max(1.0, size.width - 40);
    final maxHeight = math.max(1.0, size.height - 220);
    final minWidth = math.min(240.0, maxWidth);
    final minHeight = math.min(330.0, maxHeight);

    var frameWidth = (size.width * widthFraction)
        .clamp(minWidth, maxWidth)
        .toDouble();
    var frameHeight = frameWidth / cardAspectRatio;
    if (frameHeight > maxHeight) {
      frameHeight = maxHeight;
      frameWidth = frameHeight * cardAspectRatio;
    }
    if (frameHeight < minHeight) {
      frameHeight = minHeight;
      frameWidth = frameHeight * cardAspectRatio;
    }
    if (frameWidth > maxWidth) {
      frameWidth = maxWidth;
      frameHeight = frameWidth / cardAspectRatio;
    }

    return Rect.fromCenter(
      center: Offset(size.width / 2, size.height * centerYFraction),
      width: frameWidth,
      height: frameHeight,
    );
  }
}

class _ScannerV5FramePainter extends CustomPainter {
  const _ScannerV5FramePainter({required this.bracketColor});

  final Color bracketColor;

  @override
  void paint(Canvas canvas, Size size) {
    final overlayPaint = Paint()
      ..color = const Color(0xFF08090A).withValues(alpha: 0.45);
    final frame = _ScannerV5GuideGeometry.frameForSize(size);
    final screen = Path()..addRect(Offset.zero & size);
    final cutout = Path()
      ..addRRect(
        RRect.fromRectAndRadius(frame, _ScannerV5GuideGeometry.radius),
      );
    canvas.drawPath(
      Path.combine(PathOperation.difference, screen, cutout),
      overlayPaint,
    );

    final bracketPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = bracketColor;
    _drawCornerBrackets(canvas, frame, bracketPaint);
  }

  void _drawCornerBrackets(Canvas canvas, Rect frame, Paint paint) {
    const leg = 34.0;
    const radius = 18.0;
    final left = frame.left;
    final right = frame.right;
    final top = frame.top;
    final bottom = frame.bottom;

    final path = Path()
      ..moveTo(left, top + radius + leg)
      ..lineTo(left, top + radius)
      ..quadraticBezierTo(left, top, left + radius, top)
      ..lineTo(left + radius + leg, top)
      ..moveTo(right - radius - leg, top)
      ..lineTo(right - radius, top)
      ..quadraticBezierTo(right, top, right, top + radius)
      ..lineTo(right, top + radius + leg)
      ..moveTo(left, bottom - radius - leg)
      ..lineTo(left, bottom - radius)
      ..quadraticBezierTo(left, bottom, left + radius, bottom)
      ..lineTo(left + radius + leg, bottom)
      ..moveTo(right - radius - leg, bottom)
      ..lineTo(right - radius, bottom)
      ..quadraticBezierTo(right, bottom, right, bottom - radius)
      ..lineTo(right, bottom - radius - leg);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _ScannerV5FramePainter oldDelegate) {
    return oldDelegate.bracketColor != bracketColor;
  }
}

String _formatRect(Rect rect) {
  return 'l=${rect.left.toStringAsFixed(1)},'
      't=${rect.top.toStringAsFixed(1)},'
      'r=${rect.right.toStringAsFixed(1)},'
      'b=${rect.bottom.toStringAsFixed(1)}';
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
