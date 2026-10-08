import {salesProfit,salesProfitCorrected} from './salesProfit.mjs';
import {isPurchaseReceipt} from './salesPurchase.mjs';
const amount=v=>{if(v===null||v===undefined)return '';const n=BigInt(v),a=n<0n?-n:n;return `${n<0n?'-':''}${a/100n}.${String(a%100n).padStart(2,'0')}`;};
const cell=v=>{let s=String(v??'');if(/^[\s\u0085]*[=+@\-\t\r]/u.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
/** Private export: same basis, receipts and arithmetic as the visible report. */
export function saleCostReportCsv(receipts,snapshots,{basis='original',states=[],ownerId}={}){
 if(!['original','owner_corrected'].includes(basis))throw Error('Choose the cost reporting basis.');
 const report=basis==='original'?salesProfit(receipts,snapshots):salesProfitCorrected(receipts,snapshots,states,ownerId);
 const details=new Map(report.details.map(d=>[d.receiptId,d])),evidence=new Map(states.map(s=>[s.receiptId,s]));
 const rows=[['Receipt ID','Receipt number','Sold at','Cost basis','Covered sales USD','Covered cost USD','Covered profit USD','Covered lines','Total lines','Coverage gaps','Later owner revisions (private)']];
 for(const r of new Map(receipts.map(r=>[r.id,r])).values()){
  if(isPurchaseReceipt(r))continue;const d=details.get(r.id);
  rows.push([r.id,r.number,r.createdAt,basis==='original'?'Original cost at sale':'Later owner corrections',amount(d.knownSalesMinor),amount(d.knownCostMinor),amount(d.knownProfitMinor),d.knownLines,d.totalLines,d.reasons.join('; '),basis==='original'?'':JSON.stringify((evidence.get(r.id.toLowerCase())?.lines??[]).map(o=>({line:o.request.lineIndex+1,revision:o.revision,action:o.request.action,cost:o.request.cost,ownerId:o.ownerId,recordedAt:o.recordedAt,reason:o.request.reason})))]);
 }
 return rows.map(r=>r.map(cell).join(',')).join('\r\n');
}
