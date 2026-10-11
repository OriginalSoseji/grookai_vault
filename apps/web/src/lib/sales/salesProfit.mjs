// Private cost-at-sale evidence only. Current inventory cost is never an input.
import {isPurchaseReceipt,validatePurchaseReceipt} from './salesPurchase.mjs';
import {validateNegotiatedSaleReceipt} from './negotiatedTrade.mjs';
import {validateSaleDiscountAllocation} from './saleDiscount.mjs';
import {validateSaleCostCorrectionStates,sameCostEvidence} from './saleCostCorrections.mjs';
const uuid = value => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const integer = (value,positive=false) => {
  if(!Number.isSafeInteger(value) || value < (positive?1:0))throw Error('Recorded sales need review before profit can be calculated.');
  return BigInt(value);
};
const stable = value => JSON.stringify(value,(_,v)=>v && typeof v==='object' && !Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
function unique(rows,key,label) {
  if(!Array.isArray(rows)||rows.length>10000)throw Error(`Invalid ${label} history.`);
  const found=new Map();
  for(const row of rows){
    if(!row || typeof row[key]!=='string' || !row[key] || row[key].length>200)throw Error(`Invalid ${label} identity.`);
    const prior=found.get(row[key]);
    if(prior && stable(prior)!==stable(row))throw Error(`Conflicting ${label} history needs review.`);
    found.set(row[key],row);
  }
  return found;
}
function qualifiedMinor(cost) {
  if(!cost || cost.status!=='known' || typeof cost.amount!=='string' || cost.amount.length>1500 ||
    !/^\d+(?:\.\d+)?$/.test(cost.amount) || typeof cost.currency!=='string' || !/^[A-Z]{3}$/.test(cost.currency) ||
    typeof cost.minor!=='string' || !/^\d{1,12}$/.test(cost.minor))return null;
  const [whole,fraction='']=cost.amount.split('.');if(/[1-9]/.test(fraction.slice(2)))return null;
  const minor=BigInt(whole)*100n+BigInt(fraction.slice(0,2).padEnd(2,'0'));
  return minor<=999999999999n && minor===BigInt(cost.minor)?minor:null;
}
const unknownStatuses=new Set(['missing_amount','missing_currency','invalid_amount','invalid_currency','oversized_legacy_value']);
function alignedSnapshot(snapshot,receipt,items) {
  if(!snapshot || ![1,2].includes(snapshot.version) || snapshot.receiptId!==receipt.id || snapshot.salesCurrency!=='USD' ||
    typeof snapshot.soldAt!=='string' || !Number.isFinite(Date.parse(snapshot.soldAt)) || Date.parse(snapshot.soldAt)!==Date.parse(receipt.createdAt) ||
    !Array.isArray(snapshot.lines) || snapshot.lines.length!==items.length)return false;
  if(snapshot.version===2){
    try{validateSaleDiscountAllocation(snapshot.allocation,receipt.items,receipt.discountMinor??0);}catch{return false;}
  }
  const copies=new Set();
  return snapshot.lines.every((line,index)=>{
    if(!line || line.index!==index || line.quantity!==receipt.items[index].quantity || typeof line.salesMinor!=='string' ||
      line.salesMinor.length>32 || !/^\d+$/.test(line.salesMinor) || BigInt(line.salesMinor)!==items[index].sales || !line.cost)return false;
    if(line.instanceId===null)return line.status==='unlinked' && line.cost.status==='missing_amount' && line.cost.amount===null && line.cost.currency===null && line.cost.minor===null;
    if(!uuid(line.instanceId) || copies.has(line.instanceId) || line.quantity!==1)return false;
    copies.add(line.instanceId);
    if(line.status==='known' || line.status==='foreign_currency')return qualifiedMinor(line.cost)!==null &&
      (line.status==='known'?line.cost.currency==='USD':line.cost.currency!=='USD');
    return unknownStatuses.has(line.status) && line.cost.status===line.status && line.cost.minor===null;
  });
}

/** Inputs are the same filtered receipts displayed by Reports and private immutable snapshots. */
export function salesProfit(receipts,snapshots) {
  return calculateProfit(receipts,snapshots,null);
}
/** Later owner attestations are an explicit reporting basis, never original snapshots. */
export function salesProfitCorrected(receipts,snapshots,states,ownerId) {
  const rows=unique(receipts,'id','receipt');
  const ids=[...rows.values()].filter(r=>!isPurchaseReceipt(r)).map(r=>r.id);
  const checked=validateSaleCostCorrectionStates(states,ownerId,ids);
  return calculateProfit(receipts,snapshots,new Map(checked.map(s=>[s.receiptId,s])));
}
function calculateProfit(receipts,snapshots,corrections) {
  const rows=unique(receipts,'id','receipt'),evidence=unique(snapshots,'receiptId','cost');
  let sales=0n,knownSales=0n,costs=0n,units=0n,knownUnits=0n,lines=0,knownLines=0,purchases=0;
  const reasons=new Map(),details=[];
  let attestedLines=0,restoredLines=0;
  function excluded(reason,receiptId,count,quantity,amount){
    let entry=reasons.get(reason);if(!entry){entry={receipts:new Set(),lines:0,units:0n,sales:0n};reasons.set(reason,entry);}
    entry.receipts.add(receiptId);entry.lines+=count;entry.units+=quantity;entry.sales+=amount;
  }
  for(const receipt of rows.values()){
    if(isPurchaseReceipt(receipt)){validatePurchaseReceipt(receipt);purchases++;continue;}
    if(receipt.tradeIn?.version!=null && receipt.tradeIn.version!==1)validateNegotiatedSaleReceipt(receipt);
    if(typeof receipt.createdAt!=='string' || !Number.isFinite(Date.parse(receipt.createdAt)) || !Array.isArray(receipt.items) || !receipt.items.length || receipt.items.length>1000)throw Error('Recorded sales need review before profit can be calculated.');
    const items=receipt.items.map(item=>({units:integer(item.quantity,true),sales:integer(item.quantity,true)*integer(item.unitMinor)}));
    const subtotal=items.reduce((n,item)=>n+item.sales,0n),quantity=items.reduce((n,item)=>n+item.units,0n);
    const discount=integer(receipt.discountMinor??0),tax=integer(receipt.taxMinor);
    if(subtotal!==integer(receipt.subtotalMinor) || discount>subtotal || subtotal-discount+tax!==integer(receipt.totalMinor))throw Error('Recorded sales do not reconcile. Profit is unavailable until they are reviewed.');
    const net=subtotal-discount;
    sales+=net;units+=quantity;lines+=items.length;
    const snapshot=evidence.get(receipt.id);
    const correction=corrections?.get(receipt.id.toLowerCase());
    const correctionsAlign=correction?.source!==null&&sameCostEvidence(correction?.receipt,receipt)&&correction?.lines.every(o=>o.source===correction.source&&sameCostEvidence(o.request.receipt,receipt));
    const correctedLines=new Map((correction?.lines??[]).map(o=>[o.request.lineIndex,o]));
    const reason=corrections&&!correctionsAlign?'correction_receipt_mismatch':!snapshot?(corrections&&discount===0n?null:'missing_snapshot'):!alignedSnapshot(snapshot,receipt,items)?'snapshot_mismatch':discount>0n&&snapshot.version===1?'discount_allocation_missing':null;
    if(reason){excluded(reason,receipt.id,items.length,quantity,net);details.push({receiptId:receipt.id,knownLines:0,totalLines:items.length,knownSalesMinor:'0',knownCostMinor:'0',knownProfitMinor:null,reasons:[reason]});continue;}
    let coveredSales=0n,coveredCost=0n,coveredLines=0;const receiptReasons=new Set();
    items.forEach((item,index)=>{
      const line=snapshot?.lines[index],revision=correctedLines.get(index);
      if(revision?.request.action==='set')attestedLines++;
      else if(revision?.request.action==='restore')restoredLines++;
      const attestation=revision?.request.action==='set'?revision.request.cost:null;
      const status=attestation?(attestation.currency==='USD'?'known':'foreign_currency'):(line?.status??'missing_snapshot');
      const netSales=snapshot?.version===2?BigInt(snapshot.allocation.lines[index].netMinor):item.sales;
      if(status==='known'){
        const cost=attestation?BigInt(attestation.minor):qualifiedMinor(line.cost); // validated by alignedSnapshot
        coveredSales+=netSales;coveredCost+=cost;coveredLines++;knownUnits+=item.units;
      }else{excluded(status,receipt.id,1,item.units,netSales);receiptReasons.add(status);}
    });
    knownSales+=coveredSales;costs+=coveredCost;knownLines+=coveredLines;
    details.push({receiptId:receipt.id,knownLines:coveredLines,totalLines:items.length,knownSalesMinor:String(coveredSales),knownCostMinor:String(coveredCost),knownProfitMinor:coveredLines?String(coveredSales-coveredCost):null,reasons:[...receiptReasons].sort()});
  }
  return {currency:'USD',receipts:rows.size-purchases,totalLines:lines,knownLines,totalUnits:String(units),knownUnits:String(knownUnits),itemSalesMinor:String(sales),
    knownSalesMinor:String(knownSales),unknownSalesMinor:String(sales-knownSales),knownCostMinor:String(costs),knownProfitMinor:knownLines?String(knownSales-costs):null,
    coverageBps:lines?Math.floor(knownLines*10000/lines):null,
    reasons:[...reasons].sort(([a],[b])=>a.localeCompare(b)).map(([reason,row])=>({reason,receipts:row.receipts.size,lines:row.lines,units:String(row.units),salesMinor:String(row.sales)})),details,
    ...(corrections?{basis:'owner_corrected',attestedLines,restoredLines}:{})};
}

export function profitMoney(minor) {
  if(typeof minor!=='string' || !/^-?\d+$/.test(minor))throw Error('Invalid money amount.');
  const amount=BigInt(minor),absolute=amount<0n?-amount:amount;
  return `${amount<0n?'-':''}$${String(absolute/100n).replace(/\B(?=(\d{3})+(?!\d))/g,',')}.${String(absolute%100n).padStart(2,'0')}`;
}
export const costGapLabel = reason => ({missing_snapshot:'No cost recorded at sale',snapshot_mismatch:'Cost evidence needs review',discount_allocation_missing:'Discount allocation not recorded',
  correction_receipt_mismatch:'Saved receipt or cost revision needs review',
  unlinked:'Item not linked to an exact copy',missing_amount:'Cost amount missing',missing_currency:'Cost currency missing',invalid_amount:'Cost amount needs review',invalid_currency:'Cost currency needs review',oversized_legacy_value:'Legacy cost needs review',foreign_currency:'Cost recorded in another currency'}[reason]??'Cost evidence needs review');
