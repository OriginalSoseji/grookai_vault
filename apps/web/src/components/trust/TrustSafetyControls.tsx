"use client";

import { useState, useTransition } from "react";
import {
  blockTrustSafetyUserAction,
  reportTrustSafetySurfaceAction,
  type TrustSafetySurface,
} from "@/lib/trustSafety/trustSafetyActions";

type TrustSafetyControlsProps = {
  reportedUserId?: string | null;
  surface: TrustSafetySurface;
  surfaceId?: string | null;
  returnPath?: string | null;
  cardPrintId?: string | null;
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
  canBlock = true,
  compact = false,
}: TrustSafetyControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");

  function finish(result: { ok: boolean; message: string }) {
    setTone(result.ok ? "success" : "error");
    setMessage(result.message);
    setPendingAction(null);
  }

  function handleReport() {
    setMessage(null);
    setPendingAction("report");
    startTransition(async () => {
      finish(
        await reportTrustSafetySurfaceAction({
          reportedUserId,
          surface,
          surfaceId,
          reason: "other",
          returnPath,
        }),
      );
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
      finish(
        await blockTrustSafetyUserAction({
          blockedUserId: reportedUserId,
          cardPrintId,
          returnPath,
        }),
      );
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
          onClick={handleReport}
          disabled={isPending}
          className={buttonClassName}
        >
          {pendingAction === "report" ? "Reporting..." : "Report"}
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
      {message ? (
        <p className={`text-xs ${tone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

export default TrustSafetyControls;
