import {receiptTenders} from './salesPayments.mjs';
import {isPurchaseReceipt,validatePurchaseReceipt} from './salesPurchase.mjs';
import {validateNegotiatedSaleReceipt} from './negotiatedTrade.mjs';
export const recordedReceiptBalance=r=>isPurchaseReceipt(r)?-r.purchaseMinor:r.tradeIn?.balanceMinor??r.totalMinor;
// Vendor-recorded receipts only. This is not a processor settlement/profit report.
export function salesReport(receipts,{start,end,query='',method='',hour=d=>d.getHours()}) {
 const seen=new Set(),rows=[],hours=Array.from({length:24},()=>({sales:0,transactions:0})),payments={};
 let sales=0,tax=0,received=0,paid=0,credit=0,units=0,purchases=0,purchasedUnits=0,purchaseAmount=0,saleTransactions=0;
 if(!Number.isFinite(+start)||!Number.isFinite(+end)||+end<=+start)throw Error('Choose a valid date range.');
 for(const r of receipts){
  if(seen.has(r.id))continue;seen.add(r.id);const date=new Date(r.createdAt);
  if(!Number.isFinite(+date)||date<start||date>=end)continue;
  const purchase=isPurchaseReceipt(r);if(purchase)validatePurchaseReceipt(r);
  if(r.tradeIn?.version!=null && r.tradeIn.version!==1)validateNegotiatedSaleReceipt(r);
  const tenders=receiptTenders(r);
  if(method && r.method!==method && !tenders.some(e=>e.method===method))continue;
  const text=[r.number,r.customerName,...r.items.map(i=>i.description),...(r.tradeIn?.items??[]).map(i=>i.description)].join(' ').toLowerCase();
  if(!text.includes(query.trim().toLowerCase()))continue;
  const net=purchase?0:r.subtotalMinor-(r.discountMinor??0),balance=recordedReceiptBalance(r),quantity=r.items.reduce((n,i)=>n+i.quantity,0);
  rows.push(r);received+=Math.max(balance,0);paid+=Math.max(-balance,0);
  if(purchase){purchases++;purchasedUnits+=quantity;purchaseAmount+=r.purchaseMinor;}
  else{sales+=net;tax+=r.taxMinor;credit+=r.tradeIn?.totalCreditMinor??0;units+=quantity;saleTransactions++;const h=hour(date);hours[h].sales+=net;hours[h].transactions++;}
  for(const e of tenders)payments[e.method]=(payments[e.method]??0)+Math.sign(balance)*e.amountMinor;
 }
 rows.sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt));
 return {rows,hours,payments,sales,tax,received,paid,credit,units,purchases,purchasedUnits,purchaseAmount,saleTransactions,transactions:rows.length,average:saleTransactions?Math.round(sales/saleTransactions):0};
}
export function reportCsv(rows){
 const cell=v=>{let text=String(v??'');if(/^\s*[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 return ['Receipt,Recorded at,Customer,Method,Units,Sales USD,Tax USD,Trade credit USD,Received USD,Paid to customer USD,Payment breakdown USD,Cash tendered USD,Cash change USD,Transaction kind,Units purchased,Inventory purchases USD,Paid to seller USD',...rows.map(r=>{
  const purchase=isPurchaseReceipt(r);if(purchase)validatePurchaseReceipt(r);if(r.tradeIn?.version!=null && r.tradeIn.version!==1)validateNegotiatedSaleReceipt(r);const balance=recordedReceiptBalance(r),quantity=r.items.reduce((n,i)=>n+i.quantity,0);
  return [r.number,r.createdAt,r.customerName,r.method,purchase?0:quantity,((purchase?0:r.subtotalMinor-(r.discountMinor??0))/100).toFixed(2),((purchase?0:r.taxMinor)/100).toFixed(2),((r.tradeIn?.totalCreditMinor??0)/100).toFixed(2),(Math.max(balance,0)/100).toFixed(2),((purchase?0:Math.max(-balance,0))/100).toFixed(2),receiptTenders(r).map(e=>e.method+': '+(e.amountMinor/100).toFixed(2)).join('; '),!purchase&&r.payments?(r.payments.entries.filter(e=>e.method==='Cash').reduce((n,e)=>n+e.tenderedMinor,0)/100).toFixed(2):'',r.payments?(r.payments.changeMinor/100).toFixed(2):'',purchase?'Purchase':'Sale',purchase?quantity:0,purchase?(r.purchaseMinor/100).toFixed(2):'0.00',purchase?(r.purchaseMinor/100).toFixed(2):'0.00'].map(cell).join(',');
 })].join('\r\n');
}
