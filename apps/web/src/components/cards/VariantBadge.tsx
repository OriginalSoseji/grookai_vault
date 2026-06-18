type VariantBadgeProps = {
  label: string;
  tone?: "variant" | "selected" | "context" | "metadata";
};

export default function VariantBadge({ label, tone = "variant" }: VariantBadgeProps) {
  const toneClassName =
    tone === "selected"
      ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
      : tone === "context"
        ? "gv-hi-search-context"
        : tone === "metadata"
          ? "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${toneClassName}`}>
      {label}
    </span>
  );
}
