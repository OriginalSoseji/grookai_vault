import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";

type VisiblePriceProps = {
  value?: number | null;
  size?: "grid" | "list" | "dense" | "detail";
  note?: "none" | "compact" | "full";
  className?: string;
  label?: string;
  sourceLabel?: string;
  cardPrintId?: string;
  cardPrintingId?: string;
  printingGvId?: string;
  observedAt?: string;
  publishedAt?: string;
  provenanceId?: string;
  pricingScope?: "parent" | "card_printing";
  isFromPrice?: boolean;
};

function getClasses(size: VisiblePriceProps["size"]) {
  switch (size) {
    case "dense":
      return {
        wrapper: "space-y-1",
        label: "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400",
        value: "text-sm font-semibold text-slate-900",
        note: "text-[11px] text-slate-400",
      };
    case "list":
      return {
        wrapper: "space-y-1",
        label: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400",
        value: "text-sm font-semibold text-slate-900",
        note: "text-[11px] text-slate-400",
      };
    case "detail":
      return {
        wrapper: "space-y-1.5",
        label: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
        value: "text-xl font-semibold tracking-tight text-slate-950",
        note: "text-xs leading-5 text-slate-500",
      };
    default:
      return {
        wrapper: "space-y-1",
        label: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400",
        value: "text-sm font-semibold text-slate-900",
        note: "text-[11px] text-slate-400",
      };
  }
}

export default function VisiblePrice({
  value,
  size = "grid",
  note = "none",
  className = "",
  label = "TCGPlayer Market",
  sourceLabel = "TCGPlayer Market",
  cardPrintId,
  cardPrintingId,
  printingGvId,
  observedAt,
  publishedAt,
  provenanceId,
  pricingScope = "parent",
  isFromPrice = false,
}: VisiblePriceProps) {
  const classes = getClasses(size);

  return (
    <div
      className={`${classes.wrapper} ${className}`.trim()}
      data-pricing-proof="tcgplayer-market"
      data-pricing-status={
        typeof value === "number" ? "available" : "unavailable"
      }
      data-pricing-scope={pricingScope}
      data-card-print-id={cardPrintId}
      data-card-printing-id={cardPrintingId}
      data-printing-gv-id={printingGvId}
      data-market-close-usd={value}
      data-currency="USD"
      data-source-name="tcgplayer"
      data-source-label={sourceLabel}
      data-observed-at={observedAt}
      data-published-at={publishedAt}
      data-provenance-id={provenanceId}
      data-is-from-price={isFromPrice ? "true" : "false"}
    >
      <p className={classes.label}>{label}</p>
      <p className={classes.value}>
        {isFromPrice ? "From " : ""}
        {formatUsdPrice(value)}
      </p>
      {note === "compact" ? <p className={classes.note}>Latest qualified close</p> : null}
      {note === "full" ? (
        <p className={classes.note}>
          Exact-printing TCGPlayer market price. Active listing asks are tracked separately.
        </p>
      ) : null}
    </div>
  );
}
