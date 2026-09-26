import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {randomBytes,createHash} from 'node:crypto';
import {root,out,target,query,api} from './ops.mjs';import {sql} from '../../schema/vendor_order_resolutions_runtime_v1.mjs';
assert.equal(process.argv.length,3);const mode=process.argv[2],p=target(),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(p.id,'hrtbjchobencariqclab');
const quote=x=>"'"+String(x).replaceAll("'","''")+"'";
if(mode==='plan'){
 assert.ok(!fs.existsSync(path.join(out,'seed-v2-plan.json')),'Do not replace retained plan');
 const tables=JSON.parse(sql("select json_agg(tablename order by tablename) from pg_tables where schemaname='public' and (tablename ~ '^vendor_.*(rollout|control)$' or tablename in ('games','finish_keys','catalog_game_release_controls','binder_feature_flags'));"));
 let statements=[];const counts={};
 tables.sort((a,b)=>(a==='games'?-2:a==='finish_keys'?-1:0)-(b==='games'?-2:b==='finish_keys'?-1:0)||a.localeCompare(b));
 for(const table of tables){assert.match(table,/^[a-z_]+$/);const rows=JSON.parse(sql(`select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.${table} t;`));counts[table]=rows.length;if(!rows.length)continue;assert.ok(rows.length<=100);const cols=Object.keys(rows[0]).map(c=>'"'+c+'"').join(',');statements.push(`insert into public.${table} (${cols}) select ${cols} from jsonb_populate_recordset(null::public.${table},${quote(JSON.stringify(rows))}::jsonb);`);}
 const buckets=JSON.parse(sql("select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)),'[]') from storage.buckets;"));
 statements.push(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) select id,name,public,file_size_limit,allowed_mime_types from jsonb_populate_recordset(null::storage.buckets,${quote(JSON.stringify(buckets))}::jsonb);`);
 const policies=JSON.parse(sql("select coalesce(jsonb_agg(to_jsonb(p)),'[]') from pg_policies p where schemaname='storage';"));
 for(const pol of policies){const id=x=>'"'+x.replaceAll('"','""')+'"';statements.push(`create policy ${id(pol.policyname)} on storage.${id(pol.tablename)} as ${pol.permissive} for ${pol.cmd} to ${pol.roles.map(id).join(',')} ${pol.qual?'using ('+pol.qual+')':''} ${pol.with_check?'with check ('+pol.with_check+')':''};`);}
 const payload=`begin;set local statement_timeout='90s';${statements.join('\n')}commit;`;
 fs.writeFileSync(path.join(out,'seed-v2.sql'),payload,{flag:'wx'});fs.writeFileSync(path.join(out,'seed-v2-plan.json'),JSON.stringify({target:p.id,sha256:hash(payload),counts,buckets:buckets.map(b=>({id:b.id,public:b.public})),storagePolicies:policies.length},null,2),{flag:'wx'});
 console.log(JSON.stringify({planned:true,counts,buckets:buckets.length,storagePolicies:policies.length}));
}else if(mode==='apply'){
 assert.ok(!fs.existsSync(path.join(out,'seed-v2-applied.json')));const plan=JSON.parse(fs.readFileSync(path.join(out,'seed-v2-plan.json'),'utf8')),payload=fs.readFileSync(path.join(out,'seed-v2.sql'),'utf8');assert.equal(plan.target,p.id);assert.equal(hash(payload),plan.sha256);
 const rows=await query("begin read only;select (select count(*) from vendor_store_rollout) as rollouts,(select count(*) from auth.users) as users;rollback;");assert.equal(Number(rows[0].rollouts),0);assert.equal(Number(rows[0].users),0);await query(payload);
 const result=await query("begin read only;select to_jsonb(r) as store from vendor_store_rollout r;select to_jsonb(r) as seller from vendor_seller_rollout r;select to_jsonb(r) as stock from vendor_stock_rollout r;select to_jsonb(r) as orders from vendor_orders_rollout r;rollback;");
 fs.writeFileSync(path.join(out,'seed-v2-applied.json'),JSON.stringify({at:new Date().toISOString(),target:p.id,sha256:plan.sha256,result},null,2),{flag:'wx'});console.log(JSON.stringify({seeded:true,target:p.id}));
}else if(mode==='keys'){
 const keys=await api(`/v1/projects/${p.id}/api-keys`);fs.writeFileSync(path.join(out,'keys.private.json'),JSON.stringify(keys,null,2),{flag:'wx'});console.log(JSON.stringify({saved:true,keyNames:keys.map(k=>k.name)}));
}else throw Error('Explicit plan/apply/keys required');
