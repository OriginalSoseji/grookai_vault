import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';

/// Local data adapter for the existing main-build screens. No Supabase client,
/// auth session, capability secret, notification or Vault write exists here.
class PreviewBinderLibraryRepository implements BinderRepository {
  PreviewBinderLibraryRepository({
    required this.catalog,
    required List<BinderCustomSlotDraft> initialSlots,
  }) {
    for (final entry in [
      (privateId, 'Private Binder · Sample', BinderRole.owner, 1),
      (familyId, 'Family Binder · Sample', BinderRole.owner, 2),
      (sharedId, 'Shared family Binder · Sample', BinderRole.contributor, 2),
      (communityId, 'Community Binder · Sample', BinderRole.viewer, 3),
    ]) {
      _rows[entry.$1] = {
        'id': entry.$1,
        'public_id': entry.$1,
        'title': entry.$2,
        'description':
            'Local sample collection goal. Cards stay in each collector’s Vault.',
        'target_kind': 'custom',
        'target_label': '',
        'checklist_mode': 'custom',
        'completed_slots': 0,
        'total_slots': initialSlots.length,
        'member_count': entry.$4,
        'viewer_role': entry.$3.wireValue,
        'read_access': entry.$1 == communityId ? 'public' : 'private',
        'discoverability': entry.$1 == communityId ? 'listed' : 'unlisted',
        'join_policy': entry.$1 == communityId
            ? 'request_to_join'
            : entry.$1 == privateId
            ? 'closed'
            : 'invite_only',
        'contribution_policy': entry.$1 == communityId
            ? 'approval_required'
            : entry.$1 == privateId
            ? 'owner_only'
            : 'members_direct',
        'lifecycle': 'active',
        'moderation_state': 'clear',
      };
      _definitions[entry.$1] = List.of(initialSlots);
    }
  }

  static const privateId = '11111111-1111-4111-8111-111111111101';
  static const familyId = '11111111-1111-4111-8111-111111111102';
  static const sharedId = '11111111-1111-4111-8111-111111111103';
  static const communityId = '11111111-1111-4111-8111-111111111104';
  static const _joinId = '11111111-1111-4111-8111-111111111105';
  final BinderRepository catalog;
  final _rows = <String, Map<String, dynamic>>{};
  final _definitions = <String, List<BinderCustomSlotDraft>>{};
  final _revisions = <String, int>{};
  bool _joinRequested = false;
  int _created = 200;

  @override
  String get currentUserId => 'collector-design-local-binder-sample';

  Map<String, dynamic> _row(String publicId) =>
      _rows[publicId] ??
      (throw const BinderException(
        BinderFailureKind.noAccess,
        'Binder unavailable.',
      ));
  bool _owner(String publicId) => _row(publicId)['viewer_role'] == 'owner';

  @override
  Future<BinderLibraryPage> loadLibrary({
    BinderCursor? cursor,
    int limit = 20,
  }) async => BinderLibraryPage(
    binders: _rows.values
        .where((row) => row['public_id'] != communityId)
        .map(BinderSummary.fromJson)
        .take(limit)
        .toList(growable: false),
  );
  @override
  Future<BinderPage<BinderInvitation>> loadInvitationInbox({
    BinderCursor? cursor,
    int limit = 50,
  }) async => const BinderPage(items: []);
  @override
  Future<BinderPage<BinderSuspendedAccess>> loadSuspendedBinders({
    BinderCursor? cursor,
    int limit = 20,
  }) async => const BinderPage(items: []);

  @override
  Future<BinderDetail> loadDetail(String publicId) async {
    final row = _row(publicId);
    if (publicId == communityId) {
      throw const BinderException(
        BinderFailureKind.noAccess,
        'Binder unavailable.',
      );
    }
    final owner = _owner(publicId);
    return BinderDetail.fromJson({
      'binder': row,
      'membership': {'state': 'active', 'role': row['viewer_role']},
      'definition_revision': _revisions[publicId] ?? 1,
      'permissions': {
        'can_add_copy': true,
        'can_invite': owner,
        'can_edit': owner,
        'can_manage_policy': owner,
        'can_share': owner,
        'can_leave': !owner,
      },
    });
  }

  List<BinderChecklistItem> _items(String publicId) => [
    for (final entry in _definitions[publicId]!.indexed)
      BinderChecklistItem(
        slotId: 'sample-${entry.$1}',
        cardPrintId: entry.$2.card.cardPrintId,
        name: entry.$2.card.name,
        requiredQuantity: entry.$2.requiredQuantity,
        activeQuantity: 0,
        cardPrintingId: entry.$2.finish.cardPrintingId,
        setLabel: entry.$2.card.setLabel,
        number: entry.$2.card.number,
        variantKey: entry.$2.card.variantKey,
        printedIdentityModifier: entry.$2.card.printedIdentityModifier,
        finishLabel: entry.$2.finish.label,
        imageUrl: entry.$2.card.hostedImageUrl,
        hasHostedImage: (entry.$2.card.hostedImageUrl ?? '').isNotEmpty,
      ),
  ];

  @override
  Future<BinderChecklistPage> loadChecklist({
    required String publicId,
    BinderChecklistFilter filter = BinderChecklistFilter.all,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    await loadDetail(publicId);
    return BinderChecklistPage(
      items:
          {
            BinderChecklistFilter.inBinder,
            BinderChecklistFilter.inYourVault,
            BinderChecklistFilter.contributedByYou,
            BinderChecklistFilter.needsReview,
          }.contains(filter)
          ? []
          : _items(publicId).take(limit).toList(),
    );
  }

  @override
  Future<BinderPage<BinderActivityEvent>> loadActivity({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    await loadDetail(publicId);
    return const BinderPage(items: []);
  }

  @override
  Future<BinderPage<BinderMember>> loadMembers({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final detail = await loadDetail(publicId);
    return BinderPage(
      items: [
        BinderMember(
          membershipId: 'sample-member-you',
          role: detail.summary.role,
          state: BinderMembershipState.active,
          displayLabel: 'You · local sample',
          isCurrentUser: true,
        ),
        if (detail.summary.memberCount > 1)
          const BinderMember(
            membershipId: 'sample-family-member',
            role: BinderRole.contributor,
            state: BinderMembershipState.active,
            displayLabel: 'Family member · Sample',
          ),
      ],
    );
  }

  @override
  Future<BinderPage<BinderEligibleCopy>> loadEligibleCopies({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    await loadDetail(publicId);
    return const BinderPage(items: []);
  }

  @override
  Future<List<BinderLegacyCandidate>> loadLegacyCandidates() async => [];
  @override
  Future<BinderPage<BinderTemplate>> loadTemplates({
    BinderCursor? cursor,
    int limit = 20,
  }) async => const BinderPage(items: []);
  @override
  Future<List<BinderCatalogCard>> searchCustomCards({
    required String query,
    int limit = 30,
  }) => catalog.searchCustomCards(query: query, limit: limit);
  @override
  Future<List<BinderFinishOption>> loadCardFinishOptions(String id) =>
      catalog.loadCardFinishOptions(id);
  @override
  Future<List<BinderTargetSuggestion>> searchTargets({
    required BinderTargetKind kind,
    required String query,
    int limit = 20,
  }) async =>
      kind == BinderTargetKind.species &&
          (query.isEmpty || 'eevee'.contains(query.toLowerCase()))
      ? const [
          BinderTargetSuggestion(
            id: 'sample-eevee-target',
            routeKey: 'eevee',
            title: 'Eevee · Sample',
            kind: BinderTargetKind.species,
            slotCount: 1,
          ),
        ]
      : [];

  @override
  Future<String> createBinder(CreateBinderInput input) async {
    final id =
        '11111111-1111-4111-8111-${(++_created).toString().padLeft(12, '0')}';
    _rows[id] = {
      ..._row(privateId),
      'id': id,
      'public_id': id,
      'title': input.title,
      'description': input.description,
      'target_kind': input.targetKind.wireValue,
      'checklist_mode': input.checklistMode.wireValue,
      'read_access': 'private',
      'discoverability': 'unlisted',
      'join_policy': 'closed',
      'contribution_policy': 'owner_only',
      'viewer_role': 'owner',
      'member_count': 1,
    };
    _definitions[id] = input.targetKind == BinderTargetKind.custom
        ? await _decodeSlots(input.customSlots)
        : [_definitions[privateId]!.first];
    _rows[id]!['total_slots'] = _definitions[id]!.length;
    return id;
  }

  Future<List<BinderCustomSlotDraft>> _decodeSlots(
    List<Map<String, dynamic>> slots,
  ) async {
    final cards = await catalog.searchCustomCards(query: '');
    return [
      for (final row in slots)
        BinderCustomSlotDraft(
          card: cards.firstWhere(
            (card) => card.cardPrintId == row['card_print_id'],
          ),
          finish:
              (await catalog.loadCardFinishOptions(
                '${row['card_print_id']}',
              )).firstWhere(
                (finish) => finish.cardPrintingId == row['card_printing_id'],
              ),
          requiredQuantity: (row['required_quantity'] as num).toInt(),
        ),
    ];
  }

  @override
  Future<void> publishCustomRevision({
    required String publicId,
    required List<Map<String, dynamic>> slots,
  }) async {
    if (!_owner(publicId)) {
      throw const BinderException(
        BinderFailureKind.noAccess,
        'Binder unavailable.',
      );
    }
    _definitions[publicId] = await _decodeSlots(slots);
    _rows[publicId]!['total_slots'] = slots.length;
    _revisions[publicId] = (_revisions[publicId] ?? 1) + 1;
  }

  @override
  Future<void> updateMetadata({
    required String publicId,
    required String title,
    required String description,
    required String? coverCardPrintId,
  }) async {
    if (!_owner(publicId)) {
      throw const BinderException(
        BinderFailureKind.noAccess,
        'Binder unavailable.',
      );
    }
    final cover = coverCardPrintId == null
        ? null
        : _definitions[publicId]!
              .where(
                (slot) =>
                    slot.card.cardPrintId == coverCardPrintId &&
                    (slot.card.hostedImageUrl ?? '').isNotEmpty,
              )
              .firstOrNull;
    if (coverCardPrintId != null && cover == null) {
      throw const BinderException(
        BinderFailureKind.validation,
        'Choose eligible checklist artwork.',
      );
    }
    _rows[publicId]!.addAll({
      'title': title,
      'description': description,
      'cover_card_print_id': coverCardPrintId,
      'cover_image_url': cover?.card.hostedImageUrl,
    });
  }

  @override
  Future<void> updatePolicy({
    required String publicId,
    required BinderReadAccess readAccess,
    required BinderDiscoverability discoverability,
    required BinderJoinPolicy joinPolicy,
    required BinderContributionPolicy contributionPolicy,
  }) async {
    if (!_owner(publicId)) {
      throw const BinderException(
        BinderFailureKind.noAccess,
        'Binder unavailable.',
      );
    }
    _rows[publicId]!.addAll({
      'read_access': readAccess.wireValue,
      'discoverability': discoverability.wireValue,
      'join_policy': joinPolicy.wireValue,
      'contribution_policy': contributionPolicy.wireValue,
    });
  }

  @override
  Future<void> updateMemberPreferences({
    required String publicId,
    String? alias,
    required BinderConsentScope contentScope,
    required BinderConsentScope identityScope,
    String notificationPreference = 'digest',
  }) async => throw const BinderException(
    BinderFailureKind.unavailable,
    'Consent changes are disabled in this local preview.',
  );

  Map<String, dynamic> _publicPayload(String publicId) {
    final row = _row(publicId);
    if (row['read_access'] != 'public') {
      throw const BinderException(
        BinderFailureKind.noAccess,
        'Binder unavailable.',
      );
    }
    return {
      'binder': {...row, 'moderated': true, 'moderation_approved': true},
      'progress': {
        'total_slots': _definitions[publicId]!.length,
        'completed_slots': 0,
        'unit': 'custom_slots',
      },
      'member_summary': {'contributor_count': 0},
      'viewer': {
        'can_request_to_join': !_joinRequested,
        'join_request_status': _joinRequested ? 'pending' : 'none',
        if (_joinRequested) 'join_request_id': _joinId,
      },
      'checklist_page': {
        'items': [
          for (final item in _items(publicId))
            {
              'slot_id': item.cardPrintId,
              'card_print_id': item.cardPrintId,
              'card_printing_id': item.cardPrintingId,
              'variant_key': item.variantKey,
              'printed_identity_modifier': item.printedIdentityModifier,
              'name': item.name,
              'set_label': item.setLabel,
              'number': item.number,
              'finish_label': item.finishLabel,
              'required_quantity': item.requiredQuantity,
              'active_quantity': 0,
            },
        ],
      },
    };
  }

  @override
  Future<BinderPage<BinderSummary>> explore({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    final payload = _publicPayload(communityId);
    final row = BinderSummary.tryFromExternalExploreJson({
      ..._row(communityId),
      ...payload,
    });
    return BinderPage(items: row == null ? [] : [row]);
  }

  @override
  Future<BinderDetail> loadPublicDetail(String publicId) async =>
      BinderDetail.fromExternalJson(
        _publicPayload(publicId),
        audience: BinderExternalAudience.public,
        authenticatedViewer: true,
      );
  @override
  Future<BinderChecklistPage> loadPublicChecklist({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async => (await loadPublicDetail(publicId)).externalChecklist;
  @override
  Future<void> requestToJoin(String publicId) async {
    _publicPayload(publicId);
    _joinRequested = true;
  }

  @override
  Future<void> withdrawJoinRequest(String requestId) async {
    _joinRequested = false;
  }

  /// Never fabricate production-looking invitation/view tokens or perform an
  /// outbound operation from this local adapter. Main repository is unchanged.
  @override
  dynamic noSuchMethod(Invocation invocation) => throw const BinderException(
    BinderFailureKind.unavailable,
    'This action needs the signed-in main build. No live sharing or Vault data changes are made in this local preview.',
  );
}
