import fs from 'node:fs';import assert from 'node:assert/strict';import pg from 'pg';
import {buildGroupDiscoveryIntakePlan,applyDiscoveryIntakeBatch,verifyDiscoveryIntakeBatch,verifyGroupPreservation} from '../../backend/catalog/pokemon_warehouse_group_intake_v1.mjs';
const [inputDir,name,out]=process.argv.slice(2);assert.match(name??'',/^grookai_group_intake_[a-z0-9_]+$/);assert.ok(out);fs.mkdirSync(out);
const snapshot=JSON.parse(fs.readFileSync(inputDir+'/snapshot.json')),schema=JSON.parse(fs.readFileSync(inputDir+'/fixture-schema.json'));
const url=new URL(process.env.DISCOVERY_INTAKE_PROOF_URL);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.equal(url.pathname,'/postgres');
const config={connectionString:url.toString(),ssl:false};const admin=new pg.Client(config);await admin.connect();assert.equal((await admin.query('select 1 from pg_database where datname=$1',[name])).rowCount,0);await admin.query(`create database ${name}`);await admin.end();url.pathname='/'+name;config.connectionString=url.toString();
const db=new pg.Client(config);await db.connect();const checks=[];
const save=(file,value)=>fs.writeFileSync(out+'/'+file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
try{
 for(const table of ['tcgcsv_source_products','raw_imports','external_discovery_candidates','ingestion_jobs']){
  const cols=schema.columns.filter(c=>c.table_name===table);assert.ok(cols.length);
  for(const c of cols)assert.match(c.column_name,/^[a-z_]+$/);
  const serial=cols.filter(c=>c.default_expression?.includes('nextval('));
  for(const c of serial)await db.query(`create sequence ${table}_${c.column_name}_seq start 1000000`);
  await db.query(`create table public.${table} (${cols.map(c=>`"${c.column_name}" ${c.type}${c.not_null?' not null':''}${c.default_expression?' default '+c.default_expression:''}`).join(',')})`);
 }
 await db.query(`create table public.card_prints(id uuid primary key,tcgplayer_id text,external_ids jsonb);
 create table public.canon_warehouse_candidates(tcgplayer_id text);
 create table public.external_mappings(active boolean,source text,external_id text);
 create table public.sealed_product_source_mappings(source_provider text,source_product_id bigint,source_category_id int,mapping_status text,promotion_authorized boolean);`);
 for(const c of schema.constraints.filter(c=>c.contype!=='f'||c.table_name==='external_discovery_candidates').sort((a,b)=>Number(a.contype==='f')-Number(b.contype==='f')))await db.query(`alter table public.${c.table_name} add constraint ${c.conname} ${c.definition}`);
 for(const [table,rows]of Object.entries({tcgcsv_source_products:snapshot.products,external_discovery_candidates:[]}))await db.query(`insert into public.${table} select * from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(rows)]);
 for(const r of snapshot.raw)await db.query('insert into raw_imports(id,source,status,payload) values($1,$2,$3,$4)',[r.id,r.source,r.status,JSON.stringify(r.payload)]);
 await db.query('insert into external_discovery_candidates select * from jsonb_populate_recordset(null::external_discovery_candidates,$1::jsonb)',[JSON.stringify(snapshot.discovery)]);
 const products=(await db.query('select * from tcgcsv_source_products order by product_id')).rows,discovery=(await db.query('select * from external_discovery_candidates order by id')).rows;
 const plan=buildGroupDiscoveryIntakePlan({observed_at:snapshot.observed_at,category_id:3,group_id:23323,expected_product_ids:products.map(p=>String(p.product_id)),products,coverage_rows:snapshot.coverage_rows,raw_receipts:snapshot.raw,discovery});
 assert.equal(plan.entries.length,21);assert.equal(plan.retained.length,81);save('plan.json',plan);
 const authorization={approved:true,plan_fingerprint:plan.fingerprint,operator:'automated isolated SQL proof',request:'synthetic local qualification only'};
 const tx=()=>db.query('begin isolation level serializable read write');
 const apply=()=>applyDiscoveryIntakeBatch(db,plan,plan.entries,{authorization});
 const count=async()=>Number((await db.query('select count(*) n from raw_imports')).rows[0].n);
 await tx();await apply();await db.query('rollback');assert.equal(await count(),81);checks.push('whole21 raw/discovery rollback;81 retained lineages unchanged');
 await tx();await assert.rejects(()=>applyDiscoveryIntakeBatch({query:async(q,a)=>{if(q.startsWith('insert into public.external_discovery_candidates'))throw new Error('injected_after_raw');return db.query(q,a);}},plan,plan.entries,{authorization}),/injected_after_raw/);await db.query('rollback');assert.equal(await count(),81);checks.push('failure between raw and discovery rolls back whole group');
 const first=String(plan.entries[0].source.product_id);
 await tx();await db.query("update tcgcsv_source_products set name='changed' where product_id=$1",[first]);await assert.rejects(apply,/whole_group_source_drift/);await db.query('rollback');checks.push('any source change rejects frozen group');
 await tx();await db.query("update external_discovery_candidates set normalized_name='changed' where id=$1",[discovery[0].id]);await assert.rejects(apply,/retained_discovery_drift/);await db.query('rollback');checks.push('retained81 discovery drift rejects group');
 await tx();await db.query("insert into raw_imports(source,status,payload) values('tcgcsv','processed',$1)",[JSON.stringify({tcgplayerId:first})]);await assert.rejects(apply,/whole_group_raw_drift/);await db.query('rollback');checks.push('unbound raw receipt rejects duplicate ingress');
 for(const external of [first,`tcgcsv:23323:${first}`]){await tx();await db.query("insert into external_mappings values(true,'tcgcsv',$1)",[external]);await assert.rejects(apply,/new_relationship_requires_fresh_plan/);await db.query('rollback');}checks.push('new numeric and exact namespaced relationships reject stale plan');
 await tx();await assert.rejects(()=>applyDiscoveryIntakeBatch(db,plan,plan.entries.slice(0,1),{authorization}),/whole_group_atomic_batch_required/);await db.query('rollback');checks.push('one-card or partial apply rejected');
 const concurrent=new pg.Client(config);await concurrent.connect();
 try{
  await tx();await apply();
  for(const [label,sql,params] of [
   ['retained raw receipt mutation',"update raw_imports set payload=payload||'{\"changed\":true}'::jsonb where id=$1",[snapshot.raw[0].id]],
   ['retained discovery mutation',"update external_discovery_candidates set normalized_name='concurrent' where id=$1",[discovery[0].id]],
   ['existing source mutation',"update tcgcsv_source_products set name='concurrent' where product_id=$1",[first]],
   ['new source phantom insert','insert into tcgcsv_source_products select * from jsonb_populate_record(null::tcgcsv_source_products,$1::jsonb)',[JSON.stringify({...products[0],product_id:999999999,raw_payload:{...products[0].raw_payload,productId:999999999}})]],
  ]){
   await concurrent.query('begin');await concurrent.query("set local lock_timeout='100ms'");
   await assert.rejects(()=>concurrent.query(sql,params),e=>e.code==='55P03');
   await concurrent.query('rollback');checks.push(label+' blocked until group transaction ends');
  }
  await db.query('rollback');assert.equal(await count(),81);
  // Locks must release on rollback; normal source/raw workers can progress again.
  await concurrent.query('begin');await concurrent.query("set local lock_timeout='100ms'");
  await concurrent.query('update raw_imports set payload=payload where id=$1',[snapshot.raw[0].id]);
  await concurrent.query('update tcgcsv_source_products set name=name where product_id=$1',[first]);
  await concurrent.query('rollback');checks.push('source and raw locks release after rollback');
 }finally{await concurrent.end();}
 await tx();await apply();await db.query('commit');assert.equal(await count(),102);checks.push('all21 committed atomically');
 const independent=new pg.Client(config);await independent.connect();try{await independent.query('begin isolation level repeatable read read only');await verifyGroupPreservation(independent,plan);const rows=await verifyDiscoveryIntakeBatch(independent,plan,plan.entries);assert.equal(rows.length,21);await independent.query('commit');save('independent-readback.json',{rows});}finally{await independent.end();}checks.push('independent read-only readback reconciles lost commit acknowledgement;81 preserved');
 await tx();const repeated=await apply();await db.query('commit');assert.ok(repeated.every(r=>r.status==='already_succeeded'));assert.equal(await count(),102);checks.push('exact same successful package repeats with zero new rows');
 const contender=new pg.Client(config);await contender.connect();try{await tx();await db.query("select pg_advisory_xact_lock(hashtext('pokemon_warehouse_discovery_intake_v1'))");await contender.query('begin isolation level serializable');await contender.query("set local lock_timeout='100ms'");await assert.rejects(()=>applyDiscoveryIntakeBatch(contender,plan,plan.entries,{authorization}),e=>e.code==='55P03');await contender.query('rollback');await db.query('rollback');}finally{await contender.end();}checks.push('shared lock excludes independent hourly intake');
 await tx();await db.query("update external_discovery_candidates set normalized_name='changed' where id=$1",[plan.entries[0].candidate_id]);await assert.rejects(apply,/discovery_readback:normalized_name/);await db.query('rollback');checks.push('changed new candidate cannot silently replay');
 await verifyGroupPreservation(db,plan);const report={status:'passed',at:new Date().toISOString(),database:name,scope:'production-shaped raw/discovery/source tables and checks; synthetic unrelated relationship tables; no full schema replay',checks,raw_rows:await count(),new_discoveries:21,retained_discoveries:81};save('proof.json',report);console.log(JSON.stringify(report));
}catch(e){await db.query('rollback').catch(()=>{});save('failure.json',{checks,error:e.stack});throw e;}finally{await db.end();}
