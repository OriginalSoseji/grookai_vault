// Fixed isolated trial overlay. No linked CLI target or migration-ledger fabrication.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {out,root,verified,query} from './ops.mjs';
import {guard,hash,addition,output,sql} from '../../schema/vendor_preorders_runtime_v1.mjs';
const mode=process.argv[2];assert.equal(process.argv.length,3);
const selfHash=()=>hash(fs.readFileSync(new URL(import.meta.url)));
const planFile=path.join(out,'preorders-v2-plan.json'),payloadFile=path.join(out,'preorders-v2-payload.sql');
const save=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2),{flag:'wx'});
const footprint=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
async function state(){
 const p=await verified();assert.equal(p.id,'hrtbjchobencariqclab');
 const data=(await query(`select jsonb_build_object('new_table',to_regclass('public.vendor_preorders'),'orders',(select count(*) from vendor_orders),'billing',(select count(*) from vendor_billing_accounts),'sellers',(select count(*) from vendor_seller_accounts),'telemetry',(select count(*) from web_events),'web',(select web_enabled from vendor_store_rollout),'payments',(select onboarding_enabled from vendor_seller_rollout),'stock',(select reservations_enabled from vendor_stock_rollout),'checkout',(select orders_enabled from vendor_orders_rollout),'activate',pg_get_functiondef('public.vendor_pilot_activate_v1(text)'::regprocedure),'ledger',to_regclass('supabase_migrations.schema_migrations')) as state;`))[0].state;
 for(const key of ['orders','billing','sellers','telemetry'])assert.equal(data[key],0);
 assert.equal(data.ledger,null);
 for(const key of ['payments','stock','checkout'])assert.equal(data[key],false);
 return data;
}
function local(){const current=guard({full:true}),replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json'))),proof=JSON.parse(fs.readFileSync(path.join(output,'local-proof.json')));assert.equal(replay.status,'passed');assert.deepEqual(current.sourceHashes,replay.sourceHashes);assert.equal(proof.status,'passed');return current;}
if(mode==='plan'){
 assert.ok(!fs.existsSync(planFile));const localState=local(),before=await state();assert.equal(before.new_table,null);assert.equal(before.web,false);
 const activation=before.activate.replace('"store_web":false','"store_web":true');assert.notEqual(activation,before.activate);assert.equal(before.activate.split('"store_web":false').length,2);
 const migration=fs.readFileSync(path.join(root,'supabase/migrations',addition),'utf8');
 const payload=`begin;set local statement_timeout='60s';
 ${migration.replace(/^begin;$/m,'').replace(/^commit;$/m,'')}
 ${activation};
 update public.user_entitlements e set features=e.features||'{"store_web":true}'::jsonb where e.source='vendor_pilot_v1' and e.is_active and exists(select 1 from public.vendor_pilot_members m join public.vendor_pilot_invites i on i.id=m.invite_id where m.user_id=e.user_id and m.expires_at>now() and i.expires_at>now() and not i.revoked);
 update public.vendor_store_rollout set web_enabled=true;
 notify pgrst,'reload schema';commit;`;
 fs.writeFileSync(payloadFile,payload,{flag:'wx'});
 const remote=(await query(footprint))[0];save('preorders-v2-before-footprint.private.json',remote);
 save('preorders-v2-plan.json',{at:new Date().toISOString(),target:'hrtbjchobencariqclab',addition,sha256:hash(payload),footprintSha256:hash(JSON.stringify(remote.receipt.objects)),activationSha256:hash(before.activate),sourceHashes:localState.sourceHashes,toolHash:selfHash(),scope:'Add private preorder drafts; permit explicit trial web publication; no profile, store publication or payment activation',ledgerTreatment:'Existing trial is a schema bootstrap, not a linked migration ledger. Do not fabricate ledger rows.'});
 console.log('Planned isolated preorder drafts and explicit public-store option; nothing published.');
}else if(mode==='preflight'||mode==='apply'){
 const plan=JSON.parse(fs.readFileSync(planFile)),payload=fs.readFileSync(payloadFile,'utf8');assert.equal(plan.toolHash,selfHash());assert.equal(plan.target,'hrtbjchobencariqclab');assert.equal(plan.addition,addition);assert.equal(hash(payload),plan.sha256);assert.deepEqual(local().sourceHashes,plan.sourceHashes);
 const before=await state();assert.equal(before.new_table,null);assert.equal(before.web,false);assert.equal(hash(before.activate),plan.activationSha256);
 assert.equal(hash(JSON.stringify((await query(footprint))[0].receipt.objects)),plan.footprintSha256);
 const gateHash=hash(fs.readFileSync(path.join(root,'scripts/migration_preflight_strict.ps1')));
 if(mode==='preflight'){
  save('preorders-v2-preflight.json',{at:new Date().toISOString(),status:'passed',target:plan.target,sha256:plan.sha256,gateHash,localReplay:414,productionApplyAuthorized:false});
  console.log('PASS: fixed pilot overlay preflight; 414 local replay; zero production writes.');
 }else{
  const gate=JSON.parse(fs.readFileSync(path.join(out,'preorders-v2-preflight.json')));assert.equal(gate.status,'passed');assert.equal(gate.target,plan.target);assert.equal(gate.sha256,plan.sha256);assert.equal(gate.gateHash,gateHash);assert.ok(Date.now()-Date.parse(gate.at)<3600000);
  const protectedQuery=`select jsonb_build_object('profiles',coalesce((select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'[]'),'stores',coalesce((select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'[]'),'copies',coalesce((select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'[]')) as retained;`;
  const retained=(await query(protectedQuery))[0];save('preorders-v2-retained-before.private.json',retained);
  save('preorders-v2-apply-intent.json',{at:new Date().toISOString(),target:plan.target,sha256:plan.sha256});
  await query(payload);
  const after=await state();assert.equal(after.new_table,'vendor_preorders');assert.equal(after.web,true);assert.deepEqual((await query(protectedQuery))[0],retained);
  const remote=(await query(footprint))[0];save('preorders-v2-after-footprint.private.json',remote);
  const expected=JSON.parse(sql(footprint)).objects.filter(o=>o.key.startsWith('public.vendor_preorders'));
  assert.deepEqual(remote.receipt.objects.filter(o=>o.key.startsWith('public.vendor_preorders')),expected);
  const old=JSON.parse(fs.readFileSync(path.join(out,'preorders-v2-before-footprint.private.json'))).receipt.objects;
  const map=new Map(remote.receipt.objects.map(o=>[o.kind+'|'+o.key,o]));
  for(const o of old)if(!o.key.startsWith('public.vendor_pilot_activate_v1('))assert.deepEqual(map.get(o.kind+'|'+o.key),o);
  save('preorders-v2-applied.json',{at:new Date().toISOString(),target:plan.target,sha256:plan.sha256,addedObjects:expected.length,profilesStoresCopiesUnchanged:true,paymentCollection:false,webPublicationPermission:true,automaticPublication:false,productionWrites:0});
  console.log('Applied and verified only the isolated pilot: preorder drafts and opt-in web publication; existing profiles/stores/copies unchanged.');
 }
}else throw Error('Explicit plan/preflight/apply action required');
