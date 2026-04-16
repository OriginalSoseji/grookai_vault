type CardImageTruthBadgeProps = {
  label: string;
  emphasis?: "default" | "strong";
  className?: string;
};

export default function CardImageTruthBadge({
  label,
  emphasis = "default",
  className = "",
}: CardImageTruthBadgeProps) {
  const toneClassName =
    emphasis === "strong"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-white/95 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-sm ${toneClassName} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
