/// The only Flutter source of Binder RPC names and wire parameter keys.
///
/// Keep this file synchronized with the additive Binder schema lane. Binder
/// clients never read or write raw authority tables.
abstract final class BinderRpc {
  static const dashboard = 'binder_dashboard_v1';
  static const detail = 'binder_detail_v1';
  static const checklist = 'binder_checklist_v1';
  static const activity = 'binder_activity_v1';
  static const members = 'binder_members_v1';
  static const invitationInbox = 'binder_invitation_inbox_v1';
  static const suspendedBinders = 'binder_suspended_binders_v1';
  static const pendingContributions = 'binder_pending_contributions_v1';
  static const joinRequestsQueue = 'binder_join_requests_queue_v1';
  static const eligibleCopies = 'binder_eligible_copies_v1';
  static const bulkPreview = 'binder_bulk_preview_v1';
  static const invitationPreview = 'binder_invitation_preview_v1';
  static const publicDetail = 'binder_public_detail_v1';
  static const publicChecklist = 'binder_public_checklist_v1';
  static const viewLinkDetail = 'binder_view_link_detail_v1';
  static const viewLinkChecklist = 'binder_view_link_checklist_v1';
  static const explore = 'binder_explore_v1';
  static const templates = 'binder_templates_v1';
  static const templateDetail = 'binder_template_detail_v1';
  static const templateChecklist = 'binder_template_checklist_v1';
  static const legacyCandidates = 'binder_legacy_candidates_v1';

  static const create = 'binder_create_v1';
  static const updateMetadata = 'binder_update_metadata_v1';
  static const updatePolicy = 'binder_update_policy_v1';
  static const setLifecycle = 'binder_set_lifecycle_v1';
  static const delete = 'binder_delete_v1';
  static const ownerTransferOffer = 'binder_owner_transfer_offer_v1';
  static const ownerTransferAccept = 'binder_owner_transfer_accept_v1';
  static const ownerTransferRevoke = 'binder_owner_transfer_revoke_v1';
  static const inviteCreate = 'binder_invite_create_v1';
  static const inviteAccept = 'binder_invite_accept_v1';
  static const inviteDecline = 'binder_invite_decline_v1';
  static const inviteRevoke = 'binder_invite_revoke_v1';
  static const inviteRespond = 'binder_invite_respond_v1';
  static const invitationReport = 'binder_invitation_report_v1';
  static const viewLinkCreate = 'binder_view_link_create_v1';
  static const viewLinkRotate = 'binder_view_link_rotate_v1';
  static const viewLinkRevoke = 'binder_view_link_revoke_v1';
  static const joinRequestCreate = 'binder_join_request_create_v1';
  static const joinRequestDecide = 'binder_join_request_decide_v1';
  static const joinRequestWithdraw = 'binder_join_request_withdraw_v1';
  static const memberChangeRole = 'binder_member_change_role_v1';
  static const memberSuspend = 'binder_member_suspend_v1';
  static const memberReinstate = 'binder_member_reinstate_v1';
  static const memberRemove = 'binder_member_remove_v1';
  static const leave = 'binder_leave_v1';
  static const memberPreferences = 'binder_member_preferences_v1';
  static const contributionAdd = 'binder_contribution_add_v1';
  static const contributionWithdraw = 'binder_contribution_withdraw_v1';
  static const contributionDecide = 'binder_contribution_decide_v1';
  static const contributionRemove = 'binder_contribution_remove_v1';
  static const bulkAdd = 'binder_bulk_add_v1';
  static const customRevisionPublish = 'binder_custom_revision_publish_v1';
  static const templateSubmit = 'binder_template_submit_v1';
  static const templateClone = 'binder_template_clone_v1';
  static const legacyDecide = 'binder_legacy_decide_v1';
  static const report = 'binder_report_v1';
  static const blockOwner = 'binder_block_owner_v1';
  static const blockMember = 'binder_block_member_v1';
  static const publicActionReport = 'binder_public_action_report_v1';
  static const publicMemberBlock = 'binder_public_member_block_v1';
  static const pulseMilestoneShare = 'binder_pulse_milestone_share_v1';

  /// PostgREST overload resolution requires these named parameters to remain
  /// present even when the caller intentionally clears their value.
  static const Map<String, Set<String>> requiredNullableParams =
      <String, Set<String>>{
        updateMetadata: <String>{'p_cover_card_print_id'},
        memberPreferences: <String>{'p_alias'},
        templateClone: <String>{'p_version_number'},
        legacyDecide: <String>{'p_title'},
      };

  static Map<String, dynamic> compactRequestParams(
    String function,
    Map<String, dynamic> params,
  ) {
    final requiredNullable =
        requiredNullableParams[function] ?? const <String>{};
    return Map<String, dynamic>.from(params)..removeWhere(
      (key, value) => value == null && !requiredNullable.contains(key),
    );
  }
}

abstract final class BinderParam {
  static const limit = 'p_limit';
  static const publicId = 'p_public_id';
  static const token = 'p_token';
  static const idempotencyKey = 'p_idempotency_key';
  static const beforeUpdatedAt = 'p_before_updated_at';
  static const beforeCreatedAt = 'p_before_created_at';
  static const beforeRequestedAt = 'p_before_requested_at';
  static const beforeId = 'p_before_id';
  static const afterPosition = 'p_after_position';
  static const afterMemberId = 'p_after_member_id';
  static const afterCreatedAt = 'p_after_created_at';
  static const afterInstanceId = 'p_after_instance_id';
}
