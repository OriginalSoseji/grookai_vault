"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PrintingChip from "@/components/cards/PrintingChip";
import { findPrintingByReference, isPrintingReferenceMatch } from "@/lib/cards/printingSelection";
import { resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import type { CardPrinting } from "@/types/cards";

type PrintingSelectorProps = {
  printings?: CardPrinting[];
  selectedPrintingId?: string;
  onSelectedPrintingChange?: (printing: CardPrinting) => void;
  title?: string;
  description?: string;
  compact?: boolean;
  showImageFallbackNotice?: boolean;
  getImageSuggestionHref?: (printing: CardPrinting) => string | null;
  imageSuggestionLinks?: Array<{ label: string; href: string }>;
};

const MAX_COLLAPSED_PRINTINGS = 5;

function getDefaultPrintingId(printings: CardPrinting[]) {
  return (
    printings.find((printing) => (printing.owned_count ?? 0) > 0)?.id ??
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
  title = "Variant / Finish",
  description,
  compact = false,
  showImageFallbackNotice = false,
  getImageSuggestionHref,
  imageSuggestionLinks = [],
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

    const selectedStillExists = displayablePrintings.some((printing) =>
      isPrintingReferenceMatch(printing, effectiveSelectedPrintingId),
    );
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
    findPrintingByReference(displayablePrintings, effectiveSelectedPrintingId) ?? displayablePrintings[0];
  const hiddenCount = Math.max(0, displayablePrintings.length - MAX_COLLAPSED_PRINTINGS);
  const visiblePrintings = expanded
    ? displayablePrintings
    : displayablePrintings.slice(0, MAX_COLLAPSED_PRINTINGS);
  const selectedOwnedCount = selectedPrinting.owned_count ?? 0;
  const selectedOwnershipLabel = selectedOwnedCount > 0 ? `Owned: ${selectedOwnedCount}` : "Not in vault";
  const selectedImagePresentation = resolveCardImagePresentation(selectedPrinting);
  const selectedUsesRepresentativeImage = showImageFallbackNotice && selectedImagePresentation.isRepresentative;
  const selectedUsesBaseImage =
    showImageFallbackNotice &&
    (selectedPrinting.is_display_fallback || (!selectedPrinting.display_image_url && !selectedPrinting.image_url));
  const selectedNeedsImageNotice = selectedUsesRepresentativeImage || selectedUsesBaseImage;
  const imageSuggestionHref = selectedNeedsImageNotice ? getImageSuggestionHref?.(selectedPrinting) ?? null : null;

  return (
    <section className={`gv-action-panel space-y-4 ${compact ? "p-4" : "p-5"}`}>
      <div className="space-y-1">
        <h2 className="gv-eyebrow">{title}</h2>
        <p className="gv-quiet-line text-sm">
          {description ??
          (selectedPrintingFallbackOnly
            ? "No child printings are cataloged for this card. Showing the canonical base display."
            : "Choose the exact version before adding it to your vault.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {visiblePrintings.map((printing) => (
          <PrintingChip
            key={printing.id}
            label={`${printing.finish_name ?? "Printing"}${(printing.owned_count ?? 0) > 0 ? ` ${printing.owned_count}x` : ""}`}
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
            className="gv-secondary-button min-h-0 px-3 py-1.5 text-sm"
          >
            +{hiddenCount} more
          </button>
        ) : null}
      </div>

      <div className="gv-hi-selected-version gv-quiet-panel px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected version</p>
            <p className="gv-hi-card-identity mt-1 text-lg tracking-tight">{selectedPrinting.finish_name ?? "Printing"}</p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
              selectedOwnedCount > 0
                ? "gv-hi-ownership"
                : "border-slate-200 bg-white/80 text-slate-600"
            }`}
          >
            {selectedOwnershipLabel}
          </span>
        </div>
        {selectedNeedsImageNotice ? (
          <div className="mt-3 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">
              {selectedImagePresentation.detailBadgeLabel ??
                (selectedUsesRepresentativeImage ? "Representative image" : "Using base image")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span>
                {selectedUsesRepresentativeImage
                  ? selectedImagePresentation.detailNote
                  : selectedPrinting.is_display_fallback
                  ? "No finish-specific versions are cataloged for this card yet."
                  : "This selected version does not have a reviewed image yet."}
              </span>
              {imageSuggestionHref ? (
                <Link
                  href={imageSuggestionHref}
                  className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 font-semibold text-amber-950 transition hover:border-amber-400 hover:bg-amber-200"
                >
                  Suggest image
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 font-semibold text-amber-900 opacity-70"
                  aria-disabled="true"
                >
                  Suggest image
                </button>
              )}
              {imageSuggestionLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="inline-flex rounded-full border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-950 transition hover:border-amber-400 hover:bg-amber-100"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
