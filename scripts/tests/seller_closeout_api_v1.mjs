// Real local binding/holds/leases + private CLI. All Stripe transport is synthetic.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {root,fixture,project,output,hash,guard,sql} from '../schema/seller_bindings_runtime_v1.mjs';
import {createSellerCloseoutRepository,buildSellerCloseoutPlan,applySellerCloseoutPlan} from '../../apps/web/src/lib/payments/vendorSellerCloseout.ts';
import {financialFixture} from '../../tests/helpers/vendorSellerFinancialFixture.mjs';
assert.equal(process.argv.length,2);const source=guard({full:true});assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'replay.json'))).sourceHashes,source.sourceHashes);
assert.equal(sql("select (select count(*) from vendor_seller_accounts)||'|'||(select count(*) from vendor_seller_events)||'|'||(select count(*) from vendor_account_financial_holds);"),'0|0|0');
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));assert.equal(cfg.API_URL,'http://127.0.0.1:18821');
const client=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}),admin=client(cfg.SECRET_KEY),repo=createSellerCloseoutRepository(admin);
const f=financialFixture(Math.floor(Date.now()/1000)),users=[],accounts=[],checks=[],stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),dir=path.join(fixture,`seller-closeout-${stamp}`);fs.mkdirSync(dir);
const ok=async p=>{const r=await p;assert.equal(r.error,null,r.error?.message);return r.data;};let failure;
try{
 sql('update vendor_store_rollout set app_enabled=true;update vendor_seller_rollout set onboarding_enabled=true;');
 for(let i=0;i<2;i++){
  const email=`seller-closeout-${i}@fixture.invalid`,password=randomUUID()+randomUUID(),user=(await ok(admin.auth.admin.createUser({email,password,email_confirm:true}))).user;
  users.push(user.id);const store=(await ok(admin.from('vendor_stores').insert({owner_id:user.id,slug:`seller-closeout-${i}`,display_name:'Synthetic closeout'}).select('id').single())).id;
  await ok(admin.from('user_entitlements').insert({user_id:user.id,tier:'vendor',role:'vendor',features:{store_app:true}}));
  const a=await repo.reserve(user.id,store,f.config.scope,f.binding.controller),token=randomUUID(),claimed=await repo.claim(a.id,token),lease={id:a.id,token,fence:claimed.lease_fence};
  await repo.prepare(lease);await repo.bind(lease,i===0?f.binding.connectedAccountId:'acct_cliSeller');await repo.release(lease);accounts.push(await repo.account(user.id));
  const signedIn=client(cfg.PUBLISHABLE_KEY);await ok(signedIn.auth.signInWithPassword({email,password}));
  assert.ok((await signedIn.rpc('vendor_seller_freeze_v1',{p_id:a.id,p_token:randomUUID(),p_fence:1,p_closeout_id:randomUUID()})).error);
 }
 checks.push('authenticated_clients_cannot_freeze');
 const a=accounts[0];Object.assign(f.binding,{id:a.id,ownerId:a.owner_id,storeId:a.store_id});
 const hold=(await ok(admin.from('vendor_account_financial_holds').insert({owner_id:a.owner_id,reason:'refund',reference_id:randomUUID()}).select('id').single())).id;
 const c={ownerId:a.owner_id,closeoutId:randomUUID(),ticketHash:'a'.repeat(64),environment:cfg.API_URL,implementationHash:'b'.repeat(64),createdAt:f.now};
 const plan=await buildSellerCloseoutPlan(repo,f.stripe,f.config,c,()=>f.now);assert.ok(plan.reviewReasons.includes('financial_hold'));assert.equal((await repo.account(a.owner_id)).state,'bound');
 assert.equal((await applySellerCloseoutPlan(repo,f.stripe,f.config,c,plan,plan.planSha256,()=>f.now)).state,'frozen_retained');
 const after=await repo.account(a.owner_id);assert.equal(after.state,'closing');assert.equal(after.closeout_id,c.closeoutId);assert.equal(after.lease_token,null);
 assert.equal((await ok(admin.from('vendor_account_financial_holds').select('id').eq('id',hold))).length,1);
 const count=f.calls.length;await applySellerCloseoutPlan(repo,f.stripe,f.config,c,plan,plan.planSha256,()=>f.now);assert.equal(f.calls.length,count);
 assert.ok((await admin.auth.admin.deleteUser(a.owner_id)).error);assert.equal((await repo.account(a.owner_id)).state,'closing');
 const t=randomUUID(),claimed=await repo.claim(a.id,t),lease={id:a.id,token:t,fence:claimed.lease_fence};await assert.rejects(repo.prepare(lease),/seller_creation_blocked/);await repo.release(lease);
 checks.push('real_fenced_freeze_idempotent_retry_hold_and_auth_retention');
 // Exercise the actual private command, including source-hash plans, bad ACK,
 // successful freeze, and response-loss retry. Child sockets are loopback-only.
 const cli=accounts[1],requestFile=path.join(dir,'request-private.json');fs.writeFileSync(requestFile,JSON.stringify({ownerId:cli.owner_id,closeoutId:randomUUID(),requestTicket:'synthetic-cli-closeout-ticket'}),{flag:'wx'});
 const adapter=path.join(dir,'stripe-read-only-fixture.mjs');
 fs.writeFileSync(adapter,`import assert from 'node:assert/strict';import Stripe from ${JSON.stringify(pathToFileURL(path.join(root,'apps/web/node_modules/stripe/esm/stripe.esm.node.js')).href)};
const s=new Stripe('sk_test_fixtureOnly');
Object.getPrototypeOf(s.accounts).retrieve=async id=>{assert.ok(id===null||id==='acct_cliSeller');return id===null?{object:'account',id:'acct_reviewPlatform'}:{object:'account',id,controller:${JSON.stringify(f.account.controller)}};};
Object.getPrototypeOf(s.balance).retrieve=async(p,o)=>{assert.ok(!o||o.stripeAccount==='acct_cliSeller');return {object:'balance',livemode:false,available:[],pending:[]};};
for(const r of [s.paymentIntents,s.refunds,s.disputes,s.payouts,s.checkout.sessions,s.charges])Object.getPrototypeOf(r).list=async(p,o)=>{assert.equal(p.limit,100);assert.equal(o.stripeAccount,'acct_cliSeller');return {object:'list',data:[],has_more:false};};`,{flag:'wx'});
 const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles'])if(process.env[key])env[key]=process.env[key];
 const empty=path.join(dir,'empty.env');fs.writeFileSync(empty,'');Object.assign(env,{DOTENV_CONFIG_PATH:empty,SUPABASE_URL:cfg.API_URL,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,
  GROOKAI_VENDOR_SELLER_CLOSEOUT_ENABLED:'true',STRIPE_PAYMENTS_MODE:'test',STRIPE_ACCOUNT_ID:f.config.scope.accountId,STRIPE_SECRET_KEY:f.config.secretKey,STRIPE_CONNECT_WEBHOOK_SECRET:f.config.webhookSecret,
  NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 const worker=path.join(root,'backend/payments/vendor_seller_closeout_worker_v1.mjs');
 function cliRun(name,args,extra={}){const r=spawnSync(process.execPath,['--experimental-strip-types','--import',pathToFileURL(adapter).href,worker,'--request-file='+requestFile,'--out-dir='+path.join(dir,name),...args],{cwd:root,env:{...env,...extra},encoding:'utf8',windowsHide:true,timeout:30000});fs.writeFileSync(path.join(dir,name+'.log'),r.stdout+r.stderr,{flag:'wx'});return r;}
 assert.equal(cliRun('plan',[]).status,0);const planFile=path.join(dir,'plan/plan.json'),reviewed=JSON.parse(fs.readFileSync(planFile));assert.equal(reviewed.decision,'freeze_and_retain');assert.equal((await repo.account(cli.owner_id)).state,'bound');
 const argv=['--apply','--plan-file='+planFile,'--expected-plan-sha256='+reviewed.planSha256];assert.equal(cliRun('wrong-ack',argv,{GROOKAI_VENDOR_SELLER_CLOSEOUT_ACK:'0'.repeat(64)}).status,1);assert.equal((await repo.account(cli.owner_id)).state,'bound');
 assert.equal(cliRun('apply',argv,{GROOKAI_VENDOR_SELLER_CLOSEOUT_ACK:reviewed.planSha256}).status,0);assert.equal((await repo.account(cli.owner_id)).state,'closing');
 assert.equal(cliRun('retry',argv,{GROOKAI_VENDOR_SELLER_CLOSEOUT_ACK:reviewed.planSha256}).status,0);
 const result=JSON.parse(fs.readFileSync(path.join(dir,'apply/result.json')));assert.equal(result.deletionPermitted,false);assert.equal(result.providerMutations,0);assert.equal(result.authRemoved,false);
 checks.push('actual_cli_plan_bad_ack_freeze_and_lost_response_retry');
}catch(e){failure=e;}finally{
 for(const owner of users){assert.match(owner,/^[0-9a-f-]{36}$/);await ok(admin.from('vendor_account_financial_holds').delete().eq('owner_id',owner));sql(`begin;set local session_replication_role=replica;delete from vendor_seller_accounts where owner_id='${owner}';set local session_replication_role=origin;commit;`);await ok(admin.auth.admin.deleteUser(owner));}
 sql('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false;update vendor_seller_rollout set onboarding_enabled=false;');guard({full:true});
 assert.equal(sql("select (select count(*) from vendor_seller_accounts)||'|'||(select count(*) from vendor_seller_events)||'|'||(select count(*) from vendor_account_financial_holds);"),'0|0|0');
 const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,providerRequests:0,providerMutations:0,fixturesRemoved:true,rolloutEnabled:false,
  sourceHashes:Object.fromEntries(['apps/web/src/lib/payments/vendorSellerFinancialReview.ts','apps/web/src/lib/payments/vendorSellerCloseout.ts','backend/payments/vendor_seller_closeout_config_v1.mjs','backend/payments/vendor_seller_closeout_worker_v1.mjs'].map(p=>[p,hash(fs.readFileSync(path.join(root,p)))])),runnerSha256:hash(fs.readFileSync(new URL(import.meta.url)))};
 fs.writeFileSync(path.join(output,`closeout-api-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}if(failure)throw failure;
