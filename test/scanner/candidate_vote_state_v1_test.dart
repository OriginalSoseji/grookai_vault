import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/scanner_v3/candidate_vote_state_v1.dart';
import 'package:grookai_vault/services/scanner_v3/vector_candidate_service_v1.dart';

void main() {
  test('single-frame strong guard locks a very strong multi-crop match', () {
    final voteState = CandidateVoteState();

    final first = voteState.update(
      candidates: <Candidate>[_strongCandidate(titleSupport: true)],
      frameIndex: 1,
    );
    expect(first.acceptedCandidate, 'card-1');
    expect(first.lockedCandidate, 'card-1');
    expect(first.identityDecisionState, IdentityDecisionStateV1.identityLocked);
    expect(first.identityDecisionReason, 'fast_confidence_guard_passed');

    final second = voteState.update(
      candidates: <Candidate>[_strongCandidate(titleSupport: true)],
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

  test('strong two-crop visual matches do not lock without title support', () {
    final voteState = CandidateVoteState();

    voteState.update(
      candidates: <Candidate>[_strongCandidate()],
      frameIndex: 1,
    );
    final second = voteState.update(
      candidates: <Candidate>[_strongCandidate()],
      frameIndex: 2,
    );

    expect(second.acceptedCandidate, isNull);
    expect(second.lockedCandidate, isNull);
    expect(
      second.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });

  test(
    'shutter reveal accepts strong multi-crop match without title support',
    () {
      final voteState = CandidateVoteState();
      final candidates = <Candidate>[
        _strongCandidate(crops: 8, distance: 0.153, titleSupport: false),
        _candidate(
          cardId: 'card-2',
          rank: 2,
          distance: 0.258,
          similarityOverride: 0.742,
          aggregateScore: 0.742,
          rerankScore: 0.742,
          crops: 2,
          titleSupport: false,
        ),
      ];

      voteState.update(candidates: candidates, frameIndex: 1);
      voteState.update(candidates: candidates, frameIndex: 2);
      voteState.update(candidates: candidates, frameIndex: 3);
      final reveal = voteState.tryLockForReveal(frameIndex: 3);

      expect(reveal.acceptedCandidate, 'card-1');
      expect(reveal.lockedCandidate, 'card-1');
      expect(
        reveal.identityDecisionState,
        IdentityDecisionStateV1.identityLocked,
      );
    },
  );

  test(
    'shutter reveal still rejects weak two-crop match without title support',
    () {
      final voteState = CandidateVoteState();
      final candidates = <Candidate>[
        _strongCandidate(crops: 2, distance: 0.153, titleSupport: false),
        _candidate(
          cardId: 'card-2',
          rank: 2,
          distance: 0.258,
          similarityOverride: 0.742,
          aggregateScore: 0.742,
          rerankScore: 0.742,
          crops: 2,
          titleSupport: false,
        ),
      ];

      voteState.update(candidates: candidates, frameIndex: 1);
      voteState.update(candidates: candidates, frameIndex: 2);
      voteState.update(candidates: candidates, frameIndex: 3);
      final reveal = voteState.tryLockForReveal(frameIndex: 3);

      expect(reveal.acceptedCandidate, isNull);
      expect(reveal.lockedCandidate, isNull);
    },
  );

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

  test('stable two-crop guard keeps a hard distance ceiling', () {
    final voteState = CandidateVoteState();

    voteState.update(
      candidates: <Candidate>[
        _strongCandidate(distance: 0.30, titleSupport: true),
      ],
      frameIndex: 1,
    );
    voteState.update(
      candidates: <Candidate>[
        _strongCandidate(distance: 0.30, titleSupport: true),
      ],
      frameIndex: 2,
    );
    voteState.update(
      candidates: <Candidate>[
        _strongCandidate(distance: 0.30, titleSupport: true),
      ],
      frameIndex: 3,
    );
    final fourth = voteState.update(
      candidates: <Candidate>[
        _strongCandidate(distance: 0.30, titleSupport: true),
      ],
      frameIndex: 4,
    );

    expect(fourth.acceptedCandidate, isNull);
    expect(fourth.lockedCandidate, isNull);
    expect(
      fourth.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });

  test('stable two-crop holo matches can lock above the strict fast guard', () {
    final voteState = CandidateVoteState();
    final candidates = <Candidate>[
      _strongCandidate(
        distance: 0.268,
        similarityOverride: 0.732,
        aggregateScore: 0.775,
        rerankScore: 0.775,
        titleSupport: true,
      ),
      _candidate(
        cardId: 'card-2',
        rank: 2,
        distance: 0.244,
        similarityOverride: 0.756,
        aggregateScore: 0.747,
        rerankScore: 0.747,
        crops: 2,
        titleSupport: false,
      ),
    ];

    voteState.update(candidates: candidates, frameIndex: 1);
    final second = voteState.update(candidates: candidates, frameIndex: 2);

    expect(second.acceptedCandidate, 'card-1');
    expect(second.lockedCandidate, 'card-1');
    expect(
      second.identityDecisionState,
      IdentityDecisionStateV1.identityLocked,
    );
    expect(
      second.identityDecisionReason,
      'stable_two_crop_distance_guard_passed',
    );
  });

  test('stable high-distance two-crop matches need title support', () {
    final voteState = CandidateVoteState();
    final candidates = <Candidate>[
      _strongCandidate(
        distance: 0.268,
        similarityOverride: 0.82,
        aggregateScore: 0.82,
        rerankScore: 0.82,
        titleSupport: false,
      ),
      _candidate(
        cardId: 'card-2',
        rank: 2,
        distance: 0.244,
        similarityOverride: 0.75,
        aggregateScore: 0.75,
        rerankScore: 0.75,
        crops: 2,
        titleSupport: false,
      ),
    ];

    voteState.update(candidates: candidates, frameIndex: 1);
    final second = voteState.update(candidates: candidates, frameIndex: 2);

    expect(second.acceptedCandidate, isNull);
    expect(second.lockedCandidate, isNull);
    expect(
      second.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });

  test('stable core-crop consensus can lock without title support', () {
    final voteState = CandidateVoteState();
    final candidates = <Candidate>[
      _strongCandidate(
        crops: 3,
        distance: 0.268,
        similarityOverride: 0.79,
        aggregateScore: 0.79,
        rerankScore: 0.82,
        titleSupport: false,
        coreConsensusSupport: true,
      ),
      _candidate(
        cardId: 'card-2',
        rank: 2,
        distance: 0.244,
        similarityOverride: 0.756,
        aggregateScore: 0.747,
        rerankScore: 0.747,
        crops: 2,
        titleSupport: false,
      ),
    ];

    voteState.update(candidates: candidates, frameIndex: 1);
    final second = voteState.update(candidates: candidates, frameIndex: 2);

    expect(second.acceptedCandidate, 'card-1');
    expect(second.lockedCandidate, 'card-1');
    expect(
      second.identityDecisionState,
      IdentityDecisionStateV1.identityLocked,
    );
    expect(
      second.identityDecisionReason,
      'stable_two_crop_distance_guard_passed',
    );
  });

  test('core-crop consensus can fast lock without title support', () {
    final voteState = CandidateVoteState();
    final snapshot = voteState.update(
      candidates: <Candidate>[
        _strongCandidate(
          crops: 3,
          distance: 0.232,
          similarityOverride: 0.78,
          aggregateScore: 0.78,
          rerankScore: 0.81,
          titleSupport: false,
          coreConsensusSupport: true,
        ),
        _candidate(
          cardId: 'card-2',
          rank: 2,
          distance: 0.226,
          similarityOverride: 0.774,
          aggregateScore: 0.774,
          rerankScore: 0.803,
          crops: 2,
          titleSupport: false,
        ),
      ],
      frameIndex: 1,
    );

    expect(snapshot.acceptedCandidate, 'card-1');
    expect(snapshot.lockedCandidate, 'card-1');
    expect(
      snapshot.identityDecisionState,
      IdentityDecisionStateV1.identityLocked,
    );
    expect(
      snapshot.identityDecisionReason,
      'core_identity_consensus_fast_guard_passed',
    );
  });

  test('visual full-card alignment can fast lock without title support', () {
    final voteState = CandidateVoteState();
    final snapshot = voteState.update(
      candidates: <Candidate>[
        _strongCandidate(
          crops: 2,
          distance: 0.158,
          similarityOverride: 0.832,
          aggregateScore: 0.832,
          rerankScore: 0.832,
          titleSupport: false,
          visualFullCardAlignmentSupport: true,
        ),
        _candidate(
          cardId: 'visual-neighbor',
          rank: 2,
          distance: 0.225,
          similarityOverride: 0.831,
          aggregateScore: 0.831,
          rerankScore: 0.831,
          crops: 2,
          titleSupport: false,
        ),
      ],
      frameIndex: 1,
    );

    expect(snapshot.acceptedCandidate, 'card-1');
    expect(snapshot.lockedCandidate, 'card-1');
    expect(
      snapshot.identityDecisionState,
      IdentityDecisionStateV1.identityLocked,
    );
    expect(
      snapshot.identityDecisionReason,
      'visual_full_card_alignment_fast_guard_passed',
    );
  });

  test('visual full-card alignment still keeps a strict distance guard', () {
    final voteState = CandidateVoteState();
    final snapshot = voteState.update(
      candidates: <Candidate>[
        _strongCandidate(
          crops: 2,
          distance: 0.190,
          similarityOverride: 0.86,
          aggregateScore: 0.86,
          rerankScore: 0.86,
          titleSupport: false,
          visualFullCardAlignmentSupport: true,
        ),
        _candidate(
          cardId: 'visual-neighbor',
          rank: 2,
          distance: 0.230,
          similarityOverride: 0.858,
          aggregateScore: 0.858,
          rerankScore: 0.858,
          crops: 2,
          titleSupport: false,
        ),
      ],
      frameIndex: 1,
    );

    expect(snapshot.acceptedCandidate, isNull);
    expect(snapshot.lockedCandidate, isNull);
    expect(
      snapshot.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });

  test('core-crop consensus beats generic visual neighbor on reveal', () {
    final voteState = CandidateVoteState();
    final snapshot = voteState.update(
      candidates: <Candidate>[
        _candidate(
          cardId: 'generic-neighbor',
          rank: 1,
          distance: 0.218,
          similarityOverride: 0.782,
          aggregateScore: 0.782,
          rerankScore: 0.82,
          crops: 4,
          titleSupport: false,
        ),
        _candidate(
          cardId: 'core-card',
          rank: 2,
          distance: 0.229,
          similarityOverride: 0.772,
          aggregateScore: 0.772,
          rerankScore: 0.81,
          crops: 5,
          titleSupport: false,
          coreConsensusSupport: true,
        ),
      ],
      frameIndex: 1,
    );

    expect(snapshot.acceptedCandidate, 'core-card');
    expect(snapshot.lockedCandidate, 'core-card');
    expect(
      snapshot.identityDecisionReason,
      'core_identity_consensus_fast_guard_passed',
    );
  });

  test('single-frame cross-crop support can lock without title support', () {
    final voteState = CandidateVoteState();
    final candidates = <Candidate>[
      _strongCandidate(
        crops: 3,
        distance: 0.224,
        similarityOverride: 0.776,
        aggregateScore: 0.81,
        rerankScore: 0.84,
        titleSupport: false,
      ),
      _candidate(
        cardId: 'card-2',
        rank: 2,
        distance: 0.222,
        similarityOverride: 0.778,
        aggregateScore: 0.73,
        rerankScore: 0.73,
        crops: 1,
        titleSupport: false,
      ),
    ];

    final first = voteState.update(candidates: candidates, frameIndex: 1);

    expect(first.acceptedCandidate, 'card-1');
    expect(first.lockedCandidate, 'card-1');
    expect(first.identityDecisionState, IdentityDecisionStateV1.identityLocked);
    expect(
      first.identityDecisionReason,
      'single_frame_cross_crop_guard_passed',
    );
  });

  test('single-frame cross-crop guard rejects high-distance neighbors', () {
    final voteState = CandidateVoteState();
    final candidates = <Candidate>[
      _strongCandidate(
        crops: 5,
        distance: 0.278,
        similarityOverride: 0.852,
        aggregateScore: 0.852,
        rerankScore: 0.852,
        titleSupport: false,
      ),
      _candidate(
        cardId: 'card-2',
        rank: 2,
        distance: 0.274,
        similarityOverride: 0.725,
        aggregateScore: 0.725,
        rerankScore: 0.725,
        crops: 2,
        titleSupport: false,
      ),
    ];

    final first = voteState.update(candidates: candidates, frameIndex: 1);

    expect(first.acceptedCandidate, isNull);
    expect(first.lockedCandidate, isNull);
    expect(
      first.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });

  test('three-crop matches can lock above the two-crop guard', () {
    final voteState = CandidateVoteState();

    voteState.update(
      candidates: <Candidate>[
        _strongCandidate(crops: 3, distance: 0.157, titleSupport: true),
      ],
      frameIndex: 1,
    );
    final second = voteState.update(
      candidates: <Candidate>[
        _strongCandidate(crops: 3, distance: 0.157, titleSupport: true),
      ],
      frameIndex: 2,
    );

    expect(second.acceptedCandidate, 'card-1');
    expect(second.lockedCandidate, 'card-1');
    expect(
      second.identityDecisionState,
      IdentityDecisionStateV1.identityLocked,
    );
  });

  test('priority artwork evidence can fast lock without title support', () {
    final voteState = CandidateVoteState();
    final snapshot = voteState.update(
      candidates: <Candidate>[
        _strongCandidate(
          crops: 3,
          distance: 0.202,
          similarityOverride: 0.80,
          aggregateScore: 0.80,
          rerankScore: 0.84,
          titleSupport: false,
          priorityArtworkSupport: true,
        ),
        _candidate(
          cardId: 'artwork-neighbor',
          rank: 2,
          distance: 0.228,
          similarityOverride: 0.76,
          aggregateScore: 0.76,
          rerankScore: 0.76,
          crops: 1,
          titleSupport: false,
        ),
      ],
      frameIndex: 1,
    );

    expect(snapshot.acceptedCandidate, 'card-1');
    expect(snapshot.lockedCandidate, 'card-1');
    expect(
      snapshot.identityDecisionState,
      IdentityDecisionStateV1.identityLocked,
    );
    expect(
      snapshot.identityDecisionReason,
      'artwork_identity_fast_guard_passed',
    );
  });

  test('priority artwork evidence keeps a distance ceiling', () {
    final voteState = CandidateVoteState();
    final snapshot = voteState.update(
      candidates: <Candidate>[
        _strongCandidate(
          crops: 3,
          distance: 0.212,
          similarityOverride: 0.84,
          aggregateScore: 0.84,
          rerankScore: 0.86,
          titleSupport: false,
          priorityArtworkSupport: true,
        ),
        _candidate(
          cardId: 'artwork-neighbor',
          rank: 2,
          distance: 0.233,
          similarityOverride: 0.75,
          aggregateScore: 0.75,
          rerankScore: 0.75,
          crops: 1,
          titleSupport: false,
        ),
      ],
      frameIndex: 1,
    );

    expect(snapshot.acceptedCandidate, isNull);
    expect(snapshot.lockedCandidate, isNull);
    expect(
      snapshot.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });

  test('title-band-only evidence does not use artwork fast lock', () {
    final voteState = CandidateVoteState();
    final candidates = <Candidate>[
      _candidate(
        cardId: 'title-only',
        rank: 1,
        distance: 0.188,
        similarityOverride: 0.84,
        aggregateScore: 0.84,
        rerankScore: 0.86,
        crops: 1,
        titleSupport: true,
        cropTypesOverride: const <String>[CandidateVoteState.titleBandCropType],
      ),
      _candidate(
        cardId: 'title-neighbor',
        rank: 2,
        distance: 0.236,
        similarityOverride: 0.72,
        aggregateScore: 0.72,
        rerankScore: 0.72,
        crops: 1,
        titleSupport: false,
        cropTypesOverride: const <String>['title_band_neighbor'],
      ),
    ];

    voteState.update(candidates: candidates, frameIndex: 1);
    final second = voteState.update(candidates: candidates, frameIndex: 2);

    expect(second.acceptedCandidate, isNull);
    expect(second.lockedCandidate, isNull);
    expect(
      second.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });

  test(
    'stable single-slot artwork evidence beats high-distance full-card neighbor',
    () {
      final voteState = CandidateVoteState();

      Candidate mankey(int rank) {
        return _candidate(
          cardId: 'mankey',
          rank: rank,
          name: 'Mankey',
          distance: 0.224,
          similarityOverride: 0.776,
          aggregateScore: 0.80,
          rerankScore: 0.84,
          crops: 1,
          titleSupport: false,
          cropTypesOverride: const <String>[
            CandidateVoteState.artworkGrayCropType,
          ],
        );
      }

      Candidate primeape(int rank) {
        return _candidate(
          cardId: 'primeape',
          rank: rank,
          name: 'Primeape',
          distance: 0.294,
          similarityOverride: 0.706,
          aggregateScore: 0.86,
          rerankScore: 0.88,
          crops: 4,
          titleSupport: false,
          cropTypesOverride: const <String>[
            'full_card',
            'priority_full_card_top',
            CandidateVoteState.priorityIdentitySupportCropType,
            CandidateVoteState.visualFullCardAlignmentCropType,
          ],
        );
      }

      voteState.update(
        candidates: <Candidate>[primeape(1), mankey(2)],
        frameIndex: 1,
      );
      voteState.update(
        candidates: <Candidate>[mankey(1), primeape(2)],
        frameIndex: 2,
      );
      final third = voteState.update(
        candidates: <Candidate>[mankey(1), primeape(2)],
        frameIndex: 3,
      );

      expect(third.acceptedCandidate, 'mankey');
      expect(third.lockedCandidate, 'mankey');
      expect(
        third.identityDecisionReason,
        'stable_artwork_identity_guard_passed',
      );
    },
  );

  test('stable single-slot artwork evidence keeps a distance ceiling', () {
    final voteState = CandidateVoteState();
    final candidates = <Candidate>[
      _candidate(
        cardId: 'single-slot-artwork',
        rank: 1,
        distance: 0.245,
        similarityOverride: 0.755,
        aggregateScore: 0.82,
        rerankScore: 0.86,
        crops: 1,
        titleSupport: false,
        cropTypesOverride: const <String>[
          CandidateVoteState.artworkGrayCropType,
        ],
      ),
    ];

    voteState.update(candidates: candidates, frameIndex: 1);
    voteState.update(candidates: candidates, frameIndex: 2);
    final third = voteState.update(candidates: candidates, frameIndex: 3);

    expect(third.acceptedCandidate, isNull);
    expect(third.lockedCandidate, isNull);
    expect(
      third.identityDecisionState,
      isNot(IdentityDecisionStateV1.identityLocked),
    );
  });

  test('stable same-name family evidence locks title-hinted exact print', () {
    final voteState = CandidateVoteState();
    final candidates = <Candidate>[
      _candidate(
        cardId: 'pal-spiritomb',
        rank: 1,
        name: 'Spiritomb',
        distance: 0.259,
        similarityOverride: 0.741,
        aggregateScore: 0.741,
        rerankScore: 0.741,
        crops: 2,
        titleSupport: false,
        cropTypesOverride: const <String>[
          'full_card',
          CandidateVoteState.sameNameFamilyCropType,
        ],
      ),
      _candidate(
        cardId: 'pal-spiritomb-stamp',
        rank: 2,
        name: 'Spiritomb',
        distance: 0.268,
        similarityOverride: 0.732,
        aggregateScore: 0.732,
        rerankScore: 0.732,
        crops: 2,
        titleSupport: false,
        cropTypesOverride: const <String>[
          'full_card',
          CandidateVoteState.sameNameFamilyCropType,
        ],
      ),
    ];

    voteState.update(candidates: candidates, frameIndex: 1);
    final second = voteState.update(candidates: candidates, frameIndex: 2);

    expect(second.acceptedCandidate, 'pal-spiritomb');
    expect(second.lockedCandidate, 'pal-spiritomb');
    expect(
      second.identityDecisionReason,
      'stable_same_name_family_guard_passed',
    );
  });

  test('same-name family support beats a single ambiguous visual neighbor', () {
    final voteState = CandidateVoteState();
    final candidates = <Candidate>[
      _candidate(
        cardId: 'clefairy',
        rank: 1,
        name: 'Clefairy',
        distance: 0.166,
        similarityOverride: 0.834,
        aggregateScore: 0.834,
        rerankScore: 0.96,
        crops: 2,
        titleSupport: false,
      ),
      _candidate(
        cardId: 'vanillite-secret',
        rank: 2,
        name: 'Vanillite',
        distance: 0.165,
        similarityOverride: 0.835,
        aggregateScore: 0.835,
        rerankScore: 0.95,
        crops: 2,
        titleSupport: false,
      ),
      _candidate(
        cardId: 'vanillite-common',
        rank: 3,
        name: 'Vanillite',
        distance: 0.177,
        similarityOverride: 0.823,
        aggregateScore: 0.823,
        rerankScore: 0.94,
        crops: 2,
        titleSupport: false,
      ),
    ];

    voteState.update(candidates: candidates, frameIndex: 1);
    final second = voteState.update(candidates: candidates, frameIndex: 2);

    expect(second.acceptedCandidate, 'vanillite-secret');
    expect(second.lockedCandidate, 'vanillite-secret');
    expect(
      second.identityDecisionState,
      IdentityDecisionStateV1.identityLocked,
    );
  });
}

Candidate _strongCandidate({
  int crops = 2,
  double distance = 0.12,
  double similarityOverride = 0.98,
  double aggregateScore = 0.98,
  double rerankScore = 0.98,
  bool titleSupport = false,
  bool coreConsensusSupport = false,
  bool visualFullCardAlignmentSupport = false,
  bool priorityArtworkSupport = false,
}) {
  return _candidate(
    cardId: 'card-1',
    rank: 1,
    distance: distance,
    similarityOverride: similarityOverride,
    aggregateScore: aggregateScore,
    rerankScore: rerankScore,
    crops: crops,
    titleSupport: titleSupport,
    coreConsensusSupport: coreConsensusSupport,
    visualFullCardAlignmentSupport: visualFullCardAlignmentSupport,
    priorityArtworkSupport: priorityArtworkSupport,
  );
}

Candidate _candidate({
  required String cardId,
  required int rank,
  String? name,
  required double distance,
  required double similarityOverride,
  required double aggregateScore,
  required double rerankScore,
  required int crops,
  required bool titleSupport,
  bool coreConsensusSupport = false,
  bool visualFullCardAlignmentSupport = false,
  bool priorityArtworkSupport = false,
  List<String>? cropTypesOverride,
}) {
  final contributingCropTypes =
      cropTypesOverride ??
      <String>[
        'full_card_upper',
        CandidateVoteState.artworkGrayCropType,
        if (titleSupport) CandidateVoteState.titleBandCropType,
        if (coreConsensusSupport)
          CandidateVoteState.coreIdentityConsensusCropType,
        if (visualFullCardAlignmentSupport)
          CandidateVoteState.visualFullCardAlignmentCropType,
        if (priorityArtworkSupport)
          CandidateVoteState.priorityArtworkGrayCropType,
        if (priorityArtworkSupport)
          CandidateVoteState.priorityIdentitySupportCropType,
      ];
  return Candidate(
    cardId: cardId,
    distance: distance,
    rank: rank,
    name: name,
    similarityOverride: similarityOverride,
    aggregateScore: aggregateScore,
    rerankScore: rerankScore,
    cropContributionCount: crops,
    contributingCropTypes: contributingCropTypes,
  );
}
