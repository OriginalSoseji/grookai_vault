import type { PricingTrustState } from "@/lib/pricing/getPricingTrustState";
import type { ReferencePricing } from "@/lib/pricing/getReferencePricing";

type PricingTrustSummaryProps = {
  trustState: PricingTrustState;
  referencePricing?: ReferencePricing | null;
};

function formatCurrency(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatAge(ageInDays: number | null) {
  if (ageInDays === null) {
    return "Unknown age";
  }
  if (ageInDays === 0) {
    return "Observed today";
  }
  if (ageInDays === 1) {
    return "Observed 1 day ago";
  }
  return `Observed ${ageInDays} days ago`;
}

function toneClasses(label: PricingTrustState["confidenceLabel"] | PricingTrustState["freshnessLabel"] | PricingTrustState["marketState"]) {
  switch (label) {
    case "high":
    case "fresh":
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "medium":
    case "aging":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "low":
    case "thin":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "stale":
    case "none":
    case "unknown":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export default function PricingTrustSummary({ trustState, referencePricing }: PricingTrustSummaryProps) {
  const rangeMin = formatCurrency(trustState.acceptedPriceMin);
  const rangeMax = formatCurrency(trustState.acceptedPriceMax);
  const showRange = trustState.hasAcceptedComps && rangeMin && rangeMax;
  const referenceValue = formatCurrency(referencePricing?.rawReferenceValue ?? undefined);
  const showReference =
    trustState.acceptedCompCount === 0 &&
    referencePricing?.referenceAvailable === true &&
    Boolean(referenceValue);

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing Trust</p>
          <p className="text-sm font-semibold text-slate-950">{trustState.trustSummaryText}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClasses(trustState.confidenceLabel)}`}>
            {trustState.confidenceLabel === "none" ? "No confidence" : `${titleCase(trustState.confidenceLabel)} confidence`}
          </span>
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClasses(trustState.freshnessLabel)}`}>
            {trustState.freshnessLabel === "unknown" ? "Freshness unknown" : titleCase(trustState.freshnessLabel)}
          </span>
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClasses(trustState.marketState)}`}>
            {trustState.marketState === "none" ? "No active market" : `${titleCase(trustState.marketState)} market`}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>Accepted comps: {trustState.acceptedCompCount}</span>
          {showRange ? <span>Range: {rangeMin} - {rangeMax}</span> : null}
          <span>{formatAge(trustState.ageInDays)}</span>
          {trustState.hasFilteredRows ? <span>Filtered rows present</span> : null}
        </div>

        {showReference ? (
          <div className="rounded-[14px] border border-sky-200 bg-sky-50 px-3 py-3 text-xs text-sky-800">
            <span className="font-semibold uppercase tracking-[0.14em]">Reference</span>
            <span className="ml-2">Reference price: ~{referenceValue} (JustTCG)</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
