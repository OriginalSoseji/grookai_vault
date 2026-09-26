"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { recordVaultDispositionAction } from "@/lib/vault/recordVaultDispositionAction";
import type { DispositionInput, DispositionReceipt } from "@/lib/vault/vaultDisposition";

const inputStyle = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const buttonStyle = "rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50";
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
  return <section aria-labelledby="disposition-heading" className="space-y-4 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
    <div className="space-y-1">
      <h2 id="disposition-heading" className="font-semibold text-slate-900">{receipt ? "Sale / trade receipt" : "Record a sale or trade"}</h2>
      <p className="text-sm text-slate-600">{receipt ? "Your private record of a transaction completed outside Grookai." : "Record a transaction you completed outside Grookai. This archives this exact copy and keeps a private receipt."}</p>
      <p className="text-xs text-slate-500">Grookai does not collect payment or transfer ownership through this form.</p>
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
          <label className="block space-y-1"><span className="text-sm font-medium">Transaction</span><select className={inputStyle} aria-label="Transaction" value={type} onChange={e => setType(e.target.value as "sale" | "trade")}><option value="sale">Sold</option><option value="trade">Traded</option></select></label>
          {type === "sale" ? <label className="block space-y-1"><span className="text-sm font-medium">Actual sale price (USD)</span><input className={inputStyle} name="salePrice" aria-label="Actual sale price (USD)" aria-describedby="disposition-sale-price-help" type="number" inputMode="decimal" min="0.01" step="0.01" required /><span id="disposition-sale-price-help" className="block text-xs text-slate-500">Enter the amount received. Your asking price is not used.</span></label> : <>
            <label className="block space-y-1"><span className="text-sm font-medium">What you received in trade</span><textarea className={inputStyle} name="tradeReceived" required maxLength={1000} rows={3} /></label>
            <label className="block space-y-1"><span className="text-sm font-medium">Trade cash</span><select className={inputStyle} aria-label="Trade cash" value={cashDirection} onChange={e => setCashDirection(e.target.value as typeof cashDirection)}><option value="none">No cash</option><option value="received">Cash received</option><option value="paid">Cash paid</option></select></label>
            {cashDirection !== "none" && <label className="block space-y-1"><span className="text-sm font-medium">Cash amount (USD)</span><input className={inputStyle} name="cashAmount" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label>}
          </>}
          <label className="block space-y-1"><span className="text-sm font-medium">Buyer or trade partner (optional)</span><input className={inputStyle} name="counterparty" maxLength={120} autoComplete="off" /></label>
          <button className={buttonStyle} type="submit">Review transaction</button>
        </fieldset>
      </form>
      {review && <div className="space-y-3 rounded-lg bg-slate-50 p-3 text-sm">
        <h3 className="font-semibold">Confirm {review.type === "sale" ? "sale" : "trade"}</h3>
        <p className="break-all">Archive copy {gvviId}?</p>
        {review.type === "sale" ? <p>Actual sale price: {amount(review.salePrice)}</p> : <><p className="whitespace-pre-wrap break-words">Received: {review.tradeReceived}</p><p>{review.cashDirection === "none" ? "No cash." : `Cash ${review.cashDirection}: ${amount(review.cashAmount)}`}</p></>}
        {review.counterparty && <p className="break-words">Counterparty: {review.counterparty}</p>}
        <p>This removes the copy from your active Vault and public offers. The receipt cannot be edited.</p>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={confirm} className={`${buttonStyle} bg-slate-900 text-white`}>{busy ? "Recording…" : review.type === "sale" ? "Record sale" : "Record trade"}</button><button type="button" disabled={busy} className={buttonStyle} onClick={() => { setReview(null); setError(null); }}>Back to details</button></div>
      </div>}
    </>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Link href="/vault/transactions" className="inline-block text-sm font-semibold text-emerald-800 underline">View transaction history</Link>
  </section>;
}
