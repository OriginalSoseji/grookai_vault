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
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_14px_32px_-22px_rgba(15,23,42,0.9)] ring-2 ring-slate-950/10 dark:border-white dark:bg-white dark:text-slate-950 dark:ring-white/10"
          : "border-slate-200 bg-white/76 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:border-slate-400 hover:bg-white hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/62 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800/82 dark:hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
