"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useStoreDraftGuard } from "@/components/stores/useStoreDraftGuard";
import { saveVaultItemInstancePricingAction } from "@/lib/vault/saveVaultItemInstancePricingAction";
import {
  formatVaultInstancePrice,
  getVaultInstancePricingSourceLabel,
  type VaultInstancePricingMode,
} from "@/lib/vaultInstancePricing";

type VaultInstancePricingCardProps = {
  instanceId: string;
  isActive: boolean;
  isGraded: boolean;
  initialPricingMode: VaultInstancePricingMode;
  initialAskingPriceAmount: number | null;
  initialAskingPriceCurrency: string | null;
  initialAskingPriceNote: string | null;
  marketReferencePrice: number | null;
  marketReferenceSource: string | null;
  marketReferenceUpdatedAt: string | null;
  marketReferenceObservedAt: string | null;
  marketReferencePublishedAt: string | null;
  marketReferenceProvenanceId: string | null;
  cardPrintId: string;
  cardPrintingId: string | null;
  printingGvId: string | null;
};

function formatPricingTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VaultInstancePricingCard({
  instanceId,
  isActive,
  isGraded,
  initialPricingMode,
  initialAskingPriceAmount,
  initialAskingPriceCurrency,
  initialAskingPriceNote,
  marketReferencePrice,
  marketReferenceSource,
  marketReferenceUpdatedAt,
  marketReferenceObservedAt,
  marketReferencePublishedAt,
  marketReferenceProvenanceId,
  cardPrintId,
  cardPrintingId,
  printingGvId,
}: VaultInstancePricingCardProps) {
  const router = useRouter();
  const [pricingMode, setPricingMode] = useState<VaultInstancePricingMode>(initialPricingMode);
  const [askingPriceAmount, setAskingPriceAmount] = useState(
    initialAskingPriceAmount !== null ? initialAskingPriceAmount.toFixed(2) : "",
  );
  const [askingPriceCurrency, setAskingPriceCurrency] = useState(initialAskingPriceCurrency ?? "USD");
  const [askingPriceNote, setAskingPriceNote] = useState(initialAskingPriceNote ?? "");
  const [statusMessage, setStatusMessage] = useState<{ tone: "success" | "error"; body: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState({ mode: initialPricingMode, amount: initialAskingPriceAmount,
    currency: initialAskingPriceCurrency, note: initialAskingPriceNote });

  useEffect(() => {
    setSaved({ mode: initialPricingMode, amount: initialAskingPriceAmount,
      currency: initialAskingPriceCurrency, note: initialAskingPriceNote });
  }, [initialPricingMode, initialAskingPriceAmount, initialAskingPriceCurrency, initialAskingPriceNote]);

  useEffect(() => {
    setPricingMode(initialPricingMode);
  }, [initialPricingMode]);

  useEffect(() => {
    setAskingPriceAmount(initialAskingPriceAmount !== null ? initialAskingPriceAmount.toFixed(2) : "");
  }, [initialAskingPriceAmount]);

  useEffect(() => {
    setAskingPriceCurrency(initialAskingPriceCurrency ?? "USD");
  }, [initialAskingPriceCurrency]);

  useEffect(() => {
    setAskingPriceNote(initialAskingPriceNote ?? "");
  }, [initialAskingPriceNote]);

  const hasChanges = useMemo(() => {
    return (
      pricingMode !== saved.mode ||
      askingPriceAmount !== (saved.amount !== null ? saved.amount.toFixed(2) : "") ||
      askingPriceCurrency !== (saved.currency ?? "USD") ||
      askingPriceNote !== (saved.note ?? "")
    );
  }, [
    askingPriceAmount,
    askingPriceCurrency,
    askingPriceNote,
    saved,
    pricingMode,
  ]);

  useStoreDraftGuard(isActive && (hasChanges || isPending),
    "Discard your unsaved pricing changes and leave this copy?", isPending);
  const observedDate = formatPricingTimestamp(marketReferenceObservedAt);
  const publishedDate = formatPricingTimestamp(marketReferencePublishedAt ?? marketReferenceUpdatedAt);
  const marketReferenceAvailable = !isGraded && typeof marketReferencePrice === "number" &&
    Number.isFinite(marketReferencePrice) && marketReferencePrice > 0 &&
    marketReferenceSource === "tcgplayer" && Boolean(cardPrintingId && marketReferenceProvenanceId && observedDate && publishedDate);

  function handleSave() {
    if (!isActive || isPending || !hasChanges) {
      return;
    }

    setStatusMessage(null);

    startTransition(async () => {
      const result = await saveVaultItemInstancePricingAction({
        instanceId,
        pricingMode,
        askingPriceAmount: pricingMode === "asking" ? askingPriceAmount : null,
        askingPriceCurrency: pricingMode === "asking" ? askingPriceCurrency : null,
        askingPriceNote: pricingMode === "asking" ? askingPriceNote : null,
      }).catch(() => ({ ok: false as const, instanceId,
        message: "Pricing could not be confirmed. Your edits are still here. Refresh this copy to check its saved price." }));

      if (!result.ok) {
        setStatusMessage({ tone: "error", body: result.message });
        return;
      }

      setPricingMode(result.pricingMode);
      setAskingPriceAmount(result.askingPriceAmount !== null ? result.askingPriceAmount.toFixed(2) : "");
      setAskingPriceCurrency(result.askingPriceCurrency ?? "USD");
      setAskingPriceNote(result.askingPriceNote ?? "");
      setSaved({ mode: result.pricingMode, amount: result.askingPriceAmount,
        currency: result.askingPriceCurrency, note: result.askingPriceNote });
      setStatusMessage({ tone: "success", body: "Pricing saved." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
        <p className="text-sm text-slate-600">
          Pricing mode belongs to this exact owned copy only.
        </p>
      </div>

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mode</span>
        <select
          value={pricingMode}
          disabled={!isActive || isPending}
          onChange={(event) => setPricingMode(event.target.value as VaultInstancePricingMode)}
          className="min-h-11 w-full rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="market">Market reference</option>
          <option value="asking">Set asking price</option>
        </select>
      </label>

        <section className="space-y-2 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3" aria-label="Market reference">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reference pricing</p>
          {marketReferenceAvailable ? (
            <>
              <p
                className="text-xl font-semibold tracking-tight text-slate-950"
                data-pricing-proof="tcgplayer-market"
                data-pricing-proof-role="primary"
                data-pricing-status="available"
                data-pricing-scope="card_printing"
                data-card-print-id={cardPrintId}
                data-card-printing-id={cardPrintingId ?? undefined}
                data-printing-gv-id={printingGvId ?? undefined}
                data-market-close-usd={marketReferencePrice}
                data-currency="USD"
                data-source-name="tcgplayer"
                data-source-label="TCGPlayer Market"
                data-observed-at={marketReferenceObservedAt ?? undefined}
                data-published-at={marketReferencePublishedAt ?? undefined}
                data-provenance-id={marketReferenceProvenanceId ?? undefined}
                data-is-from-price="false"
              >
                {formatVaultInstancePrice(marketReferencePrice, "USD")}
              </p>
              <p className="text-sm text-slate-600">
                {getVaultInstancePricingSourceLabel(marketReferenceSource)}
                {" · USD"}
              </p>
              <p className="text-xs text-slate-600">Observed {observedDate} · Published {publishedDate}</p>
              <p className="text-xs text-slate-600">Reference for this printing. Your copy’s condition may affect its value.</p>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              {isGraded ? "No market reference available for this slab yet." : "No market reference available."}
            </p>
          )}
        </section>
      {pricingMode === "asking" && (
        <div className="space-y-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={askingPriceAmount}
                disabled={!isActive || isPending}
                onChange={(event) => setAskingPriceAmount(event.target.value)}
                className="min-h-11 w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Currency</span>
              <input
                type="text"
                maxLength={3}
                value={askingPriceCurrency}
                disabled={!isActive || isPending}
                onChange={(event) => setAskingPriceCurrency(event.target.value.toUpperCase())}
                className="min-h-11 w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing note</span>
            <input
              type="text"
              maxLength={160}
              value={askingPriceNote}
              disabled={!isActive || isPending}
              onChange={(event) => setAskingPriceNote(event.target.value)}
              placeholder="Firm, negotiable, or trades considered."
              className="min-h-11 w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>
      )}

      {!isActive ? (
        <p className="text-sm text-slate-500">Archived copies keep their pricing state as historical context.</p>
      ) : null}

      {statusMessage ? (
        <p className={`text-sm ${statusMessage.tone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {statusMessage.body}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!isActive || isPending || !hasChanges}
        onClick={handleSave}
        className="inline-flex min-h-11 items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isPending ? "Saving..." : "Save pricing"}
      </button>
    </div>
  );
}
