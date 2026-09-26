"use client";
import { useRef, useState } from "react";
import { refundAction, refundAmountInput, refundLabels, type RefundAction, type RefundStatus } from "@/lib/orders/orderRefunds.shared";
import { refundReview, refundReviewIssues, type RefundReview } from "@/lib/orders/orderRefundReview.shared";
type Command = Extract<RefundAction, { action: "create" }>;
const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n / 100);
export default function OrderRefunds({ value, controls }: { value: RefundStatus | null; controls: { create: boolean; refresh: boolean } }) {
  const [amount, setAmount] = useState(""), [reason, setReason] = useState<Command["reason"]>("requested_by_customer");
  const [available, setAvailable] = useState<number | null>(null), [pending, setPending] = useState<Command | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [confirm, setConfirm] = useState(false);
  const active = useRef(false);
  const [review, setReview] = useState<RefundReview | null>(null);
  if (!value) return <section className="rounded-xl border border-slate-200 p-6"><h2 className="font-semibold">Refunds</h2><p className="mt-2 text-sm text-slate-600">Refund history could not be loaded. Reload this order to try again.</p></section>;
  const status = value, seller = status.role === "seller", storageKey = `grookai-refund:${status.orderId}`;
  const remaining = status.totalAmountMinor - status.succeededMinor - status.pendingMinor;
  const entered = refundAmountInput(amount), validAmount = entered !== null && available !== null && entered <= available;
  async function post(action: RefundAction) {
    const response = await fetch("/api/vendor-orders/refunds", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
    const data = await response.json();
    if (!response.ok || data.orderId !== status.orderId) throw new Error("The refund outcome could not be confirmed. Check its status before retrying the same request.");
    return data;
  }
  async function run(action: () => Promise<void>, failure = "The refund outcome could not be confirmed. Check its status before retrying the same request.") {
    if (active.current) return; active.current = true; setBusy(true); setError(""); setReview(null);
    try { await action(); } catch { setError(failure); }
    finally { active.current = false; setBusy(false); }
  }
  function receipt(data: Record<string, unknown>, id: string) {
    if (data.requestId !== id || typeof data.status !== "string" || !Object.hasOwn(refundLabels, data.status)) throw new Error();
    const cached = sessionStorage.getItem(storageKey);
    const saved = cached ? refundAction(JSON.parse(cached)) : null;
    if (data.status !== "unbound" && saved?.action === "create" && saved.requestId === id) sessionStorage.removeItem(storageKey);
    window.location.reload();
  }
  async function prepare() {
    await run(async () => {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const old = refundAction(JSON.parse(stored)); if (old.action !== "create" || old.orderId !== status.orderId) throw new Error();
        const saved = status.requests.find(r => r.requestId === old.requestId);
        if (!saved || saved.status === "unbound") { setPending(old); setAmount((old.amountMinor / 100).toFixed(2)); setReason(old.reason); return; }
        sessionStorage.removeItem(storageKey);
      }
      const data = await post({ action: "preview", orderId: status.orderId });
      if (!Number.isSafeInteger(data.availableMinor) || data.availableMinor < 0 || data.availableMinor > status.totalAmountMinor || data.uncertain) throw new Error();
      setAvailable(data.availableMinor); setAmount((data.availableMinor / 100).toFixed(2));
    });
  }
  async function submit() {
    await run(async () => {
      if (!confirm) throw new Error();
      const minor = refundAmountInput(amount);
      if (!pending && (minor === null || available === null || minor > available)) throw new Error();
      const command = pending ?? refundAction({ action: "create", orderId: status.orderId, requestId: crypto.randomUUID(), amountMinor: minor, reason }) as Command;
      // Persist the exact request before starting it, including across reloads.
      // If storage fails, the provider is never called.
      sessionStorage.setItem(storageKey, JSON.stringify(command)); setPending(command);
      const data = await post(command); if (data.amountMinor !== command.amountMinor) throw new Error(); receipt(data, command.requestId);
    });
  }
  return <section aria-label="Order refunds" className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
    <h2 className="text-xl font-semibold">Refunds</h2>
    <dl className="grid grid-cols-[1fr_auto] gap-2 text-sm"><dt>Refunds sent</dt><dd>{money(status.succeededMinor)}</dd><dt>Refunds pending</dt><dd>{money(status.pendingMinor)}</dd></dl>
    <p className="text-sm text-slate-600">Refunds return to the original payment method. Your bank may take additional time to show a refund.</p>
    {status.uncertain && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">A refund request is still being checked. Another refund cannot start until its outcome is known.</p>}
    {seller && !status.uncertain && remaining === 0 && <p className="text-sm text-slate-600">No refundable amount is currently available.</p>}
    {error && <p role="alert" className="text-sm text-amber-900">{error}</p>}
    {seller && controls.refresh && <div className="space-y-3 border-t pt-4">
      <button type="button" disabled={busy} onClick={() => void run(async () => setReview(refundReview(await post({ action: "review", orderId: status.orderId }))), "Refund review could not be loaded. Try reviewing again.")} className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? "Checking…" : "Review refund outcome"}</button>
      {review?.orderId === status.orderId && <section aria-label="Refund outcome review" aria-live="polite" className="space-y-3 rounded-lg bg-slate-50 p-4">
        <h3 className="font-semibold">{review.decision === "operator_review_required" ? "Refund outcome needs Grookai review" : "Refund needs further attention"}</h3>
        <p className="text-sm text-slate-600">Checked {new Date(review.checkedAt * 1000).toLocaleString("en-US", { timeZone: "UTC" })} UTC. This is a snapshot; outcomes can change.</p>
        <dl className="grid grid-cols-[1fr_auto] gap-2 text-sm"><dt>Refunds sent</dt><dd>{money(review.succeededMinor)}</dd><dt>Refunds pending</dt><dd>{money(review.pendingMinor)}</dd><dt>Failed refund attempts</dt><dd>{money(review.failedMinor)}</dd><dt>Canceled refund attempts</dt><dd>{money(review.canceledMinor)}</dd></dl>
        <p className="text-sm text-slate-600">Failed and canceled amounts describe attempts, not money returned to the buyer. Repeated attempts may exceed the order total.</p>
        {review.issues.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{review.issues.map(issue => <li key={issue}>{refundReviewIssues[issue]}</li>)}</ul>}
        <p className="text-sm font-medium">Financial holds remain in place. This review does not approve shipping, pickup, or another refund.</p>
        {review.decision === "operator_review_required" && <p className="text-sm">Confirm the buyer’s preferred resolution before requesting Grookai review. Approval and hold clearance are not yet available here.</p>}
      </section>}
    </div>}
    {seller && controls.create && !pending && status.requests.filter(r => r.status === "unbound").map(r => <button key={r.requestId} type="button" disabled={busy} onClick={() => {
      setPending({ action: "create", orderId: status.orderId, requestId: r.requestId, amountMinor: r.amountMinor, reason: r.reason });
      setAmount((r.amountMinor / 100).toFixed(2)); setReason(r.reason); setConfirm(false);
    }} className="rounded-full border px-4 py-2 text-sm font-semibold">Resume same refund request</button>)}
    {seller && controls.create && ((status.canRequest && remaining > 0) || pending) && <div className="space-y-4 border-t pt-4">
      {available === null && !pending ? <button type="button" disabled={busy} onClick={() => void prepare()} className="rounded-full border px-4 py-2 text-sm font-semibold">{busy ? "Checking…" : "Prepare a refund"}</button> : <form onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-4">
        {available !== null && <p className="text-sm">Available at the last check: {money(available)}. The amount is checked again before submission.</p>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">Refund amount (USD)<input inputMode="decimal" value={amount} disabled={busy || !!pending} onChange={e => setAmount(e.target.value)} required className="rounded-lg border px-3 py-2" /></label><label className="grid gap-1 text-sm font-medium">Reason<select value={reason} disabled={busy || !!pending} onChange={e => setReason(e.target.value as Command["reason"])} className="rounded-lg border px-3 py-2"><option value="requested_by_customer">Requested by customer</option><option value="duplicate">Duplicate charge</option></select></label></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirm} disabled={busy} onChange={e => setConfirm(e.target.checked)} className="mt-1" />I confirm this refund amount. Refunding does not restock the item or reverse fulfillment.</label>
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !confirm || (!pending && !validAmount)} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Checking…" : pending ? "Retry same refund" : "Confirm refund"}</button>{pending && <button type="button" disabled={busy} onClick={() => void run(async () => receipt(await post({ action: "refresh", orderId: status.orderId, requestId: pending.requestId }), pending.requestId))} className="text-sm underline">Check this request</button>}</div>
      </form>}
    </div>}
    {status.requests.length > 0 && <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Recent refund requests</h3><ol className="space-y-4">{status.requests.map(r => <li key={r.requestId} className="space-y-1 border-l-2 border-slate-200 pl-4"><p className="text-sm font-medium">{money(r.amountMinor)} · {refundLabels[r.status]}</p><time dateTime={r.createdAt} className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</time>{seller && controls.refresh && <button type="button" disabled={busy} onClick={() => void run(async () => receipt(await post({ action: "refresh", orderId: status.orderId, requestId: r.requestId }), r.requestId))} className="block text-sm underline">Check refund status</button>}</li>)}</ol></div>}
    <a href={`/account/orders/${status.orderId}`} className="inline-block text-sm underline">Reload refund history</a>
  </section>;
}
