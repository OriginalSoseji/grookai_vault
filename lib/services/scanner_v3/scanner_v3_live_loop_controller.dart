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
  static const double minArtworkForegroundRatio = 0.015;
  static const double maxArtworkForegroundRatio = 0.88;
  static const double minArtworkLumaStdDev = 0.035;
  static const double minFallbackArtworkForegroundRatio = 0.045;
  static const double minFallbackArtworkLumaStdDev = 0.055;
  static const double minCardBorderBrightRatio = 0.10;
  static const double minCardBorderBandCoverage = 0.50;
  static const double minNativeObjectContentRatio = 0.48;
  static const double minNativeObjectSeedCoverage = 0.08;
  static const double minNativeObjectCandidateScore = 0.735;
  static const double minPokemonFallbackFullLumaStdDev = 0.060;
  static const double minPokemonFallbackArtworkLumaStdDev = 0.055;
  static const double minPokemonFallbackArtworkForegroundRatio = 0.045;
  static const double minPokemonFallbackLayoutScore = 0.58;
  static const double minPokemonFallbackHorizontalContrast = 0.050;
  static const double minPokemonFallbackTextPanelBrightRatio = 0.10;
  static const double minNativePokemonTextPanelBrightRatio = 0.08;
  static const int minCardPresentFramesBeforeIdentity = 3;
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
  int _cardPresentConsecutiveFrames = 0;
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
    final nativeDiagnosticsUsability = _nativeDetectorDiagnosticsUsable(
      quadDetectorSnapshot,
    );
    final normalizedCandidates = _normalizeFrameCandidates(
      image: image,
      sensorRotation: sensorRotation,
      quadPointsNorm: quadPointsNorm,
      quadDetectorSnapshot: quadDetectorSnapshot,
    );

    if (normalizedCandidates.isEmpty) {
      _rejectedFrameCount += 1;
      _resetCardPresentGate();
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
        identityAllowed: false,
        identityBlockedReason: 'normalization_failed',
        nativeDiagnosticsUsable: nativeDiagnosticsUsability.usable,
        nativeDiagnosticsRejectionReason: nativeDiagnosticsUsability.usable
            ? null
            : nativeDiagnosticsUsability.reason,
      );
    }

    final candidateEvaluation = _selectBestFrameCandidate(
      normalizedCandidates,
    );
    final normalized = candidateEvaluation.frame;
    final quality = candidateEvaluation.quality;
    final cardPresent = candidateEvaluation.cardPresent;

    if (!quality.accepted) {
      _rejectedFrameCount += 1;
      _resetCardPresentGate();
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
        identityAllowed: false,
        identityBlockedReason: _cardAbsentReasonForQuality(quality),
        nativeDiagnosticsUsable: normalized.nativeDiagnosticsUsable,
        nativeDiagnosticsRejectionReason:
            normalized.nativeDiagnosticsRejectionReason,
      );
    }

    if (!cardPresent.present) {
      _rejectedFrameCount += 1;
      _resetCardPresentGate();
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
        identityAllowed: false,
        identityBlockedReason: cardPresent.reason,
        nativeDiagnosticsUsable: normalized.nativeDiagnosticsUsable,
        nativeDiagnosticsRejectionReason:
            normalized.nativeDiagnosticsRejectionReason,
        cardPresentMetrics: cardPresent.metrics,
      );
    }

    _cardPresentConsecutiveFrames += 1;
    if (_cardPresentConsecutiveFrames < minCardPresentFramesBeforeIdentity) {
      _rejectedFrameCount += 1;
      _clearIdentityState();
      _lastIdentitySignalSource = 'card_present_persistence_pending';
      return _publishState(
        quality: quality,
        decisionReason:
            'identity_blocked:card_present_persistence_pending:'
            '$_cardPresentConsecutiveFrames/'
            '$minCardPresentFramesBeforeIdentity',
        elapsedMs: stopwatch.elapsedMilliseconds,
        selectedQuadSource: normalized.selectedQuadSource,
        detectorConfidence: normalized.detectorConfidence,
        detectorElapsedMs: normalized.detectorElapsedMs,
        cardPresent: false,
        cardPresentReason: 'card_present_persistence_pending',
        identityAllowed: false,
        identityBlockedReason: 'card_present_persistence_pending',
        nativeDiagnosticsUsable: normalized.nativeDiagnosticsUsable,
        nativeDiagnosticsRejectionReason:
            normalized.nativeDiagnosticsRejectionReason,
        cardPresentMetrics: cardPresent.metrics,
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
      identityAllowed: true,
      identityAllowedReason: 'card_present_persistence_satisfied',
      nativeDiagnosticsUsable: normalized.nativeDiagnosticsUsable,
      nativeDiagnosticsRejectionReason:
          normalized.nativeDiagnosticsRejectionReason,
      cardPresentMetrics: cardPresent.metrics,
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
    _cardPresentConsecutiveFrames = 0;
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

  void _resetCardPresentGate() {
    _cardPresentConsecutiveFrames = 0;
  }

  List<_NormalizedFrame> _normalizeFrameCandidates({
    required CameraImage image,
    required int sensorRotation,
    required List<Offset>? quadPointsNorm,
    required ScannerV3QuadDetectorSnapshot? quadDetectorSnapshot,
  }) {
    if (image.format.group != ImageFormatGroup.yuv420 || image.planes.isEmpty) {
      return const <_NormalizedFrame>[];
    }

    final rightAngleRotation = _isRightAngleRotation(sensorRotation);
    final displayWidth = rightAngleRotation ? image.height : image.width;
    final displayHeight = rightAngleRotation ? image.width : image.height;
    if (displayWidth <= 0 || displayHeight <= 0) {
      return const <_NormalizedFrame>[];
    }
    final displayAspectRatio = displayWidth / displayHeight;
    final displayQuadTargetAspect = targetAspectRatio / displayAspectRatio;

    final nativeDiagnosticsUsability = _nativeDetectorDiagnosticsUsable(
      quadDetectorSnapshot,
    );
    final hasNativeQuad =
        quadPointsNorm != null &&
        quadPointsNorm.length == 4 &&
        nativeDiagnosticsUsability.usable;
    final candidates = <_DisplayQuadCandidate>[];
    if (hasNativeQuad) {
      candidates.add(
        _DisplayQuadCandidate(
          source: 'native_detector',
          displayQuad: quadPointsNorm,
          borderConfidence: quadDetectorSnapshot?.confidence ?? 1.0,
        ),
      );
    }

    final pokemonVisualQuad = _detectPokemonDisplayCardQuadFromFrame(
      image: image,
      sensorRotation: sensorRotation,
      displayQuadTargetAspect: displayQuadTargetAspect,
    );
    if (pokemonVisualQuad != null) {
      candidates.add(
        _DisplayQuadCandidate(
          source: 'pokemon_visual_region',
          displayQuad: pokemonVisualQuad,
          borderConfidence: 0.55,
        ),
      );
    }

    final heuristicDisplayQuad = _detectDisplayCardQuadFromFrame(
      image: image,
      sensorRotation: sensorRotation,
      displayQuadTargetAspect: displayQuadTargetAspect,
    );
    if (heuristicDisplayQuad != null) {
      candidates.add(
        _DisplayQuadCandidate(
          source: 'yuv_fallback',
          displayQuad: heuristicDisplayQuad,
          borderConfidence: 0.35,
        ),
      );
    }

    candidates.add(
      _DisplayQuadCandidate(
        source: 'center_fallback',
        displayQuad: _centerDisplayCardQuad(displayQuadTargetAspect),
        borderConfidence: 0.0,
      ),
    );

    final normalized = <_NormalizedFrame>[];
    for (final candidate in candidates) {
      if (_hasSimilarNormalizedCandidate(normalized, candidate.displayQuad)) {
        continue;
      }
      final frame = _normalizeFrameFromDisplayQuad(
        image: image,
        sensorRotation: sensorRotation,
        displayQuad: candidate.displayQuad,
        selectedQuadSource: candidate.source,
        borderConfidence: candidate.borderConfidence,
        rightAngleRotation: rightAngleRotation,
        displayAspectRatio: displayAspectRatio,
        displayQuadTargetAspect: displayQuadTargetAspect,
        nativeDiagnosticsUsability: nativeDiagnosticsUsability,
        quadDetectorSnapshot: quadDetectorSnapshot,
      );
      if (frame != null) {
        normalized.add(frame);
      }
    }
    return normalized;
  }

  bool _hasSimilarNormalizedCandidate(
    List<_NormalizedFrame> existing,
    List<Offset> displayQuad,
  ) {
    final ordered = _orderQuad(displayQuad);
    if (ordered == null) return false;
    final area = _polygonArea(ordered).abs();
    final center = _quadCenter(ordered);
    for (final frame in existing) {
      final otherArea = _polygonArea(frame.orderedDisplayQuad).abs();
      final otherCenter = _quadCenter(frame.orderedDisplayQuad);
      final centerDistance = (center - otherCenter).distance;
      if (centerDistance < 0.035 && (area - otherArea).abs() < 0.035) {
        return true;
      }
    }
    return false;
  }

  Offset _quadCenter(List<Offset> points) {
    var x = 0.0;
    var y = 0.0;
    for (final point in points) {
      x += point.dx;
      y += point.dy;
    }
    return Offset(x / points.length, y / points.length);
  }

  _NormalizedFrame? _normalizeFrameFromDisplayQuad({
    required CameraImage image,
    required int sensorRotation,
    required List<Offset> displayQuad,
    required String selectedQuadSource,
    required double borderConfidence,
    required bool rightAngleRotation,
    required double displayAspectRatio,
    required double displayQuadTargetAspect,
    required _NativeDiagnosticsUsabilityDecision nativeDiagnosticsUsability,
    required ScannerV3QuadDetectorSnapshot? quadDetectorSnapshot,
  }) {
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
      borderConfidence: borderConfidence,
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
      nativeDiagnosticsUsable: nativeDiagnosticsUsability.usable,
      nativeDiagnosticsRejectionReason: nativeDiagnosticsUsability.usable
          ? null
          : nativeDiagnosticsUsability.reason,
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

  _FrameCandidateEvaluation _selectBestFrameCandidate(
    List<_NormalizedFrame> candidates,
  ) {
    _FrameCandidateEvaluation? bestPresent;
    _FrameCandidateEvaluation? bestRejected;
    for (final frame in candidates) {
      final quality = _measureQuality(frame);
      final cardPresent = _evaluateCardPresent(frame, quality);
      final evaluation = _FrameCandidateEvaluation(
        frame: frame,
        quality: quality,
        cardPresent: cardPresent,
        score: _frameCandidateScore(frame, quality, cardPresent),
      );
      if (cardPresent.present) {
        if (bestPresent == null || evaluation.score > bestPresent.score) {
          bestPresent = evaluation;
        }
      } else if (bestRejected == null ||
          evaluation.score > bestRejected.score) {
        bestRejected = evaluation;
      }
    }
    return bestPresent ?? bestRejected!;
  }

  double _frameCandidateScore(
    _NormalizedFrame frame,
    ScannerV3QualitySnapshot quality,
    _CardPresentDecision cardPresent,
  ) {
    final layout = _pokemonLayoutStats(frame);
    var score = 0.0;
    if (cardPresent.present) {
      score += 1000;
    }
    if (quality.accepted) {
      score += 120;
    } else {
      score -= quality.rejectionReasons.length * 35;
    }
    score += frame.cardFillRatio * 120;
    score += layout.score * 140;
    score += switch (frame.selectedQuadSource) {
      'native_detector' => 45,
      'pokemon_visual_region' => 70,
      'yuv_fallback' => 35,
      'center_fallback' => 10,
      _ => 0,
    };
    if (cardPresent.reason == 'card_border_evidence_missing' ||
        cardPresent.reason == 'pokemon_layout_evidence_missing') {
      score -= 60;
    }
    if (frame.selectedQuadSource == 'center_fallback') {
      score -= 35;
    }
    return score;
  }

  _NativeDiagnosticsUsabilityDecision _nativeDetectorDiagnosticsUsable(
    ScannerV3QuadDetectorSnapshot? quadDetectorSnapshot,
  ) {
    if (quadDetectorSnapshot?.called != true) {
      return const _NativeDiagnosticsUsabilityDecision(
        usable: false,
        reason: 'native_not_called',
      );
    }
    if (quadDetectorSnapshot?.success != true) {
      return _NativeDiagnosticsUsabilityDecision(
        usable: false,
        reason: quadDetectorSnapshot?.failureReason == 'native_success_false'
            ? 'native_success_false'
            : 'native_success_false',
      );
    }
    if ((quadDetectorSnapshot?.confidence ?? 0) < minNativeDetectorConfidence) {
      return const _NativeDiagnosticsUsabilityDecision(
        usable: false,
        reason: 'low_detector_confidence',
      );
    }
    final raw = quadDetectorSnapshot?.rawResponse;
    final diagnostics = raw == null ? null : raw['diagnostics'];
    if (diagnostics is Map && diagnostics['detector_success'] == false) {
      return const _NativeDiagnosticsUsabilityDecision(
        usable: false,
        reason: 'native_diagnostics_detector_failure',
      );
    }
    final pipeline = diagnostics is Map
        ? diagnostics['pipeline']?.toString()
        : null;
    final source = diagnostics is Map
        ? diagnostics['selected_candidate_source']?.toString()
        : null;
    if (pipeline == 'recovered_center_quad_fallback' ||
        source == 'recovered_center_quad_fallback') {
      return const _NativeDiagnosticsUsabilityDecision(
        usable: false,
        reason: 'native_recovered_center_quad_fallback',
      );
    }
    final failureReason = diagnostics is Map
        ? diagnostics['selected_failure_reason']?.toString()
        : null;
    if (failureReason != null && failureReason.isNotEmpty) {
      return _NativeDiagnosticsUsabilityDecision(
        usable: false,
        reason: 'native_diagnostics_failure:$failureReason',
      );
    }
    final edgeSupport = diagnostics is Map
        ? _asDouble(diagnostics['best_candidate_edge_support'])
        : null;
    if (edgeSupport != null && edgeSupport < 0.18) {
      return const _NativeDiagnosticsUsabilityDecision(
        usable: false,
        reason: 'native_edge_support_weak',
      );
    }
    final candidateScore = diagnostics is Map
        ? _asDouble(diagnostics['best_candidate_score'])
        : null;
    if (candidateScore != null && candidateScore < 0.45) {
      return const _NativeDiagnosticsUsabilityDecision(
        usable: false,
        reason: 'native_candidate_score_weak',
      );
    }
    return const _NativeDiagnosticsUsabilityDecision(
      usable: true,
      reason: 'native_diagnostics_usable',
    );
  }

  double? _asDouble(Object? value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  List<Offset>? _detectPokemonDisplayCardQuadFromFrame({
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
    const searchLeft = 0.06;
    const searchTop = 0.08;
    const searchRight = 0.94;
    const searchBottom = 0.92;

    final yPlane = image.planes[0];
    final uPlane = image.planes[1];
    final vPlane = image.planes[2];
    final lumaSamples = <int>[];
    final chromaSamples = <int>[];
    final lumaGrid = List<int>.filled(gridWidth * gridHeight, 0);
    final chromaGrid = List<int>.filled(gridWidth * gridHeight, 0);

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
        lumaGrid[index] = y;
        chromaGrid[index] = chroma;
        lumaSamples.add(y);
        chromaSamples.add(chroma);
      }
    }

    if (lumaSamples.length < 80 || chromaSamples.length < 80) return null;
    lumaSamples.sort();
    chromaSamples.sort();
    final p62 = lumaSamples[(lumaSamples.length * 0.62).floor()];
    final p76 = lumaSamples[(lumaSamples.length * 0.76).floor()];
    final p86 = lumaSamples[(lumaSamples.length * 0.86).floor()];
    final chromaP58 = chromaSamples[(chromaSamples.length * 0.58).floor()];
    final chromaP72 = chromaSamples[(chromaSamples.length * 0.72).floor()];
    final brightThreshold = math.max(86, math.min(168, p62 + 8)).toInt();
    final veryBrightThreshold = math.max(108, math.min(188, p76 + 8)).toInt();
    final neutralChromaThreshold = math
        .max(24, math.min(68, chromaP58 + 18))
        .toInt();
    final relaxedChromaThreshold = math
        .max(34, math.min(86, chromaP72 + 18))
        .toInt();
    final mask = List<bool>.filled(gridWidth * gridHeight, false);

    for (var gy = 0; gy < gridHeight; gy += 1) {
      final displayY = (gy + 0.5) / gridHeight;
      if (displayY < searchTop || displayY > searchBottom) continue;
      for (var gx = 0; gx < gridWidth; gx += 1) {
        final displayX = (gx + 0.5) / gridWidth;
        if (displayX < searchLeft || displayX > searchRight) continue;
        final index = (gy * gridWidth) + gx;
        final luma = lumaGrid[index];
        final chroma = chromaGrid[index];
        final lightCardSurface =
            luma >= brightThreshold && chroma <= relaxedChromaThreshold;
        final highlightCardSurface =
            luma >= veryBrightThreshold && chroma <= neutralChromaThreshold;
        final strongPrintOrBorder =
            luma >= p86 && chroma <= relaxedChromaThreshold + 8;
        if (lightCardSurface || highlightCardSurface || strongPrintOrBorder) {
          mask[index] = true;
        }
      }
    }

    var closed = List<bool>.from(mask);
    for (var pass = 0; pass < 2; pass += 1) {
      final next = List<bool>.from(closed);
      for (var gy = 1; gy < gridHeight - 1; gy += 1) {
        for (var gx = 1; gx < gridWidth - 1; gx += 1) {
          final index = (gy * gridWidth) + gx;
          if (closed[index]) continue;
          var neighbors = 0;
          for (var oy = -1; oy <= 1; oy += 1) {
            for (var ox = -1; ox <= 1; ox += 1) {
              if (ox == 0 && oy == 0) continue;
              if (closed[((gy + oy) * gridWidth) + gx + ox]) {
                neighbors += 1;
              }
            }
          }
          if (neighbors >= 3) {
            next[index] = true;
          }
        }
      }
      closed = next;
    }

    final visited = List<bool>.filled(gridWidth * gridHeight, false);
    _GridComponent? best;
    var bestScore = -double.infinity;

    for (var gy = 0; gy < gridHeight; gy += 1) {
      for (var gx = 0; gx < gridWidth; gx += 1) {
        final start = (gy * gridWidth) + gx;
        if (!closed[start] || visited[start]) continue;
        final component = _floodFillComponent(
          mask: closed,
          visited: visited,
          gridWidth: gridWidth,
          gridHeight: gridHeight,
          startX: gx,
          startY: gy,
        );
        final widthNorm = component.width / gridWidth;
        final heightNorm = component.height / gridHeight;
        final areaNorm = widthNorm * heightNorm;
        if (component.count < 80 || areaNorm < 0.018 || areaNorm > 0.58) {
          continue;
        }

        final centerX = ((component.minX + component.maxX + 1) / 2) / gridWidth;
        final centerY =
            ((component.minY + component.maxY + 1) / 2) / gridHeight;
        if (centerX < 0.14 ||
            centerX > 0.86 ||
            centerY < 0.14 ||
            centerY > 0.88) {
          continue;
        }

        final candidateAspect = widthNorm / math.max(heightNorm, 0.01);
        final aspectPenalty =
            (math.log(candidateAspect / displayQuadTargetAspect).abs()) * 110;
        final centerPenalty =
            ((centerX - 0.5).abs() * 30) + ((centerY - 0.52).abs() * 18);
        final smallPenalty = areaNorm < 0.10 ? (0.10 - areaNorm) * 420 : 0;
        final oversizedPenalty = areaNorm > 0.42 ? (areaNorm - 0.42) * 260 : 0;
        final density = component.count / math.max(1, component.area);
        final score =
            component.count +
            (areaNorm * 850) +
            (density * 85) -
            aspectPenalty -
            centerPenalty -
            smallPenalty -
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

    left -= 0.035;
    right += 0.035;
    top -= 0.035;
    bottom += 0.045;

    final centerX = (left + right) / 2;
    final centerY = (top + bottom) / 2;
    var width = math.max(0.28, right - left);
    var height = math.max(0.24, bottom - top);
    final aspect = width / math.max(height, 0.01);
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
    if (cropWidth < 0.26 || cropHeight < 0.22) return null;

    return <Offset>[
      Offset(clamped.left, clamped.top),
      Offset(clamped.right, clamped.top),
      Offset(clamped.right, clamped.bottom),
      Offset(clamped.left, clamped.bottom),
    ];
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

        final candidateAspect = widthNorm / math.max(heightNorm, 0.01);
        final aspectPenalty =
            (math.log(candidateAspect / displayQuadTargetAspect).abs()) * 28;
        final centerPenalty =
            ((centerX - 0.5).abs() * 18) + ((centerY - 0.58).abs() * 10);
        final oversizedPenalty = areaNorm > 0.16 ? (areaNorm - 0.16) * 900 : 0;
        final score =
            component.count +
            (areaNorm * 120) -
            aspectPenalty -
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
    final maxWidthForFill = math.sqrt(
      (maxCardFillRatio - 0.01) * displayQuadTargetAspect,
    );
    var width = math.min(0.956, maxWidthForFill);
    var height = width / displayQuadTargetAspect;
    if (height > 0.963) {
      height = 0.963;
      width = height * displayQuadTargetAspect;
    }
    final left = (1 - width) / 2;
    final top = (1 - height) / 2;
    final bottom = top + height;
    return <Offset>[
      Offset(left, top),
      Offset(left + width, top),
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

    final hasNativeQuad =
        frame.selectedQuadSource == 'native_detector' && frame.detectorSuccess;
    final hasScannerFallbackQuad =
        frame.selectedQuadSource == 'pokemon_visual_region' ||
        frame.selectedQuadSource == 'yuv_fallback' ||
        frame.selectedQuadSource == 'center_fallback';
    if (!hasNativeQuad && !hasScannerFallbackQuad) {
      return const _CardPresentDecision(present: false, reason: 'no_quad');
    }
    if (!hasNativeQuad) {
      return _CardPresentDecision(
        present: false,
        reason: hasScannerFallbackQuad
            ? 'native_success_required_for_card_present'
            : 'no_native_quad',
      );
    }
    if (hasNativeQuad && !frame.nativeDiagnosticsUsable) {
      return _CardPresentDecision(
        present: false,
        reason:
            frame.nativeDiagnosticsRejectionReason ??
            'native_diagnostics_unusable',
      );
    }

    if (hasNativeQuad &&
        (frame.detectorConfidence ?? 0) < minNativeDetectorConfidence) {
      return const _CardPresentDecision(
        present: false,
        reason: 'low_detector_confidence',
      );
    }
    final fullCardStats = _lumaStats(
      frame,
      const _NormRect(left: 0, top: 0, right: 1, bottom: 1),
    );
    if (fullCardStats.stdDev < minArtworkLumaStdDev * 0.55) {
      return _CardPresentDecision(
        present: false,
        reason: 'normalized_empty',
        metrics: _CardPresentMetrics(fullLumaStdDev: fullCardStats.stdDev),
      );
    }

    final artworkStats = _lumaStats(
      frame,
      const _NormRect(left: 0.08, top: 0.12, right: 0.92, bottom: 0.60),
    );
    final pokemonLayoutStats = _pokemonLayoutStats(frame);
    var metrics = _CardPresentMetrics(
      fullLumaStdDev: fullCardStats.stdDev,
      artworkLumaStdDev: artworkStats.stdDev,
      artworkForegroundRatio: artworkStats.foregroundRatio,
      pokemonLayoutScore: pokemonLayoutStats.score,
      pokemonHorizontalContrast: pokemonLayoutStats.horizontalContrast,
      pokemonTextPanelBrightRatio: pokemonLayoutStats.textPanelBrightRatio,
    );
    if (artworkStats.stdDev < minArtworkLumaStdDev ||
        artworkStats.foregroundRatio < minArtworkForegroundRatio ||
        artworkStats.foregroundRatio > maxArtworkForegroundRatio) {
      return _CardPresentDecision(
        present: false,
        reason: 'artwork_background_dominant',
        metrics: metrics,
      );
    }
    if (artworkStats.stdDev < minFallbackArtworkLumaStdDev &&
        artworkStats.foregroundRatio < minFallbackArtworkForegroundRatio) {
      return _CardPresentDecision(
        present: false,
        reason: 'artwork_background_dominant',
        metrics: metrics,
      );
    }
    final borderStats = _cardBorderStats(frame);
    metrics = _CardPresentMetrics(
      fullLumaStdDev: fullCardStats.stdDev,
      artworkLumaStdDev: artworkStats.stdDev,
      artworkForegroundRatio: artworkStats.foregroundRatio,
      borderBrightRatio: borderStats.brightRatio,
      borderBandCoverage: borderStats.bandCoverage,
      pokemonLayoutScore: pokemonLayoutStats.score,
      pokemonHorizontalContrast: pokemonLayoutStats.horizontalContrast,
      pokemonTextPanelBrightRatio: pokemonLayoutStats.textPanelBrightRatio,
    );
    final borderEvidencePresent =
        borderStats.brightRatio >= minCardBorderBrightRatio &&
        borderStats.bandCoverage >= minCardBorderBandCoverage;
    final nativeObjectContentEvidencePresent =
        _nativeObjectContentEvidenceStrong(frame);
    final nativePokemonLayoutEvidencePresent =
        borderEvidencePresent &&
        pokemonLayoutStats.textPanelBrightRatio >=
            minNativePokemonTextPanelBrightRatio;
    final pokemonFallbackEvidencePresent = _pokemonFallbackEvidenceStrong(
      fullCardStats: fullCardStats,
      artworkStats: artworkStats,
      borderStats: borderStats,
      layoutStats: pokemonLayoutStats,
    );
    if (hasScannerFallbackQuad && !pokemonFallbackEvidencePresent) {
      return _CardPresentDecision(
        present: false,
        reason: 'pokemon_layout_evidence_missing',
        metrics: metrics,
      );
    }
    if (hasNativeQuad &&
        !nativeObjectContentEvidencePresent &&
        !nativePokemonLayoutEvidencePresent) {
      return _CardPresentDecision(
        present: false,
        reason: borderEvidencePresent
            ? 'pokemon_layout_evidence_missing'
            : 'card_border_evidence_missing',
        metrics: metrics,
      );
    }

    return _CardPresentDecision(
      present: true,
      reason: 'card_present',
      metrics: metrics,
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

  bool _pokemonFallbackEvidenceStrong({
    required _LumaStats fullCardStats,
    required _LumaStats artworkStats,
    required _CardBorderStats borderStats,
    required _PokemonLayoutStats layoutStats,
  }) {
    final fullTexture =
        fullCardStats.stdDev >= minPokemonFallbackFullLumaStdDev;
    final artworkTexture =
        artworkStats.stdDev >= minPokemonFallbackArtworkLumaStdDev &&
        artworkStats.foregroundRatio >=
            minPokemonFallbackArtworkForegroundRatio &&
        artworkStats.foregroundRatio <= maxArtworkForegroundRatio;
    final borderEvidence =
        borderStats.brightRatio >= minCardBorderBrightRatio * 0.45 &&
        borderStats.bandCoverage >= 0.25;
    final layoutEvidence =
        layoutStats.score >= minPokemonFallbackLayoutScore &&
        layoutStats.horizontalContrast >=
            minPokemonFallbackHorizontalContrast &&
        layoutStats.textPanelBrightRatio >=
            minPokemonFallbackTextPanelBrightRatio;
    return fullTexture && artworkTexture && (borderEvidence || layoutEvidence);
  }

  _PokemonLayoutStats _pokemonLayoutStats(_NormalizedFrame frame) {
    const titleRect = _NormRect(left: 0.08, top: 0.03, right: 0.92, bottom: 0.12);
    const artworkRect = _NormRect(
      left: 0.08,
      top: 0.16,
      right: 0.92,
      bottom: 0.56,
    );
    const textRect = _NormRect(left: 0.08, top: 0.58, right: 0.92, bottom: 0.88);
    const bottomRect = _NormRect(
      left: 0.08,
      top: 0.84,
      right: 0.92,
      bottom: 0.97,
    );

    final titleStats = _lumaStats(frame, titleRect);
    final artworkStats = _lumaStats(frame, artworkRect);
    final textStats = _lumaStats(frame, textRect);
    final titleBrightRatio = _brightRatio(frame, titleRect);
    final textPanelBrightRatio = _brightRatio(frame, textRect);
    final bottomBrightRatio = _brightRatio(frame, bottomRect);
    final bandMeans = <double>[];
    for (var band = 0; band < 8; band += 1) {
      final top = band / 8;
      final bottom = (band + 1) / 8;
      bandMeans.add(
        _meanBrightnessInRect(
          frame,
          _NormRect(left: 0.08, top: top, right: 0.92, bottom: bottom),
        ),
      );
    }

    var minMean = double.infinity;
    var maxMean = -double.infinity;
    var meanSum = 0.0;
    for (final value in bandMeans) {
      minMean = math.min(minMean, value);
      maxMean = math.max(maxMean, value);
      meanSum += value;
    }
    final bandMean = meanSum / bandMeans.length;
    var variance = 0.0;
    for (final value in bandMeans) {
      final diff = value - bandMean;
      variance += diff * diff;
    }
    final horizontalContrast = maxMean - minMean;
    final bandStdDev = math.sqrt(variance / bandMeans.length);

    var score = 0.0;
    if (artworkStats.stdDev >= minPokemonFallbackArtworkLumaStdDev) {
      score += 0.18;
    }
    if (artworkStats.foregroundRatio >=
            minPokemonFallbackArtworkForegroundRatio &&
        artworkStats.foregroundRatio <= maxArtworkForegroundRatio) {
      score += 0.18;
    }
    if (titleBrightRatio >= 0.08 || titleStats.stdDev >= 0.045) {
      score += 0.12;
    }
    if (textPanelBrightRatio >= minPokemonFallbackTextPanelBrightRatio ||
        textStats.stdDev >= 0.050) {
      score += 0.18;
    }
    if (bottomBrightRatio >= 0.08) {
      score += 0.10;
    }
    if (horizontalContrast >= minPokemonFallbackHorizontalContrast) {
      score += 0.16;
    }
    if (bandStdDev >= 0.030) {
      score += 0.08;
    }

    return _PokemonLayoutStats(
      score: score.clamp(0.0, 1.0).toDouble(),
      horizontalContrast: horizontalContrast,
      textPanelBrightRatio: textPanelBrightRatio,
    );
  }

  double _meanBrightnessInRect(_NormalizedFrame frame, _NormRect rect) {
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
    var sum = 0;
    var count = 0;
    for (var y = top; y < bottom; y += step) {
      for (var x = left; x < right; x += step) {
        sum += frame.bytes[(y * frame.width) + x];
        count += 1;
      }
    }
    return count == 0 ? 0 : (sum / count) / 255;
  }

  bool _nativeObjectContentEvidenceStrong(_NormalizedFrame frame) {
    final diagnostics = frame.detectorDiagnostics;
    if (diagnostics == null) return false;
    final contentRatio = _asDouble(diagnostics['content_vs_outer_area_ratio']);
    final seedCoverage = _asDouble(diagnostics['best_candidate_seed_coverage']);
    final candidateScore = _asDouble(diagnostics['best_candidate_score']);
    return contentRatio != null &&
        contentRatio >= minNativeObjectContentRatio &&
        seedCoverage != null &&
        seedCoverage >= minNativeObjectSeedCoverage &&
        candidateScore != null &&
        candidateScore >= minNativeObjectCandidateScore;
  }

  _CardBorderStats _cardBorderStats(_NormalizedFrame frame) {
    const bands = <_NormRect>[
      _NormRect(left: 0.05, top: 0.03, right: 0.95, bottom: 0.11),
      _NormRect(left: 0.04, top: 0.10, right: 0.13, bottom: 0.90),
      _NormRect(left: 0.87, top: 0.10, right: 0.96, bottom: 0.90),
      _NormRect(left: 0.05, top: 0.88, right: 0.95, bottom: 0.97),
    ];
    var bright = 0;
    var total = 0;
    var brightBands = 0;
    for (final band in bands) {
      final ratio = _brightRatio(frame, band);
      if (ratio >= minCardBorderBrightRatio) {
        brightBands += 1;
      }
      final sampleCount = _sampleCount(frame, band);
      bright += (ratio * sampleCount).round();
      total += sampleCount;
    }
    return _CardBorderStats(
      brightRatio: total == 0 ? 0 : bright / total,
      bandCoverage: brightBands / bands.length,
    );
  }

  double _brightRatio(_NormalizedFrame frame, _NormRect rect) {
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
    final step = math.max(1, frame.height ~/ 180);
    var bright = 0;
    var count = 0;
    for (var y = top; y < bottom; y += step) {
      for (var x = left; x < right; x += step) {
        if (frame.bytes[(y * frame.width) + x] >= 158) {
          bright += 1;
        }
        count += 1;
      }
    }
    return count == 0 ? 0 : bright / count;
  }

  int _sampleCount(_NormalizedFrame frame, _NormRect rect) {
    final width = math.max(1, ((rect.right - rect.left) * frame.width).round());
    final height = math.max(
      1,
      ((rect.bottom - rect.top) * frame.height).round(),
    );
    final step = math.max(1, frame.height ~/ 180);
    return math.max(1, (width ~/ step) * (height ~/ step));
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
    bool identityAllowed = true,
    String? identityAllowedReason,
    String? identityBlockedReason,
    bool nativeDiagnosticsUsable = true,
    String? nativeDiagnosticsRejectionReason,
    _CardPresentMetrics? cardPresentMetrics,
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
      cardPresentConsecutiveFrames: _cardPresentConsecutiveFrames,
      identityAllowed: identityAllowed,
      identityAllowedReason: identityAllowedReason,
      identityBlockedReason: identityBlockedReason,
      nativeDiagnosticsUsable: nativeDiagnosticsUsable,
      nativeDiagnosticsRejectionReason: nativeDiagnosticsRejectionReason,
      cardPresentFullLumaStdDev: cardPresentMetrics?.fullLumaStdDev,
      cardPresentArtworkLumaStdDev: cardPresentMetrics?.artworkLumaStdDev,
      cardPresentArtworkForegroundRatio:
          cardPresentMetrics?.artworkForegroundRatio,
      cardPresentBorderBrightRatio: cardPresentMetrics?.borderBrightRatio,
      cardPresentBorderBandCoverage: cardPresentMetrics?.borderBandCoverage,
      cardPresentPokemonLayoutScore: cardPresentMetrics?.pokemonLayoutScore,
      cardPresentPokemonHorizontalContrast:
          cardPresentMetrics?.pokemonHorizontalContrast,
      cardPresentPokemonTextPanelBrightRatio:
          cardPresentMetrics?.pokemonTextPanelBrightRatio,
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
    required this.nativeDiagnosticsUsable,
    required this.nativeDiagnosticsRejectionReason,
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
  final bool nativeDiagnosticsUsable;
  final String? nativeDiagnosticsRejectionReason;
  final Map<String, Object?>? detectorDiagnostics;
  final Map<String, ScannerV3ExportImage> detectorDebugMasks;
  final String quadOrderNormalizationResult;
  final List<Offset> orderedDisplayQuad;
  final List<Offset> imageQuad;
}

class _DisplayQuadCandidate {
  const _DisplayQuadCandidate({
    required this.source,
    required this.displayQuad,
    required this.borderConfidence,
  });

  final String source;
  final List<Offset> displayQuad;
  final double borderConfidence;
}

class _FrameCandidateEvaluation {
  const _FrameCandidateEvaluation({
    required this.frame,
    required this.quality,
    required this.cardPresent,
    required this.score,
  });

  final _NormalizedFrame frame;
  final ScannerV3QualitySnapshot quality;
  final _CardPresentDecision cardPresent;
  final double score;
}

class _CardPresentDecision {
  const _CardPresentDecision({
    required this.present,
    required this.reason,
    this.metrics,
  });

  final bool present;
  final String reason;
  final _CardPresentMetrics? metrics;
}

class _PokemonLayoutStats {
  const _PokemonLayoutStats({
    required this.score,
    required this.horizontalContrast,
    required this.textPanelBrightRatio,
  });

  final double score;
  final double horizontalContrast;
  final double textPanelBrightRatio;
}

class _CardPresentMetrics {
  const _CardPresentMetrics({
    this.fullLumaStdDev,
    this.artworkLumaStdDev,
    this.artworkForegroundRatio,
    this.borderBrightRatio,
    this.borderBandCoverage,
    this.pokemonLayoutScore,
    this.pokemonHorizontalContrast,
    this.pokemonTextPanelBrightRatio,
  });

  final double? fullLumaStdDev;
  final double? artworkLumaStdDev;
  final double? artworkForegroundRatio;
  final double? borderBrightRatio;
  final double? borderBandCoverage;
  final double? pokemonLayoutScore;
  final double? pokemonHorizontalContrast;
  final double? pokemonTextPanelBrightRatio;
}

class _NativeDiagnosticsUsabilityDecision {
  const _NativeDiagnosticsUsabilityDecision({
    required this.usable,
    required this.reason,
  });

  final bool usable;
  final String reason;
}

class _LumaStats {
  const _LumaStats({required this.stdDev, required this.foregroundRatio});

  final double stdDev;
  final double foregroundRatio;
}

class _CardBorderStats {
  const _CardBorderStats({
    required this.brightRatio,
    required this.bandCoverage,
  });

  final double brightRatio;
  final double bandCoverage;
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
  int get area => width * height;
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
