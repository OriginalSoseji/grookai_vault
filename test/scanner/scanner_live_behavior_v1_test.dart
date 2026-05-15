import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/scanner/widgets/scanner_state_label.dart';
import 'package:grookai_vault/services/scanner_v3/candidate_vote_state_v1.dart';
import 'package:grookai_vault/services/scanner_v3/convergence_state_v1.dart';
import 'package:grookai_vault/services/scanner_v4/scanner_live_behavior_v1.dart';

void main() {
  test('initial state is searching and cannot show Ready', () {
    final behavior = ScannerLiveBehaviorV1.fromLiveLoopState(
      ScannerV3LiveLoopState.initial,
      edgeLocked: false,
    );

    expect(behavior.phase, ScannerLiveBehaviorPhase.searching);
    expect(behavior.readyLabelAllowed, isFalse);

    final tone = ScannerV3UiTone.fromState(ScannerV3LiveLoopState.initial);
    expect(tone.badge, isNot('Ready'));
    expect(tone.spatialStatusVisible, isFalse);
    expect(tone.spatialLabel, isEmpty);
  });

  test('native quad without card-present remains aligning, not ready', () {
    final state = _state(
      sampledFrameCount: 4,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: false,
      cardPresentReason: 'pokemon_layout_evidence_missing',
      identityAllowed: false,
      identityBlockedReason: 'pokemon_layout_evidence_missing',
    );

    final behavior = ScannerLiveBehaviorV1.fromLiveLoopState(
      state,
      edgeLocked: true,
    );

    expect(behavior.phase, ScannerLiveBehaviorPhase.aligning);
    expect(behavior.readyLabelAllowed, isFalse);
    expect(behavior.identityMayRun, isFalse);

    final tone = ScannerV3UiTone.fromState(state, edgeLocked: true);
    expect(tone.badge, isNot('Ready'));
    expect(tone.spatialStatusVisible, isFalse);
    expect(tone.spatialLabel, 'Align');
  });

  test('card-present persistence pending is a hold state', () {
    final state = _state(
      sampledFrameCount: 5,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: false,
      cardPresentReason: 'card_present_persistence_pending',
      cardPresentConsecutiveFrames: 2,
      identityAllowed: false,
      identityBlockedReason: 'card_present_persistence_pending',
      identitySignalSource: 'card_present_persistence_pending',
    );

    final behavior = ScannerLiveBehaviorV1.fromLiveLoopState(
      state,
      edgeLocked: true,
    );

    expect(behavior.phase, ScannerLiveBehaviorPhase.cardPresentPending);
    expect(behavior.readyLabelAllowed, isFalse);

    final tone = ScannerV3UiTone.fromState(state, edgeLocked: true);
    expect(tone.title, 'Hold steady');
    expect(tone.badge, isNot('Ready'));
    expect(tone.spatialLabel, 'Hold');
  });

  test('card-present without identity allowance remains not ready', () {
    final state = _state(
      sampledFrameCount: 7,
      acceptedFrameCount: 3,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: true,
      cardPresentReason: 'card_present',
      cardPresentConsecutiveFrames: 3,
      identityAllowed: false,
      identityBlockedReason: 'identity_allowed_required_for_ready',
    );

    final behavior = ScannerLiveBehaviorV1.fromLiveLoopState(
      state,
      edgeLocked: true,
    );

    expect(behavior.phase, ScannerLiveBehaviorPhase.aligning);
    expect(behavior.readyLabelAllowed, isFalse);

    final tone = ScannerV3UiTone.fromState(state, edgeLocked: true);
    expect(tone.badge, isNot('Ready'));
    expect(tone.spatialLabel, isNot('Ready'));
  });

  test('identity-allowed before identity work keeps reading state', () {
    final state = _state(
      sampledFrameCount: 7,
      acceptedFrameCount: 3,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: true,
      cardPresentReason: 'card_present',
      cardPresentConsecutiveFrames: 3,
      identityAllowed: true,
      identityAllowedReason: 'card_present_persistence_satisfied',
      identitySignalSource: 'card_present_persistence_satisfied',
      identityDecisionState: IdentityDecisionStateV1.scanning,
    );

    final behavior = ScannerLiveBehaviorV1.fromLiveLoopState(
      state,
      edgeLocked: true,
    );

    expect(behavior.phase, ScannerLiveBehaviorPhase.scanningIdentity);
    expect(behavior.readyLabelAllowed, isTrue);

    final tone = ScannerV3UiTone.fromState(state, edgeLocked: true);
    expect(tone.title, 'Reading card');
    expect(tone.spatialLabel, 'Reading');
  });

  test('identity-allowed card maps to scanning identity', () {
    final state = _state(
      sampledFrameCount: 8,
      acceptedFrameCount: 3,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: true,
      cardPresentReason: 'card_present',
      cardPresentConsecutiveFrames: 3,
      identityAllowed: true,
      identityAllowedReason: 'card_present_persistence_satisfied',
      identitySignalSource: 'v8_identity_candidates',
      embeddingElapsedMs: 82,
      vectorSearchElapsedMs: 34,
      identityDecisionState: IdentityDecisionStateV1.scanning,
    );

    final behavior = ScannerLiveBehaviorV1.fromLiveLoopState(
      state,
      edgeLocked: true,
    );

    expect(behavior.phase, ScannerLiveBehaviorPhase.scanningIdentity);
    expect(behavior.readyLabelAllowed, isTrue);
    expect(behavior.identityMayRun, isTrue);

    final tone = ScannerV3UiTone.fromState(state, edgeLocked: true);
    expect(tone.title, 'Reading card');
    expect(tone.spatialLabel, 'Reading');
  });

  test('identity lock maps to recognized', () {
    final state = _state(
      sampledFrameCount: 10,
      acceptedFrameCount: 5,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: true,
      identityAllowed: true,
      identityDecisionState: IdentityDecisionStateV1.identityLocked,
      locked: true,
      lockedCandidateId: 'card-1',
    );

    final behavior = ScannerLiveBehaviorV1.fromLiveLoopState(
      state,
      edgeLocked: true,
    );

    expect(behavior.phase, ScannerLiveBehaviorPhase.recognized);
    expect(behavior.readyLabelAllowed, isTrue);

    final tone = ScannerV3UiTone.fromState(state, edgeLocked: true);
    expect(tone.spatialLabel, 'Card found');
  });

  test('identity lock stays hidden until reveal is requested', () {
    final state = _state(
      sampledFrameCount: 10,
      acceptedFrameCount: 5,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: true,
      identityAllowed: true,
      identityDecisionState: IdentityDecisionStateV1.identityLocked,
      locked: true,
      lockedCandidateId: 'card-1',
      candidates: const <CandidateState>[
        CandidateState(
          id: 'card-1',
          score: 2,
          occurrences: 2,
          lastSeenFrame: 5,
        ),
      ],
    );

    final hiddenTone = ScannerV3UiTone.fromState(
      state,
      edgeLocked: true,
      identityRevealRequested: false,
    );
    final revealedTone = ScannerV3UiTone.fromState(
      state,
      edgeLocked: true,
      identityRevealRequested: true,
    );

    expect(hiddenTone.spatialLabel, 'Ready');
    expect(hiddenTone.showPrimaryCandidate, isFalse);
    expect(hiddenTone.showRescanAction, isFalse);
    expect(revealedTone.spatialLabel, 'Card found');
    expect(revealedTone.showPrimaryCandidate, isTrue);
    expect(revealedTone.showRescanAction, isFalse);
    expect(revealedTone.locked, isTrue);
  });

  test('hidden unknown identity does not show ready', () {
    final state = _state(
      sampledFrameCount: 8,
      acceptedFrameCount: 3,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: true,
      cardPresentReason: 'card_present',
      cardPresentConsecutiveFrames: 3,
      identityAllowed: true,
      identityAllowedReason: 'card_present_persistence_satisfied',
      identitySignalSource: 'v8_identity_candidates',
      embeddingElapsedMs: 82,
      vectorSearchElapsedMs: 34,
      identityDecisionState: IdentityDecisionStateV1.candidateUnknown,
    );

    final hiddenTone = ScannerV3UiTone.fromState(
      state,
      edgeLocked: true,
      identityRevealRequested: false,
    );

    expect(hiddenTone.title, 'Reading card');
    expect(hiddenTone.badge, isNot('Ready'));
    expect(hiddenTone.spatialLabel, isNot('Ready'));
    expect(hiddenTone.showPrimaryCandidate, isFalse);
  });

  test('soft preview candidate is hidden before reveal', () {
    final state = _state(
      sampledFrameCount: 8,
      acceptedFrameCount: 3,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: true,
      cardPresentReason: 'card_present',
      cardPresentConsecutiveFrames: 3,
      identityAllowed: true,
      identityAllowedReason: 'card_present_persistence_satisfied',
      identitySignalSource: 'v8_identity_candidates',
      embeddingElapsedMs: 82,
      vectorSearchElapsedMs: 34,
      identityDecisionState: IdentityDecisionStateV1.candidateUnstable,
      identityScoreGap: 0.7,
      identityTopCandidateScore: 1.4,
      identityCropSupportCount: 2,
      identityRecentFrameSupportCount: 2,
      identityTopDistance: 0.15,
      candidates: const <CandidateState>[
        CandidateState(
          id: 'card-1',
          score: 2,
          occurrences: 2,
          lastSeenFrame: 5,
        ),
      ],
    );

    final hiddenTone = ScannerV3UiTone.fromState(
      state,
      edgeLocked: true,
      identityRevealRequested: false,
    );
    final revealedTone = ScannerV3UiTone.fromState(
      state,
      edgeLocked: true,
      identityRevealRequested: true,
    );

    expect(hiddenTone.showPrimaryCandidate, isFalse);
    expect(hiddenTone.subtitle, isNot(contains('Possible match')));
    expect(revealedTone.showPrimaryCandidate, isTrue);
  });

  test('identity service unavailable maps to blocked', () {
    final state = _state(
      sampledFrameCount: 6,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: true,
      identityAllowed: true,
      identityServiceUnavailable: true,
      identityServiceError: 'identity_endpoint_not_configured',
    );

    final behavior = ScannerLiveBehaviorV1.fromLiveLoopState(
      state,
      edgeLocked: true,
    );

    expect(behavior.phase, ScannerLiveBehaviorPhase.blocked);
    expect(behavior.readyLabelAllowed, isFalse);
    expect(behavior.identityMayRun, isFalse);
  });

  test('card-present loss downgrades ready labels', () {
    final readyState = _state(
      sampledFrameCount: 9,
      acceptedFrameCount: 3,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: true,
      identityAllowed: true,
      identityAllowedReason: 'card_present_persistence_satisfied',
      identitySignalSource: 'card_present_persistence_satisfied',
    );
    final lostState = _state(
      sampledFrameCount: 10,
      acceptedFrameCount: 3,
      selectedQuadSource: 'native_detector',
      qualityAccepted: true,
      cardPresent: false,
      cardPresentReason: 'pokemon_layout_evidence_missing',
      identityAllowed: false,
      identityBlockedReason: 'pokemon_layout_evidence_missing',
    );

    final readyTone = ScannerV3UiTone.fromState(readyState, edgeLocked: true);
    final lostTone = ScannerV3UiTone.fromState(lostState, edgeLocked: true);

    expect(readyTone.badge, isNot('Ready'));
    expect(readyTone.spatialLabel, 'Reading');
    expect(lostTone.badge, isNot('Ready'));
    expect(lostTone.spatialLabel, isNot('Ready'));
    expect(lostTone.spatialLabel, 'Align');
  });
}

ScannerV3LiveLoopState _state({
  int frameCount = 0,
  int sampledFrameCount = 0,
  int acceptedFrameCount = 0,
  int rejectedFrameCount = 0,
  bool locked = false,
  String? currentBestCandidateId,
  String? lockedCandidateId,
  double confidenceScore = 0,
  List<CandidateState> candidates = const <CandidateState>[],
  bool qualityAccepted = false,
  String statusText = 'Scanning...',
  String lastDecisionReason = 'waiting_for_frames',
  int lastSampleElapsedMs = 0,
  String selectedQuadSource = 'waiting',
  double? detectorConfidence,
  int? detectorElapsedMs,
  int? embeddingElapsedMs,
  int? vectorSearchElapsedMs,
  int vectorCandidateCount = 0,
  String identitySignalSource = 'waiting',
  String identityDecisionState = IdentityDecisionStateV1.scanning,
  String identityDecisionReason = 'waiting_for_candidates',
  double identityScoreGap = 0,
  double identityTopCandidateScore = 0,
  double identitySecondCandidateScore = 0,
  double identityFrameScoreGap = 0,
  int identityCropSupportCount = 0,
  int identityRecentFrameSupportCount = 0,
  double? identityTopDistance,
  double? identityTopSimilarity,
  bool identityServiceUnavailable = false,
  String? identityServiceError,
  bool cardPresent = false,
  String? cardPresentReason = 'waiting_for_frames',
  int cardPresentConsecutiveFrames = 0,
  bool identityAllowed = false,
  String? identityAllowedReason,
  String? identityBlockedReason = 'waiting_for_frames',
  bool nativeDiagnosticsUsable = false,
  String? nativeDiagnosticsRejectionReason = 'waiting_for_frames',
}) {
  return ScannerV3LiveLoopState(
    frameCount: frameCount,
    sampledFrameCount: sampledFrameCount,
    acceptedFrameCount: acceptedFrameCount,
    rejectedFrameCount: rejectedFrameCount,
    locked: locked,
    currentBestCandidateId: currentBestCandidateId,
    lockedCandidateId: lockedCandidateId,
    confidenceScore: confidenceScore,
    candidates: candidates,
    quality: ScannerV3QualitySnapshot(
      blurScore: qualityAccepted ? 0.8 : 0,
      brightnessScore: qualityAccepted ? 0.5 : 0,
      glareRatio: qualityAccepted ? 0.02 : 0,
      cardFillRatio: qualityAccepted ? 0.55 : 0,
      accepted: qualityAccepted,
      rejectionReasons: qualityAccepted ? const <String>[] : const <String>[],
    ),
    statusText: statusText,
    lastDecisionReason: lastDecisionReason,
    lastSampleElapsedMs: lastSampleElapsedMs,
    selectedQuadSource: selectedQuadSource,
    detectorConfidence: detectorConfidence,
    detectorElapsedMs: detectorElapsedMs,
    embeddingElapsedMs: embeddingElapsedMs,
    vectorSearchElapsedMs: vectorSearchElapsedMs,
    vectorCandidateCount: vectorCandidateCount,
    identitySignalSource: identitySignalSource,
    identityDecisionState: identityDecisionState,
    identityDecisionReason: identityDecisionReason,
    identityScoreGap: identityScoreGap,
    identityTopCandidateScore: identityTopCandidateScore,
    identitySecondCandidateScore: identitySecondCandidateScore,
    identityFrameScoreGap: identityFrameScoreGap,
    identityCropSupportCount: identityCropSupportCount,
    identityRecentFrameSupportCount: identityRecentFrameSupportCount,
    identityTopDistance: identityTopDistance,
    identityTopSimilarity: identityTopSimilarity,
    identityServiceUnavailable: identityServiceUnavailable,
    identityServiceError: identityServiceError,
    cardPresent: cardPresent,
    cardPresentReason: cardPresentReason,
    cardPresentConsecutiveFrames: cardPresentConsecutiveFrames,
    identityAllowed: identityAllowed,
    identityAllowedReason: identityAllowedReason,
    identityBlockedReason: identityBlockedReason,
    nativeDiagnosticsUsable: nativeDiagnosticsUsable,
    nativeDiagnosticsRejectionReason: nativeDiagnosticsRejectionReason,
    cardPresentFullLumaStdDev: null,
    cardPresentArtworkLumaStdDev: null,
    cardPresentArtworkForegroundRatio: null,
    cardPresentBorderBrightRatio: null,
    cardPresentBorderBandCoverage: null,
    cardPresentPokemonLayoutScore: null,
    cardPresentPokemonHorizontalContrast: null,
    cardPresentPokemonTextPanelBrightRatio: null,
  );
}
