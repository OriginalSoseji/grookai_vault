class CandidateState {
  const CandidateState({
    required this.id,
    required this.score,
    required this.occurrences,
    required this.lastSeenFrame,
    required this.fullCardHash,
    required this.artworkHash,
    required this.lastDistance,
  });

  final String id;
  final double score;
  final int occurrences;
  final int lastSeenFrame;
  final String fullCardHash;
  final String artworkHash;
  final int lastDistance;
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

  CandidateState? get bestCandidate {
    if (candidates.isEmpty) return null;
    return candidates.first;
  }
}
