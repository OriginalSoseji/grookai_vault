"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ManagedCopy, ManagedStore, TeamWorkspace } from "@/lib/stores/storeTeam";
import { storeRequest } from "./storeManagerClient";
import s from "./StoreTeam.module.css";

export function ManagedStores() {
  const [stores, setStores] = useState<ManagedStore[] | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; storeRequest<ManagedStore[]>("/api/stores/team/managed").then(data => { if (active) setStores(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  return <div className={s.page}><Link className={s.link} href="/account/store">My store</Link><h1>Stores you manage</h1>{error && <p role="alert" className={s.error}>{error}</p>}{!stores && !error && <p>Loading stores…</p>}{stores?.length === 0 && <p>You have no active manager access. Ask the store owner for an invitation.</p>}{stores?.map(store => <section className={s.panel} key={store.id}><h2>{store.display_name}</h2><Link className={s.link} href={`/account/store/managed/${store.id}`}>Manage store</Link></section>)}</div>;
}

function CopyEditor({ copy, model, busy, save }: { copy: ManagedCopy; model: TeamWorkspace; busy: boolean; save: (action: string, data: Record<string, unknown>) => Promise<boolean> }) {
  const [conditionDraft, setCondition] = useState<string | null>(null); const [priceDraft, setPrice] = useState<string | null>(null);
  const [currencyDraft, setCurrency] = useState<string | null>(null);
  const condition = conditionDraft ?? copy.condition_label, price = priceDraft ?? String(copy.asking_price_amount ?? ""), currency = currencyDraft ?? copy.asking_price_currency ?? "USD";
  return <article className={s.card}><div className={s.art}>{copy.display_image_url ? /* eslint-disable-next-line @next/next/no-img-element */
    <img src={copy.display_image_url} alt={copy.name} /> : <span>Image unavailable</span>}</div><h2>{copy.name}</h2><p className={s.muted}>{copy.gv_vi_id}<br />{copy.printing_gv_id ?? copy.gv_id} · {copy.finish_label ?? "Unassigned printing"}</p>
    <form onSubmit={e => { e.preventDefault(); void save("condition", { condition }).then(saved => { if (saved) setCondition(null); }); }}><label>Condition<select disabled={busy || copy.is_graded || !model.permissions.includes("inventory")} value={condition} onChange={e => setCondition(e.target.value)}>{[...new Set([copy.condition_label, "NM", "LP", "MP", "HP", "DMG"])].map(value => <option key={value}>{value}</option>)}</select></label>{model.permissions.includes("inventory") && !copy.is_graded && <button disabled={busy || condition === copy.condition_label}>Save condition</button>}</form>
    <form onSubmit={e => { e.preventDefault(); void save("price", { amount: Number(price), currency }).then(saved => { if (saved) { setPrice(null); setCurrency(null); } }); }}><label>Asking price<input type="number" min="0.01" max="10000000" step="0.01" required value={price} disabled={busy || !model.permissions.includes("pricing")} onChange={e => setPrice(e.target.value)} /></label><label>Currency<input value={currency} pattern="[A-Z]{3}" maxLength={3} required disabled={busy || !model.permissions.includes("pricing")} onChange={e => setCurrency(e.target.value.toUpperCase())} /></label>{model.permissions.includes("pricing") && <button disabled={busy || (price === String(copy.asking_price_amount ?? "") && currency === copy.asking_price_currency)}>Save price</button>}</form>
    <p>{copy.selected ? "Selected for store" : "Not listed in store"}</p>{copy.ineligible_reason && <p className={s.muted}>Unavailable: {copy.ineligible_reason.replaceAll("_", " ")}</p>}{model.permissions.includes("listings") && <button disabled={busy || (!copy.selected && !!copy.ineligible_reason)} onClick={() => void save("listing", { selected: !copy.selected })}>{copy.selected ? "Remove from store" : "List in store"}</button>}
  </article>;
}

function BrandEditor({ model, busy, save, upload }: { model: TeamWorkspace; busy: boolean; save: (name: string, description: string) => Promise<boolean>; upload: (file: File, kind: string) => Promise<void> }) {
  const [nameDraft, setName] = useState<string | null>(null); const [descriptionDraft, setDescription] = useState<string | null>(null);
  const name = nameDraft ?? model.store.display_name, description = descriptionDraft ?? model.store.description;
  return <section className={s.panel}><h2>Store appearance</h2><form onSubmit={e => { e.preventDefault(); void save(name, description).then(saved => { if (saved) { setName(null); setDescription(null); } }); }}><label>Store name<input required maxLength={80} value={name} disabled={busy} onChange={e => setName(e.target.value)} /></label><label>Description<textarea maxLength={1000} value={description} disabled={busy} onChange={e => setDescription(e.target.value)} /></label><button disabled={busy || (name === model.store.display_name && description === model.store.description)}>Save store details</button></form><div className={s.grid}>{(["logo", "banner"] as const).map(kind => <div key={kind}>{model.store[`has_${kind}`] && /* eslint-disable-next-line @next/next/no-img-element */
    <img className={s.brandImage} src={`/api/stores/team/${model.store.id}/media?kind=${kind}&v=${encodeURIComponent(model.store.updated_at)}`} alt={`Current store ${kind}`} />}<label>Upload {kind}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file, kind); e.target.value = ""; }} /></label><p className={s.muted}>JPG, PNG or WebP, up to 5 MB.</p></div>)}</div></section>;
}

export default function StoreTeamWorkspace({ storeId }: { storeId: string }) {
  const [model, setModel] = useState<TeamWorkspace | null>(null); const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const endpoint = `/api/stores/team/${storeId}`;
  useEffect(() => { let active = true; storeRequest<TeamWorkspace>(endpoint).then(data => { if (active) setModel(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [endpoint]);
  async function load(offset = 0) { setBusy(true); setError(""); try { setModel(await storeRequest<TeamWorkspace>(`${endpoint}?q=${encodeURIComponent(query)}&offset=${offset}`)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function change(body: Record<string, unknown> | FormData, media = false) {
    setBusy(true); setError(""); setNotice("");
    try { await storeRequest(`${endpoint}${media ? "/media" : ""}`, body); setModel(await storeRequest<TeamWorkspace>(`${endpoint}?q=${encodeURIComponent(query)}&offset=${model?.offset ?? 0}`)); setNotice("Saved."); return true; }
    catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  }
  return <div className={s.page}><Link className={s.link} href="/account/store/managed">← Stores you manage</Link><h1>{model?.store.display_name ?? "Manager workspace"}</h1><p>Work with the store cards your owner has shared. Your permissions determine which actions are available.</p>{error && <p role="alert" className={s.error}>{error}</p>}{notice && <p role="status" className={s.notice}>{notice}</p>}{!model && !error && <p>Loading workspace…</p>}
    {model && <>{model.permissions.includes("branding") && <BrandEditor key={model.store.id} model={model} busy={busy} save={(name, description) => change({ action: "branding", expected: model.store.updated_at, name, description })} upload={async (file, kind) => { if (!file.size || file.size > 5 * 1024 * 1024) { setError("Choose an image up to 5 MB."); return; } const data = new FormData(); data.set("file", file); data.set("kind", kind); await change(data, true); }} />}
      <section className={s.panel}><h2>Store inventory</h2><form onSubmit={e => { e.preventDefault(); void load(); }}><label>Search name, GV-ID or GVVI<input maxLength={120} value={query} onChange={e => setQuery(e.target.value)} /></label><div className={s.actions}><button disabled={busy}>Search</button><button type="button" disabled={busy} onClick={() => void load(model.offset)}>Reload saved data</button></div></form><p>{model.total} matching copies</p><div className={s.grid}>{model.items.map(copy => <CopyEditor key={copy.id} copy={copy} model={model} busy={busy} save={(action, data) => change({ id: copy.id, action, expected: copy.updated_at, data })} />)}</div><div className={s.actions}><button disabled={busy || model.offset === 0} onClick={() => void load(Math.max(0, model.offset - 40))}>Previous</button><span>Page {Math.floor(model.offset / 40) + 1}</span><button disabled={busy || model.offset + 40 >= model.total} onClick={() => void load(model.offset + 40)}>Next</button></div></section></>}
  </div>;
}
