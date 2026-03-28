"use client";

import { type FormEvent, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  runFounderStagingExecutionAction,
  type FounderStagingExecutionResult,
} from "@/app/founder/staging/actions";
import { DefinitionGrid, WarehouseBadge } from "@/components/founder/WarehouseReviewPrimitives";

type WarehouseStagingExecutionPanelProps = {
  stagingId: string;
  candidateId: string;
  executionStatus: string;
  executionAttempts: number;
  lastError: string | null;
  lastAttemptedAt?: string | null;
  executedAt?: string | null;
  promotionResultType?: string | null;
  promotedCardPrintId?: string | null;
  promotedCardPrintingId?: string | null;
  promotedImageTargetType?: string | null;
  promotedImageTargetId?: string | null;
};

type StagingActionName = "dry_run" | "execute";

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SubmitButton({
  action,
  label,
  tone,
  onSelect,
}: {
  action: StagingActionName;
  label: string;
  tone: "neutral" | "success" | "warning";
  onSelect: (action: StagingActionName) => void;
}) {
  const { pending } = useFormStatus();

  const toneClassName =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

  return (
    <button
      type="submit"
      name="operation"
      value={action}
      onClick={() => onSelect(action)}
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClassName}`}
    >
      {pending ? "Working..." : label}
    </button>
  );
}

function getConfirmMessage(action: StagingActionName, executionStatus: string) {
  if (action === "dry_run") {
    return "Run a dry run for this staging row? This does not mutate canon.";
  }

  if (executionStatus === "FAILED") {
    return "Retry executor on this FAILED staging row? This will re-run the same frozen payload only.";
  }

  return "Execute this staging row now? This runs the protected promotion executor on exactly one frozen payload.";
}

function getStatusTone(state: FounderStagingExecutionResult | null) {
  if (!state) {
    return null;
  }

  return state.ok ? "text-emerald-700" : "text-rose-700";
}

export default function WarehouseStagingExecutionPanel({
  stagingId,
  candidateId,
  executionStatus,
  executionAttempts,
  lastError,
  lastAttemptedAt,
  executedAt,
  promotionResultType,
  promotedCardPrintId,
  promotedCardPrintingId,
  promotedImageTargetType,
  promotedImageTargetId,
}: WarehouseStagingExecutionPanelProps) {
  const router = useRouter();
  const handledSubmissionKeyRef = useRef<number | null>(null);
  const pendingActionRef = useRef<StagingActionName | null>(null);
  const [state, formAction] = useFormState<FounderStagingExecutionResult | null, FormData>(
    runFounderStagingExecutionAction,
    null,
  );

  useEffect(() => {
    if (!state || handledSubmissionKeyRef.current === state.submissionKey) {
      return;
    }

    handledSubmissionKeyRef.current = state.submissionKey;
    if (state.didWrite) {
      router.refresh();
    }
  }, [router, state]);

  const availableActions = useMemo(() => {
    switch (executionStatus) {
      case "PENDING":
        return [
          { action: "dry_run" as const, label: "Dry Run", tone: "neutral" as const },
          { action: "execute" as const, label: "Execute", tone: "warning" as const },
        ];
      case "FAILED":
        return [
          { action: "dry_run" as const, label: "Dry Run", tone: "neutral" as const },
          { action: "execute" as const, label: "Retry Execute", tone: "warning" as const },
        ];
      default:
        return [];
    }
  }, [executionStatus]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const action = pendingActionRef.current;
    if (!action || typeof window === "undefined") {
      return;
    }

    const shouldContinue = window.confirm(getConfirmMessage(action, executionStatus));
    if (!shouldContinue) {
      event.preventDefault();
    }
  }

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-slate-950">Promotion execution</h3>
          <p className="text-sm leading-6 text-slate-600">
            Founder UI triggers the protected executor path. Canon logic still runs only inside the shared service-side executor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <WarehouseBadge value={executionStatus} />
          {promotionResultType ? <WarehouseBadge value={promotionResultType} tone="success" /> : null}
        </div>
      </div>

      <DefinitionGrid
        items={[
          { label: "Staging id", value: stagingId },
          {
            label: "Candidate",
            value: (
              <Link
                href={`/founder/warehouse/${encodeURIComponent(candidateId)}`}
                className="underline decoration-slate-300 underline-offset-4"
              >
                {candidateId}
              </Link>
            ),
          },
          { label: "Execution attempts", value: String(executionAttempts) },
          { label: "Last attempted", value: formatTimestamp(lastAttemptedAt) },
          { label: "Executed at", value: formatTimestamp(executedAt) },
          { label: "Promotion result", value: promotionResultType ?? "—" },
          { label: "Promoted card print", value: promotedCardPrintId ?? "—" },
          { label: "Promoted card printing", value: promotedCardPrintingId ?? "—" },
          {
            label: "Promoted image target",
            value:
              promotedImageTargetType && promotedImageTargetId
                ? `${promotedImageTargetType} • ${promotedImageTargetId}`
                : "—",
          },
        ]}
      />

      {lastError ? (
        <details className="rounded-2xl border border-rose-200 bg-rose-50">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-rose-800">
            Last executor error
          </summary>
          <div className="border-t border-rose-200 px-4 py-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-rose-900">{lastError}</p>
          </div>
        </details>
      ) : null}

      {executionStatus === "SUCCEEDED" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          {promotionResultType === "NO_OP"
            ? "Execution succeeded as NO_OP. Canon already matched the staged intent."
            : "Execution succeeded. This staging row is now read-only."}
        </div>
      ) : executionStatus === "RUNNING" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          This staging row is currently RUNNING. Execution controls are intentionally disabled until the run completes.
        </div>
      ) : availableActions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          Execution controls are not available for staging rows in {executionStatus}.
        </div>
      ) : (
        <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="staging_id" value={stagingId} />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {availableActions.map((item) => (
              <SubmitButton
                key={item.action}
                action={item.action}
                label={item.label}
                tone={item.tone}
                onSelect={(selectedAction) => {
                  pendingActionRef.current = selectedAction;
                }}
              />
            ))}
          </div>

          {state?.message ? (
            <p className={`text-sm ${getStatusTone(state)}`}>
              {!state.ok && state.errorCode ? `${state.errorCode}: ` : ""}
              {state.message}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
