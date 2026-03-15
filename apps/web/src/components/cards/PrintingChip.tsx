"use client";

type PrintingChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export default function PrintingChip({ label, active = false, onClick }: PrintingChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-100 ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      {label}
    </button>
  );
}
