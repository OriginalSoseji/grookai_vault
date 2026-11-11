// Read-only current-provider normalization/refund-poll proof for the existing
// completed Sandbox test sale. Never creates an order/payment/refund or uses DB.
import fs from 'node:fs';import assert from 'node:assert/strict';import dotenv from 'dotenv';
import {SquareClient} from './client_v1.mjs';import {squareOrderEvidence,squareRefundEvidence} from './order_evidence_v2.mjs';
const args=process.argv.slice(2);assert.equal(args.length,6);assert.equal(args[0],'--env-file');assert.equal(args[2],'--commerce-proof');assert.equal(args[4],'--out-dir');
const env=dotenv.parse(fs.readFileSync(args[1]));assert.equal(env.SQUARE_ENVIRONMENT,'sandbox');assert.ok(env.SQUARE_APP_ID.startsWith('sandbox-'));
const prior=args[3],out=args[5];assert.ok(out.replaceAll('\\','/').startsWith('C:/Users/ccabr/.codex/private/square_sandbox_20261110/'));assert.equal(fs.existsSync(out),false);
const old=JSON.parse(fs.readFileSync(prior+'/proof.json'));assert.equal(old.pass,true);assert.equal(old.environment,'sandbox');
const scope=JSON.parse(fs.readFileSync(prior+'/scope.private.json')),orderId=JSON.parse(fs.readFileSync(prior+'/order.receipt.private.json')).order.id,
 paymentId=JSON.parse(fs.readFileSync(prior+'/payment.receipt.private.json')).payment.id,refundId=JSON.parse(fs.readFileSync(prior+'/refund.receipt.private.json')).refund.id;
fs.mkdirSync(out,{recursive:false,mode:0o700});
const write=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
try{
 const client=new SquareClient({environment:'sandbox',accessToken:env.SQUARE_SANDBOX_ACCESS_TOKEN});
 assert.equal((await client.currentMerchant()).id,scope.merchantId);assert.ok((await client.locations(scope.merchantId)).some(l=>l.id===scope.locationId));
 const order=await client.order(orderId),payment=await client.payment(paymentId),refund=await client.refund(refundId);
 const evidence=squareOrderEvidence(order,[payment],{locationId:scope.locationId,mappedVariationIds:[scope.variationId]});
 assert.equal(evidence.state,'paid');assert.equal(evidence.lines[0].saleCents,2000);assert.ok(Number.isFinite(Date.parse(evidence.payments[0].createdAt)));
 const refundEvidence=squareRefundEvidence(refund,payment,{locationId:scope.locationId});assert.equal(refundEvidence.status,'COMPLETED');
 const begin=new Date(Date.parse(payment.created_at)-3600000).toISOString(),until=new Date().toISOString();
 const listed=await client.recentRefunds(scope.locationId,begin,until,begin);assert.ok(listed.some(r=>r.id===refundId&&r.status==='COMPLETED'));
 write('normalized-evidence.private.json',{order:evidence,refund:refundEvidence});
 const proof={pass:true,environment:'sandbox',verifiedAt:new Date().toISOString(),actualProviderRead:true,paymentCreationPresent:true,
  independentUpdatedRefundPoll:true,originalSaleRetainedAfterRefund:true,saleCents:2000,productionRequests:0,databaseRequests:0,providerMutations:0,oauthSellerBindingProven:false};
 write('proof.json',proof);console.log(JSON.stringify(proof));
}catch(error){write('failure.json',{pass:false,code:/^square_[a-z_]+$/.test(error.code??'')?error.code:'sandbox_read_proof_failed'});console.error(error.code??error.name);process.exitCode=1;}
