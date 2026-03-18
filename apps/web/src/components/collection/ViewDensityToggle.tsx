"use client";

import type { ViewDensity } from "@/hooks/useViewDensity";

type ViewDensityToggleProps = {
  value: ViewDensity;
  onChange: (value: ViewDensity) => void;
};

const baseButtonClassName = "rounded-md border px-3 py-1.5 text-sm transition";
const activeButtonClassName = "border-slate-950 bg-slate-950 text-white";
const inactiveButtonClassName = "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950";

export function ViewDensityToggle({ value, onChange }: ViewDensityToggleProps) {
  return (
    <div className="flex items-center gap-2" aria-label="Collection view density">
      <button
        type="button"
        className={`${baseButtonClassName} ${value === "compact" ? activeButtonClassName : inactiveButtonClassName}`}
        onClick={() => onChange("compact")}
        aria-pressed={value === "compact"}
      >
        Compact
      </button>
      <button
        type="button"
        className={`${baseButtonClassName} ${value === "default" ? activeButtonClassName : inactiveButtonClassName}`}
        onClick={() => onChange("default")}
        aria-pressed={value === "default"}
      >
        Default
      </button>
      <button
        type="button"
        className={`${baseButtonClassName} ${value === "large" ? activeButtonClassName : inactiveButtonClassName}`}
        onClick={() => onChange("large")}
        aria-pressed={value === "large"}
      >
        Large
      </button>
    </div>
  );
}

export default ViewDensityToggle;
