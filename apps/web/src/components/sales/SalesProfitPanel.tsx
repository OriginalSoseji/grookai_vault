"use client";
import {salesProfit,profitMoney,costGapLabel,type CostSnapshot} from '@/lib/sales/salesProfit.mjs';
import type {RecordedReceipt as SalesReceipt} from '@/lib/sales/salesReport.mjs';
import s from './SalesDesk.module.css';
export type CostReportState={snapshots:CostSnapshot[]|null;loading:boolean;error:string};
export default function SalesProfitPanel({receipts,state}:{receipts:SalesReceipt[];state:CostReportState}){
  let report=null,error=state.error;
  if(!state.loading && !error && state.snapshots!==null){
    try{report=salesProfit(receipts,state.snapshots);}catch{error='The recorded sales and costs need review. Profit is unavailable until they reconcile.';}
  }
  return <section aria-label="Private profit and cost coverage" className="space-y-4 rounded-2xl border border-slate-200 p-4">
    <div><h3 className="text-lg font-semibold">Known-cost profit</h3><p className="text-sm">USD · Private to you · Same dates and filters as this report.</p></div>
    {state.loading?<p role="status">Loading recorded costs…</p>:error?<p role="alert">{error} Use Refresh to try again.</p>:report?<>
      <div className={s.metrics}>
        <div><small>Profit on covered items</small><strong>{report.knownProfitMinor===null?'Unavailable':profitMoney(report.knownProfitMinor)}</strong></div>
        <div><small>Sales on covered items</small><strong>{profitMoney(report.knownSalesMinor)}</strong></div>
        <div><small>Recorded cost of covered items</small><strong>{profitMoney(report.knownCostMinor)}</strong></div>
        <div><small>Sales without qualified cost</small><strong>{profitMoney(report.unknownSalesMinor)}</strong></div>
      </div>
      <p><strong>{report.knownLines} of {report.totalLines} item lines covered</strong>{report.coverageBps===null?'':` (${(report.coverageBps/100).toFixed(2)}%)`} · {report.knownUnits} of {report.totalUnits} units.</p>
      {!report.totalLines?<p>No recorded item sales in this selection.</p>:report.knownLines===0?<p>No items in this selection have qualified USD costs recorded at sale. Unknown cost is not zero cost.</p>:null}
      {!!report.reasons.length && <details><summary>Why some sales are excluded</summary><ul className="mt-3 space-y-2">{report.reasons.map(row=><li key={row.reason}><strong>{costGapLabel(row.reason)}</strong>: {row.lines} item {row.lines===1?'line':'lines'} · {profitMoney(row.salesMinor)} in sales</li>)}</ul></details>}
      <p className="text-sm">Uses costs recorded when each sale completed. Later inventory edits do not change these figures. This is before event expenses, fees, refunds and other unrecorded adjustments. Tax, trade credit and payment movements are separate.</p>
    </>:<p>Cost history has not loaded. Use Refresh to try again.</p>}
  </section>;
}
