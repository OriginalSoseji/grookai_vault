"use client";

import { SearchToolbar, SearchToolbarButton, SearchToolbarInput } from "@/components/common/SearchToolbar";
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
    <SearchToolbar className="space-y-2 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <SearchToolbarInput
            id="vault-mobile-search"
            aria-label="Search Vault"
            shellClassName="min-w-0 flex-1"
            type="text"
            placeholder="Search cards, sets, or number"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            tone="soft"
          />
          <select aria-label="Choose vault mobile view" value={mode}
            onChange={(event) => onModeChange(event.target.value as VaultMobileViewMode)}
            className="h-11 max-w-28 rounded-xl border border-slate-200 bg-transparent px-2 text-sm dark:border-slate-700">
            {VIEW_MODE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        {searchQuery.trim().length > 0 ? (
            <SearchToolbarButton type="button" tone="secondary" onClick={onClearSearch} className="shrink-0">
              Clear
            </SearchToolbarButton>
          ) : null}
    </SearchToolbar>
  );
}
