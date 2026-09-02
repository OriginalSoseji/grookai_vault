"use client";

import { useState, useTransition } from "react";
import {
  blockTrustSafetyUserAction,
  reportTrustSafetySurfaceAction,
  type TrustSafetyReason,
  type TrustSafetySurface,
} from "@/lib/trustSafety/trustSafetyActions";
import { dispatchCollectorBlocked } from "@/components/network/ContactEligibilityProvider";

type TrustSafetyControlsProps = {
  reportedUserId?: string | null;
  surface: TrustSafetySurface;
  surfaceId?: string | null;
  returnPath?: string | null;
  cardPrintId?: string | null;
  cardPrintingId?: string | null;
  canBlock?: boolean;
  compact?: boolean;
};

type PendingAction = "report" | "block";

export function TrustSafetyControls({
  reportedUserId = null,
  surface,
  surfaceId = null,
  returnPath = null,
  cardPrintId = null,
  cardPrintingId,
  canBlock = true,
  compact = false,
}: TrustSafetyControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<TrustSafetyReason>("spam");
  const [reportDetails, setReportDetails] = useState("");

  function finish(result: { ok: boolean; message: string }) {
    setTone(result.ok ? "success" : "error");
    setMessage(result.message);
    setPendingAction(null);
  }

  function handleReport() {
    setMessage(null);
    setPendingAction("report");
    startTransition(async () => {
      try {
        finish(await reportTrustSafetySurfaceAction({
          reportedUserId,
          surface,
          surfaceId,
          reason: reportReason,
          details: reportDetails,
          returnPath,
        }));
        setReportOpen(false);
        setReportDetails("");
      } catch {
        finish({ ok: false, message: "Report could not be submitted." });
      }
    });
  }

  function handleBlock() {
    if (!reportedUserId) {
      return;
    }

    const confirmed = window.confirm("Block this collector? They will not be able to message you, and you will stop seeing contact options for them.");
    if (!confirmed) {
      return;
    }

    setMessage(null);
    setPendingAction("block");
    startTransition(async () => {
      try {
        const result = await blockTrustSafetyUserAction({
          blockedUserId: reportedUserId,
          cardPrintId,
          ...(cardPrintingId !== undefined ? { cardPrintingId } : {}),
          returnPath,
        });
        finish(result);
        if (result.ok) {
          dispatchCollectorBlocked(reportedUserId);
        }
      } catch {
        finish({ ok: false, message: "Collector could not be blocked." });
      }
    });
  }

  const buttonClassName = compact
    ? "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setReportOpen((current) => !current);
          }}
          disabled={isPending}
          className={buttonClassName}
        >
          Report
        </button>
        {canBlock && reportedUserId ? (
          <button
            type="button"
            onClick={handleBlock}
            disabled={isPending}
            className={buttonClassName}
          >
            {pendingAction === "block" ? "Blocking..." : "Block"}
          </button>
        ) : null}
      </div>
      {reportOpen ? (
        <div className="space-y-2 border-l-2 border-slate-200 pl-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">Reason</span>
            <select
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value as TrustSafetyReason)}
              disabled={isPending}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900"
            >
              <option value="spam">Spam</option>
              <option value="harassment">Harassment or threat</option>
              <option value="scam">Scam or unsafe payment request</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">Details (optional)</span>
            <textarea
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              disabled={isPending}
              maxLength={2000}
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReport}
              disabled={isPending}
              className={buttonClassName}
            >
              {pendingAction === "report" ? "Reporting..." : "Submit report"}
            </button>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              disabled={isPending}
              className={buttonClassName}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p
          role={tone === "error" ? "alert" : "status"}
          aria-live={tone === "error" ? "assertive" : "polite"}
          className={`text-xs ${tone === "success" ? "text-emerald-700" : "text-rose-700"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export default TrustSafetyControls;
