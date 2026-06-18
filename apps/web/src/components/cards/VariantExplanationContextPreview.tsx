"use client";

import { useState } from "react";

type VariantExplanationContextPayload = {
  ok: boolean;
  explanation?: {
    status: "ready" | "not_enough_context";
    title: string;
    summary: string;
    why_it_exists: string | null;
    why_collectors_care: string | null;
    how_to_identify: string | null;
    grookai_rule: string | null;
    source_urls: string[];
    limitation_notes: string[];
  };
  context_status?: "ready" | "not_enough_context";
  runtime_guard?: {
    modelCallAllowed: boolean;
    reason: string;
  };
  ownership?: {
    checked: boolean;
    owned_count: number | null;
    error: string | null;
  };
  limitations?: string[];
  error?: string;
  message?: string;
};

type VariantExplanationContextPreviewProps = {
  gvId: string;
  printingGvId?: string | null;
  finishKey?: string | null;
};

function formatReason(value?: string) {
  return (value ?? "unknown")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function VariantExplanationContextPreview({
  gvId,
  printingGvId,
  finishKey,
}: VariantExplanationContextPreviewProps) {
  const [payload, setPayload] = useState<VariantExplanationContextPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const loadContext = async () => {
    if (loading) return;
    setLoading(true);
    setPayload(null);

    try {
      const response = await fetch("/api/assistant/variant-explanation-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gv_id: gvId,
          printing_gv_id: printingGvId,
          finish_key: finishKey,
        }),
      });
      const nextPayload = (await response.json()) as VariantExplanationContextPayload;
      setPayload(nextPayload);
    } catch {
      setPayload({
        ok: false,
        message: "Assistant context is unavailable.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-[14px] border border-violet-200/70 bg-violet-50/70 px-3 py-3 dark:border-violet-300/20 dark:bg-violet-400/[0.10]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
            Assistant Context
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            Grounded from Grookai canon before any premium AI summary exists.
          </p>
        </div>
        <button
          type="button"
          onClick={loadContext}
          disabled={loading}
          className="rounded-full border border-violet-300 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-800 shadow-sm transition hover:border-violet-400 hover:text-violet-950 disabled:cursor-wait disabled:opacity-60 dark:border-violet-300/30 dark:bg-slate-950/60 dark:text-violet-100 dark:hover:text-white"
        >
          {loading ? "Checking..." : "Check context"}
        </button>
      </div>

      {payload ? (
        <div className="mt-3 border-t border-violet-200/70 pt-3 text-xs leading-5 text-slate-600 dark:border-violet-300/20 dark:text-slate-300">
          {payload.ok ? (
            <>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200">
                  {payload.context_status === "ready" ? "Ready" : "Needs context"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200">
                  Model {payload.runtime_guard?.modelCallAllowed ? "available" : "blocked"}
                </span>
                {payload.ownership?.checked ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200">
                    Owned {payload.ownership.owned_count ?? 0}
                  </span>
                ) : null}
              </div>
              {payload.runtime_guard?.reason ? (
                <p className="mt-3">
                  Runtime gate: {formatReason(payload.runtime_guard.reason)}.
                </p>
              ) : null}
              {payload.explanation ? (
                <div className="mt-3 rounded-[12px] border border-violet-200/70 bg-white/70 p-3 dark:border-violet-300/20 dark:bg-slate-950/40">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    {payload.explanation.title}
                  </p>
                  <p className="mt-1">{payload.explanation.summary}</p>
                </div>
              ) : null}
              {payload.limitations?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {payload.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p>{payload.message ?? payload.error ?? "Assistant context is unavailable."}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
