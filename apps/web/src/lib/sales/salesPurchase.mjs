import {paymentSnapshot,validatePayments} from './salesPayments.mjs';

// Draft offers and strict receipt validation. Only the authenticated writer commits.
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const fail=message=>{throw Error(message);};
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
function keys(value,expected){if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).sort().join(',')!==[...expected].sort().join(','))fail('Purchase fields need review.');}
function text(value,max,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))fail('Purchase details need review.');return value.trim();}
function frozen(value){if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
const lineKeys=['description','quantity','unitMinor','referenceMinor','rateBps','cardId','printingId','condition','addToVault'];

/** Explicit offer suggestion; no mutation of an already agreed amount. */
export function purchaseOffer(referenceMinor,rateBps){
 if(!integer(referenceMinor,1,100000000)||!integer(rateBps,1,10000))fail('Enter a reference value and a percentage from 0.01 to 100.');
 return Number((BigInt(referenceMinor)*BigInt(rateBps)+5000n)/10000n);
}
function item(value){
 keys(value,lineKeys);
 const description=text(value.description,200,true);
 if(!integer(value.quantity,1,999)||!integer(value.unitMinor,0,100000000)||!integer(value.quantity*value.unitMinor,0,100000000)||typeof value.addToVault!=='boolean')fail('Purchase amount or quantity needs review.');
 if((value.referenceMinor===null)!==(value.rateBps===null))fail('Reference value and percentage must be recorded together.');
 if(value.referenceMinor!==null)purchaseOffer(value.referenceMinor,value.rateBps);
 if(value.cardId===null){
  if(value.printingId!==null||value.condition!==null||value.addToVault)fail('A quick purchase line cannot create inventory.');
 }else if(!uuid(value.cardId)||!uuid(value.printingId)||!['NM','LP','MP','HP','DMG'].includes(value.condition)||value.quantity!==1)fail('Choose one exact printing and condition per copy.');
 return {...value,description};
}
export const validatePurchaseItem=value=>frozen(item(value));
function items(values){
 if(!Array.isArray(values)||values.length<1||values.length>50)fail('Choose 1 to 50 purchase lines.');
 const lines=values.map(item),total=lines.reduce((sum,line)=>sum+line.unitMinor*line.quantity,0);
 if(!integer(total,1,100000000))fail('Purchase total must be from USD 0.01 to 1,000,000.00.');
 return {lines,total};
}
function customer(value){
 keys(value,['name','email','phone','wants','notes']);
 const result={name:text(value.name,120),email:text(value.email,254),phone:text(value.phone,40),wants:text(value.wants,1000),notes:text(value.notes,2000)};
 if(/[\r\n]/.test(result.name)||result.email&&!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(result.email)||result.phone&&!/^\+?[0-9 ()-]{7,40}$/.test(result.phone))fail('Seller contact details need review.');
 return result;
}
export function purchaseRequest(input,id){
 if(!uuid(id))fail('Purchase request identity needs review.');
 keys(input,['storeName','items','payments','note','customerId','customer','confirmed']);
 if(input.confirmed!==true)fail('Confirm that the exchange and payout are complete.');
 if(input.customerId!==null&&!uuid(input.customerId))fail('Seller identity needs review.');
 const {lines,total}=items(input.items),payments=paymentSnapshot(input.payments,-total);
 return frozen({id,cart:{version:4,kind:'purchase',storeName:text(input.storeName,120,true),items:lines,
  payments:payments.entries,note:text(input.note,500),customerId:input.customerId,customer:customer(input.customer)}});
}

const receiptKeys=['version','kind','id','number','createdAt','storeName','customerName','currency','items','purchaseMinor','method','payments','note'];
export const isPurchaseReceipt=value=>value?.version===2&&value?.kind==='purchase';
const recordedLineKeys=[...lineKeys,'lineMinor','printingGvId','instanceId','gvviId'];
/** Version2 purchase evidence must never pass through a sales-only parser. */
export function validatePurchaseReceipt(value){
 keys(value,receiptKeys);
 if(value.version!==2||value.kind!=='purchase'||!uuid(value.id)||value.currency!=='USD')fail('Unsupported purchase receipt.');
 if(typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt))||new Date(value.createdAt).toISOString()!==value.createdAt)fail('Purchase date needs review.');
 if(value.number!==`GVB-${value.createdAt.slice(0,10).replaceAll('-','')}-${value.id.slice(0,8).toUpperCase()}`)fail('Purchase number needs review.');
 if(!Array.isArray(value.items))fail('Purchase items need review.');
 const expected=items(value.items.map(line=>{keys(line,recordedLineKeys);return Object.fromEntries(lineKeys.map(key=>[key,line[key]]));}));
 if(value.purchaseMinor!==expected.total)fail('Purchase total does not match its items.');
 const seen=new Set(),seenGvvi=new Set();
 const lines=value.items.map((line,index)=>{
  if(line.lineMinor!==line.quantity*line.unitMinor)fail('Purchase line amount does not reconcile.');
  if(line.cardId===null){if(line.printingGvId!==null)fail('Quick purchase has unexpected identity.');}
  else text(line.printingGvId,100,true); // Governed reader owns the printing identifier's format.
  if(line.addToVault){
   if(!uuid(line.instanceId)||seen.has(line.instanceId.toLowerCase())||typeof line.gvviId!=='string'||line.gvviId.length>200||!/^GVVI-[A-Z0-9-]+$/.test(line.gvviId)||seenGvvi.has(line.gvviId))fail('Purchase copy evidence needs review.');
   seen.add(line.instanceId.toLowerCase());seenGvvi.add(line.gvviId);
  }else if(line.instanceId!==null||line.gvviId!==null)fail('Unexpected purchase copy.');
  return {...expected.lines[index],lineMinor:line.lineMinor,printingGvId:line.printingGvId,instanceId:line.instanceId,gvviId:line.gvviId};
 });
 const payments=validatePayments(value.payments,-expected.total,value.method);
 return frozen({...value,storeName:text(value.storeName,120,true),customerName:text(value.customerName,120),note:text(value.note,500),items:lines,payments});
}

/** An acknowledgement may settle only the exact pending purchase. */
export function validatePurchaseRequest(request){
 keys(request,['id','cart']);
 keys(request.cart,['version','kind','storeName','items','payments','note','customerId','customer']);
 if(request.cart.version!==4||request.cart.kind!=='purchase')fail('Unexpected purchase request.');
 const cart=request.cart;
 return purchaseRequest({storeName:cart.storeName,items:cart.items,payments:cart.payments,note:cart.note,customerId:cart.customerId,customer:cart.customer,confirmed:true},request.id);
}
export function confirmedPurchaseReceipt(value,request){
 const normalized=validatePurchaseRequest(request).cart;
 const receipt=validatePurchaseReceipt(value);
 const samePayments=receipt.payments.entries.length===normalized.payments.length&&receipt.payments.entries.every((entry,i)=>
  ['method','amountMinor','tenderedMinor'].every(key=>entry[key]===normalized.payments[i][key]));
 if(receipt.id.toLowerCase()!==request.id.toLowerCase()||receipt.storeName!==normalized.storeName||receipt.note!==normalized.note||receipt.items.length!==normalized.items.length||
    normalized.customerId===null&&receipt.customerName!==normalized.customer.name||!samePayments)fail('Purchase acknowledgement does not match the pending request.');
 for(let i=0;i<receipt.items.length;i++){
  const actual=receipt.items[i],expected=normalized.items[i];
  for(const key of lineKeys){
   if(key==='description'&&expected.cardId!==null)continue; // Governed identity may supply the authoritative description.
   const equal=['cardId','printingId'].includes(key)&&expected[key]!==null?actual[key]?.toLowerCase()===expected[key].toLowerCase():actual[key]===expected[key];
   if(!equal)fail('Purchase acknowledgement changed a pending line.');
  }
 }
 return receipt;
}

/** Public handoff omits private customer contacts, notes and persistent copy IDs. */
export function purchaseCustomerView(input){
 const receipt=validatePurchaseReceipt(input);
 return frozen({kind:'purchase',number:receipt.number,createdAt:receipt.createdAt,storeName:receipt.storeName,
  items:receipt.items.map(line=>({description:line.description,quantity:line.quantity,unitMinor:line.unitMinor,lineMinor:line.lineMinor})),
  currency:'USD',purchaseMinor:receipt.purchaseMinor,method:receipt.method,payments:receipt.payments});
}

export function purchaseReceiptText(input,money){
 const receipt=purchaseCustomerView(input);
 return [receipt.storeName,'PURCHASE RECEIPT',receipt.number,receipt.createdAt,
  ...receipt.items.map(line=>`${line.quantity} × ${line.description} @ ${money(line.unitMinor)} — ${money(line.lineMinor)}`),
  `Total paid to seller: ${money(receipt.purchaseMinor)}`,
  ...receipt.payments.entries.map(entry=>`${entry.method}: ${money(entry.amountMinor)}`),
  'Purchase and external payout recorded by the vendor. Grookai did not move money.'].join('\n');
}
