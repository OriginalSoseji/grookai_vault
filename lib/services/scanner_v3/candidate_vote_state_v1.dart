import 'vector_candidate_service_v1.dart';

class CandidateVoteState {
  CandidateVoteState({
    this.decayFactor = 0.72,
    this.lockScoreGap = 0.6,
    this.identityAcceptScoreGap = 0.6,
    this.identityAcceptFrameScoreGap = 0.015,
    this.minScoreThreshold = 1.2,
    this.maxAcceptedDistance = 0.195,
    this.minCropTypesToLock = 2,
    this.minCropTypesToAccept = 2,
    this.minTopFiveFramesToLock = 3,
    this.minRecentTopFiveFramesToAccept = 3,
    this.recentFrameWindow = 5,
  });

  final double decayFactor;
  final double lockScoreGap;
  final double identityAcceptScoreGap;
  final double identityAcceptFrameScoreGap;
  final double minScoreThreshold;
  final double maxAcceptedDistance;
  final int minCropTypesToLock;
  final int minCropTypesToAccept;
  final int minTopFiveFramesToLock;
  final int minRecentTopFiveFramesToAccept;
  final int recentFrameWindow;

  final Map<String, CandidateVoteRecord> scores =
      <String, CandidateVoteRecord>{};

  String? lockedCandidate;
  int updates = 0;

  CandidateVoteSnapshot update({
    required List<Candidate> candidates,
    required int frameIndex,
  }) {
    updates += 1;
    _decayAll();

    final topEvidenceScore = candidates.isEmpty
        ? 0.0
        : _candidateEvidenceScore(candidates.first);
    final secondEvidenceScore = candidates.length > 1
        ? _candidateEvidenceScore(candidates[1])
        : 0.0;
    final frameScoreGap = topEvidenceScore > secondEvidenceScore
        ? topEvidenceScore - secondEvidenceScore
        : 0.0;

    for (final candidate in candidates) {
      final record = scores.putIfAbsent(
        candidate.cardId,
        () => CandidateVoteRecord(cardId: candidate.cardId),
      );
      final inTopFive = candidate.rank <= 5;
      final rankSignal = 3.0 / (candidate.rank + 1);
      final cropCount = candidate.cropContributionCount ?? 1;
      final cropConsistencyBoost = (cropCount - 1).clamp(0, 7) * 0.12;
      final rerankSignal = (candidate.rerankScore ?? 0).clamp(0.0, 1.0);
      final evidenceScore = _candidateEvidenceScore(candidate);
      final reward =
          rankSignal +
          (inTopFive ? 0.95 : 0.15) +
          cropConsistencyBoost +
          (rerankSignal * 0.35);
      record
        ..score += reward
        ..occurrences += 1
        ..lastSeenFrame = frameIndex
        ..bestRank = record.bestRank == null
            ? candidate.rank
            : (candidate.rank < record.bestRank!
                  ? candidate.rank
                  : record.bestRank)
        ..lastDistance = candidate.distance
        ..lastEvidenceScore = evidenceScore;
      record.bestDistance = record.bestDistance == null
          ? candidate.distance
          : (candidate.distance < record.bestDistance!
                ? candidate.distance
                : record.bestDistance);
      if (candidate.similarity > record.bestSimilarity) {
        record.bestSimilarity = candidate.similarity;
      }
      final aggregateScore = candidate.aggregateScore;
      if (aggregateScore != null &&
          aggregateScore > record.bestAggregateScore) {
        record.bestAggregateScore = aggregateScore;
      }
      final rerankScore = candidate.rerankScore;
      if (rerankScore != null && rerankScore > record.bestRerankScore) {
        record.bestRerankScore = rerankScore;
      }
      if (candidate.rank == 1) {
        record
          ..lastTopOneScoreGap = frameScoreGap
          ..bestTopOneScoreGap = frameScoreGap > record.bestTopOneScoreGap
              ? frameScoreGap
              : record.bestTopOneScoreGap;
      }
      record.mergeDisplayMetadata(candidate);
      if (cropCount > record.bestCropContributionCount) {
        record.bestCropContributionCount = cropCount;
      }
      if (inTopFive) {
        record
          ..topFiveOccurrences += 1
          ..lastTopFiveFrame = frameIndex;
        record.recordTopFiveFrame(frameIndex, recentFrameWindow);
      }
    }

    _removeStale(frameIndex);
    _tryLock(frameIndex);
    return snapshot(frameIndex: frameIndex);
  }

  CandidateVoteSnapshot decayOnly({required int frameIndex}) {
    _decayAll();
    _removeStale(frameIndex);
    return snapshot(frameIndex: frameIndex);
  }

  CandidateVoteSnapshot snapshot({int? frameIndex}) {
    final ranked = scores.values.toList(growable: false)
      ..sort((a, b) {
        if (a.score != b.score) return b.score.compareTo(a.score);
        if (a.topFiveOccurrences != b.topFiveOccurrences) {
          return b.topFiveOccurrences.compareTo(a.topFiveOccurrences);
        }
        return a.cardId.compareTo(b.cardId);
      });
    final best = ranked.isEmpty ? null : ranked.first;
    CandidateVoteRecord? lockedRecord;
    if (lockedCandidate != null) {
      for (final candidate in ranked) {
        if (candidate.cardId == lockedCandidate) {
          lockedRecord = candidate;
          break;
        }
      }
    }
    final decisionCandidate = lockedRecord ?? best;
    final topScore = best?.score ?? 0.0;
    final secondScore = ranked.length > 1 ? ranked[1].score : 0.0;
    final gap = best == null ? 0.0 : topScore - secondScore;
    final occurrenceSignal = best == null
        ? 0.0
        : (best.topFiveOccurrences / minTopFiveFramesToLock)
              .clamp(0.0, 1.0)
              .toDouble();
    final gapSignal = (gap / lockScoreGap).clamp(0.0, 1.0).toDouble();
    final recentSignal = best == null || frameIndex == null
        ? 0.0
        : (best.recentTopFiveFrames
                      .where(
                        (seenFrame) =>
                            frameIndex - seenFrame <= recentFrameWindow,
                      )
                      .length /
                  minTopFiveFramesToLock)
              .clamp(0.0, 1.0)
              .toDouble();
    final cropSignal = decisionCandidate == null
        ? 0.0
        : (decisionCandidate.bestCropContributionCount / minCropTypesToAccept)
              .clamp(0.0, 1.0)
              .toDouble();
    final distanceSignal =
        decisionCandidate == null || decisionCandidate.bestDistance == null
        ? 0.0
        : ((maxAcceptedDistance - decisionCandidate.bestDistance!) /
                  maxAcceptedDistance)
              .clamp(0.0, 1.0)
              .toDouble();
    final frameGapSignal = decisionCandidate == null
        ? 0.0
        : (decisionCandidate.bestTopOneScoreGap / identityAcceptFrameScoreGap)
              .clamp(0.0, 1.0)
              .toDouble();
    final decision = _evaluateIdentityDecision(
      candidate: decisionCandidate,
      visualLocked: lockedCandidate != null,
      voteGap: gap,
      bestCandidateId: best?.cardId,
      frameIndex: frameIndex,
    );
    final confidence = decision.acceptedCandidate != null
        ? 1.0
        : ((occurrenceSignal * 0.22) +
                  (gapSignal * 0.18) +
                  (recentSignal * 0.18) +
                  (cropSignal * 0.17) +
                  (distanceSignal * 0.15) +
                  (frameGapSignal * 0.10))
              .clamp(0.0, 1.0)
              .toDouble();

    return CandidateVoteSnapshot(
      lockedCandidate: lockedCandidate,
      acceptedCandidate: decision.acceptedCandidate,
      bestCandidate: best,
      decisionCandidate: decisionCandidate,
      rankedCandidates: ranked,
      scoreGap: gap,
      topCandidateScore: topScore,
      secondCandidateScore: secondScore,
      candidateFrameScoreGap: decisionCandidate?.bestTopOneScoreGap ?? 0,
      candidateCropSupportCount:
          decisionCandidate?.bestCropContributionCount ?? 0,
      candidateRecentTopFiveCount: decisionCandidate == null
          ? 0
          : _recentTopFiveCount(decisionCandidate, frameIndex),
      candidateDistance: decisionCandidate?.bestDistance,
      candidateSimilarity: decisionCandidate?.bestSimilarity,
      confidence: confidence,
      identityDecisionState: decision.state,
      identityDecisionReason: decision.reason,
      updates: updates,
    );
  }

  void reset() {
    scores.clear();
    lockedCandidate = null;
    updates = 0;
  }

  void _decayAll() {
    for (final record in scores.values) {
      record.score *= decayFactor;
    }
  }

  void _removeStale(int frameIndex) {
    final removeIds = <String>[];
    for (final record in scores.values) {
      if (lockedCandidate == record.cardId) continue;
      if (frameIndex - record.lastSeenFrame > 16 && record.score < 0.8) {
        removeIds.add(record.cardId);
      }
    }
    for (final id in removeIds) {
      scores.remove(id);
    }
  }

  void _tryLock(int frameIndex) {
    if (lockedCandidate != null) return;
    final ranked = snapshot(frameIndex: frameIndex).rankedCandidates;
    if (ranked.isEmpty) return;
    final best = ranked.first;
    final secondScore = ranked.length > 1 ? ranked[1].score : 0.0;
    final gap = best.score - secondScore;
    final recentTopFiveCount = best.recentTopFiveFrames
        .where((seenFrame) => frameIndex - seenFrame <= recentFrameWindow)
        .length;
    final stableRecent = recentTopFiveCount >= minTopFiveFramesToLock;
    final stableCrops = best.bestCropContributionCount >= minCropTypesToLock;
    final scoreReady = best.score > minScoreThreshold;
    if (best.topFiveOccurrences >= minTopFiveFramesToLock &&
        gap >= lockScoreGap &&
        stableRecent &&
        stableCrops &&
        scoreReady) {
      lockedCandidate = best.cardId;
    }
  }

  double _candidateEvidenceScore(Candidate candidate) {
    return (candidate.rerankScore ??
            candidate.aggregateScore ??
            candidate.similarity)
        .clamp(0.0, 1.0)
        .toDouble();
  }

  int _recentTopFiveCount(CandidateVoteRecord candidate, int? frameIndex) {
    if (frameIndex == null) return 0;
    return candidate.recentTopFiveFrames
        .where((seenFrame) => frameIndex - seenFrame <= recentFrameWindow)
        .length;
  }

  _IdentityDecision _evaluateIdentityDecision({
    required CandidateVoteRecord? candidate,
    required bool visualLocked,
    required double voteGap,
    required String? bestCandidateId,
    required int? frameIndex,
  }) {
    if (candidate == null) {
      return const _IdentityDecision(
        state: IdentityDecisionStateV1.scanning,
        reason: 'no_candidates',
      );
    }

    final recentTopFiveCount = _recentTopFiveCount(candidate, frameIndex);
    if (!visualLocked) {
      if (candidate.topFiveOccurrences < minTopFiveFramesToLock ||
          recentTopFiveCount < minRecentTopFiveFramesToAccept) {
        return _IdentityDecision(
          state: IdentityDecisionStateV1.candidateUnstable,
          reason:
              'visual_convergence_pending:top5=${candidate.topFiveOccurrences};recent=$recentTopFiveCount',
        );
      }
      if (candidate.score <= minScoreThreshold) {
        return _IdentityDecision(
          state: IdentityDecisionStateV1.candidateUnstable,
          reason:
              'visual_convergence_pending:top1_score=${candidate.score.toStringAsFixed(2)}',
        );
      }
      if (candidate.bestCropContributionCount < minCropTypesToLock) {
        return _IdentityDecision(
          state: IdentityDecisionStateV1.candidateUnknown,
          reason:
              'visual_convergence_pending:crop_support=${candidate.bestCropContributionCount}',
        );
      }
      if (voteGap < lockScoreGap) {
        return _IdentityDecision(
          state: IdentityDecisionStateV1.candidateAmbiguous,
          reason:
              'visual_convergence_pending:vote_gap=${voteGap.toStringAsFixed(2)}',
        );
      }
      return const _IdentityDecision(
        state: IdentityDecisionStateV1.candidateUnstable,
        reason: 'visual_convergence_pending',
      );
    }

    final failures = <String>[];
    var failureState = IdentityDecisionStateV1.candidateUnstable;

    if (bestCandidateId != null && bestCandidateId != candidate.cardId) {
      failures.add('visual_lock_not_top_vote:$bestCandidateId');
      failureState = IdentityDecisionStateV1.candidateAmbiguous;
    }
    if (candidate.topFiveOccurrences < minTopFiveFramesToLock) {
      failures.add('top5_frames_below_min:${candidate.topFiveOccurrences}');
      failureState = IdentityDecisionStateV1.candidateUnstable;
    }
    if (recentTopFiveCount < minRecentTopFiveFramesToAccept) {
      failures.add('recent_support_below_min:$recentTopFiveCount');
      failureState = IdentityDecisionStateV1.candidateUnstable;
    }
    if (candidate.bestCropContributionCount < minCropTypesToAccept) {
      failures.add(
        'crop_support_below_min:${candidate.bestCropContributionCount}',
      );
      failureState = IdentityDecisionStateV1.candidateUnknown;
    }
    if (candidate.bestDistance == null) {
      failures.add('distance_missing');
      failureState = IdentityDecisionStateV1.candidateUnknown;
    } else if (candidate.bestDistance! > maxAcceptedDistance) {
      failures.add(
        'distance_above_threshold:${candidate.bestDistance!.toStringAsFixed(3)}',
      );
      failureState = IdentityDecisionStateV1.candidateUnknown;
    }
    if (voteGap < identityAcceptScoreGap) {
      failures.add('vote_gap_below_guard:${voteGap.toStringAsFixed(2)}');
      if (failureState != IdentityDecisionStateV1.candidateUnknown) {
        failureState = IdentityDecisionStateV1.candidateAmbiguous;
      }
    }
    if (candidate.score <= minScoreThreshold) {
      failures.add(
        'top1_score_below_min:${candidate.score.toStringAsFixed(2)}',
      );
      failureState = IdentityDecisionStateV1.candidateUnstable;
    }

    if (failures.isNotEmpty) {
      return _IdentityDecision(state: failureState, reason: failures.join(','));
    }

    return _IdentityDecision(
      state: IdentityDecisionStateV1.identityLocked,
      reason: 'confidence_guard_passed',
      acceptedCandidate: candidate.cardId,
    );
  }
}

class IdentityDecisionStateV1 {
  const IdentityDecisionStateV1._();

  static const scanning = 'scanning';
  static const candidateUnstable = 'candidate_unstable';
  static const candidateAmbiguous = 'candidate_ambiguous';
  static const candidateUnknown = 'candidate_unknown';
  static const identityLocked = 'identity_locked';
}

class CandidateVoteSnapshot {
  const CandidateVoteSnapshot({
    required this.lockedCandidate,
    required this.acceptedCandidate,
    required this.bestCandidate,
    required this.decisionCandidate,
    required this.rankedCandidates,
    required this.scoreGap,
    required this.topCandidateScore,
    required this.secondCandidateScore,
    required this.candidateFrameScoreGap,
    required this.candidateCropSupportCount,
    required this.candidateRecentTopFiveCount,
    required this.candidateDistance,
    required this.candidateSimilarity,
    required this.confidence,
    required this.identityDecisionState,
    required this.identityDecisionReason,
    required this.updates,
  });

  final String? lockedCandidate;
  final String? acceptedCandidate;
  final CandidateVoteRecord? bestCandidate;
  final CandidateVoteRecord? decisionCandidate;
  final List<CandidateVoteRecord> rankedCandidates;
  final double scoreGap;
  final double topCandidateScore;
  final double secondCandidateScore;
  final double candidateFrameScoreGap;
  final int candidateCropSupportCount;
  final int candidateRecentTopFiveCount;
  final double? candidateDistance;
  final double? candidateSimilarity;
  final double confidence;
  final String identityDecisionState;
  final String identityDecisionReason;
  final int updates;

  static const empty = CandidateVoteSnapshot(
    lockedCandidate: null,
    acceptedCandidate: null,
    bestCandidate: null,
    decisionCandidate: null,
    rankedCandidates: <CandidateVoteRecord>[],
    scoreGap: 0,
    topCandidateScore: 0,
    secondCandidateScore: 0,
    candidateFrameScoreGap: 0,
    candidateCropSupportCount: 0,
    candidateRecentTopFiveCount: 0,
    candidateDistance: null,
    candidateSimilarity: null,
    confidence: 0,
    identityDecisionState: IdentityDecisionStateV1.scanning,
    identityDecisionReason: 'waiting_for_candidates',
    updates: 0,
  );
}

class CandidateVoteRecord {
  CandidateVoteRecord({
    required this.cardId,
    this.score = 0,
    this.occurrences = 0,
    this.topFiveOccurrences = 0,
    this.lastSeenFrame = 0,
    this.lastTopFiveFrame = 0,
    this.bestRank,
    this.lastDistance,
    this.bestDistance,
    this.lastEvidenceScore = 0,
    this.bestSimilarity = 0,
    this.bestAggregateScore = 0,
    this.bestRerankScore = 0,
    this.lastTopOneScoreGap = 0,
    this.bestTopOneScoreGap = 0,
    this.bestCropContributionCount = 0,
    this.name,
    this.setCode,
    this.number,
    this.gvId,
    this.imageUrl,
  });

  final String cardId;
  double score;
  int occurrences;
  int topFiveOccurrences;
  int lastSeenFrame;
  int lastTopFiveFrame;
  int? bestRank;
  double? lastDistance;
  double? bestDistance;
  double lastEvidenceScore;
  double bestSimilarity;
  double bestAggregateScore;
  double bestRerankScore;
  double lastTopOneScoreGap;
  double bestTopOneScoreGap;
  int bestCropContributionCount;
  String? name;
  String? setCode;
  String? number;
  String? gvId;
  String? imageUrl;
  final List<int> recentTopFiveFrames = <int>[];

  void recordTopFiveFrame(int frameIndex, int recentFrameWindow) {
    if (recentTopFiveFrames.isEmpty || recentTopFiveFrames.last != frameIndex) {
      recentTopFiveFrames.add(frameIndex);
    }
    recentTopFiveFrames.removeWhere(
      (seenFrame) => frameIndex - seenFrame > recentFrameWindow,
    );
  }

  void mergeDisplayMetadata(Candidate candidate) {
    name ??= candidate.name;
    setCode ??= candidate.setCode;
    number ??= candidate.number;
    gvId ??= candidate.gvId;
    imageUrl ??= candidate.imageUrl;
  }
}

class _IdentityDecision {
  const _IdentityDecision({
    required this.state,
    required this.reason,
    this.acceptedCandidate,
  });

  final String state;
  final String reason;
  final String? acceptedCandidate;
}
