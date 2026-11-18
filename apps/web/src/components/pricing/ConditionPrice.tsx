'use client';

import {useEffect,useState} from 'react';
import type {ConditionPriceV1} from '@/lib/pricing/conditionPriceServer';

type State={key:string;status:'loading'|'loaded'|'error';price?:ConditionPriceV1};
const codes=['NM','LP','MP','HP','DMG'];
const number=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:8});

export default function ConditionPrice({cardPrintingId,condition}:{cardPrintingId:string|null;condition:string|null}){
  const [state,setState]=useState<State|null>(null),[attempt,setAttempt]=useState(0);
  const supported=codes.includes(condition??'');
  const key=`${cardPrintingId}|${condition}`;
  useEffect(()=>{
    if(!cardPrintingId||!supported||!condition)return;
    const controller=new AbortController();let active=true;
    const requestKey=`${cardPrintingId}|${condition}`;
    setState({key:requestKey,status:'loading'});
    const query=new URLSearchParams({card_printing_id:cardPrintingId,condition});
    fetch(`/api/condition-pricing/v1?${query}`,{signal:controller.signal,cache:'no-store',credentials:'same-origin'})
      .then(async response=>{
        if(!response.ok)throw new Error('Condition price request failed');
        const body=await response.json(),price=body.pricing as ConditionPriceV1|undefined;
        if(!body.ok||!price||price.version!=='CONDITION_PRICE_READ_MODEL_V1'||price.card_printing_id!==cardPrintingId||price.condition!==condition||price.pricing_lane!=='reference'||!['available','unavailable'].includes(price.status)||(price.status==='available'&&!(typeof price.amount==='number'&&Number.isFinite(price.amount)&&price.amount>0)))throw new Error('Condition price response mismatch');
        if(active)setState({key:requestKey,status:'loaded',price});
      }).catch(()=>{if(active&&!controller.signal.aborted)setState({key:requestKey,status:'error'});});
    return()=>{active=false;controller.abort();};
  },[cardPrintingId,condition,supported,attempt]);
  const current=state?.key===key?state:null;
  return <div className="space-y-1 rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] p-3" aria-live="polite" aria-atomic="true" data-condition-price-state={!supported||!cardPrintingId?'unselected':current?.status??'loading'} data-condition-price-selection={key}>
    <p className="text-xs text-[var(--gv-text-secondary)]">{supported?`${condition} condition reference`:'Condition reference'}</p>
    {!cardPrintingId?<p className="text-sm">Choose an exact printing to see its condition price.</p>:!supported?<p className="text-sm">Choose a condition to see its price.</p>:current?.status==='error'?<div className="flex flex-wrap items-center gap-3"><p className="text-sm">Condition price could not load.</p><button type="button" className="gv-secondary-button" onClick={()=>setAttempt(value=>value+1)}>Retry condition price</button></div>:current?.status!=='loaded'?<p className="text-sm">Loading condition price…</p>:current.price?.status==='available'?<><p className="text-xl font-semibold tabular-nums" data-condition-price-amount={current.price.amount}>{number.format(current.price.amount as number)}</p><p className="text-xs text-[var(--gv-text-secondary)]">Reported amount · USD assumed</p></>:<p className="text-sm">{condition} price unavailable</p>}
    {supported&&cardPrintingId&&<p className="text-xs text-[var(--gv-text-secondary)]">TCGplayer via TCGTracking{current?.price?.provider_updated_at?` · Updated ${new Date(current.price.provider_updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`:''}</p>}
  </div>;
}
