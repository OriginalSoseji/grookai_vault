import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";

type VisiblePriceProps = {
  value?: number | null;
  size?: "grid" | "list" | "dense" | "detail";
  note?: "none" | "compact" | "full";
  className?: string;
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
}: VisiblePriceProps) {
  const classes = getClasses(size);

  return (
    <div className={`${classes.wrapper} ${className}`.trim()}>
      <p className={classes.label}>Grookai Value</p>
      <p className={classes.value}>{formatUsdPrice(value)}</p>
      {note === "compact" ? <p className={classes.note}>Beta estimate</p> : null}
      {note === "full" ? (
        <p className={classes.note}>Derived from active listings and market data. We are actively refining the model.</p>
      ) : null}
    </div>
  );
}
