"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AssignConditionSnapshotDialog } from "@/components/condition/AssignConditionSnapshotDialog";
import { assignConditionSnapshotAction } from "@/lib/condition/assignConditionSnapshotAction";
import type { AssignmentCandidate } from "@/lib/condition/getAssignmentCandidatesForSnapshot";
import type { ConditionSnapshotListItem } from "@/lib/condition/getConditionSnapshotsForCard";

function formatSnapshotDate(value: string) {
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

function formatConfidence(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return `${Math.round(value * 100)}% confidence`;
}

function formatScanQuality(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function ConditionSnapshotSection({
  snapshots,
  candidatesBySnapshotId,
  cardPrintId,
}: {
  snapshots: ConditionSnapshotListItem[];
  candidatesBySnapshotId: Record<string, AssignmentCandidate[]>;
  cardPrintId: string;
}) {
  const router = useRouter();
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [selectedGvviId, setSelectedGvviId] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === activeSnapshotId) ?? null,
    [activeSnapshotId, snapshots],
  );

  const activeCandidates = activeSnapshotId ? candidatesBySnapshotId[activeSnapshotId] ?? [] : [];

  function openAssignDialog(snapshotId: string) {
    const candidates = candidatesBySnapshotId[snapshotId] ?? [];
    if (candidates.length === 0) {
      return;
    }

    setActiveSnapshotId(snapshotId);
    setSelectedGvviId(candidates[0]?.gv_vi_id ?? null);
    setAssignmentError(null);
  }

  function closeAssignDialog() {
    if (isPending) {
      return;
    }

    setActiveSnapshotId(null);
    setSelectedGvviId(null);
    setAssignmentError(null);
  }

  function confirmAssignment() {
    if (!activeSnapshot || !selectedGvviId || isPending) {
      return;
    }

    setAssignmentError(null);
    startTransition(async () => {
      try {
        const result = await assignConditionSnapshotAction({
          snapshotId: activeSnapshot.id,
          gvviId: selectedGvviId,
          cardPrintId,
        });

        if (!result.ok) {
          setAssignmentError(result.message);
          return;
        }

        closeAssignDialog();
        router.refresh();
      } catch (error) {
        setAssignmentError("Couldn’t assign this scan.");
      }
    });
  }

  return (
    <>
      <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Condition</h2>
          <p className="text-sm text-slate-500">Read-only scan history for this card in your vault.</p>
        </div>

        {snapshots.length === 0 ? (
          <div className="rounded-[14px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            No condition scans yet
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snapshot) => {
              const assignmentLabel =
                snapshot.assignment_state === "assigned" ? "Assigned to owned card" : "Unassigned scan";
              const qualityLabel = formatScanQuality(snapshot.scan_quality);
              const confidenceLabel = formatConfidence(snapshot.confidence);
              const candidates = candidatesBySnapshotId[snapshot.id] ?? [];
              const canAssign = snapshot.assignment_state === "unassigned" && candidates.length > 0;

              return (
                <div
                  key={snapshot.id}
                  className="rounded-[14px] border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">{assignmentLabel}</p>
                      <p className="text-xs text-slate-500">{formatSnapshotDate(snapshot.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          snapshot.assignment_state === "assigned"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {snapshot.assignment_state}
                      </span>
                      {canAssign ? (
                        <button
                          type="button"
                          onClick={() => openAssignDialog(snapshot.id)}
                          className="inline-flex rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Assign
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {(qualityLabel || confidenceLabel) ? (
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                      {qualityLabel ? (
                        <p>
                          <span className="font-medium text-slate-700">Scan quality:</span> {qualityLabel}
                        </p>
                      ) : null}
                      {confidenceLabel ? (
                        <p>
                          <span className="font-medium text-slate-700">Confidence:</span> {confidenceLabel}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AssignConditionSnapshotDialog
        isOpen={activeSnapshot !== null}
        isPending={isPending}
        candidates={activeCandidates}
        selectedGvviId={selectedGvviId}
        error={assignmentError}
        onSelect={setSelectedGvviId}
        onCancel={closeAssignDialog}
        onConfirm={confirmAssignment}
      />
    </>
  );
}
