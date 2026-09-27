"use client";
import Link from "next/link";
import { useState } from "react";
import type { OwnerModel } from "./storeManagerClient";
import s from "./StoreManager.module.css";

export default function StoreSharing({ owner, siteOrigin, onVisibility }: { owner: OwnerModel; siteOrigin: string; onVisibility: () => void }) {
  const [message, setMessage] = useState("");
  const store = owner.store;
  if (!store) return null;
  const available = store.web_published && owner.capabilities.store_app && owner.capabilities.store_web
    && owner.rollout.app_enabled && owner.rollout.web_enabled
    && owner.profile?.public_profile_enabled && owner.profile?.vault_sharing_enabled;
  const url = `${siteOrigin}/store/${encodeURIComponent(store.slug)}`;
  return <section className={`${s.panel} ${s.sharePanel}`} aria-label="Share your store">
    <h2>Share your store</h2>
    {available ? <>
      <p className={s.muted}>Send this public link to customers. They can browse without an account or the app.</p>
      <label>Public store link<input readOnly value={url} onFocus={event => event.currentTarget.select()} /></label>
      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={async () => {
          setMessage("");
          try { await navigator.clipboard.writeText(url); setMessage("Public store link copied."); }
          catch { setMessage("Could not copy automatically. Select and copy the public link above."); }
        }}>Copy public link</button>
        <Link className={s.linkButton} href={url} target="_blank" rel="noopener noreferrer">Open public store ↗</Link>
      </div>
      {message && <p role="status">{message}</p>}
    </> : <>
      <p className={s.muted}>Your store is not available on the public web. Check your profile visibility, store access and web publication before sharing.</p>
      <button type="button" onClick={onVisibility}>Set up public visibility</button>
    </>}
    <p className={s.muted}>Private preview links only work for you. Use the public store link when sharing.</p>
  </section>;
}
