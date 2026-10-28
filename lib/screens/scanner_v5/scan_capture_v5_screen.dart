import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../../services/scanner_v5/scanner_v5_identity_service.dart';
import '../../services/scanner_v5/scanner_v5_error_copy.dart';
export '../../services/scanner_v5/scanner_v5_error_copy.dart';
import '../../services/scanner_v5/scanner_camera_session.dart';
import '../../services/scanner_v5/scanner_upload_preparation.dart';
import '../../services/scanner_v5/scanner_session_log.dart';
import '../../services/scanner_v5/scanner_vault_add.dart';
import '../../services/onboarding/onboarding_ladder_service.dart';
import '../../services/public/jungle_edition_resolution_service.dart';
import '../scanner/jungle_edition_scan_review.dart';
import '../../widgets/vault/vault_add_review_sheet.dart';
import '../vault/vault_manage_card_screen.dart';
import 'widgets/scanner_result_sheet.dart';
import 'widgets/scanner_v5_palette.dart';
import 'widgets/scanner_viewfinder_chrome.dart';

enum ScanCaptureV5Exit { vault }

class ScanCaptureV5Screen extends StatefulWidget {
  const ScanCaptureV5Screen({
    super.key,
    this.onStartBatch,
    this.onBatchCapture,
    this.batchCount = 0,
    this.multipleCards = false,
  });
  final Future<void> Function()? onStartBatch;
  final Future<void> Function(Uint8List bytes)? onBatchCapture;
  final int batchCount;
  final bool multipleCards;

  @override
  State<ScanCaptureV5Screen> createState() => _ScanCaptureV5ScreenState();
}

class _ScanCaptureV5ScreenState extends State<ScanCaptureV5Screen>
    with WidgetsBindingObserver {
  final _identityService = ScannerV5IdentityService();
  final _imagePicker = ImagePicker();
  final String _sessionId =
      'scanner_v5_${DateTime.now().toUtc().microsecondsSinceEpoch}';
  late final ScannerCameraSession<CameraController> _cameraSession;
  CameraController? get _controller => _cameraSession.current;
  bool _pickingPhoto = false;
  bool _batchOpen = false;
  String? _scanId;
  String? _requestId;
  DateTime? _shutterAt;
  DateTime? _cardShutterAt;
  int _retakes = 0;
  String? _cardAttemptId;
  bool _needsRetake = false;
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
    _cameraSession = ScannerCameraSession<CameraController>(
      create: _createCamera,
      release: (camera) => camera.dispose(),
    );
    _cameraFuture = _cameraSession.resume();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_cameraSession.close().catchError((Object _) {}));
    _identityService.dispose();
    unawaited(SystemChrome.setPreferredOrientations(DeviceOrientation.values));
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_batchOpen) return;
      _cameraFuture = _cameraSession.resume();
      if (mounted) setState(() {});
    } else if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      unawaited(_cameraSession.suspend().catchError((Object _) {}));
      if (mounted) setState(() {});
    }
  }

  Future<CameraController> _createCamera() async {
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
        return controller;
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
        _pickingPhoto ||
        _addingToVault ||
        controller == null ||
        !controller.value.isInitialized ||
        controller.value.isTakingPicture) {
      return;
    }
    final viewport = _previewViewportSize ?? MediaQuery.sizeOf(context);
    await _identify(() async {
      await _prepareStill(controller);
      final picture = await controller.takePicture();
      try {
        return await _prepareUploadBytes(
          await File(picture.path).readAsBytes(),
          viewportSize: viewport,
        );
      } finally {
        unawaited(_deleteTemporaryCapture(picture.path));
      }
    }, source: 'live_camera');
  }

  Future<void> _pickPhotoAndIdentify() async {
    if (_capturing || _addingToVault || _pickingPhoto) return;
    setState(() => _pickingPhoto = true);
    try {
      final picked = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 100,
        requestFullMetadata: false,
      );
      if (!mounted || picked == null) return;
      await _identify(
        () async => compute(prepareScannerUpload, <String, Object>{
          'bytes': await File(picked.path).readAsBytes(),
          'maxDimension': widget.multipleCards ? 2400 : 1200,
        }),
        source: 'photo_library',
      );
    } catch (error) {
      if (mounted) {
        _showScanNotice(
          'Could not open photo',
          'Allow photo access or choose another image.',
        );
      }
    } finally {
      if (mounted) setState(() => _pickingPhoto = false);
    }
  }

  Future<void> _identify(
    Future<Uint8List> Function() prepare, {
    required String source,
  }) async {
    if (!mounted) return;
    _shutterAt = DateTime.now().toUtc();
    _scanId = '${_sessionId}_${_shutterAt!.microsecondsSinceEpoch}';
    _cardAttemptId ??= _scanId;
    _cardShutterAt ??= _shutterAt;
    if (_needsRetake) _retakes += 1;
    _needsRetake = false;
    _requestId = null;
    setState(() {
      _capturing = true;
      _result = null;
      _toastTitle = null;
      _toastMessage = null;
      _frozenUploadBytes = null;
      _showExactAlternates = false;
    });
    try {
      unawaited(HapticFeedback.mediumImpact());
      final bytes = await prepare();
      if (!mounted) return;
      if (widget.onBatchCapture != null) {
        await widget.onBatchCapture!(bytes);
        if (!mounted) return;
        setState(() {
          _capturing = false;
          _frozenUploadBytes = null;
          _toastTitle = 'Added to scan queue';
          _toastMessage = 'Keep scanning. Review the batch when ready.';
        });
        return;
      }
      setState(() => _frozenUploadBytes = bytes);
      final result = await _identityService.identify(bytes);
      _requestId = result.requestId;
      await _appendSessionLog(result, source: source);
      if (!mounted) return;
      final hasCandidates = result.ok && result.candidates.isNotEmpty;
      setState(() {
        _result = hasCandidates ? result : null;
        _capturing = false;
        if (!hasCandidates) {
          _needsRetake = true;
          _frozenUploadBytes = null;
          _toastTitle = "Couldn't read this card";
          _toastMessage =
              result.retakeHint ?? 'Try another clear photo of the full card.';
        }
      });
      unawaited(HapticFeedback.selectionClick());
    } catch (error) {
      await _appendIdentifyErrorLog(error, source: source);
      if (!mounted) return;
      final copy = scannerV5UserFacingError(error);
      _needsRetake = true;
      setState(() {
        _capturing = false;
        _result = null;
        _frozenUploadBytes = null;
        _toastTitle = copy.title;
        _toastMessage = copy.message;
      });
    }
  }

  Future<void> _openBatchIntake() async {
    if (_capturing || widget.onStartBatch == null) return;
    _batchOpen = true;
    try {
      await _cameraSession.suspend();
      await widget.onStartBatch!();
    } finally {
      _batchOpen = false;
      if (mounted) {
        _cameraFuture = _cameraSession.resume();
        setState(() {});
      }
    }
  }

  Future<void> _openSavedCopy(String gvviId) async {
    if (_batchOpen || !mounted) return;
    _batchOpen = true;
    try {
      await _cameraSession.suspend();
      if (!mounted) return;
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => VaultManageCardScreen(gvviId: gvviId),
        ),
      );
    } finally {
      _batchOpen = false;
      if (mounted) {
        _cameraFuture = _cameraSession.resume();
        setState(() {});
      }
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
    if (widget.multipleCards) {
      return compute(prepareScannerUpload, <String, Object>{
        'bytes': rawBytes,
        'maxDimension': 2200,
      });
    }
    final guide = _ScannerV5GuideGeometry.frameForSize(viewportSize);
    return compute(prepareScannerUpload, <String, Object>{
      'bytes': rawBytes,
      'viewport': <double>[viewportSize.width, viewportSize.height],
      'guide': <double>[
        guide.left / viewportSize.width,
        guide.top / viewportSize.height,
        guide.width / viewportSize.width,
        guide.height / viewportSize.height,
      ],
    });
  }

  Map<String, dynamic> _scanEvent(String type) => <String, dynamic>{
    'event_type': type,
    'ts': DateTime.now().toUtc().toIso8601String(),
    'session_id': _sessionId,
    'scan_id': _scanId,
    'card_attempt_id': _cardAttemptId,
    'request_id': _requestId,
    'shutter_at': _cardShutterAt?.toIso8601String(),
    'attempt_shutter_at': _shutterAt?.toIso8601String(),
    'retakes': _retakes,
    'endpoint': _identityService.endpoint,
  };

  Future<void> _appendSessionLog(
    ScannerV5IdentifyResult result, {
    String source = 'live_camera',
  }) => ScannerSessionLog.append({
    ..._scanEvent('scanner_v5_identify_result'),
    'source': source,
    'result': result.toSessionJson(),
  });

  Future<void> _appendIdentifyErrorLog(
    Object error, {
    String source = 'live_camera',
  }) => ScannerSessionLog.append({
    ..._scanEvent('scanner_v5_identify_error'),
    'source': source,
    'error_type': scannerV5ErrorType(error),
    'http_status': error is ScannerV5HttpException ? error.statusCode : null,
  });

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
    final confirmedAt = DateTime.now().toUtc();
    final resultSnapshot = _result;
    try {
      final savedGvvi = await showVaultAddReview(
        context: context,
        cardPrintId: cardPrintId,
        gvId: candidate.gvId ?? '',
        name: candidate.name,
        setName: candidate.setCode ?? '',
        imageUrl: candidate.imageUrl,
      );
      if (savedGvvi == null) return;
      await commitScannerVaultAdd<String>(
        commit: () async => savedGvvi,
        afterCommit: (gvviId) async {
          await _appendConfirmationLog(
            candidate: candidate,
            gvviId: gvviId,
            confirmedAt: confirmedAt,
            result: resultSnapshot,
          );
          unawaited(
            _emitScannerV5VaultAddEnriched(
              userId: userId,
              candidate: candidate,
              gvviId: gvviId,
              result: resultSnapshot,
            ),
          );
        },
      );
      unawaited(
        OnboardingLadderService.recordOwnedBestEffort(
          client: Supabase.instance.client,
          cardPrintId: cardPrintId,
          source: 'scan',
        ),
      );
      if (!mounted) return;
      unawaited(HapticFeedback.heavyImpact());
      setState(() => _addingToVault = false);
      _resetToLiveScanner();
      _retakes = 0;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${candidate.name} saved to your Vault.'),
          action: SnackBarAction(
            label: 'View copy',
            onPressed: () => unawaited(_openSavedCopy(savedGvvi)),
          ),
        ),
      );
    } on JungleEditionSelectionRequired catch (error) {
      if (!mounted) return;
      await reviewScannedJungleEdition(context, error.resolution);
    } on JungleEditionWriteFailure catch (error) {
      if (!mounted) return;
      _showScanNotice('Edition needs review', error.message);
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
    required DateTime confirmedAt,
    required ScannerV5IdentifyResult? result,
  }) async {
    final candidates = result?.candidates ?? const <ScannerV5Candidate>[];
    final confirmedRank =
        candidates.indexWhere(
          (row) => row.vaultCardPrintId == candidate.vaultCardPrintId,
        ) +
        1;
    final payload = <String, dynamic>{
      ..._scanEvent('scanner_v5_scan/card'),
      'confirmed_at': confirmedAt.toIso8601String(),
      'confirmed_gv_id': candidate.gvId,
      'confirmed_card_id': candidate.vaultCardPrintId,
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
    await ScannerSessionLog.append(payload);
  }

  Future<void> _emitScannerV5VaultAddEnriched({
    required String userId,
    required ScannerV5Candidate candidate,
    required String gvviId,
    required ScannerV5IdentifyResult? result,
  }) async {
    final candidates = result?.candidates ?? const <ScannerV5Candidate>[];
    final confirmedRank =
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
    if (_result != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$title: $message')));
      return;
    }
    setState(() {
      _toastTitle = title;
      _toastMessage = message;
    });
  }

  void _resetToLiveScanner() {
    if (!mounted || _addingToVault) return;
    _retakes = 0;
    _cardAttemptId = null;
    _cardShutterAt = null;
    _needsRetake = false;
    setState(() {
      _capturing = false;
      _result = null;
      _frozenUploadBytes = null;
      _showExactAlternates = false;
      _toastTitle = null;
      _toastMessage = null;
    });
  }

  void _retake() {
    if (_addingToVault) return;
    final attempt = _cardAttemptId;
    final firstShutter = _cardShutterAt;
    final retakes = _retakes + 1;
    _resetToLiveScanner();
    _cardAttemptId = attempt;
    _cardShutterAt = firstShutter;
    _retakes = retakes;
  }

  Future<void> _exportSessionLog() async {
    try {
      final log = await ScannerSessionLog.export();
      if (!mounted) return;
      await SharePlus.instance.share(
        ShareParams(
          text: log,
          subject: 'Scanner V5 session log',
          sharePositionOrigin: const Rect.fromLTWH(16, 60, 48, 48),
        ),
      );
    } catch (_) {
      if (mounted) {
        _showScanNotice('Could not export log', 'Try again in a moment.');
      }
    }
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

  void _popToVault() {
    if (_addingToVault) return;
    Navigator.of(context).pop(ScanCaptureV5Exit.vault);
  }

  @override
  Widget build(BuildContext context) {
    final endpointNotConfigured = scannerV5EndpointNotConfiguredForDevice(
      endpoint: _identityService.endpoint,
      isPhysicalDevice: Platform.isAndroid || Platform.isIOS,
    );
    return PopScope(
      canPop: !_addingToVault,
      child: Scaffold(
        backgroundColor: ScannerV5Palette.bg,
        extendBodyBehindAppBar: true,
        body: FutureBuilder<void>(
          future: _cameraFuture,
          builder: (context, snapshot) {
            final controller = _controller;
            final cameraReady =
                controller != null && controller.value.isInitialized;
            return LayoutBuilder(
              builder: (context, constraints) {
                final viewportSize = Size(
                  constraints.maxWidth,
                  constraints.maxHeight,
                );
                _previewViewportSize = viewportSize;
                final frame = _ScannerV5GuideGeometry.frameForSize(
                  viewportSize,
                );
                final previewSize = cameraReady
                    ? controller.value.previewSize
                    : null;
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
                    else if (cameraReady)
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
                    if (!hasFrozenFrame && !cameraReady)
                      Positioned.fill(
                        child: snapshot.connectionState != ConnectionState.done
                            ? const Center(child: CircularProgressIndicator())
                            : _ScannerV5Message(
                                title: 'Camera unavailable',
                                message:
                                    'Allow camera access in Settings, retry, or use Photos below.',
                                actionLabel: 'Try again',
                                onAction: () {
                                  _cameraFuture = _cameraSession.resume();
                                  setState(() {});
                                },
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
                      onStartBatch: widget.onStartBatch == null
                          ? null
                          : () => unawaited(_openBatchIntake()),
                      multipleCards: widget.multipleCards,
                      vaultLabel: widget.onBatchCapture == null
                          ? 'Vault'
                          : 'Review ${widget.batchCount}',
                      flashEnabled: _flashEnabled,
                      captureEnabled:
                          !endpointNotConfigured &&
                          cameraReady &&
                          !_pickingPhoto &&
                          !_capturing &&
                          !_addingToVault,
                      identifying: _capturing,
                      toastTitle: _toastTitle,
                      toastMessage: _toastMessage,
                      onClose: () {
                        if (!_addingToVault) Navigator.of(context).maybePop();
                      },
                      onFlashToggle: _toggleFlash,
                      onCapture: _captureAndIdentify,
                      onPhotos: _pickPhotoAndIdentify,
                      onVault: widget.onBatchCapture == null
                          ? _popToVault
                          : () => Navigator.of(context).pop(),
                      onExportLog: _exportSessionLog,
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
                        onRetake: _retake,
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
      ),
    );
  }
}

String scannerV5ErrorType(Object error) {
  if (error is ScannerV5SecureConnectionException) return 'tls';
  if (error is TimeoutException) return 'timeout';
  if (error is ScannerV5UnreachableException) return 'unreachable';
  if (error is ScannerV5HttpException) return 'http';
  if (error is ScannerV5ProtocolException) return 'protocol';
  return error.runtimeType.toString();
}

@visibleForTesting
Uint8List scannerV5PrepareImportedPhotoForUpload(Uint8List rawBytes) {
  return prepareScannerUpload(<String, Object>{'bytes': rawBytes});
}

@visibleForTesting
img.Image scannerV5ResizeForUpload(img.Image source) =>
    resizeScannerUpload(source);

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
