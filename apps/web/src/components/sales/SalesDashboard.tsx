"use client";
import {useState} from 'react';
import Link from 'next/link';
import {Download,RefreshCw} from 'lucide-react';
import {methods,money} from '@/lib/sales/salesDesk.mjs';
import {reportCsv,salesReport,type SalesReceipt} from '@/lib/sales/salesReport.mjs';
import s from './SalesDesk.module.css';
function dateInput(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export default function SalesDashboard({receipts,loading,refresh}:{receipts:SalesReceipt[]|null;loading:boolean;refresh:()=>void}){
 const today=dateInput(new Date()),[from,setFrom]=useState(today),[to,setTo]=useState(today),[query,setQuery]=useState(''),[method,setMethod]=useState('');
 const start=new Date(from+'T00:00:00'),end=new Date(to+'T00:00:00');end.setDate(end.getDate()+1);
 const valid=Number.isFinite(+start)&&Number.isFinite(+end)&&end>start;
 const report=valid&&receipts?salesReport(receipts,{start,end,query,method}):null;
 function range(days:number){const d=new Date();d.setDate(d.getDate()-days+1);setFrom(dateInput(d));setTo(today);}
 function download(){if(!report)return;const url=URL.createObjectURL(new Blob([reportCsv(report.rows)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`grookai-sales-${from}-${to}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className={s.dashboard} aria-label="Sales dashboard">
  <div className={s.toolbar}><div><h2>Sales dashboard</h2><p>Recorded in-person sales · Dates and hours use this device’s time zone.</p></div><div className={s.actions}><button onClick={refresh} disabled={loading}><RefreshCw size={16}/>{loading?'Refreshing…':'Refresh history'}</button><button onClick={download} disabled={!report?.rows.length}><Download size={16}/>Export CSV</button></div></div>
  <div className={s.actions}><button onClick={()=>range(1)}>Today</button><button onClick={()=>range(7)}>7 days</button><button onClick={()=>range(30)}>30 days</button></div>
  <div className={s.reportFilters}><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Through<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><label>Find receipt or customer<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Receipt, customer or card"/></label><label>Payment method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="">All methods</option>{methods.map(m=><option key={m}>{m}</option>)}</select></label></div>
  {!valid&&<p role="alert">Choose a valid date range.</p>}{!receipts&&<p>History has not loaded yet. Refresh to try again.</p>}
  {report&&<><div className={s.metrics}>{[
   ['Item sales',`$${money(report.sales)}`],['Transactions',String(report.transactions)],['Units sold',String(report.units)],['Average sale',`$${money(report.average)}`],['Received',`$${money(report.received)}`],['Paid to customers',`$${money(report.paid)}`],['Trade credit',`$${money(report.credit)}`],['Tax recorded',`$${money(report.tax)}`],
  ].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
  <h3>Sales by hour</h3><div className={s.hourly}>{report.hours.map((h,i)=><div key={i} title={`${i}:00 · $${money(h.sales)} · ${h.transactions} transactions`}><span style={{height:`${h.sales?Math.max(3,h.sales/Math.max(1,...report.hours.map(h=>h.sales))*100):0}%`}}/><small>{i}</small></div>)}</div>
  <details className={s.details}><summary>Hourly figures and payment methods</summary><div className={s.reportTable}><table><thead><tr><th>Hour</th><th>Transactions</th><th>Item sales</th></tr></thead><tbody>{report.hours.map((h,i)=><tr key={i}><td>{i}:00</td><td>{h.transactions}</td><td>${money(h.sales)}</td></tr>)}</tbody></table></div>{Object.entries(report.payments).map(([method,net])=><p key={method}>{method}: ${money(net)} net recorded</p>)}</details>
  <h3>Transaction history</h3><div className={s.reportTable}><table><thead><tr><th>Receipt / time</th><th>Customer</th><th>Method</th><th>Items</th><th>Balance</th></tr></thead><tbody>{report.rows.map(r=><tr key={r.id}><td><Link href="/account/store/receipts/cloud">{r.number}</Link><small>{new Date(r.createdAt).toLocaleString()}</small></td><td>{r.customerName||'Walk-up'}</td><td>{r.method}</td><td>{r.items.map(i=>`${i.quantity} × ${i.description}`).join(', ')}</td><td>${money(r.tradeIn?.balanceMinor??r.totalMinor)}</td></tr>)}</tbody></table>{!report.rows.length&&<p className={s.empty}>No recorded transactions in this range.</p>}</div>
  <p className={s.reportNote}>Item sales exclude tax and show recorded discounts. Received and paid amounts account for trades. Online orders, refunds, processor settlements and profit are not included in this report.</p></>}
 </section>;
}
