"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  runFounderWarehouseAction,
  type FounderWarehouseActionResult,
} from "@/app/founder/warehouse/actions";

type WarehouseFounderActionPanelProps = {
  candidateId: string;
  candidateState: string;
  canApprove: boolean;
  canStage: boolean;
  stageBlockedReason?: string | null;
};

type ActionName = "approve" | "stage";

function SubmitButton({
  action,
  label,
  tone,
  onSelect,
}: {
  action: ActionName;
  label: string;
  tone: "neutral" | "danger" | "success" | "warning";
  onSelect: (action: ActionName) => void;
}) {
  const { pending } = useFormStatus();

  const toneClassName =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
      : tone === "success"
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

function getConfirmMessage(action: ActionName, candidateState: string) {
  switch (action) {
    case "approve":
      return "Approve this candidate and move it into the founder-approved state?";
    case "stage":
      return "Create a frozen staging row for this approved candidate? This does not execute promotion.";
    default:
      return "Continue with this founder action?";
  }
}

function getStatusTone(state: FounderWarehouseActionResult | null) {
  if (!state) {
    return null;
  }
  return state.ok ? "text-emerald-700" : "text-rose-700";
}

export default function WarehouseFounderActionPanel({
  candidateId,
  candidateState,
  canApprove,
  canStage,
  stageBlockedReason,
}: WarehouseFounderActionPanelProps) {
  const router = useRouter();
  const handledSubmissionKeyRef = useRef<number | null>(null);
  const pendingActionRef = useRef<ActionName | null>(null);
  const [note, setNote] = useState("");
  const [state, formAction] = useFormState<FounderWarehouseActionResult | null, FormData>(
    runFounderWarehouseAction,
    null,
  );

  useEffect(() => {
    if (!state?.ok || handledSubmissionKeyRef.current === state.submissionKey) {
      return;
    }

    handledSubmissionKeyRef.current = state.submissionKey;
    setNote("");
    router.refresh();
  }, [router, state]);

  const availableActions = useMemo(() => {
    const actions = [];

    if (candidateState === "REVIEW_READY" && canApprove) {
      actions.push({ action: "approve" as const, label: "Approve", tone: "success" as const });
    }

    if (candidateState === "APPROVED_BY_FOUNDER" && canStage) {
      actions.push({
        action: "stage" as const,
        label: "Stage for Promotion",
        tone: "warning" as const,
      });
    }

    return actions;
  }, [canApprove, canStage, candidateState]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const action = pendingActionRef.current;
    if (!action || typeof window === "undefined") {
      return;
    }

    const shouldContinue = window.confirm(getConfirmMessage(action, candidateState));
    if (!shouldContinue) {
      event.preventDefault();
    }
  }

  const readOnlyMessage =
    candidateState === "PROMOTED"
      ? "Promotion already succeeded. Founder mutation controls are now read-only."
      : candidateState === "STAGED_FOR_PROMOTION"
        ? "This candidate is already staged. Execute it from the staging control below."
        : candidateState === "APPROVED_BY_FOUNDER" && !canStage
          ? stageBlockedReason ?? "Stage remains blocked until interpreter, write plan, and normalization are all READY."
          : `Founder promotion actions are not available for candidates in ${candidateState}.`;

  if (availableActions.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm text-slate-600">
        {readOnlyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">Approve Or Stage</h3>
        <p className="text-sm leading-6 text-slate-600">
          These controls move the candidate forward through the governed warehouse lifecycle only.
        </p>
      </div>

      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="candidate_id" value={candidateId} />

        {candidateState === "REVIEW_READY" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Founder approval note</span>
            <textarea
              name="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Optional founder approval context."
              className="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        ) : null}

        <div className="flex flex-wrap gap-3">
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
    </div>
  );
}
