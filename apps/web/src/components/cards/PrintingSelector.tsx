"use client";

import { useEffect, useMemo, useState } from "react";
import PrintingChip from "@/components/cards/PrintingChip";
import type { CardPrinting } from "@/types/cards";

type PrintingSelectorProps = {
  printings?: CardPrinting[];
};

const MAX_COLLAPSED_PRINTINGS = 5;

export default function PrintingSelector({ printings = [] }: PrintingSelectorProps) {
  const validPrintings = useMemo(
    () => printings.filter((printing) => Boolean(printing.id) && Boolean(printing.finish_name)),
    [printings],
  );
  const [selectedPrintingId, setSelectedPrintingId] = useState(validPrintings[0]?.id ?? "");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (validPrintings.length <= 1) {
      return;
    }

    const selectedStillExists = validPrintings.some((printing) => printing.id === selectedPrintingId);
    if (!selectedStillExists) {
      setSelectedPrintingId(validPrintings[0]?.id ?? "");
    }
  }, [selectedPrintingId, validPrintings]);

  if (validPrintings.length <= 1) {
    return null;
  }

  const selectedPrinting = validPrintings.find((printing) => printing.id === selectedPrintingId) ?? validPrintings[0];
  const hiddenCount = Math.max(0, validPrintings.length - MAX_COLLAPSED_PRINTINGS);
  const visiblePrintings = expanded ? validPrintings : validPrintings.slice(0, MAX_COLLAPSED_PRINTINGS);

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
