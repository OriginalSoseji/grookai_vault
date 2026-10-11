import {validateEventState} from './vendorEvents.mjs';
import {parseBackup} from '../receipts/receiptBook.mjs';
import {isPurchaseReceipt} from './salesPurchase.mjs';
import {receiptTenders} from './salesPayments.mjs';
import {salesProfit,salesProfitCorrected} from './salesProfit.mjs';
import {validateSaleCostCorrectionStates} from './saleCostCorrections.mjs';
const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const fail=()=>{throw Error('Event receipts need review before totals can be shown.');};
const integer=v=>{if(!Number.isSafeInteger(v)||v<0)fail();return BigInt(v);};

/** Saved associations define scope. Dates never silently remove assigned receipts. */
export function eventReport({state,ownerId,eventId,bookRevision,receipts,snapshots,query='',method='',costBasis='original',correctionStates}){
 if(!['original','owner_corrected'].includes(costBasis))fail();
 const loaded=validateEventState(state,ownerId,eventId),selected=loaded.selected;
 if(!loaded.receiptAccess||selected.bookRevision!==bookRevision)throw Error('Refresh the receipt history before reviewing this event.');
 if(typeof query!=='string'||query.length>500||typeof method!=='string'||method.length>100||!Array.isArray(receipts)||receipts.length>10000)fail();
 const unique=new Map();
 for(const receipt of receipts){
  if(typeof receipt?.id!=='string'||receipt.id.length!==36)fail();const key=receipt.id.toLowerCase(),prior=unique.get(key);
  if(prior&&stable(prior)!==stable(receipt))throw Error('Conflicting receipt identities need review.');
  unique.set(key,receipt);
 }
 // Validate every receipt before filtering, retaining original immutable bytes.
 parseBackup(JSON.stringify({version:1,storeName:'',customers:[],receipts:[...unique.values()].map(receipt=>({receipt,customerId:null}))}));
 for(const receipt of unique.values())for(const item of receipt.items)if(integer(item.lineMinor)!==integer(item.quantity)*integer(item.unitMinor))fail();
 const assigned=selected.assignments.filter(a=>a.eventId===eventId).map(a=>a.receiptId);
 for(const id of assigned)if(!unique.has(id)||selected.receiptIdentityConflicts.includes(id))throw Error('An assigned receipt is missing or needs identity review.');
 const checkedCorrections=costBasis==='owner_corrected'?validateSaleCostCorrectionStates(correctionStates,ownerId,assigned.filter(id=>!isPurchaseReceipt(unique.get(id)))):null;
 const search=query.trim().toLowerCase(),rows=[];
 let sales=0n,tax=0n,received=0n,paid=0n,credit=0n,units=0n,purchasedUnits=0n,purchases=0n,cashReceived=0n,cashPaid=0n,tendered=0n,change=0n;
 let saleTransactions=0,purchaseTransactions=0,unknownCashTender=0;const payments={};
 for(const id of assigned){
  const r=unique.get(id),tenders=receiptTenders(r);
  if(method&&r.method!==method&&!tenders.some(t=>t.method===method))continue;
  if(![r.number,r.customerName,...r.items.map(i=>i.description),...(r.tradeIn?.items??[]).map(i=>i.description)].join(' ').toLowerCase().includes(search))continue;
  rows.push(r);const purchase=isPurchaseReceipt(r),quantity=r.items.reduce((n,i)=>n+integer(i.quantity),0n);
  const balance=purchase?-integer(r.purchaseMinor):integer(r.totalMinor)-integer(r.tradeIn?.totalCreditMinor??0);
  if(balance>0n)received+=balance;else paid-=balance;
  if(purchase){purchases+=integer(r.purchaseMinor);purchasedUnits+=quantity;purchaseTransactions++;}
  else{sales+=integer(r.subtotalMinor)-integer(r.discountMinor??0);tax+=integer(r.taxMinor);credit+=integer(r.tradeIn?.totalCreditMinor??0);units+=quantity;saleTransactions++;}
  for(const t of tenders){const amount=integer(t.amountMinor),signed=balance<0n?-amount:amount;payments[t.method]=(payments[t.method]??0n)+signed;
   if(t.method==='Cash'){if(balance>=0n)cashReceived+=amount;else cashPaid+=amount;
    if(balance>0n){if(r.payments){tendered+=integer(t.tenderedMinor);change+=integer(t.tenderedMinor)-amount;}else unknownCashTender++;}
   }
  }
 }
 rows.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||a.id.localeCompare(b.id));
 const expenses=selected.expenses.filter(e=>!e.voided),operating=expenses.reduce((n,e)=>n+BigInt(e.amountMinor),0n),visibleIds=new Set(rows.filter(r=>!isPurchaseReceipt(r)).map(r=>r.id.toLowerCase())),profit=checkedCorrections?salesProfitCorrected(rows,snapshots,checkedCorrections.filter(s=>visibleIds.has(s.receiptId)),ownerId):salesProfit(rows,snapshots);
 return {version:1,currency:'USD',event:loaded.events.find(e=>e.eventId===eventId),eventRevision:loaded.revision,bookRevision,rows,expenses,
  receiptFilter:{query,method},receiptsFiltered:!!(search||method),assignedReceipts:assigned.length,transactions:rows.length,saleTransactions,purchaseTransactions,
  salesMinor:String(sales),taxMinor:String(tax),receivedMinor:String(received),paidMinor:String(paid),tradeCreditMinor:String(credit),units:String(units),purchasedUnits:String(purchasedUnits),inventoryPurchaseMinor:String(purchases),
  cashReceivedMinor:String(cashReceived),cashPaidMinor:String(cashPaid),knownCashTenderedMinor:String(tendered),knownCashChangeMinor:String(change),unknownCashTenderReceipts:unknownCashTender,
  payments:Object.fromEntries(Object.entries(payments).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,String(v)])),operatingExpenseMinor:String(operating),voidedExpenseCount:selected.expenses.length-expenses.length,
  profit,...(checkedCorrections?{costBasis:'owner_corrected'}:{}),knownCostEventSubtotalMinor:profit.knownProfitMinor===null?null:String(BigInt(profit.knownProfitMinor)-operating)};
}

const amount=value=>{if(value===null||value===undefined)return '';if(typeof value!=='string'||! /^-?(?:0|[1-9][0-9]*)$/.test(value))fail();const n=BigInt(value),a=n<0n?-n:n;return `${n<0n?'-':''}${a/100n}.${String(a%100n).padStart(2,'0')}`;};
const csvCell=value=>{let s=String(value??'');if(/^[\s\u0085]*[=+@\-\t\r]/u.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
/** Same visible receipt filter; all active event expenses remain included. */
export function eventReportCsv(report){
 const rows=[['Record type','Event','ID','Recorded at / incurred on','Description','Sales USD','Tax USD','Inventory purchases USD','Trade credit USD','Received USD','Paid USD','Operating expense USD','Expense category','Method','Known cost lines / sale lines','Known cost USD','Known profit USD','Receipt search','Receipt payment filter']];
 const details=new Map(report.profit.details.map(d=>[d.receiptId,d]));
 for(const r of report.rows){const purchase=isPurchaseReceipt(r),balance=purchase?-integer(r.purchaseMinor):integer(r.totalMinor)-integer(r.tradeIn?.totalCreditMinor??0),profit=details.get(r.id);
  rows.push([purchase?'Purchase':r.tradeIn?'Trade':'Sale',report.event.name,r.id,r.createdAt,r.items.map(i=>i.description).join('; '),amount(String(purchase?0n:integer(r.subtotalMinor)-integer(r.discountMinor??0))),amount(String(purchase?0:r.taxMinor)),amount(String(purchase?r.purchaseMinor:0)),amount(String(r.tradeIn?.totalCreditMinor??0)),amount(String(balance>0n?balance:0n)),amount(String(balance<0n?-balance:0n)),'0.00','',r.method,profit?`${profit.knownLines}/${profit.totalLines}`:'',amount(profit?.knownCostMinor),amount(profit?.knownProfitMinor),report.receiptFilter.query,report.receiptFilter.method]);
 }
 for(const e of report.expenses)rows.push(['Expense',report.event.name,e.expenseId,e.incurredOn,e.description,'0.00','0.00','0.00','0.00','0.00','0.00',amount(e.amountMinor),e.category,'','','','',report.receiptFilter.query,report.receiptFilter.method]);
 rows[0].push('Cost basis');for(const row of rows.slice(1))row.push(report.costBasis==='owner_corrected'?'Later owner corrections':'Original cost at sale');
 return rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
}
