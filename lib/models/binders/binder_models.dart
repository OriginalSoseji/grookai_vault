import 'dart:convert';

enum BinderTargetKind {
  species('species', 'Pokémon'),
  set('set', 'Set'),
  custom('custom', 'Custom');

  const BinderTargetKind(this.wireValue, this.label);
  final String wireValue;
  final String label;

  static BinderTargetKind parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? species;
}

enum BinderChecklistMode {
  cardPrints('card_prints', 'Card Prints', 'card prints'),
  masterSet('master_set', 'Master Set', 'finish options'),
  masterVariants('master_variants', 'Master Variants', 'finish variants'),
  custom('custom', 'Custom checklist', 'checklist slots');

  const BinderChecklistMode(this.wireValue, this.label, this.progressUnit);
  final String wireValue;
  final String label;
  final String progressUnit;

  static BinderChecklistMode parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? cardPrints;
}

enum BinderRole {
  owner('owner', 'Owner'),
  manager('manager', 'Manager'),
  contributor('contributor', 'Contributor'),
  viewer('viewer', 'Viewer');

  const BinderRole(this.wireValue, this.label);
  final String wireValue;
  final String label;

  bool get canContribute => this != viewer;
  bool get canManagePeople => this == owner || this == manager;
  bool get canManagePolicy => this == owner;
  bool get canEditMetadata => this == owner || this == manager;

  static BinderRole parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? viewer;
}

enum BinderOwnerTransferDisposition {
  manager('manager', 'Manager'),
  contributor('contributor', 'Contributor'),
  viewer('viewer', 'Viewer'),
  leave('leave', 'Leave Binder');

  const BinderOwnerTransferDisposition(this.wireValue, this.label);
  final String wireValue;
  final String label;

  bool get leavesBinder => this == leave;

  static BinderOwnerTransferDisposition parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? manager;
}

enum BinderReadAccess {
  private('private', 'Private'),
  link('link', 'View-only link'),
  public('public', 'Public');

  const BinderReadAccess(this.wireValue, this.label);
  final String wireValue;
  final String label;

  static BinderReadAccess parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? private;
}

enum BinderDiscoverability {
  unlisted('unlisted', 'Unlisted'),
  listed('listed', 'Listed');

  const BinderDiscoverability(this.wireValue, this.label);
  final String wireValue;
  final String label;

  static BinderDiscoverability parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? unlisted;
}

enum BinderJoinPolicy {
  closed('closed', 'Closed'),
  inviteOnly('invite_only', 'Invite only'),
  requestToJoin('request_to_join', 'Request to join');

  const BinderJoinPolicy(this.wireValue, this.label);
  final String wireValue;
  final String label;

  static BinderJoinPolicy parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? closed;
}

enum BinderContributionPolicy {
  ownerOnly('owner_only', 'Owner only'),
  membersDirect('members_direct', 'Members add directly'),
  approvalRequired('approval_required', 'Approval required');

  const BinderContributionPolicy(this.wireValue, this.label);
  final String wireValue;
  final String label;

  static BinderContributionPolicy parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? ownerOnly;
}

enum BinderLifecycle {
  active('active'),
  archived('archived'),
  deletedTombstone('deleted_tombstone');

  const BinderLifecycle(this.wireValue);
  final String wireValue;

  static BinderLifecycle parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? active;
}

enum BinderModerationState {
  clear('clear'),
  forcedUnlisted('forced_unlisted'),
  frozen('frozen'),
  removed('removed');

  const BinderModerationState(this.wireValue);
  final String wireValue;

  static BinderModerationState parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? clear;
}

enum BinderMembershipState {
  active('active'),
  left('left'),
  removed('removed'),
  suspended('suspended');

  const BinderMembershipState(this.wireValue);
  final String wireValue;

  static BinderMembershipState parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? active;
}

enum BinderContributionState {
  pending('pending'),
  active('active'),
  withdrawn('withdrawn'),
  removed('removed'),
  rejected('rejected'),
  invalidated('invalidated');

  const BinderContributionState(this.wireValue);
  final String wireValue;

  bool get isLive => this == pending || this == active;

  static BinderContributionState parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? pending;
}

enum BinderInvitationState {
  pending('pending'),
  accepted('accepted'),
  declined('declined'),
  revoked('revoked'),
  expired('expired');

  const BinderInvitationState(this.wireValue);
  final String wireValue;

  static BinderInvitationState parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? pending;
}

enum BinderJoinRequestState {
  pending('pending'),
  approved('approved'),
  rejected('rejected'),
  withdrawn('withdrawn');

  const BinderJoinRequestState(this.wireValue);
  final String wireValue;

  static BinderJoinRequestState parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? pending;
}

enum BinderConsentScope {
  none('none', 'Only Binder members'),
  link('link', 'View-only links'),
  public('public', 'Public');

  const BinderConsentScope(this.wireValue, this.label);
  final String wireValue;
  final String label;

  static BinderConsentScope parse(Object? value) =>
      _enumByWire(values, value, (item) => item.wireValue) ?? none;
}

enum BinderChecklistFilter {
  all('all', 'All'),
  inBinder('in_binder', 'In Binder'),
  missing('missing', 'Missing'),
  inYourVault('in_your_vault', 'In your Vault'),
  contributedByYou('contributed_by_you', 'Contributed by you'),
  needsReview('needs_review', 'Needs finish/review');

  const BinderChecklistFilter(this.wireValue, this.label);
  final String wireValue;
  final String label;
}

enum BinderReportSurface {
  binder('binder'),
  contribution('binder_contribution'),
  member('binder_member'),
  invitation('binder_invitation');

  const BinderReportSurface(this.wireValue);
  final String wireValue;
}

enum BinderReportReason {
  spam('spam', 'Spam'),
  harassment('harassment', 'Harassment'),
  scam('scam', 'Scam or fraud'),
  inappropriate('inappropriate', 'Inappropriate content'),
  other('other', 'Other');

  const BinderReportReason(this.wireValue, this.label);
  final String wireValue;
  final String label;
}

enum BinderExternalAudience { public, viewLink, template }

String binderDeleteConfirmation(String title) => 'DELETE ${title.trim()}';

class BinderPermissions {
  const BinderPermissions({
    this.canAddCopy = false,
    this.canInvite = false,
    this.canApprove = false,
    this.canManageMembers = false,
    this.canEdit = false,
    this.canManagePolicy = false,
    this.canTransfer = false,
    this.canArchive = false,
    this.canLeave = false,
    this.canShare = false,
    this.canReport = false,
    this.canBlockOwner = false,
  });

  factory BinderPermissions.fromJson(Map<String, dynamic> json) {
    return BinderPermissions(
      canAddCopy: _bool(json['can_add_copy']),
      canInvite: _bool(json['can_invite']),
      canApprove: _bool(json['can_approve']),
      canManageMembers: _bool(json['can_manage_members']),
      canEdit: _bool(json['can_edit']),
      canManagePolicy: _bool(json['can_manage_policy']),
      canTransfer: _bool(json['can_transfer']),
      canArchive: _bool(json['can_archive']),
      canLeave: _bool(json['can_leave']),
      canShare: _bool(json['can_share']),
      canReport: _bool(json['can_report']),
      canBlockOwner: _bool(json['can_block_owner']),
    );
  }

  final bool canAddCopy;
  final bool canInvite;
  final bool canApprove;
  final bool canManageMembers;
  final bool canEdit;
  final bool canManagePolicy;
  final bool canTransfer;
  final bool canArchive;
  final bool canLeave;
  final bool canShare;
  final bool canReport;
  final bool canBlockOwner;
}

class BinderSummary {
  const BinderSummary({
    required this.id,
    required this.publicId,
    required this.title,
    required this.targetKind,
    required this.checklistMode,
    required this.completedSlots,
    required this.totalSlots,
    required this.role,
    required this.readAccess,
    required this.discoverability,
    required this.joinPolicy,
    required this.contributionPolicy,
    required this.lifecycle,
    required this.moderationState,
    this.description = '',
    this.targetLabel = '',
    this.progressUnit,
    this.targetId,
    this.targetKey,
    this.coverImageUrl,
    this.memberCount = 1,
    this.pendingApprovalCount = 0,
    this.updatedAt,
    this.completedAt,
    this.isExternalProjection = false,
  });

  factory BinderSummary.fromJson(Map<String, dynamic> json) {
    final progress = _map(json['progress']);
    final membership = _map(json['membership']);
    final policy = _map(json['policy']);
    return BinderSummary(
      id: _text(json['id'] ?? json['binder_id']),
      publicId: _text(json['public_id'] ?? json['publicId']),
      title: _plainText(json['title'], maxLength: 80),
      description: _plainText(json['description'], maxLength: 1000),
      targetKind: BinderTargetKind.parse(
        json['target_kind'] ?? json['target_type'],
      ),
      targetLabel: _plainText(
        json['target_label'] ?? json['target_name'],
        maxLength: 120,
      ),
      targetId: _nullableText(
        json['target_id'] ?? json['species_id'] ?? json['set_id'],
      ),
      targetKey: _nullableText(
        json['target_key'] ??
            json['species_slug'] ??
            json['set_code'] ??
            json['target_id'],
      ),
      checklistMode: BinderChecklistMode.parse(json['checklist_mode']),
      completedSlots: _int(
        progress['completed_slots'] ??
            json['completed_slots'] ??
            json['satisfied_slot_count'],
      ),
      totalSlots: _int(
        progress['total_slots'] ?? json['total_slots'] ?? json['slot_count'],
      ),
      progressUnit: _nullablePlainText(
        progress['unit'] ?? json['progress_unit'],
        maxLength: 60,
      ),
      memberCount: _int(json['member_count'], fallback: 1),
      pendingApprovalCount: _int(
        json['pending_approval_count'] ?? json['pending_count'],
      ),
      role: BinderRole.parse(membership['role'] ?? json['viewer_role']),
      readAccess: BinderReadAccess.parse(
        policy['read_access'] ?? json['read_access'],
      ),
      discoverability: BinderDiscoverability.parse(
        policy['discoverability'] ?? json['discoverability'],
      ),
      joinPolicy: BinderJoinPolicy.parse(
        policy['join_policy'] ?? json['join_policy'],
      ),
      contributionPolicy: BinderContributionPolicy.parse(
        policy['contribution_policy'] ?? json['contribution_policy'],
      ),
      lifecycle: BinderLifecycle.parse(json['lifecycle']),
      moderationState: BinderModerationState.parse(json['moderation_state']),
      coverImageUrl: _nullableText(
        json['cover_image_url'] ?? json['cover_url'],
      ),
      updatedAt: _date(json['updated_at']),
      completedAt: _date(json['completed_at']),
      isExternalProjection: _bool(json['is_external_projection']),
    );
  }

  /// Parses one moderated, listed public Explore row without sharing the
  /// member-summary parser. Invalid visibility, moderation, or identity rows
  /// are discarded rather than defaulted into a visible card.
  static BinderSummary? tryFromExternalExploreJson(Map<String, dynamic> json) {
    return _binderSummaryFromExternalExploreJson(json);
  }

  /// Explore responses are untrusted transport data even though the RPC is
  /// sanitized. Parse at most one server page and drop malformed rows.
  static List<BinderSummary> externalExploreItems(Object? value) {
    return _maps(value)
        .take(20)
        .map(_binderSummaryFromExternalExploreJson)
        .whereType<BinderSummary>()
        .toList(growable: false);
  }

  final String id;
  final String publicId;
  final String title;
  final String description;
  final BinderTargetKind targetKind;
  final String targetLabel;
  final String? progressUnit;
  final String? targetId;
  final String? targetKey;
  final BinderChecklistMode checklistMode;
  final int completedSlots;
  final int totalSlots;
  final int memberCount;
  final int pendingApprovalCount;
  final BinderRole role;
  final BinderReadAccess readAccess;
  final BinderDiscoverability discoverability;
  final BinderJoinPolicy joinPolicy;
  final BinderContributionPolicy contributionPolicy;
  final BinderLifecycle lifecycle;
  final BinderModerationState moderationState;
  final String? coverImageUrl;
  final DateTime? updatedAt;
  final DateTime? completedAt;
  final bool isExternalProjection;

  int get completionPercent {
    if (totalSlots <= 0) return 0;
    return ((completedSlots.clamp(0, totalSlots) / totalSlots) * 100)
        .round()
        .clamp(0, 100);
  }

  bool get isComplete => totalSlots > 0 && completedSlots >= totalSlots;
  bool get isArchived => lifecycle == BinderLifecycle.archived;
  bool get isCommunity =>
      readAccess == BinderReadAccess.public &&
      discoverability == BinderDiscoverability.listed &&
      joinPolicy == BinderJoinPolicy.requestToJoin &&
      contributionPolicy == BinderContributionPolicy.approvalRequired;
  String get effectiveProgressUnit => switch ((progressUnit ?? '').trim()) {
    'card_prints' => 'card prints',
    'finish_options' => 'finish options',
    'custom_slots' => 'custom slots',
    final value when value.isNotEmpty => value,
    _ => checklistMode.progressUnit,
  };
  String get progressLabel =>
      '${completedSlots.clamp(0, totalSlots < 0 ? 0 : totalSlots)} of '
      '${totalSlots < 0 ? 0 : totalSlots} $effectiveProgressUnit';

  Map<String, dynamic> toCacheJson() => <String, dynamic>{
    'id': id,
    'public_id': publicId,
    'title': title,
    'description': description,
    'target_kind': targetKind.wireValue,
    'target_label': targetLabel,
    'progress_unit': progressUnit,
    'target_id': targetId,
    'target_key': targetKey,
    'checklist_mode': checklistMode.wireValue,
    'completed_slots': completedSlots,
    'total_slots': totalSlots,
    'member_count': memberCount,
    'pending_approval_count': pendingApprovalCount,
    'viewer_role': role.wireValue,
    'read_access': readAccess.wireValue,
    'discoverability': discoverability.wireValue,
    'join_policy': joinPolicy.wireValue,
    'contribution_policy': contributionPolicy.wireValue,
    'lifecycle': lifecycle.wireValue,
    'moderation_state': moderationState.wireValue,
    'cover_image_url': coverImageUrl,
    'updated_at': updatedAt?.toIso8601String(),
    'completed_at': completedAt?.toIso8601String(),
    'is_external_projection': isExternalProjection,
  };
}

class BinderLibraryPage {
  const BinderLibraryPage({
    required this.binders,
    this.invitations = const <BinderInvitation>[],
    this.suspendedBinders = const <BinderSuspendedAccess>[],
    this.legacyCandidates = const <BinderLegacyCandidate>[],
    this.nextCursor,
    this.invitationNextCursor,
    this.suspendedNextCursor,
    this.hasMore = false,
    this.invitationsHaveMore = false,
    this.suspendedHaveMore = false,
    this.loadedAt,
  });

  factory BinderLibraryPage.fromJson(Map<String, dynamic> json) {
    return BinderLibraryPage(
      binders: _maps(json['binders'] ?? json['items'])
          .map(BinderSummary.fromJson)
          .where((binder) => binder.id.isNotEmpty)
          .toList(growable: false),
      invitations: _maps(json['invitations'])
          .map(BinderInvitation.fromMemberReadJson)
          .where((invitation) => invitation.id.isNotEmpty)
          .toList(growable: false),
      suspendedBinders: _maps(
        json['suspended_binders'],
      ).map(BinderSuspendedAccess.fromJson).toList(growable: false),
      legacyCandidates: _maps(
        json['legacy_candidates'],
      ).map(BinderLegacyCandidate.fromJson).toList(growable: false),
      nextCursor: BinderCursor.fromJsonOrNull(json['next_cursor']),
      invitationNextCursor: BinderCursor.fromJsonOrNull(
        json['invitation_next_cursor'],
      ),
      suspendedNextCursor: BinderCursor.fromJsonOrNull(
        json['suspended_next_cursor'],
      ),
      hasMore: _bool(json['has_more']),
      invitationsHaveMore: _bool(json['invitations_have_more']),
      suspendedHaveMore: _bool(json['suspended_have_more']),
      loadedAt: _date(json['loaded_at']) ?? DateTime.now().toUtc(),
    );
  }

  final List<BinderSummary> binders;
  final List<BinderInvitation> invitations;
  final List<BinderSuspendedAccess> suspendedBinders;
  final List<BinderLegacyCandidate> legacyCandidates;
  final BinderCursor? nextCursor;
  final BinderCursor? invitationNextCursor;
  final BinderCursor? suspendedNextCursor;
  final bool hasMore;
  final bool invitationsHaveMore;
  final bool suspendedHaveMore;
  final DateTime? loadedAt;

  List<BinderSummary> get continueBuilding => binders
      .where(
        (item) =>
            !item.isArchived &&
            !item.isComplete &&
            item.role == BinderRole.owner,
      )
      .toList(growable: false);
  List<BinderSummary> get sharedWithMe => binders
      .where(
        (item) =>
            !item.isArchived &&
            !item.isComplete &&
            item.role != BinderRole.owner,
      )
      .toList(growable: false);
  List<BinderSummary> get completed => binders
      .where((item) => !item.isArchived && item.isComplete)
      .toList(growable: false);
  List<BinderSummary> get archived =>
      binders.where((item) => item.isArchived).toList(growable: false);

  String encodeForCache() => jsonEncode(<String, dynamic>{
    'binders': binders.map((item) => item.toCacheJson()).toList(),
    'loaded_at': loadedAt?.toIso8601String(),
  });

  static BinderLibraryPage? decodeCache(String value) {
    try {
      return BinderLibraryPage.fromJson(
        Map<String, dynamic>.from(jsonDecode(value) as Map),
      );
    } catch (_) {
      return null;
    }
  }
}

class BinderCursor {
  const BinderCursor({
    this.id,
    this.updatedAt,
    this.createdAt,
    this.requestedAt,
    this.position,
    this.memberId,
    this.instanceId,
  });

  factory BinderCursor.fromJson(Map<String, dynamic> json) {
    return BinderCursor(
      id: _nullableText(json['id']),
      updatedAt: _date(json['updated_at']),
      createdAt: _date(json['created_at']),
      requestedAt: _date(json['requested_at']),
      position: _nullableInt(json['position'] ?? json['next_position']),
      memberId: _nullableText(json['member_id']),
      instanceId: _nullableText(json['instance_id']),
    );
  }

  static BinderCursor? fromJsonOrNull(Object? value) {
    if (value is num) return BinderCursor(position: value.toInt());
    final json = _map(value);
    if (json.isEmpty) return null;
    final cursor = BinderCursor.fromJson(json);
    return cursor.isEmpty ? null : cursor;
  }

  /// Public Explore and Template cursors contain only a timestamp plus an
  /// opaque UUID tie-breaker. Never let a cursor payload populate member,
  /// instance, or other member-read cursor fields.
  static BinderCursor? fromExternalCreatedCursor(Object? value) {
    final json = _map(value);
    final id = _externalUuid(json['id']);
    final createdAt = _externalDate(json['created_at']);
    if (id == null || createdAt == null) return null;
    return BinderCursor(id: id, createdAt: createdAt);
  }

  final String? id;
  final DateTime? updatedAt;
  final DateTime? createdAt;
  final DateTime? requestedAt;
  final int? position;
  final String? memberId;
  final String? instanceId;

  bool get isEmpty =>
      id == null &&
      updatedAt == null &&
      createdAt == null &&
      requestedAt == null &&
      position == null &&
      memberId == null &&
      instanceId == null;
}

class BinderDetail {
  const BinderDetail({
    required this.summary,
    required this.permissions,
    this.alias,
    this.membershipState = BinderMembershipState.active,
    this.membershipEpoch = 1,
    this.contentConsent = BinderConsentScope.none,
    this.identityConsent = BinderConsentScope.none,
    this.externalProjectionRevision = 0,
    this.definitionRevision = 1,
    this.coverCardPrintId,
    this.externalCompletedSlots = 0,
    this.externalTotalSlots = 0,
    this.externalProgressUnit = 'card_prints',
    this.pendingJoinRequestCount = 0,
    this.notificationPreference = 'digest',
    this.contentConsentRevision,
    this.identityConsentRevision,
    this.pendingJoinRequest,
    this.joinRequestState,
    this.canRequestToJoin = false,
    this.viewLinks = const <BinderViewLink>[],
    this.pendingJoinRequests = const <BinderJoinRequest>[],
    this.pendingInvitations = const <BinderInvitation>[],
    this.ownerTransferOffer,
    this.externalChecklist = const BinderChecklistPage(
      items: <BinderChecklistItem>[],
    ),
    this.lastAuthorizedAt,
  });

  factory BinderDetail.fromJson(Map<String, dynamic> json) {
    final summaryJson = <String, dynamic>{..._map(json['binder'])};
    final membership = _map(json['membership']);
    final viewer = _map(json['viewer']);
    final consent = _map(json['consent']);
    final rootProgress = _map(json['progress']);
    final externalProgress = _map(rootProgress['external']);
    final selectedProgress =
        _bool(summaryJson['is_external_projection']) &&
            _map(rootProgress['external']).isNotEmpty
        ? _map(rootProgress['external'])
        : _map(rootProgress['member']).isNotEmpty
        ? _map(rootProgress['member'])
        : rootProgress;
    if (_map(summaryJson['progress']).isEmpty && selectedProgress.isNotEmpty) {
      summaryJson['progress'] = selectedProgress;
    }
    final memberSummary = _map(json['member_summary']);
    summaryJson['member_count'] ??=
        memberSummary['member_count'] ?? memberSummary['contributor_count'];
    summaryJson['pending_approval_count'] ??=
        memberSummary['pending_contribution_count'];
    final pendingJoinJson = _map(json['pending_join_request']);
    final joinRequestId = _text(
      viewer['join_request_id'] ?? viewer['request_id'],
    );
    final joinRequestStateRaw = _text(
      viewer['join_request_status'] ?? pendingJoinJson['state'],
    ).toLowerCase();
    final joinRequestState =
        joinRequestStateRaw.isEmpty || joinRequestStateRaw == 'none'
        ? null
        : BinderJoinRequestState.parse(joinRequestStateRaw);
    return BinderDetail(
      summary: BinderSummary.fromJson(summaryJson.isEmpty ? json : summaryJson),
      permissions: BinderPermissions.fromJson(_map(json['permissions'])),
      alias: _nullableText(membership['alias'] ?? json['member_alias']),
      membershipState: BinderMembershipState.parse(
        membership['state'] ?? json['membership_state'],
      ),
      membershipEpoch: _int(
        membership['epoch'] ?? json['membership_epoch'],
        fallback: 1,
      ),
      contentConsent: BinderConsentScope.parse(
        consent['content_scope'] ?? json['content_consent_scope'],
      ),
      identityConsent: BinderConsentScope.parse(
        consent['identity_scope'] ?? json['identity_consent_scope'],
      ),
      externalProjectionRevision: _int(
        json['external_projection_revision'] ??
            summaryJson['external_projection_revision'],
      ),
      definitionRevision: _int(
        json['definition_revision'] ?? summaryJson['definition_revision'],
        fallback: 1,
      ),
      coverCardPrintId: _nullableText(
        summaryJson['cover_card_print_id'] ?? json['cover_card_print_id'],
      ),
      externalCompletedSlots: _int(
        externalProgress['completed_slots'] ??
            externalProgress['satisfied_slots'] ??
            selectedProgress['completed_slots'],
      ),
      externalTotalSlots: _int(
        externalProgress['total_slots'] ?? selectedProgress['total_slots'],
      ),
      externalProgressUnit: _plainText(
        externalProgress['unit'] ??
            selectedProgress['unit'] ??
            summaryJson['progress_unit'] ??
            'card_prints',
        maxLength: 60,
      ),
      pendingJoinRequestCount: _int(
        memberSummary['pending_join_request_count'],
      ),
      notificationPreference: _plainText(
        membership['notification_preference'] ??
            consent['notification_preference'] ??
            json['notification_preference'] ??
            'digest',
        maxLength: 40,
      ),
      contentConsentRevision: _nullableInt(
        consent['content_revision'] ?? json['content_consent_revision'],
      ),
      identityConsentRevision: _nullableInt(
        consent['identity_revision'] ?? json['identity_consent_revision'],
      ),
      pendingJoinRequest: pendingJoinJson.isNotEmpty
          ? BinderJoinRequest.fromJson(pendingJoinJson)
          : joinRequestId.isNotEmpty &&
                joinRequestState == BinderJoinRequestState.pending
          ? BinderJoinRequest(
              id: joinRequestId,
              state: BinderJoinRequestState.pending,
              requestedRole: BinderRole.contributor,
            )
          : null,
      joinRequestState: joinRequestState,
      canRequestToJoin: _bool(viewer['can_request_to_join']),
      viewLinks: _maps(json['view_links'])
          .map(BinderViewLink.fromMemberReadJson)
          .where((link) => link.id.isNotEmpty)
          .toList(growable: false),
      pendingJoinRequests: _maps(
        json['join_requests'],
      ).map(BinderJoinRequest.fromJson).toList(growable: false),
      pendingInvitations: _maps(json['invitations'])
          .map(BinderInvitation.fromMemberReadJson)
          .where((invitation) => invitation.id.isNotEmpty)
          .toList(growable: false),
      ownerTransferOffer:
          _map(
            json['owner_transfer_offer'] ?? json['pending_owner_transfer'],
          ).isEmpty
          ? null
          : BinderOwnerTransferOffer.fromJson(
              _map(
                json['owner_transfer_offer'] ?? json['pending_owner_transfer'],
              ),
            ),
      externalChecklist: BinderChecklistPage.fromJson(
        _map(json['checklist']).isEmpty
            ? <String, dynamic>{'items': json['checklist_items']}
            : _map(json['checklist']),
      ),
      lastAuthorizedAt: _date(json['authorized_at']) ?? DateTime.now().toUtc(),
    );
  }

  /// Parses a public or capability-link response through a mobile-side
  /// allow-list. External responses must never be passed through the member
  /// detail parser above: doing so would let a future RPC field addition flow
  /// into membership, consent, queue, or ownership-transfer state.
  factory BinderDetail.fromExternalJson(
    Map<String, dynamic> json, {
    required BinderExternalAudience audience,
    bool authenticatedViewer = false,
  }) {
    return _binderDetailFromExternalJson(
      json,
      audience: audience,
      authenticatedViewer: authenticatedViewer,
    );
  }

  final BinderSummary summary;
  final BinderPermissions permissions;
  final String? alias;
  final BinderMembershipState membershipState;
  final int membershipEpoch;
  final BinderConsentScope contentConsent;
  final BinderConsentScope identityConsent;
  final int externalProjectionRevision;
  final int definitionRevision;
  final String? coverCardPrintId;
  final int externalCompletedSlots;
  final int externalTotalSlots;
  final String externalProgressUnit;
  final int pendingJoinRequestCount;
  final String notificationPreference;
  final int? contentConsentRevision;
  final int? identityConsentRevision;
  final BinderJoinRequest? pendingJoinRequest;
  final BinderJoinRequestState? joinRequestState;
  final bool canRequestToJoin;
  final List<BinderViewLink> viewLinks;
  final List<BinderJoinRequest> pendingJoinRequests;
  final List<BinderInvitation> pendingInvitations;
  final BinderOwnerTransferOffer? ownerTransferOffer;
  final BinderChecklistPage externalChecklist;
  final DateTime? lastAuthorizedAt;

  bool get requiresContentConsent =>
      summary.readAccess != BinderReadAccess.private &&
      (contentConsent == BinderConsentScope.none ||
          contentConsentRevision != externalProjectionRevision);

  bool get requiresIdentityConsent =>
      summary.readAccess != BinderReadAccess.private &&
      (identityConsent == BinderConsentScope.none ||
          identityConsentRevision != externalProjectionRevision);

  bool get requiresConsentReview =>
      requiresContentConsent || requiresIdentityConsent;

  int get externalCompletionPercent {
    if (externalTotalSlots <= 0) return 0;
    return ((externalCompletedSlots.clamp(0, externalTotalSlots) /
                externalTotalSlots) *
            100)
        .round()
        .clamp(0, 100);
  }
}

class BinderOwnerTransferOffer {
  const BinderOwnerTransferOffer({
    required this.id,
    required this.targetMemberId,
    required this.formerOwnerDisposition,
    this.isTargetViewer = false,
    this.expiresAt,
  });

  factory BinderOwnerTransferOffer.fromJson(Map<String, dynamic> json) {
    return BinderOwnerTransferOffer(
      id: _text(json['id'] ?? json['offer_id']),
      targetMemberId: _text(json['target_member_id']),
      formerOwnerDisposition: BinderOwnerTransferDisposition.parse(
        json['former_owner_role'],
      ),
      isTargetViewer: _bool(json['is_target_viewer']),
      expiresAt: _date(json['expires_at']),
    );
  }

  final String id;
  final String targetMemberId;
  final BinderOwnerTransferDisposition formerOwnerDisposition;
  final bool isTargetViewer;
  final DateTime? expiresAt;
}

class BinderChecklistItem {
  const BinderChecklistItem({
    required this.slotId,
    required this.cardPrintId,
    required this.name,
    required this.requiredQuantity,
    required this.activeQuantity,
    this.cardPrintingId,
    this.gvId,
    this.setLabel,
    this.number,
    this.finishLabel,
    this.imageUrl,
    this.hasHostedImage = false,
    this.ownedEligibleCount = 0,
    this.contributedByYouCount = 0,
    this.pendingCount = 0,
    this.contributions = const <BinderContributionReference>[],
    this.contributionsHaveMore = false,
    this.publicContributionActions = const <BinderPublicContributionAction>[],
    this.publicContributionActionsHaveMore = false,
    this.contributionIds = const <String>[],
    this.pendingContributionIds = const <String>[],
    this.ownContributionIds = const <String>[],
    this.removableContributionIds = const <String>[],
    this.attributionLabels = const <String>[],
    this.needsReview = false,
  });

  factory BinderChecklistItem.fromJson(Map<String, dynamic> json) {
    final card = _map(json['card']);
    final contributionRows = _maps(json['contributions']);
    List<String> contributionRowIdsWhere(
      bool Function(Map<String, dynamic> row) include,
    ) {
      return contributionRows
          .where(include)
          .map((row) => _text(row['contribution_id'] ?? row['id']))
          .where((id) => id.isNotEmpty)
          .toList(growable: false);
    }

    List<String> uniqueIds(Iterable<String> ids) {
      return ids.where((id) => id.isNotEmpty).toSet().toList(growable: false);
    }

    return BinderChecklistItem(
      slotId: _text(json['slot_id'] ?? json['id']),
      cardPrintId: _text(
        json['card_print_id'] ?? card['card_print_id'] ?? card['id'],
      ),
      cardPrintingId: _nullableText(
        json['card_printing_id'] ?? card['card_printing_id'],
      ),
      gvId: _nullableText(json['gv_id'] ?? card['gv_id']),
      name: _plainText(json['name'] ?? card['name'], maxLength: 160),
      setLabel: _nullablePlainText(
        json['set_label'] ?? card['set_name'] ?? card['set_code'],
        maxLength: 120,
      ),
      number: _nullablePlainText(
        json['number'] ?? card['number'],
        maxLength: 40,
      ),
      finishLabel: _nullablePlainText(
        json['finish_label'] ?? card['finish_name'],
        maxLength: 100,
      ),
      imageUrl: _nullableText(
        json['image_url'] ?? card['hosted_image_url'] ?? card['image_url'],
      ),
      hasHostedImage: _bool(json['hosted_image'] ?? card['hosted_image']),
      requiredQuantity: _int(json['required_quantity'], fallback: 1),
      activeQuantity: _int(
        json['active_quantity'] ?? json['contributed_quantity'],
      ),
      ownedEligibleCount: _int(json['owned_eligible_count']),
      contributedByYouCount: _int(json['contributed_by_you_count']),
      pendingCount: _int(json['pending_count']),
      contributions: contributionRows
          .map(BinderContributionReference.fromJson)
          .where((item) => item.contributionId.isNotEmpty)
          .toList(growable: false),
      contributionsHaveMore: _bool(json['contributions_has_more']),
      publicContributionActions: _maps(json['contribution_actions'])
          .map(BinderPublicContributionAction.fromJson)
          .where((item) => item.hasAnyAction)
          .toList(growable: false),
      publicContributionActionsHaveMore: _bool(
        json['contribution_actions_has_more'],
      ),
      contributionIds: uniqueIds(<String>[
        ..._strings(json['contribution_ids']),
        ...contributionRowIdsWhere((row) => true),
      ]),
      pendingContributionIds: uniqueIds(<String>[
        ..._strings(json['pending_contribution_ids']),
        ...contributionRowIdsWhere(
          (row) =>
              _bool(row['can_decide']) ||
              _text(row['status']).toLowerCase() == 'pending',
        ),
      ]),
      ownContributionIds: uniqueIds(<String>[
        ..._strings(json['own_contribution_ids']),
        ...contributionRowIdsWhere(
          (row) => _bool(row['can_withdraw']) || _bool(row['is_own']),
        ),
      ]),
      removableContributionIds: uniqueIds(<String>[
        ..._strings(json['removable_contribution_ids']),
        ...contributionRowIdsWhere((row) => _bool(row['can_remove'])),
      ]),
      attributionLabels: _strings(json['attribution_labels']),
      needsReview: _bool(json['needs_review']),
    );
  }

  final String slotId;
  final String cardPrintId;
  final String? cardPrintingId;
  final String? gvId;
  final String name;
  final String? setLabel;
  final String? number;
  final String? finishLabel;
  final String? imageUrl;
  final bool hasHostedImage;
  final int requiredQuantity;
  final int activeQuantity;
  final int ownedEligibleCount;
  final int contributedByYouCount;
  final int pendingCount;
  final List<BinderContributionReference> contributions;
  final bool contributionsHaveMore;
  final List<BinderPublicContributionAction> publicContributionActions;
  final bool publicContributionActionsHaveMore;
  final List<String> contributionIds;
  final List<String> pendingContributionIds;
  final List<String> ownContributionIds;
  final List<String> removableContributionIds;
  final List<String> attributionLabels;
  final bool needsReview;

  bool get isSatisfied =>
      requiredQuantity > 0 && activeQuantity >= requiredQuantity;
  bool get hasEligibleCopy => ownedEligibleCount > 0;
}

class BinderChecklistPage {
  const BinderChecklistPage({
    required this.items,
    this.nextCursor,
    this.hasMore = false,
    this.memberCompletedSlots,
    this.externalCompletedSlots,
  });

  factory BinderChecklistPage.fromJson(Map<String, dynamic> json) {
    return BinderChecklistPage(
      items: _maps(
        json['items'] ?? json['slots'],
      ).map(BinderChecklistItem.fromJson).toList(growable: false),
      nextCursor:
          BinderCursor.fromJsonOrNull(json['next_cursor']) ??
          BinderCursor.fromJsonOrNull(json['next_position']),
      hasMore:
          _bool(json['has_more']) ||
          json['next_cursor'] != null ||
          json['next_position'] != null,
      memberCompletedSlots: _nullableInt(json['member_completed_slots']),
      externalCompletedSlots: _nullableInt(json['external_completed_slots']),
    );
  }

  /// Parses only the canonical, public-safe checklist projection. The
  /// resulting model contains no Vault-copy, contribution-authority, member,
  /// or member-progress state.
  factory BinderChecklistPage.fromExternalJson(
    Map<String, dynamic> json, {
    required BinderExternalAudience audience,
    bool authenticatedViewer = false,
  }) {
    return _binderChecklistPageFromExternalJson(
      json,
      audience: audience,
      authenticatedViewer: authenticatedViewer,
    );
  }

  final List<BinderChecklistItem> items;
  final BinderCursor? nextCursor;
  final bool hasMore;
  final int? memberCompletedSlots;
  final int? externalCompletedSlots;
}

class BinderActivityEvent {
  const BinderActivityEvent({
    required this.id,
    required this.kind,
    required this.message,
    required this.createdAt,
    this.actorLabel,
    this.isSystem = false,
  });

  factory BinderActivityEvent.fromJson(Map<String, dynamic> json) {
    return BinderActivityEvent(
      id: _text(json['id']),
      kind: _text(json['kind'] ?? json['event_type']),
      message: _plainText(
        json['message'] ?? json['display_message'],
        maxLength: 300,
      ),
      actorLabel: _nullablePlainText(json['actor_label'], maxLength: 80),
      createdAt:
          _date(json['created_at']) ??
          DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      isSystem:
          _text(json['actor_kind']).toLowerCase() == 'service' ||
          _text(json['actor_kind']).toLowerCase() == 'system',
    );
  }

  final String id;
  final String kind;
  final String message;
  final String? actorLabel;
  final DateTime createdAt;
  final bool isSystem;
}

class BinderMember {
  const BinderMember({
    required this.membershipId,
    required this.role,
    required this.state,
    required this.displayLabel,
    this.isCurrentUser = false,
    this.contentConsent = BinderConsentScope.none,
    this.identityConsent = BinderConsentScope.none,
    this.joinedAt,
    this.activeContributionCount = 0,
  });

  factory BinderMember.fromJson(Map<String, dynamic> json) {
    return BinderMember(
      membershipId: _text(json['membership_id'] ?? json['id']),
      role: BinderRole.parse(json['role']),
      state: BinderMembershipState.parse(json['state']),
      displayLabel: _plainText(
        json['display_label'] ?? json['alias'] ?? 'A Binder member',
        maxLength: 80,
      ),
      isCurrentUser: _bool(json['is_current_user']),
      contentConsent: BinderConsentScope.parse(json['content_consent_scope']),
      identityConsent: BinderConsentScope.parse(json['identity_consent_scope']),
      joinedAt: _date(json['joined_at']),
      activeContributionCount: _int(json['active_contribution_count']),
    );
  }

  final String membershipId;
  final BinderRole role;
  final BinderMembershipState state;
  final String displayLabel;
  final bool isCurrentUser;
  final BinderConsentScope contentConsent;
  final BinderConsentScope identityConsent;
  final DateTime? joinedAt;
  final int activeContributionCount;
}

class BinderInvitation {
  const BinderInvitation({
    required this.id,
    required this.state,
    required this.maximumRole,
    this.binderPublicId,
    this.binderTitle,
    this.inviterLabel,
    this.expiresAt,
    this.isAccountTargeted = false,
    this.plaintextToken,
    this.privacyCopy =
        'Cards stay in each collector’s Vault. The Binder combines only the '
        'copies members choose to contribute.',
  });

  /// Safe default for authenticated dashboard/detail/inbox reads.
  ///
  /// Plaintext invitation capabilities are intentionally discarded. The only
  /// parser allowed to retain one is [BinderInvitation.fromCreateResponseJson].
  factory BinderInvitation.fromJson(Map<String, dynamic> json) {
    return BinderInvitation.fromMemberReadJson(json);
  }

  factory BinderInvitation.fromMemberReadJson(Map<String, dynamic> json) {
    final id = _externalActionUuid(json['id'] ?? json['invitation_id']);
    return BinderInvitation(
      id: id ?? '',
      state: _boundedInvitationState(json['state']),
      maximumRole: _boundedInvitationRole(json['maximum_role'] ?? json['role']),
      binderPublicId: _externalUuid(json['binder_public_id']),
      binderTitle: _externalNullablePlainText(
        json['binder_title'],
        maxLength: 80,
      ),
      inviterLabel: _externalNullablePlainText(
        json['inviter_label'],
        maxLength: 80,
      ),
      expiresAt: _externalInvitationExpiry(json['expires_at']),
      isAccountTargeted: _externalTrue(json['is_account_targeted']),
      plaintextToken: null,
    );
  }

  /// Parses the immediate invitation-creation response. This is the sole
  /// invitation parser that may retain a one-time plaintext capability.
  factory BinderInvitation.fromCreateResponseJson(Map<String, dynamic> json) {
    final id = _externalActionUuid(json['id'] ?? json['invitation_id']);
    final binderPublicId = _externalUuid(json['binder_public_id']);
    final state = _boundedInvitationState(json['state']);
    final token =
        id != null &&
            binderPublicId != null &&
            _text(json['state']).toLowerCase() == 'pending'
        ? _oneTimeCapabilityToken(json['token'] ?? json['plaintext_token'])
        : null;
    return BinderInvitation(
      id: id ?? '',
      state: state,
      maximumRole: _boundedInvitationRole(json['maximum_role'] ?? json['role']),
      binderPublicId: binderPublicId,
      binderTitle: _externalNullablePlainText(
        json['binder_title'],
        maxLength: 80,
      ),
      inviterLabel: _externalNullablePlainText(
        json['inviter_label'],
        maxLength: 80,
      ),
      expiresAt: _externalInvitationExpiry(json['expires_at']),
      isAccountTargeted: _externalTrue(json['is_account_targeted']),
      // The UI keeps this in memory long enough to show the one-time share
      // affordance. It is never accepted by a general member-read parser.
      plaintextToken: token,
    );
  }

  /// Invitation previews are read-only capability responses. Unlike an
  /// invitation-creation mutation they may never carry a plaintext token or
  /// an invitation/member authority identifier into the app model.
  factory BinderInvitation.fromPreviewJson(Map<String, dynamic> json) {
    return _binderInvitationFromPreviewJson(json);
  }

  final String id;
  final BinderInvitationState state;
  final BinderRole maximumRole;
  final String? binderPublicId;
  final String? binderTitle;
  final String? inviterLabel;
  final DateTime? expiresAt;
  final bool isAccountTargeted;
  final String? plaintextToken;
  final String privacyCopy;
}

class BinderViewLink {
  const BinderViewLink({
    required this.id,
    required this.label,
    this.expiresAt,
    this.revokedAt,
    this.plaintextToken,
    this.url,
  });

  /// Safe default for authenticated Binder-detail reads. A stored view-link
  /// row is useful for revoke/rotate controls, but never carries its original
  /// bearer capability back into the app.
  factory BinderViewLink.fromJson(Map<String, dynamic> json) {
    return BinderViewLink.fromMemberReadJson(json);
  }

  factory BinderViewLink.fromMemberReadJson(Map<String, dynamic> json) {
    final id = _externalActionUuid(json['id'] ?? json['view_link_id']);
    return BinderViewLink(
      id: id ?? '',
      label: _externalPlainText(
        json['label'],
        maxLength: 80,
        fallback: 'View-only link',
      ),
      expiresAt: _externalDate(json['expires_at']),
      revokedAt: _externalDate(json['revoked_at']),
      plaintextToken: null,
      url: null,
    );
  }

  /// Parses an immediate view-link create/rotate response. Only a strict
  /// base64url capability tied to a valid link UUID may survive this boundary.
  factory BinderViewLink.fromCreateOrRotateResponseJson(
    Map<String, dynamic> json,
  ) {
    final id = _externalActionUuid(json['id'] ?? json['view_link_id']);
    final binderPublicId = _externalUuid(json['binder_public_id']);
    final token = id != null && binderPublicId != null
        ? _oneTimeCapabilityToken(json['token'] ?? json['plaintext_token'])
        : null;
    return BinderViewLink(
      id: id ?? '',
      label: _externalPlainText(
        json['label'],
        maxLength: 80,
        fallback: 'View-only link',
      ),
      expiresAt: _externalDate(json['expires_at']),
      revokedAt: _externalDate(json['revoked_at']),
      plaintextToken: token,
      url: _oneTimeViewLinkUrl(json['url'], token: token),
    );
  }

  final String id;
  final String label;
  final DateTime? expiresAt;
  final DateTime? revokedAt;
  final String? plaintextToken;
  final String? url;

  bool get isActive =>
      revokedAt == null &&
      (expiresAt == null || expiresAt!.isAfter(DateTime.now().toUtc()));
}

class BinderEligibleCopy {
  const BinderEligibleCopy({
    required this.instanceId,
    required this.cardPrintId,
    required this.name,
    required this.eligibility,
    this.cardPrintingId,
    this.finishLabel,
    this.setLabel,
    this.number,
    this.imageUrl,
    this.contributionId,
    this.reason,
  });

  factory BinderEligibleCopy.fromJson(Map<String, dynamic> json) {
    return BinderEligibleCopy(
      instanceId: _text(json['vault_item_instance_id'] ?? json['instance_id']),
      cardPrintId: _text(json['card_print_id']),
      cardPrintingId: _nullableText(json['card_printing_id']),
      name: _plainText(json['name'], maxLength: 160),
      finishLabel: _nullablePlainText(json['finish_label'], maxLength: 100),
      setLabel: _nullablePlainText(json['set_label'], maxLength: 120),
      number: _nullablePlainText(json['number'], maxLength: 40),
      imageUrl: _nullableText(json['image_url']),
      eligibility: _text(json['eligibility'] ?? 'eligible'),
      contributionId: _nullableText(json['contribution_id']),
      reason: _nullablePlainText(
        json['reason'] ?? json['reason_label'],
        maxLength: 200,
      ),
    );
  }

  final String instanceId;
  final String cardPrintId;
  final String? cardPrintingId;
  final String name;
  final String? finishLabel;
  final String? setLabel;
  final String? number;
  final String? imageUrl;
  final String eligibility;
  final String? contributionId;
  final String? reason;

  bool get isEligible => eligibility == 'eligible';
  bool get isDuplicate => eligibility == 'duplicate';
  bool get needsReview => eligibility == 'unresolved';
}

class BinderBulkPreview {
  const BinderBulkPreview({
    required this.previewId,
    required this.eligibleCount,
    required this.duplicateCount,
    required this.unresolvedCount,
    required this.ineligibleCount,
    this.sample = const <BinderEligibleCopy>[],
    this.expiresAt,
    this.resumeCursor,
  });

  factory BinderBulkPreview.fromJson(Map<String, dynamic> json) {
    return BinderBulkPreview(
      previewId: _text(json['preview_id']),
      eligibleCount: _int(json['eligible_count']),
      duplicateCount: _int(json['duplicate_count']),
      unresolvedCount: _int(json['unresolved_count']),
      ineligibleCount: _int(json['ineligible_count']),
      sample: _maps(
        json['sample'],
      ).map(BinderEligibleCopy.fromJson).toList(growable: false),
      expiresAt: _date(json['expires_at']),
      resumeCursor: BinderCursor.fromJsonOrNull(
        json['resume_cursor'] ?? json['next_cursor'],
      ),
    );
  }

  final String previewId;
  final int eligibleCount;
  final int duplicateCount;
  final int unresolvedCount;
  final int ineligibleCount;
  final List<BinderEligibleCopy> sample;
  final DateTime? expiresAt;
  final BinderCursor? resumeCursor;
}

class BinderJoinRequest {
  const BinderJoinRequest({
    required this.id,
    required this.state,
    required this.requestedRole,
    this.requesterLabel,
    this.createdAt,
    this.canDecide = true,
  });

  factory BinderJoinRequest.fromJson(Map<String, dynamic> json) {
    return BinderJoinRequest(
      id: _text(json['id'] ?? json['request_id']),
      state: BinderJoinRequestState.parse(json['state']),
      requestedRole: BinderRole.parse(json['requested_role'] ?? json['role']),
      requesterLabel: _nullablePlainText(
        json['requester_label'],
        maxLength: 80,
      ),
      createdAt: _date(json['requested_at'] ?? json['created_at']),
      canDecide: json.containsKey('can_decide')
          ? _bool(json['can_decide'])
          : true,
    );
  }

  final String id;
  final BinderJoinRequestState state;
  final BinderRole requestedRole;
  final String? requesterLabel;
  final DateTime? createdAt;
  final bool canDecide;
}

class BinderContributionReference {
  const BinderContributionReference({
    required this.contributionId,
    required this.state,
    this.memberId,
    this.memberLabel,
    this.isOwn = false,
    this.canWithdraw = false,
    this.canDecide = false,
    this.canRemove = false,
    this.canReport = false,
    this.canBlockMember = false,
    this.reportReference,
    this.blockReference,
  });

  factory BinderContributionReference.fromJson(Map<String, dynamic> json) {
    final actions = _map(json['actions'] ?? json['moderation_actions']);
    final reportReference = _nullableText(
      actions['report_reference'] ??
          actions['contribution_report_reference'] ??
          json['report_reference'] ??
          json['contribution_report_reference'],
    );
    final blockReference = _nullableText(
      actions['block_reference'] ??
          actions['member_block_reference'] ??
          json['block_reference'] ??
          json['member_block_reference'],
    );
    final isOwn = _bool(json['is_own']);
    final memberId = _nullableText(
      json['member_id'] ?? json['contributor_member_id'],
    );
    final contributionId = _text(
      json['contribution_id'] ?? json['contribution_public_id'] ?? json['id'],
    );
    return BinderContributionReference(
      contributionId: contributionId,
      state: BinderContributionState.parse(json['state'] ?? json['status']),
      memberId: memberId,
      memberLabel: _nullablePlainText(
        json['member_label'] ?? json['contributor_label'],
        maxLength: 80,
      ),
      isOwn: isOwn,
      canWithdraw:
          _bool(json['can_withdraw']) ||
          (isOwn &&
              BinderContributionState.parse(
                json['state'] ?? json['status'],
              ).isLive),
      canDecide: _bool(json['can_decide']),
      canRemove: _bool(json['can_remove']),
      canReport:
          _bool(actions['can_report'] ?? json['can_report']) ||
          reportReference != null ||
          (!isOwn && contributionId.isNotEmpty),
      canBlockMember:
          _bool(actions['can_block'] ?? json['can_block_member']) ||
          blockReference != null ||
          (!isOwn && memberId != null),
      reportReference: reportReference,
      blockReference: blockReference,
    );
  }

  final String contributionId;
  final BinderContributionState state;
  final String? memberId;
  final String? memberLabel;
  final bool isOwn;
  final bool canWithdraw;
  final bool canDecide;
  final bool canRemove;
  final bool canReport;
  final bool canBlockMember;

  /// Opaque, Binder-domain action references. External/community projections
  /// may provide these instead of any account or membership identifier.
  final String? reportReference;
  final String? blockReference;

  String? get effectiveReportReference =>
      reportReference ?? (contributionId.isEmpty ? null : contributionId);
  String? get effectiveBlockReference => blockReference ?? memberId;
}

class BinderPublicContributionAction {
  const BinderPublicContributionAction({
    this.contributionActionReference,
    this.memberActionReference,
    this.alias,
    this.identityVisible = false,
    this.canReport = false,
    this.canBlock = false,
  });

  factory BinderPublicContributionAction.fromJson(Map<String, dynamic> json) {
    final permissions = _map(json['permissions']);
    return BinderPublicContributionAction(
      contributionActionReference: _nullableText(
        json['contribution_action_ref'],
      ),
      memberActionReference: _nullableText(json['member_action_ref']),
      alias: _nullablePlainText(json['alias'], maxLength: 80),
      identityVisible: _bool(json['identity_visible']),
      canReport: _bool(permissions['can_report']),
      canBlock: _bool(permissions['can_block']),
    );
  }

  /// Opaque, server-revalidated Binder-domain references. These are
  /// intentionally not user, Vault, membership, contribution-authority, or
  /// GVVI identifiers.
  final String? contributionActionReference;
  final String? memberActionReference;
  final String? alias;
  final bool identityVisible;
  final bool canReport;
  final bool canBlock;

  bool get hasAnyAction =>
      (canReport &&
          (contributionActionReference != null ||
              memberActionReference != null)) ||
      (canBlock && memberActionReference != null);
}

class BinderPendingContribution {
  const BinderPendingContribution({
    required this.reference,
    required this.name,
    this.imageUrl,
    this.setLabel,
    this.number,
    this.finishLabel,
    this.createdAt,
  });

  factory BinderPendingContribution.fromJson(Map<String, dynamic> json) {
    final card = _map(json['card']);
    return BinderPendingContribution(
      reference: BinderContributionReference.fromJson(json),
      name: _plainText(
        json['title'] ?? json['name'] ?? card['name'],
        maxLength: 160,
      ),
      imageUrl: _nullableText(
        json['image_url'] ?? card['hosted_image_url'] ?? card['image_url'],
      ),
      setLabel: _nullablePlainText(
        json['set_label'] ?? card['set_name'] ?? card['set_code'],
        maxLength: 120,
      ),
      number: _nullablePlainText(
        json['number'] ?? card['number'],
        maxLength: 40,
      ),
      finishLabel: _nullablePlainText(
        json['finish_label'] ?? card['finish_label'],
        maxLength: 100,
      ),
      createdAt: _date(json['created_at']),
    );
  }

  final BinderContributionReference reference;
  final String name;
  final String? imageUrl;
  final String? setLabel;
  final String? number;
  final String? finishLabel;
  final DateTime? createdAt;
}

class BinderSuspendedAccess {
  const BinderSuspendedAccess({
    required this.publicId,
    this.canLeave = true,
    this.canReport = true,
  });

  factory BinderSuspendedAccess.fromJson(Map<String, dynamic> json) {
    final permissions = _map(json['permissions']);
    return BinderSuspendedAccess(
      publicId: _text(json['public_id'] ?? json['id']),
      canLeave: permissions.containsKey('can_leave')
          ? _bool(permissions['can_leave'])
          : true,
      canReport: permissions.containsKey('can_report')
          ? _bool(permissions['can_report'])
          : true,
    );
  }

  final String publicId;
  final bool canLeave;
  final bool canReport;
}

class BinderPulseShareResult {
  const BinderPulseShareResult({
    required this.publicId,
    required this.threshold,
    required this.completedSlots,
    required this.totalSlots,
    required this.unit,
    required this.percent,
    required this.alreadyShared,
  });

  factory BinderPulseShareResult.fromJson(Map<String, dynamic> json) {
    return BinderPulseShareResult(
      publicId: _text(json['binder_public_id']),
      threshold: _int(json['threshold']),
      completedSlots: _int(json['completed_slots']),
      totalSlots: _int(json['total_slots']),
      unit: _plainText(json['unit'] ?? 'card_prints', maxLength: 60),
      percent: _int(json['percent']).clamp(0, 100),
      alreadyShared: _bool(json['already_shared']),
    );
  }

  final String publicId;
  final int threshold;
  final int completedSlots;
  final int totalSlots;
  final String unit;
  final int percent;
  final bool alreadyShared;
}

class BinderCatalogCard {
  const BinderCatalogCard({
    required this.cardPrintId,
    required this.name,
    required this.setLabel,
    this.number,
    this.hostedImageUrl,
    this.fallbackImageUrl,
    this.preferredCardPrintingId,
  });

  final String cardPrintId;
  final String name;
  final String setLabel;
  final String? number;
  final String? hostedImageUrl;
  final String? fallbackImageUrl;
  final String? preferredCardPrintingId;
}

class BinderFinishOption {
  const BinderFinishOption({
    required this.label,
    this.cardPrintingId,
    this.finishKey,
  });

  final String label;
  final String? cardPrintingId;
  final String? finishKey;

  bool get acceptsAnyGovernedFinish => cardPrintingId == null;
}

class BinderCustomSlotDraft {
  const BinderCustomSlotDraft({
    required this.card,
    required this.finish,
    this.requiredQuantity = 1,
  });

  factory BinderCustomSlotDraft.fromChecklist(BinderChecklistItem item) {
    return BinderCustomSlotDraft(
      card: BinderCatalogCard(
        cardPrintId: item.cardPrintId,
        name: item.name,
        setLabel: item.setLabel ?? '',
        number: item.number,
        hostedImageUrl: item.imageUrl,
      ),
      finish: BinderFinishOption(
        label: item.finishLabel ?? 'Any governed finish',
        cardPrintingId: item.cardPrintingId,
      ),
      requiredQuantity: item.requiredQuantity.clamp(1, 100),
    );
  }

  final BinderCatalogCard card;
  final BinderFinishOption finish;
  final int requiredQuantity;

  String get displayKey =>
      '${card.cardPrintId}:${finish.cardPrintingId ?? 'any'}';

  BinderCustomSlotDraft copyWith({
    BinderFinishOption? finish,
    int? requiredQuantity,
  }) {
    return BinderCustomSlotDraft(
      card: card,
      finish: finish ?? this.finish,
      requiredQuantity: requiredQuantity ?? this.requiredQuantity,
    );
  }

  Map<String, dynamic> toWireJson() => <String, dynamic>{
    'card_print_id': card.cardPrintId,
    if (finish.cardPrintingId != null)
      'card_printing_id': finish.cardPrintingId,
    'required_quantity': requiredQuantity.clamp(1, 100),
  };
}

class BinderTemplate {
  const BinderTemplate({
    required this.id,
    required this.title,
    required this.targetKind,
    required this.slotCount,
    required this.version,
    this.description = '',
    this.coverImageUrl,
    this.adoptionCount,
    this.isSystem = false,
  });

  factory BinderTemplate.fromJson(Map<String, dynamic> json) {
    return BinderTemplate(
      id: _text(json['id'] ?? json['template_id']),
      title: _plainText(json['title'], maxLength: 80),
      description: _plainText(json['description'], maxLength: 1000),
      targetKind: BinderTargetKind.parse(json['target_kind']),
      slotCount: _int(json['slot_count']),
      version: _int(json['version'], fallback: 1),
      coverImageUrl: _nullableText(json['cover_image_url']),
      adoptionCount: _nullableInt(json['adoption_count']),
      isSystem: _bool(json['is_system']),
    );
  }

  /// Template catalog/detail reads use a dedicated public projection parser.
  /// The generic factory above remains for trusted internal construction.
  static BinderTemplate? tryFromExternalJson(Map<String, dynamic> json) {
    return _binderTemplateFromExternalJson(json);
  }

  static List<BinderTemplate> externalItems(Object? value) {
    return _maps(value)
        .take(20)
        .map(_binderTemplateFromExternalJson)
        .whereType<BinderTemplate>()
        .toList(growable: false);
  }

  final String id;
  final String title;
  final String description;
  final BinderTargetKind targetKind;
  final int slotCount;
  final int version;
  final String? coverImageUrl;
  final int? adoptionCount;
  final bool isSystem;
}

class BinderTargetSuggestion {
  const BinderTargetSuggestion({
    required this.id,
    required this.routeKey,
    required this.title,
    required this.kind,
    this.imageUrl,
    this.slotCount,
    this.enabled = true,
    this.disabledReason,
  });

  factory BinderTargetSuggestion.fromJson(Map<String, dynamic> json) {
    return BinderTargetSuggestion(
      id: _text(json['id'] ?? json['target_id']),
      routeKey: _text(json['route_key'] ?? json['slug'] ?? json['code']),
      title: _plainText(json['title'] ?? json['name'], maxLength: 120),
      kind: BinderTargetKind.parse(json['kind'] ?? json['target_kind']),
      imageUrl: _nullableText(json['image_url']),
      slotCount: _nullableInt(json['slot_count']),
      enabled: json.containsKey('enabled') ? _bool(json['enabled']) : true,
      disabledReason: _nullablePlainText(
        json['disabled_reason'],
        maxLength: 200,
      ),
    );
  }

  final String id;
  final String routeKey;
  final String title;
  final BinderTargetKind kind;
  final String? imageUrl;
  final int? slotCount;
  final bool enabled;
  final String? disabledReason;
}

class BinderLegacyCandidate {
  const BinderLegacyCandidate({
    required this.watchId,
    required this.targetKind,
    required this.targetId,
    required this.title,
    this.routeKey,
    this.imageUrl,
  });

  factory BinderLegacyCandidate.fromJson(Map<String, dynamic> json) {
    return BinderLegacyCandidate(
      watchId: _text(json['watch_id'] ?? json['source_watch_id']),
      targetKind: BinderTargetKind.parse(json['target_kind']),
      targetId: _text(json['target_id']),
      title: _plainText(json['title'], maxLength: 120),
      routeKey: _nullableText(json['route_key']),
      imageUrl: _nullableText(json['image_url']),
    );
  }

  final String watchId;
  final BinderTargetKind targetKind;
  final String targetId;
  final String title;
  final String? routeKey;
  final String? imageUrl;
}

class CreateBinderInput {
  const CreateBinderInput({
    required this.title,
    required this.targetKind,
    required this.targetId,
    required this.checklistMode,
    this.description = '',
    this.readAccess = BinderReadAccess.private,
    this.discoverability = BinderDiscoverability.unlisted,
    this.joinPolicy = BinderJoinPolicy.closed,
    this.contributionPolicy = BinderContributionPolicy.ownerOnly,
    this.coverReference,
    this.customSlots = const <Map<String, dynamic>>[],
  });

  final String title;
  final String description;
  final BinderTargetKind targetKind;
  final String targetId;
  final BinderChecklistMode checklistMode;
  final BinderReadAccess readAccess;
  final BinderDiscoverability discoverability;
  final BinderJoinPolicy joinPolicy;
  final BinderContributionPolicy contributionPolicy;
  final String? coverReference;
  final List<Map<String, dynamic>> customSlots;
}

final RegExp _externalUuidPattern = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);
final RegExp _externalActionUuidPattern = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-'
  r'[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);
final RegExp _externalCanonicalImagePattern = RegExp(
  r'^https://grookaivault\.com/api/canon/cards/'
  r'GV-[A-Z0-9-]{1,93}/image$',
);
final RegExp _oneTimeCapabilityTokenPattern = RegExp(
  r'^[A-Za-z0-9_-]{20,256}$',
);

BinderInvitationState _boundedInvitationState(Object? value) {
  return switch (_text(value).toLowerCase()) {
    'pending' || 'active' => BinderInvitationState.pending,
    'accepted' => BinderInvitationState.accepted,
    'declined' => BinderInvitationState.declined,
    'revoked' => BinderInvitationState.revoked,
    'expired' => BinderInvitationState.expired,
    _ => BinderInvitationState.revoked,
  };
}

BinderRole _boundedInvitationRole(Object? value) {
  return switch (_text(value).toLowerCase()) {
    'manager' => BinderRole.manager,
    'contributor' => BinderRole.contributor,
    'viewer' => BinderRole.viewer,
    _ => BinderRole.viewer,
  };
}

String? _oneTimeCapabilityToken(Object? value) {
  if (value is! String || !_oneTimeCapabilityTokenPattern.hasMatch(value)) {
    return null;
  }
  return value;
}

String? _oneTimeViewLinkUrl(Object? value, {required String? token}) {
  if (token == null || value is! String) return null;
  final expected = 'https://grookaivault.com/b/$token';
  if (value != expected) return null;
  final uri = Uri.tryParse(value);
  if (uri == null ||
      uri.scheme != 'https' ||
      uri.host != 'grookaivault.com' ||
      uri.hasPort ||
      uri.userInfo.isNotEmpty ||
      uri.query.isNotEmpty ||
      uri.fragment.isNotEmpty) {
    return null;
  }
  return value;
}

BinderInvitation _binderInvitationFromPreviewJson(Map<String, dynamic> json) {
  final invitation = _map(json['invitation']);
  final binder = _map(json['binder']);
  final rawState = _text(
    json['state'] ?? invitation['state'] ?? invitation['status'],
  ).toLowerCase();
  final state = _boundedInvitationState(rawState);
  final rawRole = _text(
    json['maximum_role'] ?? invitation['maximum_role'] ?? invitation['role'],
  ).toLowerCase();
  final role = _boundedInvitationRole(rawRole);
  final expiresAt = _externalInvitationExpiry(
    json['expires_at'] ?? invitation['expires_at'],
  );

  return BinderInvitation(
    // Preview actions continue to use the bearer capability supplied by the
    // route. No invitation row ID is required or retained.
    id: '',
    state: state,
    maximumRole: role,
    binderPublicId:
        _externalUuid(json['binder_public_id']) ??
        _externalUuid(binder['public_id']),
    binderTitle: _externalPlainText(
      json['binder_title'] ?? binder['title'],
      maxLength: 80,
      fallback: 'Shared Binder',
    ),
    inviterLabel: _externalPlainText(
      json['inviter_label'] ?? invitation['inviter_label'],
      maxLength: 40,
      fallback: 'A Binder member',
    ),
    expiresAt: expiresAt,
    isAccountTargeted: _externalTrue(json['is_account_targeted']),
    plaintextToken: null,
    privacyCopy: _externalPlainText(
      json['privacy_copy'],
      maxLength: 300,
      fallback:
          'Cards stay in each collector’s Vault. The Binder combines only '
          'the copies members choose to contribute.',
    ),
  );
}

BinderSummary? _binderSummaryFromExternalExploreJson(
  Map<String, dynamic> json,
) {
  final binder = _map(json['binder']);
  final progress = _map(json['progress']);
  final memberSummary = _map(json['member_summary']);
  final publicId = _externalUuid(json['public_id']);
  final nestedPublicId = _externalUuid(binder['public_id']);
  final targetKind = _externalTargetKindOrNull(
    json['target_kind'] ?? binder['target_kind'],
  );
  final checklistMode = _externalChecklistModeOrNull(
    json['checklist_mode'] ?? binder['checklist_mode'],
  );

  if (publicId == null ||
      nestedPublicId != publicId ||
      targetKind == null ||
      checklistMode == null ||
      _text(json['read_access']).toLowerCase() != 'public' ||
      _text(json['discoverability']).toLowerCase() != 'listed' ||
      _text(json['lifecycle']).toLowerCase() != 'active' ||
      _text(json['moderation_state']).toLowerCase() != 'clear' ||
      !_externalTrue(binder['moderated']) ||
      _text(binder['discoverability']).toLowerCase() != 'listed') {
    return null;
  }

  final totalSlots = _externalInt(
    progress['total_slots'] ?? json['total_slots'],
    minimum: 0,
    maximum: 1000,
  );
  final completedSlots = _externalInt(
    progress['completed_slots'] ??
        progress['satisfied_slots'] ??
        json['completed_slots'],
    minimum: 0,
    maximum: totalSlots,
  );
  final target = _map(binder['target']);
  return BinderSummary(
    id: publicId,
    publicId: publicId,
    title: _externalPlainText(
      json['title'] ?? binder['title'],
      maxLength: 80,
      fallback: 'Binder',
    ),
    description: _plainText(
      json['description'] ?? binder['description'],
      maxLength: 1000,
    ),
    targetKind: targetKind,
    targetLabel: _externalPlainText(
      json['target_label'] ?? target['label'],
      maxLength: 120,
      fallback: 'Collection goal',
    ),
    // Explore may expose a route key, never an internal target UUID.
    targetId: null,
    targetKey: _nullablePlainText(
      json['target_key'] ?? target['key'],
      maxLength: 120,
    ),
    checklistMode: checklistMode,
    completedSlots: completedSlots,
    totalSlots: totalSlots,
    progressUnit: _externalProgressUnit(
      progress['unit'],
      fallback: checklistMode,
    ),
    memberCount: _externalInt(
      memberSummary['contributor_count'] ?? json['member_count'],
      minimum: 0,
      maximum: 50,
    ),
    pendingApprovalCount: 0,
    role: BinderRole.viewer,
    readAccess: BinderReadAccess.public,
    discoverability: BinderDiscoverability.listed,
    joinPolicy: BinderJoinPolicy.closed,
    contributionPolicy: BinderContributionPolicy.ownerOnly,
    lifecycle: BinderLifecycle.active,
    moderationState: BinderModerationState.clear,
    coverImageUrl:
        _externalCanonicalImageUrl(json['cover_image_url']) ??
        _externalCanonicalImageUrl(binder['cover_image_url']),
    isExternalProjection: true,
  );
}

BinderTemplate? _binderTemplateFromExternalJson(Map<String, dynamic> json) {
  final publicId =
      _externalUuid(json['template_public_id']) ??
      _externalUuid(json['public_id']);
  final targetKind = _externalTargetKindOrNull(json['target_kind']);
  if (publicId == null || targetKind == null) return null;

  final adoption = _externalNullableInt(
    json['adoption_count'],
    minimum: 0,
    maximum: 1000000000,
  );
  return BinderTemplate(
    id: publicId,
    title: _externalPlainText(
      json['title'],
      maxLength: 80,
      fallback: 'Binder Template',
    ),
    description: _plainText(json['description'], maxLength: 1000),
    targetKind: targetKind,
    slotCount: _externalInt(
      json['checklist_slot_count'] ?? json['slot_count'],
      minimum: 0,
      maximum: 1000,
    ),
    version: _externalInt(
      json['version_number'] ?? json['version'],
      minimum: 1,
      maximum: 1000000,
      fallback: 1,
    ),
    coverImageUrl: _externalCanonicalImageUrl(json['cover_image_url']),
    adoptionCount: adoption != null && adoption >= 5 ? adoption : null,
    // Public models never carry author/member/template authority.
    isSystem: false,
  );
}

BinderDetail _binderDetailFromExternalJson(
  Map<String, dynamic> json, {
  required BinderExternalAudience audience,
  required bool authenticatedViewer,
}) {
  final binder = _map(json['binder']);
  final target = _map(binder['target']);
  final progressEnvelope = _map(json['progress']);
  final externalProgress = _map(progressEnvelope['external']);
  final progress = externalProgress.isEmpty
      ? progressEnvelope
      : externalProgress;
  final memberSummary = _map(json['member_summary']);
  final viewer = _map(json['viewer']);
  final rawPermissions = _map(json['permissions']);
  final isPublic = audience == BinderExternalAudience.public;
  final hasPublicViewer = isPublic && authenticatedViewer;

  final publicId = _externalUuid(binder['public_id']) ?? '';
  final checklistMode = _externalChecklistMode(binder['checklist_mode']);
  final totalSlots = _externalInt(
    progress['total_slots'],
    minimum: 0,
    maximum: 1000,
  );
  final completedSlots = _externalInt(
    progress['completed_slots'] ?? progress['satisfied_slots'],
    minimum: 0,
    maximum: totalSlots,
  );
  final moderated =
      _externalTrue(binder['moderated']) &&
      _externalTrue(binder['moderation_approved']);

  final summary = BinderSummary(
    // An external response never gets to select a private Binder identifier.
    id: publicId,
    publicId: publicId,
    title: _externalPlainText(
      binder['title'],
      maxLength: 80,
      fallback: 'Binder',
    ),
    description: _plainText(binder['description'], maxLength: 1000),
    targetKind: _externalTargetKind(binder['target_kind'] ?? target['kind']),
    targetLabel: _externalPlainText(
      target['label'] ?? binder['target_label'],
      maxLength: 120,
      fallback: 'Collection goal',
    ),
    targetId: _externalUuid(target['id']),
    targetKey: _nullablePlainText(target['key'], maxLength: 120),
    checklistMode: checklistMode,
    completedSlots: completedSlots,
    totalSlots: totalSlots,
    progressUnit: _externalProgressUnit(
      progress['unit'],
      fallback: checklistMode,
    ),
    memberCount: _externalInt(
      memberSummary['contributor_count'],
      minimum: 0,
      maximum: 50,
    ),
    pendingApprovalCount: 0,
    role: BinderRole.viewer,
    readAccess: isPublic ? BinderReadAccess.public : BinderReadAccess.link,
    discoverability:
        isPublic && _text(binder['discoverability']).toLowerCase() == 'listed'
        ? BinderDiscoverability.listed
        : BinderDiscoverability.unlisted,
    joinPolicy: BinderJoinPolicy.closed,
    contributionPolicy: BinderContributionPolicy.ownerOnly,
    lifecycle: _text(binder['lifecycle']).toLowerCase() == 'active'
        ? BinderLifecycle.active
        : BinderLifecycle.deletedTombstone,
    moderationState: moderated
        ? BinderModerationState.clear
        : BinderModerationState.forcedUnlisted,
    coverImageUrl: _externalCanonicalImageUrl(binder['cover_image_url']),
    isExternalProjection: true,
  );

  final joinRequestState = hasPublicViewer
      ? _externalJoinRequestState(viewer['join_request_status'])
      : null;
  final joinRequestId = joinRequestState == BinderJoinRequestState.pending
      ? _externalActionUuid(viewer['join_request_id'])
      : null;
  final pendingJoinRequest = joinRequestId == null
      ? null
      : BinderJoinRequest(
          id: joinRequestId,
          state: BinderJoinRequestState.pending,
          requestedRole: BinderRole.contributor,
        );
  final checklistEnvelope = _map(json['checklist_page']).isNotEmpty
      ? _map(json['checklist_page'])
      : <String, dynamic>{
          'items': json['checklist'] ?? json['checklist_items'],
          'next_position': json['next_position'],
        };

  return BinderDetail(
    summary: summary,
    permissions: BinderPermissions(
      canReport: hasPublicViewer && _externalTrue(rawPermissions['can_report']),
      canBlockOwner:
          hasPublicViewer && _externalTrue(rawPermissions['can_block_owner']),
    ),
    // External views are not memberships. All member-only state is fixed to
    // inert defaults rather than copied from the response.
    alias: null,
    membershipState: BinderMembershipState.active,
    membershipEpoch: 1,
    contentConsent: BinderConsentScope.none,
    identityConsent: BinderConsentScope.none,
    externalProjectionRevision: 0,
    definitionRevision: 1,
    coverCardPrintId: null,
    externalCompletedSlots: completedSlots,
    externalTotalSlots: totalSlots,
    externalProgressUnit: _externalProgressUnit(
      progress['unit'],
      fallback: checklistMode,
    ),
    pendingJoinRequestCount: 0,
    notificationPreference: 'digest',
    contentConsentRevision: null,
    identityConsentRevision: null,
    pendingJoinRequest: pendingJoinRequest,
    joinRequestState: joinRequestState,
    canRequestToJoin:
        hasPublicViewer &&
        joinRequestState != BinderJoinRequestState.pending &&
        _externalTrue(viewer['can_request_to_join']),
    viewLinks: const <BinderViewLink>[],
    pendingJoinRequests: const <BinderJoinRequest>[],
    pendingInvitations: const <BinderInvitation>[],
    ownerTransferOffer: null,
    externalChecklist: _binderChecklistPageFromExternalJson(
      checklistEnvelope,
      audience: audience,
      authenticatedViewer: authenticatedViewer,
    ),
    lastAuthorizedAt: DateTime.now().toUtc(),
  );
}

BinderChecklistPage _binderChecklistPageFromExternalJson(
  Map<String, dynamic> json, {
  required BinderExternalAudience audience,
  required bool authenticatedViewer,
}) {
  final items = <BinderChecklistItem>[];
  for (final item in _maps(json['items'] ?? json['slots']).take(50)) {
    final sanitized = _binderChecklistItemFromExternalJson(
      item,
      audience: audience,
      authenticatedViewer: authenticatedViewer,
    );
    if (sanitized != null) items.add(sanitized);
  }

  final cursor = _map(json['next_cursor']);
  final nextPosition = _externalNullableInt(
    json['next_position'] ?? cursor['position'],
    minimum: 0,
    maximum: 1000000,
  );
  return BinderChecklistPage(
    items: List<BinderChecklistItem>.unmodifiable(items),
    nextCursor: nextPosition == null
        ? null
        : BinderCursor(position: nextPosition),
    hasMore: nextPosition != null,
    memberCompletedSlots: null,
    externalCompletedSlots: audience == BinderExternalAudience.template
        ? null
        : _externalNullableInt(
            json['external_completed_slots'],
            minimum: 0,
            maximum: 1000,
          ),
  );
}

BinderChecklistItem? _binderChecklistItemFromExternalJson(
  Map<String, dynamic> json, {
  required BinderExternalAudience audience,
  required bool authenticatedViewer,
}) {
  final card = _map(json['card']);
  final slotId =
      _externalUuid(json['slot_public_id']) ?? _externalUuid(json['slot_id']);
  final cardPrintId =
      _externalUuid(json['card_print_id']) ??
      _externalUuid(card['card_print_id']);
  if (slotId == null || cardPrintId == null) return null;

  final imageUrl =
      _externalCanonicalImageUrl(json['image_url']) ??
      _externalCanonicalImageUrl(json['canonical_image_url']) ??
      _externalCanonicalImageUrl(card['image_url']) ??
      _externalCanonicalImageUrl(card['canonical_image_url']);
  final isTemplate = audience == BinderExternalAudience.template;
  final contributors = <String>[];
  if (!isTemplate) {
    for (final contributor in _maps(json['contributors']).take(20)) {
      final identityVisible = _externalTrue(contributor['identity_visible']);
      final alias = identityVisible
          ? _nullablePlainText(contributor['alias'], maxLength: 40)
          : null;
      contributors.add(alias ?? 'A Binder member');
    }
    if (contributors.isEmpty) {
      for (final label in _strings(json['attribution_labels']).take(20)) {
        // A legacy neutral label is safe. A raw name without an explicit
        // identity-visible bit is not.
        if (label == 'A Binder member') contributors.add(label);
      }
    }
  }

  final isActionablePublic =
      audience == BinderExternalAudience.public && authenticatedViewer;
  final publicActions = <BinderPublicContributionAction>[];
  if (isActionablePublic) {
    for (final row in _maps(json['contribution_actions']).take(20)) {
      final permissions = _map(row['permissions']);
      final canReport = _externalTrue(permissions['can_report']);
      final canBlock = _externalTrue(permissions['can_block']);
      final contributionReference = canReport
          ? _externalActionUuid(row['contribution_action_ref'])
          : null;
      final memberReference = canReport || canBlock
          ? _externalActionUuid(row['member_action_ref'])
          : null;
      final identityVisible = _externalTrue(row['identity_visible']);
      final action = BinderPublicContributionAction(
        contributionActionReference: contributionReference,
        memberActionReference: memberReference,
        alias: identityVisible
            ? _nullablePlainText(row['alias'], maxLength: 40)
            : null,
        identityVisible: identityVisible,
        canReport: canReport,
        canBlock: canBlock,
      );
      if (action.hasAnyAction) publicActions.add(action);
    }
  }

  return BinderChecklistItem(
    slotId: slotId,
    cardPrintId: cardPrintId,
    // A printing UUID is not part of the approved external mobile model.
    cardPrintingId: null,
    gvId: null,
    name: _externalPlainText(
      json['name'] ?? json['title'] ?? card['name'],
      maxLength: 160,
      fallback: 'Card print',
    ),
    setLabel: _nullablePlainText(
      json['set_label'] ?? card['set_name'] ?? card['set_code'],
      maxLength: 120,
    ),
    number: _nullablePlainText(json['number'] ?? card['number'], maxLength: 40),
    finishLabel: _nullablePlainText(
      json['finish_label'] ?? card['finish_label'],
      maxLength: 100,
    ),
    imageUrl: imageUrl,
    hasHostedImage:
        imageUrl != null &&
        (_externalTrue(json['hosted_image']) ||
            _externalTrue(card['hosted_image'])),
    requiredQuantity: _externalInt(
      json['required_quantity'],
      minimum: 1,
      maximum: 100,
      fallback: 1,
    ),
    activeQuantity: isTemplate
        ? 0
        : _externalInt(
            json['active_quantity'] ?? json['satisfied_quantity'],
            minimum: 0,
            maximum: 5000,
          ),
    ownedEligibleCount: 0,
    contributedByYouCount: 0,
    pendingCount: 0,
    contributions: const <BinderContributionReference>[],
    contributionsHaveMore: false,
    publicContributionActions:
        List<BinderPublicContributionAction>.unmodifiable(publicActions),
    publicContributionActionsHaveMore:
        isActionablePublic &&
        publicActions.isNotEmpty &&
        _externalTrue(json['contribution_actions_has_more']),
    contributionIds: const <String>[],
    pendingContributionIds: const <String>[],
    ownContributionIds: const <String>[],
    removableContributionIds: const <String>[],
    attributionLabels: List<String>.unmodifiable(contributors),
    needsReview: !isTemplate && _externalTrue(json['needs_review']),
  );
}

BinderTargetKind _externalTargetKind(Object? value) {
  return _externalTargetKindOrNull(value) ?? BinderTargetKind.species;
}

BinderTargetKind? _externalTargetKindOrNull(Object? value) {
  return switch (_text(value).toLowerCase()) {
    'species' => BinderTargetKind.species,
    'set' => BinderTargetKind.set,
    'custom' => BinderTargetKind.custom,
    _ => null,
  };
}

BinderChecklistMode _externalChecklistMode(Object? value) {
  return _externalChecklistModeOrNull(value) ?? BinderChecklistMode.cardPrints;
}

BinderChecklistMode? _externalChecklistModeOrNull(Object? value) {
  return switch (_text(value).toLowerCase()) {
    'card_prints' => BinderChecklistMode.cardPrints,
    'master_set' => BinderChecklistMode.masterSet,
    'master_variants' => BinderChecklistMode.masterVariants,
    'custom' => BinderChecklistMode.custom,
    _ => null,
  };
}

String _externalProgressUnit(
  Object? value, {
  required BinderChecklistMode fallback,
}) {
  return switch (_text(value).toLowerCase()) {
    'card_prints' => 'card_prints',
    'finish_options' => 'finish_options',
    'custom_slots' => 'custom_slots',
    _ => switch (fallback) {
      BinderChecklistMode.cardPrints => 'card_prints',
      BinderChecklistMode.masterSet ||
      BinderChecklistMode.masterVariants => 'finish_options',
      BinderChecklistMode.custom => 'custom_slots',
    },
  };
}

BinderJoinRequestState? _externalJoinRequestState(Object? value) {
  return switch (_text(value).toLowerCase()) {
    'pending' => BinderJoinRequestState.pending,
    'approved' => BinderJoinRequestState.approved,
    'rejected' => BinderJoinRequestState.rejected,
    'withdrawn' => BinderJoinRequestState.withdrawn,
    _ => null,
  };
}

String? _externalUuid(Object? value) {
  final candidate = value is String ? value.trim() : '';
  return _externalUuidPattern.hasMatch(candidate) ? candidate : null;
}

String? _externalActionUuid(Object? value) {
  final candidate = value is String ? value.trim() : '';
  return _externalActionUuidPattern.hasMatch(candidate) ? candidate : null;
}

String? _externalCanonicalImageUrl(Object? value) {
  final candidate = value is String ? value.trim() : '';
  if (candidate.isEmpty ||
      candidate.contains(r'\') ||
      !_externalCanonicalImagePattern.hasMatch(candidate)) {
    return null;
  }
  final uri = Uri.tryParse(candidate);
  if (uri == null ||
      uri.scheme != 'https' ||
      uri.host != 'grookaivault.com' ||
      uri.hasPort ||
      uri.userInfo.isNotEmpty ||
      uri.query.isNotEmpty ||
      uri.fragment.isNotEmpty) {
    return null;
  }
  return candidate;
}

DateTime? _externalDate(Object? value) {
  final parsed = _date(value);
  if (parsed == null ||
      parsed.isBefore(DateTime.utc(2000)) ||
      parsed.isAfter(DateTime.utc(2100))) {
    return null;
  }
  return parsed;
}

DateTime? _externalInvitationExpiry(Object? value) {
  final parsed = _externalDate(value);
  if (parsed == null) return null;
  final now = DateTime.now().toUtc();
  if (parsed.isBefore(now.subtract(const Duration(days: 1))) ||
      parsed.isAfter(now.add(const Duration(days: 31)))) {
    return null;
  }
  return parsed;
}

bool _externalTrue(Object? value) => value == true;

int _externalInt(
  Object? value, {
  required int minimum,
  required int maximum,
  int fallback = 0,
}) {
  if (value is! num || !value.isFinite) {
    return fallback.clamp(minimum, maximum);
  }
  return value.toInt().clamp(minimum, maximum);
}

int? _externalNullableInt(
  Object? value, {
  required int minimum,
  required int maximum,
}) {
  if (value is! num || !value.isFinite) return null;
  return value.toInt().clamp(minimum, maximum);
}

String _externalPlainText(
  Object? value, {
  required int maxLength,
  required String fallback,
}) {
  final text = value is String ? _plainText(value, maxLength: maxLength) : '';
  return text.isEmpty ? fallback : text;
}

String? _externalNullablePlainText(Object? value, {required int maxLength}) {
  if (value is! String) return null;
  return _nullablePlainText(value, maxLength: maxLength);
}

T? _enumByWire<T>(
  Iterable<T> values,
  Object? value,
  String Function(T item) wire,
) {
  final normalized = _text(value).toLowerCase();
  for (final item in values) {
    if (wire(item) == normalized) return item;
  }
  return null;
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const <String, dynamic>{};
}

List<Map<String, dynamic>> _maps(Object? value) {
  if (value is List) {
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }
  return const <Map<String, dynamic>>[];
}

List<String> _strings(Object? value) {
  if (value is! List) return const <String>[];
  return value
      .map(_text)
      .where((item) => item.isNotEmpty)
      .toList(growable: false);
}

String _text(Object? value) => (value ?? '').toString().trim();

String? _nullableText(Object? value) {
  final text = _text(value);
  return text.isEmpty ? null : text;
}

String _plainText(Object? value, {required int maxLength}) {
  final text = _text(value)
      .replaceAll(RegExp(r'[\u0000-\u0008\u000B\u000C\u000E-\u001F]'), '')
      .replaceAll(RegExp(r'<[^>]*>'), '')
      .trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength);
}

String? _nullablePlainText(Object? value, {required int maxLength}) {
  final text = _plainText(value, maxLength: maxLength);
  return text.isEmpty ? null : text;
}

bool _bool(Object? value) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  return const <String>{
    'true',
    't',
    '1',
    'yes',
  }.contains(_text(value).toLowerCase());
}

int _int(Object? value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(_text(value)) ?? fallback;
}

int? _nullableInt(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(_text(value));
}

DateTime? _date(Object? value) {
  if (value is DateTime) return value.toUtc();
  final text = _text(value);
  return text.isEmpty ? null : DateTime.tryParse(text)?.toUtc();
}
