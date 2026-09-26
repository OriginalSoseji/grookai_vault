// Read-only recovery after the local Docker engine stopped during final readback.
// Never re-executes the consumed overlay apply.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {out,root,verified,query} from './ops.mjs';
import {sourceState,hash,output} from '../../schema/vendor_preorders_runtime_v1.mjs';
assert.equal(process.argv.length,2);assert.equal((await verified()).id,'hrtbjchobencariqclab');
const plan=JSON.parse(fs.readFileSync(path.join(out,'preorders-v2-plan.json'))),intent=JSON.parse(fs.readFileSync(path.join(out,'preorders-v2-apply-intent.json'))),replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));
assert.equal(intent.sha256,plan.sha256);assert.equal(plan.sha256,hash(fs.readFileSync(path.join(out,'preorders-v2-payload.sql'))));assert.deepEqual(sourceState(),replay.sourceHashes);assert.deepEqual(plan.sourceHashes,replay.sourceHashes);assert.equal(replay.status,'passed');
const remote=(await query(fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8')))[0].receipt.objects;
assert.deepEqual(remote.filter(o=>o.key.startsWith('public.vendor_preorders')),replay.addedObjects);
const old=JSON.parse(fs.readFileSync(path.join(out,'preorders-v2-before-footprint.private.json'))).receipt.objects,map=new Map(remote.map(o=>[o.kind+'|'+o.key,o]));
for(const o of old)if(!o.key.startsWith('public.vendor_pilot_activate_v1('))assert.deepEqual(map.get(o.kind+'|'+o.key),o);
const retained=(await query(`select jsonb_build_object('profiles',coalesce((select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'[]'),'stores',coalesce((select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'[]'),'copies',coalesce((select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'[]')) as retained;`))[0];
assert.deepEqual(retained,JSON.parse(fs.readFileSync(path.join(out,'preorders-v2-retained-before.private.json'))));
const state=(await query(`select (select web_enabled from vendor_store_rollout) as web,(select count(*)::int from vendor_orders) as orders,(select count(*)::int from web_events) as telemetry,to_regclass('supabase_migrations.schema_migrations') as ledger,pg_get_functiondef('public.vendor_pilot_activate_v1(text)'::regprocedure) as activate;`))[0];
assert.equal(state.web,true);assert.equal(state.orders,0);assert.equal(state.telemetry,0);assert.equal(state.ledger,null);assert.ok(state.activate.includes('"store_web":true'));assert.ok(!state.activate.includes('"store_web":false'));
const result={at:new Date().toISOString(),target:plan.target,sha256:plan.sha256,addedObjects:replay.addedObjects.length,profilesStoresCopiesUnchanged:true,paymentCollection:false,webPublicationPermission:true,automaticPublication:false,productionWrites:0,verification:'Fresh remote objects match the completed 414-file local replay receipt. Apply was not repeated.',localDocker:'Engine became unavailable after remote commit. No restart/reset performed; a fresh empty/off guard is not claimed.'};
fs.writeFileSync(path.join(out,'preorders-v2-applied.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
