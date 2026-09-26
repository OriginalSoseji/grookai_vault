// Fixed pilot overlay; no linked project, ledger fabrication, or production apply.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {out,root,query,verified} from './ops.mjs';
import {guard,hash,sql,output} from '../../schema/vendor_batch_private_copy_runtime_v1.mjs';
const mode=process.argv[2];assert.equal(process.argv.length,3);
const additions=['20260923040000_vendor_batch_commit_v1.sql','20260923050000_vendor_batch_private_copy_v1.sql'];
const prefix='batch-commit-v1-';
const read=name=>JSON.parse(fs.readFileSync(path.join(out,prefix+name+'.json')));
const save=(name,value)=>fs.writeFileSync(path.join(out,prefix+name+'.json'),JSON.stringify(value,null,2),{flag:'wx'});
const footprint=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
const retainedSql=`select jsonb_build_object('profiles',coalesce((select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'[]'),'stores',coalesce((select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'[]'),'copies',coalesce((select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'[]'),'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'[]')) as retained;`;
const selfHash=()=>hash(fs.readFileSync(new URL(import.meta.url)));
function local(){
 const current=guard({full:true}),replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));
 assert.equal(replay.status,'passed');assert.deepEqual(current.sourceHashes,replay.sourceHashes);
 const candidate=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/vendor_batch_commit_v1/local-candidate-20260923.json')));
 assert.equal(candidate.status,'local_candidate_passed');
 for(const [file,digest] of Object.entries(candidate.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,file);
 return current;
}
async function state(){
 assert.equal((await verified()).id,'hrtbjchobencariqclab');
 const s=(await query(`select to_regclass('public.vendor_batch_intake_receipts') as intake,to_regclass('supabase_migrations.schema_migrations') as ledger,(select count(*)::int from vendor_orders) as orders,(select count(*)::int from vendor_billing_accounts) as billing,(select count(*)::int from vendor_seller_accounts) as sellers,(select count(*)::int from web_events) as telemetry,(select onboarding_enabled from vendor_seller_rollout) as payments,(select reservations_enabled from vendor_stock_rollout) as stock,(select orders_enabled from vendor_orders_rollout) as checkout,(select public from storage.buckets where id='user-card-images') as public_bucket;`))[0];
 assert.equal(s.ledger,null);assert.equal(s.public_bucket,false);
 for(const k of ['orders','billing','sellers','telemetry'])assert.equal(s[k],0,k);
 for(const k of ['payments','stock','checkout'])assert.equal(s[k],false,k);
 return s;
}
if(mode==='plan'){
 assert.ok(!fs.existsSync(path.join(out,prefix+'plan.json')));
 const current=local();assert.equal((await state()).intake,null);
 const before=(await query(footprint))[0].receipt.objects;
 const expected=JSON.parse(sql(footprint)).objects.filter(o=>o.key.startsWith('public.vendor_batch_intake_'));
 assert.equal(expected.length,28);
 const payload='begin;set local statement_timeout=\'60s\';set local lock_timeout=\'5s\';\n'+additions.map(name=>fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8').replace(/^begin;\r?$/m,'').replace(/^commit;\r?$/m,'')).join('\n')+'\ncommit;';
 fs.writeFileSync(path.join(out,prefix+'payload.sql'),payload,{flag:'wx'});
 save('before-footprint.private',before);save('expected',expected);
 save('plan',{at:new Date().toISOString(),target:'hrtbjchobencariqclab',additions,sourceHashes:current.sourceHashes,toolHash:selfHash(),payloadHash:hash(payload),beforeHash:hash(JSON.stringify(before)),expectedHash:hash(JSON.stringify(expected)),scope:'Add private scan receipts and disabled rollout only; preserve inventory, profiles, entitlements, publication and payments',ledgerTreatment:'Pilot bootstrap overlay; no migration ledger rows fabricated'});
 console.log('Planned two exact pilot migrations; no database writes.');
}else if(['preflight','apply'].includes(mode)){
 const plan=read('plan'),payload=fs.readFileSync(path.join(out,prefix+'payload.sql'),'utf8');
 assert.equal(plan.target,'hrtbjchobencariqclab');assert.deepEqual(plan.additions,additions);assert.equal(plan.toolHash,selfHash());assert.equal(plan.payloadHash,hash(payload));
 assert.deepEqual(local().sourceHashes,plan.sourceHashes);assert.equal((await state()).intake,null);
 assert.equal(hash(JSON.stringify((await query(footprint))[0].receipt.objects)),plan.beforeHash);
 const gateHash=hash(fs.readFileSync(path.join(root,'scripts/migration_preflight_strict.ps1')));
 if(mode==='preflight'){
  save('preflight',{at:new Date().toISOString(),status:'passed',target:plan.target,payloadHash:plan.payloadHash,gateHash,localReplay:417,productionApplyAuthorized:false});
  console.log('PASS fixed pilot overlay: 417 replay, exact source and remote fingerprint.');
 }else{
  const gate=read('preflight');assert.equal(gate.status,'passed');assert.equal(gate.target,plan.target);assert.equal(gate.payloadHash,plan.payloadHash);assert.equal(gate.gateHash,gateHash);assert.ok(Date.now()-Date.parse(gate.at)<3600000);
  const retained=(await query(retainedSql))[0];save('retained-before.private',retained);
  save('apply-intent',{at:new Date().toISOString(),target:plan.target,payloadHash:plan.payloadHash});
  await query(payload);
  assert.equal((await state()).intake,'vendor_batch_intake_receipts');
  assert.deepEqual((await query(retainedSql))[0],retained);
  const after=(await query(footprint))[0].receipt.objects;save('after-footprint.private',after);
  const before=read('before-footprint.private'),expected=read('expected');assert.equal(hash(JSON.stringify(expected)),plan.expectedHash);
  assert.deepEqual(after.filter(o=>o.key.startsWith('public.vendor_batch_intake_')),expected);
  const map=new Map(after.map(o=>[o.kind+'|'+o.key,o]));for(const old of before)assert.deepEqual(map.get(old.kind+'|'+old.key),old);
  assert.equal(after.length,before.length+expected.length);
  assert.equal((await query('select enabled from public.vendor_batch_intake_control'))[0].enabled,false);
  save('applied',{at:new Date().toISOString(),status:'passed',target:plan.target,payloadHash:plan.payloadHash,addedObjects:expected.length,priorObjectsUnchanged:before.length,retainedDataUnchanged:true,batchEnabled:false,productionWrites:0});
  console.log('Applied and verified 28 pilot objects; existing data unchanged; batch adding remains off.');
 }
}else throw Error('Explicit plan/preflight/apply required');
