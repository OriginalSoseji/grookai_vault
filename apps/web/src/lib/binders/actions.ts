"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { getSiteOrigin, GROOKAI_VAULT_ORIGIN } from "@/lib/getSiteOrigin";
import { getBinderFeatureFlags, isBinderLibraryEnabled } from "./featureFlags";
import { BINDER_MUTATION_RPC, type BinderMutationRpcName } from "./rpcContract";
import type { BinderActionState } from "./types";

type JsonRecord = Record<string, unknown>;

// Binder public IDs preserve all 128 cryptographically random bits. They use
// PostgreSQL's UUID storage/transport shape but intentionally do not reserve
// RFC version or variant bits.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,200}$/;

function text(formData: FormData, name: string, maxLength = 2000) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function nullableText(formData: FormData, name: string, maxLength = 2000) {
  return text(formData, name, maxLength) || null;
}

function oneOf<T extends string>(
  value: string,
  values: readonly T[],
  fallback: T,
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function uuid(value: string) {
  return UUID_PATTERN.test(value) ? value : null;
}

function uuidList(value: string) {
  return value
    .split(",")
    .map((item) => uuid(item.trim()))
    .filter((item): item is string => Boolean(item))
    .slice(0, 100);
}

function jsonArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function idempotencyKey(formData: FormData) {
  const value = text(formData, "idempotencyKey", 200);
  return IDEMPOTENCY_KEY_PATTERN.test(value) ? value : null;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function safeMessage(code: string) {
  switch (code) {
    case "access_denied":
    case "forbidden":
      return "Your access changed. Refresh the Binder before trying again.";
    case "conflict":
    case "duplicate":
      return "That change conflicts with newer Binder activity. Refresh and try again.";
    case "expired":
      return "This invitation or link has expired.";
    case "revoked":
      return "This invitation or link is no longer active.";
    case "rate_limited":
      return "Please wait a moment before trying again.";
    case "validation":
    case "invalid":
      return "Check the information and try again.";
    default:
      return "The Binder could not be updated. Nothing was changed.";
  }
}

async function mutate(
  rpcName: BinderMutationRpcName,
  args: Record<string, unknown>,
  stableIdempotencyKey: string | null,
  nextPath = "/binders",
): Promise<BinderActionState & { binderPublicId?: string; value?: JsonRecord }> {
  if (!isBinderLibraryEnabled()) {
    return {
      ok: false,
      code: "disabled",
      message: "Binders are not available yet.",
    };
  }

  if (!stableIdempotencyKey) {
    return {
      ok: false,
      code: "validation",
      message: "This form expired. Refresh the page and try again.",
    };
  }

  const { supabase } = await requireServerUser(nextPath);
  const { data, error } = await supabase.rpc(rpcName, {
    ...args,
    p_idempotency_key: stableIdempotencyKey,
  });

  if (error) {
    const normalized = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    const code = normalized.includes("permission") || normalized.includes("access")
      ? "access_denied"
      : normalized.includes("rate") || normalized.includes("limit")
        ? "rate_limited"
        : normalized.includes("invalid") || normalized.includes("validation")
          ? "validation"
      : normalized.includes("duplicate")
        ? "duplicate"
        : normalized.includes("conflict")
          ? "conflict"
          : normalized.includes("expired")
            ? "expired"
            : "unavailable";
    return { ok: false, code, message: safeMessage(code) };
  }

  const value = record(data);
  if (value.ok === false) {
    const code = typeof value.code === "string" ? value.code : "unavailable";
    return { ok: false, code, message: safeMessage(code) };
  }

  return {
    ok: true,
    message: "Binder updated.",
    binderPublicId:
      typeof value.binder_public_id === "string" ? value.binder_public_id : undefined,
    value,
  };
}

function revalidateBinder(publicId?: string | null) {
  revalidatePath("/binders");
  if (publicId) {
    revalidatePath(`/binders/${encodeURIComponent(publicId)}`);
  }
  revalidatePath("/binders/explore");
}

export async function createBinderAction(
  _previousState: BinderActionState | null,
  formData: FormData,
): Promise<BinderActionState> {
  const flags = getBinderFeatureFlags();
  const targetKind = oneOf(
    text(formData, "targetKind", 20),
    ["species", "set", "custom"] as const,
    "species",
  );
  if (
    (targetKind === "set" && !flags.setBinders) ||
    (targetKind === "custom" && !flags.customBinders)
  ) {
    return {
      ok: false,
      code: "disabled",
      message: "That Binder type is not available yet.",
    };
  }

  const title = text(formData, "title", 80);
  const speciesId = nullableText(formData, "speciesId", 80);
  const setId = nullableText(formData, "setId", 80);
  const customSlots =
    targetKind === "custom"
      ? jsonArray(text(formData, "customSlotsJson", 300000))
      : [];
  if (
    !title ||
    (targetKind === "species" && !speciesId) ||
    (targetKind === "set" && !setId) ||
    (targetKind === "custom" &&
      (!customSlots ||
        customSlots.length === 0 ||
        customSlots.length > 1000 ||
        text(formData, "customChecklistConfirmation", 20) !== "confirmed"))
  ) {
    return { ok: false, code: "validation", message: "Add a Binder name and target." };
  }

  const result = await mutate(BINDER_MUTATION_RPC.create, {
    p_title: title,
    p_description: nullableText(formData, "description", 1000),
    p_target_kind: targetKind,
    p_checklist_mode: oneOf(
      text(formData, "checklistMode", 30),
      ["card_prints", "master_variants", "master_set", "custom"] as const,
      "card_prints",
    ),
    p_species_id: speciesId,
    p_set_id: setId,
    p_cover_card_print_id: nullableText(formData, "coverCardPrintId", 100),
    p_custom_slots: customSlots ?? [],
  }, idempotencyKey(formData));

  if (!result.ok || !result.binderPublicId) {
    return result;
  }

  revalidateBinder(result.binderPublicId);
  redirect(`/binders/${encodeURIComponent(result.binderPublicId)}`);
}

export type BinderFormAction =
  | "update_metadata"
  | "update_policy"
  | "archive"
  | "restore"
  | "delete"
  | "invite"
  | "invite_respond"
  | "invite_revoke"
  | "view_link_create"
  | "view_link_rotate"
  | "view_link_revoke"
  | "join_decide"
  | "join_withdraw"
  | "member_role"
  | "member_suspend"
  | "member_reinstate"
  | "member_remove"
  | "leave"
  | "preferences"
  | "contribution_add"
  | "contribution_withdraw"
  | "contribution_decide"
  | "contribution_remove"
  | "bulk_add"
  | "custom_revision_publish"
  | "owner_transfer_offer"
  | "owner_transfer_accept"
  | "owner_transfer_revoke"
  | "template_submit"
  | "template_clone"
  | "legacy_decide"
  | "pulse_share";

export async function binderFormAction(
  _previousState: BinderActionState | null,
  formData: FormData,
): Promise<BinderActionState> {
  const action = text(formData, "binderAction", 60) as BinderFormAction;
  const publicId = text(formData, "publicId", 100);
  const flags = getBinderFeatureFlags();
  let rpcName: BinderMutationRpcName;
  let args: Record<string, unknown>;
  let successMessage = "Binder updated.";

  switch (action) {
    case "update_metadata":
      rpcName = BINDER_MUTATION_RPC.updateMetadata;
      args = {
        p_public_id: publicId,
        p_title: text(formData, "title", 80),
        p_description: nullableText(formData, "description", 1000),
        p_cover_card_print_id: nullableText(formData, "coverCardPrintId", 100),
      };
      successMessage = "Binder details saved.";
      break;
    case "update_policy":
      rpcName = BINDER_MUTATION_RPC.updatePolicy;
      args = {
        p_public_id: publicId,
        p_read_access: oneOf(
          text(formData, "readAccess", 20),
          ["private", "link", "public"] as const,
          "private",
        ),
        p_discoverability: oneOf(
          text(formData, "discoverability", 20),
          ["unlisted", "listed"] as const,
          "unlisted",
        ),
        p_join_policy: oneOf(
          text(formData, "joinPolicy", 30),
          ["closed", "invite_only", "request_to_join"] as const,
          "closed",
        ),
        p_contribution_policy: oneOf(
          text(formData, "contributionPolicy", 30),
          ["owner_only", "members_direct", "approval_required"] as const,
          "owner_only",
        ),
      };
      if (
        (args.p_read_access === "link" && !flags.viewLinks) ||
        (args.p_read_access === "public" && !flags.publicBinders) ||
        (args.p_discoverability === "listed" &&
          (!flags.publicBinders || !flags.community)) ||
        (args.p_join_policy === "request_to_join" && !flags.community) ||
        (args.p_join_policy === "invite_only" && !flags.shared) ||
        (args.p_contribution_policy !== "owner_only" && !flags.shared)
      ) {
        return {
          ok: false,
          code: "disabled",
          message: "That sharing option is not available yet.",
        };
      }
      successMessage = "Binder sharing settings saved.";
      break;
    case "archive":
    case "restore":
      rpcName = BINDER_MUTATION_RPC.setLifecycle;
      args = { p_public_id: publicId, p_lifecycle: action === "archive" ? "archived" : "active" };
      successMessage = action === "archive" ? "Binder archived." : "Binder restored.";
      break;
    case "delete":
      rpcName = BINDER_MUTATION_RPC.delete;
      args = {
        p_public_id: publicId,
        p_confirmation: text(formData, "confirmation", 120),
      };
      successMessage = "Binder deleted.";
      break;
    case "invite":
      if (!flags.shared) {
        return { ok: false, code: "disabled", message: "Shared Binders are not available yet." };
      }
      rpcName = BINDER_MUTATION_RPC.inviteCreate;
      args = {
        p_public_id: publicId,
        p_max_role: oneOf(
          text(formData, "role", 20),
          ["manager", "contributor", "viewer"] as const,
          "contributor",
        ),
        p_recipient_user_id: uuid(text(formData, "recipientUserId", 80)),
        p_expires_at: nullableText(formData, "expiresAt", 80),
      };
      successMessage = "Invitation created.";
      break;
    case "invite_respond":
      rpcName = BINDER_MUTATION_RPC.inviteRespond;
      args = {
        p_invitation_id: uuid(text(formData, "invitationId", 80)),
        p_decision: oneOf(
          text(formData, "decision", 20),
          ["accept", "decline"] as const,
          "decline",
        ),
      };
      if (args.p_decision === "accept" && !flags.shared) {
        return {
          ok: false,
          code: "disabled",
          message: "Shared Binders are not available yet.",
        };
      }
      successMessage =
        args.p_decision === "accept" ? "Invitation accepted." : "Invitation declined.";
      break;
    case "invite_revoke":
      rpcName = BINDER_MUTATION_RPC.inviteRevoke;
      args = { p_invitation_id: uuid(text(formData, "invitationId", 80)) };
      successMessage = "Invitation revoked.";
      break;
    case "view_link_create":
    case "view_link_rotate":
    case "view_link_revoke":
      if (!flags.viewLinks) {
        return { ok: false, code: "disabled", message: "View-only links are not available yet." };
      }
      rpcName =
        action === "view_link_create"
          ? BINDER_MUTATION_RPC.viewLinkCreate
          : action === "view_link_rotate"
            ? BINDER_MUTATION_RPC.viewLinkRotate
            : BINDER_MUTATION_RPC.viewLinkRevoke;
      args =
        action === "view_link_create"
          ? {
              p_public_id: publicId,
              p_label: nullableText(formData, "label", 80),
              p_expires_at: nullableText(formData, "expiresAt", 80),
            }
          : { p_view_link_id: uuid(text(formData, "viewLinkId", 80)) };
      successMessage =
        action === "view_link_revoke"
          ? "View-only link revoked."
          : action === "view_link_rotate"
            ? "View-only link rotated. The old link no longer works."
            : "View-only link created.";
      break;
    case "join_decide":
      if (!flags.community) {
        return {
          ok: false,
          code: "disabled",
          message: "Community joining is not available yet.",
        };
      }
      rpcName = BINDER_MUTATION_RPC.joinRequestDecide;
      args = {
        p_request_id: uuid(text(formData, "requestId", 80)),
        p_decision: oneOf(text(formData, "decision", 20), ["approve", "reject"] as const, "reject"),
        p_role: oneOf(
          text(formData, "role", 20),
          ["manager", "contributor", "viewer"] as const,
          "contributor",
        ),
      };
      successMessage = "Join request decided.";
      break;
    case "join_withdraw":
      rpcName = BINDER_MUTATION_RPC.joinRequestWithdraw;
      args = { p_request_id: uuid(text(formData, "requestId", 80)) };
      successMessage = "Join request withdrawn.";
      break;
    case "member_role":
      if (!flags.shared) {
        return { ok: false, code: "disabled", message: "Shared Binders are not available yet." };
      }
      rpcName = BINDER_MUTATION_RPC.memberChangeRole;
      args = {
        p_member_id: uuid(text(formData, "memberId", 80)),
        p_role: oneOf(
          text(formData, "role", 20),
          ["manager", "contributor", "viewer"] as const,
          "viewer",
        ),
      };
      successMessage = "Member role changed.";
      break;
    case "member_suspend":
      if (!flags.shared) {
        return { ok: false, code: "disabled", message: "Shared Binders are not available yet." };
      }
      rpcName = BINDER_MUTATION_RPC.memberSuspend;
      args = {
        p_member_id: uuid(text(formData, "memberId", 80)),
        p_reason: text(formData, "reason", 500),
      };
      successMessage = "Member suspended.";
      break;
    case "member_reinstate":
      if (!flags.shared) {
        return { ok: false, code: "disabled", message: "Shared Binders are not available yet." };
      }
      rpcName = BINDER_MUTATION_RPC.memberReinstate;
      args = { p_member_id: uuid(text(formData, "memberId", 80)) };
      successMessage = "Member reinstated. Previous sharing consent was not restored.";
      break;
    case "member_remove":
      if (!flags.shared) {
        return { ok: false, code: "disabled", message: "Shared Binders are not available yet." };
      }
      rpcName = BINDER_MUTATION_RPC.memberRemove;
      args = {
        p_member_id: uuid(text(formData, "memberId", 80)),
        p_reason: text(formData, "reason", 500),
      };
      successMessage = "Member removed. Their Vault cards were not changed.";
      break;
    case "leave":
      rpcName = BINDER_MUTATION_RPC.leave;
      args = { p_public_id: publicId };
      successMessage = "You left the Binder. Your Vault cards were not changed.";
      break;
    case "preferences":
      const contentScope = oneOf(
        text(formData, "contentScope", 20),
        ["none", "link", "public"] as const,
        "none",
      );
      const identityScope = oneOf(
        text(formData, "identityScope", 20),
        ["none", "link", "public"] as const,
        "none",
      );
      if (
        ((contentScope === "link" || identityScope === "link") &&
          !flags.viewLinks) ||
        ((contentScope === "public" || identityScope === "public") &&
          !flags.publicBinders)
      ) {
        return {
          ok: false,
          code: "disabled",
          message: "That external sharing option is not available yet.",
        };
      }
      rpcName = BINDER_MUTATION_RPC.memberPreferences;
      args = {
        p_public_id: publicId,
        p_alias: nullableText(formData, "alias", 40),
        p_content_scope: contentScope,
        p_identity_scope: identityScope,
        p_notification_preference: oneOf(
          text(formData, "notificationPreference", 20),
          ["immediate", "digest", "muted"] as const,
          "digest",
        ),
      };
      successMessage = "Your Binder preferences were saved.";
      break;
    case "contribution_add":
      rpcName = BINDER_MUTATION_RPC.contributionAdd;
      args = {
        p_public_id: publicId,
        p_vault_item_instance_id: uuid(text(formData, "copyReference", 80)),
        p_source: "manual",
      };
      successMessage = "Your copy was added to the Binder.";
      break;
    case "contribution_withdraw":
      rpcName = BINDER_MUTATION_RPC.contributionWithdraw;
      args = { p_contribution_id: uuid(text(formData, "contributionId", 80)) };
      successMessage = "Contribution removed. The card remains in its owner's Vault.";
      break;
    case "contribution_decide":
      rpcName = BINDER_MUTATION_RPC.contributionDecide;
      args = {
        p_contribution_id: uuid(text(formData, "contributionId", 80)),
        p_decision: oneOf(text(formData, "decision", 20), ["approve", "reject"] as const, "reject"),
      };
      successMessage = "Contribution decided.";
      break;
    case "contribution_remove":
      rpcName = BINDER_MUTATION_RPC.contributionRemove;
      args = {
        p_contribution_id: uuid(text(formData, "contributionId", 80)),
        p_reason: text(formData, "reason", 500) || "Removed by Binder management.",
      };
      successMessage = "Contribution removed. The card remains in its owner's Vault.";
      break;
    case "bulk_add":
      rpcName = BINDER_MUTATION_RPC.bulkAdd;
      args = {
        p_public_id: publicId,
        p_vault_item_instance_ids: uuidList(text(formData, "copyReferences", 8000)),
      };
      successMessage = "Eligible copies were added to the Binder.";
      break;
    case "custom_revision_publish": {
      if (!flags.customBinders) {
        return {
          ok: false,
          code: "disabled",
          message: "Custom Binders are not available yet.",
        };
      }
      const slots = jsonArray(text(formData, "slotsJson", 300000));
      if (
        !slots ||
        slots.length === 0 ||
        slots.length > 1000 ||
        text(formData, "customChecklistConfirmation", 20) !== "confirmed"
      ) {
        return {
          ok: false,
          code: "validation",
          message: "Review and confirm a checklist with 1–1,000 card slots.",
        };
      }
      rpcName = BINDER_MUTATION_RPC.customRevisionPublish;
      args = {
        p_public_id: publicId,
        p_slots: slots,
      };
      successMessage = "Custom checklist revision published.";
      break;
    }
    case "owner_transfer_offer":
      if (!flags.shared) {
        return { ok: false, code: "disabled", message: "Shared Binders are not available yet." };
      }
      rpcName = BINDER_MUTATION_RPC.ownerTransferOffer;
      args = {
        p_public_id: publicId,
        p_target_member_id: uuid(text(formData, "memberId", 80)),
        p_former_owner_role: oneOf(
          text(formData, "formerOwnerRole", 20),
          ["manager", "contributor", "viewer", "leave"] as const,
          "manager",
        ),
        p_expires_at: nullableText(formData, "expiresAt", 80),
      };
      successMessage = "Ownership transfer offered. You remain Owner until it is accepted.";
      break;
    case "owner_transfer_accept":
      rpcName = BINDER_MUTATION_RPC.ownerTransferAccept;
      args = { p_offer_id: uuid(text(formData, "offerId", 80)) };
      successMessage = "Ownership transferred.";
      break;
    case "owner_transfer_revoke":
      rpcName = BINDER_MUTATION_RPC.ownerTransferRevoke;
      args = { p_offer_id: uuid(text(formData, "offerId", 80)) };
      successMessage = "Ownership transfer offer revoked.";
      break;
    case "template_submit":
      if (!flags.templates) {
        return { ok: false, code: "disabled", message: "Binder templates are not available yet." };
      }
      rpcName = BINDER_MUTATION_RPC.templateSubmit;
      args = {
        p_public_id: publicId,
        p_name: text(formData, "name", 80),
        p_description: nullableText(formData, "description", 1000),
      };
      successMessage = "Template submitted for review.";
      break;
    case "template_clone":
      if (!flags.templates) {
        return { ok: false, code: "disabled", message: "Binder templates are not available yet." };
      }
      rpcName = BINDER_MUTATION_RPC.templateClone;
      args = {
        p_template_public_id: text(formData, "templatePublicId", 100),
        p_title: text(formData, "title", 80),
        p_version_number: Number.parseInt(text(formData, "version", 10), 10) || null,
      };
      successMessage = "Binder created from the selected template version.";
      break;
    case "legacy_decide":
      rpcName = BINDER_MUTATION_RPC.legacyDecide;
      args = {
        p_watch_id: uuid(text(formData, "watchId", 80)),
        p_decision: oneOf(text(formData, "decision", 20), ["convert", "dismiss"] as const, "dismiss"),
        p_title: nullableText(formData, "title", 80),
      };
      successMessage = "Collection goal preference saved.";
      break;
    case "pulse_share": {
      if (!flags.pulseSharing) {
        return {
          ok: false,
          code: "disabled",
          message: "Pulse milestone sharing is not available yet.",
        };
      }
      if (text(formData, "confirmation", 20) !== "share") {
        return {
          ok: false,
          code: "validation",
          message: "Confirm the public milestone preview before sharing.",
        };
      }
      const threshold = Number.parseInt(text(formData, "threshold", 3), 10);
      if (![25, 50, 75, 90, 100].includes(threshold)) {
        return {
          ok: false,
          code: "validation",
          message: "Choose a valid progress milestone.",
        };
      }
      rpcName = BINDER_MUTATION_RPC.pulseMilestoneShare;
      args = {
        p_public_id: publicId,
        p_threshold: threshold,
      };
      successMessage = "Public Binder milestone shared to Pulse.";
      break;
    }
    default:
      return { ok: false, code: "validation", message: "Choose a valid Binder action." };
  }

  if (!publicId && "p_public_id" in args) {
    return { ok: false, code: "validation", message: "Binder reference is missing." };
  }

  const result = await mutate(rpcName, args, idempotencyKey(formData));
  if (!result.ok) {
    return result;
  }

  revalidateBinder(publicId || result.binderPublicId);
  const rawSecretUrl =
    typeof result.value?.url === "string"
      ? result.value.url
      : typeof result.value?.view_url === "string"
        ? result.value.view_url
        : typeof result.value?.invitation_url === "string"
          ? result.value.invitation_url
          : null;
  let secretUrl: string | undefined;
  if (rawSecretUrl) {
    try {
      const candidate = new URL(rawSecretUrl, getSiteOrigin());
      if (
        (candidate.origin === getSiteOrigin() ||
          candidate.origin === GROOKAI_VAULT_ORIGIN) &&
        (candidate.pathname.startsWith("/b/") ||
          candidate.pathname.startsWith("/binder-invites/"))
      ) {
        secretUrl = candidate.toString();
      }
    } catch {
      secretUrl = undefined;
    }
  }

  return { ok: true, message: successMessage, secretUrl };
}

export async function requestToJoinBinderAction(publicId: string, formData: FormData) {
  const flags = getBinderFeatureFlags();
  if (!flags.community) {
    redirect(`/binders/${encodeURIComponent(publicId)}?result=disabled`);
  }
  const result = await mutate(BINDER_MUTATION_RPC.joinRequestCreate, {
    p_public_id: publicId,
  }, idempotencyKey(formData), `/binders/${encodeURIComponent(publicId)}`);
  revalidateBinder(publicId);
  redirect(
    `/binders/${encodeURIComponent(publicId)}?result=${result.ok ? "join-requested" : encodeURIComponent(result.code ?? "error")}`,
  );
}

export async function cloneBinderTemplateAction(
  templatePublicId: string,
  version: number,
  formData: FormData,
) {
  const result = await mutate(BINDER_MUTATION_RPC.templateClone, {
    p_template_public_id: templatePublicId,
    p_title: text(formData, "title", 80),
    p_version_number: version,
  }, idempotencyKey(formData), `/binder-templates/${encodeURIComponent(templatePublicId)}`);
  if (result.ok && result.binderPublicId) {
    revalidateBinder(result.binderPublicId);
    redirect(`/binders/${encodeURIComponent(result.binderPublicId)}`);
  }
  redirect(
    `/binder-templates/${encodeURIComponent(templatePublicId)}?result=${encodeURIComponent(result.code ?? "error")}`,
  );
}

export async function reportBinderSurfaceAction(
  _previousState: BinderActionState | null,
  formData: FormData,
): Promise<BinderActionState> {
  const surface = oneOf(
    text(formData, "surface", 40),
    ["binder", "binder_contribution", "binder_member", "binder_invitation"] as const,
    "binder",
  );
  const surfaceId = text(formData, "surfaceId", 100);
  const reason = oneOf(
    text(formData, "reason", 40),
    ["spam", "harassment", "scam", "inappropriate", "other"] as const,
    "other",
  );
  const result = await mutate(BINDER_MUTATION_RPC.report, {
    p_surface: surface,
    p_surface_id: surfaceId,
    p_reason: reason,
    p_details: nullableText(formData, "details", 1000),
  }, idempotencyKey(formData));
  return result.ok
    ? { ok: true, message: "Report received. Thank you for helping keep Binders safe." }
    : result;
}

export async function reportBinderPublicActionAction(
  _previousState: BinderActionState | null,
  formData: FormData,
): Promise<BinderActionState> {
  const publicId = uuid(text(formData, "publicId", 100));
  const surface = oneOf(
    text(formData, "surface", 20),
    ["contribution", "member"] as const,
    "contribution",
  );
  const actionRef = uuid(text(formData, "actionRef", 100));
  if (!publicId || !actionRef) {
    return {
      ok: false,
      code: "validation",
      message: "That safety action expired. Refresh the Binder and try again.",
    };
  }
  const reason = oneOf(
    text(formData, "reason", 40),
    ["spam", "harassment", "scam", "inappropriate", "other"] as const,
    "other",
  );
  const result = await mutate(
    BINDER_MUTATION_RPC.publicActionReport,
    {
      p_public_id: publicId,
      p_surface: surface,
      p_action_ref: actionRef,
      p_reason: reason,
      p_details: nullableText(formData, "details", 1000),
    },
    idempotencyKey(formData),
  );
  return result.ok
    ? {
        ok: true,
        message:
          "Report received. Thank you for helping keep Community Binders safe.",
      }
    : result;
}

export async function blockBinderPublicMemberAction(
  _previousState: BinderActionState | null,
  formData: FormData,
): Promise<BinderActionState> {
  if (text(formData, "confirmation", 20) !== "block") {
    return {
      ok: false,
      code: "validation",
      message: "Confirm that you want to block this collector.",
    };
  }
  const publicId = uuid(text(formData, "publicId", 100));
  const memberActionRef = uuid(text(formData, "memberActionRef", 100));
  if (!publicId || !memberActionRef) {
    return {
      ok: false,
      code: "validation",
      message: "That safety action expired. Refresh the Binder and try again.",
    };
  }
  const result = await mutate(
    BINDER_MUTATION_RPC.publicMemberBlock,
    {
      p_public_id: publicId,
      p_member_action_ref: memberActionRef,
    },
    idempotencyKey(formData),
  );
  if (result.ok) {
    revalidateBinder(publicId);
    return {
      ok: true,
      message:
        "Collector blocked. The Binder was refreshed and no Vault card was changed.",
    };
  }
  return result;
}

export async function blockBinderOwnerAction(
  _previousState: BinderActionState | null,
  formData: FormData,
): Promise<BinderActionState> {
  if (text(formData, "confirmation", 20) !== "block") {
    return {
      ok: false,
      code: "validation",
      message: "Confirm that you want to block this collector.",
    };
  }
  const publicId = text(formData, "publicId", 100);
  const result = await mutate(BINDER_MUTATION_RPC.blockOwner, {
    p_public_id: publicId,
  }, idempotencyKey(formData));
  if (result.ok) {
    revalidateBinder(publicId);
    return {
      ok: true,
      message:
        "Owner blocked. Private Binder access and your active contributions were removed where required; your Vault cards were not changed.",
    };
  }
  return result;
}

export async function blockBinderMemberAction(
  _previousState: BinderActionState | null,
  formData: FormData,
): Promise<BinderActionState> {
  if (text(formData, "confirmation", 20) !== "block") {
    return {
      ok: false,
      code: "validation",
      message: "Confirm that you want to block this Binder member.",
    };
  }
  const memberId = uuid(text(formData, "memberId", 80));
  const publicId = text(formData, "publicId", 100);
  if (!memberId) {
    return {
      ok: false,
      code: "validation",
      message: "Binder member reference is missing.",
    };
  }
  const result = await mutate(
    BINDER_MUTATION_RPC.blockMember,
    { p_member_id: memberId },
    idempotencyKey(formData),
  );
  if (result.ok) {
    revalidateBinder(publicId || result.binderPublicId);
    return {
      ok: true,
      message:
        "Binder member blocked. Access and contribution effects were applied by the Binder trust policy; no Vault card was changed.",
    };
  }
  return result;
}
