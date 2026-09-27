"use client";
import Link from "next/link";
import { useState } from "react";
import { ownerChange, type OwnerModel } from "./storeManagerClient";
import type { StoreTask } from "./StoreManager";
import s from "./StoreManager.module.css";

export default function StoreVisibility({ owner, canEdit, busy, task, refresh, setDirty, pilot }: { owner: OwnerModel; canEdit: boolean; busy: boolean; task: StoreTask; refresh: () => Promise<void>; setDirty: (value: boolean) => void; pilot: boolean }) {
  const profile = owner.profile, store = owner.store;
  const [name, setName] = useState(profile?.display_name || store?.display_name || "");
  const [slug, setSlug] = useState(profile?.slug || store?.slug || "");
  const [isPublic, setIsPublic] = useState(profile?.public_profile_enabled ?? false);
  const [sharing, setSharing] = useState(profile?.vault_sharing_enabled ?? false);
  const [changed, setChanged] = useState(false);
  const profileReady = Boolean(profile?.public_profile_enabled && profile?.vault_sharing_enabled);
  return <>
    <section className={s.panel}><span className={s.eyebrow}>Store setup · Visibility</span><h2>Let customers find you</h2><p className={s.muted}>Manage your public profile and storefront here. Your choices are saved only when you submit them.</p>
      <form onChange={() => { setChanged(true); setDirty(true); }} onSubmit={e => { e.preventDefault(); void task(async () => { await ownerChange({ action: "visibility", slug, display_name: name, public_profile_enabled: isPublic, vault_sharing_enabled: sharing }); setChanged(false); setDirty(false); await refresh(); }, "Profile visibility saved."); }}>
        <fieldset className={s.stack} disabled={busy || !canEdit}>
          <div className={s.grid}><label>Public profile name<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><label>Profile URL slug<input required maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} /><span className={s.muted}>/u/{slug || "your-name"} · Your store keeps its separate /store URL.</span></label></div>
          <div><label className={s.check}><input type="checkbox" checked={isPublic} onChange={e => { setIsPublic(e.target.checked); if (!e.target.checked) setSharing(false); }} />Make my collector profile public</label><p className={s.muted}>Anyone with your profile link can view your public identity and shared content.</p>
            <label className={s.check}><input type="checkbox" checked={sharing} disabled={!isPublic} onChange={e => setSharing(e.target.checked)} />Enable Vault sharing for my public profile and store</label><p className={s.muted}>This enables your existing public Vault/Wall sharing rules. Private Hold copies remain private. Store inventory still contains only copies you explicitly select.</p></div>
          <div><button className={s.primary} type="submit">Save profile visibility</button></div>
        </fieldset>
      </form>
    </section>
    <section className={s.panel}><h2>Publish your store</h2><p className={s.muted}>Publishing is a separate choice from making your profile public. Add and select eligible inventory, preview it, then choose where customers can see your store.</p>
      {!store && <p className={s.notice}>Create your store details first.</p>}
      {!profileReady && <p className={s.notice}>Enable your public profile and Vault sharing above, then save those settings before publishing.</p>}
      {changed && <p className={s.notice}>Save your profile changes before changing store publication.</p>}
      <div className={s.actions}>{(["app", "web"] as const).map(surface => {
        const published = Boolean(store?.[`${surface}_published`]);
        const available = owner.capabilities[`store_${surface}`] && owner.rollout[`${surface}_enabled`];
        return <button key={surface} disabled={busy || changed || !store || (!published && (!canEdit || !profileReady || !available))} className={published ? "" : s.primary} onClick={() => void task(async () => { await ownerChange({ action: "publish", surface, publish: !published }); await refresh(); }, published ? "Store unpublished." : "Your store is published.")}>{published ? "Unpublish" : "Publish"} {surface === "web" ? "public web store" : "in app"}</button>;
      })}{store && <Link className={s.linkButton} href={`/store/${store.slug}?preview=1`} target="_blank">Private preview ↗</Link>}</div>
      {(!owner.capabilities.store_web || !owner.rollout.web_enabled) && <p className={s.muted}>{pilot ? "Public web publishing is not enabled in this review environment. Profile visibility and owner preview are available." : "Public web publishing requires web store access and an enabled rollout."}</p>}
    </section>
  </>;
}
