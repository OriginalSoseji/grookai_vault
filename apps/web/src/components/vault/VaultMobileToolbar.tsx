"use client";

import type { VaultMobileViewMode } from "@/hooks/useVaultMobileViewMode";

type VaultMobileToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  mode: VaultMobileViewMode;
  onModeChange: (mode: VaultMobileViewMode) => void;
};

const VIEW_MODE_OPTIONS: Array<{ value: VaultMobileViewMode; label: string }> = [
  { value: "grid", label: "Grid" },
  { value: "detail", label: "Detail" },
  { value: "compact", label: "Compact" },
];

export function VaultMobileToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  mode,
  onModeChange,
}: VaultMobileToolbarProps) {
  return (
    <section className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:hidden">
      <div className="space-y-2">
        <label htmlFor="vault-mobile-search" className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
          Search Vault
        </label>
        <div className="flex items-center gap-2">
          <input
            id="vault-mobile-search"
            type="text"
            placeholder="Search cards, sets, or number"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
          />
          {searchQuery.trim().length > 0 ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">View</p>
        <div className="grid grid-cols-3 gap-2">
          {VIEW_MODE_OPTIONS.map((option) => {
            const isActive = option.value === mode;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onModeChange(option.value)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "border border-slate-950 bg-slate-950 text-white shadow-sm"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
