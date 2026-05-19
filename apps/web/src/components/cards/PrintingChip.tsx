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
      className={`inline-flex rounded-full border px-3.5 py-2 text-sm font-semibold transition-all duration-100 ${
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-md ring-2 ring-slate-950/15"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      {label}
    </button>
  );
}
