"use client";

import { useEffect, useMemo, useState } from "react";
import PrintingChip from "@/components/cards/PrintingChip";
import type { CardPrinting } from "@/types/cards";

type PrintingSelectorProps = {
  printings?: CardPrinting[];
  selectedPrintingId?: string;
  onSelectedPrintingChange?: (printing: CardPrinting) => void;
  title?: string;
  description?: string;
  compact?: boolean;
};

const MAX_COLLAPSED_PRINTINGS = 5;

function getDefaultPrintingId(printings: CardPrinting[]) {
  return (
    printings.find((printing) => printing.finish_key === "normal")?.id ??
    printings.find((printing) => printing.finish_key === "holo")?.id ??
    printings[0]?.id ??
    ""
  );
}

export default function PrintingSelector({
  printings = [],
  selectedPrintingId,
  onSelectedPrintingChange,
  title = "Printings",
  description,
  compact = false,
}: PrintingSelectorProps) {
  const displayablePrintings = useMemo(() => {
    const byLabel = new Map<string, CardPrinting>();

    for (const printing of printings) {
      if (!printing.id || !printing.finish_name) {
        continue;
      }

      const label = printing.finish_name.trim();
      if (!label || byLabel.has(label)) {
        continue;
      }

      byLabel.set(label, {
        ...printing,
        finish_name: label,
      });
    }

    return Array.from(byLabel.values()).sort(
      (a, b) => (a.finish_sort_order ?? 999) - (b.finish_sort_order ?? 999),
    );
  }, [printings]);
  const [internalSelectedPrintingId, setInternalSelectedPrintingId] = useState(getDefaultPrintingId(displayablePrintings));
  const [expanded, setExpanded] = useState(false);
  const effectiveSelectedPrintingId = selectedPrintingId ?? internalSelectedPrintingId;
  const selectedPrintingFallbackOnly =
    displayablePrintings.length === 1 && displayablePrintings[0]?.is_display_fallback === true;

  useEffect(() => {
    if (displayablePrintings.length <= 1) {
      return;
    }

    const selectedStillExists = displayablePrintings.some((printing) => printing.id === effectiveSelectedPrintingId);
    if (!selectedStillExists) {
      const fallbackPrinting = displayablePrintings.find((printing) => printing.id === getDefaultPrintingId(displayablePrintings));
      setInternalSelectedPrintingId(fallbackPrinting?.id ?? "");
      if (fallbackPrinting) {
        onSelectedPrintingChange?.(fallbackPrinting);
      }
    }
  }, [displayablePrintings, effectiveSelectedPrintingId, onSelectedPrintingChange]);

  if (displayablePrintings.length === 0 || (!selectedPrintingFallbackOnly && displayablePrintings.length <= 1)) {
    return null;
  }

  const selectedPrinting =
    displayablePrintings.find((printing) => printing.id === effectiveSelectedPrintingId) ?? displayablePrintings[0];
  const hiddenCount = Math.max(0, displayablePrintings.length - MAX_COLLAPSED_PRINTINGS);
  const visiblePrintings = expanded
    ? displayablePrintings
    : displayablePrintings.slice(0, MAX_COLLAPSED_PRINTINGS);

  return (
    <section className={`space-y-4 rounded-[16px] border border-slate-200 bg-white shadow-sm ${compact ? "p-4" : "p-6"}`}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</h2>
        <p className="text-sm text-slate-600">
          {description ??
          (selectedPrintingFallbackOnly
            ? "No child printings are cataloged for this card. Showing the canonical base display."
            : "Available finishes for this card.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {visiblePrintings.map((printing) => (
          <PrintingChip
            key={printing.id}
            label={printing.finish_name ?? "Printing"}
            active={printing.id === selectedPrinting.id}
            onClick={() => {
              setInternalSelectedPrintingId(printing.id);
              onSelectedPrintingChange?.(printing);
            }}
          />
        ))}

        {!expanded && hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
          >
            +{hiddenCount} more
          </button>
        ) : null}
      </div>

      <div className="rounded-[14px] border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Printing</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{selectedPrinting.finish_name ?? "Printing"}</p>
      </div>
    </section>
  );
}
