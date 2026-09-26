"use client";
/* eslint-disable @next/next/no-img-element -- Catalog thumbnails use the existing qualified image resolver. */
import { useRef, useState } from "react";
import { COPY_CONDITIONS, inventorySettings, type CatalogChoice, type CopyDetails } from "@/lib/stores/storeInventoryInput";
import type { StoreItem } from "@/lib/stores/storefrontTypes";
import { ownerChange, storeRequest, type OwnerModel } from "./storeManagerClient";
import type { StoreTask } from "./StoreManager";
import StoreCopyImage from "./StoreCopyImage";
import StoreBatchIntake from "./StoreBatchIntake";
import s from "./StoreManager.module.css";

const endpoint = "/api/stores/owner/inventory";
type Draft = { id: string | null; title: string; gvvi: string; graded: boolean; card: CatalogChoice | null; printing: string; condition: string; intent: string; mode: string; amount: string; currency: string; selected: boolean; sections: string[] };
export default function StoreInventoryWorkspace({ initialQuery, owner, canEdit, busy, task, load, refresh, setDirty, onIntakePending }: { initialQuery: string; owner: OwnerModel; canEdit: boolean; busy: boolean; task: StoreTask; load: (q: string) => Promise<void>; refresh: () => Promise<void>; setDirty: (v: boolean) => void; onIntakePending: (v: boolean) => void }) {
  const initial = new URLSearchParams(initialQuery);
  const [q, setQ] = useState(initial.get("q") ?? ""), [condition, setCondition] = useState(initial.get("condition") ?? ""), [kind, setKind] = useState(initial.get("kind") ?? "catalog");
  const [adding, setAdding] = useState(false), [catalogQuery, setCatalogQuery] = useState("");
  const [results, setResults] = useState<CatalogChoice[] | null>(null), [more, setMore] = useState(false), [offset, setOffset] = useState(0), [searchedQuery, setSearchedQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null), [changed, setChanged] = useState(false), [uncertain, setUncertain] = useState(false), [pendingDetails, setPendingDetails] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const submitLock = useRef(false);
  const editor = useRef<HTMLDivElement>(null);
  const inventory = owner.inventory;
  const draftItem = inventory?.items.find((item): item is StoreItem => item.entry_type === "catalog_copy" && item.id === draft?.id);
  const search = (next: number) => load(new URLSearchParams({ q, condition, kind, offset: String(next) }).toString());
  const discard = () => !changed || window.confirm(pendingDetails ? "This copy is already in your Vault. Leave its unfinished details?" : "Discard your unsaved copy details?");
  const patch = (values: Partial<Draft>) => { setDraft(d => d ? { ...d, ...values } : d); setChanged(true); setDirty(true); };
  const catalogSearch = async (next = 0, term = catalogQuery) => {
    const result = await storeRequest<{ cards: CatalogChoice[]; more: boolean }>(`${endpoint}?${new URLSearchParams({ q: term, offset: String(next) })}`);
    setResults(result.cards); setMore(result.more); setOffset(next); setSearchedQuery(term);
  };
  const choose = (card: CatalogChoice) => {
    if (!discard()) return;
    setDraft({ id: null, title: card.name, gvvi: "", graded: false, card, printing: "", condition: "NM", intent: "hold", mode: "asking", amount: "", currency: "USD", selected: false, sections: [] });
    setUncertain(false); setPendingDetails(false); setChanged(true); setDirty(true);
    requestAnimationFrame(() => editor.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const edit = async (item: StoreItem, listInStore = false) => {
    if (!discard()) return;
    const copy = await storeRequest<CopyDetails>(`${endpoint}?id=${encodeURIComponent(item.id)}`);
    setDraft({ id: copy.id, title: item.display_name || item.name, gvvi: copy.gv_vi_id, graded: Boolean(copy.slab_cert_id), card: null, printing: "", condition: copy.condition_label || "NM", intent: listInStore ? "sell" : copy.intent, mode: listInStore ? "asking" : copy.pricing_mode, amount: copy.asking_price_amount == null ? "" : String(copy.asking_price_amount), currency: copy.asking_price_currency || "USD", selected: listInStore || copy.selected, sections: copy.sections });
    setAdding(false); setUncertain(false); setPendingDetails(false); setChanged(listInStore); setDirty(listInStore);
    requestAnimationFrame(() => editor.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const save = async () => {
    if (!draft || submitLock.current || uncertain) return;
    const settings = inventorySettings(draft.graded ? { ...draft, condition: "NM" } : draft);
    if (!draft.id && (!draft.card || !draft.printing)) throw new Error("Choose the card's finish before adding it.");
    submitLock.current = true;
    try {
      let id = draft.id;
      if (!id) {
        // A create response is never retried automatically: it may have committed even if the network failed.
        setUncertain(true);
        const created = await storeRequest<{ id: string; gv_vi_id: string }>(endpoint, { action: "create", card_id: draft.card!.id, printing_id: draft.printing, condition: draft.condition });
        id = created.id;
        setDraft(d => d ? { ...d, id: created.id, gvvi: created.gv_vi_id } : d);
        setUncertain(false); setPendingDetails(true);
      }
      await storeRequest(endpoint, { action: "save", id, ...settings });
      setPendingDetails(false); setDraft(null); setChanged(false); setDirty(false);
      await refresh();
    } catch (error) {
      await refresh().catch(() => undefined);
      throw error;
    } finally { submitLock.current = false; }
  };
  if (!owner.store) return <section className={s.panel}><h2>Vault inventory</h2><p>Create your store in Store details, then add and manage cards here.</p></section>;
  return <section className={s.panel}>
    <div className={s.row}><div><h2>Vault inventory</h2><p className={s.muted}>Choose Add to store on a copy, review its price and sections, then save to list it.</p></div><div className={s.actions}><button disabled={busy || batchOpen} onClick={() => { if (!discard()) return; setAdding(false); setDraft(null); setChanged(false); setDirty(false); setBatchOpen(true); }}>{canEdit ? "Upload scans" : "Recover saved scan batch"}</button><button className={s.primary} disabled={busy || !canEdit || batchOpen} onClick={() => { if (!discard()) return; setAdding(true); setDraft(null); setChanged(false); setDirty(false); }}>Add cards</button></div></div>
    {batchOpen && <StoreBatchIntake onPendingChange={onIntakePending} owner={owner} close={() => setBatchOpen(false)} refresh={refresh} />}
    {adding && <div className={s.inventoryEditor}><div className={s.row}><h3>Find a catalog card</h3><button disabled={busy} onClick={() => { if (!discard()) return; setAdding(false); setDraft(null); setChanged(false); setDirty(false); }}>Close add cards</button></div>
      <form className={s.actions} onSubmit={e => { e.preventDefault(); void task(() => catalogSearch(), ""); }}><label className={s.searchGrow}>Card name or GV-ID<input required minLength={2} maxLength={120} value={catalogQuery} onChange={e => setCatalogQuery(e.target.value)} placeholder="Search the catalog, e.g. Pikachu" /></label><button type="submit" disabled={busy}>Search catalog</button></form>
      {results && <><p className={s.muted}>{results.length ? "Choose a card to set its details below." : "No cards found. Try another name or GV-ID."}</p><div className={s.catalogResults}>{results.map(card => <button key={card.id} type="button" className={s.catalogCard} disabled={busy || uncertain} aria-pressed={draft?.card?.id === card.id} onClick={() => choose(card)}>{card.image ? <img src={card.image} alt="" /> : <span className={s.cardPlaceholder}>No image</span>}<span><strong>{card.name}</strong><small>{card.set_code} · {card.number}</small><small>{card.gv_id}</small>{!card.printings.length && <small>No eligible finish available</small>}</span></button>)}</div><div className={s.row}><button disabled={busy || offset === 0} onClick={() => task(() => catalogSearch(Math.max(0, offset - 20), searchedQuery), "")}>Previous results</button><span className={s.muted}>Page {offset / 20 + 1}</span><button disabled={busy || !more} onClick={() => task(() => catalogSearch(offset + 20, searchedQuery), "")}>More results</button></div></>}
    </div>}
    {draft && <div ref={editor} className={s.inventoryEditor}><div className={s.row}><div><h3>{draft.id ? draft.selected && !draftItem?.selected ? "List copy" : "Edit copy" : "Add a copy"} · {draft.title}</h3>{draft.gvvi && <p className={s.muted}>{draft.gvvi}</p>}</div><button disabled={busy} onClick={() => { if (!discard()) return; setDraft(null); setChanged(false); setDirty(false); }}>Close editor</button></div>
      <div className={s.editorImage}><StoreCopyImage key={draftItem?.display_image_url || draft.card?.id} id={draft.id || undefined} name={draft.title} image={draftItem?.display_image_url || draft.card?.image || null} catalogImage={draftItem?.catalog_image_url} userPhoto={draftItem?.has_user_photo} busy={busy || batchOpen} canEdit={canEdit} task={task} refresh={refresh} />{!draft.id && <p className={s.muted}>Add this copy first, then use the pencil to upload your own photo.</p>}</div>
      {uncertain && <p className={`${s.notice} ${s.error}`} role="alert">The add request may have created a copy. Refresh inventory and open that copy below before adding another. This form will not repeat the add request.</p>}
      {pendingDetails && <p className={s.notice} role="status">Your copy is added. Save again to finish its details; another copy will not be created.</p>}
      <form onSubmit={e => { e.preventDefault(); if ((owner.store?.app_published || owner.store?.web_published) && !window.confirm("Save these changes to your published store inventory?")) return; void task(save, draft.id ? "Copy details saved." : "Card added with its details."); }}><fieldset disabled={busy || !canEdit || uncertain} className={s.stack}>
        <div className={s.grid}>{draft.card && <label>Finish<select required disabled={Boolean(draft.id)} value={draft.printing} onChange={e => patch({ printing: e.target.value })}><option value="">Choose the exact finish</option>{draft.card.printings.map(p => <option key={p.id} value={p.id}>{p.finish_label} · {p.printing_gv_id}</option>)}</select>{!draft.card.printings.length && <span className={s.muted}>This card has no eligible printing to add here yet.</span>}</label>}
          <label>Copy condition<select value={draft.condition} disabled={draft.graded} onChange={e => patch({ condition: e.target.value })}>{!COPY_CONDITIONS.includes(draft.condition as typeof COPY_CONDITIONS[number]) && <option>{draft.condition}</option>}{COPY_CONDITIONS.map(c => <option key={c}>{c}</option>)}</select>{draft.graded && <span className={s.muted}>Condition is retained with the slab identity.</span>}</label>
          <label>Sale status<select value={draft.intent} onChange={e => patch({ intent: e.target.value, ...(e.target.value !== "sell" ? { selected: false } : {}) })}><option value="hold">Keep private / hold</option><option value="sell">For sale</option><option value="trade">For trade</option><option value="showcase">Showcase</option></select></label>
          <label>Pricing<select value={draft.mode} onChange={e => patch({ mode: e.target.value, ...(e.target.value !== "asking" ? { selected: false } : {}) })}><option value="asking">Set an asking price</option><option value="market">Market reference (no asking price)</option></select></label>
          {draft.mode === "asking" && <><label>Asking price<input type="number" required min={draft.selected ? "0.01" : "0"} max="99999999" step="0.01" value={draft.amount} onChange={e => patch({ amount: e.target.value })} /></label><label>Currency<input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={draft.currency} onChange={e => patch({ currency: e.target.value.toUpperCase() })} /></label></>}
        </div>
        <div><h3>Sections</h3><p className={s.muted}>Choose where this copy belongs. Chosen sections are also included in your store. Your collector Wall uses these same sections.</p><div className={s.actions}>{owner.sections.map(section => <label key={section.id} className={s.check}><input type="checkbox" checked={draft.sections.includes(section.id)} onChange={e => patch({ sections: e.target.checked ? [...draft.sections, section.id] : draft.sections.filter(id => id !== section.id) })} />{section.name}</label>)}</div><div className={s.actions}><label className={s.searchGrow}>New section name<input maxLength={40} value={sectionName} onChange={e => setSectionName(e.target.value)} /></label><button type="button" disabled={!sectionName.trim()} onClick={() => task(async () => { await storeRequest(endpoint, { action: "section", name: sectionName }); setSectionName(""); await refresh(); }, "Section created. Select it for this copy above.")}>Create section here</button></div></div>
        <div><label className={s.check}><input type="checkbox" checked={draft.selected} onChange={e => patch({ selected: e.target.checked, ...(e.target.checked ? { intent: "sell", mode: "asking" } : {}) })} />List this copy in my store</label><p className={s.muted}>{draft.selected ? "Saving will mark this copy For sale and list it at your asking price. Review the price and sections before saving." : "Select this to prepare the copy for sale in your store."} Eligibility and profile/Vault sharing are checked when saving. Saving does not publish a draft store.</p></div>
        {draft.selected && !(Number(draft.amount) > 0) && <p className={s.copyEligibility} role="status">Enter an asking price above to list this copy.</p>}
        <div className={s.actions}><button className={s.primary} type="submit" disabled={draft.selected && !(Number(draft.amount) > 0)}>{busy ? "Saving…" : draft.selected ? "Save & list copy" : draft.id ? "Save copy details" : "Add card & save details"}</button></div>
      </fieldset></form>
    </div>}
    <form className={s.filters} onSubmit={e => { e.preventDefault(); void task(() => search(0), ""); }}><label>Search copies<input maxLength={120} placeholder="Name, GV-ID or GVVI" value={q} onChange={e => setQ(e.target.value)} /></label><label>Condition<select value={condition} onChange={e => setCondition(e.target.value)}><option value="">All conditions</option>{COPY_CONDITIONS.map(c => <option key={c}>{c}</option>)}</select></label><label>Type<select value={kind} onChange={e => setKind(e.target.value)}><option value="catalog">All copies</option><option value="raw">Raw</option><option value="slab">Graded</option></select></label><button disabled={busy} type="submit">Apply</button></form>
    <div className={s.row}><span className={s.muted}>{inventory?.total ?? 0} matching copies</span><button disabled={busy} onClick={() => task(refresh, "Inventory refreshed.")}>Refresh inventory</button></div>
    {!inventory?.items.length ? <p className={s.muted}>No matching copies. Add cards above or change your filters.</p> : <div className={s.inventoryGallery}>{inventory.items.map(item => item.entry_type !== "catalog_copy" ? null : <article className={s.inventoryCard} key={item.id}>
      <StoreCopyImage key={item.display_image_url} id={item.id} name={item.display_name || item.name} image={item.display_image_url} catalogImage={item.catalog_image_url} userPhoto={item.has_user_photo} busy={busy} canEdit={canEdit} task={task} refresh={refresh} />
      <div className={s.inventoryCardDetails}><h3>{item.display_name || item.name}</h3><div className={s.copyFacts}><span>{item.condition_label || "Condition not set"}</span><span>{item.finish_label || "Finish unassigned"}</span>{item.is_graded && <span>{[item.grade_company, item.grade_value].filter(Boolean).join(" ") || "Graded"}</span>}</div>
      <p className={s.copyPrice}>{item.asking_price_amount ? <><span>{item.asking_price_currency}</span> {item.asking_price_amount.toFixed(2)}</> : "Price not set"}</p>
      {item.selected ? <label className={s.check}><input type="checkbox" aria-label={`Select ${item.gv_vi_id}`} checked disabled={busy || batchOpen || Boolean(draft)} onChange={() => { void task(async () => { await ownerChange({ action: "item", instance_id: item.id, selected: false }); await refresh(); }, "Copy removed from store."); }} />Listed in store</label> : <button className={s.primary} disabled={busy || batchOpen || !canEdit} aria-label={`Add ${item.gv_vi_id} to store`} onClick={() => task(() => edit(item, true), "")}>Add to store</button>}
      {item.ineligible_reason && <p className={s.copyEligibility}>{item.ineligible_reason === "Set a positive asking price in Vendor Mode" ? "Set an asking price to list this copy." : item.ineligible_reason}</p>}
      <button className={s.copyEditButton} disabled={busy || batchOpen || !canEdit} aria-label={`Edit ${item.gv_vi_id}`} onClick={() => task(() => edit(item), "")}>Edit details</button>
      <div className={s.copyIdentifiers}><small>{item.gv_vi_id}</small><small>{item.printing_gv_id || "Printing unassigned"}</small></div></div>
    </article>)}</div>}
    <div className={s.row}><button disabled={busy || !inventory || inventory.offset === 0} onClick={() => task(() => search(Math.max(0, (inventory?.offset ?? 0) - 40)), "")}>Previous copies</button><span className={s.muted}>Page {Math.floor((inventory?.offset ?? 0) / 40) + 1}</span><button disabled={busy || !inventory || inventory.offset + inventory.limit >= inventory.total} onClick={() => task(() => search((inventory?.offset ?? 0) + 40), "")}>Next copies</button></div>
  </section>;
}
