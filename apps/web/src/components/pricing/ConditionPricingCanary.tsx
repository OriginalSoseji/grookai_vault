'use client';

import {useEffect,useState} from 'react';
import type {ConditionCanaryPrinting,ConditionCanaryPrice,ConditionCode} from '@/lib/pricing/conditionCanaryServer';

const conditions:{value:ConditionCode;label:string}[]=[{value:'NM',label:'Near Mint'},{value:'LP',label:'Lightly Played'},{value:'MP',label:'Moderately Played'},{value:'HP',label:'Heavily Played'},{value:'DMG',label:'Damaged'}];
const amountFormatter=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:8});
type LoadState={key:string;status:'loading'|'loaded'|'error';pricing?:ConditionCanaryPrice};

export default function ConditionPricingCanary({printings}:{printings:ConditionCanaryPrinting[]}){
  const [printingId,setPrintingId]=useState(printings[0]?.id??'');
  const [condition,setCondition]=useState<ConditionCode>('NM');
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState<LoadState|null>(null);
  const key=`${printingId}|${condition}`;
  const printing=printings.find(row=>row.id===printingId);
  useEffect(()=>{
    if(!printingId)return;
    const controller=new AbortController();let active=true;
    const requestKey=`${printingId}|${condition}`;
    setState({key:requestKey,status:'loading'});
    const query=new URLSearchParams({card_printing_id:printingId,condition});
    fetch(`/api/founder/condition-pricing/v1?${query}`,{signal:controller.signal,cache:'no-store',credentials:'same-origin'})
      .then(async response=>{
        if(!response.ok)throw new Error('Condition preview failed');
        const body=await response.json();const price=body.pricing as ConditionCanaryPrice|undefined;
        if(!body.ok||!price||price.version!=='CONDITION_PRICING_PRIVATE_CANARY_V1'||price.card_printing_id!==printingId||price.condition!==condition||price.pricing_lane!=='reference'||price.private_preview!==true||!['available','unavailable'].includes(price.status)||(price.status==='available'&&!(typeof price.amount==='number'&&Number.isFinite(price.amount)&&price.amount>0)))throw new Error('Condition preview identity mismatch');
        if(active)setState({key:requestKey,status:'loaded',pricing:price});
      }).catch(()=>{if(active&&!controller.signal.aborted)setState({key:requestKey,status:'error'});});
    return()=>{active=false;controller.abort();};
  },[printingId,condition,attempt]);

  if(!printings.length)return <p className="text-sm text-[var(--gv-text-secondary)]">No governed condition-price printings are available for this set.</p>;
  const current=state?.key===key?state:null;
  const pricing=current?.status==='loaded'?current.pricing:undefined;
  return <section className="space-y-5" aria-label="Private condition pricing preview">
    <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <label className="min-w-0 space-y-2 text-sm font-medium"><span className="block">Exact printing</span>
        <select className="min-h-11 w-full rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] px-3 py-2 text-[var(--gv-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gv-primary)]" value={printingId} onChange={event=>setPrintingId(event.target.value)}>
          {printings.map(row=><option key={row.id} value={row.id}>{row.number} · {row.name} · {row.finishKey.replace(/_/g,' ')}</option>)}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium"><span className="block">Condition</span>
        <select className="min-h-11 w-full rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] px-3 py-2 text-[var(--gv-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gv-primary)]" value={condition} onChange={event=>setCondition(event.target.value as ConditionCode)}>
          {conditions.map(row=><option key={row.value} value={row.value}>{row.label}</option>)}
        </select>
      </label>
    </div>
    <div aria-live="polite" aria-atomic="true" className="space-y-2 border-t border-[var(--gv-border-soft)] pt-5" data-condition-preview-state={current?.status??'loading'} data-selected-printing={printingId} data-selected-condition={condition}>
      <p className="text-sm text-[var(--gv-text-secondary)]">{printing?.number} · {printing?.finishKey.replace(/_/g,' ')} · {conditions.find(row=>row.value===condition)?.label}</p>
      {(!current||current.status==='loading')&&<p className="text-2xl font-semibold">Loading condition price…</p>}
      {current?.status==='error'&&<div className="space-y-3"><p className="text-base font-semibold">Condition preview could not load.</p><button type="button" className="gv-secondary-button" onClick={()=>setAttempt(value=>value+1)}>Retry</button></div>}
      {pricing?.status==='available'&&<><p className="text-3xl font-semibold tabular-nums" data-condition-amount={pricing.amount}>{amountFormatter.format(pricing.amount as number)}</p><p className="text-sm text-[var(--gv-text-secondary)]">Provider-reported amount; currency verification pending.</p></>}
      {pricing?.status==='unavailable'&&<p className="text-xl font-semibold">{conditions.find(row=>row.value===condition)?.label} price unavailable</p>}
      <p className="text-sm text-[var(--gv-text-secondary)]">TCGPlayer condition reference via TCGTracking</p>
      <p className="text-xs leading-5 text-[var(--gv-text-secondary)]">Private preview. These amounts do not change your market headline, Vault totals or asking prices.</p>
    </div>
  </section>;
}
