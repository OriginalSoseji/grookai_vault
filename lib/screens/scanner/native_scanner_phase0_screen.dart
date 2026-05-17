import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/identity/identity_scan_service.dart';
import '../../services/scanner/native_scanner_phase0_bridge.dart';
import '../../services/scanner/perceptual_image_hash.dart';
import '../../services/scanner/recent_scan_cache.dart';
import 'condition_camera_screen.dart';

enum _NativeScannerIdentityStatus {
  idle,
  identifying,
  matchFound,
  needsReview,
  failed,
}

class NativeScannerPhase0Screen extends StatefulWidget {
  const NativeScannerPhase0Screen({super.key});

  @override
  State<NativeScannerPhase0Screen> createState() =>
      _NativeScannerPhase0ScreenState();
}

class _NativeScannerPhase0ScreenState extends State<NativeScannerPhase0Screen> {
  final _identityService = IdentityScanService();

  NativeScannerPhase0Capture? _capture;
  NativeScannerPhase0Readiness? _readiness;
  Timer? _readinessTimer;
  DateTime _screenOpenedAt = DateTime.now();
  DateTime? _previewReadyAt;
  DateTime? _autoCaptureStartedAt;
  DateTime? _captureStartedAt;
  DateTime? _captureReturnedAt;
  DateTime? _identityUploadStartedAt;
  DateTime? _identityEventCreatedAt;
  DateTime? _pollStartedAt;
  DateTime? _firstPollResponseAt;
  DateTime? _identityDoneAt;
  DateTime? _cacheLookupStartedAt;
  DateTime? _cacheLookupDoneAt;
  Object? _error;
  _NativeScannerIdentityStatus _identityStatus =
      _NativeScannerIdentityStatus.idle;
  String? _identityFailureStage;
  String? _identityBackendDetail;
  String? _identityEventId;
  String? _identitySnapshotId;
  List<dynamic> _identityCandidates = const [];
  CachedCard? _cachedCard;
  String? _currentFingerprint;
  String? _matchedFingerprint;
  int? _cacheMatchDistance;
  int? _realScanFastPathDistance;
  int? _realScanFastPathCandidateCount;
  bool _previewReady = false;
  bool _capturing = false;
  bool _identifying = false;
  bool _readinessRefreshing = false;
  bool _androidCaptureReviewPending = false;
  bool _androidReviewContinueInFlight = false;
  bool _candidateFromCache = false;
  bool _candidateFromRealScanFastPath = false;
  bool _autoCaptureInFlight = false;
  bool _hasAutoCaptured = false;
  bool _autoCaptureArmed = true;
  final double _zoom = 1.3;
  final double _exposureBias = 0.25;

  bool get _isIos => defaultTargetPlatform == TargetPlatform.iOS;
  bool get _isAndroid => defaultTargetPlatform == TargetPlatform.android;
  bool get _isNativeScannerPlatform => _isIos || _isAndroid;
  bool get _autoCaptureEnabled => false;
  bool get _hasAndroidCaptureReview =>
      _isAndroid && _androidCaptureReviewPending && (_capture?.isPass ?? false);

  String get _readinessLabel {
    if (!_previewReady) {
      return 'Preparing';
    }
    if (_hasAndroidCaptureReview) {
      return 'Review capture';
    }
    if (_autoCaptureInFlight) {
      return 'Ready — capturing…';
    }
    if (_showingCachedCandidate) {
      return 'Likely match (fast)';
    }
    if (_identifying) {
      return 'Identifying…';
    }
    if (_capture != null) {
      return switch (_identityStatus) {
        _NativeScannerIdentityStatus.matchFound => 'Confirmed',
        _NativeScannerIdentityStatus.needsReview => 'Needs review',
        _NativeScannerIdentityStatus.failed => 'Failed',
        _ => 'Captured',
      };
    }
    return (_readiness?.ready ?? false) ? 'Ready' : 'Hold steady';
  }

  bool get _showingCachedCandidate {
    return _candidateFromCache &&
        _cachedCard != null &&
        _identityCandidates.isEmpty &&
        _identityDoneAt == null;
  }

  bool get _shouldAutoCapture {
    return _autoCaptureEnabled &&
        _autoCaptureArmed &&
        !_autoCaptureInFlight &&
        !_hasAutoCaptured &&
        _capture == null &&
        _previewReady &&
        (_readiness?.ready ?? false);
  }

  String get _shownResultSource {
    if (_candidateFromRealScanFastPath) {
      return 'real_scan';
    }
    if (_identityCandidates.isNotEmpty || _identityDoneAt != null) {
      return 'backend';
    }
    if (_candidateFromCache) {
      return 'cache';
    }
    return 'none';
  }

  String get _identityStatusText {
    if (_showingCachedCandidate) {
      return 'Likely match (fast)';
    }
    return switch (_identityStatus) {
      _NativeScannerIdentityStatus.idle => 'Ready',
      _NativeScannerIdentityStatus.identifying => 'Identifying...',
      _NativeScannerIdentityStatus.matchFound => 'Confirmed',
      _NativeScannerIdentityStatus.needsReview => 'Needs review',
      _NativeScannerIdentityStatus.failed => 'Failed',
    };
  }

  String get _visibleCandidateCount {
    if (_identityCandidates.isNotEmpty) {
      return '${_identityCandidates.length}';
    }
    return _showingCachedCandidate ? '1 provisional' : '0';
  }

  String get _visibleCandidateName {
    final candidate = _topIdentityCandidate;
    if (candidate != null) {
      return _candidateName(candidate);
    }
    if (_showingCachedCandidate) {
      return _cachedCard!.name;
    }
    return 'none';
  }

  String get _visibleCandidateSetNumber {
    final candidate = _topIdentityCandidate;
    if (candidate != null) {
      return _candidateSetNumber(candidate);
    }
    if (_showingCachedCandidate) {
      final cached = _cachedCard!;
      final parts = [
        cached.setCode,
        cached.number,
      ].where((part) => part.trim().isNotEmpty).toList();
      return parts.isEmpty ? 'none' : parts.join(' / ');
    }
    return 'none';
  }

  @override
  void dispose() {
    _readinessTimer?.cancel();
    super.dispose();
  }

  Future<void> _handlePlatformViewCreated(int viewId) async {
    if (!_isNativeScannerPlatform || !mounted) {
      return;
    }
    setState(() {
      _previewReady = true;
      _previewReadyAt ??= DateTime.now();
      _error = null;
    });
    try {
      await NativeScannerPhase0Bridge.startSession();
      _startReadinessPolling();
      unawaited(_refreshReadiness());
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error;
      });
    }
  }

  Future<void> _openScannerV3LiveLoopPrototype() async {
    final navigator = Navigator.of(context);
    _readinessTimer?.cancel();
    _readinessTimer = null;
    if (_isNativeScannerPlatform) {
      try {
        await NativeScannerPhase0Bridge.stopSession();
      } catch (error) {
        if (kDebugMode) {
          debugPrint(
            '[scanner_v3_live_loop] stop native session skipped: $error',
          );
        }
      }
    }
    if (mounted) {
      setState(() {
        _previewReady = false;
      });
    }

    try {
      await navigator.push<void>(
        MaterialPageRoute(
          builder: (_) => const ConditionCameraScreen(
            title: 'Scanner V3 Live Loop',
            hintText: 'Hold card steady',
            enableScannerV3LiveLoopPrototype: true,
          ),
        ),
      );
    } finally {
      if (_isNativeScannerPlatform && mounted) {
        try {
          await NativeScannerPhase0Bridge.startSession();
          if (!mounted) return;
          setState(() {
            _previewReady = true;
          });
          _startReadinessPolling();
          unawaited(_refreshReadiness());
        } catch (error) {
          if (!mounted) return;
          setState(() {
            _error = error;
          });
        }
      }
    }
  }

  void _startReadinessPolling() {
    _readinessTimer?.cancel();
    _readinessTimer = Timer.periodic(const Duration(milliseconds: 250), (_) {
      unawaited(_refreshReadiness());
    });
  }

  Future<void> _refreshReadiness() async {
    if (!_isNativeScannerPlatform || !_previewReady || _readinessRefreshing) {
      return;
    }
    _readinessRefreshing = true;
    try {
      final readiness = await NativeScannerPhase0Bridge.getReadiness();
      if (!mounted) {
        return;
      }
      setState(() {
        _readiness = readiness;
        if (!readiness.ready) {
          _autoCaptureArmed = true;
        }
      });
      if (_shouldAutoCapture) {
        await _runAutoCapture();
      }
    } catch (_) {
      // Readiness is best-effort telemetry for the Phase 2 proof surface.
    } finally {
      _readinessRefreshing = false;
    }
  }

  Future<void> _runAutoCapture() async {
    if (!_shouldAutoCapture || !mounted) {
      return;
    }
    setState(() {
      _autoCaptureInFlight = true;
      _autoCaptureArmed = false;
      _autoCaptureStartedAt = DateTime.now();
    });
    final captured = await _captureStill();
    if (!mounted) {
      return;
    }
    setState(() {
      _hasAutoCaptured = captured;
      _autoCaptureInFlight = false;
    });
  }

  Future<bool> _captureStill() async {
    if (_capturing || !_previewReady) {
      return false;
    }
    setState(() {
      _capturing = true;
      _captureStartedAt = DateTime.now();
      _captureReturnedAt = null;
      _identityUploadStartedAt = null;
      _identityEventCreatedAt = null;
      _pollStartedAt = null;
      _firstPollResponseAt = null;
      _identityDoneAt = null;
      _cacheLookupStartedAt = null;
      _cacheLookupDoneAt = null;
      _currentFingerprint = null;
      _matchedFingerprint = null;
      _cacheMatchDistance = null;
      _realScanFastPathDistance = null;
      _realScanFastPathCandidateCount = null;
      _androidCaptureReviewPending = false;
      _androidReviewContinueInFlight = false;
      _candidateFromRealScanFastPath = false;
      _error = null;
    });
    try {
      final capture = await NativeScannerPhase0Bridge.capture();
      if (!mounted) {
        return false;
      }
      setState(() {
        _captureReturnedAt = DateTime.now();
        _applyCapture(capture);
      });
      if (_isAndroid && capture.isPass) {
        setState(() {
          _androidCaptureReviewPending = true;
          _identityStatus = _NativeScannerIdentityStatus.idle;
          _identityFailureStage = null;
          _identityBackendDetail =
              'Review captured image before identity scan.';
          _identityDoneAt = null;
        });
        return true;
      }
      return _continueCaptureToIdentity(capture);
    } catch (error) {
      if (!mounted) {
        return false;
      }
      setState(() {
        _error = error;
      });
      return false;
    } finally {
      if (mounted) {
        setState(() {
          _capturing = false;
        });
      }
    }
  }

  void _handleCaptureButtonPressed() {
    if (_capture != null) {
      _resetCapturedImageForRetake();
      return;
    }
    unawaited(_captureStill());
  }

  void _resetCapturedImageForRetake() {
    setState(() {
      _resetTimingState();
      _capture = null;
      _error = null;
      _resetIdentityState();
      _hasAutoCaptured = false;
      _autoCaptureArmed = true;
      _autoCaptureInFlight = false;
      _androidCaptureReviewPending = false;
      _androidReviewContinueInFlight = false;
    });
  }

  Future<void> _handleAndroidReviewContinuePressed() async {
    final capture = _capture;
    if (!_hasAndroidCaptureReview ||
        capture == null ||
        _androidReviewContinueInFlight) {
      return;
    }
    setState(() {
      _androidReviewContinueInFlight = true;
      _androidCaptureReviewPending = false;
      _identityStatus = _NativeScannerIdentityStatus.identifying;
      _identityFailureStage = null;
      _identityBackendDetail = null;
    });
    await _continueCaptureToIdentity(capture);
    if (!mounted) {
      return;
    }
    setState(() {
      _androidReviewContinueInFlight = false;
    });
  }

  void _applyCapture(NativeScannerPhase0Capture capture) {
    _capture = capture;
    _readiness = NativeScannerPhase0Readiness(
      ready: capture.ready,
      deviceStable: _readiness?.deviceStable ?? capture.ready,
      focusStable: _readiness?.focusStable ?? capture.ready,
      exposureStable: _readiness?.exposureStable ?? capture.ready,
    );
    _identityStatus = capture.isPass
        ? _NativeScannerIdentityStatus.identifying
        : _NativeScannerIdentityStatus.failed;
    _identityFailureStage = capture.isPass ? null : 'capture_invalid';
    _identityBackendDetail = capture.isPass
        ? null
        : 'Native capture did not produce valid scan input.';
    _identityDoneAt = capture.isPass ? null : DateTime.now();
    _identityEventId = null;
    _identitySnapshotId = null;
    _identityCandidates = const [];
    _candidateFromCache = false;
    _candidateFromRealScanFastPath = false;
    _cachedCard = null;
    _currentFingerprint = null;
    _matchedFingerprint = null;
    _cacheMatchDistance = null;
    _realScanFastPathDistance = null;
    _realScanFastPathCandidateCount = null;
  }

  Future<String?> _lookupRecentScanCache(
    NativeScannerPhase0Capture capture,
  ) async {
    final startedAt = DateTime.now();
    if (!capture.isPass || capture.imagePath.trim().isEmpty) {
      if (mounted) {
        setState(() {
          _cacheLookupStartedAt = startedAt;
          _cacheLookupDoneAt = DateTime.now();
        });
      }
      return null;
    }

    try {
      final bytes = await File(capture.imagePath).readAsBytes();
      final fingerprint = await PerceptualImageHash.hashNormalizedCardRegion(
        bytes,
      );
      final hit = RecentScanCache.findByFingerprint(fingerprint);
      if (!mounted) {
        return fingerprint;
      }
      setState(() {
        _cacheLookupStartedAt = startedAt;
        _cacheLookupDoneAt = DateTime.now();
        _currentFingerprint = fingerprint;
        _matchedFingerprint = hit?.fingerprint;
        _cacheMatchDistance = hit?.distance;
        _cachedCard = hit?.card;
        _candidateFromCache = hit != null;
      });
      return fingerprint;
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[native_scanner_phase5_2] fingerprint error: $error');
      }
      if (mounted) {
        setState(() {
          _cacheLookupStartedAt = startedAt;
          _cacheLookupDoneAt = DateTime.now();
          _currentFingerprint = null;
          _matchedFingerprint = null;
          _cacheMatchDistance = null;
          _cachedCard = null;
          _candidateFromCache = false;
        });
      }
      return null;
    }
  }

  Future<bool> _continueCaptureToIdentity(
    NativeScannerPhase0Capture capture,
  ) async {
    final fingerprint = await _lookupRecentScanCache(capture);
    if (!mounted) {
      return false;
    }
    final fastPathMatched = await _tryRealScanFastPath(capture, fingerprint);
    if (!mounted) {
      return false;
    }
    if (fastPathMatched) {
      return true;
    }
    unawaited(_startIdentityHandoff(capture, fingerprint));
    return true;
  }

  Future<bool> _tryRealScanFastPath(
    NativeScannerPhase0Capture capture,
    String? fingerprint,
  ) async {
    if (!_isAndroid || !capture.isPass || fingerprint == null) {
      return false;
    }
    final normalizedFingerprint = fingerprint.trim().toLowerCase();
    if (!RegExp(r'^[0-9a-f]{16}$').hasMatch(normalizedFingerprint)) {
      return false;
    }

    try {
      final match = await _findRealScanFastPathMatch(normalizedFingerprint);
      if (match == null || !mounted) {
        return false;
      }

      setState(() {
        _identityDoneAt = DateTime.now();
        _identityStatus = _NativeScannerIdentityStatus.matchFound;
        _identityFailureStage = null;
        _identityBackendDetail = 'real_scan_fast_path';
        _identityEventId = null;
        _identitySnapshotId = null;
        _identityCandidates = [match.candidate];
        _candidateFromCache = false;
        _candidateFromRealScanFastPath = true;
        _cachedCard = null;
        _matchedFingerprint = normalizedFingerprint;
        _cacheMatchDistance = match.distance;
        _realScanFastPathDistance = match.distance;
        _realScanFastPathCandidateCount = match.candidateCount;
      });
      _debugTimingLog(
        'real_scan_fast_path_match distance=${match.distance} '
        'candidate_count=${match.candidateCount}',
      );
      return true;
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[native_scanner_real_scan_fast_path] fallback: $error');
      }
      return false;
    }
  }

  Future<_RealScanFastPathMatch?> _findRealScanFastPathMatch(
    String fingerprint,
  ) async {
    const highConfidenceMaxDistance = 4;
    const candidatePoolLimit = 5000;
    const algorithmVersion = 'real_scan_v1';

    final rows = await Supabase.instance.client
        .from('scanner_fingerprint_index')
        .select('card_print_id,hash_d')
        .eq('source_type', 'real_scan')
        .eq('algorithm_version', algorithmVersion)
        .eq('is_verified', true)
        .limit(candidatePoolLimit);

    final bestByCardPrintId = <String, _RealScanRankedCandidate>{};
    for (final row in rows) {
      final cardPrintId = (row['card_print_id'] ?? '').toString().trim();
      if (cardPrintId.isEmpty) {
        continue;
      }
      final hashHex = _dbInt64ToUnsignedHex(row['hash_d']);
      if (hashHex == null) {
        continue;
      }
      final distance = PerceptualImageHash.hammingDistance(
        fingerprint,
        hashHex,
      );
      if (distance > highConfidenceMaxDistance) {
        continue;
      }
      final existing = bestByCardPrintId[cardPrintId];
      if (existing == null || distance < existing.distance) {
        bestByCardPrintId[cardPrintId] = _RealScanRankedCandidate(
          cardPrintId: cardPrintId,
          distance: distance,
        );
      }
    }

    final matches = bestByCardPrintId.values.toList()
      ..sort(
        (a, b) => a.distance.compareTo(b.distance) == 0
            ? a.cardPrintId.compareTo(b.cardPrintId)
            : a.distance.compareTo(b.distance),
      );
    if (matches.length != 1) {
      return null;
    }

    final best = matches.single;
    final cardRow = await Supabase.instance.client
        .from('card_prints')
        .select('id,name,set_code,number,number_plain,image_url')
        .eq('id', best.cardPrintId)
        .maybeSingle();
    if (cardRow == null) {
      return null;
    }
    final card = Map<String, dynamic>.from(cardRow);
    final id = (card['id'] ?? '').toString().trim();
    if (id.isEmpty || id != best.cardPrintId) {
      return null;
    }

    return _RealScanFastPathMatch(
      candidate: <String, dynamic>{
        'card_print_id': id,
        'name': (card['name'] ?? '').toString(),
        'set_code': (card['set_code'] ?? '').toString(),
        'number': (card['number'] ?? '').toString(),
        'number_plain': (card['number_plain'] ?? '').toString(),
        'image_url': (card['image_url'] ?? '').toString(),
        'source': 'real_scan_fast_path',
        'lane': 'real_scan',
        'algorithm_version': algorithmVersion,
        'distance': best.distance,
      },
      distance: best.distance,
      candidateCount: matches.length,
    );
  }

  String? _dbInt64ToUnsignedHex(Object? rawValue) {
    final raw = rawValue?.toString().trim();
    if (raw == null || raw.isEmpty) {
      return null;
    }
    if (RegExp(r'^[0-9a-fA-F]{16}$').hasMatch(raw)) {
      return raw.toLowerCase();
    }
    try {
      final signed = BigInt.parse(raw);
      return signed.toUnsigned(64).toRadixString(16).padLeft(16, '0');
    } catch (_) {
      return null;
    }
  }

  void _storeRecentScanCache(
    IdentityScanPollResult result,
    String? fingerprint,
  ) {
    if (fingerprint == null || fingerprint.isEmpty) {
      return;
    }
    if (result.candidates.isEmpty) {
      return;
    }
    final candidate = result.candidates.first;
    if (candidate is! Map) {
      return;
    }
    final top = Map<String, dynamic>.from(candidate);
    final name = (top['name'] ?? '').toString().trim();
    final setCode = (top['set_code'] ?? '').toString().trim();
    final number = (top['number'] ?? '').toString().trim();
    if (name.isEmpty || setCode.isEmpty || number.isEmpty) {
      return;
    }

    final aiSignals = result.signals?['ai'];
    final confidence = aiSignals is Map && aiSignals['confidence'] is num
        ? (aiSignals['confidence'] as num).toDouble()
        : 0.0;
    final cached = CachedCard(
      name: name,
      setCode: setCode,
      number: number,
      confidence: confidence,
      lastSeen: DateTime.now(),
    );
    RecentScanCache.put(fingerprint, cached);
  }

  void _resetTimingState() {
    _screenOpenedAt = DateTime.now();
    _previewReadyAt = _previewReady ? _screenOpenedAt : null;
    _autoCaptureStartedAt = null;
    _captureStartedAt = null;
    _captureReturnedAt = null;
    _identityUploadStartedAt = null;
    _identityEventCreatedAt = null;
    _pollStartedAt = null;
    _firstPollResponseAt = null;
    _identityDoneAt = null;
    _cacheLookupStartedAt = null;
    _cacheLookupDoneAt = null;
    _candidateFromCache = false;
    _candidateFromRealScanFastPath = false;
    _androidCaptureReviewPending = false;
    _androidReviewContinueInFlight = false;
    _cachedCard = null;
    _currentFingerprint = null;
    _matchedFingerprint = null;
    _cacheMatchDistance = null;
    _realScanFastPathDistance = null;
    _realScanFastPathCandidateCount = null;
  }

  void _resetIdentityState() {
    _identifying = false;
    _identityStatus = _NativeScannerIdentityStatus.idle;
    _identityFailureStage = null;
    _identityBackendDetail = null;
    _identityEventId = null;
    _identitySnapshotId = null;
    _identityCandidates = const [];
    _candidateFromRealScanFastPath = false;
    _androidCaptureReviewPending = false;
    _androidReviewContinueInFlight = false;
  }

  Future<void> _startIdentityHandoff(
    NativeScannerPhase0Capture capture,
    String? fingerprint,
  ) async {
    if (_identifying || !capture.isPass || capture.imagePath.trim().isEmpty) {
      return;
    }
    setState(() {
      _identifying = true;
      _identityUploadStartedAt = DateTime.now();
      _identityStatus = _NativeScannerIdentityStatus.identifying;
      _identityFailureStage = null;
      _identityBackendDetail = null;
      _identityCandidates = const [];
    });

    try {
      _debugTimingLog('upload_start');
      final start = await _identityService.startScan(
        frontFile: XFile(capture.imagePath),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _identityEventCreatedAt = DateTime.now();
        _identityEventId = start.eventId;
        _identitySnapshotId = start.snapshotId;
      });
      _debugTimingLog('event_created');
      await _pollIdentityUntilDone(start.eventId, fingerprint);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _identityDoneAt = DateTime.now();
        _identityStatus = _NativeScannerIdentityStatus.failed;
        _identityFailureStage = 'start_scan';
        _identityBackendDetail = error.toString();
      });
      _debugTimingLog('final_result_failed');
    } finally {
      if (mounted) {
        setState(() {
          _identifying = false;
        });
      }
    }
  }

  Future<void> _pollIdentityUntilDone(
    String eventId,
    String? fingerprint,
  ) async {
    const maxAttempts = 30;
    setState(() {
      _pollStartedAt = DateTime.now();
    });
    for (var attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!mounted) {
        return;
      }

      try {
        final result = await _identityService.pollOnce(eventId);
        final pollResponseAt = DateTime.now();
        if (!mounted) {
          return;
        }
        if (_firstPollResponseAt == null) {
          setState(() {
            _firstPollResponseAt = pollResponseAt;
          });
        }
        _debugTimingLog(
          'poll_response status=${result.status} candidates=${result.candidates.length}',
        );
        if (result.status == 'ai_hint_ready') {
          _storeRecentScanCache(result, fingerprint);
          setState(() {
            _identityDoneAt = DateTime.now();
            _identityCandidates = result.candidates;
            _identityBackendDetail = result.error;
            _identityStatus = result.candidates.isEmpty
                ? _NativeScannerIdentityStatus.needsReview
                : _NativeScannerIdentityStatus.matchFound;
          });
          _debugTimingLog('final_result_${result.status}');
          return;
        }

        if (result.status == 'failed') {
          setState(() {
            _identityDoneAt = DateTime.now();
            _identityStatus = _NativeScannerIdentityStatus.failed;
            _identityFailureStage = 'poll_failed';
            _identityBackendDetail = result.error ?? 'Identity scan failed.';
            _identityCandidates = result.candidates;
          });
          _debugTimingLog('final_result_failed');
          return;
        }
      } catch (error) {
        if (kDebugMode) {
          debugPrint('[native_scanner_phase3] poll error: $error');
        }
      }

      await Future.delayed(const Duration(seconds: 1));
    }

    if (!mounted) {
      return;
    }
    setState(() {
      _identityDoneAt = DateTime.now();
      _identityStatus = _NativeScannerIdentityStatus.failed;
      _identityFailureStage = 'poll_timeout';
      _identityBackendDetail = 'Timed out waiting for identification.';
    });
    _debugTimingLog('final_result_timeout');
  }

  void _debugTimingLog(String stage) {
    if (!kDebugMode) {
      return;
    }
    debugPrint(
      '[native_scanner_timing] $stage '
      'camera_start_ms=${_msBetween(_screenOpenedAt, _previewReadyAt)} '
      'candidate_from_cache=$_candidateFromCache '
      'cache_lookup_ms=${_msBetween(_cacheLookupStartedAt, _cacheLookupDoneAt)} '
      'fingerprint=${_currentFingerprint ?? 'none'} '
      'cache_match_distance=${_cacheMatchDistance ?? 'none'} '
      'identity_backend_ms=${_msBetween(_identityEventCreatedAt, _identityDoneAt)} '
      'shown_result_source=$_shownResultSource '
      'auto_to_capture_return_ms=${_msBetween(_autoCaptureStartedAt, _captureReturnedAt)} '
      'capture_ms=${_msBetween(_captureStartedAt, _captureReturnedAt)} '
      'upload_to_event_ms=${_msBetween(_identityUploadStartedAt, _identityEventCreatedAt)} '
      'event_to_first_poll_ms=${_msBetween(_identityEventCreatedAt, _firstPollResponseAt)} '
      'poll_to_done_ms=${_msBetween(_pollStartedAt, _identityDoneAt)} '
      'total_identity_ms=${_msBetween(_identityUploadStartedAt, _identityDoneAt)} '
      'total_scan_ms=${_msBetween(_screenOpenedAt, _identityDoneAt)}',
    );
  }

  int? _msBetween(DateTime? start, DateTime? end) {
    if (start == null || end == null) {
      return null;
    }
    return end.difference(start).inMilliseconds;
  }

  String _msLabel(DateTime? start, DateTime? end) {
    final ms = _msBetween(start, end);
    return ms == null ? 'pending' : '${ms}ms';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scanner Camera'),
        actions: [
          if (kDebugMode)
            IconButton(
              tooltip: 'Scanner V3 live loop prototype',
              icon: const Icon(Icons.radar),
              onPressed: _openScannerV3LiveLoopPrototype,
            ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildPreview(theme),
            const SizedBox(height: 16),
            Text(
              _readinessLabel,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 16),
            if (_hasAndroidCaptureReview)
              _buildAndroidCaptureReview(theme)
            else
              _buildCaptureButton(),
            const SizedBox(height: 16),
            if (!_hasAndroidCaptureReview) _buildResult(theme),
            const SizedBox(height: 16),
            _buildTimingResult(theme),
            const SizedBox(height: 16),
            _buildIdentityResult(theme),
          ],
        ),
      ),
    );
  }

  Widget _buildPreview(ThemeData theme) {
    if (!_isNativeScannerPlatform) {
      return _Phase0Panel(
        title: 'Unsupported',
        child: Text(
          'Native Scanner Phase 0 is not supported on this platform.',
          style: theme.textTheme.bodyMedium,
        ),
      );
    }

    final platformView = _isIos
        ? UiKitView(
            viewType: NativeScannerPhase0Bridge.previewViewType,
            onPlatformViewCreated: _handlePlatformViewCreated,
          )
        : AndroidView(
            viewType: NativeScannerPhase0Bridge.previewViewType,
            onPlatformViewCreated: _handlePlatformViewCreated,
          );

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: AspectRatio(aspectRatio: 3 / 4, child: platformView),
    );
  }

  Widget _buildCaptureButton() {
    return FilledButton(
      onPressed:
          _previewReady &&
              !_capturing &&
              !_identifying &&
              !_androidReviewContinueInFlight
          ? _handleCaptureButtonPressed
          : null,
      child: Text(
        _capturing
            ? 'Capturing...'
            : _capture == null
            ? 'Capture now'
            : 'Retake',
      ),
    );
  }

  Widget _buildAndroidCaptureReview(ThemeData theme) {
    final capture = _capture!;
    final file = File(capture.imagePath);
    return _Phase0Panel(
      title: 'Review Capture',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.file(
              file,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) => Text(
                'image render failed: $error',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _MetricRow(label: 'width', value: '${capture.width}'),
          _MetricRow(label: 'height', value: '${capture.height}'),
          _MetricRow(label: 'fileSize', value: '${capture.fileSize} bytes'),
          _MetricRow(label: 'imagePath', value: capture.imagePath),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _androidReviewContinueInFlight
                      ? null
                      : _resetCapturedImageForRetake,
                  child: const Text('Retake'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _androidReviewContinueInFlight
                      ? null
                      : () {
                          unawaited(_handleAndroidReviewContinuePressed());
                        },
                  child: Text(
                    _androidReviewContinueInFlight
                        ? 'Continuing...'
                        : 'Continue to Identity Scan',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildResult(ThemeData theme) {
    final capture = _capture;
    final pass = capture?.isPass ?? false;
    final file = capture == null || capture.imagePath.trim().isEmpty
        ? null
        : File(capture.imagePath);

    return _Phase0Panel(
      title: capture == null
          ? 'Result'
          : pass
          ? 'PASS'
          : 'FAIL',
      titleColor: capture == null
          ? null
          : pass
          ? Colors.green.shade700
          : theme.colorScheme.error,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _MetricRow(
            label: 'preview',
            value: _previewReady ? 'ready' : 'pending',
          ),
          _MetricRow(
            label: 'ready',
            value: '${capture?.ready ?? _readiness?.ready ?? false}',
          ),
          _MetricRow(
            label: 'imagePath',
            value: capture?.imagePath ?? 'pending',
          ),
          _MetricRow(label: 'width', value: '${capture?.width ?? 0}'),
          _MetricRow(label: 'height', value: '${capture?.height ?? 0}'),
          _MetricRow(
            label: 'fileSize',
            value: '${capture?.fileSize ?? 0} bytes',
          ),
          _MetricRow(
            label: 'zoom',
            value:
                '${capture?.zoom.toStringAsFixed(2) ?? _zoom.toStringAsFixed(2)}x',
          ),
          _MetricRow(
            label: 'exposure',
            value: capture == null
                ? '${_exposureBias >= 0 ? '+' : ''}'
                      '${_exposureBias.toStringAsFixed(2)}'
                : '${capture.exposureBias >= 0 ? '+' : ''}'
                      '${capture.exposureBias.toStringAsFixed(2)}',
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              'error: $_error',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ],
          if (file != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.file(
                file,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => Text(
                  'image render failed: $error',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildIdentityResult(ThemeData theme) {
    final titleColor = switch (_identityStatus) {
      _NativeScannerIdentityStatus.matchFound => Colors.green.shade700,
      _NativeScannerIdentityStatus.failed => theme.colorScheme.error,
      _ => _showingCachedCandidate ? theme.colorScheme.primary : null,
    };

    return _Phase0Panel(
      title: 'Identity',
      titleColor: titleColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_identifying) ...[
            const Row(
              children: [
                SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 10),
                Text('Identifying card...'),
              ],
            ),
            const SizedBox(height: 10),
          ],
          if (_showingCachedCandidate) ...[
            Text(
              'Likely match (fast)',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            _MetricRow(label: 'likely', value: _cachedCard!.displayLabel),
            _MetricRow(
              label: 'cache conf',
              value: _cachedCard!.confidence.toStringAsFixed(3),
            ),
            const SizedBox(height: 10),
          ],
          _MetricRow(label: 'status', value: _identityStatusText),
          _MetricRow(label: 'source', value: _shownResultSource),
          _MetricRow(label: 'provisional', value: '$_showingCachedCandidate'),
          if (_candidateFromRealScanFastPath) ...[
            _MetricRow(
              label: 'fast dist',
              value: '${_realScanFastPathDistance ?? 'none'}',
            ),
            _MetricRow(
              label: 'fast count',
              value: '${_realScanFastPathCandidateCount ?? 'none'}',
            ),
          ],
          _MetricRow(label: 'failure', value: _identityFailureStage ?? 'none'),
          _MetricRow(label: 'detail', value: _identityBackendDetail ?? 'none'),
          _MetricRow(label: 'candidates', value: _visibleCandidateCount),
          _MetricRow(label: 'top', value: _visibleCandidateName),
          _MetricRow(label: 'set/number', value: _visibleCandidateSetNumber),
          _MetricRow(
            label: 'confirm',
            value: '${_identityCandidates.isNotEmpty}',
          ),
          if (_identityEventId != null)
            _MetricRow(label: 'event', value: _identityEventId!),
          if (_identitySnapshotId != null)
            _MetricRow(label: 'snapshot', value: _identitySnapshotId!),
        ],
      ),
    );
  }

  Widget _buildTimingResult(ThemeData theme) {
    return _Phase0Panel(
      title: 'Timing',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _MetricRow(
            label: 'camera',
            value: _msLabel(_screenOpenedAt, _previewReadyAt),
          ),
          _MetricRow(
            label: 'capture',
            value: _msLabel(_captureStartedAt, _captureReturnedAt),
          ),
          _MetricRow(
            label: 'from cache',
            value: _candidateFromCache ? 'yes' : 'no',
          ),
          _MetricRow(
            label: 'cache ms',
            value: _msLabel(_cacheLookupStartedAt, _cacheLookupDoneAt),
          ),
          _MetricRow(label: 'hash', value: _currentFingerprint ?? 'pending'),
          _MetricRow(label: 'match hash', value: _matchedFingerprint ?? 'none'),
          _MetricRow(
            label: 'distance',
            value: _cacheMatchDistance?.toString() ?? 'none',
          ),
          _MetricRow(
            label: 'backend',
            value: _msLabel(_identityEventCreatedAt, _identityDoneAt),
          ),
          _MetricRow(label: 'source', value: _shownResultSource),
          _MetricRow(
            label: 'fast path',
            value: _candidateFromRealScanFastPath ? 'real_scan' : 'none',
          ),
          _MetricRow(
            label: 'auto cap',
            value: _msLabel(_autoCaptureStartedAt, _captureReturnedAt),
          ),
          _MetricRow(
            label: 'upload',
            value: _msLabel(_identityUploadStartedAt, _identityEventCreatedAt),
          ),
          _MetricRow(
            label: 'first poll',
            value: _msLabel(_identityEventCreatedAt, _firstPollResponseAt),
          ),
          _MetricRow(
            label: 'poll done',
            value: _msLabel(_pollStartedAt, _identityDoneAt),
          ),
          _MetricRow(
            label: 'identity',
            value: _msLabel(_identityUploadStartedAt, _identityDoneAt),
          ),
          _MetricRow(
            label: 'total',
            value: _msLabel(_screenOpenedAt, _identityDoneAt),
          ),
        ],
      ),
    );
  }

  Map<String, dynamic>? get _topIdentityCandidate {
    if (_identityCandidates.isEmpty) {
      return null;
    }
    final candidate = _identityCandidates.first;
    return candidate is Map ? Map<String, dynamic>.from(candidate) : null;
  }

  String _candidateName(Map<String, dynamic>? candidate) {
    if (candidate == null) {
      return 'none';
    }
    final name = (candidate['name'] ?? '').toString().trim();
    return name.isEmpty ? 'Candidate' : name;
  }

  String _candidateSetNumber(Map<String, dynamic>? candidate) {
    if (candidate == null) {
      return 'none';
    }
    final setCode = (candidate['set_code'] ?? '').toString().trim();
    final number = (candidate['number'] ?? '').toString().trim();
    final parts = [setCode, number].where((part) => part.isNotEmpty).toList();
    return parts.isEmpty ? 'none' : parts.join(' / ');
  }
}

class _RealScanRankedCandidate {
  const _RealScanRankedCandidate({
    required this.cardPrintId,
    required this.distance,
  });

  final String cardPrintId;
  final int distance;
}

class _RealScanFastPathMatch {
  const _RealScanFastPathMatch({
    required this.candidate,
    required this.distance,
    required this.candidateCount,
  });

  final Map<String, dynamic> candidate;
  final int distance;
  final int candidateCount;
}

class _Phase0Panel extends StatelessWidget {
  const _Phase0Panel({
    required this.title,
    required this.child,
    this.titleColor,
  });

  final String title;
  final Widget child;
  final Color? titleColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                color: titleColor,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }
}

class _MetricRow extends StatelessWidget {
  const _MetricRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 82,
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: SelectableText(value, style: theme.textTheme.bodySmall),
          ),
        ],
      ),
    );
  }
}
