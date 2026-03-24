"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";

type ExecutionOutcomeRpcRow = {
  execution_event_id?: string | null;
  latest_interaction_id?: string | null;
  card_print_id?: string | null;
  source_instance_id?: string | null;
  source_vault_item_id?: string | null;
  target_user_id?: string | null;
  result_instance_id?: string | null;
  result_vault_item_id?: string | null;
  outcome_type?: string | null;
  price_amount?: string | number | null;
  price_currency?: string | null;
};

export type ExecuteCardInteractionOutcomeActionResult =
  | {
      ok: true;
      status: "executed";
      submissionKey: number;
      executionEventId: string;
      outcomeType: "sale" | "trade";
      message: string;
    }
  | {
      ok: false;
      status: "login-required" | "validation-error" | "error";
      submissionKey: number;
      message: string;
    };

function normalizeOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalPriceAmount(value: FormDataEntryValue | string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return parsed;
}

function mapExecutionErrorMessage(message: string | null) {
  switch (message) {
    case "latest_interaction_id_required":
    case "source_instance_id_required":
    case "invalid_execution_type":
      return "The execution request is missing required card details.";
    case "price_amount_nonnegative_required":
    case "price_amount_and_currency_must_pair":
      return "Price must be a valid non-negative amount with a 3-letter currency.";
    case "interaction_not_found":
    case "interaction_participant_required":
    case "interaction_card_mismatch":
    case "interaction_vault_item_mismatch":
      return "That card conversation could not be verified for execution.";
    case "source_instance_not_found":
    case "source_instance_not_owned_by_actor":
    case "source_instance_missing_card_print":
    case "source_instance_missing_vault_item_lineage":
    case "source_instance_already_archived":
    case "source_vault_item_not_found":
    case "source_vault_item_already_archived":
    case "source_vault_item_not_owned_by_actor":
    case "source_bucket_card_mismatch":
      return "That owned card is no longer available for transfer.";
    case "sale_does_not_accept_existing_event":
    case "execution_event_not_found":
    case "execution_event_type_mismatch":
    case "execution_event_participant_mismatch":
    case "execution_event_already_complete":
    case "trade_leg_already_recorded_for_actor":
      return "That execution bundle is no longer available.";
    case "target_vault_item_resolution_failed":
    case "source_instance_archive_failed":
      return "Ownership could not be transferred safely.";
    default:
      return "Execution could not be completed.";
  }
}

function buildSuccessMessage(outcomeType: "sale" | "trade") {
  return outcomeType === "sale" ? "Sale recorded and ownership transferred." : "Trade leg recorded and ownership transferred.";
}

export async function executeCardInteractionOutcomeAction(
  _previousState: ExecuteCardInteractionOutcomeActionResult | null,
  formData: FormData,
): Promise<ExecuteCardInteractionOutcomeActionResult> {
  const submissionKey = Date.now();
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: "login-required",
      submissionKey,
      message: "Sign in required.",
    };
  }

  const executionType = normalizeOptionalText(formData.get("execution_type"));
  const latestInteractionId = normalizeOptionalText(formData.get("latest_interaction_id"));
  const sourceInstanceId = normalizeOptionalText(formData.get("source_instance_id"));
  const executionEventId = normalizeOptionalText(formData.get("execution_event_id"));
  const priceAmount = normalizeOptionalPriceAmount(formData.get("price_amount"));
  const priceCurrency = normalizeOptionalText(formData.get("price_currency"));
  const returnPath = normalizeOptionalText(formData.get("return_path")) ?? "/network/inbox";

  if ((executionType !== "sale" && executionType !== "trade") || !latestInteractionId || !sourceInstanceId) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      message: "A valid card conversation and owned instance are required.",
    };
  }

  if (Number.isNaN(priceAmount)) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      message: "Price must be a valid number.",
    };
  }

  if ((priceAmount === null) !== (priceCurrency === null)) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      message: "Price amount and currency must be provided together.",
    };
  }

  const { data, error } = await client.rpc("execute_card_interaction_outcome_v1", {
    p_execution_type: executionType,
    p_latest_interaction_id: latestInteractionId,
    p_source_instance_id: sourceInstanceId,
    p_price_amount: priceAmount,
    p_price_currency: priceCurrency,
    p_execution_event_id: executionEventId,
  });

  if (error) {
    return {
      ok: false,
      status: "error",
      submissionKey,
      message: mapExecutionErrorMessage(normalizeOptionalText(error.message)),
    };
  }

  const outcome = (data ?? null) as ExecutionOutcomeRpcRow | null;
  const resolvedExecutionEventId = normalizeOptionalText(outcome?.execution_event_id);
  const resolvedOutcomeType = normalizeOptionalText(outcome?.outcome_type);
  const targetUserId = normalizeOptionalText(outcome?.target_user_id);
  const cardPrintId = normalizeOptionalText(outcome?.card_print_id);

  if (!resolvedExecutionEventId || (resolvedOutcomeType !== "sale" && resolvedOutcomeType !== "trade")) {
    return {
      ok: false,
      status: "error",
      submissionKey,
      message: "Execution completed without a valid outcome record.",
    };
  }

  revalidatePath(returnPath);
  revalidatePath("/network");
  revalidatePath("/network/inbox");
  revalidatePath("/vault");
  revalidatePath("/account");
  revalidatePath("/", "layout");

  const revalidationTasks: Promise<unknown>[] = [];

  if (cardPrintId) {
    revalidationTasks.push(
      Promise.resolve(
        client
          .from("card_prints")
          .select("gv_id")
          .eq("id", cardPrintId)
          .maybeSingle()
          .then(({ data: cardRow }) => {
            const gvId = normalizeOptionalText(cardRow?.gv_id);
            if (gvId) {
              revalidatePath(`/card/${gvId}`);
            }
          }),
      ),
    );
  }

  const participantIds = [user.id, targetUserId].filter((value): value is string => Boolean(value));
  if (participantIds.length > 0) {
    revalidationTasks.push(
      Promise.resolve(
        client
          .from("public_profiles")
          .select("slug,user_id")
          .in("user_id", participantIds)
          .then(({ data: profiles }) => {
            for (const row of profiles ?? []) {
              const slug = normalizeOptionalText(row.slug);
              if (!slug) {
                continue;
              }

              revalidatePath(`/u/${slug}`);
              revalidatePath(`/u/${slug}/collection`);
            }
          }),
      ),
    );
  }

  await Promise.all(revalidationTasks);

  return {
    ok: true,
    status: "executed",
    submissionKey,
    executionEventId: resolvedExecutionEventId,
    outcomeType: resolvedOutcomeType,
    message: buildSuccessMessage(resolvedOutcomeType),
  };
}
