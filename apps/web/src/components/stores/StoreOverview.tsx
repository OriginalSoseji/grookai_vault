"use client";
import Link from "next/link";
import type { OwnerModel } from "./storeManagerClient";
import { storeAvailability } from "./storeAvailability";
import StoreSharing from "./StoreSharing";
import s from "./StoreManager.module.css";

export default function StoreOverview({ owner, navigate, busy, siteOrigin }: {
  owner: OwnerModel; navigate: (tab: string) => void; busy: boolean; siteOrigin: string;
}) {
  const store = owner.store;
  const available = storeAvailability(owner);
  if (!store) return <section className={s.panel}>
    <h2>Start with a private draft</h2>
    <p className={s.muted}>Choose a store name and URL. Then add inventory, review your prices and preview your storefront before publishing.</p>
    <button className={s.primary} disabled={busy} onClick={() => navigate("Store details")}>Set up your store</button>
    <p className={s.muted}>Saving details does not make anything public.</p>
  </section>;
  const status = (surface: "app" | "web") => available[surface] ? "Published" : store[`${surface}_published`] ? "Unavailable · publication saved" : "Not published";
  return <>
    <section className={s.publicationSummary} aria-label="Store publication status">
      <p><span>In the app</span><strong>{status("app")}</strong></p>
      <p><span>Public web</span><strong>{status("web")}</strong></p>
    </section>
    <section className={`${s.panel} ${s.journey}`} aria-label="Prepare your storefront">
      <h2>From inventory to storefront</h2>
      <p className={s.muted}>You choose the copies, prices and audience. Nothing is published by moving through these steps.</p>
      <ol>
        <li><div><h3>Choose inventory</h3><p>Pick exact Vault copies or create a custom collectible.</p></div><div className={s.actions}><button disabled={busy} onClick={() => navigate("Vault inventory")}>Choose Vault copies</button><button disabled={busy} onClick={() => navigate("Custom collectibles")}>Add a collectible</button></div></li>
        <li><div><h3>Review prices & sale status</h3><p>Check each copy’s condition, asking price and eligibility.</p></div><button disabled={busy} onClick={() => navigate("Vault inventory")}>Review prices</button></li>
        <li><div><h3>Preview privately</h3><p>Inspect the selected inventory before customers see it.</p></div><Link className={s.linkButton} href={`/store/${store.slug}?preview=1`} target="_blank" rel="noopener noreferrer">Open private preview ↗</Link></li>
        <li><div><h3>Choose where to publish</h3><p>Review profile sharing, then explicitly publish in the app or on the web.</p></div><button disabled={busy} onClick={() => navigate("Visibility")}>Review publication</button></li>
        <li><div><h3>Share your public store</h3><p>{available.web ? "Your public link is ready below." : "Your public link becomes available when web publication and sharing are enabled."}</p></div></li>
      </ol>
    </section>
    {available.web && <StoreSharing owner={owner} siteOrigin={siteOrigin} onVisibility={() => navigate("Visibility")} />}
    <p className={s.muted}><Link href="/vault/import">Import inventory</Link> · <button className={s.textAction} disabled={busy} onClick={() => navigate("Store details")}>Store details & branding</button></p>
  </>;
}
