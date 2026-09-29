"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { SellerStatus } from "@/lib/payments/vendorSellerService";
import s from "./StoreManager.module.css";
import ExistingSellerConnection from "./ExistingSellerConnection";
async function request<T>(action?: "onboarding" | "refresh"): Promise<T> {
  const response = await fetch("/api/vendor-payments/owner", { method: action ? "POST" : "GET", cache: "no-store", credentials: "same-origin",
    ...(action ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) } : {}) });
  const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Seller payments could not be loaded."); return body;
}
export default function VendorSellerManager() {
  const [status, setStatus] = useState<SellerStatus | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const current = await request<SellerStatus>(); if (!active) return; setStatus(current);
        const returned = new URLSearchParams(window.location.search).get("onboarding");
        if (returned === "refresh" && current.onboardingEnabled && !current.recoveryRequired)
          setNotice("Your Stripe setup link expired or was already used. Continue setup to get a new link.");
        if (returned === "returned" && current.enabled && current.state === "bound") {
          setBusy(true); setNotice("Checking your seller account with Stripe…");
          const result = await request<{ status: SellerStatus }>("refresh");
          if (active) { setStatus(result.status); setNotice("Seller account status refreshed."); }
        }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Seller payments could not be loaded."); }
      finally { if (active) setBusy(false); }
    }
    void load(); return () => { active = false; };
  }, []);
  async function act(action?: "onboarding" | "refresh") {
    setBusy(true); setError(""); setNotice("");
    // Clear prior observations before a refresh; a failed call must never retain
    // a stale ready indicator or imply that a return URL confirmed completion.
    setStatus(previous => previous ? { ...previous, readiness: null } : previous);
    try {
      if (!action) { setStatus(await request<SellerStatus>()); return; }
      const result = await request<{ url?: string; status?: SellerStatus }>(action);
      if (result.url) {
        const url = new URL(result.url);
        if (url.origin !== "https://connect.stripe.com" || url.username || url.password || url.hash) throw new Error("Unexpected seller setup destination.");
        window.location.assign(url.toString()); return;
      }
      if (result.status) setStatus(result.status); setNotice("Seller account status refreshed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Seller payments could not be updated."); }
    finally { setBusy(false); }
  }
  return <div className={s.workspace}>
    <header className={s.header}><div><span className={s.eyebrow}>Vendor workspace</span><h1>Seller payments</h1><p className={s.muted}>Set up your Stripe account from your computer.</p></div><Link className={s.linkButton} href="/account/store">Back to your store</Link></header>
    <ExistingSellerConnection />
    {error && <div className={`${s.notice} ${s.error}`} role="alert">{error}</div>}
    {notice && <div className={s.notice} role="status">{notice}</div>}
    <section className={s.panel} aria-busy={busy}>
      {!status ? <><p>{error ? "Seller status is unavailable." : "Loading seller payments…"}</p><button disabled={busy} onClick={() => void act()}>Retry</button></> : <>
        {status.testMode && <p className={s.notice}>Test seller setup — use Stripe test information only.</p>}
        <h2>Your seller account</h2>
        <p>{status.state === "none" ? "Seller payments have not been set up." : status.state === "bound" ? "Your Stripe account is connected." : status.state === "closing" ? "Account closure is being reviewed." : status.state === "deauthorized" ? "Stripe access was disconnected. Contact Grookai support." : "Seller setup is in progress."}</p>
        {status.recoveryRequired && <p>Your earlier setup needs review before another attempt. Contact Grookai support.</p>}
        {!status.onboardingEnabled && status.state !== "bound" && <p>Seller setup is currently unavailable for this account.</p>}
        {status.readiness && <div role="status"><p>{status.readiness.capabilitiesReady ? "Stripe currently reports payment and payout capabilities as active." : "Stripe setup or verification is still required."}</p>
          {status.readiness.requirements.currentlyDue !== null && status.readiness.requirements.currentlyDue > 0 && <p>Continue setup to provide the remaining information.</p>}
          {status.readiness.reasons.includes("verification_pending") && <p>Stripe is reviewing your information.</p>}
          <p className={s.muted}>Checked {new Date(status.readiness.checkedAt * 1000).toLocaleString()}.</p></div>}
        <p>Stripe collects your business, identity and bank information. Seller setup does not enable buyer checkout yet.</p>
        <div className={s.actions}><button className={s.primary} disabled={busy || !status.onboardingEnabled || status.recoveryRequired} onClick={() => void act("onboarding")}>{status.hasConnectedAccount ? "Continue Stripe setup" : "Set up with Stripe"}</button>
          <button disabled={busy || !status.enabled || status.state !== "bound"} onClick={() => void act("refresh")}>Check Stripe status</button></div>
      </>}
    </section>
  </div>;
}
