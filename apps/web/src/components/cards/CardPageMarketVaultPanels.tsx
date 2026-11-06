"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import CardPagePricingRail from "@/components/pricing/CardPagePricingRail";
import AddSlabCardAction, { type AddSlabActionResult } from "@/components/slabs/AddSlabCardAction";
import SaveCardButton from "@/components/cards/SaveCardButton";
import CardUtilityActions from "@/components/cards/CardUtilityActions";
import AddToVaultCardAction, {
  type AddToVaultActionResult,
} from "@/components/vault/AddToVaultCardAction";
import { findPrintingByReference } from "@/lib/cards/printingSelection";
import type { CardPricingUiRecord } from "@/lib/pricing/getCardPricingUiByCardPrintId";
import type { CardPrinting } from "@/types/cards";
import JungleEditionChoices from "@/components/cards/JungleEditionChoices";
import type { JungleEditionResolution } from "@/lib/cards/jungleEditionResolution";
import AddJungleSlabAction from "@/components/slabs/AddJungleSlabAction";
import CardMarketplaceLinks from "@/components/pricing/CardMarketplaceLinks";
import CardEbayLinks from "@/components/pricing/CardEbayLinks";
import CollectorCardContext from "./CollectorCardContext";

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
  imageUrl?: string | null;
  collectorNumber?: string | null;
  marketplaceAction?: ReactNode;
  initialAddOpen?: boolean;
  setName?: string | null;
  setCode?: string | null;
  number?: string | null;
  tcgplayerId?: string | null;
  printings: CardPrinting[];
  initialPrintingId?: string | null;
  pricing: CardPricingUiRecord | null;
  pricingRecords: CardPricingUiRecord[];
  ownershipLabel: string;
  rawCount: number;
  slabCount: number;
  editionResolution?: JungleEditionResolution | null;
  jungleSlabIntakeEnabled?: boolean;
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
  imageUrl = null,
  collectorNumber = null,
  marketplaceAction,
  initialAddOpen = false,
  setName = null,
  setCode = null,
  number = null,
  tcgplayerId = null,
  printings,
  initialPrintingId = null,
  pricing,
  pricingRecords,
  ownershipLabel,
  rawCount,
  slabCount,
  editionResolution = null,
  jungleSlabIntakeEnabled = false,
}: CardPageMarketVaultPanelsProps) {
  const initialPrinting = useMemo(() => getInitialPrinting(printings, initialPrintingId), [initialPrintingId, printings]);
  const [selectedPrinting, setSelectedPrinting] = useState<CardPrinting | null>(initialPrinting);
  const addDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (initialAddOpen) addDialog.current?.showModal();
    else addDialog.current?.close();
  }, [initialAddOpen]);
  const selectedPrintingId = selectedPrinting?.id ?? null;
  const selectedPrintingGvId = selectedPrinting?.printing_gv_id ?? null;
  const printingReference = selectedPrinting?.is_display_fallback
    ? null : selectedPrintingGvId ?? selectedPrintingId;
  const imageParams = new URLSearchParams({ intent: "MISSING_IMAGE", card: gvId, reason: "image_update_request", returnTo: currentPath });
  if (printingReference) imageParams.set("printing", printingReference);
  if (selectedPrinting?.finish_name) imageParams.set("finish", selectedPrinting.finish_name);
  const imagePath = `/submit?${imageParams.toString()}`;

  return (
    <aside className="gv-collector-actions">
      <div className="gv-detail-market gv-action-panel order-2 p-5 sm:p-6 lg:order-1">
        {editionResolution && ["selection_required", "unavailable"].includes(editionResolution.status)
          ? <p className="text-sm">Choose a confirmed edition to view its price.</p>
          : (
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
          )}
      </div>

      {printings.length > 1 ? <label className="gv-collector-finish">
        Variant<select aria-label="Selected printing" value={selectedPrintingId ?? ""}
          onChange={(event) => setSelectedPrinting(printings.find(p => p.id === event.target.value) ?? null)}>
          {printings.map(p => <option key={p.id} value={p.id}>{p.finish_name}</option>)}
        </select>
      </label> : null}
      <div className="gv-collector-action-row">
        <button type="button" className="gv-primary-button" onClick={() => addDialog.current?.showModal()}>
          Add to Vault <span aria-hidden>＋</span>
        </button>
        {marketplaceAction ?? <CardMarketplaceLinks cardPrintId={cardPrintId ?? ""}
          cardPrintingId={selectedPrintingId} identity={cardName} imageUrl={imageUrl} context={setName ?? undefined} />}
      </div>
      <CardEbayLinks cardName={cardName} setName={setName} collectorNumber={collectorNumber ?? number}
        finish={selectedPrinting?.finish_name} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gv-border-soft)] pt-4">
        <div><p className="text-sm font-semibold">Your collection</p>
          <p className="mt-1 text-xs text-[var(--gv-text-secondary)]">{ownershipLabel}.</p></div>
        {cardPrintId ? <SaveCardButton cardPrintId={cardPrintId} isAuthenticated={isAuthenticated} loginHref={loginHref} /> : null}
      </div>
      <dialog ref={addDialog} className="gv-collector-sheet" aria-label="Add to Vault"
        onClick={event => { if (event.target === event.currentTarget) addDialog.current?.close(); }}>
        <div className="gv-sheet-handle" />
        <div className="gv-sheet-heading"><h2>Add to Vault</h2>
          <button type="button" aria-label="Close add to Vault" onClick={() => addDialog.current?.close()}>×</button></div>
        <CollectorCardContext name={cardName} context={[setName, selectedPrinting?.finish_name].filter(Boolean).join(" · ")} imageUrl={imageUrl} />

      <div className="gv-detail-vault gv-action-panel order-1 space-y-5 p-5 sm:p-6 lg:order-2" data-card-vault-panel>
        <div className="gv-detail-ownership" data-owned={rawCount > 0 || slabCount > 0}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Your collection</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Add to Vault</h2>
          <p className="gv-hi-card-identity mt-2 text-sm leading-6">{ownershipLabel}.</p>
          {rawCount > 0 || slabCount > 0 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {[rawCount > 0 ? `${rawCount} raw` : null, slabCount > 0 ? `${slabCount} slab` : null]
                .filter((value): value is string => value !== null)
                .join(" • ")}
            </p>
          ) : null}
        </div>

        {editionResolution && ["selection_required", "unavailable"].includes(editionResolution.status)
          ? <JungleEditionChoices resolution={editionResolution} /> : <AddToVaultCardAction
          compactPresentation
          action={addToVaultAction}
          isAuthenticated={isAuthenticated}
          loginHref={loginHref}
          currentPath={currentPath}
          gvId={gvId}
          printings={printings}
          initialPrintingId={initialPrintingId}
          selectedPrintingId={selectedPrintingId}
          onSelectedPrintingChange={setSelectedPrinting}
        />}

        <div className="gv-detail-secondary-actions flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
          {isAuthenticated && (!editionResolution || editionResolution.status === "not_applicable") ? <AddSlabCardAction action={createSlabAction} cardName={cardName} /> : null}
          {isAuthenticated && jungleSlabIntakeEnabled && editionResolution?.status === "ready"
            ? <AddJungleSlabAction options={editionResolution.options} /> : null}
        </div>

        <div className="border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
          <CardUtilityActions
            gvId={gvId}
            printingReference={printingReference}
            cardName={cardName}
            setName={setName}
            setCode={setCode}
            number={number}
            tcgplayerId={tcgplayerId}
          />
        </div>
        <Link className="gv-detail-update-image" href={isAuthenticated ? imagePath : `/login?next=${encodeURIComponent(imagePath)}`}>
          <ImagePlus size={14} aria-hidden="true" />Update image
        </Link>
      </div>
      </dialog>
    </aside>
  );
}
