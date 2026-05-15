import '../scanner_v3/candidate_vote_state_v1.dart';
import '../scanner_v3/convergence_state_v1.dart';

enum ScannerLiveBehaviorPhase {
  searching,
  aligning,
  cardPresentPending,
  ready,
  scanningIdentity,
  recognized,
  unknown,
  blocked,
}

class ScannerLiveBehaviorV1 {
  const ScannerLiveBehaviorV1({
    required this.phase,
    required this.reason,
    required this.edgeLocked,
  });

  final ScannerLiveBehaviorPhase phase;
  final String reason;
  final bool edgeLocked;

  bool get readyLabelAllowed =>
      phase == ScannerLiveBehaviorPhase.ready ||
      phase == ScannerLiveBehaviorPhase.scanningIdentity ||
      phase == ScannerLiveBehaviorPhase.recognized;

  bool get identityMayRun =>
      phase == ScannerLiveBehaviorPhase.ready ||
      phase == ScannerLiveBehaviorPhase.scanningIdentity ||
      phase == ScannerLiveBehaviorPhase.recognized;

  bool get isCardGuidanceActive =>
      phase == ScannerLiveBehaviorPhase.aligning ||
      phase == ScannerLiveBehaviorPhase.cardPresentPending ||
      phase == ScannerLiveBehaviorPhase.ready ||
      phase == ScannerLiveBehaviorPhase.scanningIdentity ||
      phase == ScannerLiveBehaviorPhase.recognized;

  static ScannerLiveBehaviorV1 fromLiveLoopState(
    ScannerV3LiveLoopState state, {
    required bool edgeLocked,
  }) {
    if (state.identityServiceUnavailable) {
      return ScannerLiveBehaviorV1(
        phase: ScannerLiveBehaviorPhase.blocked,
        reason: state.identityServiceError ?? 'identity_service_unavailable',
        edgeLocked: edgeLocked,
      );
    }

    switch (state.identityDecisionState) {
      case IdentityDecisionStateV1.identityLocked:
        return ScannerLiveBehaviorV1(
          phase: ScannerLiveBehaviorPhase.recognized,
          reason: state.identityDecisionReason,
          edgeLocked: edgeLocked,
        );
      case IdentityDecisionStateV1.candidateUnknown:
        return ScannerLiveBehaviorV1(
          phase: ScannerLiveBehaviorPhase.unknown,
          reason: state.identityDecisionReason,
          edgeLocked: edgeLocked,
        );
    }

    if (_isCardPresentPending(state)) {
      return ScannerLiveBehaviorV1(
        phase: ScannerLiveBehaviorPhase.cardPresentPending,
        reason:
            state.identityBlockedReason ??
            state.cardPresentReason ??
            'card_present_persistence_pending',
        edgeLocked: edgeLocked,
      );
    }

    if (state.identityAllowed && !_hasIdentityWorkStarted(state)) {
      return ScannerLiveBehaviorV1(
        phase: ScannerLiveBehaviorPhase.scanningIdentity,
        reason: state.identityAllowedReason ?? 'identity_allowed',
        edgeLocked: edgeLocked,
      );
    }

    if (state.identityAllowed) {
      return ScannerLiveBehaviorV1(
        phase: ScannerLiveBehaviorPhase.scanningIdentity,
        reason: state.identityAllowedReason ?? state.identityDecisionReason,
        edgeLocked: edgeLocked,
      );
    }

    if (state.sampledFrameCount == 0 ||
        !_hasCardRegionEvidence(state, edgeLocked)) {
      return ScannerLiveBehaviorV1(
        phase: ScannerLiveBehaviorPhase.searching,
        reason: state.cardPresentReason ?? state.lastDecisionReason,
        edgeLocked: edgeLocked,
      );
    }

    return ScannerLiveBehaviorV1(
      phase: ScannerLiveBehaviorPhase.aligning,
      reason:
          state.identityBlockedReason ??
          state.cardPresentReason ??
          state.lastDecisionReason,
      edgeLocked: edgeLocked,
    );
  }

  static bool _isCardPresentPending(ScannerV3LiveLoopState state) {
    return state.cardPresentReason == 'card_present_persistence_pending' ||
        state.identityBlockedReason == 'card_present_persistence_pending' ||
        state.identitySignalSource == 'card_present_persistence_pending';
  }

  static bool _hasCardRegionEvidence(
    ScannerV3LiveLoopState state,
    bool edgeLocked,
  ) {
    if (edgeLocked) return true;
    switch (state.selectedQuadSource) {
      case 'native_detector':
      case 'selected_card_target':
      case 'selected_card_target_expanded':
      case 'pokemon_visual_region':
      case 'yuv_fallback':
      case 'center_fallback':
        return true;
      default:
        return false;
    }
  }

  static bool _hasIdentityWorkStarted(ScannerV3LiveLoopState state) {
    if (state.identityDecisionState != IdentityDecisionStateV1.scanning) {
      return true;
    }
    if (state.embeddingElapsedMs != null ||
        state.vectorSearchElapsedMs != null) {
      return true;
    }
    if (state.vectorCandidateCount > 0 ||
        state.identityCropSupportCount > 0 ||
        state.identityRecentFrameSupportCount > 0) {
      return true;
    }
    switch (state.identitySignalSource) {
      case 'waiting':
      case 'card_present_persistence_pending':
      case 'card_present_persistence_satisfied':
        return false;
      default:
        return true;
    }
  }
}
