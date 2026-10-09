"use client";

import Link from 'next/link';
import {PortfolioTimeline} from './PortfolioTimeline';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {createPortfolioHistoryService} from '@/lib/vault/portfolioHistoryBrowser';
import type {PortfolioHistoryService,PortfolioResolution} from '@/lib/vault/portfolioHistoryService.mjs';
import type {PortfolioCapabilities,PortfolioSummary,PortfolioComparison} from '@/lib/vault/portfolioHistory.mjs';
import type {PortfolioJournal} from '@/lib/vault/portfolioHistoryJournal.mjs';

const button='gv-secondary-button min-h-11 px-4 py-2 text-sm disabled:opacity-50';
const date=(stamp:string)=>new Date(stamp).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
const total=(point:PortfolioSummary)=>Object.entries(point.totals).map(([currency,v])=>`${currency} ${v.display}`).join(' · ')||(point.state==='empty'?'Empty collection':'No priced copies');
const errors:Record<string,string>={
 day_expired:'That recording day ended. You can record today’s collection.',
 capacity_reached:'History has reached its recording limit.',too_many_copies:'Recording supports up to 20,000 owned copies. Your current Vault is still available.',
 observation_too_large:'This collection is too large to record in one complete observation.',
 pricing_unavailable:'The price source is unavailable. No observation was saved.',invalid_reference:'A price reference could not be verified. No observation was saved.',
 clock_changed:'The recording time could not be verified. No observation was saved.',capture_failed:'The recording failed. No observation was saved.',
};
const labels={marketMovement:'Price movement on comparable copies',addedCopies:'Copies added',removedCopies:'Copies removed',newPriceCoverage:'New price coverage',lostPriceCoverage:'Lost price coverage',basisChanges:'Identity or valuation basis changes'};

export function PortfolioHistory({ownerId,compact=false}:{ownerId:string;compact?:boolean}){
 const serviceRef=useRef<PortfolioHistoryService|null>(null),serial=useRef(0);
 const [points,setPoints]=useState<PortfolioSummary[]>([]),[journal,setJournal]=useState<PortfolioJournal|null>(null);
 const [caps,setCaps]=useState<PortfolioCapabilities|null>(null),[cursor,setCursor]=useState<string|null>(null),[watermark,setWatermark]=useState<string|null>(null);
 const [busy,setBusy]=useState(true),[error,setError]=useState<string|null>(null),[invalid,setInvalid]=useState(false);
 const [comparison,setComparison]=useState<PortfolioComparison|null>(null),[before,setBefore]=useState(''),[after,setAfter]=useState('');
 const [notice,setNotice]=useState<string|null>(null);
 const displayResolution=(value:PortfolioResolution)=>{
  setJournal(value.journal);
  setNotice(value.status==='unconfirmed'?'The recording outcome is not confirmed. Your exact request is saved on this device.':
   value.status==='captured'?`Collection recorded for ${value.acknowledgement!.request.day} UTC.`:value.status==='reused'?'That day’s original observation is already recorded.':
   value.status==='cancelled'?'The recording request was cancelled.':value.status==='failed'?errors[value.acknowledgement?.errorCode??'capture_failed']:null);
 };
 useEffect(()=>{
  const service=createPortfolioHistoryService(supabase,ownerId);serviceRef.current=service;const generation=serial;let live=true;
  setBusy(true);setInvalid(false);setPoints([]);setJournal(null);setCaps(null);setComparison(null);setNotice(null);setError(null);setCursor(null);setWatermark(null);setBefore('');setAfter('');
  const unsubscribe=service.onInvalidated(()=>{if(live){serial.current++;setInvalid(true);setPoints([]);setComparison(null);setJournal(null);setCaps(null);setNotice(null);setError(null);setBusy(false);}});
  void (async()=>{
   try{
    // Durable recovery is independent of recording availability and history reads.
    let retained=await service.journal();if(!live)return;setJournal(retained);
    if(retained?.pending){const outcome=await service.recover();if(!live)return;displayResolution(outcome);retained=outcome.journal;}
    const capability=await service.capabilities();if(!live)return;setCaps(capability);
    if(retained?.lastOutcome?.status==='failed'&&retained.lastOutcome.request.day===capability.day)setNotice(errors[retained.lastOutcome.errorCode??'capture_failed']);
    const page=await service.list();if(!live)return;setPoints(page.points);setCursor(page.nextBefore);setWatermark(page.watermark);
    const recorded=page.points.some(point=>point.capturedAt.slice(0,10)===capability.day);
    if(capability.enabled&&!recorded&&!retained?.pending&&retained?.lastOutcome?.request.day!==capability.day){
     const outcome=await service.begin(capability.day,retained?.localRevision??null);if(!live)return;displayResolution(outcome);
     const refreshed=await service.list();if(!live)return;setPoints(refreshed.points);setCursor(refreshed.nextBefore);setWatermark(refreshed.watermark);
    }
   }catch(failure){if(live)setError(failure instanceof Error?failure.message:'Collection history could not load.');}
   finally{if(live)setBusy(false);}
  })();
  return ()=>{live=false;generation.current++;unsubscribe();service.dispose();if(serviceRef.current===service)serviceRef.current=null;};
 },[ownerId]);
 const run=async(action:(service:PortfolioHistoryService,check:()=>void)=>Promise<void>)=>{
  const service=serviceRef.current;if(!service||busy||invalid)return;
  const operation=++serial.current;const check=()=>{service.checkOwner();if(serviceRef.current!==service||serial.current!==operation)throw Error('History view changed.');};
  setBusy(true);setError(null);
  try{await action(service,check);}catch(failure){if(serviceRef.current===service&&serial.current===operation)setError(failure instanceof Error?failure.message:'Collection history could not load.');}
  finally{if(serviceRef.current===service&&serial.current===operation)setBusy(false);}
 };
 const refresh=()=>run(async(service,check)=>{
  const retained=await service.journal();check();setJournal(retained);
  const capability=await service.capabilities();check();setCaps(capability);
  const page=await service.list();check();setPoints(page.points);setCursor(page.nextBefore);setWatermark(page.watermark);setComparison(null);setBefore('');setAfter('');
 });
 const record=(mode:'new'|'recover'|'retry'|'cancel')=>run(async(service,check)=>{
  let outcome:PortfolioResolution;
  if(mode==='new'){
   const capability=await service.capabilities();check();setCaps(capability);if(!capability.enabled)throw Error('New recordings are unavailable.');
   const retained=await service.journal();check();setJournal(retained);outcome=await service.begin(capability.day,retained?.localRevision??null);
  }else outcome=await service[mode]();
  check();displayResolution(outcome);
  const page=await service.list();check();setPoints(page.points);setCursor(page.nextBefore);setWatermark(page.watermark);setComparison(null);
 });
 const download=(pointId:string)=>run(async(service,check)=>{
  const data=await service.export(pointId);check();
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`grookai-collection-${data.point.capturedAt.slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice('Complete observation downloaded with its original price references.');
 });
 if(invalid)return <section className="my-4 rounded-2xl border p-5" role="status">Your account changed. Reopen Vault to view collection history.</section>;
 return <section aria-label="Collection history" aria-busy={busy} className="my-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Collection history</h2><p className="mt-1 text-sm text-slate-500">Your whole Vault, recorded on the first visit each UTC day.</p></div>
   {compact?<Link href="/vault/history" className={button}>View history</Link>:<button className={button} disabled={busy} onClick={refresh}>Refresh history</button>}
  </div>
  {error&&<p role="alert" className="mt-3 text-sm text-amber-700 dark:text-amber-300">{error} <button disabled={busy} className="underline" onClick={refresh}>Retry loading</button></p>}
  {notice&&<p role="status" className="mt-3 text-sm">{notice}</p>}
  {journal?.pending?<div className="mt-4 rounded-xl border border-amber-300 p-4"><p className="font-medium">Recording needs confirmation</p><p className="mt-1 text-sm">Requested for {journal.pending.day} UTC. Checking or retrying keeps the same request.</p><div className="mt-3 flex flex-wrap gap-2">
   <button className={button} disabled={busy} onClick={()=>record('recover')}>Check outcome</button><button className={button} disabled={busy||!caps?.enabled} onClick={()=>record('retry')}>Retry recording</button><button className={button} disabled={busy} onClick={()=>record('cancel')}>Cancel request</button>
  </div></div>:null}
  {busy&&points.length===0?<p role="status" className="mt-4 text-sm">Checking recorded history…</p>:null}
  {!busy&&!error&&points.length===0?<p className="mt-4">No recorded observations yet. Your first observation starts here; earlier holdings cannot be reconstructed.</p>:null}
  {caps&&!caps.enabled?<p className="mt-3 text-sm text-slate-500">New recordings are currently unavailable. Existing observations and pending requests remain accessible.</p>:null}
  {!journal?.pending&&caps?.enabled&&!points.some(p=>p.capturedAt.slice(0,10)===caps.day)?<button className={`${button} mt-3`} disabled={busy} onClick={()=>record('new')}>Record today’s collection</button>:null}
  {points[0]&&<div className="mt-4"><p className="text-xs text-slate-500">Latest recorded observation · {date(points[0].capturedAt)}</p><p className="mt-1 [overflow-wrap:anywhere] text-xl font-semibold">{total(points[0])}</p><p className="text-sm text-slate-500">{points[0].coverage.priced} of {points[0].coverage.owned} copies priced · {points[0].coverage.unpriced} unpriced</p></div>}
  {!compact&&points.length>0?<>
   <PortfolioTimeline points={points}/>
   <p className="mt-4 text-sm text-slate-500">Recorded reference values are separate from today’s live value. Changes can include ownership, condition and price coverage. They are not profit or cash flow. Currencies stay separate.</p>
   {points.length===1?<p className="mt-3 text-sm">This is your first observation. A comparison becomes available after another day is recorded.</p>:<div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><h3 className="font-medium">What changed?</h3><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
    <label className="min-w-0 w-full flex-1 text-sm">Earlier observation<select aria-label="Earlier observation" className="mt-1 block min-h-11 w-full rounded-lg border bg-transparent p-2" value={before} disabled={busy} onChange={e=>{setBefore(e.target.value);setAfter('' );setComparison(null);}}><option value="">Choose earlier</option>{points.map(p=><option key={p.snapshotId} value={p.snapshotId}>{date(p.capturedAt)}</option>)}</select></label>
    <label className="min-w-0 w-full flex-1 text-sm">Later observation<select aria-label="Later observation" className="mt-1 block min-h-11 w-full rounded-lg border bg-transparent p-2" value={after} disabled={busy} onChange={e=>{setAfter(e.target.value);setComparison(null);}}><option value="">Choose later</option>{points.filter(p=>!before||BigInt(p.sequence)>BigInt(points.find(v=>v.snapshotId===before)?.sequence??'0')).map(p=><option key={p.snapshotId} value={p.snapshotId}>{date(p.capturedAt)}</option>)}</select></label>
    <button className={button} disabled={busy||!before||!after||before===after} onClick={()=>run(async(service,check)=>{const result=await service.compare(before,after);check();setComparison(result);})}>Compare</button>
   </div>{comparison&&<div className="mt-4 space-y-4"><p className="text-sm">{comparison.counts.addedCopies} copies added · {comparison.counts.removedCopies} removed · {comparison.counts.basisChangedCopies} changed basis</p>{Object.entries(comparison.currencies).map(([currency,value])=><div key={currency}><h4 className="[overflow-wrap:anywhere] font-semibold">{currency} {value.display.difference} reference value change</h4><dl className="mt-2 space-y-2 text-sm">{Object.entries(labels).map(([key,label])=><div key={key} className="flex justify-between gap-4"><dt className="min-w-0 flex-1">{label}</dt><dd className="max-w-[45%] shrink-0 [overflow-wrap:anywhere] text-right tabular-nums">{value.display.components[key as keyof typeof labels]}</dd></div>)}{value.display.roundingAdjustment!=='0.00'&&<div className="flex justify-between gap-4"><dt>Display rounding</dt><dd>{value.display.roundingAdjustment}</dd></div>}</dl></div>)}</div>}</div>}
   <ol className="mt-5 divide-y divide-slate-200 dark:divide-slate-800">{points.map(p=><li key={p.snapshotId} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="text-sm text-slate-500">{date(p.capturedAt)}</p><p className="[overflow-wrap:anywhere] font-medium">{total(p)}</p><p className="text-sm">{p.coverage.priced} / {p.coverage.owned} priced · {p.coverage.byKind.raw.owned} raw · {p.coverage.byKind.slab.owned} slabs · {p.coverage.byKind.sealed.owned} sealed</p>{p.coverage.unpriced>0&&<p className="text-sm text-slate-500">{p.coverage.unpriced} unpriced {p.coverage.unpriced === 1 ? "copy is" : "copies are"} included in ownership, not valued as zero.</p>}</div><button className={button} disabled={busy} onClick={()=>download(p.snapshotId)} aria-label={`Download observation from ${date(p.capturedAt)}`}>Download details</button></li>)}</ol>
   {cursor&&<button className={`${button} mt-3`} disabled={busy} onClick={()=>run(async(service,check)=>{const page=await service.list({before:cursor,watermark});check();setPoints(current=>[...current,...page.points]);setCursor(page.nextBefore);})}>Load older observations</button>}
  </>:null}
 </section>;
}
