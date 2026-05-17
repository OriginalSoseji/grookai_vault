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
    this.fastLockMinTopFiveFrames = 2,
    this.minTopFiveFramesToLock = 3,
    this.minRecentTopFiveFramesToAccept = 3,
    this.recentFrameWindow = 45,
    this.strictShutterAuthority = false,
  });

  static const double twoCropStrongDistanceGuard = 0.145;
  static const double singleFrameStrongDistanceGuard = 0.170;
  static const double strictShutterSameNameFamilyDistanceGuard = 0.145;
  static const double strictShutterFullCardExactDistanceGuard = 0.195;
  static const double strictShutterStableFullCardAlignmentDistanceGuard = 0.285;
  static const double singleFrameStrongTopOneGapGuard = 0.080;
  static const double visualFullCardAlignmentFastDistanceGuard = 0.185;
  static const double fullCardExactVisualMatchDistanceGuard = 0.305;
  static const double artworkIdentityFastDistanceGuard = 0.205;
  static const double singleFrameCrossCropDistanceGuard = 0.245;
  static const double stableArtworkIdentityDistanceGuard = 0.235;
  static const double stableTwoCropDistanceGuard = 0.285;
  static const double stableSameNameFamilyDistanceGuard = 0.285;
  static const double stableArtworkIdentityMinVoteGap = 0.25;
  static const double stableTwoCropMinVoteGap = 0.75;
  static const double stableSameNameFamilyMinVoteGap = 0.45;
  static const double artworkIdentityFastMinVoteGap = 0.75;
  static const double singleFrameCrossCropMinVoteGap = 0.45;
  static const int stableArtworkIdentityMinTopFiveFrames = 3;
  static const int stableArtworkIdentityMaxCropContributionCount = 1;
  static const int strictShutterStableFullCardAlignmentMinTopFiveFrames = 3;
  static const int stableSameNameFamilyMinTopFiveFrames = 2;
  static const int stableTwoCropMinTopFiveFrames = 2;
  static const int singleFrameCrossCropMinCropContributionCount = 3;
  static const int shutterRevealMinCropContributionCount = 4;
  static const String titleBandCropType = 'title_band';
  static const String artworkGrayCropType = 'artwork_zoom_in_10_gray';
  static const String priorityArtworkGrayCropType = 'priority_artwork_gray_top';
  static const String priorityIdentitySupportCropType =
      'priority_identity_support';
  static const String sameNameFamilyCropType = 'same_name_family_support';
  static const String visualFullCardAlignmentCropType =
      'visual_full_card_alignment';
  static const String coreIdentityConsensusCropType =
      'priority_core_identity_consensus';
  static const String visualIdentityBandCropType = 'visual_identity_band_match';
  static const String fullCardExactVisualMatchCropType =
      'full_card_exact_visual_match';

  final double decayFactor;
  final double lockScoreGap;
  final double identityAcceptScoreGap;
  final double identityAcceptFrameScoreGap;
  final double minScoreThreshold;
  final double maxAcceptedDistance;
  final int minCropTypesToLock;
  final int minCropTypesToAccept;
  final int fastLockMinTopFiveFrames;
  final int minTopFiveFramesToLock;
  final int minRecentTopFiveFramesToAccept;
  final int recentFrameWindow;
  final bool strictShutterAuthority;

  final Map<String, CandidateVoteRecord> scores =
      <String, CandidateVoteRecord>{};

  String? lockedCandidate;
  int updates = 0;

  CandidateVoteSnapshot update({
    required List<Candidate> candidates,
    required int frameIndex,
    bool allowLock = true,
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
    final sameNameFamilies = _sameNameFamilies(candidates);
    final sameNameFamilyLeaders = _sameNameFamilyLeaders(candidates);

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
      final nameKey = _nameFamilyKey(candidate.name);
      final sameNameFamilyCount = nameKey == null
          ? 0
          : sameNameFamilies[nameKey] ?? 0;
      final sameNameFamilyLeader =
          sameNameFamilyCount >= 2 &&
          nameKey != null &&
          sameNameFamilyLeaders[nameKey] == candidate.cardId;
      final sameNameFamilyBoost = sameNameFamilyCount >= 2
          ? (0.28 + ((sameNameFamilyCount - 2).clamp(0, 3) * 0.08))
          : 0.0;
      final sameNameLeaderBoost = sameNameFamilyLeader ? 0.72 : 0.0;
      final coreConsensusBoost =
          candidate.contributingCropTypes.contains(
            coreIdentityConsensusCropType,
          )
          ? 1.05
          : 0.0;
      final visualFullCardAlignmentBoost = _visualFullCardAlignmentReward(
        candidate,
      );
      final stableArtworkIdentityBoost = _stableArtworkIdentityReward(
        candidate,
      );
      final reward =
          rankSignal +
          (inTopFive ? 0.95 : 0.15) +
          cropConsistencyBoost +
          (rerankSignal * 0.35) +
          sameNameFamilyBoost +
          sameNameLeaderBoost +
          coreConsensusBoost +
          visualFullCardAlignmentBoost +
          stableArtworkIdentityBoost;
      record
        ..score += reward
        ..occurrences += 1
        ..lastSeenFrame = frameIndex
        ..bestRank = record.bestRank == null
            ? candidate.rank
            : (candidate.rank < record.bestRank!
                  ? candidate.rank
                  : record.bestRank)
        ..lastRank = candidate.rank
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
      record.mergeContributingCropTypes(candidate.contributingCropTypes);
      if (sameNameFamilyCount >= 2) {
        record.mergeContributingCropTypes(const <String>[
          sameNameFamilyCropType,
        ]);
      }
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
    if (allowLock) {
      if (strictShutterAuthority) {
        _tryStrictShutterAuthorityLock(frameIndex);
      } else {
        _tryLock(frameIndex);
      }
    }
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

  void clearLock() {
    lockedCandidate = null;
  }

  CandidateVoteSnapshot tryLockForReveal({required int frameIndex}) {
    if (strictShutterAuthority) {
      _tryStrictShutterAuthorityLock(frameIndex);
    } else {
      _tryLock(frameIndex);
      if (lockedCandidate == null) {
        _tryShutterRevealLock(frameIndex);
      }
    }
    return snapshot(frameIndex: frameIndex);
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
    final ranked = _rankedRecords();
    if (ranked.isEmpty) return;
    final lockableRanked = ranked
        .where(_candidateHasPrintedIdentitySupport)
        .toList(growable: false);
    if (lockableRanked.isEmpty) return;
    final fullCardExactVisualMatchCandidate =
        _fullCardExactVisualMatchLockCandidate(lockableRanked, frameIndex);
    if (fullCardExactVisualMatchCandidate != null) {
      lockedCandidate = fullCardExactVisualMatchCandidate.cardId;
      return;
    }
    final fullCardSameNameFamilyCandidate =
        _fullCardSameNameFamilyLockCandidate(lockableRanked, frameIndex);
    if (fullCardSameNameFamilyCandidate != null) {
      lockedCandidate = fullCardSameNameFamilyCandidate.cardId;
      return;
    }
    final coreConsensusCandidate = _coreConsensusFastLockCandidate(
      lockableRanked,
      frameIndex,
    );
    if (coreConsensusCandidate != null) {
      lockedCandidate = coreConsensusCandidate.cardId;
      return;
    }
    final stableArtworkCandidate = _stableArtworkIdentityLockCandidate(
      lockableRanked,
      frameIndex,
    );
    if (stableArtworkCandidate != null) {
      lockedCandidate = stableArtworkCandidate.cardId;
      return;
    }
    final best = lockableRanked.first;
    final secondScore = lockableRanked.length > 1
        ? lockableRanked[1].score
        : 0.0;
    final gap = best.score - secondScore;
    final recentTopFiveCount = best.recentTopFiveFrames
        .where((seenFrame) => frameIndex - seenFrame <= recentFrameWindow)
        .length;
    final stableRecent = recentTopFiveCount >= minTopFiveFramesToLock;
    final stableCrops = _candidateCropSupportReady(
      best,
      minimumCropTypes: minCropTypesToLock,
    );
    final scoreReady = best.score > minScoreThreshold;
    final fastTemporalReady = _fastTemporalEvidenceReady(
      best,
      recentTopFiveCount,
    );
    final singleFrameStrongReady = _singleFrameStrongEvidenceReady(
      best,
      recentTopFiveCount,
    );
    final coreConsensusFastReady = _coreConsensusFastEvidenceReady(
      best,
      recentTopFiveCount,
    );
    final visualFullCardAlignmentFastReady =
        _visualFullCardAlignmentFastEvidenceReady(best, recentTopFiveCount);
    final fullCardExactVisualMatchReady =
        _fullCardExactVisualMatchEvidenceReady(best, recentTopFiveCount);
    final artworkIdentityFastReady = _artworkIdentityFastEvidenceReady(
      best,
      recentTopFiveCount,
      gap,
    );
    final stableArtworkIdentityReady = _stableArtworkIdentityEvidenceReady(
      best,
      recentTopFiveCount,
      gap,
    );
    final stableSameNameFamilyReady = _stableSameNameFamilyEvidenceReady(
      best,
      recentTopFiveCount,
      gap,
    );
    final stableTwoCropReady = _stableTwoCropTemporalEvidenceReady(
      best,
      recentTopFiveCount,
      gap,
    );
    final singleFrameCrossCropReady = _singleFrameCrossCropEvidenceReady(
      best,
      recentTopFiveCount,
      gap,
    );
    if (singleFrameStrongReady && gap >= lockScoreGap && scoreReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (singleFrameCrossCropReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (coreConsensusFastReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (visualFullCardAlignmentFastReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (fullCardExactVisualMatchReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (artworkIdentityFastReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (stableArtworkIdentityReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (stableSameNameFamilyReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (stableTwoCropReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (fastTemporalReady && gap >= lockScoreGap && stableCrops && scoreReady) {
      lockedCandidate = best.cardId;
      return;
    }
    if (best.topFiveOccurrences >= minTopFiveFramesToLock &&
        gap >= lockScoreGap &&
        stableRecent &&
        stableCrops &&
        scoreReady &&
        best.bestDistance != null &&
        best.bestDistance! <= maxAcceptedDistance) {
      lockedCandidate = best.cardId;
    }
  }

  void _tryShutterRevealLock(int frameIndex) {
    if (lockedCandidate != null) return;
    final ranked = _rankedRecords();
    if (ranked.isEmpty) return;
    final lockableRanked = ranked
        .where(_candidateHasPrintedIdentitySupport)
        .toList(growable: false);
    if (lockableRanked.isEmpty) return;
    final best = lockableRanked.first;
    final secondScore = lockableRanked.length > 1
        ? lockableRanked[1].score
        : 0.0;
    final gap = best.score - secondScore;
    final recentTopFiveCount = best.recentTopFiveFrames
        .where((seenFrame) => frameIndex - seenFrame <= recentFrameWindow)
        .length;
    if (_shutterRevealEvidenceReady(best, recentTopFiveCount, gap) ||
        _stableArtworkIdentityEvidenceReady(best, recentTopFiveCount, gap) ||
        _stableSameNameFamilyEvidenceReady(best, recentTopFiveCount, gap)) {
      lockedCandidate = best.cardId;
    }
  }

  void _tryStrictShutterAuthorityLock(int frameIndex) {
    if (lockedCandidate != null) return;
    final ranked = _rankedRecords();
    if (ranked.isEmpty) return;
    final candidate = _strictShutterAuthorityCandidate(ranked, frameIndex);
    if (candidate == null) return;
    lockedCandidate = candidate.cardId;
  }

  List<CandidateVoteRecord> _rankedRecords() {
    return scores.values.toList(growable: false)..sort((a, b) {
      if (a.score != b.score) return b.score.compareTo(a.score);
      if (a.topFiveOccurrences != b.topFiveOccurrences) {
        return b.topFiveOccurrences.compareTo(a.topFiveOccurrences);
      }
      return a.cardId.compareTo(b.cardId);
    });
  }

  CandidateVoteRecord? _strictShutterAuthorityCandidate(
    List<CandidateVoteRecord> ranked,
    int frameIndex,
  ) {
    final candidates = ranked
        .where((candidate) {
          final recentTopFiveCount = _recentTopFiveCount(candidate, frameIndex);
          return _strictShutterAuthorityEvidenceReady(
            candidate,
            recentTopFiveCount,
          );
        })
        .toList(growable: false);
    if (candidates.isEmpty) return null;
    candidates.sort((a, b) {
      final distanceCompare = (a.bestDistance ?? double.infinity).compareTo(
        b.bestDistance ?? double.infinity,
      );
      if (distanceCompare != 0) return distanceCompare;
      final scoreCompare = b.score.compareTo(a.score);
      if (scoreCompare != 0) return scoreCompare;
      return a.cardId.compareTo(b.cardId);
    });
    return candidates.first;
  }

  CandidateVoteRecord? _coreConsensusFastLockCandidate(
    List<CandidateVoteRecord> ranked,
    int frameIndex,
  ) {
    for (final candidate in ranked) {
      final recentTopFiveCount = _recentTopFiveCount(candidate, frameIndex);
      if (_coreConsensusFastEvidenceReady(candidate, recentTopFiveCount)) {
        return candidate;
      }
    }
    return null;
  }

  CandidateVoteRecord? _fullCardExactVisualMatchLockCandidate(
    List<CandidateVoteRecord> ranked,
    int frameIndex,
  ) {
    for (final candidate in ranked) {
      final recentTopFiveCount = _recentTopFiveCount(candidate, frameIndex);
      if (_fullCardExactVisualMatchEvidenceReady(
        candidate,
        recentTopFiveCount,
      )) {
        return candidate;
      }
    }
    return null;
  }

  CandidateVoteRecord? _fullCardSameNameFamilyLockCandidate(
    List<CandidateVoteRecord> ranked,
    int frameIndex,
  ) {
    for (final candidate in ranked) {
      final recentTopFiveCount = _recentTopFiveCount(candidate, frameIndex);
      if (_fullCardSameNameFamilyFastEvidenceReady(
        candidate,
        recentTopFiveCount,
      )) {
        return candidate;
      }
    }
    return null;
  }

  CandidateVoteRecord? _stableArtworkIdentityLockCandidate(
    List<CandidateVoteRecord> ranked,
    int frameIndex,
  ) {
    for (final candidate in ranked) {
      final recentTopFiveCount = _recentTopFiveCount(candidate, frameIndex);
      final voteGap = _candidateVoteGap(candidate, ranked);
      if (_stableArtworkIdentityEvidenceReady(
        candidate,
        recentTopFiveCount,
        voteGap,
      )) {
        return candidate;
      }
    }
    return null;
  }

  double _candidateVoteGap(
    CandidateVoteRecord candidate,
    List<CandidateVoteRecord> ranked,
  ) {
    var strongestOtherScore = 0.0;
    for (final other in ranked) {
      if (other.cardId == candidate.cardId) continue;
      if (other.score > strongestOtherScore) {
        strongestOtherScore = other.score;
      }
    }
    return candidate.score - strongestOtherScore;
  }

  double _candidateEvidenceScore(Candidate candidate) {
    return (candidate.rerankScore ??
            candidate.aggregateScore ??
            candidate.similarity)
        .clamp(0.0, 1.0)
        .toDouble();
  }

  double _visualFullCardAlignmentReward(Candidate candidate) {
    if (candidate.contributingCropTypes.contains(
          fullCardExactVisualMatchCropType,
        ) &&
        candidate.distance <= fullCardExactVisualMatchDistanceGuard) {
      return 1.35;
    }
    if (!candidate.contributingCropTypes.contains(
      visualFullCardAlignmentCropType,
    )) {
      return 0.0;
    }
    if (candidate.distance <= visualFullCardAlignmentFastDistanceGuard) {
      return 1.20;
    }
    if (candidate.distance <= singleFrameCrossCropDistanceGuard) {
      return 0.35;
    }
    return 0.0;
  }

  double _stableArtworkIdentityReward(Candidate candidate) {
    if (!_hasStableSingleSlotArtworkSupport(candidate.contributingCropTypes)) {
      return 0.0;
    }
    final cropCount = candidate.cropContributionCount ?? 1;
    if (cropCount > stableArtworkIdentityMaxCropContributionCount) {
      return 0.0;
    }
    if (candidate.distance <= stableArtworkIdentityDistanceGuard) {
      return 0.65;
    }
    if (candidate.distance <= singleFrameCrossCropDistanceGuard) {
      return 0.18;
    }
    return 0.0;
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
    final stableFullCardAlignmentReady =
        visualLocked &&
        _stableFullCardAlignmentEvidenceReady(candidate, recentTopFiveCount);
    if (!_candidateHasPrintedIdentitySupport(candidate) &&
        !stableFullCardAlignmentReady) {
      return const _IdentityDecision(
        state: IdentityDecisionStateV1.candidateUnknown,
        reason: 'printed_identity_support_missing',
      );
    }
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
    final fastTemporalReady = _fastTemporalEvidenceReady(
      candidate,
      recentTopFiveCount,
    );
    final stableTwoCropReady = _stableTwoCropTemporalEvidenceReady(
      candidate,
      recentTopFiveCount,
      voteGap,
    );
    final singleFrameCrossCropReady = _singleFrameCrossCropEvidenceReady(
      candidate,
      recentTopFiveCount,
      voteGap,
    );
    final coreConsensusFastReady = _coreConsensusFastEvidenceReady(
      candidate,
      recentTopFiveCount,
    );
    final visualFullCardAlignmentFastReady =
        _visualFullCardAlignmentFastEvidenceReady(
          candidate,
          recentTopFiveCount,
        );
    final fullCardExactVisualMatchReady =
        _fullCardExactVisualMatchEvidenceReady(candidate, recentTopFiveCount);
    final artworkIdentityFastReady = _artworkIdentityFastEvidenceReady(
      candidate,
      recentTopFiveCount,
      voteGap,
    );
    final stableArtworkIdentityReady = _stableArtworkIdentityEvidenceReady(
      candidate,
      recentTopFiveCount,
      voteGap,
    );
    final stableSameNameFamilyReady = _stableSameNameFamilyEvidenceReady(
      candidate,
      recentTopFiveCount,
      voteGap,
    );

    if (bestCandidateId != null &&
        bestCandidateId != candidate.cardId &&
        !fullCardExactVisualMatchReady &&
        !coreConsensusFastReady &&
        !visualFullCardAlignmentFastReady &&
        !stableFullCardAlignmentReady &&
        !artworkIdentityFastReady &&
        !stableArtworkIdentityReady &&
        !stableSameNameFamilyReady) {
      failures.add('visual_lock_not_top_vote:$bestCandidateId');
      failureState = IdentityDecisionStateV1.candidateAmbiguous;
    }
    if (!fastTemporalReady &&
        !singleFrameCrossCropReady &&
        !fullCardExactVisualMatchReady &&
        !coreConsensusFastReady &&
        !visualFullCardAlignmentFastReady &&
        !stableFullCardAlignmentReady &&
        !artworkIdentityFastReady &&
        !stableArtworkIdentityReady &&
        !stableSameNameFamilyReady &&
        !stableTwoCropReady &&
        candidate.topFiveOccurrences < minTopFiveFramesToLock) {
      failures.add('top5_frames_below_min:${candidate.topFiveOccurrences}');
      failureState = IdentityDecisionStateV1.candidateUnstable;
    }
    if (!fastTemporalReady &&
        !singleFrameCrossCropReady &&
        !fullCardExactVisualMatchReady &&
        !coreConsensusFastReady &&
        !visualFullCardAlignmentFastReady &&
        !stableFullCardAlignmentReady &&
        !artworkIdentityFastReady &&
        !stableArtworkIdentityReady &&
        !stableSameNameFamilyReady &&
        !stableTwoCropReady &&
        recentTopFiveCount < minRecentTopFiveFramesToAccept) {
      failures.add('recent_support_below_min:$recentTopFiveCount');
      failureState = IdentityDecisionStateV1.candidateUnstable;
    }
    if (!_candidateCropSupportReady(
          candidate,
          minimumCropTypes: minCropTypesToAccept,
        ) &&
        !fastTemporalReady &&
        !singleFrameCrossCropReady &&
        !fullCardExactVisualMatchReady &&
        !coreConsensusFastReady &&
        !visualFullCardAlignmentFastReady &&
        !stableFullCardAlignmentReady &&
        !artworkIdentityFastReady &&
        !stableArtworkIdentityReady &&
        !stableSameNameFamilyReady &&
        !stableTwoCropReady) {
      failures.add(
        'crop_support_below_min:${candidate.bestCropContributionCount}',
      );
      failureState = IdentityDecisionStateV1.candidateUnknown;
    }
    if (candidate.bestDistance == null) {
      failures.add('distance_missing');
      failureState = IdentityDecisionStateV1.candidateUnknown;
    } else if (candidate.bestDistance! > maxAcceptedDistance) {
      if (!fastTemporalReady &&
          !singleFrameCrossCropReady &&
          !fullCardExactVisualMatchReady &&
          !coreConsensusFastReady &&
          !visualFullCardAlignmentFastReady &&
          !stableFullCardAlignmentReady &&
          !artworkIdentityFastReady &&
          !stableArtworkIdentityReady &&
          !stableSameNameFamilyReady &&
          !stableTwoCropReady) {
        failures.add(
          'distance_above_threshold:${candidate.bestDistance!.toStringAsFixed(3)}',
        );
        failureState = IdentityDecisionStateV1.candidateUnknown;
      }
    }
    if (voteGap < identityAcceptScoreGap &&
        !fastTemporalReady &&
        !singleFrameCrossCropReady &&
        !fullCardExactVisualMatchReady &&
        !coreConsensusFastReady &&
        !visualFullCardAlignmentFastReady &&
        !stableFullCardAlignmentReady &&
        !artworkIdentityFastReady &&
        !stableArtworkIdentityReady &&
        !stableSameNameFamilyReady &&
        !stableTwoCropReady) {
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
      reason: fastTemporalReady
          ? 'fast_confidence_guard_passed'
          : singleFrameCrossCropReady
          ? 'single_frame_cross_crop_guard_passed'
          : fullCardExactVisualMatchReady
          ? 'full_card_exact_visual_match_guard_passed'
          : coreConsensusFastReady
          ? 'core_identity_consensus_fast_guard_passed'
          : visualFullCardAlignmentFastReady
          ? 'visual_full_card_alignment_fast_guard_passed'
          : stableFullCardAlignmentReady
          ? 'stable_full_card_alignment_guard_passed'
          : artworkIdentityFastReady
          ? 'artwork_identity_fast_guard_passed'
          : stableArtworkIdentityReady
          ? 'stable_artwork_identity_guard_passed'
          : stableSameNameFamilyReady
          ? 'stable_same_name_family_guard_passed'
          : stableTwoCropReady
          ? 'stable_two_crop_distance_guard_passed'
          : 'confidence_guard_passed',
      acceptedCandidate: candidate.cardId,
    );
  }

  bool _fastTemporalEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
  ) {
    if (_singleFrameStrongEvidenceReady(candidate, recentTopFiveCount)) {
      return true;
    }
    if (candidate.topFiveOccurrences < fastLockMinTopFiveFrames ||
        recentTopFiveCount < fastLockMinTopFiveFrames) {
      return false;
    }
    if (!_candidateCropSupportReady(
      candidate,
      minimumCropTypes: minCropTypesToAccept,
    )) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    final distanceGuard =
        _candidateHasFullCardExactVisualMatchSupport(candidate)
        ? fullCardExactVisualMatchDistanceGuard
        : maxAcceptedDistance;
    if (bestDistance == null || bestDistance > distanceGuard) {
      return false;
    }
    if (bestDistance > twoCropStrongDistanceGuard &&
        !_candidateHasCloseIdentitySupport(candidate)) {
      return false;
    }
    return candidate.bestTopOneScoreGap >= identityAcceptFrameScoreGap;
  }

  bool _singleFrameStrongEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
  ) {
    if (candidate.topFiveOccurrences < 1 || recentTopFiveCount < 1) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (!_candidateCropSupportReady(
      candidate,
      minimumCropTypes: minCropTypesToAccept,
    )) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    if (bestDistance == null || bestDistance > singleFrameStrongDistanceGuard) {
      return false;
    }
    if (bestDistance > twoCropStrongDistanceGuard &&
        !_candidateHasCloseIdentitySupport(candidate)) {
      return false;
    }
    return candidate.bestTopOneScoreGap >= singleFrameStrongTopOneGapGuard ||
        _candidateHasSameNameFamilySupport(candidate);
  }

  bool _stableTwoCropTemporalEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
    double voteGap,
  ) {
    if (candidate.topFiveOccurrences < stableTwoCropMinTopFiveFrames ||
        recentTopFiveCount < stableTwoCropMinTopFiveFrames) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (candidate.bestCropContributionCount < minCropTypesToAccept) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    if (bestDistance == null || bestDistance > stableTwoCropDistanceGuard) {
      return false;
    }
    final hasTitleSupport = _candidateHasTitleSupport(candidate);
    final hasCoreConsensus = _candidateHasCoreIdentityConsensusSupport(
      candidate,
    );
    if (!hasTitleSupport && !hasCoreConsensus) {
      return false;
    }
    if (!hasTitleSupport && candidate.bestCropContributionCount < 3) {
      return false;
    }
    final minimumVoteGap = hasTitleSupport
        ? singleFrameCrossCropMinVoteGap
        : 0.24;
    if (voteGap < minimumVoteGap) {
      return false;
    }
    return candidate.bestTopOneScoreGap >= identityAcceptFrameScoreGap;
  }

  bool _singleFrameCrossCropEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
    double voteGap,
  ) {
    if (candidate.topFiveOccurrences < 1 || recentTopFiveCount < 1) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (candidate.bestCropContributionCount <
        singleFrameCrossCropMinCropContributionCount) {
      return false;
    }
    if (_candidateHasArtworkIdentitySupport(candidate) &&
        candidate.bestCropContributionCount <=
            singleFrameCrossCropMinCropContributionCount) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    if (bestDistance == null ||
        bestDistance > singleFrameCrossCropDistanceGuard) {
      return false;
    }
    if (voteGap < stableTwoCropMinVoteGap) {
      return false;
    }
    return candidate.bestTopOneScoreGap >= identityAcceptFrameScoreGap;
  }

  bool _coreConsensusFastEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
  ) {
    if (candidate.topFiveOccurrences < 1 || recentTopFiveCount < 1) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (!_candidateHasCoreIdentityConsensusSupport(candidate)) {
      return false;
    }
    if (candidate.bestCropContributionCount < 4) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    return bestDistance != null &&
        bestDistance <= singleFrameCrossCropDistanceGuard;
  }

  bool _fullCardExactVisualMatchEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
  ) {
    if (candidate.topFiveOccurrences < 1 || recentTopFiveCount < 1) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (!_candidateHasFullCardExactVisualMatchSupport(candidate)) {
      return false;
    }
    if (candidate.bestCropContributionCount < minCropTypesToAccept) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    return bestDistance != null &&
        bestDistance <= fullCardExactVisualMatchDistanceGuard;
  }

  bool _fullCardSameNameFamilyFastEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
  ) {
    if (candidate.topFiveOccurrences < 1 || recentTopFiveCount < 1) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (!_candidateHasStrictFullCardSameNameFamilySupport(candidate)) {
      return false;
    }
    return candidate.bestRank == 1;
  }

  bool _strictShutterAuthorityEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
  ) {
    if (candidate.topFiveOccurrences < 1 || recentTopFiveCount < 1) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (candidate.bestRank != 1) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    if (bestDistance == null) return false;
    if (_candidateHasFullCardExactVisualMatchSupport(candidate) &&
        candidate.contributingCropTypes.contains('full_card') &&
        candidate.bestCropContributionCount >= minCropTypesToAccept &&
        bestDistance <= strictShutterFullCardExactDistanceGuard) {
      return true;
    }
    if (_stableFullCardAlignmentEvidenceReady(candidate, recentTopFiveCount)) {
      return true;
    }
    if (_candidateHasSameNameFamilySupport(candidate) &&
        candidate.contributingCropTypes.contains('full_card') &&
        candidate.bestCropContributionCount >= minCropTypesToAccept &&
        bestDistance <= strictShutterSameNameFamilyDistanceGuard) {
      return true;
    }
    return false;
  }

  bool _stableFullCardAlignmentEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
  ) {
    if (candidate.topFiveOccurrences <
            strictShutterStableFullCardAlignmentMinTopFiveFrames ||
        recentTopFiveCount <
            strictShutterStableFullCardAlignmentMinTopFiveFrames) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (candidate.bestRank != 1) {
      return false;
    }
    if (!_candidateHasVisualFullCardAlignmentSupport(candidate)) {
      return false;
    }
    if (!candidate.contributingCropTypes.contains(visualIdentityBandCropType)) {
      return false;
    }
    if (!candidate.contributingCropTypes.contains('full_card')) {
      return false;
    }
    if (candidate.bestCropContributionCount < minCropTypesToAccept) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    return bestDistance != null &&
        bestDistance <= strictShutterStableFullCardAlignmentDistanceGuard;
  }

  bool _visualFullCardAlignmentFastEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
  ) {
    if (candidate.topFiveOccurrences < 1 || recentTopFiveCount < 1) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (!_candidateHasVisualFullCardAlignmentSupport(candidate)) {
      return false;
    }
    if (candidate.bestCropContributionCount < minCropTypesToAccept) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    return bestDistance != null &&
        bestDistance <= visualFullCardAlignmentFastDistanceGuard;
  }

  bool _artworkIdentityFastEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
    double voteGap,
  ) {
    if (candidate.topFiveOccurrences < 1 || recentTopFiveCount < 1) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (!_candidateHasArtworkIdentitySupport(candidate)) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    if (bestDistance == null ||
        bestDistance > artworkIdentityFastDistanceGuard) {
      return false;
    }
    if (voteGap < artworkIdentityFastMinVoteGap) {
      return false;
    }
    return candidate.bestTopOneScoreGap >= identityAcceptFrameScoreGap;
  }

  bool _stableArtworkIdentityEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
    double voteGap,
  ) {
    if (candidate.topFiveOccurrences < stableArtworkIdentityMinTopFiveFrames ||
        recentTopFiveCount < stableArtworkIdentityMinTopFiveFrames) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (!_candidateHasStableSingleSlotArtworkSupport(candidate)) {
      return false;
    }
    if (candidate.bestCropContributionCount >
        stableArtworkIdentityMaxCropContributionCount) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    if (bestDistance == null ||
        bestDistance > stableArtworkIdentityDistanceGuard) {
      return false;
    }
    return voteGap >= stableArtworkIdentityMinVoteGap;
  }

  bool _stableSameNameFamilyEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
    double voteGap,
  ) {
    if (candidate.topFiveOccurrences < stableSameNameFamilyMinTopFiveFrames ||
        recentTopFiveCount < stableSameNameFamilyMinTopFiveFrames) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (!_candidateHasSameNameFamilySupport(candidate)) {
      return false;
    }
    if (candidate.bestCropContributionCount < minCropTypesToAccept) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    if (bestDistance == null ||
        bestDistance > stableSameNameFamilyDistanceGuard) {
      return false;
    }
    return voteGap >= stableSameNameFamilyMinVoteGap;
  }

  bool _shutterRevealEvidenceReady(
    CandidateVoteRecord candidate,
    int recentTopFiveCount,
    double voteGap,
  ) {
    if (candidate.topFiveOccurrences < minTopFiveFramesToLock ||
        recentTopFiveCount < minRecentTopFiveFramesToAccept) {
      return false;
    }
    if (candidate.score <= minScoreThreshold) {
      return false;
    }
    if (candidate.bestCropContributionCount <
        shutterRevealMinCropContributionCount) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    if (bestDistance == null || bestDistance > maxAcceptedDistance) {
      return false;
    }
    if (voteGap < identityAcceptScoreGap) {
      return false;
    }
    return candidate.bestTopOneScoreGap >= identityAcceptFrameScoreGap;
  }

  bool _candidateHasTitleSupport(CandidateVoteRecord candidate) {
    return candidate.contributingCropTypes.contains(titleBandCropType);
  }

  bool _candidateHasPrintedIdentitySupport(CandidateVoteRecord candidate) {
    return _candidateHasFullCardExactVisualMatchSupport(candidate) ||
        _candidateHasStrictCoreIdentityConsensusSupport(candidate) ||
        _candidateHasStrictFullCardSameNameFamilySupport(candidate) ||
        (_candidateHasTitleSupport(candidate) &&
            candidate.contributingCropTypes.contains(
              visualIdentityBandCropType,
            ));
  }

  bool _candidateHasFullCardExactVisualMatchSupport(
    CandidateVoteRecord candidate,
  ) {
    return candidate.contributingCropTypes.contains(
      fullCardExactVisualMatchCropType,
    );
  }

  bool _candidateHasSameNameFamilySupport(CandidateVoteRecord candidate) {
    return candidate.contributingCropTypes.contains(sameNameFamilyCropType);
  }

  bool _candidateHasCoreIdentityConsensusSupport(
    CandidateVoteRecord candidate,
  ) {
    return candidate.contributingCropTypes.contains(
      coreIdentityConsensusCropType,
    );
  }

  bool _candidateHasStrictCoreIdentityConsensusSupport(
    CandidateVoteRecord candidate,
  ) {
    final bestDistance = candidate.bestDistance;
    return _candidateHasCoreIdentityConsensusSupport(candidate) &&
        candidate.bestCropContributionCount >= 4 &&
        bestDistance != null &&
        bestDistance <= singleFrameCrossCropDistanceGuard;
  }

  bool _candidateHasStrictFullCardSameNameFamilySupport(
    CandidateVoteRecord candidate,
  ) {
    final bestDistance = candidate.bestDistance;
    return _candidateHasSameNameFamilySupport(candidate) &&
        candidate.contributingCropTypes.contains('full_card') &&
        candidate.bestCropContributionCount >= minCropTypesToAccept &&
        bestDistance != null &&
        bestDistance <= singleFrameStrongDistanceGuard;
  }

  bool _candidateHasCloseIdentitySupport(CandidateVoteRecord candidate) {
    if (_candidateHasTitleSupport(candidate)) return true;
    if (_candidateHasFullCardExactVisualMatchSupport(candidate)) return true;
    if (_candidateHasVisualFullCardAlignmentSupport(candidate)) return true;
    if (_candidateHasCoreIdentityConsensusSupport(candidate)) return true;
    if (_candidateHasArtworkIdentitySupport(candidate)) return true;
    if (!_candidateHasSameNameFamilySupport(candidate)) return false;
    final bestDistance = candidate.bestDistance;
    return bestDistance != null &&
        bestDistance <= singleFrameStrongDistanceGuard;
  }

  bool _candidateHasVisualFullCardAlignmentSupport(
    CandidateVoteRecord candidate,
  ) {
    return candidate.contributingCropTypes.contains(
      visualFullCardAlignmentCropType,
    );
  }

  bool _candidateHasArtworkIdentitySupport(CandidateVoteRecord candidate) {
    return candidate.contributingCropTypes.contains(artworkGrayCropType) &&
        candidate.contributingCropTypes.contains(priorityArtworkGrayCropType) &&
        candidate.contributingCropTypes.contains(
          priorityIdentitySupportCropType,
        );
  }

  bool _candidateHasStableSingleSlotArtworkSupport(
    CandidateVoteRecord candidate,
  ) {
    return _hasStableSingleSlotArtworkSupport(candidate.contributingCropTypes);
  }

  bool _hasStableSingleSlotArtworkSupport(Iterable<String> cropTypes) {
    return cropTypes.length == 1 && cropTypes.contains(artworkGrayCropType);
  }

  bool _candidateCropSupportReady(
    CandidateVoteRecord candidate, {
    required int minimumCropTypes,
  }) {
    if (candidate.bestCropContributionCount < minimumCropTypes) {
      return false;
    }
    if (candidate.bestCropContributionCount <= 2 &&
        !_candidateHasCloseIdentitySupport(candidate)) {
      return false;
    }
    final bestDistance = candidate.bestDistance;
    if (candidate.bestCropContributionCount <= 2 &&
        bestDistance != null &&
        bestDistance > twoCropStrongDistanceGuard &&
        !_candidateHasCloseIdentitySupport(candidate)) {
      return false;
    }
    return true;
  }

  Map<String, int> _sameNameFamilies(List<Candidate> candidates) {
    final counts = <String, int>{};
    for (final candidate in candidates) {
      final key = _nameFamilyKey(candidate.name);
      if (key == null) continue;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    counts.removeWhere((_, count) => count < 2);
    return counts;
  }

  Map<String, String> _sameNameFamilyLeaders(List<Candidate> candidates) {
    final leaders = <String, Candidate>{};
    for (final candidate in candidates) {
      final key = _nameFamilyKey(candidate.name);
      if (key == null) continue;
      final current = leaders[key];
      if (current == null || _candidateSortsAhead(candidate, current)) {
        leaders[key] = candidate;
      }
    }
    return leaders.map((key, candidate) => MapEntry(key, candidate.cardId));
  }

  bool _candidateSortsAhead(Candidate left, Candidate right) {
    if (left.rank != right.rank) return left.rank < right.rank;
    if (left.distance != right.distance) return left.distance < right.distance;
    return left.cardId.compareTo(right.cardId) < 0;
  }

  String? _nameFamilyKey(String? name) {
    final normalized = name
        ?.toLowerCase()
        .replaceAll(RegExp(r"[^a-z0-9]+"), ' ')
        .trim()
        .replaceAll(RegExp(r'\s+'), ' ');
    return normalized == null || normalized.isEmpty ? null : normalized;
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
    this.lastRank,
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
    Set<String>? contributingCropTypes,
  }) : contributingCropTypes = contributingCropTypes ?? <String>{};

  final String cardId;
  double score;
  int occurrences;
  int topFiveOccurrences;
  int lastSeenFrame;
  int lastTopFiveFrame;
  int? bestRank;
  int? lastRank;
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
  final Set<String> contributingCropTypes;
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

  void mergeContributingCropTypes(Iterable<String> cropTypes) {
    for (final cropType in cropTypes) {
      if (cropType.isEmpty) continue;
      contributingCropTypes.add(cropType);
    }
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
