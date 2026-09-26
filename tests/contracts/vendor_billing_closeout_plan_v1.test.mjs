import test from 'node:test';import assert from 'node:assert/strict';
import {buildVendorCloseoutPlan,applyVendorCloseoutPlan,closeoutPlanHash} from '../../apps/web/src/lib/billing/vendorBillingCloseoutPlan.ts';
import {readCloseoutOptions,readCloseoutRequest} from '../../backend/billing/vendor_billing_closeout_config_v1.mjs';
const ownerId='a7000000-0000-4000-8000-000000000001';
function setup(){
 const now=Math.floor(Date.now()/1000),calls=[],holds=[];
 const config={scope:{accountId:'acct_fixture',livemode:false}};
 const context={ownerId,ticketHash:'a'.repeat(64),environment:'http://127.0.0.1:17621',implementationHash:'b'.repeat(64),createdAt:now};
 let account={owner_id:ownerId,stripe_account_id:'acct_fixture',livemode:false,customer_id:null,customer_attempt_id:ownerId,customer_creation_started_at:null,
  current_subscription_id:null,subscription_status:'none',entitlement_id:null,closeout_id:null,closeout_requested_at:null,closeout_paid_through:null};
 let archived=null,authMissing=false,claimHook=()=>{};
 const admin={auth:{admin:{async getUserById(id){calls.push('auth');return {data:{user:authMissing?null:{id}},error:null};}}},
  from(table){calls.push(['read',table]);const query={select(){return query;},eq(){return query;},in(){return query;},order(){return query;},limit(){return query;},
   async maybeSingle(){return {data:table==='vendor_billing_accounts'?structuredClone(account):table==='vendor_billing_closed_accounts'?archived:null,error:null};},
   then(resolve,reject){return Promise.resolve({data:table==='vendor_account_financial_holds'?structuredClone(holds):[],error:null}).then(resolve,reject);}};return query;},
  async rpc(name,params){calls.push(name);if(name==='vendor_billing_owner_fingerprint_v1')return {data:'c'.repeat(64),error:null};
   if(name==='vendor_billing_claim_v1'){claimHook();return {data:{...account,lease_token:params.p_claim_token,lease_fence:1},error:null};}
   if(name==='vendor_billing_release_v1')return {data:null,error:null};throw new Error('Unexpected mutation '+name);}};
 const stripe=new Proxy({},{get(){throw new Error('No provider calls allowed for unused reservation');}});
 return {now,admin,stripe,config,context,calls,holds,account,build:()=>buildVendorCloseoutPlan(admin,stripe,config,context),
  noAccount(){account=null;},archived(value){archived=value;},missing(){authMissing=true;},onClaim(fn){claimHook=fn;}};
}
test('read-only plan contains no raw owner/ticket/customer and no mutation',async()=>{
 const x=setup(),p=await x.build();assert.equal(p.decision,'close_billing');assert.equal(p.expiresAt-p.createdAt,900);assert.equal(JSON.stringify(p).includes(ownerId),false);
 assert.equal(x.calls.some(c=>typeof c==='string'&&c.startsWith('vendor_billing_')&&c!=='vendor_billing_owner_fingerprint_v1'),false);
 const {planSha256,...payload}=p;assert.equal(closeoutPlanHash(payload),planSha256);
});
test('key ordering does not affect plan fingerprints',()=>{assert.equal(closeoutPlanHash({a:1,b:{x:2,y:3}}),closeoutPlanHash({b:{y:3,x:2},a:1}));});
test('wrong Stripe scope fails before provider or lease work',async()=>{const x=setup();x.account.livemode=true;await assert.rejects(x.build(),e=>e.code==='billing_closeout_scope_mismatch');});
test('different existing closure ticket cannot be adopted',async()=>{const x=setup();x.account.closeout_ticket_hash='d'.repeat(64);await assert.rejects(x.build(),e=>e.code==='billing_closeout_ticket_mismatch');});
test('unknown customer creation requires recovery',async()=>{const x=setup();x.account.customer_creation_started_at=new Date().toISOString();await assert.rejects(x.build(),e=>e.code==='billing_recovery_required');});
test('missing Auth owner cannot receive a fresh plan',async()=>{const x=setup();x.missing();await assert.rejects(x.build(),e=>e.code==='billing_closeout_owner_missing');});
test('complete archived identity permits read-only result after Auth removal',async()=>{const x=setup();x.noAccount();x.missing();x.archived({id:ownerId,stripe_account_id:'acct_fixture',livemode:false,request_ticket_hash:'a'.repeat(64)});assert.equal((await x.build()).decision,'already_archived');});
test('retained archive from another scope cannot look like no billing',async()=>{const x=setup();x.noAccount();x.archived({stripe_account_id:'acct_other',livemode:false});await assert.rejects(x.build(),e=>e.code==='billing_closeout_scope_mismatch');});
test('bounded financial inventory rejects truncation',async()=>{const x=setup();x.holds.push(...Array.from({length:101},(_,id)=>({id})));await assert.rejects(x.build(),e=>e.code==='billing_closeout_inventory_incomplete');});
test('plan contains financial review obligation and detects hold changes',async()=>{const x=setup(),before=await x.build();x.holds.push({id:'hold',reason:'refund',reference_id:'private'});const p=await x.build();assert.deepEqual(p.reviewReasons,['financial_hold']);assert.notEqual(before.planSha256,p.planSha256);assert.equal(JSON.stringify(p).includes('private'),false);});
for(const age of [-1,900,901])test(`plan time rejects age ${age}`,async()=>{const x=setup();x.context.createdAt=x.now-age;await assert.rejects(x.build(),e=>e.code==='billing_closeout_plan_invalid');});
test('environment and implementation changes invalidate reviewed plan',async()=>{const x=setup(),p=await x.build();x.context.implementationHash='d'.repeat(64);await assert.rejects(applyVendorCloseoutPlan(x.admin,x.stripe,x.config,x.context,p,p.planSha256,p.planSha256),e=>e.code==='billing_closeout_plan_changed');assert.ok(!x.calls.includes('vendor_billing_claim_v1'));});
for(const kind of ['missing_ack','tampered_plan','wrong_expected'])test(`${kind} rejects before even reading`,async()=>{
 const x=setup(),p=await x.build();x.calls.length=0;const expected=kind==='wrong_expected'?'e'.repeat(64):p.planSha256;
 if(kind==='tampered_plan')p.actions=[];
 await assert.rejects(applyVendorCloseoutPlan(x.admin,x.stripe,x.config,x.context,p,expected,kind==='missing_ack'?'':expected),e=>e.code==='billing_closeout_ack_required');assert.deepEqual(x.calls,[]);
});
test('state change under account lease refuses before freeze and releases lease',async()=>{const x=setup(),p=await x.build();x.onClaim(()=>x.holds.push({id:'new_hold',reason:'refund'}));
 await assert.rejects(applyVendorCloseoutPlan(x.admin,x.stripe,x.config,x.context,p,p.planSha256,p.planSha256),e=>e.code==='billing_closeout_plan_changed');
 assert.ok(x.calls.includes('vendor_billing_claim_v1'));assert.ok(x.calls.includes('vendor_billing_release_v1'));assert.ok(!x.calls.includes('vendor_billing_request_closeout_v1'));
});
const env={SUPABASE_URL:'http://127.0.0.1:17621',SUPABASE_SECRET_KEY:'synthetic',STRIPE_ACCOUNT_ID:'acct_fixture',STRIPE_BILLING_MODE:'test'};
const args=['--request-file=private.json','--out-dir=private-output'];
test('operator defaults to read-only with processing disabled',()=>{assert.equal(readCloseoutOptions(env,args).apply,false);});
for(const extra of [['--apply'],['--apply=true'],['--force'],['--out-dir=again'],['--user-id='+ownerId],['--plan-file=plan.json']])test(`operator rejects ${extra[0]}`,()=>{assert.throws(()=>readCloseoutOptions(env,[...args,...extra]));});
test('apply requires separate enablement and identical argument/environment hash',()=>{
 const hash='a'.repeat(64),apply=[...args,'--apply','--plan-file=plan.json','--expected-plan-sha256='+hash];
 assert.throws(()=>readCloseoutOptions(env,apply));const enabled={...env,GROOKAI_VENDOR_BILLING_ENABLED:'true',GROOKAI_VENDOR_BILLING_CLOSEOUT_ENABLED:'true'};
 assert.throws(()=>readCloseoutOptions(enabled,apply));assert.equal(readCloseoutOptions({...enabled,GROOKAI_VENDOR_BILLING_CLOSEOUT_ACK:hash},apply).apply,true);
});
test('private request rejects extra or malformed authority',()=>{assert.deepEqual(readCloseoutRequest({ownerId,requestTicket:'ticket'}),{ownerId,requestTicket:'ticket'});for(const value of [{ownerId,requestTicket:'ticket',force:true},{ownerId:'invalid',requestTicket:'ticket'},{ownerId,requestTicket:'  '},null])assert.throws(()=>readCloseoutRequest(value));});
