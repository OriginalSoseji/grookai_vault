"use client";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { purchaseHref } from "@/lib/orders/orderAcquisitionTypes";
import type { PurchaseSelection, PurchaseQuote, OrderCreated } from "@/lib/orders/orderAcquisitionTypes";
const money = (minor: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
export default function PurchaseReview({ selection, initialRequestId }: { selection: PurchaseSelection; initialRequestId?: string }) {
  const requestId = useRef(initialRequestId), [quote, setQuote] = useState<PurchaseQuote | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [confirmed, setConfirmed] = useState(false), [expired, setExpired] = useState(false);
  useEffect(() => { if (!quote) return;const timer = setInterval(() => setExpired(Date.now() >= quote.expiresAt), 1000);return () => clearInterval(timer); }, [quote]);
  async function send(body: unknown) {
    const response = await fetch("/api/vendor-orders/acquire", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    const data = await response.json();if (!response.ok) throw new Error(data.error || "The request could not be completed. Retry it before starting again.");
    return data as PurchaseQuote | OrderCreated | { state: "released" };
  }
  function openOrder(result: OrderCreated) {
    if (!/^[a-f0-9-]{36}$/.test(result.orderId)) throw new Error("Order could not be opened.");
    window.location.assign(`/account/orders/${result.orderId}`);
  }
  async function run(action: "quote" | "confirm" | "cancel") {
    if (busy) return;setBusy(true);setError("");
    try {
      if (!requestId.current) { requestId.current = crypto.randomUUID();window.history.replaceState(null, "", purchaseHref(selection, requestId.current)); }
      if (action === "confirm") setConfirmed(true);
      const result = await send(action === "quote" ? { action, ...selection, requestId: requestId.current } : { action, token: quote?.token });
      if (result.state === "ordered") { openOrder(result);return; }
      if (result.state === "quoted") { setQuote(result);setConfirmed(false);setExpired(Date.now() >= result.expiresAt); }
      if (result.state === "released") { setQuote(null);setConfirmed(false);requestId.current = undefined;window.history.replaceState(null, "", purchaseHref(selection)); }
    } catch (e) { setError(e instanceof Error ? e.message : "The request could not be completed. Retry it before starting again."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <Link href="/account/orders" className="text-sm font-semibold underline">Your purchases</Link>
    <header className="space-y-2"><h1 className="text-3xl font-semibold">Review your order</h1><p className="text-sm text-slate-600">Check the recorded price and quantity before confirming. Confirmation creates an order; it does not confirm payment.</p></header>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Local checkout test. These sample pickup totals cannot be used for a live purchase.</p>
    {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{error}</div>}
    {!quote ? <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">Check current availability</h2><p className="text-sm text-slate-600">Requesting a quote holds {selection.quantity === 1 ? "this item" : `${selection.quantity} items`} for up to two minutes. No payment is taken.</p><button disabled={busy} onClick={() => run("quote")} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Checking…" : "Get quote"}</button></section> : <>
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6"><h2 className="break-words text-xl font-semibold">{quote.title}</h2><dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm"><dt>Quantity</dt><dd>{quote.quantity}</dd><dt>Unit price</dt><dd>{money(quote.unitAmountMinor)}</dd><dt>Items</dt><dd>{money(quote.unitAmountMinor * quote.quantity)}</dd><dt>Pickup</dt><dd>{money(quote.shippingAmountMinor)}</dd><dt>Tax (test only)</dt><dd>{money(quote.taxAmountMinor)}</dd><dt className="border-t pt-3 font-semibold">Order total</dt><dd className="border-t pt-3 font-semibold">{money(quote.totalAmountMinor)} USD</dd></dl><p role="status" className="text-sm text-slate-600">{expired ? "This quote has expired. A confirmation already submitted can still be recovered." : `Quote held until ${new Date(quote.expiresAt).toLocaleTimeString()}.`}</p></section>
      <div className="flex flex-wrap gap-3"><button disabled={busy || expired && !confirmed} onClick={() => run("confirm")} className="rounded-full bg-emerald-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Please wait…" : confirmed ? "Retry confirmation" : "Confirm order"}</button><button disabled={busy} onClick={() => run("cancel")} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold">{confirmed ? "Check or release hold" : "Release hold"}</button></div>
      <p className="text-sm text-slate-600">If a response is delayed, retry here or reload this page and request the same quote. Your existing order will be recovered.</p>
    </>}
  </main>;
}
