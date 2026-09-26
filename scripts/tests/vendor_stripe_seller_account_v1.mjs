// Explicit REAL Stripe TEST provider proof. Not part of offline test dispatch.
// Resume the current retained attempt; never rotate identity after uncertainty.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifiedClient,dir,accountId,safeError} from '../stripe/vendor_stripe_test_account_v1.mjs';
import {createSellerAccount,recoverSellerAccount,createSellerOnboardingLink,SELLER_CONTROLLER} from '../../apps/web/src/lib/payments/vendorSellerEnrollment.ts';
import {readVerifiedSellerReadiness} from '../../apps/web/src/lib/payments/vendorSellerStripeGateway.ts';

assert.equal(process.argv.length,3);
const action=process.argv[2];assert.ok(['prepare','link','readiness'].includes(action));
const originalFile=path.join(dir,'seller-fixture.json'),successorFile=path.join(dir,'seller-fixture-connect-enabled.json'),compatibilityFile=path.join(dir,'seller-fixture-v1-enabled.json');
const file=fs.existsSync(compatibilityFile)?compatibilityFile:fs.existsSync(successorFile)?successorFile:originalFile,fixture=JSON.parse(fs.readFileSync(file,'utf8'));
if(file!==originalFile){
 const compatibility=file===compatibilityFile,previous=compatibility?successorFile:originalFile;
 assert.equal(fixture.supersedes?.attemptId,compatibility?'073f885b-9aa0-4bea-9343-4f1c5d54d4dd':'cbabcd5a-764c-4874-8ed5-8b4a1c3b6e8a');
 assert.equal(fixture.supersedes?.reason,compatibility?'cached_accounts_v1_policy_rejection':'cached_connect_registration_rejection');
 assert.equal(fixture.supersedes?.originalSha256,createHash('sha256').update(fs.readFileSync(previous)).digest('hex'));
 assert.equal(fixture.supersedes?.emptyInventoryVerified,true);
 assert.notEqual(fixture.attemptId,fixture.supersedes.attemptId);
}
assert.equal(fixture.platformAccountId,accountId);assert.equal(fixture.livemode,false);
assert.equal(fixture.id,'2e9820c8-d4d6-4c82-b2f4-bb61d2790ca3');
if(file===originalFile)assert.equal(fixture.attemptId,'cbabcd5a-764c-4874-8ed5-8b4a1c3b6e8a');
assert.deepEqual(fixture.controller,SELLER_CONTROLLER);
const save=()=>fs.writeFileSync(file,JSON.stringify(fixture,null,2));
try {
 const stripe=await verifiedClient(),config={scope:{accountId,livemode:false},secretKey:'',webhookSecret:''};
 const now=()=>Math.floor(Date.now()/1000);
 if(action==='prepare') {
  let candidate=fixture.connectedAccountId??fixture.candidateAccountId;
  if(!candidate){
   const found=[];let cursor;
   for(let page=0;page<10;page++){
    const list=await stripe.accounts.list({limit:100,...(cursor?{starting_after:cursor}:{})});
    found.push(...list.data.filter(a=>a.metadata?.grookai_seller_binding===fixture.id&&a.metadata?.grookai_seller_attempt===fixture.attemptId));
    if(!list.has_more)break;assert.ok(list.data.length&&page<9,'Account inventory is incomplete');cursor=list.data.at(-1).id;
   }
   assert.ok(found.length<=1,'Ambiguous original attempt');candidate=found[0]?.id;
  }
  if(candidate)fixture.connectedAccountId=await recoverSellerAccount(stripe,config,fixture,fixture.ownerId,candidate,now());
  else {
   const create=stripe.accounts.create.bind(stripe.accounts);
   stripe.accounts.create=async(...args)=>{try{const a=await create(...args);fixture.candidateAccountId=a.id;save();return a;}catch(e){
    console.error(JSON.stringify({stage:'create-test-account',type:e.type,code:e.code??null,param:e.param??null,status:e.statusCode,
     helpLinks:(String(e.message??'').match(/https:\/\/[^\s)]+/g)??[]).flatMap(link=>{try{const u=new URL(link);return ['dashboard.stripe.com','docs.stripe.com'].includes(u.hostname)&&!u.username&&!u.password?[u.origin+u.pathname]:[];}catch{return [];}}),
     replayed:e.headers?.['idempotent-replayed']??null,requestId:/^req_[A-Za-z0-9]+$/.test(e.requestId??'')?e.requestId:null,
     message:String(e.message??'').replace(/(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+/g,'[credential]').replace(/https?:\/\/\S+/g,'[provider-link]').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,500)}));throw e;}};
   fixture.connectedAccountId=await createSellerAccount(stripe,config,fixture,fixture.ownerId,now);
  }
  save();console.log(JSON.stringify({status:'bound',accountId,mode:'test',connectedAccountId:fixture.connectedAccountId,attemptId:fixture.attemptId,originalEvidenceRetained:true}));
 } else {
  assert.ok(fixture.connectedAccountId,'Original seller must be independently bound first');
  await recoverSellerAccount(stripe,config,fixture,fixture.ownerId,fixture.connectedAccountId,now());
  const readiness=await readVerifiedSellerReadiness(stripe,config,fixture,fixture.ownerId);
  const at=new Date().toISOString();
  if(action==='link'){
   const url=await createSellerOnboardingLink(stripe,config,fixture,fixture.ownerId,fixture.connectedAccountId,'http://127.0.0.1:24440',now);
   fs.writeFileSync(path.join(dir,'seller-onboarding.json'),JSON.stringify({at,url,readiness},null,2));
   console.log(JSON.stringify({status:'private-link-saved',mode:'test',capabilitiesReady:readiness.capabilitiesReady}));
  } else {
   fs.writeFileSync(path.join(dir,'seller-readiness-'+at.replaceAll(/[:.]/g,'-')+'.json'),JSON.stringify({at,readiness},null,2),{flag:'wx'});
   console.log(JSON.stringify({at,readiness}));
  }
 }
}catch(error){console.error(JSON.stringify(safeError(error)));process.exitCode=1;}
