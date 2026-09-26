// Explicit one-time TEST fixture recovery after verified Connect registration.
// No production binding reset. Never use for uncertain outcomes or nonempty inventory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {verifiedClient,dir,accountId,safeError} from '../stripe/vendor_stripe_test_account_v1.mjs';
import {createSellerAccount,SELLER_CONTROLLER} from '../../apps/web/src/lib/payments/vendorSellerEnrollment.ts';
assert.ok(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--v1-support'));
const compatibility=process.argv[2]==='--v1-support';
const originalFile=path.join(dir,compatibility?'seller-fixture-connect-enabled.json':'seller-fixture.json'),successorFile=path.join(dir,compatibility?'seller-fixture-v1-enabled.json':'seller-fixture-connect-enabled.json');
assert.ok(!fs.existsSync(successorFile),'Recovery already recorded; use ordinary prepare');
const original=fs.readFileSync(originalFile),a=JSON.parse(original);
assert.equal(a.platformAccountId,accountId);assert.equal(a.livemode,false);
assert.equal(a.id,'2e9820c8-d4d6-4c82-b2f4-bb61d2790ca3');
assert.equal(a.attemptId,compatibility?'073f885b-9aa0-4bea-9343-4f1c5d54d4dd':'cbabcd5a-764c-4874-8ed5-8b4a1c3b6e8a');
assert.deepEqual(a.controller,SELLER_CONTROLLER);
assert.ok(!a.connectedAccountId&&!a.candidateAccountId,'Existing candidate needs read-only recovery');
try {
 const stripe=await verifiedClient(),now=()=>Math.floor(Date.now()/1000);
 assert.ok(now()-a.startedAt<23*3600,'Expired attempts cannot be retried');
 const inventory=await stripe.accounts.list({limit:100});
 assert.equal(inventory.has_more,false);assert.equal(inventory.data.length,0,'Inventory must be completely empty');
 let evidence;
 const create=stripe.accounts.create.bind(stripe.accounts);
 stripe.accounts.create=async(...args)=>{try{
  const result=await create(...args);
  // If original unexpectedly succeeds, retain it and stop. Never create a successor.
  fs.writeFileSync(originalFile,JSON.stringify({...a,candidateAccountId:result.id},null,2));
  return result;
 }catch(e){
  if(e.type==='StripeInvalidRequestError'&&e.statusCode===400&&e.headers?.['idempotent-replayed']==='true'&&
    (compatibility?/^Stripe no longer recommends Accounts v1 for new Connect integrations\./:/^You can only create new accounts if you've signed up for Connect,/).test(e.message??'')&&/^req_[A-Za-z0-9]+$/.test(e.requestId??''))
   evidence={requestId:e.requestId,status:400,replayed:true,reason:compatibility?'cached_accounts_v1_policy_rejection':'cached_connect_registration_rejection'};
  throw e;
 }};
 await createSellerAccount(stripe,{scope:{accountId,livemode:false},secretKey:'',webhookSecret:''},a,a.ownerId,now).catch(()=>{});
 assert.ok(evidence,'Only the exact cached terminal registration rejection allows successor');
 assert.deepEqual(fs.readFileSync(originalFile),original,'Original candidate changed; stop');
 const after=await stripe.accounts.list({limit:100});
 assert.equal(after.has_more,false);assert.equal(after.data.length,0);
 const successor={...a,attemptId:randomUUID(),startedAt:now(),supersedes:{...evidence,attemptId:a.attemptId,
  originalSha256:createHash('sha256').update(original).digest('hex'),at:new Date().toISOString(),emptyInventoryVerified:true}};
 fs.writeFileSync(successorFile,JSON.stringify(successor,null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'successor-prepared',mode:'test',attemptId:successor.attemptId,supersedes:successor.supersedes,accountsCreated:0}));
}catch(e){console.error(JSON.stringify(safeError(e)));process.exitCode=1;}
