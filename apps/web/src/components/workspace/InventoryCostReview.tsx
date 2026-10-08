"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabaseClient';
import {readCostReview,costReviewLabel,type CostReviewRow} from '@/lib/vault/copyCostReview.mjs';
import s from './InventoryCostReview.module.css';

export type InventoryCostCopy={instanceId:string;gvviId:string;name:string;set_code?:string;number?:string;condition?:string;printing?:string};
type Filter='attention'|'missingAmount'|'missingCurrency'|'known'|'unavailable'|'all';
const filters:Record<Filter,string>={attention:'Needs attention',missingAmount:'Cost unknown',missingCurrency:'Currency needed',known:'Recorded',unavailable:'Unavailable',all:'All included'};
const needsAttention=(row:CostReviewRow)=>['missingAmount','missingCurrency','needsReview'].includes(row.state);

export default function InventoryCostReview({ownerId,copies,editHref}:{ownerId:string;copies:InventoryCostCopy[];editHref:(copy:InventoryCostCopy)=>string}) {
  const ids=useMemo(()=>copies.map(copy=>copy.instanceId),[copies]);
  const scopeKey=JSON.stringify(ids);
  const [result,setResult]=useState<{key:string;rows:readonly CostReviewRow[]}|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[closed,setClosed]=useState(false);
  const [filter,setFilter]=useState<Filter>('attention'),[query,setQuery]=useState('');
  const generation=useRef(0),accountClosed=useRef(false),active=useRef<AbortController|null>(null);
  const load=useCallback(async()=>{
    if(accountClosed.current)return;
    active.current?.abort();const controller=new AbortController();active.current=controller;
    const request=++generation.current;
    setResult(null);setLoading(true);setError('');
    try {
      const rows=await readCostReview(ownerId,ids,{signal:controller.signal,isCurrent:()=>!accountClosed.current && generation.current===request});
      if(!accountClosed.current && generation.current===request)setResult({key:scopeKey,rows});
    }catch {
      if(!accountClosed.current && generation.current===request && !controller.signal.aborted)setError('Costs could not load. Your copies are unchanged. Try again.');
    }finally{if(!accountClosed.current && generation.current===request)setLoading(false);}
  },[ownerId,ids,scopeKey]);
  useEffect(()=>{
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(session?.user.id!==ownerId){accountClosed.current=true;generation.current++;active.current?.abort();setClosed(true);setResult(null);setQuery('');}
    });
    return()=>subscription.unsubscribe();
  },[ownerId]);
  useEffect(()=>{
    // A discarded mount should not dispatch a private read before cleanup.
    let mounted=true;
    queueMicrotask(()=>{if(mounted)void load();});
    return()=>{
      mounted=false;
      // This is a request epoch, deliberately invalidated at cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      active.current?.abort();
    };
  },[load]);
  if(closed)return <section className={s.review} aria-label="Private cost review"><p>Your account changed. Reopen Inventory to review private costs.</p></section>;
  const rows=result?.key===scopeKey?result.rows:null;
  const byId=new Map(copies.map(copy=>[copy.instanceId.toLowerCase(),copy]));
  const search=query.trim().toLowerCase();
  const shown=rows?.filter(row=>{
    const copy=byId.get(row.instanceId);
    return copy && (filter==='all' || (filter==='attention'?needsAttention(row):row.state===filter)) &&
      (!search || [copy.name,copy.gvviId,copy.set_code,copy.number,copy.printing].some(value=>value?.toLowerCase().includes(search)));
  });
  return <section className={s.review} aria-label="Private cost review">
    <header><div><h2>Review private costs</h2><p>Only the card copies currently shown in Inventory are included. Load more inventory to expand this review. Sealed products are separate.</p></div>
      <button type="button" disabled={loading} onClick={()=>void load()}>Refresh costs</button></header>
    {loading && <p role="status">Loading private costs…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={()=>void load()}>Try again</button></p>}
    {rows && <>
      <p className={s.coverage} aria-live="polite">{rows.filter(row=>row.state==='known').length} of {rows.length} included {rows.length===1?'copy has':'copies have'} a recorded cost and currency.</p>
      <p>Needs cost review: {rows.filter(needsAttention).length} · Unavailable: {rows.filter(row=>row.state==='unavailable').length}</p>
      <p className={s.note}>Zero is a known cost. Currencies stay as recorded. Editing a copy does not change earlier sale profit.</p>
      <div className={s.controls}><label>Find an included copy<input value={query} onChange={event=>setQuery(event.target.value)} maxLength={120} /></label>
        <label>Cost state<select value={filter} onChange={event=>setFilter(event.target.value as Filter)}>{Object.entries(filters).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
      {!shown?.length && <p>{rows.length?'No included copies match this filter.':'No copies were included. Change your Inventory search or filters.'}</p>}
      <ul>{shown?.map(row=>{const copy=byId.get(row.instanceId)!;return <li key={row.instanceId}>
        <div><h3>{copy.name}</h3><p>{[copy.set_code,copy.number,copy.printing,copy.condition].filter(Boolean).join(' · ')}</p><small>{copy.gvviId}</small></div>
        <div><strong>{costReviewLabel(row)}</strong>{row.state==='missingCurrency' && <p>Recorded amount: {row.cost?.amount}</p>}</div>
        {row.state!=='unavailable' && <Link href={editHref(copy)} prefetch={false}>Review cost<span className={s.srOnly}> {copy.gvviId}</span></Link>}
      </li>;})}</ul>
    </>}
  </section>;
}
