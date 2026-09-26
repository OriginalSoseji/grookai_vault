"use client";
import { useRef, useState } from "react";
import { CARRIERS, fulfillmentActions, fulfillmentCommand, fulfillmentEvent, type Carrier, type FulfillmentAction, type FulfillmentCommand, type FulfillmentStatus } from "@/lib/orders/orderFulfillment.shared";

const labels = { unfulfilled: "Not yet fulfilled", ready_pickup: "Ready for pickup", collected: "Pickup completed", shipped: "Shipped", delivered: "Delivery recorded" };
const actionLabels: Record<FulfillmentAction, string> = { ready_pickup: "Mark ready for pickup", collect: "Record pickup completion", ship: "Record shipment", update_tracking: "Correct tracking", deliver: "Record delivery" };
const eventLabels: Record<FulfillmentAction, string> = { ready_pickup: "Marked ready for pickup", collect: "Recorded pickup completion", ship: "Recorded shipment", update_tracking: "Corrected tracking", deliver: "Recorded delivery" };
export default function OrderFulfillment({ value, updatesEnabled }: { value: FulfillmentStatus | null; updatesEnabled: boolean }) {
  const [selected, setSelected] = useState<FulfillmentAction | null>(null), [carrier, setCarrier] = useState<Carrier>(value?.carrier ?? "usps"), [tracking, setTracking] = useState(value?.tracking ?? "");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [pending, setPending] = useState<FulfillmentCommand | null>(null);
  const saving = useRef(false);
  if (!value) return <section className="rounded-xl border border-slate-200 p-6"><h2 className="font-semibold">Fulfillment</h2><p className="mt-2 text-sm text-slate-600">Fulfillment history could not be loaded. Reload this order to try again.</p></section>;
  const status = value, actions = updatesEnabled ? fulfillmentActions(status) : [], needsTracking = selected === "ship" || selected === "update_tracking";
  function choose(action: FulfillmentAction) { setSelected(action); setPending(null); setError(""); }
  async function submit() {
    if (saving.current || !selected) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const command = pending ?? fulfillmentCommand({ orderId: status.orderId, requestId: crypto.randomUUID(), expectedSequence: status.sequence, action: selected,
        carrier: needsTracking ? carrier : null, tracking: needsTracking ? tracking.trim() : null });
      setPending(command);
      const response = await fetch("/api/vendor-orders/fulfillment", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 409 ? "This order changed. Reload its progress before recording another update." : "The update could not be confirmed. Retry this update or reload the order.");
      const receipt = fulfillmentEvent(data);
      if (data.orderId !== status.orderId || receipt.requestId !== command.requestId || receipt.sequence !== command.expectedSequence + 1 || receipt.action !== command.action) throw new Error("The update could not be confirmed. Reload the order.");
      window.location.reload();
    } catch (e) { setError(e instanceof Error && e.message.startsWith("This order changed.") ? e.message : "The update could not be confirmed. Retry the same update or reload this order."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <section aria-label="Fulfillment progress" className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
    <div className="space-y-2"><h2 className="text-xl font-semibold">{status.mode === "pickup" ? "Pickup" : "Shipping"}</h2><p className="font-semibold text-emerald-800">{labels[status.state]}</p><p className="text-sm text-slate-600">Updates are recorded by the seller. Shipping and delivery updates are not automatic carrier confirmations.</p></div>
    {status.tracking && status.carrier && <dl className="space-y-2 text-sm"><div><dt className="font-medium">Carrier</dt><dd>{CARRIERS[status.carrier]}</dd></div><div><dt className="font-medium">Tracking number</dt><dd className="break-all font-mono select-all">{status.tracking}</dd></div></dl>}
    {!status.paymentReady && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">New fulfillment updates are paused while payment is pending or under review. Existing progress remains visible.</p>}
    {actions.length > 0 && <div className="space-y-3 border-t border-slate-200 pt-4">
      {selected ? <form onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-4">
        <h3 className="font-semibold">{actionLabels[selected]}</h3>
        {needsTracking && <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">Carrier<select aria-label="Carrier" value={carrier} disabled={busy || pending !== null} onChange={e => setCarrier(e.target.value as Carrier)} className="rounded-lg border border-slate-300 px-3 py-2">{Object.entries(CARRIERS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Tracking number<input aria-label="Tracking number" value={tracking} disabled={busy || pending !== null} required minLength={3} maxLength={100} onChange={e => setTracking(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label></div>}
        <p className="text-sm text-slate-600">{selected === "collect" ? "Confirm that the buyer has collected this order." : selected === "deliver" ? "Confirm that you have checked delivery before recording it. This update will appear to the buyer." : "Confirm these details before adding this update to the buyer’s order history."}</p>
        {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : pending ? "Retry same update" : "Confirm update"}</button><button type="button" disabled={busy} onClick={() => { setSelected(null); setPending(null); setError(""); }} className="px-3 py-2 text-sm underline">Back</button><a href={`/account/orders/${status.orderId}`} className="px-3 py-2 text-sm underline">Reload order</a></div>
      </form> : <div className="flex flex-wrap gap-3">{actions.map(a => <button key={a} type="button" onClick={() => choose(a)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">{actionLabels[a]}</button>)}</div>}
    </div>}
    {status.events.length > 0 && <div className="space-y-3 border-t border-slate-200 pt-4"><h3 className="font-semibold">Recent seller updates</h3><ol className="space-y-4">{status.events.map(e => <li key={e.requestId} className="border-l-2 border-emerald-200 pl-4"><p className="text-sm font-medium">{eventLabels[e.action]}</p><time dateTime={e.recordedAt} className="text-xs text-slate-500">{new Date(e.recordedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</time>{e.tracking && e.carrier && <p className="break-all text-sm text-slate-600">{CARRIERS[e.carrier]} · {e.tracking}</p>}</li>)}</ol>{status.sequence > 20 && <p className="text-xs text-slate-500">Showing the 20 most recent updates.</p>}</div>}
  </section>;
}
