"use client";
import {useState} from 'react';
import {minor, money} from '@/lib/sales/salesDesk.mjs';
import {paymentSnapshot, tenderMethods, type Tender} from '@/lib/sales/salesPayments.mjs';
import s from './SalesDesk.module.css';

function Amount({label,value,disabled,onChange}:{label:string;value:number;disabled:boolean;onChange:(n:number)=>void}) {
  const [text,setText]=useState(money(value));
  return <label>{label}<input maxLength={10} inputMode="decimal" disabled={disabled} value={text} onChange={e=>{setText(e.target.value);onChange(minor(e.target.value)??0);}}/></label>;
}
export default function SalesPaymentEditor({entries,balance,disabled,onChange}:{entries:Tender[];balance:number;disabled:boolean;onChange:(update:(entries:Tender[])=>Tender[])=>void}) {
  const applied=entries.reduce((n,e)=>n+e.amountMinor,0),remaining=Math.abs(balance)-applied;
  let error='',change=0;
  try {change=paymentSnapshot(entries,balance).changeMinor;} catch(e) {error=e instanceof Error?e.message:'Check payments.';}
  const update=(i:number,patch:Partial<Tender>|((e:Tender)=>Partial<Tender>))=>onChange(current=>current.map((e,n)=>n===i?{...e,...(typeof patch==='function'?patch(e):patch)}:e));
  return <section className={s.paymentEditor} aria-label="Payment breakdown">
    <p>{balance<0?'Record how you paid the customer.':balance===0?'Even trade — no money exchanged.':'Record the amounts collected outside Grookai.'}</p>
    <p role="status">{remaining>0?`Still to allocate: $${money(remaining)}`:remaining<0?`Overallocated: $${money(-remaining)}`:'Balance covered'}{change>0&&` · Give $${money(change)} cash change`}</p>
    {error&&<p className={s.error}>{error}</p>}
    {entries.map((e,i)=><fieldset key={e.method} disabled={disabled}><legend>Payment {i+1}</legend>
      <label>Method<select value={e.method} onChange={event=>update(i,{method:event.target.value,tenderedMinor:e.amountMinor})}>{tenderMethods.filter(m=>m===e.method||!entries.some(p=>p.method===m)).map(m=><option key={m}>{m}</option>)}</select></label>
      <Amount label={balance<0?'Amount paid (USD)':'Amount applied (USD)'} value={e.amountMinor} disabled={disabled} onChange={n=>update(i,current=>({amountMinor:n,tenderedMinor:current.tenderedMinor===current.amountMinor||current.method!=='Cash'||balance<=0?n:Math.max(n,current.tenderedMinor)}))}/>
      {e.method==='Cash'&&balance>0&&<Amount key={'cash-'+e.amountMinor} label="Cash handed to you (USD)" value={e.tenderedMinor} disabled={disabled} onChange={n=>update(i,{tenderedMinor:n})}/>}
      <button type="button" onClick={()=>onChange(current=>current.filter((_,n)=>n!==i))}>Remove payment</button>
    </fieldset>)}
    {entries.length<4&&balance!==0&&<button type="button" disabled={disabled} onClick={()=>{onChange(current=>{if(current.length>=4)return current;const method=tenderMethods.find(m=>!current.some(e=>e.method===m))!;const amount=Math.max(0,Math.abs(balance)-current.reduce((n,e)=>n+e.amountMinor,0));return [...current,{method,amountMinor:amount,tenderedMinor:amount}];});}}>Add payment method</button>}
  </section>;
}
