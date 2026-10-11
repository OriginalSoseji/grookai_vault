"use client";

import {useEffect, useRef, useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {useStoreDraftGuard} from '@/components/stores/useStoreDraftGuard';
import {confirmedCostResult, costStatusLabel, isCostEvidence, parseCopyCost, validateCostRequest, type CostEvidence, type CostRequest} from '@/lib/vault/copyCost.mjs';
import {readCostDraft, writeCostDraft, settleCostRequest, type CostDraft} from '@/lib/vault/copyCostJournal';

type Copy = {instanceId:string; archived:boolean; cost:CostEvidence};
const messageOf = (error:unknown) => error instanceof Error ? error.message : 'Cost information is unavailable. Try again.';
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 disabled:bg-slate-100';
const buttonClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50';

/** Owner-only editor. A persisted request always precedes a network mutation. */
export default function VaultCopyCostCard({ownerId,instanceId,enabled}:{ownerId:string;instanceId:string;enabled:boolean}) {
  const [copy,setCopy]=useState<Copy|null>(null);
  const [editable,setEditable]=useState(false);
  const [ready,setReady]=useState(false);
  const [closed,setClosed]=useState(false);
  const [amount,setAmount]=useState('');
  const [currency,setCurrency]=useState('');
  const [pending,setPending]=useState<CostRequest|null>(null);
  const [busy,setBusy]=useState(false);
  const [localWrites,setLocalWrites]=useState(0);
  const [storageError,setStorageError]=useState(false);
  const [notice,setNotice]=useState('');
  const [conflict,setConflict]=useState(false);
  const draft=useRef<CostDraft|null>(null);
  const queue=useRef<Promise<unknown>>(Promise.resolve());
  const live=useRef(false);
  const accountClosed=useRef(false);
  const inFlight=useRef(false);
  const failed=useRef(false);
  const epoch=useRef(0);
  useStoreDraftGuard(localWrites>0 || storageError,'Leave without saving this cost draft on this device?',localWrites>0);

  function showDraft(value:CostDraft|null) {
    draft.current=value;
    if(live.current && !accountClosed.current) {
      setAmount(value?.amount??'');setCurrency(value?.currency??'');setPending(value?.pending??null);
    }
  }
  async function readCopy() {
    const response=await fetch(`/api/vault/cost?owner=${ownerId}&instanceId=${instanceId}`,{cache:'no-store',credentials:'same-origin'});
    const body=await response.json();
    if(!response.ok)throw Error(body.error??'Cost could not load.');
    if(body.ownerId!==ownerId || body.copy?.instanceId!==instanceId || typeof body.copy.archived!=='boolean' || !isCostEvidence(body.copy.cost))throw Error('Cost response needs review.');
    return {copy:body.copy as Copy,editable:body.editEnabled===true};
  }
  async function recover(request:CostRequest) {
    const response=await fetch(`/api/vault/cost?owner=${ownerId}&requestId=${request.requestId}`,{cache:'no-store',credentials:'same-origin'});
    const body=await response.json();
    if(!response.ok || body.ownerId!==ownerId)throw Error('The save result is not confirmed. Check again before making another change.');
    if(body.result===null)return false;
    if(!confirmedCostResult(body.result,request))throw Error('The saved result needs review. Your original request is retained.');
    const value=await settleCostRequest(ownerId,instanceId,request.requestId,body.result.cost);
    if(live.current && !accountClosed.current) {
      showDraft(value);setCopy(previous=>previous?{...previous,cost:body.result.cost}:previous);
      setNotice('Cost saved.');setConflict(false);
    }
    return true;
  }
  useEffect(()=>{
    live.current=true;const current=++epoch.current;
    const active=()=>live.current && !accountClosed.current && epoch.current===current;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(session?.user.id!==ownerId) {
        accountClosed.current=true;setClosed(true);setCopy(null);setAmount('');setCurrency('');setPending(null);setNotice('');
      }
    });
    void (async()=>{
      try {
        const saved=await readCostDraft(ownerId,instanceId);
        if(!active())return;
        showDraft(saved);
        if(saved?.pending) {
          setBusy(true);
          try {if(!await recover(saved.pending) && active())setNotice('Your previous save is not confirmed. Check or retry that same request.');}
          catch(error){if(active())setNotice(messageOf(error));}
          finally{if(active())setBusy(false);}
        }
        if(enabled) {
          const latest=await readCopy();if(!active())return;
          setCopy(latest.copy);setEditable(latest.editable);
          if(!saved) {
            const cost=latest.copy.cost;
            showDraft({key:`${ownerId}:${instanceId}`,ownerId,instanceId,revision:'',amount:cost.amount??'',currency:cost.currency??'',expectedAmount:cost.amount,expectedCurrency:cost.currency,pending:null});
          } else if(!draft.current?.pending) {
            setConflict(draft.current?.expectedAmount!==latest.copy.cost.amount || draft.current?.expectedCurrency!==latest.copy.cost.currency);
          }
        }
        if(active())setReady(true);
      }catch(error){if(active()){setNotice(messageOf(error));setReady(false);}}
    })();
    return()=>{live.current=false;subscription.unsubscribe();};
    // Identity is also the React key: every copy mounts its own journal controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ownerId,instanceId,enabled]);

  function change(nextAmount:string,nextCurrency:string) {
    if(!live.current || accountClosed.current || inFlight.current || draft.current?.pending)return;
    setAmount(nextAmount);setCurrency(nextCurrency);setLocalWrites(count=>count+1);
    const task=queue.current.catch(()=>undefined).then(async()=>{
      if(failed.current)throw Error('Reload this cost editor to review the saved draft.');
      const current=draft.current;if(!current)throw Error('Load the cost first.');
      const saved=await writeCostDraft(ownerId,instanceId,current.revision||null,{amount:nextAmount,currency:nextCurrency,expectedAmount:current.expectedAmount,expectedCurrency:current.expectedCurrency,pending:null});
      draft.current=saved;
    }).catch(error=>{
      failed.current=true;
      if(live.current && !accountClosed.current){setStorageError(true);setNotice(messageOf(error));}
    }).finally(()=>{if(live.current)setLocalWrites(count=>count-1);});
    queue.current=task;
  }

  async function perform(action:'save'|'check'|'retry'|'rebase') {
    if(inFlight.current || accountClosed.current)return;
    inFlight.current=true;setBusy(true);setNotice('');
    try {
      await queue.current;
      if(failed.current)throw Error('Your draft could not be saved on this device. Reload and review it before continuing.');
      if(accountClosed.current || !live.current)return;
      let current=draft.current;
      if(action==='rebase') {
        const latest=await readCopy();if(accountClosed.current || !live.current)return;
        if(!current || current.pending)throw Error('Resolve the pending request first.');
        current=await writeCostDraft(ownerId,instanceId,current.revision||null,{...current,expectedAmount:latest.copy.cost.amount,expectedCurrency:latest.copy.cost.currency,pending:null});
        showDraft(current);setCopy(latest.copy);setEditable(latest.editable);setConflict(false);
        setNotice('Latest saved cost loaded. Your proposed amount is unchanged; review it before saving.');return;
      }
      if(action==='check') {
        if(current?.pending && !await recover(current.pending))setNotice('No confirmed result yet. Retry uses the original request.');
        return;
      }
      if(action==='save') {
        if(!current || current.pending || conflict || !editable || copy?.archived || !enabled)throw Error('Review this copy before saving.');
        const parsed=parseCopyCost(amount,currency);
        const request=validateCostRequest({ownerId,instanceId,requestId:crypto.randomUUID(),expectedAmount:current.expectedAmount,expectedCurrency:current.expectedCurrency,amount:parsed.amount,currency:parsed.currency});
        current=await writeCostDraft(ownerId,instanceId,current.revision||null,{...current,amount,currency,pending:request});
        showDraft(current);
      }
      const request=current?.pending;if(!request)throw Error('No pending cost request.');
      if(accountClosed.current || !live.current)return;
      const response=await fetch('/api/vault/cost',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});
      const body=await response.json();
      if(response.ok && body.ownerId===ownerId && confirmedCostResult(body.result,request)) {
        const saved=await settleCostRequest(ownerId,instanceId,request.requestId,body.result.cost);
        if(live.current && !accountClosed.current){showDraft(saved);setCopy(previous=>previous?{...previous,cost:body.result.cost}:previous);setNotice('Cost saved.');setConflict(false);}
      } else if(!response.ok && body.definitive===true) {
        const saved=await settleCostRequest(ownerId,instanceId,request.requestId);
        if(live.current && !accountClosed.current){showDraft(saved);setConflict(body.conflict===true);setNotice(body.error??'Review your cost before saving.');}
      } else throw Error('The save result is not confirmed. Check or retry the original request.');
    } catch(error){if(live.current && !accountClosed.current)setNotice(messageOf(error));}
    finally{inFlight.current=false;if(live.current && !accountClosed.current)setBusy(false);}
  }

  if(closed)return <section aria-label="Private cost" className="rounded-2xl border border-slate-200 bg-white p-5"><p>Cost editor closed because your account changed. Reopen this copy to continue.</p></section>;
  if(!enabled && !pending)return null;
  const locked=!ready || busy || Boolean(pending) || storageError || !editable || Boolean(copy?.archived) || !enabled;
  return <section aria-label="Private cost" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <div><h2 className="text-lg font-semibold text-slate-950">Your cost</h2><p className="text-sm text-slate-600">Private to you. This does not change your asking price or costs recorded for previous sales.</p></div>
    {copy && <p className="font-medium text-slate-950">{costStatusLabel(copy.cost)}</p>}
    {!ready && !notice && <p role="status">Loading your cost…</p>}
    {copy?.archived && <p className="text-sm text-slate-600">This copy is archived. Its cost cannot be edited here.</p>}
    {ready && enabled && !editable && !copy?.archived && <p className="text-sm text-slate-600">Cost editing is temporarily unavailable.</p>}
    <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
      <label className="space-y-1 text-sm font-medium">Cost amount<input className={fieldClass} value={amount} onChange={event=>change(event.target.value,currency)} disabled={locked} inputMode="decimal" maxLength={4096} autoComplete="off" /></label>
      <label className="space-y-1 text-sm font-medium">Currency<input className={fieldClass} value={currency} onChange={event=>change(amount,event.target.value)} disabled={locked} maxLength={1000} placeholder="e.g. USD" autoComplete="off" autoCapitalize="characters" /></label>
    </div>
    <p className="text-xs text-slate-600">Enter the purchase currency explicitly. A cost of 0 is known; an unknown cost is left blank.</p>
    {conflict && <p role="alert" className="text-sm text-amber-800">The saved cost changed. Load its latest value before applying your proposed amount.</p>}
    <div className="flex flex-wrap gap-2">
      {pending ? <><button className={buttonClass} disabled={busy} onClick={()=>void perform('check')}>Check saved cost</button><button className={buttonClass} disabled={busy || !enabled} onClick={()=>void perform('retry')}>Retry same save</button></> : <><button className={`${buttonClass} bg-slate-950 text-white`} disabled={locked || conflict || localWrites>0} onClick={()=>void perform('save')}>Save cost</button><button className={buttonClass} disabled={locked} onClick={()=>change('','')}>Mark cost unknown</button>{conflict && <button className={buttonClass} disabled={busy || storageError} onClick={()=>void perform('rebase')}>Review latest cost</button>}</>}
    </div>
    {pending && <p className="text-sm text-amber-800">A save is awaiting confirmation. It is retained on this device, including after you leave this page.</p>}
    {notice && <p role="status" className="text-sm text-slate-700">{notice}</p>}
    {(!ready || storageError) && notice && <button className={buttonClass} onClick={()=>window.location.reload()}>Reload cost editor</button>}
  </section>;
}
