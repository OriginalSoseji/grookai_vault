import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash,randomBytes} from 'node:crypto';
import {root,out,target,query} from './ops.mjs';import {sql} from '../../schema/vendor_order_resolutions_runtime_v1.mjs';
assert.equal(process.argv.length,3);const mode=process.argv[2],p=target(),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(p.id,'hrtbjchobencariqclab');
if(mode==='plan'){
 assert.ok(!fs.existsSync(path.join(out,'access-v2-plan.json')));
 const base=sql("select pg_get_functiondef('public.vendor_store_capabilities_v1(uuid)'::regprocedure);");assert.ok(base.startsWith('CREATE OR REPLACE FUNCTION public.vendor_store_capabilities_v1('));
 const payload=fs.readFileSync(path.join(root,'scripts/preview/vendor-pilot/access.sql'),'utf8').replace('-- __BASE_CAPABILITIES__',base.replace('FUNCTION public.vendor_store_capabilities_v1(','FUNCTION public.vendor_pilot_base_capabilities_v1(')+';');
 fs.writeFileSync(path.join(out,'access-v2.sql'),payload,{flag:'wx'});fs.writeFileSync(path.join(out,'access-v2-plan.json'),JSON.stringify({at:new Date().toISOString(),target:p.id,sha256:hash(payload),scope:'invitation-capped own-account trial; no web publication or payment capability'},null,2),{flag:'wx'});console.log(JSON.stringify({planned:true,target:p.id}));
}else if(mode==='apply'){
 assert.ok(!fs.existsSync(path.join(out,'access-v2-applied.json')));const payload=fs.readFileSync(path.join(out,'access-v2.sql'),'utf8'),plan=JSON.parse(fs.readFileSync(path.join(out,'access-v2-plan.json'),'utf8'));assert.equal(plan.target,p.id);assert.equal(hash(payload),plan.sha256);
 const rows=await query("begin read only;select (select count(*) from auth.users) as users,to_regclass('public.vendor_pilot_invites') as existing;rollback;");assert.equal(Number(rows[0].users),0);assert.equal(rows[0].existing,null);
 await query(payload);fs.writeFileSync(path.join(out,'access-v2-applied.json'),JSON.stringify({at:new Date().toISOString(),target:p.id,sha256:plan.sha256},null,2),{flag:'wx'});console.log(JSON.stringify({applied:true,target:p.id}));
}else throw Error('Explicit plan/apply required');
