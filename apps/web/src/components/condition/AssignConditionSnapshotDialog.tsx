"use client";

import type { AssignmentCandidate } from "@/lib/condition/getAssignmentCandidatesForSnapshot";

function formatCandidateDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AssignConditionSnapshotDialog({
  isOpen,
  isPending,
  candidates,
  selectedGvviId,
  error,
  onSelect,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  isPending: boolean;
  candidates: AssignmentCandidate[];
  selectedGvviId: string | null;
  error: string | null;
  onSelect: (gvviId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-condition-snapshot-title"
      onClick={() => {
        if (!isPending) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          <h3 id="assign-condition-snapshot-title" className="text-2xl font-semibold tracking-tight text-slate-950">
            Assign this scan to a card
          </h3>
          <p className="text-sm leading-7 text-slate-600">
            Choose the owned card this historical scan belongs to. This does not remove the original vault history.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {candidates.map((candidate) => {
            const selected = selectedGvviId === candidate.gv_vi_id;
            return (
              <button
                key={candidate.gv_vi_id}
                type="button"
                onClick={() => onSelect(candidate.gv_vi_id)}
                disabled={isPending}
                className={`flex w-full items-start justify-between gap-3 rounded-[1.25rem] border px-4 py-3 text-left transition ${
                  selected
                    ? "border-slate-900 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{candidate.gv_vi_id}</p>
                  <p className={`text-xs ${selected ? "text-slate-200" : "text-slate-500"}`}>
                    Added {formatCandidateDate(candidate.created_at)}
                  </p>
                </div>
                {candidate.is_lineage_match ? (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      selected
                        ? "border border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    Lineage match
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending || !selectedGvviId}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Assigning..." : "Confirm assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}
