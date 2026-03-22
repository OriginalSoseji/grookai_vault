"use client";

import type { ReactNode, KeyboardEvent } from "react";
import { useRef } from "react";

export type SegmentedControlOption<T extends string = string> = {
  value: T;
  label: string;
  ariaLabel?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

type SegmentedControlProps<T extends string = string> = {
  options: Array<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "compact" | "default";
  labelVisibility?: "always" | "sm" | "sr-only";
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getNextEnabledIndex<T extends string>(
  options: Array<SegmentedControlOption<T>>,
  startIndex: number,
  step: 1 | -1,
) {
  for (let offset = 1; offset <= options.length; offset += 1) {
    const nextIndex = (startIndex + offset * step + options.length) % options.length;
    if (!options[nextIndex]?.disabled) {
      return nextIndex;
    }
  }

  return startIndex;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "default",
  labelVisibility = "always",
  className,
}: SegmentedControlProps<T>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);

  const labelClassName =
    labelVisibility === "sr-only"
      ? "sr-only"
      : labelVisibility === "sm"
        ? "hidden sm:inline"
        : "";

  const buttonClassName =
    size === "compact"
      ? "rounded-full px-2.5 py-1.5 text-xs font-medium"
      : "rounded-full px-3 py-1.5 text-sm font-medium";

  function focusOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) {
      return;
    }

    onChange(option.value);
    buttonRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(getNextEnabledIndex(options, index, 1));
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(getNextEnabledIndex(options, index, -1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstIndex = options.findIndex((option) => !option.disabled);
      if (firstIndex >= 0) {
        focusOption(firstIndex);
      }
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const reversedIndex = [...options].reverse().findIndex((option) => !option.disabled);
      if (reversedIndex >= 0) {
        focusOption(options.length - 1 - reversedIndex);
      }
    }
  }

  return (
    <div
      className={cx(
        "inline-flex flex-wrap rounded-full border border-slate-200 bg-white p-1 shadow-sm",
        className,
      )}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        const tabIndex =
          option.disabled
            ? -1
            : active || selectedIndex < 0
              ? 0
              : -1;

        return (
          <button
            key={option.value}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.ariaLabel ?? option.label}
            aria-disabled={option.disabled || undefined}
            disabled={option.disabled}
            tabIndex={tabIndex}
            className={cx(
              "inline-flex items-center gap-2 transition",
              buttonClassName,
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300",
            )}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
            <span className={labelClassName}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
