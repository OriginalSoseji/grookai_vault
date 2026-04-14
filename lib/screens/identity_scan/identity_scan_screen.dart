import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart' as picker;

import '../../services/identity/identity_scan_service.dart';
import '../../services/scanner/native_quad_detector.dart';
import '../../services/vault/vault_card_service.dart';
import '../../widgets/scanner/identity_scanner_bottom_panel.dart';
import '../../widgets/scanner/identity_scanner_overlay.dart';
import 'identity_scanner_ui_mapper.dart';

enum _IdentityScannerSurfaceMode { live, processing, result }

class IdentityScanScreen extends StatefulWidget {
  const IdentityScanScreen({
    super.key,
    this.autoStart = false,
    this.initialFrontFile,
  });

  final bool autoStart;
  final XFile? initialFrontFile;

  @override
  State<IdentityScanScreen> createState() => _IdentityScanScreenState();
}

class _IdentityScanScreenState extends State<IdentityScanScreen> {
  static const int _autoLockFrameThreshold = 3;
  static const double _quadDistanceThreshold = 0.03;
  static const double _moveCloserCoverageThreshold = 0.18;
  static const double _holdSteadyTiltThreshold = 3.2;

  final IdentityScanService _service = IdentityScanService();
  final picker.ImagePicker _picker = picker.ImagePicker();
  final NativeQuadDetector _quadDetector = NativeQuadDetector();
  final GlobalKey _previewAreaKey = GlobalKey();

  CameraController? _controller;
  StreamSubscription<AccelerometerEvent>? _accelSub;

  _IdentityScannerSurfaceMode _surfaceMode = _IdentityScannerSurfaceMode.live;
  XFile? _front;
  IdentityScanPollResult? _scanResult;
  String? _eventId;
  String? _snapshotId;
  String? _cameraError;
  String? _inlineError;

  bool _cameraInitializing = false;
  bool _cameraReady = false;
  bool _streaming = false;
  bool _takingPicture = false;
  bool _submitting = false;
  bool _addingToVault = false;
  bool _submittingCatalog = false;
  bool _submittedCatalog = false;
  bool _focusApisReady = false;
  bool _didLogInitFocusModeError = false;
  bool _didLogInitExposureModeError = false;
  bool _didLogTapFocusError = false;
  bool _didLogTapExposureError = false;

  List<Offset>? _quadPoints;
  List<Offset>? _lastQuadSample;
  Offset? _lastFocusTapNorm;
  DateTime _lastFocusTapAt = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastQuadUpdate = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastAutoCaptureAt = DateTime.fromMillisecondsSinceEpoch(0);
  int _stableQuadFrames = 0;
  double _tiltMagnitude = 0;

  int _selectedCandidateIndex = 0;
  String? _resolvedCandidateId;

  bool get _hasRealEventId {
    final id = _eventId;
    return id != null && id.isNotEmpty;
  }

  bool get _isLiveMode => _surfaceMode == _IdentityScannerSurfaceMode.live;

  bool get _isBusy =>
      _cameraInitializing ||
      _takingPicture ||
      _submitting ||
      _addingToVault ||
      _submittingCatalog;

  List<IdentityScanCandidate> get _candidates =>
      _scanResult?.candidates ?? const <IdentityScanCandidate>[];

  IdentityScanCandidate? get _topCandidate => _scanResult?.topCandidate;

  IdentityScanCandidate? get _selectedCandidate {
    if (_candidates.isEmpty) {
      return null;
    }
    if (_selectedCandidateIndex < 0 ||
        _selectedCandidateIndex >= _candidates.length) {
      return _candidates.first;
    }
    return _candidates[_selectedCandidateIndex];
  }

  IdentityScanCandidate? get _resolvedCandidate {
    if (_resolvedCandidateId != null && _resolvedCandidateId!.isEmpty) {
      return _selectedCandidate;
    }
    if (_resolvedCandidateId != null && _resolvedCandidateId!.isNotEmpty) {
      for (final candidate in _candidates) {
        if (candidate.cardPrintId == _resolvedCandidateId) {
          return candidate;
        }
      }
    }
    if (_candidates.length == 1) {
      return _candidates.first;
    }
    return null;
  }

  String? get _localGuidanceText {
    if (_cameraError != null && _cameraError!.trim().isNotEmpty) {
      return _cameraError;
    }
    if (!_isLiveMode) {
      return null;
    }
    if (_tiltMagnitude >= _holdSteadyTiltThreshold) {
      return 'Hold steady';
    }
    final quadPoints = _quadPoints;
    if (quadPoints != null &&
        _quadCoverage(quadPoints) < _moveCloserCoverageThreshold) {
      return 'Move closer';
    }
    return null;
  }

  ScannerPresentationState get _presentation {
    return IdentityScannerUiMapper.map(
      backendResult: _scanResult,
      resolvedCandidate: _resolvedCandidate,
      topCandidate: _topCandidate,
      local: ScannerLocalFallbackState(
        cameraReady: _cameraReady,
        isLiveCamera: _isLiveMode,
        isProcessingCapture:
            _surfaceMode == _IdentityScannerSurfaceMode.processing ||
            _takingPicture ||
            _submitting,
        cardDetected: _quadPoints != null,
        isLocked:
            _isLiveMode &&
            _quadPoints != null &&
            _stableQuadFrames >= _autoLockFrameThreshold,
        guidanceText: _localGuidanceText,
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    if (widget.initialFrontFile != null) {
      _front = widget.initialFrontFile;
      _surfaceMode = _IdentityScannerSurfaceMode.processing;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || _front == null) {
          return;
        }
        unawaited(_startScan(_front!));
      });
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      unawaited(_initCamera());
    });
  }

  @override
  void dispose() {
    final controller = _controller;
    _controller = null;
    _streaming = false;
    unawaited(_accelSub?.cancel());
    unawaited(_stopImageStream());
    unawaited(controller?.dispose());
    super.dispose();
  }

  void _snack(String message) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _initCamera() async {
    if (_cameraInitializing || (_controller?.value.isInitialized ?? false)) {
      return;
    }

    _cameraInitializing = true;
    if (mounted) {
      setState(() {
        _cameraError = null;
      });
    }

    try {
      final cameras = await availableCameras();
      CameraDescription? backCamera;
      for (final camera in cameras) {
        if (camera.lensDirection == CameraLensDirection.back) {
          backCamera = camera;
          break;
        }
      }
      backCamera ??= cameras.isNotEmpty ? cameras.first : null;
      if (backCamera == null) {
        throw Exception('Camera not available on this device.');
      }

      final controller = CameraController(
        backCamera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.yuv420,
      );
      await controller.initialize();
      try {
        await controller.setFlashMode(FlashMode.off);
      } catch (_) {}
      try {
        await controller.setFocusMode(FocusMode.auto);
      } catch (error) {
        if (kDebugMode && !_didLogInitFocusModeError) {
          debugPrint('[identity-scan] setFocusMode(auto) skipped: $error');
          _didLogInitFocusModeError = true;
        }
      }
      try {
        await controller.setExposureMode(ExposureMode.auto);
      } catch (error) {
        if (kDebugMode && !_didLogInitExposureModeError) {
          debugPrint('[identity-scan] setExposureMode(auto) skipped: $error');
          _didLogInitExposureModeError = true;
        }
      }

      _controller = controller;
      _focusApisReady = true;
      _cameraReady = true;
      _cameraError = null;
      _startSensors();
      await _startStream();
    } catch (error) {
      _cameraReady = false;
      _cameraError =
          'Camera unavailable on this device. Choose a photo instead.';
      if (kDebugMode) {
        debugPrint('[identity-scan] camera init failed: $error');
      }
    } finally {
      _cameraInitializing = false;
      if (mounted) {
        setState(() {});
      }
    }
  }

  void _startSensors() {
    _accelSub ??= accelerometerEventStream().listen((event) {
      if (!_isLiveMode) {
        return;
      }
      final magnitude = math.sqrt(event.x * event.x + event.y * event.y);
      if (!mounted) {
        return;
      }
      setState(() {
        _tiltMagnitude = magnitude;
      });
    });
  }

  Future<void> _startStream() async {
    final controller = _controller;
    if (controller == null || _streaming || !controller.value.isInitialized) {
      return;
    }

    _streaming = true;
    await controller.startImageStream((image) async {
      if (!_isLiveMode || _takingPicture || _submitting) {
        return;
      }

      final now = DateTime.now();
      if (now.difference(_lastQuadUpdate).inMilliseconds < 180) {
        return;
      }
      _lastQuadUpdate = now;

      final rotation = controller.description.sensorOrientation;
      final quad = await _quadDetector.detect(image, rotation);
      if (!mounted || !_isLiveMode) {
        return;
      }

      final detectedPoints = _quadPointsFromResult(quad);
      final stableNow = _isStableWithPrevious(detectedPoints);
      if (detectedPoints == null) {
        setState(() {
          _quadPoints = null;
          _lastQuadSample = null;
          _stableQuadFrames = 0;
        });
        return;
      }

      final nextStableFrames = stableNow ? _stableQuadFrames + 1 : 1;
      final shouldAutoCapture =
          nextStableFrames >= _autoLockFrameThreshold &&
          _tiltMagnitude < _holdSteadyTiltThreshold &&
          now.difference(_lastAutoCaptureAt).inMilliseconds > 1800;

      setState(() {
        _quadPoints = detectedPoints;
        _lastQuadSample = detectedPoints;
        _stableQuadFrames = nextStableFrames;
      });

      if (shouldAutoCapture) {
        _lastAutoCaptureAt = now;
        unawaited(_captureFromLiveCamera(autoTriggered: true));
      }
    });
  }

  Future<void> _stopImageStream() async {
    final controller = _controller;
    if (controller == null || !_streaming) {
      return;
    }
    try {
      await controller.stopImageStream();
    } catch (_) {
      // Best effort. Some platforms throw when the stream is already stopped.
    } finally {
      _streaming = false;
    }
  }

  Future<void> _handlePreviewTap(TapDownDetails details) async {
    final controller = _controller;
    if (!_isLiveMode || controller == null || !controller.value.isInitialized) {
      return;
    }

    final context = _previewAreaKey.currentContext;
    final renderObject = context?.findRenderObject();
    if (renderObject is! RenderBox || !renderObject.hasSize) {
      return;
    }

    final size = renderObject.size;
    if (size.width <= 0 || size.height <= 0) {
      return;
    }

    final local = renderObject.globalToLocal(details.globalPosition);
    final nx = (local.dx / size.width).clamp(0.0, 1.0).toDouble();
    final ny = (local.dy / size.height).clamp(0.0, 1.0).toDouble();
    final norm = Offset(nx, ny);
    final tapAt = DateTime.now();

    setState(() {
      _lastFocusTapNorm = norm;
      _lastFocusTapAt = tapAt;
    });

    Future<void>.delayed(const Duration(milliseconds: 650), () {
      if (!mounted || _lastFocusTapAt != tapAt) {
        return;
      }
      setState(() {
        _lastFocusTapNorm = null;
      });
    });

    if (controller.value.focusPointSupported) {
      try {
        await controller.setFocusPoint(norm);
      } catch (error) {
        if (kDebugMode && !_didLogTapFocusError && _focusApisReady) {
          debugPrint('[identity-scan] setFocusPoint skipped: $error');
          _didLogTapFocusError = true;
        }
      }
    }

    if (controller.value.exposurePointSupported) {
      try {
        await controller.setExposurePoint(norm);
      } catch (error) {
        if (kDebugMode && !_didLogTapExposureError && _focusApisReady) {
          debugPrint('[identity-scan] setExposurePoint skipped: $error');
          _didLogTapExposureError = true;
        }
      }
    }
  }

  Future<void> _captureFromLiveCamera({bool autoTriggered = false}) async {
    final controller = _controller;
    if (!_isLiveMode ||
        controller == null ||
        !controller.value.isInitialized ||
        _takingPicture) {
      return;
    }

    setState(() {
      _takingPicture = true;
      _inlineError = null;
      _resolvedCandidateId = null;
    });

    final wasStreaming = _streaming;
    try {
      await _stopImageStream();
      final file = await controller.takePicture();
      if (!mounted) {
        return;
      }
      setState(() {
        _front = file;
        _surfaceMode = _IdentityScannerSurfaceMode.processing;
        _takingPicture = false;
        if (!autoTriggered) {
          _lastAutoCaptureAt = DateTime.now();
        }
      });
      await _startScan(file);
    } catch (error) {
      if (!mounted) {
        return;
      }
      if (wasStreaming) {
        unawaited(_startStream());
      }
      setState(() {
        _takingPicture = false;
        _inlineError = 'Capture failed. Try again.';
      });
      _snack('Capture failed. Try again.');
      if (kDebugMode) {
        debugPrint('[identity-scan] capture failed: $error');
      }
    }
  }

  Future<void> _pickFromGallery() async {
    final file = await _picker.pickImage(
      source: picker.ImageSource.gallery,
      imageQuality: 92,
    );
    if (file == null || !mounted) {
      return;
    }
    await _stopImageStream();
    setState(() {
      _front = file;
      _surfaceMode = _IdentityScannerSurfaceMode.processing;
      _inlineError = null;
      _resolvedCandidateId = null;
    });
    await _startScan(file);
  }

  Future<void> _startScan(XFile frontFile) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      _snack('Please sign in.');
      return;
    }

    setState(() {
      _submitting = true;
      _surfaceMode = _IdentityScannerSurfaceMode.processing;
      _scanResult = null;
      _eventId = null;
      _snapshotId = null;
      _inlineError = null;
      _selectedCandidateIndex = 0;
      _resolvedCandidateId = null;
      _submittedCatalog = false;
      _submittingCatalog = false;
    });

    try {
      final start = await _service.startScan(frontFile: frontFile);
      if (!mounted) {
        return;
      }
      setState(() {
        _eventId = start.eventId;
        _snapshotId = start.snapshotId;
      });
      await _pollUntilDone(start.eventId);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _scanResult = IdentityScanPollResult(
          status: 'failed',
          eventId: _eventId ?? '',
          snapshotId: _snapshotId ?? '',
          error: error.toString(),
        );
        _inlineError = error.toString();
        _surfaceMode = _IdentityScannerSurfaceMode.result;
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  Future<void> _pollUntilDone(String eventId) async {
    const maxAttempts = 30;
    for (var attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!mounted) {
        return;
      }

      try {
        final result = await _service.pollOnce(eventId);
        if (!mounted) {
          return;
        }
        setState(() {
          _scanResult = result;
          if (result.snapshotId.isNotEmpty) {
            _snapshotId = result.snapshotId;
          }
        });

        if (result.isReady || result.isFailed) {
          setState(() {
            _surfaceMode = _IdentityScannerSurfaceMode.result;
            if (result.candidates.length == 1) {
              _resolvedCandidateId = result.candidates.first.cardPrintId;
            }
          });
          return;
        }
      } catch (error) {
        if (kDebugMode) {
          debugPrint('[identity-scan] poll failed: $error');
        }
      }

      await Future<void>.delayed(const Duration(seconds: 1));
    }

    if (!mounted) {
      return;
    }
    setState(() {
      _scanResult = IdentityScanPollResult(
        status: 'failed',
        eventId: eventId,
        snapshotId: _snapshotId ?? '',
        error: 'Timed out waiting for identification.',
      );
      _inlineError = 'Timed out waiting for identification.';
      _surfaceMode = _IdentityScannerSurfaceMode.result;
    });
  }

  Future<void> _addToVault() async {
    final candidate = _resolvedCandidate ?? _selectedCandidate ?? _topCandidate;
    if (candidate == null) {
      _snack('No card is ready to add yet.');
      return;
    }
    final cardId = candidate.cardPrintId;
    if (cardId == null || cardId.isEmpty) {
      _snack('This match is missing its card id.');
      return;
    }

    setState(() {
      _addingToVault = true;
    });

    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null || userId.isEmpty) {
        throw Exception('auth_required');
      }
      await VaultCardService.addOrIncrementVaultItem(
        client: Supabase.instance.client,
        userId: userId,
        cardId: cardId,
        deltaQty: 1,
        conditionLabel: 'NM',
        fallbackName: candidate.name,
        fallbackSetName: candidate.setName ?? candidate.setCode,
        fallbackImageUrl: candidate.imageUrl,
      );
      if (!mounted) {
        return;
      }
      _snack('Added to Vault.');
    } catch (error) {
      _snack('Add to Vault failed: $error');
    } finally {
      if (mounted) {
        setState(() {
          _addingToVault = false;
        });
      }
    }
  }

  Future<void> _submitToCatalog() async {
    if (_submittingCatalog || _submittedCatalog) {
      return;
    }
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      _snack('Please sign in to submit.');
      return;
    }
    if (!_hasRealEventId) {
      _snack('Missing event ID.');
      return;
    }

    setState(() {
      _submittingCatalog = true;
    });

    try {
      final payload = <String, dynamic>{
        'identity_scan_event_id': _eventId,
        'signals': _scanResult?.signalsRaw ?? <String, dynamic>{},
      };
      if (_snapshotId != null && _snapshotId!.isNotEmpty) {
        payload['identity_snapshot_id'] = _snapshotId;
      }
      await Supabase.instance.client
          .from('catalog_submissions_v1')
          .insert(payload);
      if (!mounted) {
        return;
      }
      setState(() {
        _submittedCatalog = true;
      });
      _snack('Submitted for review.');
    } catch (error) {
      _snack('Submission failed: $error');
    } finally {
      if (mounted) {
        setState(() {
          _submittingCatalog = false;
        });
      }
    }
  }

  Future<void> _showCandidateChooser() async {
    if (_candidates.isEmpty) {
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF0F1216),
      isScrollControlled: true,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Review matches',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Choose the print that best matches the card in frame.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 16),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _candidates.length,
                    separatorBuilder: (context, index) => Divider(
                      color: Colors.white.withValues(alpha: 0.08),
                      height: 1,
                    ),
                    itemBuilder: (context, index) {
                      final candidate = _candidates[index];
                      final selected =
                          candidate.cardPrintId == _resolvedCandidateId;
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading:
                            candidate.imageUrl == null ||
                                candidate.imageUrl!.isEmpty
                            ? CircleAvatar(
                                backgroundColor: Colors.white.withValues(
                                  alpha: 0.08,
                                ),
                                child: Icon(
                                  Icons.style_rounded,
                                  color: Colors.white.withValues(alpha: 0.8),
                                ),
                              )
                            : ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  candidate.imageUrl!,
                                  width: 48,
                                  height: 68,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) =>
                                      Container(
                                        width: 48,
                                        height: 68,
                                        color: Colors.white.withValues(
                                          alpha: 0.08,
                                        ),
                                        alignment: Alignment.center,
                                        child: Icon(
                                          Icons.style_rounded,
                                          color: Colors.white.withValues(
                                            alpha: 0.8,
                                          ),
                                        ),
                                      ),
                                ),
                              ),
                        title: Text(
                          candidate.name ?? 'Candidate',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: Text(
                          [
                                candidate.setName ?? candidate.setCode,
                                if (candidate.number != null &&
                                    candidate.number!.isNotEmpty)
                                  '#${candidate.number}',
                              ]
                              .whereType<String>()
                              .where((part) => part.trim().isNotEmpty)
                              .join(' • '),
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.68),
                          ),
                        ),
                        trailing: Icon(
                          selected
                              ? Icons.radio_button_checked
                              : Icons.radio_button_off,
                          color: selected
                              ? const Color(0xFF8EF0B0)
                              : Colors.white54,
                        ),
                        onTap: () {
                          setState(() {
                            _selectedCandidateIndex = index;
                            _resolvedCandidateId = candidate.cardPrintId ?? '';
                          });
                          Navigator.of(context).pop();
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _resetScanner() async {
    await _stopImageStream();
    if (!mounted) {
      return;
    }
    setState(() {
      _surfaceMode = _IdentityScannerSurfaceMode.live;
      _front = null;
      _scanResult = null;
      _eventId = null;
      _snapshotId = null;
      _inlineError = null;
      _quadPoints = null;
      _lastQuadSample = null;
      _stableQuadFrames = 0;
      _selectedCandidateIndex = 0;
      _resolvedCandidateId = null;
      _submittedCatalog = false;
      _submittingCatalog = false;
    });
    if (_controller == null || !(_controller!.value.isInitialized)) {
      await _initCamera();
      return;
    }
    await _startStream();
  }

  List<Offset>? _quadPointsFromResult(Map<String, dynamic>? quad) {
    if (quad == null) {
      return null;
    }
    final rawPoints = quad['points_norm'];
    if (rawPoints is! List || rawPoints.length != 4) {
      return null;
    }
    final points = rawPoints
        .map(_normalizedOffsetFromRawPoint)
        .whereType<Offset>()
        .toList();
    return points.length == 4 ? points : null;
  }

  Offset? _normalizedOffsetFromRawPoint(dynamic rawPoint) {
    if (rawPoint is! List || rawPoint.length < 2) {
      return null;
    }
    final x = rawPoint[0];
    final y = rawPoint[1];
    if (x is! num || y is! num) {
      return null;
    }
    return Offset(x.toDouble(), y.toDouble());
  }

  bool _isStableWithPrevious(List<Offset>? nextPoints) {
    final previous = _lastQuadSample;
    if (nextPoints == null ||
        previous == null ||
        previous.length != nextPoints.length) {
      return false;
    }
    return _averageQuadDistance(previous, nextPoints) <= _quadDistanceThreshold;
  }

  double _averageQuadDistance(List<Offset> a, List<Offset> b) {
    if (a.length != b.length || a.isEmpty) {
      return double.infinity;
    }
    var total = 0.0;
    for (var i = 0; i < a.length; i += 1) {
      total += (a[i] - b[i]).distance;
    }
    return total / a.length;
  }

  double _quadCoverage(List<Offset> points) {
    if (points.length != 4) {
      return 0;
    }
    final dxs = points.map((point) => point.dx).toList();
    final dys = points.map((point) => point.dy).toList();
    final width = dxs.reduce(math.max) - dxs.reduce(math.min);
    final height = dys.reduce(math.max) - dys.reduce(math.min);
    return width * height;
  }

  Rect _buildGuideRect(Size size, EdgeInsets safePadding) {
    const horizontalPadding = 22.0;
    const extraTopOffset = 56.0;
    const estimatedBottomPanelHeight = 222.0;
    final maxWidth = size.width - horizontalPadding * 2;
    final reservedTop = safePadding.top + extraTopOffset;
    final reservedBottom = safePadding.bottom + estimatedBottomPanelHeight;
    final maxHeight = math.max(
      220.0,
      size.height - reservedTop - reservedBottom,
    );

    var guideWidth = maxWidth;
    var guideHeight = guideWidth / 0.716;
    if (guideHeight > maxHeight) {
      guideHeight = maxHeight;
      guideWidth = guideHeight * 0.716;
    }

    final left = (size.width - guideWidth) / 2;
    final top = reservedTop + math.max(0.0, (maxHeight - guideHeight) * 0.32);
    return Rect.fromLTWH(left, top, guideWidth, guideHeight);
  }

  Color _accentForState(ScannerUiState state, ColorScheme colorScheme) {
    switch (state) {
      case ScannerUiState.exact:
        return const Color(0xFF8EF0B0);
      case ScannerUiState.locked:
        return const Color(0xFFFFD97A);
      case ScannerUiState.preview:
        return const Color(0xFF92C9FF);
      case ScannerUiState.insufficientEvidence:
        return const Color(0xFFFFB07A);
      case ScannerUiState.guidance:
        return const Color(0xFFFFD97A);
      case ScannerUiState.detecting:
      case ScannerUiState.idle:
        return colorScheme.primary;
    }
  }

  String? _primaryActionLabel(ScannerPresentationState presentation) {
    if (_isBusy && presentation.state != ScannerUiState.locked) {
      return null;
    }

    switch (presentation.state) {
      case ScannerUiState.exact:
        return 'Add to Vault';
      case ScannerUiState.preview:
        if (_candidates.length > 1) {
          return 'Review matches';
        }
        if (_hasRealEventId && !_submittedCatalog) {
          return 'Submit for review';
        }
        return 'Scan again';
      case ScannerUiState.insufficientEvidence:
        if (_hasRealEventId && !_submittedCatalog) {
          return 'Submit for review';
        }
        return 'Scan again';
      case ScannerUiState.guidance:
      case ScannerUiState.detecting:
      case ScannerUiState.idle:
        if (_isLiveMode && _cameraReady) {
          return 'Capture now';
        }
        return 'Choose photo';
      case ScannerUiState.locked:
        return null;
    }
  }

  VoidCallback? _primaryAction(ScannerPresentationState presentation) {
    if (_isBusy && presentation.state != ScannerUiState.locked) {
      return null;
    }

    switch (presentation.state) {
      case ScannerUiState.exact:
        return _addToVault;
      case ScannerUiState.preview:
        if (_candidates.length > 1) {
          return () {
            unawaited(_showCandidateChooser());
          };
        }
        if (_hasRealEventId && !_submittedCatalog) {
          return _submitToCatalog;
        }
        return () {
          unawaited(_resetScanner());
        };
      case ScannerUiState.insufficientEvidence:
        if (_hasRealEventId && !_submittedCatalog) {
          return _submitToCatalog;
        }
        return () {
          unawaited(_resetScanner());
        };
      case ScannerUiState.guidance:
      case ScannerUiState.detecting:
      case ScannerUiState.idle:
        if (_isLiveMode && _cameraReady) {
          return () {
            unawaited(_captureFromLiveCamera());
          };
        }
        return () {
          unawaited(_pickFromGallery());
        };
      case ScannerUiState.locked:
        return null;
    }
  }

  Widget _buildPreviewSurface() {
    final controller = _controller;
    if (_front != null) {
      return SizedBox.expand(
        child: Image.file(
          File(_front!.path),
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) =>
              _buildUnavailableSurface(),
        ),
      );
    }

    if (_cameraInitializing) {
      return const Center(child: CircularProgressIndicator());
    }

    if (controller == null || !controller.value.isInitialized) {
      return _buildUnavailableSurface();
    }

    return GestureDetector(
      key: _previewAreaKey,
      behavior: HitTestBehavior.translucent,
      onTapDown: _handlePreviewTap,
      child: SizedBox.expand(child: CameraPreview(controller)),
    );
  }

  Widget _buildUnavailableSurface() {
    return Container(
      color: const Color(0xFF050608),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.center_focus_strong_rounded,
            color: Colors.white.withValues(alpha: 0.72),
            size: 42,
          ),
          const SizedBox(height: 12),
          Text(
            _cameraError ?? 'Preparing scanner',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.78),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final presentation = _presentation;
    final accentColor = _accentForState(presentation.state, colorScheme);
    final panelImageUrl = (_resolvedCandidate ?? _topCandidate)?.imageUrl;

    return Scaffold(
      backgroundColor: Colors.black,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final media = MediaQuery.of(context);
          final guideRect = _buildGuideRect(constraints.biggest, media.padding);
          return Stack(
            children: [
              Positioned.fill(child: _buildPreviewSurface()),
              Positioned.fill(
                child: IdentityScannerOverlay(
                  guideRect: guideRect,
                  accentColor: accentColor,
                  quadPointsNorm: _quadPoints,
                  focusTapNorm: _lastFocusTapNorm,
                  guidanceText: presentation.guidance,
                  locked:
                      presentation.isLocked ||
                      _surfaceMode != _IdentityScannerSurfaceMode.live,
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Row(
                    children: [
                      _TopScannerActionButton(
                        icon: Icons.arrow_back_ios_new_rounded,
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      const Spacer(),
                      _TopScannerActionButton(
                        icon: Icons.photo_library_outlined,
                        onPressed: _isBusy
                            ? null
                            : () {
                                unawaited(_pickFromGallery());
                              },
                      ),
                      const SizedBox(width: 10),
                      _TopScannerActionButton(
                        icon: Icons.refresh_rounded,
                        onPressed: _isBusy
                            ? null
                            : () {
                                unawaited(_resetScanner());
                              },
                      ),
                    ],
                  ),
                ),
              ),
              if (_inlineError != null && _inlineError!.trim().isNotEmpty)
                Positioned(
                  left: 16,
                  right: 16,
                  top: media.padding.top + 66,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: const Color(0xCC3C1715),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0x66FF9C8A)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      child: Text(
                        _inlineError!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
              Positioned(
                left: 16,
                right: 16,
                bottom: 16 + media.padding.bottom,
                child: IdentityScannerBottomPanel(
                  eyebrow: presentation.eyebrow,
                  title: presentation.title,
                  subtitle: presentation.subtitle,
                  supportingText:
                      _submittedCatalog &&
                          presentation.state ==
                              ScannerUiState.insufficientEvidence
                      ? 'Submitted for review. You can scan another card anytime.'
                      : presentation.supportingText,
                  imageUrl: panelImageUrl,
                  primaryActionLabel: _primaryActionLabel(presentation),
                  onPrimaryAction: _primaryAction(presentation),
                  accentColor: accentColor,
                  showSpinner:
                      _isBusy || presentation.state == ScannerUiState.locked,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TopScannerActionButton extends StatelessWidget {
  const _TopScannerActionButton({required this.icon, required this.onPressed});

  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Material(
          color: Colors.black.withValues(alpha: 0.28),
          child: InkWell(
            onTap: onPressed,
            child: SizedBox(
              width: 42,
              height: 42,
              child: Icon(
                icon,
                color: onPressed == null
                    ? Colors.white.withValues(alpha: 0.28)
                    : Colors.white.withValues(alpha: 0.92),
                size: 18,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
