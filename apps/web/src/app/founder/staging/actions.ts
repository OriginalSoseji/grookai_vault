"use server";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { revalidatePath } from "next/cache";
import { getFounderAuthUser, isFounderUser } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";

type FounderStagingExecutionOperation = "dry_run" | "execute";

type FounderStagingExecutionErrorCode =
  | "UNAUTHORIZED"
  | "STAGING_ID_REQUIRED"
  | "STAGING_NOT_FOUND"
  | "INVALID_OPERATION"
  | "INVALID_STATUS"
  | "EXECUTOR_UNAVAILABLE"
  | "EXECUTION_FAILED";

type ExecutorStageResult = {
  stageId: string;
  status: string;
  reason?: string;
  error_code?: string | null;
  summary?: Record<string, unknown>;
  plan?: {
    result_type?: string | null;
    mutation?: Record<string, unknown> | null;
    result_linkage?: Record<string, unknown> | null;
  };
};

type ExecutorRunSummary = {
  mode: string;
  results: ExecutorStageResult[];
};

export type FounderStagingExecutionResult =
  | {
      ok: true;
      submissionKey: number;
      action: FounderStagingExecutionOperation;
      stagingId: string;
      candidateId: string;
      executionStatus: string;
      promotionResultType: string | null;
      didWrite: boolean;
      message: string;
    }
  | {
      ok: false;
      submissionKey: number;
      action: FounderStagingExecutionOperation | null;
      stagingId: string | null;
      candidateId: string | null;
      errorCode: FounderStagingExecutionErrorCode;
      didWrite: boolean;
      message: string;
    };

function normalizeOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseOperation(value: FormDataEntryValue | null): FounderStagingExecutionOperation | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized === "dry_run" || normalized === "execute") {
    return normalized;
  }

  return null;
}

function resolveRepoRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "backend", "warehouse", "promotion_executor_v1.mjs"))) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve repository root for promotion executor.");
}

async function loadPromotionExecutorRunner() {
  const repoRoot = resolveRepoRoot();
  const envLocalPath = path.join(repoRoot, ".env.local");
  const envPath = path.join(repoRoot, ".env");

  if (!process.env.DOTENV_CONFIG_PATH) {
    process.env.DOTENV_CONFIG_PATH = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
  }

  const moduleUrl = pathToFileURL(
    path.join(repoRoot, "backend", "warehouse", "promotion_executor_v1.mjs"),
  ).href;
  const executorModule = (await import(/* webpackIgnore: true */ moduleUrl)) as {
    runPromotionExecutorV1?: (input: {
      stagingId: string;
      dryRun?: boolean;
      apply?: boolean;
      allowRetryOnFailed?: boolean;
      emitLogs?: boolean;
    }) => Promise<ExecutorRunSummary>;
  };

  if (typeof executorModule.runPromotionExecutorV1 !== "function") {
    throw new Error("Promotion executor reusable entrypoint is unavailable.");
  }

  return executorModule.runPromotionExecutorV1;
}

function describePromotionOutcome(resultType: string | null) {
  switch (resultType) {
    case "NO_OP":
      return "Canon already matched the staged intent, so no new canon mutation was required.";
    case "CARD_PRINT_CREATED":
      return "A canon card print will be created from the frozen staged intent.";
    case "CARD_PRINTING_CREATED":
      return "A canon card printing will be created from the frozen staged intent.";
    case "CANON_IMAGE_ENRICHED":
      return "The staged canon image target will be enriched.";
    default:
      return "The executor will apply only the frozen staged intent.";
  }
}

function buildExecutionMessage(args: {
  action: FounderStagingExecutionOperation;
  resultType: string | null;
  status: string;
}) {
  if (args.action === "dry_run") {
    return `Dry run ready: ${args.resultType ?? "UNKNOWN_RESULT"}. ${describePromotionOutcome(args.resultType)}`;
  }

  if (args.status === "already_succeeded") {
    return `This staging row already succeeded as ${args.resultType ?? "UNKNOWN_RESULT"}. No new executor run was needed.`;
  }

  return `Execution succeeded: ${args.resultType ?? "UNKNOWN_RESULT"}. ${describePromotionOutcome(args.resultType)}`;
}

function revalidateFounderExecutionPaths(candidateId: string) {
  revalidatePath("/founder");
  revalidatePath("/founder/staging");
  revalidatePath("/founder/warehouse");
  revalidatePath(`/founder/warehouse/${candidateId}`);
}

export async function runFounderStagingExecutionAction(
  _previousState: FounderStagingExecutionResult | null,
  formData: FormData,
): Promise<FounderStagingExecutionResult> {
  const submissionKey = Date.now();
  const action = parseOperation(formData.get("operation"));
  const stagingId = normalizeOptionalText(formData.get("staging_id"));
  const founderUser = await getFounderAuthUser();

  if (!founderUser || !isFounderUser(founderUser)) {
    return {
      ok: false,
      submissionKey,
      action,
      stagingId,
      candidateId: null,
      errorCode: "UNAUTHORIZED",
      didWrite: false,
      message: "Founder access is required.",
    };
  }

  if (!stagingId) {
    return {
      ok: false,
      submissionKey,
      action,
      stagingId: null,
      candidateId: null,
      errorCode: "STAGING_ID_REQUIRED",
      didWrite: false,
      message: "Staging id is required.",
    };
  }

  if (!action) {
    return {
      ok: false,
      submissionKey,
      action: null,
      stagingId,
      candidateId: null,
      errorCode: "INVALID_OPERATION",
      didWrite: false,
      message: "Unknown staging action.",
    };
  }

  const admin = createServerAdminClient();
  const { data: stagingRow, error: stagingError } = await admin
    .from("canon_warehouse_promotion_staging")
    .select("id,candidate_id,execution_status")
    .eq("id", stagingId)
    .maybeSingle();

  if (stagingError) {
    return {
      ok: false,
      submissionKey,
      action,
      stagingId,
      candidateId: null,
      errorCode: "EXECUTION_FAILED",
      didWrite: false,
      message: `Failed to load staging row: ${stagingError.message}`,
    };
  }

  if (!stagingRow?.id) {
    return {
      ok: false,
      submissionKey,
      action,
      stagingId,
      candidateId: null,
      errorCode: "STAGING_NOT_FOUND",
      didWrite: false,
      message: "Staging row could not be found.",
    };
  }

  const executionStatus = String(stagingRow.execution_status ?? "").trim().toUpperCase();
  const candidateId = String(stagingRow.candidate_id ?? "").trim();

  if (!["PENDING", "FAILED"].includes(executionStatus)) {
    return {
      ok: false,
      submissionKey,
      action,
      stagingId,
      candidateId,
      errorCode: "INVALID_STATUS",
      didWrite: false,
      message: `${action === "dry_run" ? "Dry run" : "Execute"} is only available for PENDING or FAILED staging rows. Current status is ${executionStatus}.`,
    };
  }

  try {
    const runPromotionExecutorV1 = await loadPromotionExecutorRunner();
    const execution = await runPromotionExecutorV1({
      stagingId,
      dryRun: action === "dry_run",
      apply: action === "execute",
      allowRetryOnFailed: true,
      emitLogs: false,
    });

    const result = execution.results[0];
    if (!result) {
      return {
        ok: false,
        submissionKey,
        action,
        stagingId,
        candidateId,
        errorCode: "EXECUTION_FAILED",
        didWrite: false,
        message: "Executor returned no result for the requested staging row.",
      };
    }

    if (result.status === "dry_run") {
      const resultType = typeof result.plan?.result_type === "string" ? result.plan.result_type : null;
      return {
        ok: true,
        submissionKey,
        action,
        stagingId,
        candidateId,
        executionStatus,
        promotionResultType: resultType,
        didWrite: false,
        message: buildExecutionMessage({
          action,
          resultType,
          status: result.status,
        }),
      };
    }

    if (result.status === "already_succeeded") {
      const resultType =
        typeof result.summary?.promotion_result_type === "string"
          ? result.summary.promotion_result_type
          : null;
      return {
        ok: true,
        submissionKey,
        action,
        stagingId,
        candidateId,
        executionStatus: "SUCCEEDED",
        promotionResultType: resultType,
        didWrite: false,
        message: buildExecutionMessage({
          action,
          resultType,
          status: result.status,
        }),
      };
    }

    if (result.status === "applied") {
      const resultType =
        typeof result.summary?.promotion_result_type === "string"
          ? result.summary.promotion_result_type
          : null;
      revalidateFounderExecutionPaths(candidateId);
      return {
        ok: true,
        submissionKey,
        action,
        stagingId,
        candidateId,
        executionStatus: "SUCCEEDED",
        promotionResultType: resultType,
        didWrite: true,
        message: buildExecutionMessage({
          action,
          resultType,
          status: result.status,
        }),
      };
    }

    if (result.status === "failed") {
      revalidateFounderExecutionPaths(candidateId);
      return {
        ok: false,
        submissionKey,
        action,
        stagingId,
        candidateId,
        errorCode: "EXECUTION_FAILED",
        didWrite: true,
        message: `Execution failed: ${result.reason ?? "Unknown executor failure."}`,
      };
    }

    if (result.status === "dry_run_failed_preflight") {
      const reason =
        typeof result.summary?.error_code === "string"
          ? result.summary.error_code
          : "promotion_preflight_failed";
      return {
        ok: false,
        submissionKey,
        action,
        stagingId,
        candidateId,
        errorCode: "EXECUTION_FAILED",
        didWrite: false,
        message: `Dry run blocked: ${reason}`,
      };
    }

    return {
      ok: false,
      submissionKey,
      action,
      stagingId,
      candidateId,
      errorCode: "EXECUTION_FAILED",
      didWrite: false,
      message: result.reason
        ? `Execution did not run: ${result.reason}`
        : "Execution did not return a successful result.",
    };
  } catch (error) {
    return {
      ok: false,
      submissionKey,
      action,
      stagingId,
      candidateId,
      errorCode: "EXECUTOR_UNAVAILABLE",
      didWrite: false,
      message:
        error instanceof Error ? error.message : "Promotion executor could not be loaded.",
    };
  }
}
