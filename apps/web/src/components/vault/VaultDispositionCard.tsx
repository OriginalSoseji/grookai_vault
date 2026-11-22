"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { recordVaultDispositionAction } from "@/lib/vault/recordVaultDispositionAction";
import type { DispositionInput, DispositionReceipt } from "@/lib/vault/vaultDisposition";

const inputStyle = "min-h-11 w-full rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] px-3 py-2 text-sm text-[var(--gv-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gv-brand-accent)]";
const buttonStyle = "inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] px-4 py-2 text-sm font-semibold text-[var(--gv-text-primary)] disabled:cursor-not-allowed disabled:opacity-50";
function amount(value: number | string, currency = "USD") {
  return `${currency} ${Number(value).toFixed(2)}`;
}
export default function VaultDispositionCard({ instanceId, gvviId, isActive, receipt: savedReceipt, receiptUnavailable = false }: {
  instanceId: string; gvviId: string; isActive: boolean; receipt: DispositionReceipt | null; receiptUnavailable?: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<"sale" | "trade">("sale");
  const [cashDirection, setCashDirection] = useState<"none" | "received" | "paid">("none");
  const [review, setReview] = useState<DispositionInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<DispositionReceipt | null>(null);
  const receipt = completed ?? savedReceipt;
  async function confirm() {
    if (busy || !review) return;
    setBusy(true); setError(null);
    try {
      const result = await recordVaultDispositionAction(review);
      if (!result.ok) { setError(result.message); return; }
      setCompleted(result.receipt); setReview(null); router.refresh();
    } catch {
      setError("The transaction could not be confirmed. Refresh to check its status before trying again.");
    } finally { setBusy(false); }
  }
  return <section aria-labelledby="disposition-heading" className="space-y-4 rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] p-4">
    <div className="space-y-1">
      <h2 id="disposition-heading" className="font-semibold text-[var(--gv-text-primary)]">{receipt ? "Sale / trade receipt" : "Record a completed sale or trade"}</h2>
      <p className="text-sm text-[var(--gv-text-secondary)]">{receipt ? "Your private record of a transaction completed outside grookai." : "Use this after the deal is complete. Recording it archives this exact copy and keeps a private receipt."}</p>
      <p className="text-xs text-[var(--gv-text-secondary)]">This does not create an eBay listing, collect payment, or transfer ownership through grookai.</p>
    </div>
    {receipt ? <div className="space-y-2 text-sm">
      <p role="status" className="font-semibold text-emerald-700">{receipt.type === "sale" ? "Sale recorded." : "Trade recorded."} This copy is archived.</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt>Copy</dt><dd className="break-all">{receipt.gvviId}</dd>
        <dt>Recorded</dt><dd>{new Date(receipt.recordedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</dd>
        {receipt.salePrice !== null && <><dt>Actual sale price</dt><dd>{amount(receipt.salePrice, receipt.saleCurrency ?? "USD")}</dd></>}
        {receipt.tradeReceived && <><dt>Received in trade</dt><dd className="whitespace-pre-wrap break-words">{receipt.tradeReceived}</dd></>}
        {receipt.cashAmount !== null && <><dt>Cash {receipt.cashDirection}</dt><dd>{amount(receipt.cashAmount, receipt.cashCurrency ?? "USD")}</dd></>}
        {receipt.counterparty && <><dt>Counterparty</dt><dd className="break-words">{receipt.counterparty}</dd></>}
      </dl>
    </div> : receiptUnavailable ? <p role="alert" className="text-sm text-amber-800">The private receipt could not be loaded. Refresh before recording a transaction.</p> : !isActive ? <p className="text-sm text-slate-600">This copy is archived. No manual sale or trade receipt is available.</p> : <>
      <form hidden={review !== null} onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        setReview({ instanceId, type, salePrice: String(data.get("salePrice") ?? ""), counterparty: String(data.get("counterparty") ?? ""), tradeReceived: String(data.get("tradeReceived") ?? ""), cashDirection: type === "sale" ? "none" : cashDirection, cashAmount: String(data.get("cashAmount") ?? "") });
      }}>
        <fieldset disabled={busy} className="space-y-3">
          <label className="block space-y-1"><span className="text-sm font-medium">What happened?</span><select className={inputStyle} aria-label="Transaction" value={type} onChange={e => setType(e.target.value as "sale" | "trade")}><option value="sale">I sold this copy</option><option value="trade">I traded this copy</option></select></label>
          {type === "sale" ? <label className="block space-y-1"><span className="text-sm font-medium">Amount received (USD)</span><input className={inputStyle} name="salePrice" aria-label="Actual sale price (USD)" aria-describedby="disposition-sale-price-help" type="number" inputMode="decimal" min="0.01" step="0.01" required /><span id="disposition-sale-price-help" className="block text-xs text-[var(--gv-text-secondary)]">Enter what the buyer paid. This is separate from your asking price.</span></label> : <>
            <label className="block space-y-1"><span className="text-sm font-medium">What you received</span><textarea className={`${inputStyle} min-h-24`} name="tradeReceived" required maxLength={1000} rows={3} /></label>
            <label className="block space-y-1"><span className="text-sm font-medium">Cash included?</span><select className={inputStyle} aria-label="Trade cash" value={cashDirection} onChange={e => setCashDirection(e.target.value as typeof cashDirection)}><option value="none">No cash</option><option value="received">I received cash</option><option value="paid">I paid cash</option></select></label>
            {cashDirection !== "none" && <label className="block space-y-1"><span className="text-sm font-medium">Cash amount (USD)</span><input className={inputStyle} name="cashAmount" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label>}
          </>}
          <label className="block space-y-1"><span className="text-sm font-medium">Buyer or trade partner (optional)</span><input className={inputStyle} name="counterparty" maxLength={120} autoComplete="off" /></label>
          <button className={buttonStyle} type="submit">Review transaction</button>
        </fieldset>
      </form>
      {review && <div className="space-y-3 rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-container)] p-3 text-sm">
        <h3 className="font-semibold">Confirm {review.type === "sale" ? "sale" : "trade"}</h3>
        <p className="break-all">Archive copy {gvviId}?</p>
        {review.type === "sale" ? <p>Actual sale price: {amount(review.salePrice)}</p> : <><p className="whitespace-pre-wrap break-words">Received: {review.tradeReceived}</p><p>{review.cashDirection === "none" ? "No cash." : `Cash ${review.cashDirection}: ${amount(review.cashAmount)}`}</p></>}
        {review.counterparty && <p className="break-words">Counterparty: {review.counterparty}</p>}
        <p>This removes the copy from your active Vault and public offers. The receipt cannot be edited.</p>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={confirm} className="gv-primary-button min-h-11">{busy ? "Recording…" : review.type === "sale" ? "Record sale and archive copy" : "Record trade and archive copy"}</button><button type="button" disabled={busy} className={buttonStyle} onClick={() => { setReview(null); setError(null); }}>Back to details</button></div>
      </div>}
    </>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {receipt?.type === "sale" && <Link href={`/account/store/receipts?sale=${encodeURIComponent(receipt.id)}`} className="gv-secondary-button">Create customer receipt</Link>}
    <Link href="/vault/transactions" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--gv-primary)] underline underline-offset-4">View transaction history</Link>
  </section>;
}
