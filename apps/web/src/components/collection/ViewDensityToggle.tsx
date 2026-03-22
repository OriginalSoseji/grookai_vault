"use client";

import SegmentedControl, { type SegmentedControlOption } from "@/components/common/SegmentedControl";
import type { ViewDensity } from "@/hooks/useViewDensity";

type ViewDensityToggleProps = {
  value: ViewDensity;
  onChange: (value: ViewDensity) => void;
};

const OPTIONS: Array<SegmentedControlOption<ViewDensity>> = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
];

export function ViewDensityToggle({ value, onChange }: ViewDensityToggleProps) {
  return (
    <SegmentedControl
      options={OPTIONS}
      value={value}
      onChange={onChange}
      ariaLabel="Collection view density"
      size="compact"
    />
  );
}

export default ViewDensityToggle;
