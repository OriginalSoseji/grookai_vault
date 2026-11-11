// Actual Square Sandbox order/payment/refund proof. No production origin or DB.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import dotenv from 'dotenv';
import {SquareClient} from './client_v1.mjs';
import {squareOrderEvidence,squareRefundEvidence} from './order_evidence_v2.mjs';
const args=process.argv.slice(2);
const resume=args.at(-1)==='--resume';if(resume)args.pop();
assert.equal(args.length,6);assert.equal(args[0],'--env-file');assert.equal(args[2],'--catalog-proof');assert.equal(args[4],'--out-dir');
const env=dotenv.parse(fs.readFileSync(args[1]));assert.equal(env.SQUARE_ENVIRONMENT,'sandbox');assert.ok(env.SQUARE_APP_ID.startsWith('sandbox-'));
const old=path.resolve(args[3]),out=path.resolve(args[5]);
assert.ok(out.startsWith('C:\\Users\\ccabr\\.codex\\private\\square_sandbox_20261110\\'.replaceAll('\\\\','\\')));
assert.equal(fs.existsSync(out),resume,'Use a new private output or explicitly resume the retained attempt');
if(resume){assert.equal(fs.existsSync(out+'/proof.json'),false,'This proof is already complete');assert.ok(Date.now()-fs.statSync(out+'/stock.request.private.json').mtimeMs<23*60*60*1000,'Retained idempotency window requires review');}
const previous=JSON.parse(fs.readFileSync(old+'/prepared.private.json')),priorReceipt=JSON.parse(fs.readFileSync(old+'/receipt.private.json'));
assert.equal(previous.testOnly,true);assert.equal(previous.scope.environment,'sandbox');
const client=new SquareClient({environment:'sandbox',accessToken:env.SQUARE_SANDBOX_ACCESS_TOKEN});
const write=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const load=name=>JSON.parse(fs.readFileSync(out+'/'+name));
const prepared=(name,build)=>{if(fs.existsSync(out+'/'+name))return load(name);const value=build();write(name,value);return value;};
console.log('REMOTE Square Sandbox: https://connect.squareupsandbox.com; test nonce only; no database access');
try{
 const merchant=await client.currentMerchant();assert.equal(merchant.id,previous.scope.merchantId);
 const locations=await client.locations(merchant.id);assert.ok(locations.some(row=>row.id===previous.scope.locationId));
 const locationId=previous.scope.locationId,variationId=priorReceipt.variationId;
 const item=await client.item(priorReceipt.itemId);assert.ok(item.item_data.name.startsWith('grookai Sandbox QR Test'));
 assert.equal(item.item_data.variations.find(row=>row.id===variationId).item_variation_data.sku,previous.sku);
 if(!resume){assert.equal(await client.inventoryQuantity(variationId,locationId),0);fs.mkdirSync(out,{mode:0o700});write('scope.private.json',{environment:'sandbox',merchantId:merchant.id,locationId,variationId,sku:previous.sku});}
 else assert.deepEqual(load('scope.private.json'),{environment:'sandbox',merchantId:merchant.id,locationId,variationId,sku:previous.sku});
 const stock=prepared('stock.request.private.json',()=>({idempotency_key:randomUUID(),ignore_unchanged_counts:true,changes:[{type:'PHYSICAL_COUNT',physical_count:{
  catalog_object_id:variationId,location_id:locationId,state:'IN_STOCK',quantity:'1',occurred_at:new Date().toISOString()}}]}));
 if(!fs.existsSync(out+'/stock.receipt.private.json')){await client.changeInventory(stock);assert.equal(await client.inventoryQuantity(variationId,locationId),1);write('stock.receipt.private.json',{quantity:1});}
 const create=prepared('order.request.private.json',()=>({idempotency_key:randomUUID(),order:{location_id:locationId,reference_id:'grookai-sandbox-qualification',line_items:[{catalog_object_id:variationId,quantity:'1'}]}}));
 const created=fs.existsSync(out+'/order.receipt.private.json')?load('order.receipt.private.json'):await client.sandboxTestMutation('order',create);
 if(!fs.existsSync(out+'/order.receipt.private.json'))write('order.receipt.private.json',created);
 assert.equal(created.order?.location_id,locationId);assert.equal(created.order.total_money.amount,2000);assert.equal(created.order.total_money.currency,'USD');
 const pay=prepared('payment.request.private.json',()=>({idempotency_key:randomUUID(),source_id:'cnon:card-nonce-ok',order_id:created.order.id,location_id:locationId,
  amount_money:{amount:2000,currency:'USD'},autocomplete:true,note:'grookai Sandbox integration qualification'}));
 const paid=fs.existsSync(out+'/payment.receipt.private.json')?load('payment.receipt.private.json'):await client.sandboxTestMutation('payment',pay);
 if(!fs.existsSync(out+'/payment.receipt.private.json'))write('payment.receipt.private.json',paid);
 const retry=await client.sandboxTestMutation('payment',pay);assert.equal(retry.payment.id,paid.payment.id);
 let order=await client.order(created.order.id);const payment=await client.payment(paid.payment.id);
 for(let attempt=0;attempt<12&&order.state!=='COMPLETED';attempt++){await new Promise(resolve=>setTimeout(resolve,1000));order=await client.order(created.order.id);}
 const evidence=squareOrderEvidence(order,[payment],{locationId,mappedVariationIds:[variationId]});
 assert.equal(evidence.state,'paid');assert.equal(evidence.lines.length,1);assert.equal(evidence.lines[0].saleCents,2000);
 let afterSale=await client.inventoryQuantity(variationId,locationId);
 for(let attempt=0;attempt<12&&afterSale!==0;attempt++){await new Promise(resolve=>setTimeout(resolve,1000));afterSale=await client.inventoryQuantity(variationId,locationId);}
 assert.equal(afterSale,0);if(!fs.existsSync(out+'/sale-evidence.private.json'))write('sale-evidence.private.json',evidence);
 const refundRequest=prepared('refund.request.private.json',()=>({idempotency_key:randomUUID(),payment_id:payment.id,amount_money:{amount:2000,currency:'USD'},reason:'grookai Sandbox integration qualification'}));
 const refunded=fs.existsSync(out+'/refund.receipt.private.json')?load('refund.receipt.private.json'):await client.sandboxTestMutation('refund',refundRequest);
 if(!fs.existsSync(out+'/refund.receipt.private.json'))write('refund.receipt.private.json',refunded);
 let refund=await client.refund(refunded.refund.id);
 for(let attempt=0;attempt<12&&refund.status==='PENDING';attempt++){await new Promise(resolve=>setTimeout(resolve,2000));refund=await client.refund(refund.id);}
 assert.equal(refund.status,'COMPLETED');
 const refundEvidence=squareRefundEvidence(refund,await client.payment(payment.id),{locationId});if(!fs.existsSync(out+'/refund-evidence.private.json'))write('refund-evidence.private.json',refundEvidence);
 const afterRefund=await client.inventoryQuantity(variationId,locationId);
 if(afterRefund!==0){
  const withdrawal={idempotency_key:randomUUID(),ignore_unchanged_counts:true,changes:[{type:'PHYSICAL_COUNT',physical_count:{
   catalog_object_id:variationId,location_id:locationId,state:'IN_STOCK',quantity:'0',occurred_at:new Date().toISOString()}}]};
  write('cleanup.request.private.json',withdrawal);await client.changeInventory(withdrawal);
 }
 assert.equal(await client.inventoryQuantity(variationId,locationId),0);
 const proof={pass:true,environment:'sandbox',verifiedAt:new Date().toISOString(),unchangedGrookaiQrSku:true,
  stockAllocated:1,stockAfterCompletedSale:afterSale,saleCents:2000,duplicatePaymentRequestSameId:true,
  completedRefundCents:refundEvidence.amountCents,stockAfterFinancialRefund:afterRefund,finalStock:0,
  productionRequests:0,databaseRequests:0,realCardCharged:false,oauthSellerBindingProven:false};
 write('proof.json',proof);console.log(JSON.stringify(proof));
}catch(error){
 const failure={pass:false,code:/^square_[a-z_]+$/.test(error?.code||'')?error.code:'sandbox_commerce_proof_incomplete',providerStatus:error?.status??null,uncertain:error?.uncertain===true};
 if(fs.existsSync(out))write('failure-'+Date.now()+'.json',failure);console.error(JSON.stringify(failure));process.exitCode=1;
}
