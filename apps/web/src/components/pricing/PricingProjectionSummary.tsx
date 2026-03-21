import type { PricingProjectionState } from "@/lib/pricing/getPricingProjectionState";

type PricingProjectionSummaryProps = {
  projectionState: PricingProjectionState;
};

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
}

function toneClasses(label: PricingProjectionState["projectionConfidenceLabel"]) {
  switch (label) {
    case "high":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "medium":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "low":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "none":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export default function PricingProjectionSummary({ projectionState }: PricingProjectionSummaryProps) {
  const projectedValue = formatCurrency(projectionState.projectedPsa10Value);
  const referenceValue = formatCurrency(projectionState.referenceValueUsed);
  const rawMarketValue = formatCurrency(projectionState.rawMarketValueUsed);
  const upsideAbsolute = formatCurrency(projectionState.projectedUpsideAbsolute);
  const upsidePercent = formatPercent(projectionState.projectedUpsidePercent);

  return (
    <div className="rounded-[18px] border border-sky-200 bg-sky-50/70 px-4 py-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Projected PSA 10 Value</p>
          <p className="text-sm font-semibold text-slate-950">{projectionState.projectionSummaryText}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClasses(projectionState.projectionConfidenceLabel)}`}>
            {projectionState.projectionConfidenceLabel === "none"
              ? "No projection confidence"
              : `${titleCase(projectionState.projectionConfidenceLabel)} projection confidence`}
          </span>
          <span className="inline-flex rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            {projectionState.projectionMethodLabel}
          </span>
        </div>

        {projectionState.projectionAvailable && projectedValue ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] border border-sky-200 bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Projected Value</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{projectedValue}</p>
            </div>

            <div className="rounded-[14px] border border-sky-200 bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Upside</p>
              {upsideAbsolute ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{upsideAbsolute}</p>
                  {upsidePercent ? <p className="mt-1 text-xs text-slate-500">{upsidePercent}</p> : null}
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">Current raw market is unavailable, so upside cannot be calculated.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[14px] border border-sky-200 bg-white px-4 py-4">
            <p className="text-sm text-slate-700">PSA 10 projection unavailable</p>
            <p className="mt-1 text-xs text-slate-500">
              {projectionState.referenceValueUsed === null
                ? "No usable PSA 10 reference value is available yet."
                : "Projection data is incomplete."}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {referenceValue ? <span>Reference value used: {referenceValue}</span> : null}
          {rawMarketValue ? <span>Raw market value used: {rawMarketValue}</span> : null}
          <span>Projection only. Not current market price.</span>
        </div>

        {projectionState.projectionNotes.length > 0 ? (
          <ul className="space-y-1 text-xs text-slate-500">
            {projectionState.projectionNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
