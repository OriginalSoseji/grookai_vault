import {validatePayments, paymentLines} from '../sales/salesPayments.mjs';
import { validateTradeReceipt, tradeReceiptLines } from './tradeReceipt.mjs';
export const BOOK_VERSION = 1;
const METHODS = ['Cash', 'Card (external terminal)', 'Bank / payment app', 'Other'];
export const paymentMethods = METHODS;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function check(ok, message) { if (!ok) throw Error(message); }
function text(value, max, required = false) {
  check(typeof value === 'string', 'Invalid text field.'); const s = value.trim();
  check(s.length <= max && (!required || s.length > 0) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s), 'Check the length and contents of your details.'); return s;
}
export function cents(value) {
  check(typeof value === 'string' && /^\d{1,7}(?:\.\d{1,2})?$/.test(value.trim()), 'Enter a USD amount with up to two decimal places.');
  const [a,b=''] = value.trim().split('.'); return Number(a) * 100 + Number(b.padEnd(2,'0'));
}
export const money = n => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n / 100);
export function customerInput(input) {
  const c = { name:text(input.name,120), email:text(input.email,254), phone:text(input.phone,40), wants:text(input.wants,1000), notes:text(input.notes,2000) };
  check(!c.email || /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(c.email), 'Enter a valid email address.');
  check(!c.phone || /^\+?[0-9 ()-]{7,40}$/.test(c.phone), 'Enter a phone number, including country code for international numbers.');
  check(!/[\r\n]/.test(c.name), 'Use one line for the customer name.');return c;
}
export function createReceipt(input, id, createdAt) {
  check(idPattern.test(id) && !Number.isNaN(Date.parse(createdAt)), 'Receipt identity is invalid.');
  check(input.confirmed === true, 'Confirm that you received the payment before issuing a receipt.');
  check(METHODS.includes(input.method), 'Choose how payment was received.');
  const storeName=text(input.storeName,120,true), customer=customerInput(input.customer);
  check(Array.isArray(input.items) && input.items.length > 0 && input.items.length <= 50, 'Add between 1 and 50 items.');
  const items=input.items.map(item=>{
    const description=text(item.description,200,true); const quantity=Number(item.quantity);
    check(/^\d{1,3}$/.test(String(item.quantity)) && quantity>=1 && quantity<=999, 'Quantity must be from 1 to 999.');
    const unitMinor=cents(item.price);check(unitMinor<=100000000,'Item price is too large.');
    return {description,quantity,unitMinor,lineMinor:quantity*unitMinor};
  });
  const subtotalMinor=items.reduce((sum,item)=>sum+item.lineMinor,0),discountMinor=cents(input.discount||'0'),taxMinor=cents(input.tax||'0');
  check(discountMinor<=subtotalMinor,'Discount cannot exceed the item subtotal.');
  const totalMinor=subtotalMinor-discountMinor+taxMinor;check(totalMinor>0&&totalMinor<=100000000,'Receipt total must be between $0.01 and $1,000,000.');
  return { version:1,id,number:`GV-${createdAt.slice(0,10).replaceAll('-','')}-${id.slice(0,8).toUpperCase()}`,createdAt,storeName,
    customerName:customer.name,method:input.method,items,subtotalMinor,discountMinor,taxMinor,totalMinor,
    note:text(input.note,500),sourceDispositionId:input.sourceDispositionId && idPattern.test(input.sourceDispositionId)?input.sourceDispositionId:null };
}
export function emptyBook() { return { version:BOOK_VERSION,receipts:[],customers:[],storeName:'' }; }
export function saveSale(book,receipt,customer,id) {
  check(!book.receipts.some(r=>r.receipt.id===receipt.id),'This receipt has already been saved.');
  check(!receipt.sourceDispositionId || !book.receipts.some(r=>r.receipt.sourceDispositionId===receipt.sourceDispositionId),'A receipt for this recorded sale already exists in this receipt book.');
  const c=customerInput(customer),hasCustomer=Object.values(c).some(Boolean);
  check(!hasCustomer||idPattern.test(id),'Customer identity is invalid.');
  const customers=hasCustomer?book.customers.filter(row=>row.id!==id):[...book.customers];
  if(hasCustomer)customers.push({id,...c,updatedAt:receipt.createdAt});
  return {...book,storeName:receipt.storeName,customers,receipts:[{receipt,customerId:hasCustomer?id:null},...book.receipts]};
}
export function receiptText(r) {
  return [r.storeName,'SALES RECEIPT',r.number,new Date(r.createdAt).toLocaleString(),r.customerName?`Customer: ${r.customerName}`:'',
    ...r.items.map(i=>`${i.quantity} × ${i.description} @ ${money(i.unitMinor)} — ${money(i.lineMinor)}`),
    `Subtotal: ${money(r.subtotalMinor)}`,`Discount: ${money(r.discountMinor)}`,`Tax recorded: ${money(r.taxMinor)}`,`TOTAL: ${money(r.totalMinor)}`,
    ...tradeReceiptLines(r,money), ...paymentLines(r,money),
    `${r.tradeIn?'Payment / payout method':'Payment method'}: ${r.method}`,r.tradeIn?'Exchange completed and recorded by the vendor. Grookai did not move money.':'Payment received and recorded by the vendor. This is not a Grookai-processed payment.',r.note,'Thank you for your purchase!'].filter(Boolean).join('\n');
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function receiptHtml(r) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(r.number)}</title><style>body{font:16px system-ui;color:#172922;max-width:680px;margin:32px auto;padding:24px}h1{font-size:28px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.7;border-top:3px solid #1e634b;padding-top:24px}@media print{body{margin:0;padding:12px}}</style></head><body><h1>${escapeHtml(r.storeName)}</h1><pre>${escapeHtml(receiptText(r))}</pre></body></html>`;
}
export function deliveryLink(channel,destination,r) {
  const c=customerInput({name:'',phone:channel==='sms'?destination:'',email:channel==='email'?destination:'',wants:'',notes:''});
  if(channel==='email'){check(c.email,'Add the customer email first.');return `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent('Receipt '+r.number+' from '+r.storeName)}&body=${encodeURIComponent(receiptText(r))}`;}
  check(channel==='sms'&&c.phone,'Add the customer phone first.');
  return `sms:${c.phone.replace(/[^+0-9]/g,'')}?body=${encodeURIComponent(receiptText(r))}`;
}
export function parseBackup(raw) {
  check(typeof raw==='string' && raw.length<=10000000,'Backup is too large.');const b=JSON.parse(raw);
  check(b?.version===1&&Array.isArray(b.receipts)&&Array.isArray(b.customers)&&b.receipts.length<=10000&&b.customers.length<=10000,'This is not a supported receipt backup.');
  const customers=b.customers.map(c=>{check(idPattern.test(c.id),'Invalid customer ID.');return {id:c.id,...customerInput(c),updatedAt:text(c.updatedAt,40)};});
    const customerIds=new Set(customers.map(c=>c.id));
    const ids=new Set();const sources=new Set();const receipts=b.receipts.map(row=>{
    const r=row.receipt;check(r&&idPattern.test(r.id)&&!ids.has(r.id),'Duplicate or invalid receipt.');ids.add(r.id);
    check(!r.sourceDispositionId||!sources.has(r.sourceDispositionId),'Duplicate source sale.');if(r.sourceDispositionId)sources.add(r.sourceDispositionId);
    const restored=createReceipt({storeName:r.storeName,customer:{name:r.customerName,email:'',phone:'',wants:'',notes:''},confirmed:true,method:r.payments && r.method === 'Split payment' ? 'Other' : r.method,items:r.items.map(i=>({description:i.description,quantity:String(i.quantity),price:(i.unitMinor/100).toFixed(2)})),discount:(r.discountMinor/100).toFixed(2),tax:(r.taxMinor/100).toFixed(2),note:r.note,sourceDispositionId:r.sourceDispositionId},r.id,r.createdAt);
    check(restored.number===r.number&&restored.totalMinor===r.totalMinor&&restored.subtotalMinor===r.subtotalMinor,'Receipt totals do not match.');
    if(Object.hasOwn(r,'tradeIn'))restored.tradeIn=validateTradeReceipt(r.tradeIn,r.totalMinor);
    if(Object.hasOwn(r,'payments')) {restored.payments=validatePayments(r.payments,restored.tradeIn?.balanceMinor??restored.totalMinor,r.method);restored.method=r.method;}
      check(row.customerId===null||customerIds.has(row.customerId),'Missing customer record.');return {receipt:restored,customerId:row.customerId};
    });check(customerIds.size===customers.length,'Duplicate customer ID.');
  return {version:1,receipts,customers,storeName:text(b.storeName,120)};
}
