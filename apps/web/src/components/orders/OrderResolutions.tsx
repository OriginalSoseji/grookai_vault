"use client";
import { useEffect, useRef, useState } from "react";
import { availableResolutionActions, resolutionCommand, type ResolutionCommand, type ResolutionStatus } from "@/lib/orders/orderResolutions.shared";
const labels = { request: "Request buyer agreement", agree: "Agree to continue order", decline: "Decline request",
  withdraw: "Withdraw agreement or request", accept: "Record reviewed agreement", reject: "Return for further review" };
const states = { requested: "Awaiting buyer response", agreed: "Awaiting Grookai review", declined: "Buyer declined",
  withdrawn: "Withdrawn", accepted: "Reviewed — final payment check required", rejected: "Further review required" };
export default function OrderResolutions({ value, enabled }: { value: ResolutionStatus | null; enabled: boolean }) {
  const [pending, setPending] = useState<ResolutionCommand | null>(null), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false), [changed, setChanged] = useState(false);
  const active = useRef(false), key = value ? `grookai-resolution:${value.role}:${value.orderId}` : null;
  useEffect(() => {
    if (!key || !value) return;
    try {
      const raw = sessionStorage.getItem(key); if (!raw) return;
      const command = resolutionCommand(JSON.parse(raw));
      if (command.orderId !== value.orderId) throw new Error();
      if (value.cases.some(c => c.events.some(e => e.requestId === command.requestId))) sessionStorage.removeItem(key);
      else { setPending(command); setAttempted(true); }
    } catch { setError("A saved action could not be loaded. Reload the order before trying again."); }
  }, [key, value]);
  if (!value) return null;
  const status = value, writable = enabled && status.writesEnabled && !changed;
  function choose(command: ResolutionCommand) { setPending(command); setConfirmed(false); setError(""); setAttempted(false); }
  async function submit() {
    if (!pending || !key || !confirmed || !writable || active.current) return;
    active.current = true; setBusy(true); setError("");
    try {
      sessionStorage.setItem(key, JSON.stringify(pending));
      setAttempted(true);
      const response = await fetch("/api/vendor-orders/resolutions", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending) });
      const data = await response.json(), expected = pending.action === "request" ? pending.requestId : pending.caseId;
      if (response.status === 400 || response.status === 409) {
        // These responses definitively reject this command; an uncertain network
        // outcome or server failure must retain its original retry identity.
        sessionStorage.removeItem(key); setPending(null); setAttempted(false); setChanged(true);
        setError("The order or response changed. Reload its saved status before choosing another action."); return;
      }
      if (!response.ok || data.caseId !== expected) throw new Error();
      sessionStorage.removeItem(key); window.location.reload();
    } catch { setError("The action could not be confirmed. Reload the order to check its saved status, or retry this same action."); }
    finally { active.current = false; setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6" aria-busy={busy}>
    <h2 className="text-xl font-semibold">Order resolution</h2>
    <p className="text-sm text-slate-600">If a refund failed or was canceled, the seller can ask the buyer whether they still want the original order. Payment and shipping remain under review until the required checks are complete.</p>
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">{error}</p>}
    {!status.cases.length && <p className="text-sm text-slate-600">No resolution requests have been recorded.</p>}
    {status.cases.map(c => <article key={c.caseId} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold">{states[c.state]}</h3>
      <p className="text-sm">Continue the original order for {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c.totalAmountMinor / 100)} USD after failed or canceled refund attempts.</p>
      {!c.basisCurrent && <p className="text-sm text-amber-900">Order information has changed since this request. A new review is needed before agreement can be recorded.</p>}
      <ol className="space-y-1 text-xs text-slate-600" aria-label="Resolution history">{c.events.map(e => <li key={e.requestId}>
        {e.role === "operator" ? "Grookai reviewer" : e.role === "buyer" ? "Buyer" : "Seller"}: {labels[e.action]} · {new Date(e.recordedAt).toLocaleString()}
      </li>)}</ol>
      {writable && !pending && <div className="flex flex-wrap gap-3">{availableResolutionActions(c, status.role).map(action => <button key={action} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
        disabled={busy} onClick={() => choose({ action, orderId: status.orderId, caseId: c.caseId, requestId: crypto.randomUUID(), expectedSequence: c.sequence, termsHash: c.termsHash })}>{labels[action]}</button>)}</div>}
    </article>)}
    {writable && status.canRequest && !pending && <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" disabled={busy}
      onClick={() => choose({ action: "request", orderId: status.orderId, requestId: crypto.randomUUID() })}>Request buyer agreement</button>}
    {pending && <div className="space-y-3 rounded-lg bg-slate-50 p-4">
      <h3 className="font-semibold">{labels[pending.action]}</h3>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />
        <span>{pending.action === "agree" ? "I still want the original order fulfilled. I understand that these failed or canceled refund attempts did not return money to me."
          : pending.action === "accept" ? "I have reviewed the buyer’s agreement. Recording this review does not authorize shipping or clear financial holds."
          : pending.action === "request" ? "Ask the buyer to confirm whether they still want the original order. The current refund outcome will be checked before saving."
          : "Record this response in the order’s resolution history."}</span></label>
      <div className="flex flex-wrap gap-3"><button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" disabled={busy || !confirmed || !writable} onClick={() => void submit()}>Save response</button>
        <a className="px-2 py-2 text-sm underline" href={status.role === "operator" ? `/account/store/resolutions/${status.orderId}` : `/account/orders/${status.orderId}`}>Reload saved status</a>
        {!attempted && <button className="px-2 py-2 text-sm underline" disabled={busy} onClick={() => { setPending(null); setConfirmed(false); }}>Dismiss form</button>}</div>
    </div>}
    {changed && <a className="inline-block text-sm underline" href={status.role === "operator" ? `/account/store/resolutions/${status.orderId}` : `/account/orders/${status.orderId}`}>Reload saved status</a>}
    {!changed && !writable && <p className="text-sm text-slate-600">New responses are currently paused. Saved history remains available.</p>}
  </section>;
}
