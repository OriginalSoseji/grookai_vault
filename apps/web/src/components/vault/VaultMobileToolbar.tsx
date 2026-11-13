"use client";

import { SearchToolbar, SearchToolbarButton, SearchToolbarField, SearchToolbarInput } from "@/components/common/SearchToolbar";
import { SegmentedControl, type SegmentedControlOption } from "@/components/common/SegmentedControl";
import type { VaultMobileViewMode } from "@/hooks/useVaultMobileViewMode";
import type { VaultGridColumns } from "@/hooks/useVaultGridColumns";

type VaultMobileToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  mode: VaultMobileViewMode;
  onModeChange: (mode: VaultMobileViewMode) => void;
  columns: VaultGridColumns;
  onColumnsChange: (columns: VaultGridColumns) => void;
};

const VIEW_MODE_OPTIONS: Array<SegmentedControlOption<VaultMobileViewMode>> = [
  { value: "grid", label: "Grid" },
  { value: "detail", label: "Detail" },
  { value: "compact", label: "Compact" },
];

const GRID_COLUMN_OPTIONS: Array<SegmentedControlOption<VaultGridColumns>> = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];

export function VaultMobileToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  mode,
  onModeChange,
  columns,
  onColumnsChange,
}: VaultMobileToolbarProps) {
  return (
    <SearchToolbar surface="card" className="space-y-3 md:hidden">
      <SearchToolbarField label="Search Vault">
        <div className="flex items-center gap-2">
          <SearchToolbarInput
            id="vault-mobile-search"
            type="search"
            name="vault-search"
            aria-label="Search Vault"
            autoComplete="off"
            placeholder="Search cards, sets, or number…"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            tone="soft"
          />
          {searchQuery.trim().length > 0 ? (
            <SearchToolbarButton type="button" tone="secondary" onClick={onClearSearch} className="shrink-0">
              Clear
            </SearchToolbarButton>
          ) : null}
        </div>
      </SearchToolbarField>

      <SearchToolbarField label="View">
        <SegmentedControl
          options={VIEW_MODE_OPTIONS}
          value={mode}
          onChange={onModeChange}
          ariaLabel="Choose vault mobile view"
          className="w-full justify-between bg-slate-50"
        />
      </SearchToolbarField>

      {mode === "grid" ? (
        <SearchToolbarField label="Grid size">
          <SegmentedControl
            options={GRID_COLUMN_OPTIONS}
            value={columns}
            onChange={onColumnsChange}
            ariaLabel="Choose Vault grid columns"
            className="w-full justify-between bg-slate-50"
          />
        </SearchToolbarField>
      ) : null}
    </SearchToolbar>
  );
}
