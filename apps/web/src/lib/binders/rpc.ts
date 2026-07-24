import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { BINDER_READ_RPC, type BinderReadRpcName } from "./rpcContract";
import type {
  BinderActivityItem,
  BinderBulkPreview,
  BinderChecklistSlot,
  BinderDashboard,
  BinderDetail,
  BinderEligibleCopy,
  BinderExploreResult,
  BinderInvitationPreview,
  BinderInvitationSummary,
  BinderLegacyCandidate,
  BinderMember,
  BinderModerationState,
  BinderNotificationPreference,
  BinderProgressUnit,
  BinderPublicProjection,
  BinderSummary,
  BinderTemplateDetail,
  BinderTemplateSummary,
} from "./types";
import {
  parsePublicContributionActions,
  safeCanonicalBinderImageUrl,
} from "./publicSafety";

type JsonRecord = Record<string, unknown>;
const OPAQUE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BinderRpcError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BinderRpcError";
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function list(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function boundedString(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().slice(0, maxLength);
  return normalized || fallback;
}

function boundedNullableString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().slice(0, maxLength);
  return normalized || null;
}

function opaqueUuid(value: unknown) {
  return typeof value === "string" && OPAQUE_UUID_PATTERN.test(value)
    ? value
    : null;
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boundedWholeNumber(
  value: unknown,
  fallback = 0,
  minimum = 0,
  maximum = 1_000_000,
) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback;
}

function boolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function field(source: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }
  return undefined;
}

function nested(source: JsonRecord, key: string) {
  return record(source[key]);
}

function parseRole(value: unknown): BinderSummary["role"] {
  return value === "owner" ||
    value === "manager" ||
    value === "contributor" ||
    value === "viewer"
    ? value
    : "viewer";
}

function parseProgressUnit(value: unknown): BinderProgressUnit {
  return value === "finish_options" || value === "custom_slots"
    ? value
    : "card_prints";
}

function parseConsent(value: unknown) {
  return value === "link" || value === "public" ? value : "none";
}

function parseModerationState(value: unknown): BinderModerationState {
  return value === "forced_unlisted" ||
    value === "frozen" ||
    value === "removed"
    ? value
    : "clear";
}

function parseNotificationPreference(value: unknown): BinderNotificationPreference {
  return value === "immediate" || value === "muted" ? value : "digest";
}

function parseSummary(value: unknown): BinderSummary {
  const item = record(value);
  const progress = nested(item, "progress");
  const memberSummary = nested(item, "member_summary");
  return {
    publicId: string(field(item, "public_id", "publicId")),
    title: string(item.title, "Untitled Binder"),
    description: nullableString(item.description),
    coverImageUrl: nullableString(field(item, "cover_image_url", "cover_url", "cover")),
    binderType:
      item.target_kind === "set" || item.target_kind === "custom"
        ? item.target_kind
        : "species",
    role: parseRole(field(item, "role", "viewer_role")),
    lifecycle: item.lifecycle === "archived" ? "archived" : "active",
    completedSlots: number(
      field(item, "completed_slots", "completed_count") ??
        field(progress, "completed_slots", "satisfied_slots"),
    ),
    totalSlots: number(
      field(item, "total_slots", "total_count") ??
        field(progress, "total_slots"),
    ),
    progressUnit: parseProgressUnit(
      field(item, "unit", "progress_unit") ?? field(progress, "unit"),
    ),
    memberCount: number(
      field(item, "member_count") ?? field(memberSummary, "member_count", "contributor_count"),
      1,
    ),
    updatedAt: nullableString(field(item, "updated_at", "last_activity_at")),
  };
}

function parseInvitationSummary(value: unknown): BinderInvitationSummary {
  const item = record(value);
  return {
    invitationPublicId: string(
      field(item, "invitation_public_id", "invitation_id", "public_id"),
    ),
    binderPublicId: string(field(item, "binder_public_id")),
    binderTitle: string(field(item, "binder_title", "title"), "Binder invitation"),
    role:
      item.role === "manager" || item.role === "viewer" ? item.role : "contributor",
    expiresAt: nullableString(item.expires_at),
  };
}

export function parseBinderDashboard(
  value: unknown,
  invitationInboxValue?: unknown,
  suspendedBindersValue?: unknown,
): BinderDashboard {
  const data = record(value);
  const hasDedicatedInvitationInbox = invitationInboxValue !== undefined;
  const hasDedicatedSuspendedPage = suspendedBindersValue !== undefined;
  const invitationInbox =
    hasDedicatedInvitationInbox ? record(invitationInboxValue) : data;
  const suspendedBinders =
    hasDedicatedSuspendedPage ? record(suspendedBindersValue) : data;
  const summaries = list(data.items).map(parseSummary);
  const isComplete = (item: BinderSummary) =>
    item.totalSlots > 0 && item.completedSlots >= item.totalSlots;
  const nextCursor = record(data.next_cursor);

  return {
    continueBuilding: summaries.filter(
      (item) =>
        item.lifecycle === "active" &&
        item.role === "owner" &&
        !isComplete(item),
    ),
    sharedWithMe: summaries.filter(
      (item) =>
        item.lifecycle === "active" &&
        item.role !== "owner" &&
        !isComplete(item),
    ),
    invitations: list(
      field(invitationInbox, "invitations", "items"),
    ).map(parseInvitationSummary),
    completed: summaries.filter(
      (item) => item.lifecycle === "active" && isComplete(item),
    ),
    archived: summaries.filter((item) => item.lifecycle === "archived"),
    suspended: list(
      field(suspendedBinders, "suspended_binders", "items"),
    ).map((value) => {
      const item = record(value);
      const permissions = record(item.permissions);
      return {
        publicId: string(field(item, "public_id", "id")),
        canLeave: boolean(field(permissions, "can_leave")),
        canReport: boolean(field(permissions, "can_report")),
      };
    }),
    nextCursor:
      nullableString(nextCursor.updated_at) && nullableString(nextCursor.id)
        ? Buffer.from(
            JSON.stringify({
              updatedAt: nextCursor.updated_at,
              id: nextCursor.id,
            }),
          ).toString("base64url")
        : null,
    invitationsNextCursor: hasDedicatedInvitationInbox
      ? timeCursor(
          invitationInbox.next_cursor,
          "created_at",
          "createdAt",
        )
      : null,
    suspendedNextCursor: timeCursor(
      hasDedicatedSuspendedPage
        ? suspendedBinders.next_cursor
        : data.suspended_binders_next_cursor,
      "updated_at",
      "updatedAt",
    ),
    loadedAt: nullableString(data.loaded_at),
    legacyCandidates: [],
  };
}

function parseChecklistSlot(value: unknown): BinderChecklistSlot {
  const item = record(value);
  const card = nested(item, "card");
  const coverage = nested(item, "coverage");
  return {
    slotPublicId: string(field(item, "slot_public_id", "public_id", "slot_key")),
    cardPrintId: nullableString(field(item, "card_print_id")),
    cardPrintingId: nullableString(field(item, "card_printing_id")),
    title: string(field(item, "title", "card_name", "label"), "Card print"),
    subtitle: nullableString(field(item, "subtitle", "set_label", "finish_label")),
    finishLabel: nullableString(field(item, "finish_label")),
    imageUrl: nullableString(field(item, "image_url", "canonical_image_url")),
    hostedImage: boolean(
      field(item, "hosted_image") ?? field(card, "hosted_image"),
    ),
    status:
      item.status === "in_binder" ||
      boolean(field(item, "satisfied", "is_satisfied")) ||
      number(field(coverage, "satisfied_quantity")) >=
        Math.max(1, number(field(coverage, "required_quantity"), 1))
        ? "in_binder"
        : "missing",
    inYourVault: boolean(field(item, "in_your_vault", "viewer_has_eligible_copy")),
    contributedByYou: boolean(field(item, "contributed_by_you", "viewer_contributed")),
    needsFinishReview: boolean(
      field(item, "needs_review", "needs_finish_review", "unresolved_finish"),
    ),
    satisfiedQuantity: number(
      field(item, "satisfied_quantity") ?? field(coverage, "satisfied_quantity"),
    ),
    requiredQuantity: Math.max(
      1,
      number(field(item, "required_quantity") ?? field(coverage, "required_quantity"), 1),
    ),
    contributors: list(item.contributors).map((contributor) => {
      const row = record(contributor);
      return {
        alias: nullableString(field(row, "alias", "display_name")),
        identityVisible: boolean(field(row, "identity_visible")),
      };
    }),
    contributions: list(item.contributions).map((contribution) => {
      const row = record(contribution);
      return {
        contributionPublicId: nullableString(
          field(row, "contribution_id", "contribution_public_id"),
        ),
        state: row.state === "pending" ? "pending" : "active",
        memberLabel: string(
          field(row, "member_label", "contributor_label"),
          "Binder member",
        ),
        isOwn: boolean(field(row, "is_own")),
        canRemove: boolean(field(row, "can_remove")),
        canDecide: boolean(field(row, "can_decide")),
      };
    }),
    publicContributionActions: [],
    publicContributionActionsHasMore: false,
    contributionPublicId: nullableString(
      field(item, "viewer_contribution_id", "contribution_public_id"),
    ),
    contributionState:
      item.contribution_state === "pending" || item.contribution_state === "active"
        ? item.contribution_state
        : "none",
  };
}

/**
 * Public and capability-link reads get a second, web-side allow-list even
 * though their database RPCs are already sanitized. If a future RPC change
 * accidentally adds member or exact-copy fields, they still cannot reach
 * React, metadata, or an RSC response through this parser.
 */
type ExternalProjectionAudience = "public" | "link" | "template";

function parsePublicChecklistSlot(
  value: unknown,
  audience: ExternalProjectionAudience = "public",
): BinderChecklistSlot | null {
  const item = record(value);
  const slotPublicId = opaqueUuid(
    field(item, "slot_public_id", "public_id", "slot_key"),
  );
  if (!slotPublicId) {
    return null;
  }
  const card = nested(item, "card");
  const coverage = nested(item, "coverage");
  const satisfiedQuantity = boundedWholeNumber(
    field(item, "satisfied_quantity") ?? field(coverage, "satisfied_quantity"),
  );
  const requiredQuantity = Math.max(
    1,
    boundedWholeNumber(
      field(item, "required_quantity") ?? field(coverage, "required_quantity"),
      1,
      1,
    ),
  );
  const publicContributionActions =
    audience === "public"
      ? parsePublicContributionActions(item.contribution_actions)
      : [];
  const contributors = (audience === "template" ? [] : list(item.contributors))
    .slice(0, 20)
    .map((value) => {
      const contributor = record(value);
      const identityVisible = boolean(contributor.identity_visible);
      const alias = boundedNullableString(contributor.alias, 40);
      return {
        alias: identityVisible && alias ? alias.trim().slice(0, 40) : null,
        identityVisible,
      };
    });
  return {
    slotPublicId,
    cardPrintId: opaqueUuid(item.card_print_id),
    cardPrintingId: null,
    title: boundedString(
      field(item, "title", "card_name", "label"),
      "Card print",
      160,
    ),
    subtitle: boundedNullableString(
      field(item, "subtitle", "set_label", "finish_label"),
      160,
    ),
    finishLabel: boundedNullableString(field(item, "finish_label"), 100),
    imageUrl: safeCanonicalBinderImageUrl(
      field(item, "image_url", "canonical_image_url"),
    ),
    hostedImage: boolean(
      field(item, "hosted_image") ?? field(card, "hosted_image"),
    ),
    status:
      item.status === "in_binder" ||
      boolean(field(item, "satisfied", "is_satisfied")) ||
      satisfiedQuantity >= requiredQuantity
        ? "in_binder"
        : "missing",
    inYourVault: false,
    contributedByYou: false,
    needsFinishReview: boolean(
      field(item, "needs_review", "needs_finish_review", "unresolved_finish"),
    ),
    satisfiedQuantity,
    requiredQuantity,
    contributors,
    contributions: [],
    publicContributionActions,
    publicContributionActionsHasMore:
      audience === "public" &&
      publicContributionActions.length > 0 &&
      boolean(item.contribution_actions_has_more),
    contributionPublicId: null,
    contributionState: "none",
  };
}

function parseActivity(value: unknown): BinderActivityItem {
  const item = record(value);
  return {
    eventPublicId: string(field(item, "event_public_id", "public_id", "event_id")),
    kind: string(field(item, "kind", "event_type"), "binder_updated"),
    summary: string(field(item, "message", "summary", "display_text"), "Binder updated"),
    actorLabel: nullableString(field(item, "actor_label", "actor_display_name")),
    createdAt: nullableString(item.created_at),
  };
}

function parseMember(value: unknown): BinderMember {
  const item = record(value);
  const preferences = nested(item, "preferences");
  return {
    membershipPublicId: string(field(item, "membership_public_id", "member_id", "public_id")),
    displayName: string(field(item, "display_name", "member_label"), "Binder member"),
    role: parseRole(item.role),
    status: item.status === "suspended" ? "suspended" : "active",
    alias: nullableString(item.alias),
    externalContentConsent: parseConsent(
      field(item, "content_scope") ?? field(preferences, "content_scope"),
    ),
    identityAttributionConsent: parseConsent(
      field(item, "identity_scope") ?? field(preferences, "identity_scope"),
    ),
    canManage: boolean(field(item, "can_manage")),
  };
}

function parseEligibleCopy(value: unknown): BinderEligibleCopy {
  const item = record(value);
  return {
    copyReference: string(
      field(item, "copy_reference", "vault_item_instance_id", "instance_id"),
    ),
    cardPrintId: string(field(item, "card_print_id")),
    cardPrintingId: nullableString(item.card_printing_id),
    title: string(field(item, "title", "card_name"), "Owned copy"),
    finishLabel: nullableString(field(item, "finish_label")),
    imageUrl: nullableString(field(item, "image_url", "canonical_image_url")),
    eligible: boolean(field(item, "eligible"), true),
    reason: nullableString(field(item, "reason", "ineligible_reason")),
  };
}

function parseProgress(value: unknown) {
  const progress = record(value);
  return {
    completed: number(field(progress, "completed_slots", "satisfied_slots")),
    total: number(field(progress, "total_slots")),
    unit: parseProgressUnit(field(progress, "unit")),
  };
}

function positionCursor(value: unknown) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 1_000_000
    ? Buffer.from(JSON.stringify({ position: value })).toString("base64url")
    : null;
}

function timeCursor(
  value: unknown,
  sourceKey: "created_at" | "requested_at" | "updated_at",
  outputKey: "createdAt" | "requestedAt" | "updatedAt",
) {
  const cursor = record(value);
  const timestamp = nullableString(field(cursor, sourceKey));
  const id = nullableString(field(cursor, "id"));
  return timestamp && id
    ? Buffer.from(
        JSON.stringify({
          [outputKey]: timestamp,
          id,
        }),
      ).toString("base64url")
    : null;
}

export function parseBinderDetail(
  detailValue: unknown,
  checklistValue: unknown,
  activityValue: unknown,
  membersValue: unknown,
  copiesValue: unknown,
  bulkPreviewValue: unknown = null,
  pendingContributionsValue: unknown = null,
  joinRequestsValue: unknown = null,
  customEditorValue: unknown = null,
): BinderDetail {
  const envelope = record(detailValue);
  const binder = record(envelope.binder);
  const viewer = record(envelope.viewer);
  const consent = record(envelope.consent);
  const permissions = record(envelope.permissions);
  const memberSummary = record(envelope.member_summary);
  const progressEnvelope = record(envelope.progress);
  const memberProgress = parseProgress(nested(progressEnvelope, "member"));
  const externalProgress = parseProgress(nested(progressEnvelope, "external"));
  const checklistEnvelope = record(checklistValue);
  const membersEnvelope = record(membersValue);
  const activityEnvelope = record(activityValue);
  const copiesEnvelope = record(copiesValue);
  const pendingContributionsEnvelope = record(pendingContributionsValue);
  const joinRequestsEnvelope = record(joinRequestsValue);
  const customEditorEnvelope = record(customEditorValue);
  const summary = parseSummary({
    ...binder,
    role: field(viewer, "role"),
    completed_slots: memberProgress.completed,
    total_slots: memberProgress.total,
    progress: {
      completed_slots: memberProgress.completed,
      total_slots: memberProgress.total,
      unit: memberProgress.unit,
    },
    member_count: field(memberSummary, "member_count", "contributor_count"),
  });
  return {
    ...summary,
    coverCardPrintId: nullableString(field(binder, "cover_card_print_id")),
    moderationState: parseModerationState(field(binder, "moderation_state")),
    targetLabel: string(
      field(record(binder.target), "label", "name") ?? field(binder, "target_label"),
      "Collection goal",
    ),
    checklistMode:
      binder.checklist_mode === "master_variants" ||
      binder.checklist_mode === "master_set" ||
      binder.checklist_mode === "custom"
        ? binder.checklist_mode
        : "card_prints",
    readAccess:
      binder.read_access === "link" || binder.read_access === "public"
        ? binder.read_access
        : "private",
    discoverability: binder.discoverability === "listed" ? "listed" : "unlisted",
    joinPolicy:
      binder.join_policy === "invite_only" || binder.join_policy === "request_to_join"
        ? binder.join_policy
        : "closed",
    contributionPolicy:
      binder.contribution_policy === "members_direct" ||
      binder.contribution_policy === "approval_required"
        ? binder.contribution_policy
        : "owner_only",
    canEdit: boolean(field(permissions, "edit_metadata", "can_edit")),
    canManageMembers: boolean(field(permissions, "manage_members", "can_manage_members")),
    canContribute: boolean(field(permissions, "contribute", "can_contribute")),
    canManagePolicy: boolean(field(permissions, "manage_policy", "can_manage_policy")),
    canTransfer: boolean(field(permissions, "transfer_ownership", "can_transfer")),
    canArchive: boolean(field(permissions, "archive", "can_archive")),
    canInvite: boolean(field(permissions, "can_invite")),
    canApprove: boolean(field(permissions, "can_approve")),
    canShare: boolean(field(permissions, "can_share")),
    canLeave: boolean(field(permissions, "can_leave")),
    viewerMembershipPublicId: string(
      field(viewer, "membership_public_id", "member_id"),
    ),
    viewerAlias: nullableString(field(viewer, "alias")),
    viewerContentScope: parseConsent(field(consent, "content_scope")),
    viewerIdentityScope: parseConsent(field(consent, "identity_scope")),
    viewerNotificationPreference: parseNotificationPreference(
      field(viewer, "notification_preference") ??
        field(consent, "notification_preference"),
    ),
    externalCompletedSlots: externalProgress.completed,
    externalTotalSlots: externalProgress.total,
    externalProgressUnit: externalProgress.unit,
    checklist: list(record(checklistValue).items).map(parseChecklistSlot),
    activity: list(record(activityValue).items).map(parseActivity),
    members: list(record(membersValue).items).map(parseMember),
    eligibleCopies: list(record(copiesValue).items).map(parseEligibleCopy),
    bulkPreview: bulkPreviewValue ? parseBulkPreview(bulkPreviewValue) : null,
    customEditorSlots: list(customEditorEnvelope.items).map(parseChecklistSlot),
    pendingContributionCount: number(
      field(memberSummary, "pending_contribution_count"),
    ),
    pendingJoinRequestCount: number(field(memberSummary, "pending_join_request_count")),
    pendingContributions: list(
      field(pendingContributionsEnvelope, "items", "pending_contributions"),
    ).map((value) => {
      const item = record(value);
      const card = record(item.card);
      return {
        contributionPublicId: string(
          field(item, "contribution_public_id", "contribution_id"),
        ),
        title: string(
          field(item, "title", "card_name") ?? field(card, "name", "title"),
          "Pending copy",
        ),
        memberLabel: string(field(item, "member_label", "contributor_label"), "Binder member"),
        canDecide: boolean(field(item, "can_decide")),
        canRemove: boolean(field(item, "can_remove")),
      };
    }),
    pendingJoinRequests: list(
      field(joinRequestsEnvelope, "items", "join_requests"),
    ).map((value) => {
      const item = record(value);
      return {
        requestPublicId: string(field(item, "request_public_id", "request_id")),
        memberLabel: string(field(item, "member_label", "requester_label"), "Collector"),
        requestedRole:
          item.requested_role === "manager" || item.requested_role === "viewer"
            ? item.requested_role
            : "contributor",
        canDecide: boolean(field(item, "can_decide")),
      };
    }),
    invitations: list(envelope.invitations).map((value) => {
      const item = record(value);
      return {
        invitationPublicId: string(field(item, "invitation_id", "id")),
        role:
          item.maximum_role === "manager" || item.maximum_role === "viewer"
            ? item.maximum_role
            : "contributor",
        accountTargeted: boolean(field(item, "is_account_targeted")),
        expiresAt: nullableString(field(item, "expires_at")),
      };
    }),
    viewLinks: list(envelope.view_links).map((value) => {
      const item = record(value);
      return {
        viewLinkPublicId: string(field(item, "view_link_id", "id")),
        label: string(field(item, "label"), "View-only link"),
        expiresAt: nullableString(field(item, "expires_at")),
      };
    }),
    ownerTransferOffer: (() => {
      const item = record(envelope.owner_transfer_offer);
      const offerPublicId = nullableString(field(item, "offer_id", "id"));
      if (!offerPublicId) {
        return null;
      }
      return {
        offerPublicId,
        targetMemberPublicId: string(field(item, "target_member_id")),
        formerOwnerRole:
          item.former_owner_role === "contributor" ||
          item.former_owner_role === "viewer" ||
          item.former_owner_role === "leave"
            ? item.former_owner_role
            : "manager",
        isTargetViewer: boolean(field(item, "is_target_viewer")),
        expiresAt: nullableString(field(item, "expires_at")),
      };
    })(),
    checklistNextCursor: positionCursor(checklistEnvelope.next_position),
    pendingContributionsNextCursor: timeCursor(
      pendingContributionsEnvelope.next_cursor,
      "created_at",
      "createdAt",
    ),
    activityNextCursor: (() => {
      const cursor = record(activityEnvelope.next_cursor);
      const createdAt = nullableString(field(cursor, "created_at", "before_created_at"));
      const id = nullableString(field(cursor, "id", "before_id"));
      return createdAt && id
        ? Buffer.from(JSON.stringify({ createdAt, id })).toString("base64url")
        : null;
    })(),
    membersNextCursor: (() => {
      const cursor = record(membersEnvelope.next_cursor);
      const id = nullableString(
        field(cursor, "member_id", "after_member_id") ??
          field(membersEnvelope, "next_member_id"),
      );
      return id
        ? Buffer.from(JSON.stringify({ id })).toString("base64url")
        : null;
    })(),
    pendingJoinRequestsNextCursor: timeCursor(
      joinRequestsEnvelope.next_cursor,
      "requested_at",
      "requestedAt",
    ),
    eligibleCopiesNextCursor: null,
    stalePermission: boolean(field(viewer, "stale_permission", "access_revoked")),
    loadedAt: nullableString(field(envelope, "loaded_at")) ?? new Date().toISOString(),
  };
}

export function parsePublicProjection(
  value: unknown,
  checklistValue?: unknown,
  audience: Exclude<ExternalProjectionAudience, "template"> = "public",
): BinderPublicProjection {
  const envelope = record(value);
  const binder = record(envelope.binder);
  const progress = parseProgress(envelope.progress);
  const memberSummary = record(envelope.member_summary);
  const viewer = record(envelope.viewer);
  const permissions = record(envelope.permissions);
  const checklistEnvelope = checklistValue === undefined
    ? record(envelope.checklist_page)
    : record(checklistValue);
  const checklistItems = checklistValue === undefined
    ? list(envelope.checklist)
    : list(checklistEnvelope.items);
  const nextPosition =
    field(checklistEnvelope, "next_position") ?? field(envelope, "next_position");
  const moderationApproved =
    binder.moderated === true &&
    (!("moderation_approved" in binder) ||
      binder.moderation_approved === true);
  return {
    publicId: opaqueUuid(field(binder, "public_id")) ?? "",
    title: boundedString(binder.title, "Binder", 80),
    description: boundedNullableString(binder.description, 1000),
    coverImageUrl: safeCanonicalBinderImageUrl(
      field(binder, "cover_image_url", "cover"),
    ),
    targetLabel: boundedString(
      field(record(binder.target), "label", "name") ?? field(binder, "target_label"),
      "Collection goal",
      160,
    ),
    completedSlots: boundedWholeNumber(progress.completed, 0, 0, 1000),
    totalSlots: boundedWholeNumber(progress.total, 0, 0, 1000),
    progressUnit: progress.unit,
    memberCount: boundedWholeNumber(
      field(memberSummary, "contributor_count", "member_count"),
      0,
      0,
      50,
    ),
    listed: binder.discoverability === "listed",
    moderated: moderationApproved,
    canRequestToJoin:
      audience === "public" && boolean(field(viewer, "can_request_to_join")),
    canReport: audience === "public" && boolean(field(permissions, "can_report")),
    canBlockOwner:
      audience === "public" && boolean(field(permissions, "can_block_owner")),
    joinRequestPublicId:
      audience === "public"
        ? opaqueUuid(field(viewer, "join_request_id"))
        : null,
    joinRequestStatus:
      audience === "public" &&
      (viewer.join_request_status === "pending" ||
        viewer.join_request_status === "approved" ||
        viewer.join_request_status === "rejected")
        ? viewer.join_request_status
        : "none",
    checklist: checklistItems
      .slice(0, 50)
      .map((item) => parsePublicChecklistSlot(item, audience))
      .filter((item): item is BinderChecklistSlot => item !== null),
    checklistNextCursor: positionCursor(nextPosition),
  };
}

export function parseInvitationPreview(value: unknown): BinderInvitationPreview {
  const envelope = record(value);
  const invitation = record(envelope.invitation);
  const binder = record(envelope.binder);
  const state = field(invitation, "state", "status");
  return {
    state:
      state === "active" ||
      state === "expired" ||
      state === "revoked" ||
      state === "accepted" ||
      state === "declined" ||
      state === "ineligible"
        ? state
        : "ineligible",
    binderTitle: boundedNullableString(binder.title, 80),
    inviterLabel: boundedNullableString(
      field(invitation, "inviter_label"),
      80,
    ),
    role:
      invitation.role === "manager" ||
      invitation.role === "contributor" ||
      invitation.role === "viewer"
        ? invitation.role
        : null,
    expiresAt: boundedNullableString(invitation.expires_at, 64),
    privacyCopy: boundedString(
      field(envelope, "privacy_copy"),
      "Cards stay in each collector's Vault. The Binder combines only the copies members choose to contribute.",
      1000,
    ),
  };
}

function parseTemplateSummary(value: unknown): BinderTemplateSummary {
  const item = record(value);
  const adoptionCount = boundedWholeNumber(
    field(item, "adoption_count"),
    -1,
    0,
    1_000_000,
  );
  return {
    templatePublicId:
      opaqueUuid(field(item, "template_public_id", "public_id")) ?? "",
    title: boundedString(field(item, "title", "name"), "Binder template", 80),
    description: boundedNullableString(item.description, 1000),
    coverImageUrl: safeCanonicalBinderImageUrl(
      field(item, "cover_image_url", "cover"),
    ),
    checklistSlotCount: boundedWholeNumber(
      field(item, "checklist_slot_count", "slot_count"),
      0,
      0,
      1000,
    ),
    adoptionCount: adoptionCount >= 5 ? adoptionCount : null,
    version: boundedWholeNumber(
      field(item, "version", "version_number"),
      1,
      1,
      1_000_000,
    ),
  };
}

export function parseTemplates(value: unknown) {
  return list(record(value).items)
    .slice(0, 20)
    .map(parseTemplateSummary)
    .filter((item) => Boolean(item.templatePublicId));
}

export function parseTemplateDetail(
  value: unknown,
  checklistValue?: unknown,
): BinderTemplateDetail {
  const envelope = record(value);
  const template = parseTemplateSummary(envelope.template ?? envelope);
  const rawTemplate = record(envelope.template ?? envelope);
  const checklistEnvelope = checklistValue === undefined
    ? record(envelope.checklist_page)
    : record(checklistValue);
  return {
    ...template,
    targetLabel: boundedString(
      field(record(rawTemplate.target), "label", "name") ??
        field(rawTemplate, "target_label"),
      "Collection goal",
      160,
    ),
    checklist:
      checklistValue === undefined
        ? list(envelope.checklist)
            .slice(0, 50)
            .map((item) => parsePublicChecklistSlot(item, "template"))
            .filter((item): item is BinderChecklistSlot => item !== null)
        : list(checklistEnvelope.items)
            .slice(0, 50)
            .map((item) => parsePublicChecklistSlot(item, "template"))
            .filter((item): item is BinderChecklistSlot => item !== null),
    checklistNextCursor: positionCursor(
      field(checklistEnvelope, "next_position") ?? field(envelope, "next_position"),
    ),
  };
}

export function parseExplore(value: unknown): BinderExploreResult {
  const envelope = record(value);
  const cursor = record(envelope.next_cursor);
  const beforeId = boundedNullableString(cursor.id, 100);
  const beforeCreatedAt = boundedNullableString(cursor.created_at, 64);
  return {
    items: list(envelope.items)
      .slice(0, 20)
      .map((item) => parsePublicProjection(item, undefined, "public"))
      .filter(
        (item) => Boolean(item.publicId) && item.listed && item.moderated,
      ),
    nextCursor:
      beforeId && beforeCreatedAt
        ? Buffer.from(JSON.stringify({ beforeId, beforeCreatedAt })).toString("base64url")
        : null,
  };
}

export function parseLegacyCandidates(value: unknown): BinderLegacyCandidate[] {
  return list(field(record(value), "items", "candidates")).map((value) => {
    const item = record(value);
    return {
      watchPublicId: string(field(item, "watch_id", "source_watch_id")),
      targetKind: item.target_kind === "set" ? "set" : "species",
      targetId: string(field(item, "target_id")),
      title: string(field(item, "title"), "Collection goal"),
      routeKey: nullableString(field(item, "route_key")),
      imageUrl: nullableString(field(item, "image_url")),
    };
  });
}

export function parseBulkPreview(value: unknown): BinderBulkPreview {
  const envelope = record(value);
  return {
    eligibleCount: number(field(envelope, "eligible_count")),
    duplicateCount: number(field(envelope, "duplicate_count")),
    unresolvedCount: number(field(envelope, "unresolved_count")),
    ineligibleCount: number(field(envelope, "ineligible_count")),
    eligibleCopies: list(envelope.items)
      .map(parseEligibleCopy)
      .filter((copy) => copy.eligible),
    // Bulk preview stays one bounded server page. Exact Vault instance IDs are
    // never encoded into a browser URL or analytics-visible query string.
    nextCursor: null,
  };
}

async function rpc(
  supabase: SupabaseClient,
  name: BinderReadRpcName,
  args: Record<string, unknown> = {},
) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const normalized = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    const code = normalized.includes("not found")
      ? "not_found"
      : normalized.includes("permission") ||
          normalized.includes("forbidden") ||
          normalized.includes("access")
        ? "access_denied"
        : normalized.includes("expired")
          ? "expired"
          : "unavailable";
    throw new BinderRpcError(code, "Binder data is temporarily unavailable.");
  }

  const envelope = record(data);
  if (envelope.ok === false) {
    throw new BinderRpcError(
      string(envelope.code, "unavailable"),
      "Binder data is temporarily unavailable.",
    );
  }

  return data;
}

function decodeCursor<T extends JsonRecord>(cursor?: string | null): Partial<T> {
  try {
    return cursor && cursor.length <= 512
      ? (record(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))) as Partial<T>)
      : {};
  } catch {
    return {};
  }
}

export async function getBinderDashboard(
  supabase: SupabaseClient,
  cursor?: string | null,
  invitationCursor?: string | null,
  suspendedCursor?: string | null,
) {
  const parsed = decodeCursor<{ updatedAt: string; id: string }>(cursor);
  const invitationPage = decodeCursor<{ createdAt: string; id: string }>(
    invitationCursor,
  );
  const suspendedPage = decodeCursor<{ updatedAt: string; id: string }>(
    suspendedCursor,
  );
  const [dashboard, invitations, suspended] = await Promise.all([
    rpc(supabase, BINDER_READ_RPC.dashboard, {
      p_limit: 20,
      p_before_updated_at:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      p_before_id: typeof parsed.id === "string" ? parsed.id : null,
    }),
    rpc(supabase, BINDER_READ_RPC.invitationInbox, {
      p_limit: 20,
      p_before_created_at:
        typeof invitationPage.createdAt === "string"
          ? invitationPage.createdAt
          : null,
      p_before_id:
        typeof invitationPage.id === "string" ? invitationPage.id : null,
    }),
    rpc(supabase, BINDER_READ_RPC.suspendedBinders, {
      p_limit: 20,
      p_before_updated_at:
        typeof suspendedPage.updatedAt === "string"
          ? suspendedPage.updatedAt
          : null,
      p_before_id:
        typeof suspendedPage.id === "string" ? suspendedPage.id : null,
    }),
  ]);
  return parseBinderDashboard(
    dashboard,
    invitations,
    suspended,
  );
}

async function getCompleteCustomChecklist(
  supabase: SupabaseClient,
  publicId: string,
) {
  const items: unknown[] = [];
  let afterPosition: number | null = null;

  for (let page = 0; page < 20; page += 1) {
    const value = await rpc(supabase, BINDER_READ_RPC.checklist, {
      p_public_id: publicId,
      p_filter: "all",
      p_limit: 50,
      p_after_position: afterPosition,
    });
    const envelope = record(value);
    items.push(...list(envelope.items));
    const nextPosition = field(envelope, "next_position");
    if (typeof nextPosition !== "number" || !Number.isFinite(nextPosition)) {
      return { items };
    }
    if (afterPosition !== null && nextPosition <= afterPosition) {
      throw new BinderRpcError(
        "unavailable",
        "The custom checklist could not be loaded safely.",
      );
    }
    afterPosition = nextPosition;
  }

  throw new BinderRpcError(
    "unavailable",
    "The custom checklist exceeded its bounded editor limit.",
  );
}

export async function getBinderDetail(
  supabase: SupabaseClient,
  publicId: string,
  options: {
    tab?: "checklist" | "activity" | "members" | "settings";
    cursor?: string | null;
    queueCursor?: string | null;
    filter?:
      | "all"
      | "in_binder"
      | "missing"
      | "in_your_vault"
      | "contributed_by_you"
      | "needs_review";
    includeEligibleCopies?: boolean;
    includeBulkPreview?: boolean;
    includeCustomEditor?: boolean;
  } = {},
) {
  const args = { p_public_id: publicId };
  const tab = options.tab ?? "checklist";
  const cursor = decodeCursor<{
    position: number;
    createdAt: string;
    id: string;
  }>(options.cursor);
  const queueCursor = decodeCursor<{
    createdAt: string;
    requestedAt: string;
    id: string;
  }>(options.queueCursor);
  // Establish the caller's current authority before issuing role-scoped queue
  // reads. This prevents contributors from probing management-only RPCs.
  const detail = await rpc(supabase, BINDER_READ_RPC.detail, args);
  const canApprove = boolean(
    field(record(record(detail).permissions), "can_approve"),
  );
  const detailBinder = record(record(detail).binder);
  const detailViewer = record(record(detail).viewer);
  const canLoadCustomEditor =
    options.includeCustomEditor === true &&
    detailBinder.target_kind === "custom" &&
    detailViewer.role === "owner";
  const checklistPromise =
    tab === "checklist"
      ? rpc(supabase, BINDER_READ_RPC.checklist, {
          ...args,
          p_filter: options.filter ?? "all",
          p_limit: 50,
          p_after_position:
            typeof cursor.position === "number" ? cursor.position : null,
        })
      : Promise.resolve({ items: [] });
  const activityPromise =
    tab === "activity"
      ? rpc(supabase, BINDER_READ_RPC.activity, {
          ...args,
          p_limit: 50,
          p_before_created_at:
            typeof cursor.createdAt === "string" ? cursor.createdAt : null,
          p_before_id: typeof cursor.id === "string" ? cursor.id : null,
        })
      : Promise.resolve({ items: [] });
  const membersPromise =
    tab === "members"
      ? rpc(supabase, BINDER_READ_RPC.members, {
          ...args,
          p_limit: 50,
          p_after_member_id: typeof cursor.id === "string" ? cursor.id : null,
        })
      : Promise.resolve({ items: [] });
  const copiesPromise =
    tab === "checklist" && options.includeEligibleCopies
      ? rpc(supabase, BINDER_READ_RPC.eligibleCopies, {
          ...args,
          p_limit: 50,
          p_after_created_at: null,
          p_after_instance_id: null,
        })
      : Promise.resolve({ items: [] });
  const bulkPreviewPromise =
    tab === "checklist" && options.includeBulkPreview
      ? rpc(supabase, BINDER_READ_RPC.bulkPreview, {
          ...args,
          p_limit: 100,
          p_after_created_at: null,
          p_after_instance_id: null,
        })
      : Promise.resolve(null);
  const pendingContributionsPromise =
    tab === "checklist" && canApprove
      ? rpc(supabase, BINDER_READ_RPC.pendingContributions, {
          ...args,
          p_limit: 20,
          p_before_created_at:
            typeof queueCursor.createdAt === "string"
              ? queueCursor.createdAt
              : null,
          p_before_id:
            typeof queueCursor.id === "string" ? queueCursor.id : null,
        })
      : Promise.resolve({ items: [] });
  const joinRequestsPromise =
    tab === "members" && canApprove
      ? rpc(supabase, BINDER_READ_RPC.joinRequestsQueue, {
          ...args,
          p_limit: 20,
          p_before_requested_at:
            typeof queueCursor.requestedAt === "string"
              ? queueCursor.requestedAt
              : null,
          p_before_id:
            typeof queueCursor.id === "string" ? queueCursor.id : null,
        })
      : Promise.resolve({ items: [] });
  const customEditorPromise = canLoadCustomEditor
    ? getCompleteCustomChecklist(supabase, publicId)
    : Promise.resolve({ items: [] });
  const settled = await Promise.allSettled([
    checklistPromise,
    activityPromise,
    membersPromise,
    copiesPromise,
    bulkPreviewPromise,
    pendingContributionsPromise,
    joinRequestsPromise,
    customEditorPromise,
  ]);
  if (canLoadCustomEditor && settled[7]?.status === "rejected") {
    throw settled[7].reason;
  }
  const valueAt = (index: number, fallback: unknown) => {
    const result = settled[index];
    return result?.status === "fulfilled" ? result.value : fallback;
  };
  const parsedDetail = parseBinderDetail(
    detail,
    valueAt(0, { items: [] }),
    valueAt(1, { items: [] }),
    valueAt(2, { items: [] }),
    valueAt(3, { items: [] }),
    valueAt(4, null),
    valueAt(5, { items: [] }),
    valueAt(6, { items: [] }),
    valueAt(7, { items: [] }),
  );
  if (settled.some((result) => result.status === "rejected")) {
    parsedDetail.stalePermission = true;
  }
  return parsedDetail;
}

export async function getBinderInvitationPreview(
  supabase: SupabaseClient,
  token: string,
) {
  return parseInvitationPreview(
    await rpc(supabase, BINDER_READ_RPC.invitationPreview, { p_token: token }),
  );
}

export async function getBinderPublicDetail(
  supabase: SupabaseClient,
  publicId: string,
  cursor?: string | null,
) {
  const parsed = decodeCursor<{ position: number }>(cursor);
  const [detail, checklist] = await Promise.all([
    rpc(supabase, BINDER_READ_RPC.publicDetail, { p_public_id: publicId }),
    typeof parsed.position === "number"
      ? rpc(supabase, BINDER_READ_RPC.publicChecklist, {
          p_public_id: publicId,
          p_limit: 50,
          p_after_position: parsed.position,
        })
      : Promise.resolve(undefined),
  ]);
  return parsePublicProjection(detail, checklist, "public");
}

export async function getBinderViewLinkDetail(
  supabase: SupabaseClient,
  token: string,
  cursor?: string | null,
) {
  const parsed = decodeCursor<{ position: number }>(cursor);
  const [detail, checklist] = await Promise.all([
    rpc(supabase, BINDER_READ_RPC.viewLinkDetail, { p_token: token }),
    typeof parsed.position === "number"
      ? rpc(supabase, BINDER_READ_RPC.viewLinkChecklist, {
          p_token: token,
          p_limit: 50,
          p_after_position: parsed.position,
        })
      : Promise.resolve(undefined),
  ]);
  return parsePublicProjection(detail, checklist, "link");
}

export async function getBinderExplore(
  supabase: SupabaseClient,
  cursor?: string | null,
) {
  const parsed = decodeCursor<{
    beforeId: string;
    beforeCreatedAt: string;
  }>(cursor);
  return parseExplore(
    await rpc(supabase, BINDER_READ_RPC.explore, {
      p_limit: 20,
      p_before_created_at: boundedNullableString(
        parsed.beforeCreatedAt,
        64,
      ),
      p_before_id: boundedNullableString(parsed.beforeId, 100),
    }),
  );
}

export async function getBinderTemplates(supabase: SupabaseClient) {
  return parseTemplates(
    await rpc(supabase, BINDER_READ_RPC.templates, {
      p_limit: 20,
      p_before_created_at: null,
      p_before_id: null,
    }),
  );
}

export async function getBinderTemplateDetail(
  supabase: SupabaseClient,
  publicId: string,
  cursor?: string | null,
) {
  const parsed = decodeCursor<{ position: number }>(cursor);
  const [detail, checklist] = await Promise.all([
    rpc(supabase, BINDER_READ_RPC.templateDetail, { p_public_id: publicId }),
    typeof parsed.position === "number"
      ? rpc(supabase, BINDER_READ_RPC.templateChecklist, {
          p_public_id: publicId,
          p_version: null,
          p_limit: 50,
          p_after_position: parsed.position,
        })
      : Promise.resolve(undefined),
  ]);
  return parseTemplateDetail(detail, checklist);
}

export async function getBinderLegacyCandidates(supabase: SupabaseClient) {
  return parseLegacyCandidates(
    await rpc(supabase, BINDER_READ_RPC.legacyCandidates),
  );
}
