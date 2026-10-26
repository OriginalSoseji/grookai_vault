"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getFounderAuthUser } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";

type FounderOperationsDecision = "approve" | "request_repair";

export type FounderOperationsDecisionState = {
  ok: boolean;
  submissionKey: number;
  decision: FounderOperationsDecision | null;
  workItemId: string | null;
  message: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function decisionValue(value: string): FounderOperationsDecision | null {
  return value === "approve" || value === "request_repair" ? value : null;
}

function friendlyDecisionError(message: string) {
  if (message.includes("recent_authentication_required")) {
    return "Approval requires a sign-in from the last 15 minutes. Sign in again, then retry this exact item.";
  }
  if (message.includes("founder_work_item_stale_plan")) {
    return "This plan changed after the page loaded. Refresh before deciding.";
  }
  if (message.includes("founder_work_item_expired")) {
    return "This frozen plan expired. Let the agent publish a fresh plan.";
  }
  if (message.includes("founder_work_item_not_actionable")) {
    return "This item is no longer actionable. Refresh to see its current state.";
  }
  if (message.includes("founder_access_required") || message.includes("not_authenticated")) {
    return "Founder authentication is required.";
  }
  return message || "The founder decision could not be recorded.";
}

export async function decideFounderOperationsWorkItem(
  _previousState: FounderOperationsDecisionState | null,
  formData: FormData,
): Promise<FounderOperationsDecisionState> {
  const submissionKey = Date.now();
  const workItemId = text(formData.get("work_item_id"));
  const decision = decisionValue(text(formData.get("decision")));
  const founderUser = await getFounderAuthUser();

  if (!founderUser) {
    return { ok: false, submissionKey, decision, workItemId: workItemId || null, message: "Founder access is required." };
  }
  if (!UUID_PATTERN.test(workItemId)) {
    return { ok: false, submissionKey, decision, workItemId: null, message: "The work item id is invalid." };
  }
  if (!decision) {
    return { ok: false, submissionKey, decision: null, workItemId, message: "The requested decision is invalid." };
  }

  const admin = createServerAdminClient();
  const { data: workItem, error: workItemError } = await admin
    .from("founder_work_items")
    .select("id,version,state,plan_fingerprint,expires_at")
    .eq("id", workItemId)
    .maybeSingle();

  if (workItemError || !workItem) {
    return {
      ok: false,
      submissionKey,
      decision,
      workItemId,
      message: workItemError?.message ?? "The work item no longer exists.",
    };
  }
  if (!["ready_for_review", "deferred"].includes(workItem.state)) {
    return { ok: false, submissionKey, decision, workItemId, message: "This item is no longer actionable. Refresh to see its current state." };
  }

  const session = await createServerComponentClient();
  const { data, error } = await session.rpc("founder_operations_decide_v1", {
    p_work_item_id: workItem.id,
    p_expected_version: workItem.version,
    p_expected_fingerprint: workItem.plan_fingerprint,
    p_decision: decision,
    p_idempotency_key: `founder-web-${founderUser.id}-${randomUUID()}`,
    p_client_schema_version: "FOUNDER_OPERATIONS_MOBILE_V1",
    p_note: decision === "approve" ? "Approved from the live Founder Operations dashboard." : "Repair requested from the live Founder Operations dashboard.",
    p_defer_until: null,
  });

  if (error) {
    return { ok: false, submissionKey, decision, workItemId, message: friendlyDecisionError(error.message) };
  }

  const result = Array.isArray(data) ? data[0] : data;
  const commandStatus = result && typeof result === "object" && "command_status" in result
    ? String(result.command_status ?? "")
    : "";
  revalidatePath("/founder/operations");
  revalidatePath("/founder");

  return {
    ok: true,
    submissionKey,
    decision,
    workItemId,
    message: decision === "approve"
      ? commandStatus
        ? `Approved. Command status: ${commandStatus.replaceAll("_", " ")}.`
        : "Approved. The governed executor can now continue."
      : "Repair requested. The current frozen plan will not execute.",
  };
}
