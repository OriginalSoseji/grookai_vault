"use client";
import { useCallback, useEffect, useState } from "react";
import { preorderCents, type StorePreorder } from "@/lib/stores/storePreorderInput";
import { storeRequest } from "./storeManagerClient";
import type { StoreTask } from "./StoreManager";
import s from "./StoreManager.module.css";
const endpoint="/api/stores/owner/preorders";
type Page={items:StorePreorder[];total:number};
export default function StorePreorders({canEdit,busy,task,setDirty}:{canEdit:boolean;busy:boolean;task:StoreTask;setDirty:(v:boolean)=>void}) {
 const [page,setPage]=useState<Page|null>(null),[offset,setOffset]=useState(0),[editing,setEditing]=useState<StorePreorder|null>(null),[creating,setCreating]=useState(false),[loadError,setLoadError]=useState("");
 const load=useCallback(async()=>{setPage(await storeRequest<Page>(endpoint+"?offset="+offset));setLoadError("");},[offset]);
 useEffect(()=>{let active=true;storeRequest<Page>(endpoint+"?offset="+offset).then(v=>{if(active){setPage(v);setLoadError("");}}).catch(e=>{if(active)setLoadError(e.message);});return()=>{active=false;};},[offset]);
 if(creating || editing) return <PreorderForm key={editing?.id||"new"} item={editing} busy={busy} canEdit={canEdit} task={task} setDirty={setDirty} saved={async()=>{setCreating(false);setEditing(null);setDirty(false);await load();}} cancel={()=>{setCreating(false);setEditing(null);setDirty(false);}} />;
 return <section className={s.panel}><div className={s.row}><div><h2>Preorders</h2><p className={s.muted}>Plan upcoming releases and choose payment terms for each one.</p></div><button className={s.primary} disabled={busy||!canEdit} onClick={()=>setCreating(true)}>Create preorder</button></div>
 <p className={s.notice}>Preorders save as private drafts. Customer reservations and payment collection are not enabled yet.</p>
 {loadError ? <div role="alert">{loadError}<button onClick={()=>void task(load,"")}>Retry</button></div> : !page ? <p role="status">Loading preorders…</p> : <><div className={s.stack}>{page.items.length===0&&<p>No preorders yet.</p>}{page.items.map(item=><article className={s.panel} key={item.id}><h3>{item.title}</h3><p>{item.status==="archived"?"Archived":"Private draft"} · Expected {item.expected_date} · Up to {item.allocation_limit} units</p><p>USD {(item.price_cents/100).toFixed(2)} · {item.payment_mode==="reservation"?"Reserve without payment":item.payment_mode==="full"?"Full payment upfront":"USD "+((item.deposit_cents??0)/100).toFixed(2)+" deposit"}</p><button disabled={busy} onClick={()=>setEditing(item)}>View / edit</button></article>)}</div><div className={s.actions}><button disabled={busy||offset===0} onClick={()=>{setPage(null);setOffset(offset-25);}}>Previous</button><span>{page.total} preorders</span><button disabled={busy||offset+25>=page.total} onClick={()=>{setPage(null);setOffset(offset+25);}}>Next</button></div></>}
 </section>;
}
function PreorderForm({item,busy,canEdit,task,setDirty,saved,cancel}:{item:StorePreorder|null;busy:boolean;canEdit:boolean;task:StoreTask;setDirty:(v:boolean)=>void;saved:()=>Promise<void>;cancel:()=>void}) {
 const [id]=useState(()=>item?.id??crypto.randomUUID());
 const [title,setTitle]=useState(item?.title??""),[description,setDescription]=useState(item?.description??""),[date,setDate]=useState(item?.expected_date??"");
 const [price,setPrice]=useState(item?String(item.price_cents/100):""),[limit,setLimit]=useState(String(item?.allocation_limit??1));
 const [mode,setMode]=useState<StorePreorder["payment_mode"]>(item?.payment_mode??"reservation"),[deposit,setDeposit]=useState(item?.deposit_cents?String(item.deposit_cents/100):"");
 const [terms,setTerms]=useState(item?.terms??""),[status,setStatus]=useState(item?.status??"draft"),[changed,setChanged]=useState(false);
 return <section className={s.panel}><h2>{item?"Edit preorder":"Create preorder"}</h2><p className={s.muted}>Set your own terms for this release. Saving keeps it private; it does not accept reservations or charge customers.</p>
 <form onChange={()=>{setChanged(true);setDirty(true);}} onSubmit={e=>{e.preventDefault();void task(async()=>{await storeRequest(endpoint,{id,version:item?.version??0,status,title,description,expected_date:date,price_cents:preorderCents(price),allocation_limit:Number(limit),payment_mode:mode,deposit_cents:mode==="deposit"?preorderCents(deposit):null,terms});await saved();},"Preorder draft saved.");}}><fieldset className={s.stack} disabled={busy||!canEdit}>
 <label>Preorder title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Upcoming set or collectible" /></label>
 <label>Description<textarea maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} /></label>
 <div className={s.grid}><label>Expected availability<input required type="date" value={date} onChange={e=>setDate(e.target.value)} /></label><label>Allocation limit<input required type="number" min={1} max={100000} step={1} value={limit} onChange={e=>setLimit(e.target.value)} /></label><label>Total price (USD)<input required type="number" min="0.01" max="1000000" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} /></label></div>
 <label>Customer payment terms<select value={mode} onChange={e=>setMode(e.target.value as StorePreorder["payment_mode"])}><option value="reservation">Reserve without payment</option><option value="full">Pay in full upfront</option><option value="deposit">Pay a deposit</option></select></label>
 {mode==="deposit"&&<label>Deposit per unit (USD)<input required type="number" min="0.01" step="0.01" value={deposit} onChange={e=>setDeposit(e.target.value)} /><span className={s.muted}>The deposit must be less than the total. Explain when the remaining balance is due below.</span></label>}
 <label>Availability, cancellation and payment terms<textarea required maxLength={4000} value={terms} onChange={e=>setTerms(e.target.value)} placeholder="Explain expected timing, allocation limits, cancellations and when any balance is due." /></label>
 {item&&<label>Status<select value={status} onChange={e=>setStatus(e.target.value as StorePreorder["status"])}><option value="draft">Private draft</option><option value="archived">Archived</option></select></label>}
 <p className={s.notice}>All three payment choices can be saved. Customer booking and payment collection remain disabled.</p><button className={s.primary} type="submit">Save preorder draft</button>
 </fieldset></form><button disabled={busy} onClick={()=>{if(!changed||window.confirm("Discard your unsaved preorder changes?"))cancel();}}>Back to preorders</button></section>;
}
