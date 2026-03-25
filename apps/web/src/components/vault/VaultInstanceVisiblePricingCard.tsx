import {
  formatVaultInstancePrice,
  getVaultInstancePricingModeLabel,
  getVaultInstancePricingSourceLabel,
  type VaultInstancePricingMode,
} from "@/lib/vaultInstancePricing";

type VaultInstanceVisiblePricingCardProps = {
  pricingMode: VaultInstancePricingMode;
  askingPriceAmount: number | null;
  askingPriceCurrency: string | null;
  askingPriceNote: string | null;
  marketReferencePrice: number | null;
  marketReferenceSource: string | null;
  marketReferenceUpdatedAt: string | null;
  isGraded: boolean;
};

function formatPricingTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VaultInstanceVisiblePricingCard({
  pricingMode,
  askingPriceAmount,
  askingPriceCurrency,
  askingPriceNote,
  marketReferencePrice,
  marketReferenceSource,
  marketReferenceUpdatedAt,
  isGraded,
}: VaultInstanceVisiblePricingCardProps) {
  const marketReferenceDate = formatPricingTimestamp(marketReferenceUpdatedAt);

  return (
    <div className="space-y-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
        <p className="text-sm font-medium text-slate-950">{getVaultInstancePricingModeLabel(pricingMode)}</p>
      </div>

      {pricingMode === "asking" ? (
        <div className="space-y-1">
          <p className="text-xl font-semibold tracking-tight text-slate-950">
            {formatVaultInstancePrice(askingPriceAmount, askingPriceCurrency)}
          </p>
          {askingPriceNote ? <p className="text-sm text-slate-600">{askingPriceNote}</p> : null}
        </div>
      ) : typeof marketReferencePrice === "number" ? (
        <div className="space-y-1">
          <p className="text-xl font-semibold tracking-tight text-slate-950">
            {formatVaultInstancePrice(marketReferencePrice, "USD")}
          </p>
          <p className="text-sm text-slate-600">
            {getVaultInstancePricingSourceLabel(marketReferenceSource)}
            {marketReferenceDate ? ` • Updated ${marketReferenceDate}` : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          {isGraded ? "No market reference available for this slab yet." : "No market reference available."}
        </p>
      )}
    </div>
  );
}
