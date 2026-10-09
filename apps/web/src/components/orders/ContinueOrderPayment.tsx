"use client";
import { useOrderOwnerApi } from "./OrderOwnerScope";
import { useState } from "react";
export default function ContinueOrderPayment({ orderId }: { orderId: string }) {
  const api = useOrderOwnerApi();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function continuePayment() {
    if (busy) return;setBusy(true);setError("");
    try {
      const { response, data: result } = await api.send("/api/vendor-orders/checkout", { orderId });if (!response.ok) throw new Error(result.error || "Payment could not be opened. Check this order before trying again.");
      if (result.orderId !== orderId) throw new Error("Payment could not be opened.");
      if (result.state === "reconciled") { api.assertCurrent(); window.location.reload();return; }
      const url = new URL(result.url);
      if (result.state !== "open" || url.protocol !== "https:" || url.hostname !== "checkout.stripe.com" || url.port || url.username || url.password || url.search || !/^\/c\/pay\/cs_(test|live)_[A-Za-z0-9]+$/.test(url.pathname)) throw new Error("Unexpected payment destination.");
      api.assertCurrent(); window.location.assign(result.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Payment could not be opened."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">{error && <p role="alert" className="text-sm text-amber-800">{error}</p>}<button disabled={busy} onClick={continuePayment} className="rounded-full bg-emerald-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Opening payment…" : "Continue to payment"}</button></div>;
}
