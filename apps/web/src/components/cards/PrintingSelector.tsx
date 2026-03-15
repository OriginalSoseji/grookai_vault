"use client";

import { useEffect, useMemo, useState } from "react";
import PrintingChip from "@/components/cards/PrintingChip";
import type { CardPrinting } from "@/types/cards";

type PrintingSelectorProps = {
  printings?: CardPrinting[];
};

const MAX_COLLAPSED_PRINTINGS = 5;

export default function PrintingSelector({ printings = [] }: PrintingSelectorProps) {
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
  const [selectedPrintingId, setSelectedPrintingId] = useState(displayablePrintings[0]?.id ?? "");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (displayablePrintings.length <= 1) {
      return;
    }

    const selectedStillExists = displayablePrintings.some((printing) => printing.id === selectedPrintingId);
    if (!selectedStillExists) {
      setSelectedPrintingId(displayablePrintings[0]?.id ?? "");
    }
  }, [displayablePrintings, selectedPrintingId]);

  if (displayablePrintings.length <= 1) {
    return null;
  }

  const selectedPrinting =
    displayablePrintings.find((printing) => printing.id === selectedPrintingId) ?? displayablePrintings[0];
  const hiddenCount = Math.max(0, displayablePrintings.length - MAX_COLLAPSED_PRINTINGS);
  const visiblePrintings = expanded
    ? displayablePrintings
    : displayablePrintings.slice(0, MAX_COLLAPSED_PRINTINGS);

  return (
    <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Printings</h2>
        <p className="text-sm text-slate-600">Available finish variants for this canonical card.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {visiblePrintings.map((printing) => (
          <PrintingChip
            key={printing.id}
            label={printing.finish_name ?? "Printing"}
            active={printing.id === selectedPrinting.id}
            onClick={() => setSelectedPrintingId(printing.id)}
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
