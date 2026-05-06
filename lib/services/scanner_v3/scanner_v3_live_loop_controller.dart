import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';

import 'package:camera/camera.dart';

import 'candidate_vote_state_v1.dart';
import 'convergence_state_v1.dart';
import 'embedding_service_v1.dart';
import 'lock_artifact_export_v1.dart';
import 'scanner_v3_identity_pipeline_v8.dart';
import 'vector_candidate_service_v1.dart';

typedef ScannerV3LockArtifactExportCallback =
    void Function(ScannerV3LockArtifactExportResult result);

class ScannerV3QuadDetectorSnapshot {
  const ScannerV3QuadDetectorSnapshot({
    required this.registered,
    required this.called,
    required this.success,
    this.confidence,
    this.elapsedMs,
    this.failureReason,
    this.rawResponse,
  });

  final bool registered;
  final bool called;
  final bool success;
  final double? confidence;
  final int? elapsedMs;
  final String? failureReason;
  final Map<String, dynamic>? rawResponse;
}

class ScannerV3LiveLoopController {
  ScannerV3LiveLoopController({
    this.sampleInterval = const Duration(milliseconds: 250),
    bool exportArtifactsOnLock = false,
    ScannerV3ImageEmbeddingServiceV1? embeddingService,
    ScannerV3VectorCandidateServiceV1? vectorCandidateService,
    ScannerV3IdentityPipelineV8? identityPipeline,
    CandidateVoteState? candidateVoteState,
    this.onLockArtifactExported,
  }) : _exportArtifactsOnLock = exportArtifactsOnLock,
       _identityPipeline =
           identityPipeline ??
           ScannerV3IdentityPipelineV8(
             embeddingService: embeddingService,
             vectorCandidateService: vectorCandidateService,
           ),
       _candidateVoteState = candidateVoteState ?? CandidateVoteState();

  static const double targetAspectRatio = 0.716;
  static const int normalizedHeight = 1024;
  static const int normalizedWidth = 733;
  static const double minBlurScore = 0.006;
  static const double minBrightnessScore = 0.12;
  static const double maxBrightnessScore = 0.90;
  static const double maxGlareRatio = 0.18;
  static const double minCardFillRatio = 0.08;
  static const double maxCardFillRatio = 0.72;
  static const double minNativeDetectorConfidence = 0.45;
  static const double minFallbackBorderConfidence = 0.35;
  static const double minFallbackCardFillRatio = 0.14;
  static const double maxFallbackCardFillRatio = 0.60;
  static const double minArtworkForegroundRatio = 0.015;
  static const double maxArtworkForegroundRatio = 0.88;
  static const double minArtworkLumaStdDev = 0.035;
  static const double minFallbackArtworkForegroundRatio = 0.045;
  static const double minFallbackArtworkLumaStdDev = 0.055;
  static const int candidateDistanceThreshold = 26;
  static const int minAcceptedFramesToLock = 3;
  static const double lockScoreGap = 6.0;

  final Duration sampleInterval;
  final ScannerV3LockArtifactExportCallback? onLockArtifactExported;

  DateTime _lastSampleAt = DateTime.fromMillisecondsSinceEpoch(0);
  int _frameCount = 0;
  int _sampledFrameCount = 0;
  int _acceptedFrameCount = 0;
  int _rejectedFrameCount = 0;
  int _nextCandidateIndex = 1;
  bool _locked = false;
  bool _artifactExported = false;
  bool _exportArtifactsOnLock;
  String? _lockedCandidateId;
  ScannerV3LiveLoopState _state = ScannerV3LiveLoopState.initial;
  CandidateVoteSnapshot _lastVoteSnapshot = CandidateVoteSnapshot.empty;
  int? _lastEmbeddingElapsedMs;
  int? _lastVectorSearchElapsedMs;
  int? _lastRerankElapsedMs;
  int? _lastIdentityPipelineElapsedMs;
  int _lastVectorCandidateCount = 0;
  int _lastIdentityCropCount = 0;
  int _lastSuccessfulIdentityCropCount = 0;
  int _lastUnifiedIdentityCandidateCount = 0;
  List<String> _lastIdentityErrors = const <String>[];
  String _lastIdentitySignalSource = 'waiting';
  final ScannerV3IdentityPipelineV8 _identityPipeline;
  final CandidateVoteState _candidateVoteState;
  final Map<String, _TrackedCandidate> _candidates =
      <String, _TrackedCandidate>{};

  ScannerV3LiveLoopState get state => _state;

  void setArtifactExportEnabled(bool enabled) {
    _exportArtifactsOnLock = enabled;
  }

  Future<ScannerV3LiveLoopState?> processCameraFrame({
    required CameraImage image,
    required int sensorRotation,
    required List<Offset>? quadPointsNorm,
    ScannerV3QuadDetectorSnapshot? quadDetectorSnapshot,
  }) async {
    _frameCount += 1;
    final now = DateTime.now();
    if (now.difference(_lastSampleAt) < sampleInterval) {
      return null;
    }
    _lastSampleAt = now;
    _sampledFrameCount += 1;

    final stopwatch = Stopwatch()..start();
    final normalized = _normalizeFrame(
      image: image,
      sensorRotation: sensorRotation,
      quadPointsNorm: quadPointsNorm,
      quadDetectorSnapshot: quadDetectorSnapshot,
    );

    if (normalized == null) {
      _rejectedFrameCount += 1;
      _clearIdentityState();
      _lastIdentitySignalSource = 'normalization_failed';
      return _publishState(
        quality: const ScannerV3QualitySnapshot(
          blurScore: 0,
          brightnessScore: 0,
          glareRatio: 0,
          cardFillRatio: 0,
          accepted: false,
          rejectionReasons: <String>['normalization_failed'],
        ),
        decisionReason: 'normalization_failed',
        elapsedMs: stopwatch.elapsedMilliseconds,
        selectedQuadSource: quadDetectorSnapshot?.success == true
            ? 'native_detector'
            : 'normalization_failed',
        detectorConfidence: quadDetectorSnapshot?.confidence,
        detectorElapsedMs: quadDetectorSnapshot?.elapsedMs,
        cardPresent: false,
        cardPresentReason: quadDetectorSnapshot?.success == true
            ? 'normalized_empty'
            : 'no_quad',
      );
    }

    final quality = _measureQuality(normalized);
    if (!quality.accepted) {
      _rejectedFrameCount += 1;
      _clearIdentityState();
      _lastIdentitySignalSource = 'quality_rejected';
      return _publishState(
        quality: quality,
        decisionReason: quality.rejectionReasons.join(','),
        elapsedMs: stopwatch.elapsedMilliseconds,
        selectedQuadSource: normalized.selectedQuadSource,
        detectorConfidence: normalized.detectorConfidence,
        detectorElapsedMs: normalized.detectorElapsedMs,
        cardPresent: false,
        cardPresentReason: _cardAbsentReasonForQuality(quality),
      );
    }

    final cardPresent = _evaluateCardPresent(normalized, quality);
    if (!cardPresent.present) {
      _rejectedFrameCount += 1;
      _clearIdentityState();
      _lastIdentitySignalSource = 'card_absent';
      return _publishState(
        quality: quality,
        decisionReason: 'card_present_false:${cardPresent.reason}',
        elapsedMs: stopwatch.elapsedMilliseconds,
        selectedQuadSource: normalized.selectedQuadSource,
        detectorConfidence: normalized.detectorConfidence,
        detectorElapsedMs: normalized.detectorElapsedMs,
        cardPresent: false,
        cardPresentReason: cardPresent.reason,
      );
    }

    _acceptedFrameCount += 1;
    final fullHash = _dHash(
      normalized.bytes,
      normalized.width,
      normalized.height,
      const _NormRect(left: 0, top: 0, right: 1, bottom: 1),
    );
    final artworkHash = _dHash(
      normalized.bytes,
      normalized.width,
      normalized.height,
      const _NormRect(left: 0.08, top: 0.12, right: 0.92, bottom: 0.60),
    );

    final candidate = _matchOrCreateCandidate(
      fullHash: fullHash,
      artworkHash: artworkHash,
    );
    _rewardCandidate(candidate, fullHash: fullHash, artworkHash: artworkHash);
    _decayCandidates(exceptId: candidate.id);

    final wasLocked = _locked;
    var identityDecisionReason = 'identity_vector_vote_updated';
    if (_locked) {
      _lastIdentitySignalSource = 'v8_identity_locked_frozen';
      identityDecisionReason = 'identity_locked_frozen';
    } else {
      try {
        final normalizedFullCardGray = ScannerV3ExportImage(
          bytes: Uint8List.fromList(normalized.bytes),
          width: normalized.width,
          height: normalized.height,
        );
        final normalizedFullCardColor = _normalizedColorFrameFromYuv(
          image: image,
          imageQuad: normalized.imageQuad,
        );
        final identityFullCard =
            normalizedFullCardColor ?? normalizedFullCardGray;
        final identityArtworkRegion = _cropExportImage(
          identityFullCard,
          const _NormRect(left: 0.08, top: 0.12, right: 0.92, bottom: 0.60),
        );

        final identityResult = await _identityPipeline.resolveFrame(
          normalizedFullCard: identityFullCard,
          artworkRegion: identityArtworkRegion,
        );

        _lastEmbeddingElapsedMs = identityResult.embeddingElapsedMs;
        _lastVectorSearchElapsedMs = identityResult.vectorSearchElapsedMs;
        _lastRerankElapsedMs = identityResult.rerankElapsedMs;
        _lastIdentityPipelineElapsedMs = identityResult.totalElapsedMs;
        _lastVectorCandidateCount = identityResult.candidates.length;
        _lastIdentityCropCount = identityResult.cropCount;
        _lastSuccessfulIdentityCropCount = identityResult.successfulCropCount;
        _lastUnifiedIdentityCandidateCount =
            identityResult.unifiedCandidateCount;
        _lastIdentityErrors = identityResult.errors;
        _lastVoteSnapshot = _candidateVoteState.update(
          candidates: identityResult.candidates,
          frameIndex: _acceptedFrameCount,
        );
        _locked = _lastVoteSnapshot.acceptedCandidate != null;
        _lockedCandidateId = _lastVoteSnapshot.acceptedCandidate;
        _lastIdentitySignalSource = identityResult.signalSource;
        if (identityResult.candidates.isEmpty) {
          identityDecisionReason = identityResult.errors.isEmpty
              ? 'identity_no_v8_candidates'
              : 'identity_no_v8_candidates:${identityResult.errors.first}';
        } else if (_locked) {
          identityDecisionReason =
              'identity_accepted:${_lastVoteSnapshot.identityDecisionReason}';
        } else if (_lastVoteSnapshot.lockedCandidate != null) {
          identityDecisionReason =
              '${_lastVoteSnapshot.identityDecisionState}:${_lastVoteSnapshot.identityDecisionReason}';
        } else {
          identityDecisionReason =
              '${_lastVoteSnapshot.identityDecisionState}:crops=${identityResult.successfulCropCount}/${identityResult.cropCount};unified=${identityResult.unifiedCandidateCount};top5=${identityResult.candidates.length};${_lastVoteSnapshot.identityDecisionReason}';
        }
      } catch (error) {
        _lastEmbeddingElapsedMs = null;
        _lastVectorSearchElapsedMs = null;
        _lastRerankElapsedMs = null;
        _lastIdentityPipelineElapsedMs = null;
        _lastVectorCandidateCount = 0;
        _lastIdentityCropCount = 0;
        _lastSuccessfulIdentityCropCount = 0;
        _lastUnifiedIdentityCandidateCount = 0;
        _lastIdentityErrors = <String>[error.toString()];
        _lastVoteSnapshot = _candidateVoteState.decayOnly(
          frameIndex: _acceptedFrameCount,
        );
        _lastIdentitySignalSource = 'identity_error';
        identityDecisionReason = 'identity_error:$error';
      }
    }

    // Keep the original hash clustering state for diagnostics, but do not let
    // it authorize Option A identity locks.
    if (!wasLocked && _locked) {
      _exportLockArtifactsIfEnabled(
        image: image,
        sensorRotation: sensorRotation,
        normalized: normalized,
        quality: quality,
      );
    }

    return _publishState(
      quality: quality,
      decisionReason: identityDecisionReason,
      elapsedMs: stopwatch.elapsedMilliseconds,
      selectedQuadSource: normalized.selectedQuadSource,
      detectorConfidence: normalized.detectorConfidence,
      detectorElapsedMs: normalized.detectorElapsedMs,
      cardPresent: true,
      cardPresentReason: 'card_present',
    );
  }

  void reset() {
    _lastSampleAt = DateTime.fromMillisecondsSinceEpoch(0);
    _frameCount = 0;
    _sampledFrameCount = 0;
    _acceptedFrameCount = 0;
    _rejectedFrameCount = 0;
    _nextCandidateIndex = 1;
    _locked = false;
    _artifactExported = false;
    _lockedCandidateId = null;
    _candidates.clear();
    _candidateVoteState.reset();
    _lastVoteSnapshot = CandidateVoteSnapshot.empty;
    _lastEmbeddingElapsedMs = null;
    _lastVectorSearchElapsedMs = null;
    _lastRerankElapsedMs = null;
    _lastIdentityPipelineElapsedMs = null;
    _lastVectorCandidateCount = 0;
    _lastIdentityCropCount = 0;
    _lastSuccessfulIdentityCropCount = 0;
    _lastUnifiedIdentityCandidateCount = 0;
    _lastIdentityErrors = const <String>[];
    _lastIdentitySignalSource = 'waiting';
    _state = ScannerV3LiveLoopState.initial;
  }

  void _clearIdentityState() {
    _candidates.clear();
    _candidateVoteState.reset();
    _lastVoteSnapshot = CandidateVoteSnapshot.empty;
    _locked = false;
    _lockedCandidateId = null;
    _artifactExported = false;
    _lastEmbeddingElapsedMs = null;
    _lastVectorSearchElapsedMs = null;
    _lastRerankElapsedMs = null;
    _lastIdentityPipelineElapsedMs = null;
    _lastVectorCandidateCount = 0;
    _lastIdentityCropCount = 0;
    _lastSuccessfulIdentityCropCount = 0;
    _lastUnifiedIdentityCandidateCount = 0;
    _lastIdentityErrors = const <String>[];
  }

  _NormalizedFrame? _normalizeFrame({
    required CameraImage image,
    required int sensorRotation,
    required List<Offset>? quadPointsNorm,
    required ScannerV3QuadDetectorSnapshot? quadDetectorSnapshot,
  }) {
    if (image.format.group != ImageFormatGroup.yuv420 || image.planes.isEmpty) {
      return null;
    }

    final rightAngleRotation = _isRightAngleRotation(sensorRotation);
    final displayWidth = rightAngleRotation ? image.height : image.width;
    final displayHeight = rightAngleRotation ? image.width : image.height;
    if (displayWidth <= 0 || displayHeight <= 0) {
      return null;
    }
    final displayAspectRatio = displayWidth / displayHeight;
    final displayQuadTargetAspect = targetAspectRatio / displayAspectRatio;

    final hasDetectedQuad =
        quadPointsNorm != null &&
        quadPointsNorm.length == 4 &&
        _nativeDetectorLooksUsable(quadDetectorSnapshot);
    final heuristicDisplayQuad = hasDetectedQuad
        ? null
        : _detectDisplayCardQuadFromFrame(
            image: image,
            sensorRotation: sensorRotation,
            displayQuadTargetAspect: displayQuadTargetAspect,
          );
    final displayQuad =
        (hasDetectedQuad ? quadPointsNorm : heuristicDisplayQuad) ??
        _centerDisplayCardQuad(displayQuadTargetAspect);
    final selectedQuadSource = hasDetectedQuad
        ? 'native_detector'
        : heuristicDisplayQuad != null
        ? 'yuv_fallback'
        : 'center_fallback';
    final orderedDisplayQuad = _orderQuad(displayQuad);
    final imageQuad = orderedDisplayQuad == null
        ? null
        : _displayOrderedImageQuad(orderedDisplayQuad, sensorRotation);
    if (orderedDisplayQuad == null || imageQuad == null) {
      return null;
    }

    final fillRatio = _polygonArea(orderedDisplayQuad).abs();
    if (fillRatio < minCardFillRatio * 0.5) {
      return null;
    }

    final yPlane = image.planes.first;
    final source = _LumaSource(
      bytes: yPlane.bytes,
      width: image.width,
      height: image.height,
      rowStride: yPlane.bytesPerRow,
    );
    final output = Uint8List(normalizedWidth * normalizedHeight);
    final topLeft = imageQuad[0];
    final topRight = imageQuad[1];
    final bottomRight = imageQuad[2];
    final bottomLeft = imageQuad[3];

    for (var y = 0; y < normalizedHeight; y += 1) {
      final v = (y + 0.5) / normalizedHeight;
      final left = _lerpOffset(topLeft, bottomLeft, v);
      final right = _lerpOffset(topRight, bottomRight, v);
      for (var x = 0; x < normalizedWidth; x += 1) {
        final u = (x + 0.5) / normalizedWidth;
        final point = _lerpOffset(left, right, u);
        output[(y * normalizedWidth) + x] = source.sample(point.dx, point.dy);
      }
    }

    return _NormalizedFrame(
      bytes: output,
      width: normalizedWidth,
      height: normalizedHeight,
      cardFillRatio: fillRatio,
      borderConfidence: hasDetectedQuad
          ? quadDetectorSnapshot?.confidence ?? 1.0
          : heuristicDisplayQuad != null
          ? 0.35
          : 0.0,
      selectedQuadSource: selectedQuadSource,
      appliedRotation: _normalizedRotation(sensorRotation),
      rawImageWidth: image.width,
      rawImageHeight: image.height,
      widthHeightSwapped: rightAngleRotation,
      displayAspectRatio: displayAspectRatio,
      displayQuadTargetAspect: displayQuadTargetAspect,
      detectorRegistered: quadDetectorSnapshot?.registered ?? false,
      detectorCalled: quadDetectorSnapshot?.called ?? false,
      detectorSuccess: quadDetectorSnapshot?.success ?? false,
      detectorConfidence: quadDetectorSnapshot?.confidence,
      detectorElapsedMs: quadDetectorSnapshot?.elapsedMs,
      detectorFailureReason: quadDetectorSnapshot?.failureReason,
      detectorDiagnostics: _detectorDiagnosticsForMetrics(
        quadDetectorSnapshot?.rawResponse,
      ),
      detectorDebugMasks: _detectorDebugMasksFromRawResponse(
        quadDetectorSnapshot?.rawResponse,
      ),
      quadOrderNormalizationResult: 'ordered_in_display_space',
      orderedDisplayQuad: orderedDisplayQuad,
      imageQuad: imageQuad,
    );
  }

  bool _nativeDetectorLooksUsable(
    ScannerV3QuadDetectorSnapshot? quadDetectorSnapshot,
  ) {
    if (quadDetectorSnapshot?.success != true) return false;
    final raw = quadDetectorSnapshot?.rawResponse;
    final diagnostics = raw == null ? null : raw['diagnostics'];
    final pipeline = diagnostics is Map
        ? diagnostics['pipeline']?.toString()
        : null;
    final source = diagnostics is Map
        ? diagnostics['selected_candidate_source']?.toString()
        : null;
    if (pipeline == 'recovered_center_quad_fallback' ||
        source == 'recovered_center_quad_fallback') {
      return false;
    }
    return true;
  }

  List<Offset>? _detectDisplayCardQuadFromFrame({
    required CameraImage image,
    required int sensorRotation,
    required double displayQuadTargetAspect,
  }) {
    if (image.format.group != ImageFormatGroup.yuv420 ||
        image.planes.length < 3) {
      return null;
    }

    const gridWidth = 96;
    const gridHeight = 160;
    const searchLeft = 0.10;
    const searchTop = 0.08;
    const searchRight = 0.90;
    const searchBottom = 0.94;

    final yPlane = image.planes[0];
    final uPlane = image.planes[1];
    final vPlane = image.planes[2];
    final chromaSamples = <int>[];
    final lumaSamples = <int>[];
    final chromaGrid = List<int>.filled(gridWidth * gridHeight, 0);
    final lumaGrid = List<int>.filled(gridWidth * gridHeight, 0);

    for (var gy = 0; gy < gridHeight; gy += 1) {
      final displayY = (gy + 0.5) / gridHeight;
      if (displayY < searchTop || displayY > searchBottom) continue;
      for (var gx = 0; gx < gridWidth; gx += 1) {
        final displayX = (gx + 0.5) / gridWidth;
        if (displayX < searchLeft || displayX > searchRight) continue;

        final imagePoint = _displayNormToImageNorm(
          Offset(displayX, displayY),
          sensorRotation,
        );
        final imageX = (imagePoint.dx.clamp(0.0, 1.0) * (image.width - 1))
            .round();
        final imageY = (imagePoint.dy.clamp(0.0, 1.0) * (image.height - 1))
            .round();
        final y = _samplePlane(
          bytes: yPlane.bytes,
          x: imageX,
          y: imageY,
          rowStride: yPlane.bytesPerRow,
          pixelStride: 1,
        );
        final u = _samplePlane(
          bytes: uPlane.bytes,
          x: imageX ~/ 2,
          y: imageY ~/ 2,
          rowStride: uPlane.bytesPerRow,
          pixelStride: uPlane.bytesPerPixel ?? 1,
        );
        final v = _samplePlane(
          bytes: vPlane.bytes,
          x: imageX ~/ 2,
          y: imageY ~/ 2,
          rowStride: vPlane.bytesPerRow,
          pixelStride: vPlane.bytesPerPixel ?? 1,
        );
        final chroma = (u - 128).abs() + (v - 128).abs();
        final index = (gy * gridWidth) + gx;
        chromaGrid[index] = chroma;
        lumaGrid[index] = y;
        chromaSamples.add(chroma);
        lumaSamples.add(y);
      }
    }

    if (chromaSamples.length < 50 || lumaSamples.length < 50) return null;
    chromaSamples.sort();
    lumaSamples.sort();
    final p88 = chromaSamples[(chromaSamples.length * 0.88).floor()];
    final p12 = lumaSamples[(lumaSamples.length * 0.12).floor()];
    final chromaThreshold = math.max(24, math.min(70, p88)).toInt();
    final darkThreshold = math.max(44, math.min(92, p12 + 10)).toInt();
    final mask = List<bool>.filled(gridWidth * gridHeight, false);

    for (var gy = 0; gy < gridHeight; gy += 1) {
      final displayY = (gy + 0.5) / gridHeight;
      if (displayY < searchTop || displayY > searchBottom) continue;
      for (var gx = 0; gx < gridWidth; gx += 1) {
        final displayX = (gx + 0.5) / gridWidth;
        if (displayX < searchLeft || displayX > searchRight) continue;
        final index = (gy * gridWidth) + gx;
        final luma = lumaGrid[index];
        final highChroma = chromaGrid[index] >= chromaThreshold && luma >= 28;
        final cardDark = luma <= darkThreshold && luma >= 8;
        if (highChroma || cardDark) {
          mask[index] = true;
        }
      }
    }

    final dilated = List<bool>.from(mask);
    for (var gy = 1; gy < gridHeight - 1; gy += 1) {
      for (var gx = 1; gx < gridWidth - 1; gx += 1) {
        final index = (gy * gridWidth) + gx;
        if (mask[index]) continue;
        var neighbors = 0;
        for (var oy = -1; oy <= 1; oy += 1) {
          for (var ox = -1; ox <= 1; ox += 1) {
            if (ox == 0 && oy == 0) continue;
            if (mask[((gy + oy) * gridWidth) + gx + ox]) {
              neighbors += 1;
            }
          }
        }
        if (neighbors >= 3) {
          dilated[index] = true;
        }
      }
    }

    final visited = List<bool>.filled(gridWidth * gridHeight, false);
    _GridComponent? best;
    var bestScore = -double.infinity;

    for (var gy = 0; gy < gridHeight; gy += 1) {
      for (var gx = 0; gx < gridWidth; gx += 1) {
        final start = (gy * gridWidth) + gx;
        if (!dilated[start] || visited[start]) continue;
        final component = _floodFillComponent(
          mask: dilated,
          visited: visited,
          gridWidth: gridWidth,
          gridHeight: gridHeight,
          startX: gx,
          startY: gy,
        );
        final widthNorm = component.width / gridWidth;
        final heightNorm = component.height / gridHeight;
        final areaNorm = widthNorm * heightNorm;
        if (component.count < 18 || areaNorm < 0.006 || areaNorm > 0.24) {
          continue;
        }

        final centerX = ((component.minX + component.maxX + 1) / 2) / gridWidth;
        final centerY =
            ((component.minY + component.maxY + 1) / 2) / gridHeight;
        if (centerX < 0.18 ||
            centerX > 0.82 ||
            centerY < 0.18 ||
            centerY > 0.88) {
          continue;
        }

        final portraitSignal = heightNorm / math.max(widthNorm, 0.01);
        final portraitPenalty =
            math.max(0, (portraitSignal - 1.45).abs() - 0.8) * 16;
        final centerPenalty =
            ((centerX - 0.5).abs() * 18) + ((centerY - 0.58).abs() * 10);
        final oversizedPenalty = areaNorm > 0.16 ? (areaNorm - 0.16) * 900 : 0;
        final score =
            component.count +
            (areaNorm * 120) -
            portraitPenalty -
            centerPenalty -
            oversizedPenalty;
        if (score > bestScore) {
          best = component;
          bestScore = score;
        }
      }
    }

    if (best == null) return null;

    var left = best.minX / gridWidth;
    var top = best.minY / gridHeight;
    var right = (best.maxX + 1) / gridWidth;
    var bottom = (best.maxY + 1) / gridHeight;

    left -= 0.018;
    right += 0.018;
    top -= 0.030;
    bottom += 0.050;

    const minWidth = 0.30;
    final minHeight = minWidth / displayQuadTargetAspect;
    final centerX = (left + right) / 2;
    final centerY = (top + bottom) / 2;
    var width = math.max(minWidth, right - left);
    var height = math.max(minHeight, bottom - top);
    final aspect = width / height;
    if (aspect > displayQuadTargetAspect) {
      height = width / displayQuadTargetAspect;
    } else {
      width = height * displayQuadTargetAspect;
    }

    left = centerX - (width / 2);
    right = centerX + (width / 2);
    top = centerY - (height / 2);
    bottom = centerY + (height / 2);

    final clamped = _clampDisplayRect(
      left: left,
      top: top,
      right: right,
      bottom: bottom,
    );
    final cropWidth = clamped.right - clamped.left;
    final cropHeight = clamped.bottom - clamped.top;
    if (cropWidth < 0.22 || cropHeight < 0.30) return null;

    return <Offset>[
      Offset(clamped.left, clamped.top),
      Offset(clamped.right, clamped.top),
      Offset(clamped.right, clamped.bottom),
      Offset(clamped.left, clamped.bottom),
    ];
  }

  void _exportLockArtifactsIfEnabled({
    required CameraImage image,
    required int sensorRotation,
    required _NormalizedFrame normalized,
    required ScannerV3QualitySnapshot quality,
  }) {
    if (!_exportArtifactsOnLock || _artifactExported || !_locked) {
      return;
    }

    _artifactExported = true;
    final rawFrameGray =
        _rawFramePreviewImage(image: image, sensorRotation: sensorRotation) ??
        ScannerV3ExportImage(
          bytes: Uint8List.fromList(normalized.bytes),
          width: normalized.width,
          height: normalized.height,
        );
    final normalizedFullCardGray = ScannerV3ExportImage(
      bytes: Uint8List.fromList(normalized.bytes),
      width: normalized.width,
      height: normalized.height,
    );
    final artworkRegionGray = _cropNormalizedFrame(
      normalized,
      const _NormRect(left: 0.08, top: 0.12, right: 0.92, bottom: 0.60),
    );
    final bottomBandGray = _cropNormalizedFrame(
      normalized,
      const _NormRect(left: 0, top: 0.72, right: 1, bottom: 0.98),
    );
    ScannerV3ExportImage? normalizedFullCardColor;
    ScannerV3ExportImage? artworkRegionColor;
    ScannerV3ExportImage? bottomBandColor;
    Object? colorConversionError;
    try {
      normalizedFullCardColor = _normalizedColorFrameFromYuv(
        image: image,
        imageQuad: normalized.imageQuad,
      );
      if (normalizedFullCardColor != null) {
        artworkRegionColor = _cropExportImage(
          normalizedFullCardColor,
          const _NormRect(left: 0.08, top: 0.12, right: 0.92, bottom: 0.60),
        );
        bottomBandColor = _cropExportImage(
          normalizedFullCardColor,
          const _NormRect(left: 0, top: 0.72, right: 1, bottom: 0.98),
        );
      }
    } catch (error) {
      colorConversionError = error;
      normalizedFullCardColor = null;
      artworkRegionColor = null;
      bottomBandColor = null;
    }
    final colorConversionSuccess =
        normalizedFullCardColor != null &&
        artworkRegionColor != null &&
        bottomBandColor != null;
    final metrics = <String, Object?>{
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'frames_seen': _frameCount,
      'frames_accepted': _acceptedFrameCount,
      'frames_rejected': _rejectedFrameCount,
      'lock_frame_index': _frameCount,
      'blur_score': quality.blurScore,
      'brightness': quality.brightnessScore,
      'glare_score': quality.glareRatio,
      'card_fill_ratio': quality.cardFillRatio,
      'border_confidence': normalized.borderConfidence,
      'rotation': sensorRotation,
      'sensor_orientation': sensorRotation,
      'raw_image_width': image.width,
      'raw_image_height': image.height,
      'normalized_width': normalized.width,
      'normalized_height': normalized.height,
      'applied_rotation': normalized.appliedRotation,
      'width_height_swapped': normalized.widthHeightSwapped,
      'display_aspect_ratio': normalized.displayAspectRatio,
      'display_quad_target_aspect': normalized.displayQuadTargetAspect,
      'detector_registered': normalized.detectorRegistered,
      'detector_called': normalized.detectorCalled,
      'detector_success': normalized.detectorSuccess,
      'detector_confidence': normalized.detectorConfidence,
      'detector_elapsed_ms': normalized.detectorElapsedMs,
      'detector_failure_reason': normalized.detectorFailureReason,
      'detector_diagnostics': normalized.detectorDiagnostics,
      'selected_quad_source': normalized.selectedQuadSource,
      'quad_order_normalization_result':
          normalized.quadOrderNormalizationResult,
      'ordered_display_quad_norm': _pointsToJson(normalized.orderedDisplayQuad),
      'image_quad_norm': _pointsToJson(normalized.imageQuad),
      'candidate_id': _lockedCandidateId,
      'identity_signal_source': _lastIdentitySignalSource,
      'identity_best_candidate_id': _lastVoteSnapshot.bestCandidate?.cardId,
      'identity_visual_locked_candidate_id': _lastVoteSnapshot.lockedCandidate,
      'identity_locked_candidate_id': _lastVoteSnapshot.acceptedCandidate,
      'identity_decision_candidate_id':
          _lastVoteSnapshot.decisionCandidate?.cardId,
      'identity_decision_state': _lastVoteSnapshot.identityDecisionState,
      'identity_decision_reason': _lastVoteSnapshot.identityDecisionReason,
      'identity_confidence': _lastVoteSnapshot.confidence,
      'identity_score_gap': _lastVoteSnapshot.scoreGap,
      'identity_top1_score': _lastVoteSnapshot.topCandidateScore,
      'identity_top2_score': _lastVoteSnapshot.secondCandidateScore,
      'identity_frame_score_gap': _lastVoteSnapshot.candidateFrameScoreGap,
      'identity_crop_support_count':
          _lastVoteSnapshot.candidateCropSupportCount,
      'identity_recent_frame_support_count':
          _lastVoteSnapshot.candidateRecentTopFiveCount,
      'identity_top_distance': _lastVoteSnapshot.candidateDistance,
      'identity_top_similarity': _lastVoteSnapshot.candidateSimilarity,
      'identity_vote_updates': _lastVoteSnapshot.updates,
      'embedding_elapsed_ms': _lastEmbeddingElapsedMs,
      'vector_search_elapsed_ms': _lastVectorSearchElapsedMs,
      'rerank_elapsed_ms': _lastRerankElapsedMs,
      'identity_pipeline_elapsed_ms': _lastIdentityPipelineElapsedMs,
      'vector_candidate_count': _lastVectorCandidateCount,
      'identity_crop_count': _lastIdentityCropCount,
      'identity_successful_crop_count': _lastSuccessfulIdentityCropCount,
      'identity_unified_candidate_count': _lastUnifiedIdentityCandidateCount,
      'identity_errors': _lastIdentityErrors,
      'locked': _locked,
      'normalization_source': normalized.selectedQuadSource,
      'color_artifacts_enabled': true,
      'color_source_format': 'yuv420_to_rgba8888_nearest_neighbor',
      'color_conversion_success': colorConversionSuccess,
      'color_conversion_error': colorConversionError?.toString(),
      'color_normalized_width': normalizedFullCardColor?.width,
      'color_normalized_height': normalizedFullCardColor?.height,
      'grayscale_normalized_width': normalizedFullCardGray.width,
      'grayscale_normalized_height': normalizedFullCardGray.height,
    };

    unawaited(
      exportLockArtifacts(
        rawFrameGray: rawFrameGray,
        normalizedFullCardGray: normalizedFullCardGray,
        artworkRegionGray: artworkRegionGray,
        bottomBandGray: bottomBandGray,
        normalizedFullCardColor: normalizedFullCardColor,
        artworkRegionColor: artworkRegionColor,
        bottomBandColor: bottomBandColor,
        debugArtifacts: normalized.detectorDebugMasks,
        metrics: metrics,
      ).then((result) {
        onLockArtifactExported?.call(result);
      }),
    );
  }

  ScannerV3ExportImage? _rawFramePreviewImage({
    required CameraImage image,
    required int sensorRotation,
  }) {
    if (image.format.group != ImageFormatGroup.yuv420 || image.planes.isEmpty) {
      return null;
    }

    final rotated = _isRightAngleRotation(sensorRotation);
    final displayWidth = rotated ? image.height : image.width;
    final displayHeight = rotated ? image.width : image.height;
    if (displayWidth <= 0 || displayHeight <= 0) {
      return null;
    }

    const maxLongEdge = 900;
    final scale = math.min(
      1.0,
      maxLongEdge / math.max(displayWidth, displayHeight),
    );
    final outputWidth = math.max(1, (displayWidth * scale).round());
    final outputHeight = math.max(1, (displayHeight * scale).round());
    final yPlane = image.planes.first;
    final source = _LumaSource(
      bytes: yPlane.bytes,
      width: image.width,
      height: image.height,
      rowStride: yPlane.bytesPerRow,
    );
    final output = Uint8List(outputWidth * outputHeight);

    for (var y = 0; y < outputHeight; y += 1) {
      final normY = (y + 0.5) / outputHeight;
      for (var x = 0; x < outputWidth; x += 1) {
        final normX = (x + 0.5) / outputWidth;
        final imagePoint = _displayNormToImageNorm(
          Offset(normX, normY),
          sensorRotation,
        );
        output[(y * outputWidth) + x] = source.sample(
          imagePoint.dx,
          imagePoint.dy,
        );
      }
    }

    return ScannerV3ExportImage(
      bytes: output,
      width: outputWidth,
      height: outputHeight,
    );
  }

  ScannerV3ExportImage? _normalizedColorFrameFromYuv({
    required CameraImage image,
    required List<Offset> imageQuad,
  }) {
    if (image.format.group != ImageFormatGroup.yuv420 ||
        image.planes.length < 3 ||
        imageQuad.length != 4) {
      return null;
    }

    final source = _Yuv420Source.fromImage(image);
    final output = Uint8List(normalizedWidth * normalizedHeight * 4);
    final topLeft = imageQuad[0];
    final topRight = imageQuad[1];
    final bottomRight = imageQuad[2];
    final bottomLeft = imageQuad[3];

    for (var y = 0; y < normalizedHeight; y += 1) {
      final v = (y + 0.5) / normalizedHeight;
      final left = _lerpOffset(topLeft, bottomLeft, v);
      final right = _lerpOffset(topRight, bottomRight, v);
      for (var x = 0; x < normalizedWidth; x += 1) {
        final u = (x + 0.5) / normalizedWidth;
        final point = _lerpOffset(left, right, u);
        source.sampleRgba(
          point.dx,
          point.dy,
          output,
          ((y * normalizedWidth) + x) * 4,
        );
      }
    }

    return ScannerV3ExportImage(
      bytes: output,
      width: normalizedWidth,
      height: normalizedHeight,
      format: ScannerV3ExportImageFormat.rgba8888,
    );
  }

  ScannerV3ExportImage _cropNormalizedFrame(
    _NormalizedFrame frame,
    _NormRect rect,
  ) {
    final left = (rect.left * frame.width).round().clamp(0, frame.width - 1);
    final top = (rect.top * frame.height).round().clamp(0, frame.height - 1);
    final right = (rect.right * frame.width).round().clamp(
      left + 1,
      frame.width,
    );
    final bottom = (rect.bottom * frame.height).round().clamp(
      top + 1,
      frame.height,
    );
    final width = right - left;
    final height = bottom - top;
    final output = Uint8List(width * height);

    for (var y = 0; y < height; y += 1) {
      final sourceStart = ((top + y) * frame.width) + left;
      final targetStart = y * width;
      output.setRange(
        targetStart,
        targetStart + width,
        frame.bytes,
        sourceStart,
      );
    }

    return ScannerV3ExportImage(bytes: output, width: width, height: height);
  }

  ScannerV3ExportImage _cropExportImage(
    ScannerV3ExportImage image,
    _NormRect rect,
  ) {
    final left = (rect.left * image.width).round().clamp(0, image.width - 1);
    final top = (rect.top * image.height).round().clamp(0, image.height - 1);
    final right = (rect.right * image.width).round().clamp(
      left + 1,
      image.width,
    );
    final bottom = (rect.bottom * image.height).round().clamp(
      top + 1,
      image.height,
    );
    final width = right - left;
    final height = bottom - top;
    final bytesPerPixel = image.format == ScannerV3ExportImageFormat.rgba8888
        ? 4
        : 1;
    final output = Uint8List(width * height * bytesPerPixel);

    for (var y = 0; y < height; y += 1) {
      final sourceStart = (((top + y) * image.width) + left) * bytesPerPixel;
      final targetStart = y * width * bytesPerPixel;
      output.setRange(
        targetStart,
        targetStart + (width * bytesPerPixel),
        image.bytes,
        sourceStart,
      );
    }

    return ScannerV3ExportImage(
      bytes: output,
      width: width,
      height: height,
      format: image.format,
    );
  }

  List<Offset> _centerDisplayCardQuad(double displayQuadTargetAspect) {
    const width = 0.76;
    final height = width / displayQuadTargetAspect;
    const left = (1 - width) / 2;
    const top = 0.02;
    final bottom = math.min(0.98, top + height);
    return <Offset>[
      const Offset(left, top),
      const Offset(left + width, top),
      Offset(left + width, bottom),
      Offset(left, bottom),
    ];
  }

  List<Offset>? _displayOrderedImageQuad(
    List<Offset> orderedDisplayQuad,
    int rotation,
  ) {
    final imagePoints = orderedDisplayQuad
        .map((point) => _displayNormToImageNorm(point, rotation))
        .toList(growable: false);
    if (_polygonArea(imagePoints).abs() < 0.01) {
      return null;
    }
    return imagePoints;
  }

  Offset _displayNormToImageNorm(Offset point, int rotation) {
    return switch (_normalizedRotation(rotation)) {
      90 => Offset(point.dy, 1 - point.dx),
      180 => Offset(1 - point.dx, 1 - point.dy),
      270 => Offset(1 - point.dy, point.dx),
      _ => point,
    };
  }

  int _normalizedRotation(int rotation) {
    return ((rotation % 360) + 360) % 360;
  }

  bool _isRightAngleRotation(int rotation) {
    final normalizedRotation = _normalizedRotation(rotation);
    return normalizedRotation == 90 || normalizedRotation == 270;
  }

  List<Map<String, double>> _pointsToJson(List<Offset> points) {
    return points
        .map((point) => <String, double>{'x': point.dx, 'y': point.dy})
        .toList(growable: false);
  }

  Map<String, Object?>? _detectorDiagnosticsForMetrics(
    Map<String, dynamic>? rawResponse,
  ) {
    final diagnostics = rawResponse?['diagnostics'];
    if (diagnostics is! Map) return null;
    return _jsonSafeMap(
      diagnostics,
      excludeKeys: const <String>{'debug_masks'},
    );
  }

  Map<String, ScannerV3ExportImage> _detectorDebugMasksFromRawResponse(
    Map<String, dynamic>? rawResponse,
  ) {
    final diagnostics = rawResponse?['diagnostics'];
    if (diagnostics is! Map) return const <String, ScannerV3ExportImage>{};
    final debugMasks = diagnostics['debug_masks'];
    if (debugMasks is! Map) return const <String, ScannerV3ExportImage>{};
    final width = debugMasks['width'];
    final height = debugMasks['height'];
    final masks = debugMasks['masks'];
    if (width is! num || height is! num || masks is! Map) {
      return const <String, ScannerV3ExportImage>{};
    }
    final maskWidth = width.toInt();
    final maskHeight = height.toInt();
    if (maskWidth <= 0 || maskHeight <= 0) {
      return const <String, ScannerV3ExportImage>{};
    }

    final images = <String, ScannerV3ExportImage>{};
    for (final entry in masks.entries) {
      final key = entry.key?.toString();
      final value = entry.value;
      if (key == null || value is! Uint8List) continue;
      if (value.length < maskWidth * maskHeight) continue;
      images[key] = ScannerV3ExportImage(
        bytes: value,
        width: maskWidth,
        height: maskHeight,
      );
    }
    return images;
  }

  Map<String, Object?> _jsonSafeMap(
    Map<dynamic, dynamic> source, {
    Set<String> excludeKeys = const <String>{},
  }) {
    final output = <String, Object?>{};
    for (final entry in source.entries) {
      final key = entry.key?.toString();
      if (key == null || excludeKeys.contains(key)) continue;
      output[key] = _jsonSafeValue(entry.value);
    }
    return output;
  }

  Object? _jsonSafeValue(Object? value) {
    if (value == null || value is String || value is num || value is bool) {
      return value;
    }
    if (value is Uint8List) {
      return '<${value.length} bytes>';
    }
    if (value is List) {
      return value.map(_jsonSafeValue).toList(growable: false);
    }
    if (value is Map) {
      return _jsonSafeMap(value);
    }
    return value.toString();
  }

  int _samplePlane({
    required Uint8List bytes,
    required int x,
    required int y,
    required int rowStride,
    required int pixelStride,
  }) {
    final offset = (y * rowStride) + (x * pixelStride);
    if (offset < 0 || offset >= bytes.length) {
      return 128;
    }
    return bytes[offset];
  }

  _GridComponent _floodFillComponent({
    required List<bool> mask,
    required List<bool> visited,
    required int gridWidth,
    required int gridHeight,
    required int startX,
    required int startY,
  }) {
    final queueX = <int>[startX];
    final queueY = <int>[startY];
    visited[(startY * gridWidth) + startX] = true;
    var cursor = 0;
    var count = 0;
    var minX = startX;
    var maxX = startX;
    var minY = startY;
    var maxY = startY;

    while (cursor < queueX.length) {
      final x = queueX[cursor];
      final y = queueY[cursor];
      cursor += 1;
      count += 1;
      minX = math.min(minX, x);
      maxX = math.max(maxX, x);
      minY = math.min(minY, y);
      maxY = math.max(maxY, y);

      const neighbors = <(int, int)>[(-1, 0), (1, 0), (0, -1), (0, 1)];
      for (final (offsetX, offsetY) in neighbors) {
        final nextX = x + offsetX;
        final nextY = y + offsetY;
        if (nextX < 0 ||
            nextX >= gridWidth ||
            nextY < 0 ||
            nextY >= gridHeight) {
          continue;
        }
        final index = (nextY * gridWidth) + nextX;
        if (!mask[index] || visited[index]) continue;
        visited[index] = true;
        queueX.add(nextX);
        queueY.add(nextY);
      }
    }

    return _GridComponent(
      count: count,
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
    );
  }

  _NormRect _clampDisplayRect({
    required double left,
    required double top,
    required double right,
    required double bottom,
  }) {
    var width = right - left;
    var height = bottom - top;
    var centerX = (left + right) / 2;
    var centerY = (top + bottom) / 2;

    width = math.min(width, 0.96);
    height = math.min(height, 0.96);
    left = centerX - (width / 2);
    right = centerX + (width / 2);
    top = centerY - (height / 2);
    bottom = centerY + (height / 2);

    if (left < 0) {
      right -= left;
      left = 0;
    }
    if (right > 1) {
      left -= right - 1;
      right = 1;
    }
    if (top < 0) {
      bottom -= top;
      top = 0;
    }
    if (bottom > 1) {
      top -= bottom - 1;
      bottom = 1;
    }

    return _NormRect(
      left: left.clamp(0.0, 1.0),
      top: top.clamp(0.0, 1.0),
      right: right.clamp(0.0, 1.0),
      bottom: bottom.clamp(0.0, 1.0),
    );
  }

  List<Offset>? _orderQuad(List<Offset> points) {
    if (points.length != 4) return null;

    Offset? topLeft;
    Offset? topRight;
    Offset? bottomRight;
    Offset? bottomLeft;
    var minSum = double.infinity;
    var maxSum = -double.infinity;
    var minDiff = double.infinity;
    var maxDiff = -double.infinity;

    for (final point in points) {
      final sum = point.dx + point.dy;
      final diff = point.dx - point.dy;
      if (sum < minSum) {
        minSum = sum;
        topLeft = point;
      }
      if (sum > maxSum) {
        maxSum = sum;
        bottomRight = point;
      }
      if (diff < minDiff) {
        minDiff = diff;
        bottomLeft = point;
      }
      if (diff > maxDiff) {
        maxDiff = diff;
        topRight = point;
      }
    }

    if (topLeft == null ||
        topRight == null ||
        bottomRight == null ||
        bottomLeft == null) {
      return null;
    }

    return <Offset>[topLeft, topRight, bottomRight, bottomLeft];
  }

  Offset _lerpOffset(Offset a, Offset b, double t) {
    return Offset(a.dx + ((b.dx - a.dx) * t), a.dy + ((b.dy - a.dy) * t));
  }

  double _polygonArea(List<Offset> points) {
    if (points.length < 3) return 0;
    var sum = 0.0;
    for (var i = 0; i < points.length; i += 1) {
      final next = points[(i + 1) % points.length];
      sum += (points[i].dx * next.dy) - (next.dx * points[i].dy);
    }
    return sum / 2;
  }

  ScannerV3QualitySnapshot _measureQuality(_NormalizedFrame frame) {
    final brightness = _meanBrightness(frame);
    final glare = _highlightRatio(frame);
    final blur = _blurScore(frame);
    final reasons = <String>[];

    if (blur < minBlurScore) {
      reasons.add('blur_below_threshold');
    }
    if (brightness < minBrightnessScore) {
      reasons.add('brightness_too_low');
    }
    if (brightness > maxBrightnessScore) {
      reasons.add('brightness_too_high');
    }
    if (glare > maxGlareRatio) {
      reasons.add('glare_above_threshold');
    }
    if (frame.cardFillRatio < minCardFillRatio) {
      reasons.add('card_fill_ratio_below_threshold');
    }

    return ScannerV3QualitySnapshot(
      blurScore: blur,
      brightnessScore: brightness,
      glareRatio: glare,
      cardFillRatio: frame.cardFillRatio,
      accepted: reasons.isEmpty,
      rejectionReasons: reasons,
    );
  }

  _CardPresentDecision _evaluateCardPresent(
    _NormalizedFrame frame,
    ScannerV3QualitySnapshot quality,
  ) {
    if (!quality.accepted) {
      return _CardPresentDecision(
        present: false,
        reason: _cardAbsentReasonForQuality(quality),
      );
    }
    if (frame.cardFillRatio < minCardFillRatio ||
        frame.cardFillRatio > maxCardFillRatio) {
      return const _CardPresentDecision(
        present: false,
        reason: 'fill_ratio_invalid',
      );
    }

    final hasNativeQuad = frame.selectedQuadSource == 'native_detector' &&
        frame.detectorSuccess;
    final hasStrongFallback = frame.selectedQuadSource == 'yuv_fallback' &&
        frame.borderConfidence >= minFallbackBorderConfidence;
    if (!hasNativeQuad && !hasStrongFallback) {
      return const _CardPresentDecision(present: false, reason: 'no_quad');
    }

    if (hasNativeQuad &&
        (frame.detectorConfidence ?? 0) < minNativeDetectorConfidence) {
      return const _CardPresentDecision(
        present: false,
        reason: 'low_detector_confidence',
      );
    }
    if (hasStrongFallback &&
        (frame.cardFillRatio < minFallbackCardFillRatio ||
            frame.cardFillRatio > maxFallbackCardFillRatio)) {
      return const _CardPresentDecision(
        present: false,
        reason: 'fill_ratio_invalid',
      );
    }

    final fullCardStats = _lumaStats(
      frame,
      const _NormRect(left: 0, top: 0, right: 1, bottom: 1),
    );
    if (fullCardStats.stdDev < minArtworkLumaStdDev * 0.55) {
      return const _CardPresentDecision(
        present: false,
        reason: 'normalized_empty',
      );
    }

    final artworkStats = _lumaStats(
      frame,
      const _NormRect(left: 0.08, top: 0.12, right: 0.92, bottom: 0.60),
    );
    if (artworkStats.stdDev < minArtworkLumaStdDev ||
        artworkStats.foregroundRatio < minArtworkForegroundRatio ||
        artworkStats.foregroundRatio > maxArtworkForegroundRatio) {
      return const _CardPresentDecision(
        present: false,
        reason: 'artwork_background_dominant',
      );
    }
    if (hasStrongFallback &&
        (artworkStats.stdDev < minFallbackArtworkLumaStdDev ||
            artworkStats.foregroundRatio < minFallbackArtworkForegroundRatio)) {
      return const _CardPresentDecision(
        present: false,
        reason: 'artwork_background_dominant',
      );
    }

    return const _CardPresentDecision(
      present: true,
      reason: 'card_present',
    );
  }

  String _cardAbsentReasonForQuality(ScannerV3QualitySnapshot quality) {
    final reasons = quality.rejectionReasons;
    if (reasons.contains('card_fill_ratio_below_threshold')) {
      return 'fill_ratio_invalid';
    }
    if (reasons.contains('blur_below_threshold') ||
        reasons.contains('brightness_too_low') ||
        reasons.contains('brightness_too_high') ||
        reasons.contains('glare_above_threshold')) {
      return 'blur_or_brightness_invalid';
    }
    return reasons.isEmpty ? 'card_present_unknown' : reasons.first;
  }

  _LumaStats _lumaStats(_NormalizedFrame frame, _NormRect rect) {
    final step = math.max(1, frame.height ~/ 180);
    final left = (rect.left * (frame.width - 1)).round().clamp(
      0,
      frame.width - 1,
    );
    final right = (rect.right * (frame.width - 1)).round().clamp(
      left + 1,
      frame.width,
    );
    final top = (rect.top * (frame.height - 1)).round().clamp(
      0,
      frame.height - 1,
    );
    final bottom = (rect.bottom * (frame.height - 1)).round().clamp(
      top + 1,
      frame.height,
    );

    var sum = 0.0;
    var sumSquares = 0.0;
    var foreground = 0;
    var count = 0;
    for (var y = top; y < bottom; y += step) {
      for (var x = left; x < right; x += step) {
        final value = frame.bytes[(y * frame.width) + x] / 255.0;
        sum += value;
        sumSquares += value * value;
        if (value < 0.22 || value > 0.78) {
          foreground += 1;
        }
        count += 1;
      }
    }
    if (count == 0) return const _LumaStats(stdDev: 0, foregroundRatio: 0);
    final mean = sum / count;
    final variance = math.max(0.0, (sumSquares / count) - (mean * mean));
    return _LumaStats(
      stdDev: math.sqrt(variance),
      foregroundRatio: foreground / count,
    );
  }

  double _meanBrightness(_NormalizedFrame frame) {
    final step = math.max(1, frame.height ~/ 180);
    var sum = 0;
    var count = 0;
    for (var y = 0; y < frame.height; y += step) {
      for (var x = 0; x < frame.width; x += step) {
        sum += frame.bytes[(y * frame.width) + x];
        count += 1;
      }
    }
    return count == 0 ? 0 : (sum / count) / 255;
  }

  double _highlightRatio(_NormalizedFrame frame) {
    final step = math.max(1, frame.height ~/ 180);
    var highlighted = 0;
    var count = 0;
    for (var y = 0; y < frame.height; y += step) {
      for (var x = 0; x < frame.width; x += step) {
        if (frame.bytes[(y * frame.width) + x] >= 245) {
          highlighted += 1;
        }
        count += 1;
      }
    }
    return count == 0 ? 0 : highlighted / count;
  }

  double _blurScore(_NormalizedFrame frame) {
    final step = math.max(1, frame.height ~/ 220);
    var sum = 0.0;
    var count = 0;
    for (var y = step; y < frame.height - step; y += step) {
      for (var x = step; x < frame.width - step; x += step) {
        final center = frame.bytes[(y * frame.width) + x];
        final left = frame.bytes[(y * frame.width) + x - step];
        final right = frame.bytes[(y * frame.width) + x + step];
        final up = frame.bytes[((y - step) * frame.width) + x];
        final down = frame.bytes[((y + step) * frame.width) + x];
        sum += ((center * 4) - left - right - up - down).abs();
        count += 1;
      }
    }
    return count == 0 ? 0 : (sum / count) / 255;
  }

  String _dHash(Uint8List bytes, int width, int height, _NormRect rect) {
    var hash = BigInt.zero;
    var bitIndex = 0;
    for (var y = 0; y < 8; y += 1) {
      for (var x = 0; x < 8; x += 1) {
        final left = _sampleRect(bytes, width, height, rect, x, y);
        final right = _sampleRect(bytes, width, height, rect, x + 1, y);
        if (left > right) {
          hash |= BigInt.one << bitIndex;
        }
        bitIndex += 1;
      }
    }
    return hash.toRadixString(16).padLeft(16, '0');
  }

  int _sampleRect(
    Uint8List bytes,
    int width,
    int height,
    _NormRect rect,
    int sampleX,
    int sampleY,
  ) {
    final xNorm = rect.left + (((sampleX + 0.5) / 9) * rect.width);
    final yNorm = rect.top + (((sampleY + 0.5) / 8) * rect.height);
    final x = (xNorm * (width - 1)).round().clamp(0, width - 1);
    final y = (yNorm * (height - 1)).round().clamp(0, height - 1);
    return bytes[(y * width) + x];
  }

  _TrackedCandidate _matchOrCreateCandidate({
    required String fullHash,
    required String artworkHash,
  }) {
    _TrackedCandidate? best;
    var bestDistance = 129;
    for (final candidate in _candidates.values) {
      final distance =
          _hammingDistance(fullHash, candidate.fullCardHash) +
          _hammingDistance(artworkHash, candidate.artworkHash);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }

    if (best != null && bestDistance <= candidateDistanceThreshold) {
      best.lastDistance = bestDistance;
      return best;
    }

    final id =
        'v3_${(_nextCandidateIndex++).toString().padLeft(2, '0')}_'
        '${fullHash.substring(0, 4)}${artworkHash.substring(0, 4)}';
    final candidate = _TrackedCandidate(
      id: id,
      score: 0,
      occurrences: 0,
      lastSeenFrame: _frameCount,
      fullCardHash: fullHash,
      artworkHash: artworkHash,
      lastDistance: 0,
    );
    _candidates[id] = candidate;
    return candidate;
  }

  void _rewardCandidate(
    _TrackedCandidate candidate, {
    required String fullHash,
    required String artworkHash,
  }) {
    final closeness =
        1 -
        (candidate.lastDistance / candidateDistanceThreshold).clamp(0.0, 1.0);
    candidate
      ..score += 5.0 + (closeness * 3.0)
      ..occurrences += 1
      ..lastSeenFrame = _frameCount
      ..fullCardHash = fullHash
      ..artworkHash = artworkHash;
  }

  void _decayCandidates({String? exceptId}) {
    final removeIds = <String>[];
    for (final candidate in _candidates.values) {
      if (candidate.id == exceptId) continue;
      candidate.score *= 0.82;
      if (_frameCount - candidate.lastSeenFrame > 12 && candidate.score < 1) {
        removeIds.add(candidate.id);
      }
    }
    for (final id in removeIds) {
      _candidates.remove(id);
    }
  }

  bool _hashClusterWouldLock() {
    final ranked = _rankedCandidates();
    if (ranked.isEmpty) return false;
    final best = ranked.first;
    final secondScore = ranked.length > 1 ? ranked[1].score : 0.0;
    final gap = best.score - secondScore;
    final recent = _frameCount - best.lastSeenFrame <= 2;
    return best.occurrences >= minAcceptedFramesToLock &&
        gap >= lockScoreGap &&
        recent;
  }

  ScannerV3LiveLoopState _publishState({
    required ScannerV3QualitySnapshot quality,
    required String decisionReason,
    required int elapsedMs,
    required String selectedQuadSource,
    required double? detectorConfidence,
    required int? detectorElapsedMs,
    bool cardPresent = true,
    String? cardPresentReason,
  }) {
    final rankedHashCandidates = _rankedCandidates();
    final voteSnapshot = _lastVoteSnapshot;
    final voteCandidateStates = voteSnapshot.rankedCandidates
        .take(5)
        .map(
          (candidate) => CandidateState(
            id: candidate.cardId,
            score: candidate.score,
            occurrences: candidate.occurrences,
            lastSeenFrame: candidate.lastSeenFrame,
            source: 'embedding_vector_vote',
            vectorDistance: candidate.lastDistance,
            topFiveOccurrences: candidate.topFiveOccurrences,
            bestRank: candidate.bestRank,
            cropContributionCount: candidate.bestCropContributionCount,
            recentTopFiveCount: candidate.recentTopFiveFrames.length,
            similarity: candidate.bestSimilarity,
            aggregateScore: candidate.bestAggregateScore,
            rerankScore: candidate.bestRerankScore,
            name: candidate.name,
            setCode: candidate.setCode,
            number: candidate.number,
            gvId: candidate.gvId,
            imageUrl: candidate.imageUrl,
          ),
        )
        .toList(growable: false);
    final candidateStates = voteCandidateStates.isNotEmpty
        ? voteCandidateStates
        : rankedHashCandidates.map((candidate) => candidate.toState()).toList();
    final bestIdentity = voteSnapshot.bestCandidate;
    final bestHash = rankedHashCandidates.isEmpty
        ? null
        : rankedHashCandidates.first;
    final confidence = voteSnapshot.confidence;
    final hashClusterReady = _hashClusterWouldLock();
    final identityServiceError = _identityServiceErrorFor(
      signalSource: _lastIdentitySignalSource,
      errors: _lastIdentityErrors,
      decisionReason: decisionReason,
    );

    _state = ScannerV3LiveLoopState(
      frameCount: _frameCount,
      sampledFrameCount: _sampledFrameCount,
      acceptedFrameCount: _acceptedFrameCount,
      rejectedFrameCount: _rejectedFrameCount,
      locked: _locked,
      currentBestCandidateId: bestIdentity?.cardId ?? bestHash?.id,
      lockedCandidateId: _lockedCandidateId,
      confidenceScore: confidence,
      candidates: candidateStates,
      quality: quality,
      statusText: _statusTextForIdentityDecision(
        voteSnapshot.identityDecisionState,
      ),
      lastDecisionReason: hashClusterReady
          ? '$decisionReason;hash_cluster_ready_debug_only'
          : decisionReason,
      lastSampleElapsedMs: elapsedMs,
      selectedQuadSource: selectedQuadSource,
      detectorConfidence: detectorConfidence,
      detectorElapsedMs: detectorElapsedMs,
      embeddingElapsedMs: _lastEmbeddingElapsedMs,
      vectorSearchElapsedMs: _lastVectorSearchElapsedMs,
      vectorCandidateCount: _lastVectorCandidateCount,
      identitySignalSource: _lastIdentitySignalSource,
      identityDecisionState: voteSnapshot.identityDecisionState,
      identityDecisionReason: voteSnapshot.identityDecisionReason,
      identityScoreGap: voteSnapshot.scoreGap,
      identityTopCandidateScore: voteSnapshot.topCandidateScore,
      identitySecondCandidateScore: voteSnapshot.secondCandidateScore,
      identityFrameScoreGap: voteSnapshot.candidateFrameScoreGap,
      identityCropSupportCount: voteSnapshot.candidateCropSupportCount,
      identityRecentFrameSupportCount: voteSnapshot.candidateRecentTopFiveCount,
      identityTopDistance: voteSnapshot.candidateDistance,
      identityTopSimilarity: voteSnapshot.candidateSimilarity,
      identityServiceUnavailable: identityServiceError != null,
      identityServiceError: identityServiceError,
      cardPresent: cardPresent,
      cardPresentReason: cardPresentReason,
    );
    return _state;
  }

  String? _identityServiceErrorFor({
    required String signalSource,
    required List<String> errors,
    required String decisionReason,
  }) {
    final shouldInspect =
        signalSource == 'identity_error' ||
        signalSource == 'v8_multicrop_identity_no_successful_crops' ||
        decisionReason.startsWith('identity_error:') ||
        decisionReason.startsWith('identity_no_v8_candidates:');
    if (!shouldInspect) return null;

    final text = <String>[...errors, decisionReason].join(' ').toLowerCase();
    if (text.contains('endpoint_not_configured')) {
      return 'identity_endpoint_not_configured';
    }
    if (text.contains('invalid_embedding_endpoint') ||
        text.contains('invalid_vector_endpoint')) {
      return 'identity_endpoint_invalid';
    }
    if (text.contains('socketexception') ||
        text.contains('connection refused') ||
        text.contains('failed host lookup') ||
        text.contains('connection timed out') ||
        text.contains('timeoutexception')) {
      return 'identity_service_unreachable';
    }
    if (text.contains('embedding_http_') ||
        text.contains('vector_http_') ||
        text.contains('request_body_too_large') ||
        text.contains('missing_embedding') ||
        text.contains('missing_image_b64')) {
      return 'identity_service_error';
    }
    return null;
  }

  String _statusTextForIdentityDecision(String decisionState) {
    if (decisionState == IdentityDecisionStateV1.identityLocked) {
      return 'Locked';
    }
    if (decisionState == IdentityDecisionStateV1.candidateUnknown) {
      return 'Unknown';
    }
    if (decisionState == IdentityDecisionStateV1.candidateAmbiguous) {
      return 'Ambiguous';
    }
    return 'Scanning...';
  }

  List<_TrackedCandidate> _rankedCandidates() {
    final ranked = _candidates.values.toList();
    ranked.sort((a, b) => b.score.compareTo(a.score));
    return ranked;
  }

  int _hammingDistance(String first, String second) {
    if (first.length != second.length) return 64;
    var value =
        BigInt.parse(first, radix: 16) ^ BigInt.parse(second, radix: 16);
    var distance = 0;
    while (value > BigInt.zero) {
      if ((value & BigInt.one) == BigInt.one) {
        distance += 1;
      }
      value >>= 1;
    }
    return distance;
  }
}

class _NormalizedFrame {
  const _NormalizedFrame({
    required this.bytes,
    required this.width,
    required this.height,
    required this.cardFillRatio,
    required this.borderConfidence,
    required this.selectedQuadSource,
    required this.appliedRotation,
    required this.rawImageWidth,
    required this.rawImageHeight,
    required this.widthHeightSwapped,
    required this.displayAspectRatio,
    required this.displayQuadTargetAspect,
    required this.detectorRegistered,
    required this.detectorCalled,
    required this.detectorSuccess,
    required this.detectorConfidence,
    required this.detectorElapsedMs,
    required this.detectorFailureReason,
    required this.detectorDiagnostics,
    required this.detectorDebugMasks,
    required this.quadOrderNormalizationResult,
    required this.orderedDisplayQuad,
    required this.imageQuad,
  });

  final Uint8List bytes;
  final int width;
  final int height;
  final double cardFillRatio;
  final double borderConfidence;
  final String selectedQuadSource;
  final int appliedRotation;
  final int rawImageWidth;
  final int rawImageHeight;
  final bool widthHeightSwapped;
  final double displayAspectRatio;
  final double displayQuadTargetAspect;
  final bool detectorRegistered;
  final bool detectorCalled;
  final bool detectorSuccess;
  final double? detectorConfidence;
  final int? detectorElapsedMs;
  final String? detectorFailureReason;
  final Map<String, Object?>? detectorDiagnostics;
  final Map<String, ScannerV3ExportImage> detectorDebugMasks;
  final String quadOrderNormalizationResult;
  final List<Offset> orderedDisplayQuad;
  final List<Offset> imageQuad;
}

class _CardPresentDecision {
  const _CardPresentDecision({required this.present, required this.reason});

  final bool present;
  final String reason;
}

class _LumaStats {
  const _LumaStats({required this.stdDev, required this.foregroundRatio});

  final double stdDev;
  final double foregroundRatio;
}

class _LumaSource {
  const _LumaSource({
    required this.bytes,
    required this.width,
    required this.height,
    required this.rowStride,
  });

  final Uint8List bytes;
  final int width;
  final int height;
  final int rowStride;

  int sample(double normX, double normY) {
    final x = (normX.clamp(0.0, 1.0) * (width - 1)).round();
    final y = (normY.clamp(0.0, 1.0) * (height - 1)).round();
    final offset = (y * rowStride) + x;
    if (offset < 0 || offset >= bytes.length) {
      return 0;
    }
    return bytes[offset];
  }
}

class _Yuv420Source {
  const _Yuv420Source({
    required this.yBytes,
    required this.uBytes,
    required this.vBytes,
    required this.width,
    required this.height,
    required this.yRowStride,
    required this.yPixelStride,
    required this.uRowStride,
    required this.uPixelStride,
    required this.vRowStride,
    required this.vPixelStride,
  });

  factory _Yuv420Source.fromImage(CameraImage image) {
    final yPlane = image.planes[0];
    final uPlane = image.planes[1];
    final vPlane = image.planes[2];
    return _Yuv420Source(
      yBytes: yPlane.bytes,
      uBytes: uPlane.bytes,
      vBytes: vPlane.bytes,
      width: image.width,
      height: image.height,
      yRowStride: yPlane.bytesPerRow,
      yPixelStride: yPlane.bytesPerPixel ?? 1,
      uRowStride: uPlane.bytesPerRow,
      uPixelStride: uPlane.bytesPerPixel ?? 1,
      vRowStride: vPlane.bytesPerRow,
      vPixelStride: vPlane.bytesPerPixel ?? 1,
    );
  }

  final Uint8List yBytes;
  final Uint8List uBytes;
  final Uint8List vBytes;
  final int width;
  final int height;
  final int yRowStride;
  final int yPixelStride;
  final int uRowStride;
  final int uPixelStride;
  final int vRowStride;
  final int vPixelStride;

  void sampleRgba(
    double normX,
    double normY,
    Uint8List output,
    int outputOffset,
  ) {
    final x = (normX.clamp(0.0, 1.0) * (width - 1)).round();
    final y = (normY.clamp(0.0, 1.0) * (height - 1)).round();
    final uvX = x ~/ 2;
    final uvY = y ~/ 2;
    final yValue = _sample(
      bytes: yBytes,
      x: x,
      y: y,
      rowStride: yRowStride,
      pixelStride: yPixelStride,
      fallback: 16,
    );
    final uValue = _sample(
      bytes: uBytes,
      x: uvX,
      y: uvY,
      rowStride: uRowStride,
      pixelStride: uPixelStride,
      fallback: 128,
    );
    final vValue = _sample(
      bytes: vBytes,
      x: uvX,
      y: uvY,
      rowStride: vRowStride,
      pixelStride: vPixelStride,
      fallback: 128,
    );

    final c = math.max(0, yValue - 16);
    final d = uValue - 128;
    final e = vValue - 128;
    output[outputOffset] = _clampByte((298 * c + 409 * e + 128) >> 8);
    output[outputOffset + 1] = _clampByte(
      (298 * c - 100 * d - 208 * e + 128) >> 8,
    );
    output[outputOffset + 2] = _clampByte((298 * c + 516 * d + 128) >> 8);
    output[outputOffset + 3] = 255;
  }

  int _sample({
    required Uint8List bytes,
    required int x,
    required int y,
    required int rowStride,
    required int pixelStride,
    required int fallback,
  }) {
    final offset = (y * rowStride) + (x * pixelStride);
    if (offset < 0 || offset >= bytes.length) {
      return fallback;
    }
    return bytes[offset];
  }

  int _clampByte(int value) {
    if (value < 0) return 0;
    if (value > 255) return 255;
    return value;
  }
}

class _NormRect {
  const _NormRect({
    required this.left,
    required this.top,
    required this.right,
    required this.bottom,
  });

  final double left;
  final double top;
  final double right;
  final double bottom;

  double get width => right - left;
  double get height => bottom - top;
}

class _GridComponent {
  const _GridComponent({
    required this.count,
    required this.minX,
    required this.maxX,
    required this.minY,
    required this.maxY,
  });

  final int count;
  final int minX;
  final int maxX;
  final int minY;
  final int maxY;

  int get width => maxX - minX + 1;
  int get height => maxY - minY + 1;
}

class _TrackedCandidate {
  _TrackedCandidate({
    required this.id,
    required this.score,
    required this.occurrences,
    required this.lastSeenFrame,
    required this.fullCardHash,
    required this.artworkHash,
    required this.lastDistance,
  });

  final String id;
  double score;
  int occurrences;
  int lastSeenFrame;
  String fullCardHash;
  String artworkHash;
  int lastDistance;

  CandidateState toState() {
    return CandidateState(
      id: id,
      score: score,
      occurrences: occurrences,
      lastSeenFrame: lastSeenFrame,
      fullCardHash: fullCardHash,
      artworkHash: artworkHash,
      lastDistance: lastDistance,
    );
  }
}
