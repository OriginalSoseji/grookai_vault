import {createHash} from 'node:crypto';
import {SquareApiError} from './client_v1.mjs';
const fail=code=>{throw new SquareApiError(code);};
const identifier=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,192}$/.test(value)?value:fail('square_order_unconfirmed');
const timestamp=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT/.test(value)&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():fail('square_payment_time_unconfirmed');
const money=(value,optional=false)=>{
 if(optional&&value===undefined)return 0;
 if(value?.currency!=='USD'||!Number.isSafeInteger(value.amount)||value.amount<0||value.amount>100000000)fail('square_order_amount_unconfirmed');
 return value.amount;
};
export const squareEvidenceHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function squareTenderPaymentIds(order){
 if(!Array.isArray(order.tenders)||order.tenders.length<1||order.tenders.length>100)fail('square_payment_unconfirmed');
 const ids=order.tenders.map(row=>identifier(row.payment_id??row.id));
 if(new Set(ids).size!==ids.length)fail('square_payment_unconfirmed');return ids;
}
// Inputs must come from authenticated provider rereads, never a webhook body.
// Retain only identity/amount/status facts; no customer/card/address information.
export function squareOrderEvidence(order,payments,{locationId,mappedVariationIds}){
 identifier(order?.id);
 if(order.location_id!==locationId||!Array.isArray(order.line_items)||order.line_items.length>1000)fail('square_order_unconfirmed');
 const result={evidenceVersion:'SQUARE_ORDER_EVIDENCE_V3',id:order.id,locationId,currency:'USD',state:'pending',version:order.version??null,lines:[],payments:[]};
 const mapped=new Set(mappedVariationIds),seen=new Set(),variations=new Set();
 for(const line of order.line_items){
  if(!mapped.has(line.catalog_object_id))continue;
  identifier(line.uid);identifier(line.catalog_object_id);
  if(seen.has(line.uid)||variations.has(line.catalog_object_id)||line.quantity!=='1')fail('square_sale_requires_review');
  seen.add(line.uid);variations.add(line.catalog_object_id);
  const tax=money(line.total_tax_money,true),service=money(line.total_service_charge_money,true);
  const revenue=money(line.total_money)-tax-service;
  if(revenue<1)fail('square_sale_requires_review');
  result.lines.push({id:line.uid,variationId:line.catalog_object_id,quantity:'1',saleCents:revenue,taxCents:tax});
 }
 if(order.state==='CANCELED'){result.state='canceled';return result;}
 if(order.state!=='COMPLETED')return result;
 const expected=money(order.total_money),ids=squareTenderPaymentIds(order);
 if(!Array.isArray(payments)||payments.length!==ids.length)fail('square_payment_unconfirmed');
 let total=0;
 for(let n=0;n<ids.length;n++){
  const payment=payments.find(row=>row.id===ids[n]);
  if(!payment||payment.order_id!==order.id||payment.location_id!==locationId)fail('square_payment_unconfirmed');
  const amount=money(payment.total_money??payment.amount_money);
  if(amount!==money(order.tenders[n].amount_money))fail('square_payment_unconfirmed');
  result.payments.push({id:payment.id,status:payment.status,createdAt:timestamp(payment.created_at),amountCents:amount,refundedCents:money(payment.refunded_money,true)});
  if(payment.status!=='COMPLETED')return result;
  total+=amount;
 }
 if(!Number.isSafeInteger(total)||total!==expected)fail('square_payment_unconfirmed');
 result.state='paid';return result;
}

export function squareRefundEvidence(refund,payment,{locationId}){
 if(refund?.payment_id!==payment?.id||payment.location_id!==locationId||refund.location_id!==locationId||!payment.order_id||
  !['PENDING','APPROVED','REJECTED','FAILED','COMPLETED'].includes(refund.status))fail('square_refund_unconfirmed');
 return {id:identifier(refund.id),orderId:identifier(payment.order_id),locationId,currency:'USD',status:refund.status,amountCents:money(refund.amount_money)};
}
