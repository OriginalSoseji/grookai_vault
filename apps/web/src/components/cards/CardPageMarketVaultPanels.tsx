"use client";

import { useMemo, useState } from "react";
import CardPagePricingRail from "@/components/pricing/CardPagePricingRail";
import AddSlabCardAction, { type AddSlabActionResult } from "@/components/slabs/AddSlabCardAction";
import CompareCardButton from "@/components/compare/CompareCardButton";
import ShareCardButton from "@/components/ShareCardButton";
import AddToVaultCardAction, {
  type AddToVaultActionResult,
} from "@/components/vault/AddToVaultCardAction";
import { findPrintingByReference } from "@/lib/cards/printingSelection";
import type { CardPricingUiRecord } from "@/lib/pricing/getCardPricingUiByCardPrintId";
import type { CardPrinting } from "@/types/cards";

type AddToVaultCardServerAction = (
  previousState: AddToVaultActionResult | null,
  formData: FormData,
) => Promise<AddToVaultActionResult>;

type AddSlabCardServerAction = (
  previousState: AddSlabActionResult | null,
  formData: FormData,
) => Promise<AddSlabActionResult>;

type CardPageMarketVaultPanelsProps = {
  addToVaultAction: AddToVaultCardServerAction;
  createSlabAction: AddSlabCardServerAction;
  isAuthenticated: boolean;
  loginHref: string;
  currentPath: string;
  gvId: string;
  cardPrintId?: string | null;
  cardName: string;
  printings: CardPrinting[];
  initialPrintingId?: string | null;
  pricing: CardPricingUiRecord | null;
  pricingRecords: CardPricingUiRecord[];
  ownershipLabel: string;
  rawCount: number;
  slabCount: number;
};

function getInitialPrinting(printings: CardPrinting[], initialPrintingId?: string | null) {
  if (initialPrintingId) {
    const initialPrinting = findPrintingByReference(printings, initialPrintingId);
    if (initialPrinting) return initialPrinting;
  }

  return (
    printings.find((printing) => printing.finish_key === "normal") ??
    printings.find((printing) => printing.finish_key === "holo") ??
    printings[0] ??
    null
  );
}

export default function CardPageMarketVaultPanels({
  addToVaultAction,
  createSlabAction,
  isAuthenticated,
  loginHref,
  currentPath,
  gvId,
  cardPrintId = null,
  cardName,
  printings,
  initialPrintingId = null,
  pricing,
  pricingRecords,
  ownershipLabel,
  rawCount,
  slabCount,
}: CardPageMarketVaultPanelsProps) {
  const initialPrinting = useMemo(() => getInitialPrinting(printings, initialPrintingId), [initialPrintingId, printings]);
  const [selectedPrinting, setSelectedPrinting] = useState<CardPrinting | null>(initialPrinting);
  const selectedPrintingId = selectedPrinting?.id ?? null;
  const selectedPrintingGvId = selectedPrinting?.printing_gv_id ?? null;

  return (
    <aside className="grid gap-4 lg:grid-cols-[minmax(240px,0.88fr)_minmax(300px,1.12fr)]">
      <div className="gv-action-panel p-5 sm:p-6">
        <CardPagePricingRail
          isAuthenticated={isAuthenticated}
          loginHref={loginHref}
          gvId={gvId}
          cardPrintId={cardPrintId}
          pricing={pricing}
          pricingRecords={pricingRecords}
          selectedCardPrintingId={selectedPrintingId}
          selectedPrintingGvId={selectedPrintingGvId}
        />
      </div>

      <div className="gv-action-panel space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Vault</p>
          <p className="gv-hi-card-identity mt-2 text-sm leading-6">{ownershipLabel}.</p>
          {rawCount > 0 || slabCount > 0 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {[rawCount > 0 ? `${rawCount} raw` : null, slabCount > 0 ? `${slabCount} slab` : null]
                .filter((value): value is string => value !== null)
                .join(" • ")}
            </p>
          ) : null}
        </div>

        <AddToVaultCardAction
          action={addToVaultAction}
          isAuthenticated={isAuthenticated}
          loginHref={loginHref}
          currentPath={currentPath}
          gvId={gvId}
          printings={printings}
          initialPrintingId={initialPrintingId}
          selectedPrintingId={selectedPrintingId}
          onSelectedPrintingChange={setSelectedPrinting}
        />

        <div className="flex flex-wrap items-center gap-3">
          {isAuthenticated ? <AddSlabCardAction action={createSlabAction} cardName={cardName} /> : null}
          <CompareCardButton gvId={gvId} />
          <ShareCardButton gvId={gvId} />
        </div>
      </div>
    </aside>
  );
}
