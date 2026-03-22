"use client";

import SegmentedControl, { type SegmentedControlOption } from "@/components/common/SegmentedControl";
import type { ExploreViewMode } from "@/lib/exploreViewModes";

type ExploreViewModeToggleProps = {
  value: ExploreViewMode;
  onChange: (value: ExploreViewMode) => void;
};

const MODES: Array<SegmentedControlOption<ExploreViewMode>> = [
  {
    value: "thumb",
    label: "Thumb",
    ariaLabel: "Compact thumbnails",
    icon: (
      <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current">
        <rect x="1.5" y="1.5" width="5" height="5" rx="1" strokeWidth="1.25" />
        <rect x="9.5" y="1.5" width="5" height="5" rx="1" strokeWidth="1.25" />
        <rect x="1.5" y="9.5" width="5" height="5" rx="1" strokeWidth="1.25" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    value: "thumb-lg",
    label: "Large",
    ariaLabel: "Large thumbnails",
    icon: (
      <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current">
        <rect x="1.5" y="2" width="13" height="12" rx="1.5" strokeWidth="1.25" />
        <path d="M5 6.5h6M5 9h6" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "list",
    label: "List",
    icon: (
      <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current">
        <path d="M3 4h10M3 8h10M3 12h10" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "details",
    label: "Details",
    icon: (
      <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current">
        <rect x="1.5" y="2" width="13" height="12" rx="1.5" strokeWidth="1.25" />
        <path d="M5 5.25h7M5 8h7M5 10.75h7" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M3.5 5.25h.01M3.5 8h.01M3.5 10.75h.01" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ExploreViewModeToggle({ value, onChange }: ExploreViewModeToggleProps) {
  return (
    <SegmentedControl
      options={MODES}
      value={value}
      onChange={onChange}
      ariaLabel="Explore view mode"
      labelVisibility="sm"
    />
  );
}
