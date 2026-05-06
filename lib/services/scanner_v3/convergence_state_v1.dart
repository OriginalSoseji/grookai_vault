class CandidateState {
  const CandidateState({
    required this.id,
    required this.score,
    required this.occurrences,
    required this.lastSeenFrame,
    this.fullCardHash,
    this.artworkHash,
    this.lastDistance,
    this.source = 'hash_cluster',
    this.vectorDistance,
    this.topFiveOccurrences,
    this.bestRank,
    this.cropContributionCount,
    this.recentTopFiveCount,
    this.similarity,
    this.aggregateScore,
    this.rerankScore,
    this.name,
    this.setCode,
    this.number,
    this.gvId,
    this.imageUrl,
  });

  final String id;
  final double score;
  final int occurrences;
  final int lastSeenFrame;
  final String? fullCardHash;
  final String? artworkHash;
  final int? lastDistance;
  final String source;
  final double? vectorDistance;
  final int? topFiveOccurrences;
  final int? bestRank;
  final int? cropContributionCount;
  final int? recentTopFiveCount;
  final double? similarity;
  final double? aggregateScore;
  final double? rerankScore;
  final String? name;
  final String? setCode;
  final String? number;
  final String? gvId;
  final String? imageUrl;
}

class ScannerV3QualitySnapshot {
  const ScannerV3QualitySnapshot({
    required this.blurScore,
    required this.brightnessScore,
    required this.glareRatio,
    required this.cardFillRatio,
    required this.accepted,
    required this.rejectionReasons,
  });

  static const empty = ScannerV3QualitySnapshot(
    blurScore: 0,
    brightnessScore: 0,
    glareRatio: 0,
    cardFillRatio: 0,
    accepted: false,
    rejectionReasons: <String>[],
  );

  final double blurScore;
  final double brightnessScore;
  final double glareRatio;
  final double cardFillRatio;
  final bool accepted;
  final List<String> rejectionReasons;
}

class ScannerV3LiveLoopState {
  const ScannerV3LiveLoopState({
    required this.frameCount,
    required this.sampledFrameCount,
    required this.acceptedFrameCount,
    required this.rejectedFrameCount,
    required this.locked,
    required this.currentBestCandidateId,
    required this.lockedCandidateId,
    required this.confidenceScore,
    required this.candidates,
    required this.quality,
    required this.statusText,
    required this.lastDecisionReason,
    required this.lastSampleElapsedMs,
    required this.selectedQuadSource,
    required this.detectorConfidence,
    required this.detectorElapsedMs,
    required this.embeddingElapsedMs,
    required this.vectorSearchElapsedMs,
    required this.vectorCandidateCount,
    required this.identitySignalSource,
    required this.identityDecisionState,
    required this.identityDecisionReason,
    required this.identityScoreGap,
    required this.identityTopCandidateScore,
    required this.identitySecondCandidateScore,
    required this.identityFrameScoreGap,
    required this.identityCropSupportCount,
    required this.identityRecentFrameSupportCount,
    required this.identityTopDistance,
    required this.identityTopSimilarity,
    required this.identityServiceUnavailable,
    required this.identityServiceError,
    required this.cardPresent,
    required this.cardPresentReason,
  });

  static const initial = ScannerV3LiveLoopState(
    frameCount: 0,
    sampledFrameCount: 0,
    acceptedFrameCount: 0,
    rejectedFrameCount: 0,
    locked: false,
    currentBestCandidateId: null,
    lockedCandidateId: null,
    confidenceScore: 0,
    candidates: <CandidateState>[],
    quality: ScannerV3QualitySnapshot.empty,
    statusText: 'Scanning...',
    lastDecisionReason: 'waiting_for_frames',
    lastSampleElapsedMs: 0,
    selectedQuadSource: 'waiting',
    detectorConfidence: null,
    detectorElapsedMs: null,
    embeddingElapsedMs: null,
    vectorSearchElapsedMs: null,
    vectorCandidateCount: 0,
    identitySignalSource: 'waiting',
    identityDecisionState: 'scanning',
    identityDecisionReason: 'waiting_for_candidates',
    identityScoreGap: 0,
    identityTopCandidateScore: 0,
    identitySecondCandidateScore: 0,
    identityFrameScoreGap: 0,
    identityCropSupportCount: 0,
    identityRecentFrameSupportCount: 0,
    identityTopDistance: null,
    identityTopSimilarity: null,
    identityServiceUnavailable: false,
    identityServiceError: null,
    cardPresent: false,
    cardPresentReason: 'waiting_for_frames',
  );

  final int frameCount;
  final int sampledFrameCount;
  final int acceptedFrameCount;
  final int rejectedFrameCount;
  final bool locked;
  final String? currentBestCandidateId;
  final String? lockedCandidateId;
  final double confidenceScore;
  final List<CandidateState> candidates;
  final ScannerV3QualitySnapshot quality;
  final String statusText;
  final String lastDecisionReason;
  final int lastSampleElapsedMs;
  final String selectedQuadSource;
  final double? detectorConfidence;
  final int? detectorElapsedMs;
  final int? embeddingElapsedMs;
  final int? vectorSearchElapsedMs;
  final int vectorCandidateCount;
  final String identitySignalSource;
  final String identityDecisionState;
  final String identityDecisionReason;
  final double identityScoreGap;
  final double identityTopCandidateScore;
  final double identitySecondCandidateScore;
  final double identityFrameScoreGap;
  final int identityCropSupportCount;
  final int identityRecentFrameSupportCount;
  final double? identityTopDistance;
  final double? identityTopSimilarity;
  final bool identityServiceUnavailable;
  final String? identityServiceError;
  final bool cardPresent;
  final String? cardPresentReason;

  CandidateState? get bestCandidate {
    if (candidates.isEmpty) return null;
    return candidates.first;
  }
}
