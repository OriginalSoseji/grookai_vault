"use client";
/* eslint-disable @next/next/no-img-element -- Governed catalog thumbnails. */
import { useEffect, useRef, useState } from "react";
import type { TeamCatalog, TeamWorkflows, TeamWorkspace } from "@/lib/stores/storeTeam";
import { storeRequest } from "./storeManagerClient";
import { definitiveRejection, teamWrite } from "./storeTeamWorkflowClient";
import StoreTeamProducts from "./StoreTeamProducts";
import s from "./StoreTeam.module.css";

function CardIntake({ endpoint, model, context, refresh }: { endpoint: string; model: TeamWorkspace; context: TeamWorkflows; refresh: () => Promise<void> }) {
  const [query, setQuery] = useState(""), [catalog, setCatalog] = useState<TeamCatalog | null>(null), [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<TeamCatalog["cards"][number] | null>(null), [printing, setPrinting] = useState("");
  const [condition, setCondition] = useState("NM"), [price, setPrice] = useState(""), [currency, setCurrency] = useState("USD");
  const [listed, setListed] = useState(false), [sections, setSections] = useState<string[]>([]), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [receipt, setReceipt] = useState(""), [retry, setRetry] = useState(false);
  const attempt = useRef<Record<string, unknown> | null>(null);
  const can = (permission: "pricing" | "listings" | "sections") => model.permissions.includes(permission);
  async function search(page = 0) {
    setBusy(true); setError("");
    try { setCatalog(await storeRequest<TeamCatalog>(`${endpoint}/catalog?q=${encodeURIComponent(query)}&offset=${page}`)); setOffset(page); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    if (busy || !selected || !printing) return;
    attempt.current ??= { request: crypto.randomUUID(), data: { card_id: selected.id, printing_id: printing, condition,
      amount: can("pricing") && price !== "" ? Number(price) : null, currency, listed: can("listings") && listed, sections: can("sections") ? sections : [] } };
    setBusy(true); setError("");
    try {
      const result = await teamWrite<{ gvvi: string }>(`${endpoint}/catalog`, attempt.current);
      setReceipt(result.gvvi); attempt.current = null; setRetry(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      if (definitiveRejection(e)) attempt.current = null;
      setRetry(attempt.current !== null);
    } finally { setBusy(false); }
  }
  return <section className={s.panel}><h2>Add catalog cards</h2><p>Choose the exact printing, then add one physical copy with its listing details.</p>
    {error && <p className={s.error} role="alert">{error}</p>}
    {receipt ? <div className={s.notice} role="status"><p>Copy added: {receipt}</p><button onClick={() => { setReceipt(""); setSelected(null); setPrinting(""); setPrice(""); setListed(false); setSections([]); }}>Add another copy</button></div> : <>
      <form onSubmit={e => { e.preventDefault(); void search(); }}><label>Search catalog<input required minLength={2} maxLength={120} value={query} disabled={busy || retry} onChange={e => setQuery(e.target.value)} /></label><button disabled={busy || retry}>Find cards</button></form>
      {catalog && <><div className={s.grid}>{catalog.cards.map(card => <button type="button" className={s.card} key={card.id} disabled={busy || retry || !card.printings.length} aria-pressed={selected?.id === card.id} onClick={() => { setSelected(card); setPrinting(""); setError(""); }}><span className={s.art}>{card.image ? <img src={card.image} alt="" /> : <span>Image unavailable</span>}</span><strong>{card.name}</strong><p className={s.muted}>{card.gv_id}<br />{card.set_code} · {card.number}</p>{!card.printings.length && <p>No eligible printing</p>}</button>)}</div>{!catalog.cards.length && <p>No matching cards.</p>}<div className={s.actions}><button disabled={busy || retry || offset === 0} onClick={() => void search(Math.max(0, offset - 20))}>Previous cards</button><button disabled={busy || retry || !catalog.more || offset >= 10000} onClick={() => void search(offset + 20)}>Next cards</button></div></>}
      {selected && <form onSubmit={e => { e.preventDefault(); void save(); }}><h3>New copy of {selected.name}</h3><fieldset disabled={busy || retry}><label>Printing<select required value={printing} onChange={e => setPrinting(e.target.value)}><option value="">Choose the printing on your card</option>{selected.printings.map(p => <option key={p.id} value={p.id}>{p.finish_label} · {p.printing_gv_id}</option>)}</select></label><label>Condition<select value={condition} onChange={e => setCondition(e.target.value)}>{["NM","LP","MP","HP","DMG"].map(value => <option key={value}>{value}</option>)}</select></label>
        {can("pricing") && <div className={s.grid}><label>Asking price (optional)<input type="number" min="0.01" max="10000000" step="0.01" value={price} onChange={e => { setPrice(e.target.value); if (!e.target.value) setListed(false); }} /></label><label>Currency<input required pattern="[A-Z]{3}" maxLength={3} value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} /></label></div>}
        {can("sections") && <fieldset className={s.permissions}><legend>Store sections</legend>{context.sections.map(section => <label key={section.id}><input type="checkbox" checked={sections.includes(section.id)} onChange={e => setSections(e.target.checked ? [...sections, section.id] : sections.filter(id => id !== section.id))} />{section.name}</label>)}</fieldset>}
        {can("listings") && <label className={s.actions}><input type="checkbox" checked={listed} disabled={!can("pricing") || !price} onChange={e => setListed(e.target.checked)} />List this copy in the store now</label>}
      </fieldset><p className={s.muted}>Copies are added for sale. They stay unlisted until explicitly selected with an eligible printing and price.</p>{retry && <p role="status">The result is uncertain. Keep this page open and retry the same request to confirm it without adding a second copy.</p>}<button disabled={busy || !printing}>{retry ? "Retry and confirm copy" : "Add one copy"}</button></form>}
    </>}
  </section>;
}

function SectionEditor({ endpoint, context, model, refresh }: { endpoint: string; context: TeamWorkflows; model: TeamWorkspace; refresh: () => Promise<void> }) {
  const [name, setName] = useState(""), [drafts, setDrafts] = useState<Record<string,string>>({}), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [retry, setRetry] = useState(false), attempt = useRef<Record<string,unknown> | null>(null);
  async function change(body: Record<string,unknown>, create = false) {
    if (busy) return; setBusy(true); setError("");
    if (create) attempt.current ??= { ...body, request: crypto.randomUUID() };
    try { await teamWrite(`${endpoint}/workflows`, create ? attempt.current! : body); if (create) { attempt.current = null; setName(""); setRetry(false); } if (body.action === "rename" && typeof body.section === "string") { const sectionId = body.section; setDrafts(current => { const next = { ...current }; delete next[sectionId]; return next; }); } await refresh(); }
    catch (e) { setError((e as Error).message); if (create) { if (definitiveRejection(e)) attempt.current = null; setRetry(!!attempt.current); } }
    finally { setBusy(false); }
  }
  return <section className={s.panel}><h2>Store sections</h2><p>These sections are shared with this store. Renaming also updates their name on the owner’s Wall.</p>{error && <p className={s.error} role="alert">{error}</p>}
    <form onSubmit={e => { e.preventDefault(); void change({ action: "create", data: { name } }, true); }}><label>New section name<input required maxLength={80} disabled={busy || retry} value={name} onChange={e => setName(e.target.value)} /></label><button disabled={busy}>{retry ? "Retry section creation" : "Create store section"}</button></form>
    {context.sections.map(section => <form key={section.id} onSubmit={e => { e.preventDefault(); void change({ action: "rename", section: section.id, expected: section.updated_at, data: { name: drafts[section.id] ?? section.name } }); }}><label>Section name<input required maxLength={80} disabled={busy || retry} value={drafts[section.id] ?? section.name} onChange={e => setDrafts({ ...drafts, [section.id]: e.target.value })} /></label><button disabled={busy || retry || !drafts[section.id] || drafts[section.id] === section.name}>Rename section</button></form>)}
    {!!context.sections.length && <><h3>Assign inventory from this page</h3><p className={s.muted}>Use the inventory search below to find other copies. Assigning a section does not list a copy for sale.</p>{model.items.map(copy => <fieldset className={s.permissions} key={copy.id} disabled={busy || retry}><legend>{copy.name} · {copy.gv_vi_id}</legend>{context.sections.map(section => <label key={section.id}><input type="checkbox" checked={copy.section_ids?.includes(section.id) ?? false} onChange={e => void change({ action: "assign", section: section.id, expected: copy.updated_at, data: { instance_id: copy.id, included: e.target.checked } })} />{section.name}</label>)}</fieldset>)}</>}
  </section>;
}

export default function StoreTeamWorkflows({ model, refresh }: { model: TeamWorkspace; refresh: () => Promise<void> }) {
  const endpoint = `/api/stores/team/${model.store.id}`;
  const [context, setContext] = useState<TeamWorkflows | null>(null), [error, setError] = useState("");
  useEffect(() => { let active = true; storeRequest<TeamWorkflows>(`${endpoint}/workflows`).then(data => { if (active) setContext(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [endpoint]);
  async function reload() { setContext(await storeRequest<TeamWorkflows>(`${endpoint}/workflows`)); await refresh(); }
  if (error) return <p className={s.error} role="alert">{error}</p>;
  if (!context?.enabled) return null;
  return <>{model.permissions.includes("intake") && <CardIntake endpoint={endpoint} model={model} context={context} refresh={reload} />}{model.permissions.includes("sections") && <SectionEditor endpoint={endpoint} context={context} model={model} refresh={reload} />}{model.permissions.includes("custom") && <StoreTeamProducts endpoint={endpoint} model={model} context={context} />}</>;
}
