type VariantBadgeProps = {
  label: string;
};

export default function VariantBadge({ label }: VariantBadgeProps) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
      {label}
    </span>
  );
}
