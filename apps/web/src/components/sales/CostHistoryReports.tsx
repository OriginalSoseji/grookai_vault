"use client";
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {createCostCorrectionService} from '@/lib/sales/costCorrectionBrowser';
import type {CostCorrectionService,CostCorrectionAttempt} from '@/lib/sales/costCorrectionService.mjs';
import type {CostCorrectionJournal} from '@/lib/sales/costCorrectionJournal.mjs';
import {sameCostEvidence,validateSaleCostCorrectionRequest,type SaleCostCorrectionState,type SaleCostCorrectionOutcome} from '@/lib/sales/saleCostCorrections.mjs';
import {readSaleCostSnapshots} from '@/lib/sales/readSaleCostSnapshots';
import {salesProfit,salesProfitCorrected,profitMoney,costGapLabel,type CostSnapshot,type ProfitReport} from '@/lib/sales/salesProfit.mjs';
import {saleCostReportCsv} from '@/lib/sales/saleCostReport.mjs';
import {isPurchaseReceipt} from '@/lib/sales/salesPurchase.mjs';
import {eventMoneyInput,eventMoneyText} from '@/lib/sales/vendorEvents.mjs';
import type {RecordedReceipt} from '@/lib/sales/salesReport.mjs';
import c from './EventReports.module.css';
import s from './SalesDesk.module.css';
type Edit={receipt:RecordedReceipt;lineIndex:number;expectedRevision:string;localRevision:string|null;amount:string;currency:string;reason:string;action:'set'|'restore'};
const localDate=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export default function CostHistoryReports({ownerId,receipts}:{ownerId:string;receipts:RecordedReceipt[]|null}){
 const service=useRef<CostCorrectionService|null>(null),generation=useRef(0),controller=useRef<AbortController|null>(null);
 const invalidate=useCallback(()=>{generation.current++;controller.current?.abort();},[]);
 const [basis,setBasis]=useState<'original'|'owner_corrected'>('original'),[states,setStates]=useState<SaleCostCorrectionState[]|null>(null),[snapshots,setSnapshots]=useState<CostSnapshot[]|null>(null);
 const [journal,setJournal]=useState<CostCorrectionJournal|null>(null),[journalReady,setJournalReady]=useState(false),[enabled,setEnabled]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[closed,setClosed]=useState(false),[error,setError]=useState(''),[costError,setCostError]=useState(''),[message,setMessage]=useState('');
 const [from,setFrom]=useState(()=>{const d=new Date();d.setDate(d.getDate()-29);return localDate(d);}),[to,setTo]=useState(()=>localDate(new Date())),[query,setQuery]=useState(''),[limit,setLimit]=useState(100);
 const [edit,setEdit]=useState<Edit|null>(null),[history,setHistory]=useState<SaleCostCorrectionOutcome[]>([]),[historyTarget,setHistoryTarget]=useState<{receiptId:string;lineIndex:number}|null>(null),[historyBusy,setHistoryBusy]=useState(false),[historyMore,setHistoryMore]=useState(false);
 const rowsKey=JSON.stringify(receipts);
 const allSales=useMemo(()=>((JSON.parse(rowsKey)??[]) as RecordedReceipt[]).filter(r=>!isPurchaseReceipt(r)),[rowsKey]);
 const refresh=useCallback(async()=>{
  const api=service.current;if(!api)return;const current=++generation.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;setLoading(true);setError('');setCostError('');setStates(null);setSnapshots(null);setEnabled(false);setJournalReady(false);
  try{
   const results=await Promise.allSettled([api.journal(),api.available(),api.read(allSales.map(r=>r.id)),readSaleCostSnapshots(ownerId,allSales,abort.signal)]);api.checkOwner();if(current!==generation.current)return;
   const [saved,available,corrected,original]=results;
   if(saved.status==='fulfilled'){setJournal(saved.value);setJournalReady(true);}else setError('Saved correction could not load. New edits are disabled; preserve this browser data.');
   if(saved.status==='fulfilled'&&available.status==='fulfilled')setEnabled(available.value);
   if(corrected.status==='fulfilled')setStates(corrected.value);else setCostError('Later cost revisions could not load. Refresh before using the corrected basis.');
   if(original.status==='fulfilled')setSnapshots(original.value);else setCostError('Original cost history could not load. Profit is unavailable until it refreshes.');
  }catch{if(current===generation.current)setError('Cost history could not refresh. Your saved request is retained.');}
  finally{if(current===generation.current)setLoading(false);}
 },[allSales,ownerId]);
 useEffect(()=>{
  const api=createCostCorrectionService(supabase,ownerId);service.current=api;
  const detach=api.onInvalidated(()=>{invalidate();setClosed(true);setJournal(null);setStates(null);setSnapshots(null);setEdit(null);setHistory([]);});
  return ()=>{invalidate();detach();api.dispose();service.current=null;};
 },[ownerId,invalidate]);
 useEffect(()=>{void refresh();},[refresh]);
 const selection=useMemo(()=>{
  const start=new Date(from+'T00:00:00'),end=new Date(to+'T00:00:00');end.setDate(end.getDate()+1);
  if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start)return null;
  return allSales.filter(r=>{const at=Date.parse(r.createdAt);return at>=+start&&at<+end&&[r.number,r.customerName,...r.items.map(i=>i.description)].join(' ').toLowerCase().includes(query.trim().toLowerCase());});
 },[allSales,from,to,query]);
 const scopedStates=states?.filter(st=>selection?.some(r=>r.id.toLowerCase()===st.receiptId))??null;
 let report:(ProfitReport&Partial<{attestedLines:number;restoredLines:number}>)|null=null,reportError='';
 if(!loading&&selection&&snapshots){try{if(basis==='owner_corrected'&&!scopedStates)throw Error('Missing revisions');report=basis==='original'?salesProfit(selection,snapshots):salesProfitCorrected(selection,snapshots,scopedStates!,ownerId);}catch{reportError='This cost basis is unavailable until the receipt and private cost history can be verified.';}}
 const pending=journal?.pending,canEdit=enabled&&!loading&&!busy&&!pending&&journalReady&&states!==null;
 const startEdit=(receipt:RecordedReceipt,lineIndex:number)=>{
  const state=states?.find(s=>s.receiptId===receipt.id.toLowerCase());if(!canEdit||!state?.source||!sameCostEvidence(state.receipt,receipt))return;
  const current=state.lines.find(o=>o.request.lineIndex===lineIndex);
  if(current&&(!sameCostEvidence(current.request.receipt,receipt)||current.source!==state.source)){setError('The saved revision refers to different receipt evidence. Review its history.');return;}
  const cost=current?.request.action==='set'?current.request.cost:null;
  setEdit({receipt:structuredClone(receipt),lineIndex,expectedRevision:current?.revision??'0',localRevision:journal?.localRevision??null,amount:cost?eventMoneyText(cost.minor):'',currency:cost?.currency??'USD',reason:'',action:'set'});setMessage('');setError('');
 };
 const handle=async(attempt:CostCorrectionAttempt)=>{
  setJournal(attempt.journal);
  if(attempt.status==='applied'||attempt.status==='cancelled'){setEdit(null);setMessage(attempt.status==='applied'?'Cost revision saved. Original sale evidence is retained.':'Request cancelled. No correction was applied by this request.');await refresh();}
  else if(attempt.status==='unconfirmed')setError(attempt.code==='PT409'?'This line has a newer revision. Your exact request is retained. Cancel it, then review the current cost before editing.':attempt.message??'The outcome remains unconfirmed.');
 };
 const submit=async(e:FormEvent)=>{
  e.preventDefault();const api=service.current;if(!api||!edit||!canEdit)return;
  let request;try{const minor=eventMoneyInput(edit.amount);if(edit.action==='set'&&minor===null)throw Error('amount');request=validateSaleCostCorrectionRequest({version:1,requestId:crypto.randomUUID(),receipt:edit.receipt,lineIndex:edit.lineIndex,expectedRevision:edit.expectedRevision,action:edit.action,cost:edit.action==='restore'?null:{minor,currency:edit.currency},reason:edit.reason});}catch{setError('Enter a nonnegative full-line cost, a three-letter currency, and a reason of 1–500 characters.');return;}
  setBusy(true);setError('');try{await handle(await api.begin(request,edit.localRevision));}catch{try{api.checkOwner();setJournal(await api.journal());setError('The correction could not be safely saved. Check the retained request before trying again.');}catch{/* Owner invalidation closes the private view. */}}finally{setBusy(false);}
 };
 const recover=async(mode:'recover'|'retry'|'cancel')=>{const api=service.current;if(!api)return;setBusy(true);setError('');try{await handle(await api[mode]());}catch{try{api.checkOwner();setError('The retained correction could not be checked. Its request has not been removed.');}catch{/* Closed by account change. */}}finally{setBusy(false);}};
 const loadHistory=async(receiptId:string,lineIndex:number,more=false)=>{
  const api=service.current;if(!api)return;const current=generation.current;setHistoryBusy(true);setError('');
  try{const page=await api.history(receiptId,lineIndex,more?history.at(-1)?.revision??null:null);api.checkOwner();if(current!==generation.current)return;setHistoryTarget({receiptId,lineIndex});setHistory(previous=>more?[...previous,...page]:page);setHistoryMore(page.length===50);}catch{if(current===generation.current)setError('Cost revision history could not load.');}finally{setHistoryBusy(false);}
 };
 const download=()=>{if(!report||!selection||!snapshots)return;const csv=saleCostReportCsv(selection,snapshots,{basis,states:scopedStates??[],ownerId}),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`grookai-private-costs-${basis}-${from}-${to}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 if(closed)return <div className={c.panel}><h2>Cost history closed</h2><p>Your account changed. Reopen Reports to continue.</p></div>;
 return <section className={`${c.root} ${c.panel}`} aria-label="Historical cost corrections">
  <div className={s.toolbar}><div><h2>Cost history</h2><p>Private to you. Corrections apply to a whole recorded line and retain the original sale evidence.</p></div><button disabled={loading||busy||!!edit} onClick={()=>void refresh()}>Refresh cost history</button></div>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  {pending&&<div className={c.panel} aria-label="Pending cost correction"><h3>Saved correction needs an outcome</h3><p>{pending.receipt.number} · Line {pending.lineIndex+1} · {pending.action==='restore'?'Restore original cost':`${pending.cost!.currency} ${eventMoneyText(pending.cost!.minor)} for the whole line`}</p><p>{pending.reason}</p><div className={c.actions}><button disabled={busy} onClick={()=>void recover('recover')}>Check saved correction</button><button disabled={busy||!enabled} onClick={()=>void recover('retry')}>Retry exact correction</button><button disabled={busy} onClick={()=>void recover('cancel')}>Cancel pending request</button></div><p>If it already saved, cancellation will recover that saved revision.</p></div>}
  <div className={`${s.reportFilters} ${s.costFilters}`}><label>From<input type="date" value={from} onChange={e=>{setFrom(e.target.value);setLimit(100);}}/></label><label>Through<input type="date" value={to} onChange={e=>{setTo(e.target.value);setLimit(100);}}/></label><label>Receipt, customer or item<input value={query} onChange={e=>{setQuery(e.target.value);setLimit(100);}}/></label><label>Cost basis<select aria-label="Cost basis" value={basis} onChange={e=>setBasis(e.target.value as typeof basis)}><option value="original">Original cost at sale</option><option value="owner_corrected">Later owner corrections</option></select></label></div>
  <p>Dates use this device’s time zone. {basis==='original'?'Uses only original cost-at-sale evidence.':'Uses the latest applicable owner revision, with original evidence for unchanged or restored lines.'}</p>
  {loading?<p role="status">Loading private cost history…</p>:!selection?<p role="alert">Choose a valid date range.</p>:reportError?<p role="alert">{reportError}</p>:report?<><div className={s.metrics}><div><small>Profit on covered sales</small><strong>{report.knownProfitMinor===null?'Unavailable':profitMoney(report.knownProfitMinor)}</strong></div><div><small>Covered cost</small><strong>{profitMoney(report.knownCostMinor)}</strong></div><div><small>Sales without qualified cost</small><strong>{profitMoney(report.unknownSalesMinor)}</strong></div></div><p>{report.knownLines} of {report.totalLines} lines · {report.knownUnits} of {report.totalUnits} units covered.</p>{'attestedLines' in report&&<p>{String(report.attestedLines)} lines use later cost attestations; {String(report.restoredLines)} use restored original evidence.</p>}{report.reasons.map(r=><p key={r.reason}>{costGapLabel(r.reason)}: {r.lines} lines · {profitMoney(r.salesMinor)}</p>)}<button onClick={download}>Export private profit CSV</button></>:<p role="alert">Original cost history is unavailable. Refresh to try again.</p>}
  {costError&&<p role="alert">{costError}</p>}
  {!loading&&!enabled&&<p>New corrections are currently unavailable. Existing history and saved-request recovery remain accessible.</p>}
  <p>Unknown cost is never zero. Foreign-currency costs are excluded from USD profit. A correction cannot supply a missing historical discount allocation. Profit excludes tax, payment movements and event expenses.</p>
  {edit&&<form className={`${c.panel} ${c.form}`} onSubmit={e=>void submit(e)} aria-label="Correct historical cost"><h3>{edit.receipt.number} · Line {edit.lineIndex+1}</h3><p>{edit.receipt.items[edit.lineIndex].quantity} × {edit.receipt.items[edit.lineIndex].description}</p><p>Revision being reviewed: {edit.expectedRevision}. The amount covers all units on this line.</p><fieldset disabled={busy||!!pending||!enabled}><label>Change<select aria-label="Change" value={edit.action} onChange={e=>setEdit({...edit,action:e.target.value as Edit['action']})}><option value="set">Set full-line cost</option><option value="restore">Restore original evidence</option></select></label>{edit.action==='set'&&<div className={c.fields}><label>Total cost for this line<input autoFocus inputMode="decimal" value={edit.amount} onChange={e=>setEdit({...edit,amount:e.target.value})} required/></label><label>Currency<input maxLength={3} value={edit.currency} onChange={e=>setEdit({...edit,currency:e.target.value.toUpperCase()})} required/></label></div>}<label>Reason for this correction<textarea value={edit.reason} onChange={e=>setEdit({...edit,reason:e.target.value})} rows={3} required/></label><button type="submit" disabled={!canEdit}>Save cost revision</button></fieldset><button type="button" disabled={busy||!!pending} onClick={()=>setEdit(null)}>Close editor</button></form>}
  <h3>Recorded sale lines</h3>
  {!selection?.length&&!loading&&<p>No sales match these filters.</p>}
  {selection?.slice(0,limit).map(r=>{const state=states?.find(s=>s.receiptId===r.id.toLowerCase()),aligned=!!state?.source&&sameCostEvidence(state.receipt,r);return <details key={r.id} className={s.details}><summary>{r.number} · {new Date(r.createdAt).toLocaleString()} · {r.items.length} lines</summary>{r.items.map((item,index)=>{const revision=state?.lines.find(o=>o.request.lineIndex===index);return <div key={index} className={c.panel}><strong>{item.quantity} × {item.description}</strong><p>{revision?`Latest revision ${revision.revision} · ${new Date(revision.recordedAt).toLocaleString()} · ${revision.request.action==='restore'?'Original evidence restored':`${revision.request.cost!.currency} ${eventMoneyText(revision.request.cost!.minor)} full-line cost`}`:'No later cost correction.'}</p><div className={c.actions}><button disabled={!canEdit||!aligned||!!edit} onClick={()=>startEdit(r,index)}>Correct cost</button><button disabled={loading||busy||historyBusy} onClick={()=>void loadHistory(r.id,index)}>Revision history</button></div>{!aligned&&<p>This receipt needs an unambiguous saved identity before a correction can apply.</p>}</div>;})}</details>;})}
  {selection&&selection.length>limit&&<button onClick={()=>setLimit(n=>n+100)}>Show more receipts</button>}
  {historyTarget&&<section className={c.panel} aria-label="Cost revision history"><h3>Line {historyTarget.lineIndex+1} · Revision history</h3><p>Receipt {historyTarget.receiptId}</p>{!history.length&&<p>No later cost revisions.</p>}{history.map(o=><article key={o.request.requestId}><strong>Revision {o.revision} · {o.request.action==='restore'?'Original evidence restored':`${o.request.cost!.currency} ${eventMoneyText(o.request.cost!.minor)} full-line cost`}</strong><p>{new Date(o.recordedAt).toLocaleString()} · Recorded by you</p><p>{o.request.reason}</p></article>)}{historyMore&&<button disabled={historyBusy} onClick={()=>void loadHistory(historyTarget.receiptId,historyTarget.lineIndex,true)}>Earlier revisions</button>}<button onClick={()=>{setHistoryTarget(null);setHistory([]);}} disabled={historyBusy}>Close revision history</button></section>}
 </section>;
}
