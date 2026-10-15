"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Download,RefreshCw} from 'lucide-react';
import {methods,money} from '@/lib/sales/salesDesk.mjs';
import {reportCsv,salesReport,recordedReceiptBalance,type RecordedReceipt as SalesReceipt} from '@/lib/sales/salesReport.mjs';
import {isPurchaseReceipt} from '@/lib/sales/salesPurchase.mjs';
import {paginateSalesRows,readSalesDashboardParams,writeSalesDashboardParams,type SalesDashboardState} from '@/lib/sales/salesDashboardState.mjs';
import s from './SalesDesk.module.css';
import SalesProfitPanel,{type CostReportState} from './SalesProfitPanel';
function dateInput(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const allowedMethods=[...methods,'Split payment'];
export default function SalesDashboard({receipts,loading,refresh,costState}:{receipts:SalesReceipt[]|null;loading:boolean;refresh:()=>void;costState?:CostReportState}){
 const today=dateInput(new Date());
 const [filters,setFilters]=useState<SalesDashboardState>(()=>readSalesDashboardParams('',today,allowedMethods));
 const ready=useRef(false),{from,to,query,method,page}=filters;
 const replaceFilters=useCallback((update:Partial<SalesDashboardState>)=>setFilters(current=>({...current,...update,page:update.page??1})),[]);
 useEffect(()=>{
  if(!ready.current){ready.current=true;setFilters(readSalesDashboardParams(window.location.search,today,allowedMethods));return;}
  const params=writeSalesDashboardParams(window.location.search,filters),next=window.location.pathname+(params.size?'?'+params:'')+window.location.hash;
  window.history.replaceState(window.history.state,'',next);
 },[filters,today]);
 useEffect(()=>{const sync=()=>setFilters(readSalesDashboardParams(window.location.search,dateInput(new Date()),allowedMethods));window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
 const start=new Date(from+'T00:00:00'),end=new Date(to+'T00:00:00');end.setDate(end.getDate()+1);
 const valid=Number.isFinite(+start)&&Number.isFinite(+end)&&end>start;
 const report=valid&&receipts?salesReport(receipts,{start,end,query,method}):null;
 const paged=report?paginateSalesRows(report.rows,page):null;
 useEffect(()=>{if(paged&&paged.page!==page)setFilters(current=>({...current,page:paged.page}));},[page,paged]);
 function range(days:number){const d=new Date();d.setDate(d.getDate()-days+1);replaceFilters({from:dateInput(d),to:today});}
 function download(){if(!report)return;const url=URL.createObjectURL(new Blob([reportCsv(report.rows)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`grookai-sales-${from}-${to}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className={s.dashboard} aria-label="Sales dashboard">
  <div className={s.toolbar}><div><h2>Sales dashboard</h2><p>Recorded sales and purchases · Dates and hours use this device’s time zone.</p></div><div className={s.actions}><button onClick={refresh} disabled={loading}><RefreshCw size={16}/>{loading?'Refreshing…':'Refresh'}</button><button onClick={download} disabled={!report?.rows.length}><Download size={16}/>Export CSV</button></div></div>
  <div className={s.actions}><button onClick={()=>range(1)}>Today</button><button onClick={()=>range(7)}>7 days</button><button onClick={()=>range(30)}>30 days</button></div>
  <p>{from} – {to}{query ? ` · Matching “${query}”` : ''}{method ? ` · ${method}` : ''}</p>
  <details className={s.details}><summary>Filter dates, receipts or payment method</summary><div className={s.reportFilters}><label>From<input type="date" value={from} onChange={e=>replaceFilters({from:e.target.value})}/></label><label>Through<input type="date" value={to} onChange={e=>replaceFilters({to:e.target.value})}/></label><label>Find receipt or customer<input value={query} maxLength={200} onChange={e=>replaceFilters({query:e.target.value})} placeholder="Receipt, customer or card"/></label><label>Payment method<select aria-label="Payment method" value={method} onChange={e=>replaceFilters({method:e.target.value})}><option value="">All methods</option>{allowedMethods.map(m=><option key={m}>{m}</option>)}</select></label></div></details>
  {!valid&&<p role="alert">Choose a valid date range.</p>}{!receipts&&<p>History has not loaded yet. Refresh to try again.</p>}
  {report&&<><div className={s.metrics}>{[
   ['Item sales',`$${money(report.sales)}`],['Transactions',String(report.transactions)],['Units sold',String(report.units)],['Average sale',`$${money(report.average)}`],['Received',`$${money(report.received)}`],[report.purchases?'Paid out':'Paid to customers',`$${money(report.paid)}`],['Trade credit',`$${money(report.credit)}`],['Tax recorded',`$${money(report.tax)}`],
   ...(report.purchases?[['Purchases',String(report.purchases)],['Units purchased',String(report.purchasedUnits)],['Inventory purchases',`$${money(report.purchaseAmount)}`]]:[]),
  ].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
  {costState && <SalesProfitPanel receipts={report.rows} state={costState} />}
  <h3>Sales by hour</h3><div className={s.hourly} role="region" aria-label="Hourly sales chart" tabIndex={0}>{report.hours.map((h,i)=><div key={i} title={`${i}:00 · $${money(h.sales)} · ${h.transactions} transactions`}><span style={{height:`${h.sales?Math.max(3,h.sales/Math.max(1,...report.hours.map(h=>h.sales))*100):0}%`}}/><small>{i}</small></div>)}</div>
  <details className={s.details}><summary>Hourly figures and payment methods</summary><div className={s.reportTable}><table><thead><tr><th>Hour</th><th>Transactions</th><th>Item sales</th></tr></thead><tbody>{report.hours.map((h,i)=><tr key={i}><td>{i}:00</td><td>{h.transactions}</td><td>${money(h.sales)}</td></tr>)}</tbody></table></div>{Object.entries(report.payments).map(([method,net])=><p key={method}>{method}: ${money(net)} net recorded</p>)}</details>
  <h3>Transaction history</h3><div className={s.reportTable}><table><thead><tr><th>Receipt / time</th><th>Customer / seller</th><th>Method</th><th>Items</th><th>Balance</th></tr></thead><tbody>{paged?.rows.map(r=><tr key={r.id}><td><Link href={`/account/store/receipts/cloud?receipt=${encodeURIComponent(r.id)}`}>{r.number}</Link>{isPurchaseReceipt(r)&&<small><strong>Purchase</strong></small>}<small>{new Date(r.createdAt).toLocaleString()}</small></td><td>{r.customerName||'Walk-up'}</td><td>{r.method}</td><td>{r.items.map(i=>`${i.quantity} × ${i.description}`).join(', ')}</td><td>${money(recordedReceiptBalance(r))}</td></tr>)}</tbody></table>{!report.rows.length&&<p className={s.empty}>No recorded transactions in this range.</p>}</div>
  {paged&&report.rows.length>0&&<nav className={s.pagination} aria-label="Transaction history pages"><span>Showing {paged.start+1}–{paged.end} of {report.rows.length}</span><div><button disabled={paged.page===1} onClick={()=>replaceFilters({page:paged.page-1})}>Previous</button><span>Page {paged.page} of {paged.pageCount}</span><button disabled={paged.page===paged.pageCount} onClick={()=>replaceFilters({page:paged.page+1})}>Next</button></div></nav>}
  {report.purchases>0&&<p>Inventory purchases are recorded payouts, separate from item sales and profit. Average sale and hourly sales include sales only.</p>}
  <p className={s.reportNote}>Item sales exclude tax and show recorded discounts. Received and paid amounts account for trades and purchases. Online orders, refunds and processor settlements are not included here. {costState?'Private known-cost profit and its coverage appear above.':'Profit is not included in this report.'}</p></>}
 </section>;
}
