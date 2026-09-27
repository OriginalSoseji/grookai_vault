"use client";
/* eslint-disable @next/next/no-img-element -- Owner images require session cookies and uncached media authorization, not the shared optimizer. */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createWallSectionAction } from "@/lib/wallSections/createWallSectionAction";
import { ownerChange, storeRequest, uploadStoreImage, type OwnerModel } from "./storeManagerClient";
import StorePreorders from "./StorePreorders";
import StoreVisibility from "./StoreVisibility";
import StoreSharing from "./StoreSharing";
import StoreInventoryWorkspace from "./StoreInventoryWorkspace";
import StoreWorkspaceNavigation from "./StoreWorkspaceNavigation";
import StoreProductManager from "./StoreProductManager";
import { useStoreDraftGuard } from "./useStoreDraftGuard";
import s from "./StoreManager.module.css";

export type StoreTask = (work: () => Promise<void>, message?: string) => Promise<void>;
export default function StoreManager({initialProductId, pilot = false}: {initialProductId?:string; pilot?:boolean}) {
  const [owner, setOwner] = useState<OwnerModel | null>(null);
  const [tab, setTab] = useState<string>(initialProductId ? "Custom collectibles" : "Overview");
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(""), [error, setError] = useState("");
  const [intakePending, setIntakePending] = useState(false);
  const [query, setQuery] = useState("");
  const load = useCallback(async (params = "") => { setOwner(await storeRequest<OwnerModel>(`/api/stores/owner${params ? `?${params}` : ""}`)); }, []);
  const task: StoreTask = async (work, message = "Saved.") => {
    setBusy(true); setError(""); setNotice("");
    try { await work(); setNotice(message); } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Please retry."); }
    finally { setBusy(false); }
  };
  useEffect(() => { let active = true; storeRequest<OwnerModel>("/api/stores/owner").then(data => { if (active) setOwner(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  useStoreDraftGuard(dirty || intakePending);
  const navigate = (next: string) => { if (intakePending) return; if (dirty && !window.confirm("Discard your unsaved changes?")) return; setDirty(false); setTab(next); setError(""); setNotice(""); };
  const store = owner?.store;
  const canEdit = Boolean(owner?.capabilities.store_app && owner?.rollout.app_enabled);
  const refresh = () => load(query);
  return <div className={s.workspace}>
    <header className={s.header}><div><span className={s.eyebrow}>Vendor workspace</span><h1>{store?.display_name || "Your store"}</h1><p className={s.muted}>A home for your inventory. Manage it all from your computer.</p></div>
      <div className={s.actions}>{!pilot && <><Link className={s.linkButton} href="/account/store/orders">Store orders</Link><Link className={s.linkButton} href="/account/store/billing">Subscription</Link><Link className={s.linkButton} href="/account/store/payments">Seller payments</Link></>}<Link className={s.linkButton} href="/vault/transactions">Transaction history</Link><button disabled={busy} onClick={() => navigate("Visibility")}>Profile & store visibility</button>{store && <Link className={s.linkButton} href={`/store/${store.slug}?preview=1`} target="_blank">Private preview ↗</Link>}</div></header>
    {owner && <StoreSharing key={`${store?.slug}:${store?.web_published}:${owner.capabilities.store_web}:${owner.profile?.public_profile_enabled}:${owner.profile?.vault_sharing_enabled}`} owner={owner} onVisibility={() => navigate("Visibility")} />}
    {error && <div className={`${s.notice} ${s.error}`} role="alert">{error} {error.includes("session ended") && <Link href="/login?next=%2Faccount%2Fstore" target="_blank">Sign in</Link>}</div>}
    {notice && <div className={s.notice} role="status">{notice}</div>}
    {!owner ? <div className={s.panel}><p role="status">{error ? "Your store could not be loaded." : "Loading your workspace…"}</p><button disabled={busy} onClick={() => task(refresh, "")}>Retry</button></div> : <div className={s.shell}>
      <StoreWorkspaceNavigation active={tab} navigate={navigate} busy={busy || intakePending} preorders={Boolean(owner.preorders_enabled)} />
      <main className={s.stack} aria-busy={busy}>
        {!canEdit && <div className={s.notice}>Store editing is not available for this account. You can still inspect retained data, preview, remove listings and unpublish.</div>}
        {tab === "Overview" && <>
          <div className={s.stats}><div className={s.stat}><span className={s.muted}>In the app</span><strong>{store?.app_published ? "Published" : "Not published"}</strong></div><div className={s.stat}><span className={s.muted}>On the web</span><strong>{store?.web_published ? "Published" : "Not published"}</strong></div><div className={s.stat}><span className={s.muted}>Store access</span><strong>{owner.capabilities.store_web ? "App + web" : owner.capabilities.store_app ? "App" : "Inactive"}</strong></div></div>
          <section className={s.panel}><h2>{store ? "Add to your storefront" : "Make it your own"}</h2><p className={s.muted}>{store ? "Choose exact copies from your Vault, or create custom listings for other collectibles. Each listing is selected or published explicitly." : "Start with a store name and URL, then add your branding and inventory. Saving a store creates a private draft."}</p><div className={s.actions}><button className={s.primary} onClick={() => navigate(store ? "Custom collectibles" : "Store details")}>{store ? "Add a collectible" : "Set up your store"}</button>{store && <button onClick={() => navigate("Vault inventory")}>Choose Vault copies</button>}</div></section>
          <section className={s.panel}><h2>Catalog cards & your Vault</h2><p className={s.muted}>Search the catalog, add cards, set prices and sale status, and choose sections in one place.</p><div className={s.actions}><button className={s.primary} onClick={() => navigate("Vault inventory")}>Add & manage cards</button><Link className={s.linkButton} href="/vault/import" target="_blank">Import inventory ↗</Link></div></section>
          <section className={s.panel}><h2>Profile & store visibility</h2><p className={s.muted}>Choose whether customers can see your profile, shared Vault and storefront. All visibility controls are here in your workspace.</p><button className={s.primary} onClick={() => navigate("Visibility")}>Set up public visibility</button></section>
        </>}
        {tab === "Store details" && <StoreDetails key={store?.id ?? "new"} owner={owner} canEdit={canEdit} busy={busy} task={task} refresh={refresh} setDirty={setDirty} onCreated={() => { setDirty(false); setTab("Visibility"); }} />}
        {tab === "Visibility" && <StoreVisibility key={store?.id ?? "new"} owner={owner} canEdit={canEdit} busy={busy} task={task} refresh={refresh} setDirty={setDirty} pilot={pilot} />}
        {tab === "Vault inventory" && <StoreInventoryWorkspace onIntakePending={setIntakePending} setDirty={setDirty} initialQuery={query} owner={owner} canEdit={canEdit} busy={busy} task={task} load={async params => { await load(params); setQuery(params); }} refresh={refresh} />}
        {tab === "Custom collectibles" && (store ? <StoreProductManager initialProductId={initialProductId} owner={owner} canEdit={canEdit && Boolean(owner.rollout.custom_enabled)} busy={busy} task={task} setDirty={setDirty} /> : <Empty message="Save your store details before adding collectibles." />)}
        {tab === "Preorders" && (store ? <StorePreorders canEdit={canEdit} busy={busy} task={task} setDirty={setDirty} /> : <Empty message="Save your store details before creating preorders." />)}
        {tab === "Sections" && (store ? <StoreSections owner={owner} canEdit={canEdit} busy={busy} task={task} refresh={refresh} /> : <Empty message="Save your store details before selecting sections." />)}
      </main>
    </div>}
  </div>;
}
function Empty({ message }: { message: string }) { return <div className={s.empty}><h2>Nothing here yet</h2><p className={s.muted}>{message}</p></div>; }

function StoreDetails({ owner, canEdit, busy, task, refresh, setDirty, onCreated }: { owner: OwnerModel; canEdit: boolean; busy: boolean; task: StoreTask; refresh: () => Promise<void>; setDirty: (v: boolean) => void; onCreated: () => void }) {
  const store = owner.store;
  const [name, setName] = useState(store?.display_name ?? ""), [slug, setSlug] = useState(store?.slug ?? ""), [description, setDescription] = useState(store?.description ?? "");
  return <><section className={s.panel}><h2>Store identity</h2><p className={s.muted}>Your business identity is separate from your collector profile.</p><form onChange={() => setDirty(true)} onSubmit={e => { e.preventDefault(); void task(async () => { await ownerChange({ action: "save", slug, display_name: name, description }); setDirty(false); await refresh(); if (!store) onCreated(); }); }}><fieldset disabled={busy || !canEdit} className={s.stack}><div className={s.grid}><label>Store name<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><label>Store URL slug<input aria-label="Store URL slug" required minLength={3} maxLength={63} value={slug} disabled={Boolean(store?.first_published_at)} onChange={e => setSlug(e.target.value)} /><span className={s.muted}>{store?.first_published_at ? "Fixed after first publication." : "Letters, numbers and hyphens. Fixed after first publication."}</span></label></div><label>About your store<textarea maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} /></label><div><button className={s.primary} type="submit">{store ? "Save store details" : "Create store & set visibility"}</button></div></fieldset></form></section>
    {store && <section className={s.panel}><h2>Branding</h2><p className={s.muted}>JPEG, PNG or WebP, up to 5 MB. Uploads stay private until the store is published.</p><div className={s.grid}>{(["logo", "banner"] as const).map(kind => <div key={kind}><h3>{kind === "logo" ? "Store logo" : "Store banner"}</h3>{store[`${kind}_path`] && <img className={s.brandImage} alt={`Current store ${kind}`} src={`/api/stores/owner/media?kind=${kind}&v=${encodeURIComponent(store[`${kind}_path`]!)}`} />}<label>Upload {kind}<input className={s.file} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !canEdit} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void task(async () => { const path = await uploadStoreImage(file, kind); await ownerChange({ action: "media", kind, path }); await refresh(); }, "Branding updated."); }} /></label>{store[`${kind}_path`] && <button disabled={busy || !canEdit} onClick={() => task(async () => { await ownerChange({ action: "media", kind, path: null }); await refresh(); })}>Remove {kind}</button>}</div>)}</div></section>}
  </>;
}

function StoreSections({ owner, canEdit, busy, task, refresh }: { owner: OwnerModel; canEdit: boolean; busy: boolean; task: StoreTask; refresh: () => Promise<void> }) {
  const [name, setName] = useState("");
  return <section className={s.panel}><h2>Store sections</h2><p className={s.muted}>Choose existing Wall sections and their order. Creating a Wall section makes it available on your collector Wall; it does not select it for this store. Store sections show only selected eligible copies and explicitly assigned custom listings.</p><form className={s.actions} onSubmit={e => { e.preventDefault(); void task(async () => { const result = await createWallSectionAction({ name }); if (!result.ok) throw new Error(result.message); setName(""); await refresh(); }, "Wall section created. Select it below to use it in this store."); }}><label>New Wall section<input required maxLength={40} value={name} onChange={e => setName(e.target.value)} /></label><button type="submit" disabled={busy || !canEdit}>Create section</button></form><div className={s.actions}><Link href="/account" target="_blank">Rename or manage Wall sections ↗</Link></div>
    {owner.sections.map(section => <div className={`${s.row} ${s.sectionRow}`} key={section.id}><label className={s.check}><input type="checkbox" checked={section.selected} disabled={busy || (!section.selected && !canEdit)} onChange={e => { const selected = e.target.checked; void task(async () => { await ownerChange({ action: "section", section_id: section.id, selected, position: section.position ?? owner.sections.length }); await refresh(); }); }} />{section.name}</label>{section.selected && <label>Display order<input aria-label={`Order for ${section.name}`} type="number" min={0} max={10000} defaultValue={section.position ?? 0} key={`${section.id}-${section.position}`} disabled={busy || !canEdit} onBlur={e => { const position = Number(e.target.value); if (position !== section.position && Number.isInteger(position) && position >= 0) void task(async () => { await ownerChange({ action: "section", section_id: section.id, selected: true, position }); await refresh(); }); }} /></label>}</div>)}
  </section>;
}
