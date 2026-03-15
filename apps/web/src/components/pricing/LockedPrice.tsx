import Link from "next/link";

type LockedPriceProps = {
  href?: string;
  size?: "grid" | "list" | "dense" | "detail";
  className?: string;
};

function getClasses(size: LockedPriceProps["size"]) {
  switch (size) {
    case "dense":
      return {
        wrapper: "space-y-1",
        label: "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400",
        value: "text-sm font-semibold text-slate-700",
        note: "text-[11px] text-slate-400",
      };
    case "list":
      return {
        wrapper: "space-y-1",
        label: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400",
        value: "text-sm font-semibold text-slate-800",
        note: "text-[11px] text-slate-400",
      };
    case "detail":
      return {
        wrapper: "space-y-1.5",
        label: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
        value: "text-xl font-semibold tracking-tight text-slate-900",
        note: "text-xs leading-5 text-slate-500",
      };
    default:
      return {
        wrapper: "space-y-1",
        label: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400",
        value: "text-sm font-semibold text-slate-800",
        note: "text-[11px] text-slate-400",
      };
  }
}

export default function LockedPrice({ href, size = "grid", className = "" }: LockedPriceProps) {
  const classes = getClasses(size);
  const content = (
    <div className={`${classes.wrapper} ${className}`.trim()}>
      <p className={classes.label}>Grookai Value</p>
      <p className={classes.value}>Sign in to reveal</p>
      {size === "detail" ? (
        <p className={classes.note}>Account required to unlock pricing.</p>
      ) : (
        <p className={classes.note}>Account required</p>
      )}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block rounded-[12px] transition hover:bg-slate-50">
      {content}
    </Link>
  );
}
