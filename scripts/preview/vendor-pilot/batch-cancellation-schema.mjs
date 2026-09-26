// One-use, hash-bound overlay for the isolated vendor trial only.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {out,root,query,verified} from './ops.mjs';
import {guard,hash,output,addition} from '../../schema/vendor_batch_cancellation_runtime_v1.mjs';
const mode=process.argv[2];assert.equal(process.argv.length,3);
const prefix='batch-cancellation-v1-',target='hrtbjchobencariqclab';
const read=n=>JSON.parse(fs.readFileSync(path.join(out,prefix+n+'.json')));
const save=(n,v)=>fs.writeFileSync(path.join(out,prefix+n+'.json'),JSON.stringify(v,null,2),{flag:'wx'});
const footprint=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
const retainedSql=`select jsonb_build_object('profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'entitlements',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'receipts',(select jsonb_agg(to_jsonb(r) order by owner_id,store_id,batch_id,item_id) from vendor_batch_intake_receipts r),'batch',(select enabled from vendor_batch_intake_control)) as retained;`;
const selfHash=()=>hash(fs.readFileSync(new URL(import.meta.url)));
function local(){
 const current=guard({full:true}),replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));
 assert.equal(replay.status,'passed');assert.equal(replay.applied,418);assert.deepEqual(current.sourceHashes,replay.sourceHashes);
 const proof=JSON.parse(fs.readFileSync(path.join(output,'local-candidate-20260923.json')));assert.equal(proof.status,'local_candidate_passed');
 for(const [file,digest] of Object.entries(proof.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,file);
 assert.equal(replay.changedObjects.length,2);assert.equal(replay.addedObjects.length,14);assert.equal(replay.removedObjects.length,0);
 return {current,replay,proof};
}
async function state(){
 assert.equal((await verified()).id,target);
 const s=(await query(`select to_regclass('public.vendor_batch_intake_cancellations') as cancellation,to_regclass('supabase_migrations.schema_migrations') as ledger,(select count(*)::int from vendor_orders) as orders,(select count(*)::int from vendor_billing_accounts) as billing,(select count(*)::int from vendor_seller_accounts) as sellers,(select count(*)::int from web_events) as telemetry,(select onboarding_enabled from vendor_seller_rollout) as payments,(select reservations_enabled from vendor_stock_rollout) as stock,(select orders_enabled from vendor_orders_rollout) as checkout,(select public from storage.buckets where id='user-card-images') as public_bucket;`))[0];
 assert.equal(s.ledger,null);for(const k of ['orders','billing','sellers','telemetry'])assert.equal(s[k],0,k);for(const k of ['payments','stock','checkout','public_bucket'])assert.equal(s[k],false,k);return s;
}
if(mode==='plan'){
 assert.ok(!fs.existsSync(path.join(out,prefix+'plan.json')));const {current,replay}=local();assert.equal((await state()).cancellation,null);
 const before=(await query(footprint))[0].receipt.objects;
 const expected=[...replay.changedObjects,...replay.addedObjects];
 const payload=fs.readFileSync(path.join(root,'supabase/migrations',addition),'utf8');
 save('before-footprint.private',before);save('expected',expected);fs.writeFileSync(path.join(out,prefix+'payload.sql'),payload,{flag:'wx'});
 save('plan',{at:new Date().toISOString(),target,addition,sourceHashes:current.sourceHashes,toolHash:selfHash(),payloadHash:hash(payload),beforeHash:hash(JSON.stringify(before)),expectedHash:hash(JSON.stringify(expected)),scope:'Cancellation authority only; preserve all owner inventory, publication, grants and existing receipts; no ledger fabrication'});console.log('Cancellation overlay planned without remote writes.');
}else if(['preflight','apply'].includes(mode)){
 const plan=read('plan'),payload=fs.readFileSync(path.join(out,prefix+'payload.sql'),'utf8');assert.equal(plan.target,target);assert.equal(plan.addition,addition);assert.equal(plan.toolHash,selfHash());assert.equal(plan.payloadHash,hash(payload));assert.deepEqual(local().current.sourceHashes,plan.sourceHashes);assert.equal((await state()).cancellation,null);
 assert.equal(hash(JSON.stringify((await query(footprint))[0].receipt.objects)),plan.beforeHash);
 const gateHash=hash(fs.readFileSync(path.join(root,'scripts/migration_preflight_strict.ps1')));
 if(mode==='preflight'){save('preflight',{at:new Date().toISOString(),status:'passed',target,payloadHash:plan.payloadHash,gateHash,localReplay:418,productionApplyAuthorized:false});console.log('PASS fixed cancellation overlay; no apply.');}
 else{
  const gate=read('preflight');assert.equal(gate.status,'passed');assert.equal(gate.target,target);assert.equal(gate.payloadHash,plan.payloadHash);assert.equal(gate.gateHash,gateHash);assert.ok(Date.now()-Date.parse(gate.at)<3600000);
  const retained=(await query(retainedSql))[0];save('retained-before.private',retained);save('apply-intent',{at:new Date().toISOString(),target,payloadHash:plan.payloadHash});
  await query(payload);assert.equal((await state()).cancellation,'vendor_batch_intake_cancellations');assert.deepEqual((await query(retainedSql))[0],retained);
  const after=(await query(footprint))[0].receipt.objects;save('after-footprint.private',after);
  const before=read('before-footprint.private'),expected=read('expected');assert.equal(hash(JSON.stringify(expected)),plan.expectedHash);
  const key=o=>o.kind+'|'+o.key,map=new Map(after.map(o=>[key(o),o])),changed=new Map(expected.map(o=>[key(o),o]));
  for(const old of before)assert.deepEqual(map.get(key(old)),changed.get(key(old))??old);for(const o of expected)assert.deepEqual(map.get(key(o)),o);assert.equal(after.length,before.length+14);
  save('applied',{at:new Date().toISOString(),status:'passed',target,payloadHash:plan.payloadHash,addedObjects:14,changedFunctions:2,priorObjectsUnchanged:before.length-2,retainedDataUnchanged:true,productionWrites:0});console.log('Cancellation overlay applied and verified; retained data unchanged.');
 }
}else throw Error('Explicit plan/preflight/apply required');
