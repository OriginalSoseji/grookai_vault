type CardImageTruthBadgeProps = {
  label: string;
  note?: string | null;
  emphasis?: "default" | "strong";
  className?: string;
};

function getDefaultNote(label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  if (normalizedLabel.includes("variant") || normalizedLabel.includes("pending")) {
    return "Correct printing. The displayed image may not show the exact finish, stamp, parallel, or variant visual yet.";
  }
  if (normalizedLabel.includes("representative")) {
    return "Correct printing. The displayed image is representative and may not show the exact finish, stamp, or parallel.";
  }
  if (normalizedLabel.includes("review")) {
    return "Image use is blocked until the visual evidence is reviewed.";
  }
  return null;
}

export default function CardImageTruthBadge({
  label,
  note,
  emphasis = "default",
  className = "",
}: CardImageTruthBadgeProps) {
  const resolvedNote = note?.trim() || getDefaultNote(label);
  const toneClassName =
    emphasis === "strong"
      ? "border-amber-300/90 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/14 dark:text-amber-100"
      : "border-slate-300/80 bg-white/95 text-slate-700 dark:border-slate-600/80 dark:bg-slate-900/92 dark:text-slate-200";

  return (
    <span
      title={resolvedNote ?? undefined}
      aria-label={resolvedNote ? `${label}: ${resolvedNote}` : label}
      className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-sm backdrop-blur ${toneClassName} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
