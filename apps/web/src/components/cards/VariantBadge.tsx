type VariantBadgeProps = {
  label: string;
  tone?: "variant" | "selected" | "context" | "metadata";
};

export default function VariantBadge({ label, tone = "variant" }: VariantBadgeProps) {
  const toneClassName =
    tone === "selected"
      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
      : tone === "context"
        ? "gv-hi-search-context"
        : tone === "metadata"
          ? "border-slate-200 bg-white text-slate-500"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${toneClassName}`}>
      {label}
    </span>
  );
}
