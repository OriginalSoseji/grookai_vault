"use client";
import { useState } from "react";
export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const [review, setReview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function cancel() {
    if (busy) return;setBusy(true);setError("");
    try {
      const response = await fetch("/api/vendor-orders/cancel", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
      const data = await response.json();if (!response.ok) throw new Error(data.error || "Cancellation could not be confirmed. Reload this order or retry.");
      if (data.orderId !== orderId || data.state !== "canceled") throw new Error("Cancellation could not be confirmed. Reload this order or retry.");
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Cancellation could not be confirmed. Reload this order or retry."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-slate-200 p-4">
    {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
    {review ? <><p className="text-sm text-slate-700">Cancel this order and release its inventory hold? This is available only before checkout starts.</p><div className="flex flex-wrap gap-3"><button disabled={busy} onClick={cancel} className="rounded-full border border-slate-400 px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? "Canceling…" : "Confirm cancellation"}</button><button disabled={busy} onClick={() => setReview(false)} className="rounded-full px-4 py-2 text-sm underline">Keep order</button></div></> : <button onClick={() => setReview(true)} className="text-sm font-semibold underline">Cancel order before checkout</button>}
  </section>;
}
