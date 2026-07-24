import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/card_print.dart';
import '../../models/binders/binder_models.dart';
import 'binder_rpc_contract.dart';

enum BinderFailureKind {
  authentication,
  unavailable,
  noAccess,
  revoked,
  offline,
  conflict,
  duplicate,
  invalidCopy,
  validation,
  rateLimited,
  unknown,
}

class BinderException implements Exception {
  const BinderException(this.kind, this.message);

  final BinderFailureKind kind;
  final String message;

  @override
  String toString() => message;
}

class BinderPage<T> {
  const BinderPage({
    required this.items,
    this.nextCursor,
    this.hasMore = false,
  });

  final List<T> items;
  final BinderCursor? nextCursor;
  final bool hasMore;
}

abstract interface class BinderRepository {
  String? get currentUserId;

  Future<BinderLibraryPage> loadLibrary({BinderCursor? cursor, int limit = 20});

  Future<BinderPage<BinderInvitation>> loadInvitationInbox({
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<BinderPage<BinderSuspendedAccess>> loadSuspendedBinders({
    BinderCursor? cursor,
    int limit = 20,
  });

  Future<BinderDetail> loadDetail(String publicId);

  Future<BinderChecklistPage> loadChecklist({
    required String publicId,
    BinderChecklistFilter filter = BinderChecklistFilter.all,
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<BinderPage<BinderActivityEvent>> loadActivity({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<BinderPage<BinderMember>> loadMembers({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<BinderPage<BinderPendingContribution>> loadPendingContributions({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<BinderPage<BinderJoinRequest>> loadJoinRequestsQueue({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<BinderPage<BinderEligibleCopy>> loadEligibleCopies({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<BinderBulkPreview> previewBulk({
    required String publicId,
    BinderCursor? cursor,
    int limit = 100,
  });

  Future<BinderInvitation> previewInvitation(String token);

  Future<BinderDetail> loadPublicDetail(String publicId);

  Future<BinderChecklistPage> loadPublicChecklist({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<BinderDetail> loadViewLink(String token);

  Future<BinderChecklistPage> loadViewLinkChecklist({
    required String token,
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<BinderPage<BinderSummary>> explore({
    BinderCursor? cursor,
    int limit = 20,
  });

  Future<BinderPage<BinderTemplate>> loadTemplates({
    BinderCursor? cursor,
    int limit = 20,
  });

  Future<BinderTemplate> loadTemplate(String publicId);

  Future<BinderChecklistPage> loadTemplateChecklist({
    required String publicId,
    int? version,
    BinderCursor? cursor,
    int limit = 50,
  });

  Future<List<BinderLegacyCandidate>> loadLegacyCandidates();

  Future<List<BinderTargetSuggestion>> searchTargets({
    required BinderTargetKind kind,
    required String query,
    int limit = 20,
  });

  Future<List<BinderCatalogCard>> searchCustomCards({
    required String query,
    int limit = 30,
  });

  Future<List<BinderFinishOption>> loadCardFinishOptions(String cardPrintId);

  Future<String> createBinder(CreateBinderInput input);

  Future<void> updateMetadata({
    required String publicId,
    required String title,
    required String description,
    required String? coverCardPrintId,
  });

  Future<void> updatePolicy({
    required String publicId,
    required BinderReadAccess readAccess,
    required BinderDiscoverability discoverability,
    required BinderJoinPolicy joinPolicy,
    required BinderContributionPolicy contributionPolicy,
  });

  Future<void> setLifecycle({
    required String publicId,
    required BinderLifecycle lifecycle,
  });

  Future<void> deleteBinder({
    required String publicId,
    required String confirmation,
  });

  Future<String> offerOwnerTransfer({
    required String publicId,
    required String targetMemberId,
    required BinderOwnerTransferDisposition formerOwnerDisposition,
    DateTime? expiresAt,
  });

  Future<void> acceptOwnerTransfer(String offerId);

  Future<void> revokeOwnerTransfer(String offerId);

  Future<BinderInvitation> createInvitation({
    required String publicId,
    required BinderRole maximumRole,
    String? recipientUserId,
    DateTime? expiresAt,
  });

  Future<String> acceptInvitation(String token);

  Future<void> declineInvitation(String token);

  Future<void> reportInvitationToken({
    required String token,
    required String reason,
    String details = '',
  });

  Future<void> revokeInvitation(String invitationId);

  Future<String?> respondToInboxInvitation({
    required String invitationId,
    required bool accept,
  });

  Future<BinderViewLink> createViewLink({
    required String publicId,
    String? label,
    DateTime? expiresAt,
  });

  Future<BinderViewLink> rotateViewLink(String viewLinkId);

  Future<void> revokeViewLink(String viewLinkId);

  Future<void> requestToJoin(String publicId);

  Future<void> decideJoinRequest({
    required String requestId,
    required bool approve,
    BinderRole role = BinderRole.contributor,
  });

  Future<void> withdrawJoinRequest(String requestId);

  Future<void> changeMemberRole({
    required String memberId,
    required BinderRole role,
  });

  Future<void> suspendMember({
    required String memberId,
    required String reason,
  });

  Future<void> reinstateMember(String memberId);

  Future<void> removeMember({required String memberId, required String reason});

  Future<void> leaveBinder(String publicId);

  Future<void> updateMemberPreferences({
    required String publicId,
    String? alias,
    required BinderConsentScope contentScope,
    required BinderConsentScope identityScope,
    String notificationPreference = 'digest',
  });

  Future<String> addContribution({
    required String publicId,
    required String vaultItemInstanceId,
    String source = 'manual',
  });

  Future<void> withdrawContribution(String contributionId);

  Future<void> decideContribution({
    required String contributionId,
    required bool approve,
  });

  Future<void> removeContribution({
    required String contributionId,
    required String reason,
  });

  Future<int> addBulkContributions({
    required String publicId,
    required List<String> vaultItemInstanceIds,
  });

  Future<void> publishCustomRevision({
    required String publicId,
    required List<Map<String, dynamic>> slots,
  });

  Future<void> submitTemplate({
    required String publicId,
    required String name,
    required String description,
  });

  Future<String> cloneTemplate({
    required String templatePublicId,
    required String title,
    int? version,
  });

  Future<String?> decideLegacyCandidate({
    required String watchId,
    required bool convert,
    String? title,
  });

  Future<void> report({
    required BinderReportSurface surface,
    required String surfaceId,
    required String reason,
    String details = '',
  });

  Future<void> blockOwner(String publicId);

  Future<void> blockMember(String memberId);

  Future<void> reportPublicAction({
    required String publicId,
    required BinderReportSurface surface,
    required String actionReference,
    required String reason,
    String details = '',
  });

  Future<void> blockPublicMember({
    required String publicId,
    required String memberActionReference,
  });

  Future<BinderPulseShareResult> sharePulseMilestone({
    required String publicId,
    required int threshold,
  });
}

class SupabaseBinderRepository implements BinderRepository {
  SupabaseBinderRepository({SupabaseClient? client})
    : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;
  final Random _secureRandom = Random.secure();

  /// Exposed only for the sanitized `binder_refresh_signals` subscription.
  /// Binder clients must never use this client to subscribe to authority
  /// tables.
  SupabaseClient get realtimeClient => _client;

  @override
  String? get currentUserId {
    final id = (_client.auth.currentUser?.id ?? '').trim();
    return id.isEmpty ? null : id;
  }

  @override
  Future<BinderLibraryPage> loadLibrary({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    final json = await _rpc(BinderRpc.dashboard, <String, dynamic>{
      BinderParam.limit: limit.clamp(1, 20),
      BinderParam.beforeUpdatedAt: cursor?.updatedAt?.toIso8601String(),
      BinderParam.beforeId: cursor?.id,
    });
    return BinderLibraryPage.fromJson(<String, dynamic>{
      ...json,
      'binders': json['items'] ?? json['binders'],
      'has_more': json['next_cursor'] != null,
    });
  }

  @override
  Future<BinderPage<BinderInvitation>> loadInvitationInbox({
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _rpc(BinderRpc.invitationInbox, <String, dynamic>{
      BinderParam.limit: limit.clamp(1, 50),
      BinderParam.beforeCreatedAt: cursor?.createdAt?.toIso8601String(),
      BinderParam.beforeId: cursor?.id,
    });
    return _page(json, BinderInvitation.fromMemberReadJson);
  }

  @override
  Future<BinderPage<BinderSuspendedAccess>> loadSuspendedBinders({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    final json = await _rpc(BinderRpc.suspendedBinders, <String, dynamic>{
      BinderParam.limit: limit.clamp(1, 20),
      BinderParam.beforeUpdatedAt: cursor?.updatedAt?.toIso8601String(),
      BinderParam.beforeId: cursor?.id,
    });
    return _page(json, BinderSuspendedAccess.fromJson);
  }

  @override
  Future<BinderDetail> loadDetail(String publicId) async {
    final json = await _rpc(BinderRpc.detail, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
    });
    return _detailFromEnvelope(json);
  }

  @override
  Future<BinderChecklistPage> loadChecklist({
    required String publicId,
    BinderChecklistFilter filter = BinderChecklistFilter.all,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _rpc(BinderRpc.checklist, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_filter': filter.wireValue,
      BinderParam.limit: limit.clamp(1, 50),
      BinderParam.afterPosition: cursor?.position,
    });
    return BinderChecklistPage.fromJson(<String, dynamic>{
      ...json,
      'next_position': json['next_position'],
      'has_more': json['next_position'] != null,
    });
  }

  @override
  Future<BinderPage<BinderActivityEvent>> loadActivity({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _rpc(BinderRpc.activity, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      BinderParam.limit: limit.clamp(1, 50),
      BinderParam.beforeCreatedAt: cursor?.createdAt?.toIso8601String(),
      BinderParam.beforeId: cursor?.id,
    });
    return _page(json, BinderActivityEvent.fromJson);
  }

  @override
  Future<BinderPage<BinderMember>> loadMembers({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _rpc(BinderRpc.members, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      BinderParam.limit: limit.clamp(1, 50),
      BinderParam.afterMemberId: cursor?.memberId ?? cursor?.id,
    });
    return _page(json, BinderMember.fromJson);
  }

  @override
  Future<BinderPage<BinderPendingContribution>> loadPendingContributions({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _rpc(BinderRpc.pendingContributions, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      BinderParam.limit: limit.clamp(1, 50),
      BinderParam.beforeCreatedAt: cursor?.createdAt?.toIso8601String(),
      BinderParam.beforeId: cursor?.id,
    });
    return _page(json, BinderPendingContribution.fromJson);
  }

  @override
  Future<BinderPage<BinderJoinRequest>> loadJoinRequestsQueue({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _rpc(BinderRpc.joinRequestsQueue, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      BinderParam.limit: limit.clamp(1, 50),
      BinderParam.beforeRequestedAt: (cursor?.requestedAt ?? cursor?.createdAt)
          ?.toIso8601String(),
      BinderParam.beforeId: cursor?.id,
    });
    return _page(json, BinderJoinRequest.fromJson);
  }

  @override
  Future<BinderPage<BinderEligibleCopy>> loadEligibleCopies({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _rpc(BinderRpc.eligibleCopies, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      BinderParam.limit: limit.clamp(1, 50),
      BinderParam.afterCreatedAt: cursor?.createdAt?.toIso8601String(),
      BinderParam.afterInstanceId: cursor?.instanceId ?? cursor?.id,
    });
    return _page(json, BinderEligibleCopy.fromJson);
  }

  @override
  Future<BinderBulkPreview> previewBulk({
    required String publicId,
    BinderCursor? cursor,
    int limit = 100,
  }) async {
    final json = await _rpc(BinderRpc.bulkPreview, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      BinderParam.limit: limit.clamp(1, 100),
      BinderParam.afterCreatedAt: cursor?.createdAt?.toIso8601String(),
      BinderParam.afterInstanceId: cursor?.instanceId ?? cursor?.id,
    });
    return BinderBulkPreview.fromJson(<String, dynamic>{
      ...json,
      'sample': json['items'] ?? json['sample'],
      'resume_cursor': json['next_cursor'],
    });
  }

  @override
  Future<BinderInvitation> previewInvitation(String token) async {
    final json = await _secretRpc(BinderRpc.invitationPreview, token: token);
    final invitation = BinderInvitation.fromPreviewJson(json);
    if (invitation.state != BinderInvitationState.pending ||
        invitation.binderPublicId == null ||
        invitation.expiresAt == null) {
      throw const BinderException(
        BinderFailureKind.unavailable,
        'This invitation is unavailable.',
      );
    }
    return invitation;
  }

  @override
  Future<BinderDetail> loadPublicDetail(String publicId) async {
    final json = await _rpc(BinderRpc.publicDetail, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
    });
    return BinderDetail.fromExternalJson(
      json,
      audience: BinderExternalAudience.public,
      authenticatedViewer: currentUserId != null,
    );
  }

  @override
  Future<BinderChecklistPage> loadPublicChecklist({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _rpc(BinderRpc.publicChecklist, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      BinderParam.limit: limit.clamp(1, 50),
      BinderParam.afterPosition: cursor?.position,
    });
    return BinderChecklistPage.fromExternalJson(
      json,
      audience: BinderExternalAudience.public,
      authenticatedViewer: currentUserId != null,
    );
  }

  @override
  Future<BinderDetail> loadViewLink(String token) async {
    final json = await _secretRpc(BinderRpc.viewLinkDetail, token: token);
    return BinderDetail.fromExternalJson(
      json,
      audience: BinderExternalAudience.viewLink,
    );
  }

  @override
  Future<BinderChecklistPage> loadViewLinkChecklist({
    required String token,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _secretRpc(
      BinderRpc.viewLinkChecklist,
      token: token,
      params: <String, dynamic>{
        BinderParam.limit: limit.clamp(1, 50),
        BinderParam.afterPosition: cursor?.position,
      },
    );
    return BinderChecklistPage.fromExternalJson(
      json,
      audience: BinderExternalAudience.viewLink,
    );
  }

  @override
  Future<BinderPage<BinderSummary>> explore({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    final json = await _rpc(BinderRpc.explore, <String, dynamic>{
      BinderParam.limit: limit.clamp(1, 20),
      BinderParam.beforeCreatedAt: cursor?.createdAt?.toIso8601String(),
      BinderParam.beforeId: cursor?.id,
    });
    final nextCursor = BinderCursor.fromExternalCreatedCursor(
      json['next_cursor'],
    );
    return BinderPage<BinderSummary>(
      items: BinderSummary.externalExploreItems(json['items']),
      nextCursor: nextCursor,
      hasMore: nextCursor != null,
    );
  }

  @override
  Future<BinderPage<BinderTemplate>> loadTemplates({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    final json = await _rpc(BinderRpc.templates, <String, dynamic>{
      BinderParam.limit: limit.clamp(1, 20),
      BinderParam.beforeCreatedAt: cursor?.createdAt?.toIso8601String(),
      BinderParam.beforeId: cursor?.id,
    });
    final nextCursor = BinderCursor.fromExternalCreatedCursor(
      json['next_cursor'],
    );
    return BinderPage<BinderTemplate>(
      items: BinderTemplate.externalItems(json['items']),
      nextCursor: nextCursor,
      hasMore: nextCursor != null,
    );
  }

  @override
  Future<BinderTemplate> loadTemplate(String publicId) async {
    final json = await _rpc(BinderRpc.templateDetail, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
    });
    final template = BinderTemplate.tryFromExternalJson(
      _jsonMap(json['template']).isEmpty ? json : _jsonMap(json['template']),
    );
    if (template == null) {
      throw const BinderException(
        BinderFailureKind.unavailable,
        'This Binder Template is unavailable.',
      );
    }
    return template;
  }

  @override
  Future<BinderChecklistPage> loadTemplateChecklist({
    required String publicId,
    int? version,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final json = await _rpc(BinderRpc.templateChecklist, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_version': version,
      BinderParam.limit: limit.clamp(1, 50),
      BinderParam.afterPosition: cursor?.position,
    });
    return BinderChecklistPage.fromExternalJson(
      json,
      audience: BinderExternalAudience.template,
    );
  }

  @override
  Future<List<BinderLegacyCandidate>> loadLegacyCandidates() async {
    final json = await _rpc(
      BinderRpc.legacyCandidates,
      const <String, dynamic>{},
    );
    return _jsonMaps(
      json['items'] ?? json['candidates'],
    ).map(BinderLegacyCandidate.fromJson).toList(growable: false);
  }

  @override
  Future<List<BinderTargetSuggestion>> searchTargets({
    required BinderTargetKind kind,
    required String query,
    int limit = 20,
  }) async {
    final safeQuery = query
        .trim()
        .replaceAll(RegExp(r"[^a-zA-Z0-9À-ž .'\-]"), ' ')
        .replaceAll(RegExp(r'\s+'), ' ');
    try {
      switch (kind) {
        case BinderTargetKind.species:
          var request = _client
              .from('v_grookai_dex_species_v1')
              .select('species_id,display_name,slug,total_print_count,active')
              .eq('active', true);
          if (safeQuery.isNotEmpty) {
            request = request.ilike('display_name', '%$safeQuery%');
          }
          final raw = await request
              .order('display_name', ascending: true)
              .limit(limit.clamp(1, 20));
          return _jsonMaps(raw)
              .map(
                (row) => BinderTargetSuggestion.fromJson(<String, dynamic>{
                  'id': row['species_id'],
                  'route_key': row['slug'],
                  'title': row['display_name'],
                  'kind': 'species',
                  'slot_count': row['total_print_count'],
                }),
              )
              .where((item) => item.id.isNotEmpty)
              .toList(growable: false);
        case BinderTargetKind.set:
          var request = _client.from('sets').select('id,code,name,logo_url');
          if (safeQuery.isNotEmpty) {
            request = request.ilike('name', '%$safeQuery%');
          }
          final raw = await request
              .order('name', ascending: true)
              .limit(limit.clamp(1, 20));
          return _jsonMaps(raw)
              .map(
                (row) => BinderTargetSuggestion.fromJson(<String, dynamic>{
                  'id': row['id'],
                  'route_key': row['code'],
                  'title': row['name'],
                  'image_url': row['logo_url'],
                  'kind': 'set',
                }),
              )
              .where((item) => item.id.isNotEmpty)
              .toList(growable: false);
        case BinderTargetKind.custom:
          return const <BinderTargetSuggestion>[];
      }
    } catch (error) {
      throw _safeException(error);
    }
  }

  @override
  Future<List<BinderCatalogCard>> searchCustomCards({
    required String query,
    int limit = 30,
  }) async {
    final normalized = query.trim();
    try {
      final result = await CardPrintRepository.searchCardPrintsResolved(
        client: _client,
        options: CardSearchOptions(
          query: normalized,
          limit: limit.clamp(1, 50),
          sort: 'name',
        ),
        defaultLimit: 50,
        searchLimit: 100,
      );
      final seen = <String>{};
      return result.rows
          .where(
            (card) =>
                card.id.trim().isNotEmpty &&
                card.name.trim().isNotEmpty &&
                seen.add(card.id.trim()),
          )
          .map(
            (card) => BinderCatalogCard(
              cardPrintId: card.id.trim(),
              name: card.name.trim(),
              setLabel: card.displaySet.trim(),
              number: card.displayNumber.trim().isEmpty
                  ? null
                  : card.displayNumber.trim(),
              hostedImageUrl: card.hostedImageUrl,
              fallbackImageUrl:
                  card.providerFallbackImageUrl ?? card.displayImage,
              preferredCardPrintingId: _nullable(card.searchCardPrintingId),
            ),
          )
          .toList(growable: false);
    } catch (error) {
      throw _safeException(error);
    }
  }

  @override
  Future<List<BinderFinishOption>> loadCardFinishOptions(
    String cardPrintId,
  ) async {
    final id = _required(cardPrintId);
    try {
      final raw = await _client
          .from('card_printings')
          .select(
            'id,card_print_id,finish_key,'
            'finish:finish_keys(label,sort_order,is_active)',
          )
          .eq('card_print_id', id)
          .limit(100);
      final rows =
          _jsonMaps(raw)
              .where((row) {
                final finish = _jsonMap(row['finish']);
                return finish.isEmpty || finish['is_active'] != false;
              })
              .toList(growable: false)
            ..sort((left, right) {
              final leftFinish = _jsonMap(left['finish']);
              final rightFinish = _jsonMap(right['finish']);
              final byOrder = _asInt(
                leftFinish['sort_order'],
              ).compareTo(_asInt(rightFinish['sort_order']));
              if (byOrder != 0) return byOrder;
              return (leftFinish['label'] ?? left['finish_key'] ?? '')
                  .toString()
                  .compareTo(
                    (rightFinish['label'] ?? right['finish_key'] ?? '')
                        .toString(),
                  );
            });
      return <BinderFinishOption>[
        const BinderFinishOption(label: 'Any governed finish'),
        ...rows.map((row) {
          final finish = _jsonMap(row['finish']);
          final key = _nullable(row['finish_key']);
          return BinderFinishOption(
            cardPrintingId: _nullable(row['id']),
            finishKey: key,
            label:
                _nullable(finish['label']) ??
                (key == null ? 'Governed finish' : key.replaceAll('_', ' ')),
          );
        }),
      ];
    } catch (error) {
      throw _safeException(error);
    }
  }

  @override
  Future<String> createBinder(CreateBinderInput input) async {
    final json = await _rpc(BinderRpc.create, <String, dynamic>{
      'p_title': input.title.trim(),
      'p_target_kind': input.targetKind.wireValue,
      'p_checklist_mode': input.checklistMode.wireValue,
      BinderParam.idempotencyKey: _idempotencyKey(),
      'p_description': input.description.trim(),
      'p_species_id': input.targetKind == BinderTargetKind.species
          ? _required(input.targetId)
          : null,
      'p_set_id': input.targetKind == BinderTargetKind.set
          ? _required(input.targetId)
          : null,
      'p_cover_card_print_id': input.coverReference,
      'p_custom_slots': input.customSlots,
    });
    return _required(json['binder_public_id']);
  }

  @override
  Future<void> updateMetadata({
    required String publicId,
    required String title,
    required String description,
    required String? coverCardPrintId,
  }) async {
    await _mutation(BinderRpc.updateMetadata, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_title': title.trim(),
      'p_description': description.trim(),
      'p_cover_card_print_id': coverCardPrintId,
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
    await _mutation(BinderRpc.updatePolicy, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_read_access': readAccess.wireValue,
      'p_discoverability': discoverability.wireValue,
      'p_join_policy': joinPolicy.wireValue,
      'p_contribution_policy': contributionPolicy.wireValue,
    });
  }

  @override
  Future<void> setLifecycle({
    required String publicId,
    required BinderLifecycle lifecycle,
  }) async {
    await _mutation(BinderRpc.setLifecycle, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_lifecycle': lifecycle.wireValue,
    });
  }

  @override
  Future<void> deleteBinder({
    required String publicId,
    required String confirmation,
  }) async {
    await _mutation(BinderRpc.delete, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_confirmation': confirmation,
    });
  }

  @override
  Future<String> offerOwnerTransfer({
    required String publicId,
    required String targetMemberId,
    required BinderOwnerTransferDisposition formerOwnerDisposition,
    DateTime? expiresAt,
  }) async {
    final json =
        await _mutation(BinderRpc.ownerTransferOffer, <String, dynamic>{
          BinderParam.publicId: _required(publicId),
          'p_target_member_id': _required(targetMemberId),
          'p_former_owner_role': formerOwnerDisposition.wireValue,
          'p_expires_at': expiresAt?.toUtc().toIso8601String(),
        });
    return _required(json['offer_id']);
  }

  @override
  Future<void> acceptOwnerTransfer(String offerId) => _mutationVoid(
    BinderRpc.ownerTransferAccept,
    <String, dynamic>{'p_offer_id': _required(offerId)},
  );

  @override
  Future<void> revokeOwnerTransfer(String offerId) => _mutationVoid(
    BinderRpc.ownerTransferRevoke,
    <String, dynamic>{'p_offer_id': _required(offerId)},
  );

  @override
  Future<BinderInvitation> createInvitation({
    required String publicId,
    required BinderRole maximumRole,
    String? recipientUserId,
    DateTime? expiresAt,
  }) async {
    final json = await _mutation(BinderRpc.inviteCreate, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_max_role': maximumRole.wireValue,
      'p_recipient_user_id': _nullable(recipientUserId),
      'p_expires_at': expiresAt?.toUtc().toIso8601String(),
    });
    return BinderInvitation.fromCreateResponseJson(json);
  }

  @override
  Future<String> acceptInvitation(String token) async {
    final json = await _secretMutation(BinderRpc.inviteAccept, token: token);
    return _required(json['binder_public_id']);
  }

  @override
  Future<void> declineInvitation(String token) async {
    await _secretMutation(BinderRpc.inviteDecline, token: token);
  }

  @override
  Future<void> reportInvitationToken({
    required String token,
    required String reason,
    String details = '',
  }) async {
    final normalized = token.trim();
    if (normalized.isEmpty) {
      throw const BinderException(
        BinderFailureKind.unavailable,
        'This invitation is unavailable.',
      );
    }
    await _rpc(BinderRpc.invitationReport, <String, dynamic>{
      BinderParam.token: normalized,
      'p_reason': reason.trim(),
      'p_details': details.trim(),
      BinderParam.idempotencyKey: _idempotencyKey(),
    }, secretOperation: true);
  }

  @override
  Future<void> revokeInvitation(String invitationId) => _mutationVoid(
    BinderRpc.inviteRevoke,
    <String, dynamic>{'p_invitation_id': _required(invitationId)},
  );

  @override
  Future<String?> respondToInboxInvitation({
    required String invitationId,
    required bool accept,
  }) async {
    final json = await _mutation(BinderRpc.inviteRespond, <String, dynamic>{
      'p_invitation_id': _required(invitationId),
      'p_decision': accept ? 'accept' : 'decline',
    });
    return _nullable(json['binder_public_id']);
  }

  @override
  Future<BinderViewLink> createViewLink({
    required String publicId,
    String? label,
    DateTime? expiresAt,
  }) async {
    final json = await _mutation(BinderRpc.viewLinkCreate, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_label': _nullable(label),
      'p_expires_at': expiresAt?.toUtc().toIso8601String(),
    });
    return BinderViewLink.fromCreateOrRotateResponseJson(json);
  }

  @override
  Future<BinderViewLink> rotateViewLink(String viewLinkId) async {
    final json = await _mutation(BinderRpc.viewLinkRotate, <String, dynamic>{
      'p_view_link_id': _required(viewLinkId),
    });
    return BinderViewLink.fromCreateOrRotateResponseJson(json);
  }

  @override
  Future<void> revokeViewLink(String viewLinkId) => _mutationVoid(
    BinderRpc.viewLinkRevoke,
    <String, dynamic>{'p_view_link_id': _required(viewLinkId)},
  );

  @override
  Future<void> requestToJoin(String publicId) => _mutationVoid(
    BinderRpc.joinRequestCreate,
    <String, dynamic>{BinderParam.publicId: _required(publicId)},
  );

  @override
  Future<void> decideJoinRequest({
    required String requestId,
    required bool approve,
    BinderRole role = BinderRole.contributor,
  }) => _mutationVoid(BinderRpc.joinRequestDecide, <String, dynamic>{
    'p_request_id': _required(requestId),
    'p_decision': approve ? 'approve' : 'reject',
    'p_role': role.wireValue,
  });

  @override
  Future<void> withdrawJoinRequest(String requestId) => _mutationVoid(
    BinderRpc.joinRequestWithdraw,
    <String, dynamic>{'p_request_id': _required(requestId)},
  );

  @override
  Future<void> changeMemberRole({
    required String memberId,
    required BinderRole role,
  }) => _mutationVoid(BinderRpc.memberChangeRole, <String, dynamic>{
    'p_member_id': _required(memberId),
    'p_role': role.wireValue,
  });

  @override
  Future<void> suspendMember({
    required String memberId,
    required String reason,
  }) => _mutationVoid(BinderRpc.memberSuspend, <String, dynamic>{
    'p_member_id': _required(memberId),
    'p_reason': reason.trim(),
  });

  @override
  Future<void> reinstateMember(String memberId) => _mutationVoid(
    BinderRpc.memberReinstate,
    <String, dynamic>{'p_member_id': _required(memberId)},
  );

  @override
  Future<void> removeMember({
    required String memberId,
    required String reason,
  }) => _mutationVoid(BinderRpc.memberRemove, <String, dynamic>{
    'p_member_id': _required(memberId),
    'p_reason': reason.trim(),
  });

  @override
  Future<void> leaveBinder(String publicId) => _mutationVoid(
    BinderRpc.leave,
    <String, dynamic>{BinderParam.publicId: _required(publicId)},
  );

  @override
  Future<void> updateMemberPreferences({
    required String publicId,
    String? alias,
    required BinderConsentScope contentScope,
    required BinderConsentScope identityScope,
    String notificationPreference = 'digest',
  }) => _mutationVoid(BinderRpc.memberPreferences, <String, dynamic>{
    BinderParam.publicId: _required(publicId),
    'p_alias': _nullable(alias),
    'p_content_scope': contentScope.wireValue,
    'p_identity_scope': identityScope.wireValue,
    'p_notification_preference': notificationPreference,
  });

  @override
  Future<String> addContribution({
    required String publicId,
    required String vaultItemInstanceId,
    String source = 'manual',
  }) async {
    final json = await _mutation(BinderRpc.contributionAdd, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_vault_item_instance_id': _required(vaultItemInstanceId),
      'p_source': source,
    });
    return _required(json['contribution_id']);
  }

  @override
  Future<void> withdrawContribution(String contributionId) => _mutationVoid(
    BinderRpc.contributionWithdraw,
    <String, dynamic>{'p_contribution_id': _required(contributionId)},
  );

  @override
  Future<void> decideContribution({
    required String contributionId,
    required bool approve,
  }) => _mutationVoid(BinderRpc.contributionDecide, <String, dynamic>{
    'p_contribution_id': _required(contributionId),
    'p_decision': approve ? 'approve' : 'reject',
  });

  @override
  Future<void> removeContribution({
    required String contributionId,
    required String reason,
  }) => _mutationVoid(BinderRpc.contributionRemove, <String, dynamic>{
    'p_contribution_id': _required(contributionId),
    'p_reason': reason.trim(),
  });

  @override
  Future<int> addBulkContributions({
    required String publicId,
    required List<String> vaultItemInstanceIds,
  }) async {
    final normalized = vaultItemInstanceIds
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toSet()
        .take(100)
        .toList(growable: false);
    if (normalized.isEmpty) {
      throw const BinderException(
        BinderFailureKind.validation,
        'Choose at least one eligible copy.',
      );
    }
    final json = await _mutation(BinderRpc.bulkAdd, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_vault_item_instance_ids': normalized,
    });
    return _asInt(json['accepted_count'] ?? json['added_count']);
  }

  @override
  Future<void> publishCustomRevision({
    required String publicId,
    required List<Map<String, dynamic>> slots,
  }) => _mutationVoid(BinderRpc.customRevisionPublish, <String, dynamic>{
    BinderParam.publicId: _required(publicId),
    'p_slots': slots,
  });

  @override
  Future<void> submitTemplate({
    required String publicId,
    required String name,
    required String description,
  }) => _mutationVoid(BinderRpc.templateSubmit, <String, dynamic>{
    BinderParam.publicId: _required(publicId),
    'p_name': name.trim(),
    'p_description': description.trim(),
  });

  @override
  Future<String> cloneTemplate({
    required String templatePublicId,
    required String title,
    int? version,
  }) async {
    final json = await _mutation(BinderRpc.templateClone, <String, dynamic>{
      'p_template_public_id': _required(templatePublicId),
      'p_title': title.trim(),
      'p_version_number': version,
    });
    return _required(json['binder_public_id']);
  }

  @override
  Future<String?> decideLegacyCandidate({
    required String watchId,
    required bool convert,
    String? title,
  }) async {
    final json = await _mutation(BinderRpc.legacyDecide, <String, dynamic>{
      'p_watch_id': _required(watchId),
      'p_decision': convert ? 'convert' : 'dismiss',
      'p_title': _nullable(title),
    });
    return _nullable(json['binder_public_id']);
  }

  @override
  Future<void> report({
    required BinderReportSurface surface,
    required String surfaceId,
    required String reason,
    String details = '',
  }) => _mutationVoid(BinderRpc.report, <String, dynamic>{
    'p_surface': surface.wireValue,
    'p_surface_id': _required(surfaceId),
    'p_reason': reason.trim(),
    'p_details': details.trim(),
  });

  @override
  Future<void> blockOwner(String publicId) => _mutationVoid(
    BinderRpc.blockOwner,
    <String, dynamic>{BinderParam.publicId: _required(publicId)},
  );

  @override
  Future<void> blockMember(String memberId) => _mutationVoid(
    BinderRpc.blockMember,
    <String, dynamic>{'p_member_id': _required(memberId)},
  );

  @override
  Future<void> reportPublicAction({
    required String publicId,
    required BinderReportSurface surface,
    required String actionReference,
    required String reason,
    String details = '',
  }) {
    final publicSurface = switch (surface) {
      BinderReportSurface.contribution => 'contribution',
      BinderReportSurface.member => 'member',
      _ => throw const BinderException(
        BinderFailureKind.validation,
        'That public Binder action is unavailable.',
      ),
    };
    return _mutationVoid(BinderRpc.publicActionReport, <String, dynamic>{
      BinderParam.publicId: _required(publicId),
      'p_surface': publicSurface,
      'p_action_ref': _required(actionReference),
      'p_reason': reason.trim(),
      'p_details': details.trim(),
    });
  }

  @override
  Future<void> blockPublicMember({
    required String publicId,
    required String memberActionReference,
  }) => _mutationVoid(BinderRpc.publicMemberBlock, <String, dynamic>{
    BinderParam.publicId: _required(publicId),
    'p_member_action_ref': _required(memberActionReference),
  });

  @override
  Future<BinderPulseShareResult> sharePulseMilestone({
    required String publicId,
    required int threshold,
  }) async {
    if (!const <int>{25, 50, 75, 90, 100}.contains(threshold)) {
      throw const BinderException(
        BinderFailureKind.validation,
        'Choose a reached Binder milestone.',
      );
    }
    final json = await _mutation(
      BinderRpc.pulseMilestoneShare,
      <String, dynamic>{
        BinderParam.publicId: _required(publicId),
        'p_threshold': threshold,
      },
    );
    return BinderPulseShareResult.fromJson(json);
  }

  BinderDetail _detailFromEnvelope(Map<String, dynamic> json) {
    final binder = <String, dynamic>{..._jsonMap(json['binder'])};
    final viewer = _jsonMap(json['viewer']);
    final progress = _jsonMap(json['progress']);
    final memberProgress = _jsonMap(progress['member']);
    final selectedProgress = memberProgress.isEmpty ? progress : memberProgress;
    binder['completed_slots'] ??=
        selectedProgress['completed_slots'] ??
        selectedProgress['satisfied_slots'];
    binder['total_slots'] ??= selectedProgress['total_slots'];
    binder['progress_unit'] ??= selectedProgress['unit'] ?? progress['unit'];
    binder['viewer_role'] ??= viewer['role'];
    binder['is_external_projection'] = false;
    return BinderDetail.fromJson(<String, dynamic>{
      ...json,
      'binder': binder,
      'membership': json['viewer'] ?? json['membership'],
      'authorized_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  BinderPage<T> _page<T>(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) parse,
  ) {
    final cursor = BinderCursor.fromJsonOrNull(json['next_cursor']);
    return BinderPage<T>(
      items: _jsonMaps(json['items']).map(parse).toList(growable: false),
      nextCursor: cursor,
      hasMore: cursor != null,
    );
  }

  Future<Map<String, dynamic>> _mutation(
    String function,
    Map<String, dynamic> params,
  ) {
    return _rpc(function, <String, dynamic>{
      ...params,
      BinderParam.idempotencyKey: _idempotencyKey(),
    });
  }

  Future<void> _mutationVoid(
    String function,
    Map<String, dynamic> params,
  ) async {
    await _mutation(function, params);
  }

  Future<Map<String, dynamic>> _secretRpc(
    String function, {
    required String token,
    Map<String, dynamic> params = const <String, dynamic>{},
  }) {
    final normalized = token.trim();
    if (normalized.isEmpty) {
      throw const BinderException(
        BinderFailureKind.unavailable,
        'This link is unavailable.',
      );
    }
    return _rpc(function, <String, dynamic>{
      ...params,
      BinderParam.token: normalized,
    }, secretOperation: true);
  }

  Future<Map<String, dynamic>> _secretMutation(
    String function, {
    required String token,
  }) {
    final normalized = token.trim();
    if (normalized.isEmpty) {
      throw const BinderException(
        BinderFailureKind.unavailable,
        'This invitation is unavailable.',
      );
    }
    return _rpc(function, <String, dynamic>{
      BinderParam.token: normalized,
      BinderParam.idempotencyKey: _idempotencyKey(),
    }, secretOperation: true);
  }

  Future<Map<String, dynamic>> _rpc(
    String function,
    Map<String, dynamic> params, {
    bool secretOperation = false,
  }) async {
    try {
      final compactParams = BinderRpc.compactRequestParams(function, params);
      final raw = await _client
          .rpc(function, params: compactParams)
          .timeout(const Duration(seconds: 15));
      final json = _jsonMap(raw);
      if (json['ok'] == false) {
        throw _exceptionFromEnvelope(json, secretOperation: secretOperation);
      }
      return json;
    } catch (error) {
      if (error is BinderException) rethrow;
      throw _safeException(error, secretOperation: secretOperation);
    }
  }

  BinderException _exceptionFromEnvelope(
    Map<String, dynamic> json, {
    required bool secretOperation,
  }) {
    final code = (json['code'] ?? '').toString().toLowerCase();
    return _exceptionForCode(code, secretOperation: secretOperation);
  }

  BinderException _safeException(Object error, {bool secretOperation = false}) {
    if (error is SocketException || error is TimeoutException) {
      return const BinderException(
        BinderFailureKind.offline,
        'You appear to be offline. Try again when you have a connection.',
      );
    }
    if (error is AuthException) {
      return const BinderException(
        BinderFailureKind.authentication,
        'Sign in to continue.',
      );
    }
    if (error is PostgrestException) {
      final code = '${error.code} ${error.message}'.toLowerCase();
      return _exceptionForCode(code, secretOperation: secretOperation);
    }
    return BinderException(
      BinderFailureKind.unknown,
      secretOperation
          ? 'This link is unavailable.'
          : 'Binder could not be updated. Please try again.',
    );
  }

  BinderException _exceptionForCode(
    String code, {
    required bool secretOperation,
  }) {
    if (secretOperation &&
        (code.contains('expired') ||
            code.contains('revoked') ||
            code.contains('used') ||
            code.contains('not_found') ||
            code.contains('no_access'))) {
      return const BinderException(
        BinderFailureKind.revoked,
        'This link is unavailable.',
      );
    }
    if (code.contains('auth') || code.contains('28000')) {
      return const BinderException(
        BinderFailureKind.authentication,
        'Sign in to continue.',
      );
    }
    if (code.contains('no_access') ||
        code.contains('forbidden') ||
        code.contains('42501')) {
      return const BinderException(
        BinderFailureKind.noAccess,
        'This Binder is unavailable.',
      );
    }
    if (code.contains('duplicate') || code.contains('23505')) {
      return const BinderException(
        BinderFailureKind.duplicate,
        'That copy is already linked to this Binder.',
      );
    }
    if (code.contains('copy_') ||
        code.contains('wrong_target') ||
        code.contains('unresolved')) {
      return const BinderException(
        BinderFailureKind.invalidCopy,
        'That copy is no longer eligible for this Binder.',
      );
    }
    if (code.contains('stale') ||
        code.contains('archived') ||
        code.contains('frozen') ||
        code.contains('conflict')) {
      return const BinderException(
        BinderFailureKind.conflict,
        'Binder access changed. Refresh and try again.',
      );
    }
    if (code.contains('rate') || code.contains('limit')) {
      return const BinderException(
        BinderFailureKind.rateLimited,
        'That action is temporarily limited. Please try again later.',
      );
    }
    if (code.contains('invalid') ||
        code.contains('22023') ||
        code.contains('23514')) {
      return const BinderException(
        BinderFailureKind.validation,
        'Check the Binder details and try again.',
      );
    }
    return BinderException(
      BinderFailureKind.unavailable,
      secretOperation
          ? 'This link is unavailable.'
          : 'This Binder is temporarily unavailable.',
    );
  }

  String _idempotencyKey() {
    final now = DateTime.now().microsecondsSinceEpoch.toRadixString(16);
    final random = List<int>.generate(
      4,
      (_) => _secureRandom.nextInt(1 << 32),
    ).map((value) => value.toRadixString(16).padLeft(8, '0')).join();
    return 'mobile-$now-$random';
  }
}

/// Exhausts the contract's bounded 100-membership account ceiling.
///
/// Contextual Dex/Set affordances use this off the critical render path so
/// they never infer “no Binder” from only the first 20-row dashboard page.
Future<List<BinderSummary>> loadBinderMembershipsBounded(
  BinderRepository repository, {
  int maximum = 100,
}) async {
  final byId = <String, BinderSummary>{};
  BinderCursor? cursor;
  do {
    final page = await repository.loadLibrary(cursor: cursor);
    for (final binder in page.binders) {
      byId[binder.id] = binder;
      if (byId.length >= maximum) break;
    }
    cursor = byId.length >= maximum ? null : page.nextCursor;
  } while (cursor != null);
  return byId.values.toList(growable: false);
}

Map<String, dynamic> _jsonMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  if (value is List && value.length == 1 && value.single is Map) {
    return Map<String, dynamic>.from(value.single as Map);
  }
  return const <String, dynamic>{};
}

List<Map<String, dynamic>> _jsonMaps(Object? value) {
  if (value is! List) return const <Map<String, dynamic>>[];
  return value
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList(growable: false);
}

String _required(Object? value) {
  final text = (value ?? '').toString().trim();
  if (text.isEmpty) {
    throw const BinderException(
      BinderFailureKind.validation,
      'A required Binder value is missing.',
    );
  }
  return text;
}

String? _nullable(Object? value) {
  final text = (value ?? '').toString().trim();
  return text.isEmpty ? null : text;
}

int _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse((value ?? '').toString()) ?? 0;
}
