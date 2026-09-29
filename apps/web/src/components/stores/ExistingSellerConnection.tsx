"use client";
import { useEffect, useState } from "react";
import s from "./StoreManager.module.css";

export default function ExistingSellerConnection() {
  const [available,setAvailable] = useState(false), [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/vendor-payments/adoption",{cache:"no-store",signal:controller.signal})
      .then(async response => { if (response.ok) setAvailable((await response.json()).available === true); })
      .catch(() => {});
    return () => controller.abort();
  },[]);
  async function connect() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/vendor-payments/adoption",{method:"POST",cache:"no-store",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"connect"})});
      const data = await response.json();
      if (!response.ok || data.connected !== true) throw new Error("Unable to verify your seller connection. Please try again.");
      window.location.reload();
    } catch { setError("Unable to verify your seller connection. Please try again."); }
    finally { setBusy(false); }
  }
  if (!available) return null;
  return <section className={s.panel} aria-busy={busy}>
    <h2>Connect your existing Stripe seller</h2>
    <p>An existing Stripe seller account has been approved for this store. Connect it to verify its current status.</p>
    <p className={s.muted}>Buyer checkout stays off until store payments are activated.</p>
    <button type="button" disabled={busy} onClick={() => void connect()}
      className={s.primary}>
      {busy ? "Verifying connection…" : "Connect existing seller"}
    </button>
    {error ? <p role="alert" className="mt-3 text-sm">{error}</p> : null}
  </section>;
}
