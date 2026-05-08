import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/scanner_v3/candidate_vote_state_v1.dart';
import 'package:grookai_vault/services/scanner_v3/vector_candidate_service_v1.dart';

void main() {
  test('fast confidence guard locks after two strong multi-crop frames', () {
    final voteState = CandidateVoteState();

    final first = voteState.update(
      candidates: <Candidate>[_strongCandidate()],
      frameIndex: 1,
    );
    expect(first.acceptedCandidate, isNull);
    expect(
      first.identityDecisionState,
      IdentityDecisionStateV1.candidateUnstable,
    );

    final second = voteState.update(
      candidates: <Candidate>[_strongCandidate()],
      frameIndex: 2,
    );

    expect(second.acceptedCandidate, 'card-1');
    expect(second.lockedCandidate, 'card-1');
    expect(
      second.identityDecisionState,
      IdentityDecisionStateV1.identityLocked,
    );
    expect(second.identityDecisionReason, 'fast_confidence_guard_passed');
  });

  test('fast confidence guard still requires multi-crop support', () {
    final voteState = CandidateVoteState();

    voteState.update(
      candidates: <Candidate>[_strongCandidate(crops: 1)],
      frameIndex: 1,
    );
    final second = voteState.update(
      candidates: <Candidate>[_strongCandidate(crops: 1)],
      frameIndex: 2,
    );

    expect(second.acceptedCandidate, isNull);
    expect(second.lockedCandidate, isNull);
    expect(
      second.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });

  test('fast confidence guard keeps the accepted-distance guard', () {
    final voteState = CandidateVoteState();

    voteState.update(
      candidates: <Candidate>[_strongCandidate(distance: 0.24)],
      frameIndex: 1,
    );
    final second = voteState.update(
      candidates: <Candidate>[_strongCandidate(distance: 0.24)],
      frameIndex: 2,
    );

    expect(second.acceptedCandidate, isNull);
    expect(second.lockedCandidate, isNull);
    expect(
      second.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });
}

Candidate _strongCandidate({int crops = 2, double distance = 0.12}) {
  return Candidate(
    cardId: 'card-1',
    distance: distance,
    rank: 1,
    similarityOverride: 0.98,
    aggregateScore: 0.98,
    rerankScore: 0.98,
    cropContributionCount: crops,
  );
}
