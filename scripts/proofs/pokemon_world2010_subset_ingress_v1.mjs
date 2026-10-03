import fs from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import {VERSION,applyWorld2010SubsetLocal,reconcileWorld2010Subset,verifyWorld2010SubsetPreservation,assertWorld2010SubsetPending} from '../../backend/catalog/pokemon_world2010_subset_ingress_v1.mjs';
import {loadSubsetOriginals} from '../audits/pokemon_world2010_subset_ingress_v1.mjs';

const [state,planDir,name,out]=process.argv.slice(2);
assert.match(name??'',/^grookai_world2010_subset_[a-z0-9_]+$/);fs.mkdirSync(out);
const read=f=>JSON.parse(fs.readFileSync(f)),save=(f,v)=>fs.writeFileSync(out+'/'+f,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const plan=read(planDir+'/plan.json'),s=plan.input.ingress_snapshot,originals=loadSubsetOriginals();
const schema=read(state+'/batch-20261002-classic-qualification-v3/fixture-schema.json');
const url=new URL(process.env.DISCOVERY_INTAKE_PROOF_URL);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.equal(url.pathname,'/postgres');
const config={connectionString:url.toString(),ssl:false,connectionTimeoutMillis:15000};
const admin=new pg.Client(config);await admin.connect();assert.equal((await admin.query('select 1 from pg_database where datname=$1',[name])).rowCount,0);await admin.query(`create database ${name}`);await admin.end();
url.pathname='/'+name;config.connectionString=url.toString();const db=new pg.Client(config);await db.connect();const checks=[];
const tx=()=>db.query('begin isolation level serializable read write'),rollback=()=>db.query('rollback');
const apply=()=>applyWorld2010SubsetLocal(db,plan,originals);
const snapshot=async()=>{const data={};for(const table of ['tcgcsv_source_products','raw_imports','external_discovery_candidates','ingestion_jobs','card_prints','external_mappings','canon_warehouse_candidates','sealed_product_source_mappings'])data[table]=(await db.query(`select to_jsonb(t) row from public.${table} t order by to_jsonb(t)::text`)).rows;return data;};
try{
  for(const table of ['tcgcsv_source_products','raw_imports','external_discovery_candidates','ingestion_jobs']){
    const cols=schema.columns.filter(c=>c.table_name===table);assert.ok(cols.length);
    for(const c of cols)assert.match(c.column_name,/^[a-z_]+$/);
    for(const c of cols.filter(c=>c.default_expression?.includes('nextval(')))await db.query(`create sequence ${table}_${c.column_name}_seq start 1000000`);
    await db.query(`create table public.${table} (${cols.map(c=>`"${c.column_name}" ${c.type}${c.not_null?' not null':''}${c.default_expression?' default '+c.default_expression:''}`).join(',')})`);
  }
  await db.query(`create table public.card_prints(id uuid primary key,tcgplayer_id text,external_ids jsonb);
    create table public.canon_warehouse_candidates(tcgplayer_id text);
    create table public.external_mappings(active boolean,source text,external_id text);
    create table public.sealed_product_source_mappings(source_provider text,source_product_id bigint,source_category_id int,mapping_status text,promotion_authorized boolean);`);
  for(const c of schema.constraints.filter(c=>c.contype!=='f'||c.table_name==='external_discovery_candidates').sort((a,b)=>Number(a.contype==='f')-Number(b.contype==='f')))
    await db.query(`alter table public.${c.table_name} add constraint ${c.conname} ${c.definition}`);
  await db.query('insert into tcgcsv_source_products select * from jsonb_populate_recordset(null::tcgcsv_source_products,$1::jsonb)',[JSON.stringify(s.group_products)]);
  for(const r of s.group_raw)await db.query('insert into raw_imports(id,source,status,payload) values($1,$2,$3,$4)',[r.id,r.source,r.status,JSON.stringify(r.payload)]);
  await db.query('insert into external_discovery_candidates select * from jsonb_populate_recordset(null::external_discovery_candidates,$1::jsonb)',[JSON.stringify(s.group_discovery)]);
  const baseline=await snapshot();save('baseline.json',baseline);
  await tx();const trial=await apply();assert.equal(trial.inserted,83);await rollback();assert.deepEqual(await snapshot(),baseline);checks.push('83raw83discovery1atomicledger rollback preserves every baseline row');
  for(const prefix of ['insert into public.external_discovery_candidates','insert into public.ingestion_jobs']){
    await tx();await assert.rejects(()=>applyWorld2010SubsetLocal({query:async(q,a)=>{if(q.startsWith(prefix))throw Error('injected_atomic_failure');return db.query(q,a);}},plan,originals),/injected_atomic_failure/);
    await rollback();assert.deepEqual(await snapshot(),baseline);checks.push('injected failure before '+prefix+' rolls back all writes');
  }
  const newId=String(plan.entries[0].source.product_id),outside=plan.outside_product_ids[0],held=plan.held[0].product_id;
  for(const id of [newId,outside,held]){await tx();await db.query("update tcgcsv_source_products set name='drift' where product_id=$1",[id]);await assert.rejects(apply,/complete_group_source_drift/);await rollback();checks.push('source drift rejected for '+(id===newId?'selected':id===outside?'outside':'held'));}
  for(const d of [s.discovery[0],s.group_discovery.find(d=>!s.products.some(p=>String(p.product_id)===String(d.tcgplayer_id)))]){
    await tx();await db.query("update external_discovery_candidates set normalized_name='drift' where id=$1",[d.id]);await assert.rejects(apply,/whole_group_retained_discovery_drift/);await rollback();
    await tx();await db.query("update raw_imports set payload=payload||'{\"drift\":true}'::jsonb where id=$1",[d.raw_import_id]);await assert.rejects(apply,/whole_group_retained_raw_drift/);await rollback();
  } checks.push('selected and outside retained discovery/raw payload mutations reject whole scope');
  await tx();await db.query("insert into raw_imports(source,status,payload) values('tcgcsv','processed',$1)",[JSON.stringify({tcgplayerId:newId})]);await assert.rejects(apply,/whole_group_retained_raw_drift/);await rollback();checks.push('unbound raw receipt blocks ingress');
  for(const external of [newId,`tcgcsv:2282:${newId}`,`tcgcsv:3:${newId}`]){
    await tx();await db.query("insert into external_mappings values(false,'tcgcsv',$1)",[external]);await assert.rejects(apply,/new_relationship_requires_reconciliation/);await rollback();
  }checks.push('inactive numeric and both namespaced mapping collisions block ingress');
  const concurrent=new pg.Client(config);await concurrent.connect();
  try{
    await tx();await apply();
    for(const [label,sql,params]of[
      ['outside source',"update tcgcsv_source_products set name='concurrent' where product_id=$1",[outside]],
      ['held source',"update tcgcsv_source_products set name='concurrent' where product_id=$1",[held]],
      ['retained raw',"update raw_imports set payload=payload||'{\"concurrent\":true}'::jsonb where id=$1",[s.group_raw[0].id]],
      ['source phantom','insert into tcgcsv_source_products select * from jsonb_populate_record(null::tcgcsv_source_products,$1::jsonb)',[JSON.stringify({...s.group_products[0],product_id:999999999,raw_payload:{...s.group_products[0].raw_payload,productId:999999999}})]]]){
      await concurrent.query('begin');await concurrent.query("set local lock_timeout='100ms'");await assert.rejects(()=>concurrent.query(sql,params),e=>e.code==='55P03');await concurrent.query('rollback');checks.push(label+' concurrent mutation blocked');
    }
    await rollback();assert.deepEqual(await snapshot(),baseline);
    await concurrent.query('begin');await concurrent.query("set local lock_timeout='100ms'");await concurrent.query('update tcgcsv_source_products set name=name where product_id=$1',[outside]);await concurrent.query('rollback');checks.push('source freeze releases after rollback');
    for(const lock of ['pokemon_warehouse_discovery_intake_v1','pokemon_warehouse_group_intake_v1','pokemon_world2010_subset_ingress_v1']){
      await tx();await db.query('select pg_advisory_xact_lock(hashtext($1))',[lock]);await concurrent.query('begin isolation level serializable');await concurrent.query("set local lock_timeout='100ms'");await assert.rejects(()=>applyWorld2010SubsetLocal(concurrent,plan,originals),e=>e.code==='55P03');await concurrent.query('rollback');await rollback();checks.push(lock+' excludes competing writer');
    }
  }finally{await concurrent.end();}
  await tx();const pending=await apply();save('pending.json',pending);
  // PostgreSQL commits, but the caller deliberately loses the acknowledgement.
  await assert.rejects(async()=>{await db.query('commit');throw Error('lost_commit_acknowledgement');},/lost_commit_acknowledgement/);
  const independent=new pg.Client(config);await independent.connect();let reconciled;
  try{await independent.query('begin isolation level repeatable read read only');reconciled=await reconcileWorld2010Subset(independent,plan);await independent.query('commit');}finally{await independent.end();}
  assertWorld2010SubsetPending(pending,reconciled);save('independent-readback.json',reconciled);checks.push('lost acknowledgement independently reconciled with exact83raw83candidate and ledger IDs');
  const after=await snapshot();
  for(const table of Object.keys(baseline)){
    const added=after[table].filter(r=>!baseline[table].some(b=>JSON.stringify(b)===JSON.stringify(r)));
    assert.ok(baseline[table].every(b=>after[table].some(r=>JSON.stringify(r)===JSON.stringify(b))),'existing_row_changed:'+table);
    assert.equal(added.length,{raw_imports:83,external_discovery_candidates:83,ingestion_jobs:1}[table]??0,'unexpected_table_write:'+table);
  }checks.push('exact167 inserts in3tables; zero updates/deletes;2001sources and77retained lineages unchanged');
  await tx();const repeated=await apply();await db.query('commit');assert.equal(repeated.inserted,0);assert.deepEqual(await snapshot(),after);checks.push('same successful package repeat produces zero writes');
  await tx();await db.query("update ingestion_jobs set payload=jsonb_set(payload,'{generated_rows,0,raw_import_id}','\"9007199254740993\"'::jsonb) where id=$1",[pending.ledger_id]);await assert.rejects(()=>reconcileWorld2010Subset(db,plan),/generated_row_journal_drift/);await rollback();checks.push('changed exact generated raw identity rejects recovery');
  await tx();await db.query('delete from ingestion_jobs where id=$1',[pending.ledger_id]);await assert.rejects(()=>reconcileWorld2010Subset(db,plan),/unjournaled_ingress/);await rollback();checks.push('missing atomic ledger cannot be interpreted as safe retry');
  await tx();await db.query('update ingestion_jobs set id=id+1000000 where id=$1',[pending.ledger_id]);const replaced=await reconcileWorld2010Subset(db,plan);assert.throws(()=>assertWorld2010SubsetPending(pending,replaced),/pending_ledger_identity_drift/);await rollback();checks.push('identical payload with replacement ledger identity rejected against pending receipt');
  await tx();await db.query("update external_discovery_candidates set normalized_name='drift' where id=$1",[plan.entries[0].candidate_id]);await assert.rejects(()=>reconcileWorld2010Subset(db,plan),/candidate_readback/);await rollback();checks.push('new candidate drift rejects reconciliation');
  await verifyWorld2010SubsetPreservation(db,plan);assert.deepEqual(await snapshot(),after);
  const complete={at:new Date().toISOString(),status:'isolated_subset_ingress_sql_qualified',database:name,server_version:(await db.query('show server_version')).rows[0].server_version,
    scope:'captured raw/discovery/source/job columns and constraints; synthetic relationship collision tables, not full canonical/Auth/runtime replay',checks,plan_fingerprint:plan.fingerprint,inserted:167,updates:0,deletes:0,new_raw:83,new_discovery:83,retained_group_lineages:77,held:17,outside_source_products:1892,production_writes:0,relationships_repaired:0};
  save('complete.json',complete);console.log(JSON.stringify(complete));
}catch(e){await rollback().catch(()=>{});save('failure.json',{at:new Date().toISOString(),checks,error:e.stack,production_writes:0});throw e;}finally{await db.end();}
