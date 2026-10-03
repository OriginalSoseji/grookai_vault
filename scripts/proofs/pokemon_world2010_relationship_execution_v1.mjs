import fs from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import {VERSION,applyWorld2010RelationshipsLocal,reconcileWorld2010Relationships,assertWorld2010RelationshipPending} from '../../backend/catalog/pokemon_world2010_relationship_execution_v1.mjs';
import {loadSubsetOriginals} from '../audits/pokemon_world2010_subset_ingress_v1.mjs';
import {readPokemonWarehouseSnapshot,reconcilePokemonWarehouse} from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';
import {replayWorld2010Dependencies} from './pokemon_world2010_dependency_schema_v1.mjs';
import {readWorld2010InboundCatalog,observeWorld2010Dependencies,assertWorld2010DependenciesPreserved} from '../../backend/catalog/pokemon_world2010_dependency_preservation_v1.mjs';

const [state,planDir,observationDir,name,out,dependencyInputDir,schemaFile]=process.argv.slice(2);
assert.equal(Boolean(dependencyInputDir),Boolean(schemaFile),'both_dependency_inputs_required');
assert.match(name??'',/^grookai_world2010_subset_canonical_[a-z0-9_]+$/);assert.ok(name.length<=63);fs.mkdirSync(out);
const read=f=>JSON.parse(fs.readFileSync(f)),save=(f,v)=>fs.writeFileSync(out+'/'+f,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const plan=read(planDir+'/plan.json'),observation=read(observationDir+'/first.json'),s=plan.input.ingress.input.ingress_snapshot,originals=loadSubsetOriginals();
const proof=read(state+'/classic-dependency-replay-v5/proof.json'),binding=read(state+'/classic-dependency-replay-v5/bindings.json');
assert.equal(proof.status,'selected_dependency_schema_replayed');assert.equal(proof.database,'grookai_classic_canonical_proof_deps_run10final1');
const url=new URL(process.env.DISCOVERY_INTAKE_PROOF_URL);assert.ok(['127.0.0.1','localhost'].includes(url.hostname));assert.equal(url.pathname,'/postgres');
const config={connectionString:url.href,ssl:false,connectionTimeoutMillis:15000};
const admin=new pg.Client(config);await admin.connect();assert.equal((await admin.query('select 1 from pg_database where datname=$1',[name])).rowCount,0);
await admin.query(`create database ${name} template ${proof.database}`);await admin.end();url.pathname='/'+name;config.connectionString=url.href;
const fixture=new pg.Client(config);await fixture.connect();const checks=[];
const seed=async(table,rows)=>{
  if(!rows.length)return;
  const columns=(await fixture.query("select attname from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped and attgenerated='' order by attnum",['public.'+table])).rows.map(r=>r.attname);
  assert.ok(columns.every(c=>/^[a-z_]+$/.test(c)));
  for(const row of rows){
    const key=table==='finish_keys'?'key':'id';
    if((await fixture.query(`select 1 from public.${table} where ${key}=$1`,[row[key]])).rowCount){
      if(table==='sets') {
        // The older Classic lab stores namespace-only set stubs. Replace only
        // these four unreferenced stubs in this NEW clone before its baseline.
        assert.equal((await fixture.query('select 1 from card_prints where set_id=$1',[row.id])).rowCount,0,'referenced_fixture_set_cannot_be_replaced');
        assert.equal((await fixture.query('delete from sets where id=$1',[row.id])).rowCount,1);
        await fixture.query(`insert into public.sets (${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_record(null::public.sets,$1::jsonb)`,[JSON.stringify(row)]);
      }
      else if(table==='tcgcsv_source_sync_runs') {
        const mutable=columns.filter(c=>c!=='id');
        await fixture.query(`update public.${table} t set (${mutable.join(',')})=(select ${mutable.join(',')} from jsonb_populate_record(null::public.${table},$1::jsonb)) where t.id=$2`,[JSON.stringify(row),row.id]);
      } else assert.equal(table,'finish_keys','unexpected_fixture_collision:'+table);
      continue;
    }
    await fixture.query(`insert into public.${table} (${columns.join(',')}) overriding system value select ${columns.join(',')} from jsonb_populate_record(null::public.${table},$1::jsonb)`,[JSON.stringify(row)]);
  }
};
let db;
try{
  for(const f of read(state+'/world2010-identity-sql-observation-v3/first.json').functions)await fixture.query(f.definition);
  for(const t of ['finish_keys','sets','card_prints','card_printings','card_printing_truth_reviews','tcgcsv_source_sync_runs'])await seed(t,observation.seed[t]);
  await fixture.query('insert into tcgcsv_source_products select * from jsonb_populate_recordset(null::tcgcsv_source_products,$1::jsonb)',[JSON.stringify(s.group_products)]);
  for(const r of s.group_raw)await fixture.query('insert into raw_imports(id,source,status,payload) values($1,$2,$3,$4)',[r.id,r.source,r.status,JSON.stringify(r.payload)]);
  for(const r of plan.input.projection_inputs.snapshot.historical_printing_raw)await fixture.query('insert into raw_imports(id,source,status,payload) values($1,$2,$3,$4)',[r.id,r.source,r.status,JSON.stringify(r.payload)]);
  await fixture.query('insert into external_discovery_candidates select * from jsonb_populate_recordset(null::external_discovery_candidates,$1::jsonb)',[JSON.stringify(s.group_discovery)]);
  for(const table of ['raw_imports','external_mappings','ingestion_jobs']){
    const expr=(await fixture.query("select column_default from information_schema.columns where table_schema='public' and table_name=$1 and column_name='id'",[table])).rows[0].column_default;
    const sequence=expr.match(/^nextval\('([a-z_]+)'::regclass\)$/)?.[1];assert.ok(sequence,'actual_sequence_default_required');
    await fixture.query(`select setval($1::regclass,greatest(10000000,(select coalesce(max(id),0)+1000 from public.${table})))`,[sequence]);
  }
  if(dependencyInputDir){
    await replayWorld2010Dependencies(fixture,dependencyInputDir,schemaFile,binding.roles,out);
    await fixture.query('insert into ai_decision_logs(raw_import_id) values($1)',[s.group_raw[0].id]);
    await fixture.query('insert into mapping_conflicts(raw_import_id) values($1)',[plan.input.projection_inputs.snapshot.historical_printing_raw[0].id]);
    checks.push('actual full inbound schema closure replayed; retained raw references seeded in two actual outside tables');
  }
  // Full original dependency tables are preserved in the clone. New sentinel
  // exercises additional inbound edges without claiming full production replay.
  await fixture.query('create table proof_world_inbound(id int primary key,identity_id uuid references card_print_identity(id),evidence_id uuid references card_print_identity_source_evidence(id),mapping_id bigint references external_mappings(id),raw_id bigint references raw_imports(id),ledger_id bigint references ingestion_jobs(id),payload jsonb)');
  await fixture.query('alter table proof_world_inbound owner to '+binding.roles.postgres);
  await fixture.query('insert into proof_world_inbound(id,raw_id,payload) values(1,$1,\'{"retained":true}\')',[s.group_raw[0].id]);
  const targets=[...new Set(observation.columns.map(c=>c.relname))];
  const columns=(await fixture.query(`select c.relname,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) default_expression,a.attgenerated from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='public' and c.relname=any($1::text[]) order by c.relname,a.attnum`,[targets])).rows;
  assert.deepEqual(columns,observation.columns.map(({owner,relrowsecurity,relforcerowsecurity,...r})=>r));
  const constraints=(await fixture.query(`select n.nspname schema,c.relname,k.conname,k.contype,pg_get_constraintdef(k.oid,true) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) order by c.relname,k.conname`,[targets])).rows;
  assert.deepEqual(constraints,observation.constraints);
  const indexes=(await fixture.query("select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename=any($1::text[]) order by tablename,indexname",[targets])).rows;assert.deepEqual(indexes,observation.indexes);
  const triggers=(await fixture.query(`select c.relname,t.tgname,pg_get_triggerdef(t.oid,true) definition,pg_get_functiondef(t.tgfoid) function_definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) and not t.tgisinternal order by c.relname,t.tgname`,[targets])).rows;
  assert.deepEqual(triggers,observation.triggers);
  checks.push('six actual write targets:70 columns21 constraints35 indexes independently match fresh production definitions');
  await fixture.end();
  db=new pg.Client({...config,options:'-c role='+binding.roles.postgres});await db.connect();
  const tx=()=>db.query('begin isolation level serializable read write'),rollback=()=>db.query('rollback'),apply=()=>applyWorld2010RelationshipsLocal(db,plan,originals);
  const tableNames=(await db.query("select tablename from pg_tables where schemaname in ('public','auth') order by schemaname,tablename")).rows;
  const snapshot=async()=>{const data={};for(const t of tableNames){if(t.tablename.startsWith('proof_')||!['schema_migrations'].includes(t.tablename)){
    const schema=['users','identities','sessions'].includes(t.tablename)?'auth':(await db.query("select schemaname from pg_tables where tablename=$1 and schemaname in ('public','auth')",[t.tablename])).rows[0].schemaname;
    data[schema+'.'+t.tablename]=(await db.query(`select to_jsonb(t) row from ${schema}.${t.tablename} t order by to_jsonb(t)::text`)).rows;
  }}return data;};
  const baseline=await snapshot();save('baseline.json',baseline);
  const dependencyCatalog=dependencyInputDir?await readWorld2010InboundCatalog(db):null;
  const dependencyBefore=dependencyCatalog?await observeWorld2010Dependencies(db,plan,originals,dependencyCatalog):null;
  if(dependencyBefore){save('dependency-catalog.json',dependencyCatalog);save('dependencies-before.json',dependencyBefore);assert.equal(dependencyBefore.rows.reduce((n,r)=>n+Number(r.retained.count),0),3);}
  const coverageOptions={observedAt:new Date().toISOString()};
  await db.query('begin isolation level repeatable read read only');const coverageBefore=reconcilePokemonWarehouse(await readPokemonWarehouseSnapshot(db),coverageOptions);await db.query('commit');
  await tx();const trial=await apply();assert.equal(trial.status,'verified');await rollback();assert.deepEqual(await snapshot(),baseline);checks.push('whole92 transaction rolls back all536 proposed inserts and preserves all retained rows');
  for(const prefix of ['insert into public.card_print_identity (','insert into public.card_print_identity_source_evidence (','insert into public.external_mappings(','insert into public.ingestion_jobs(job_type,status,attempts,last_attempt_at,payload) values']){
    await tx();let hits=0;await assert.rejects(()=>applyWorld2010RelationshipsLocal({query:async(q,a)=>{if(q.startsWith(prefix)&&(prefix.includes('ingestion_jobs')?a?.[0]===VERSION:true)){hits++;throw Error('atomic_boundary_injected');}return db.query(q,a);}},plan,originals),/atomic_boundary_injected/);assert.equal(hits,1);await rollback();assert.deepEqual(await snapshot(),baseline);checks.push('atomic rollback at '+prefix);
  }
  for(const [label,sql,args]of [
    ['parent',"update card_prints set name='changed' where id=$1",[plan.input.projection_inputs.snapshot.parents[0].id]],
    ['printing',"update card_printings set provenance_ref='changed' where id=$1",[plan.input.projection_inputs.snapshot.printings[0].id]],
    ['review',"update card_printing_truth_reviews set reason='changed' where id=$1",[plan.input.projection_inputs.snapshot.reviews[0].id]],
    ['historical raw',"update raw_imports set payload=payload||'{\"changed\":true}'::jsonb where id=$1",[plan.input.projection_inputs.snapshot.historical_printing_raw[0].id]],
    ['held source',"update tcgcsv_source_products set name='changed' where product_id=$1",[plan.held[0].product_id]],
    ['outside source',"update tcgcsv_source_products set name='changed' where product_id=$1",[plan.input.ingress.outside_product_ids[0]]],
  ]){await tx();await db.query(sql,args);await assert.rejects(apply,/retained_canonical_drift|complete_group_source_drift|retained_historical_raw_drift/);await rollback();checks.push(label+' drift rejects whole scope');}
  await tx();await assert.rejects(()=>applyWorld2010RelationshipsLocal({query:async(q,a)=>{const result=await db.query(q,a);if(q.startsWith('select r.id,public.card_print_identity_hash_v1'))result.rows[0].hash='0'.repeat(64);return result;}},plan,originals),/actual_sql_hash_drift/);await rollback();assert.deepEqual(await snapshot(),baseline);checks.push('actual SQL hash drift rejects before ingress');
  for(const ext of [plan.held[0].product_id,plan.tables.external_mappings[0].external_id]){
    await tx();await db.query("insert into external_mappings(source,external_id,active,card_print_id) values('tcgcsv',$1,false,$2)",[ext,plan.tables.card_print_identity[0].card_print_id]);await assert.rejects(apply,/unjournaled_or_conflicting_relationships/);await rollback();checks.push('inactive held/qualified mapping collision rejects');
  }
  const concurrent=new pg.Client({...config,options:'-c role='+binding.roles.postgres});await concurrent.connect();
  try{
    await tx();await apply();
    for(const [label,sql,args] of [
      ['parent',"update card_prints set name=name where id=$1",[plan.input.projection_inputs.snapshot.parents[0].id]],
      ['retained raw',"update raw_imports set payload=payload where id=$1",[s.group_raw[0].id]],
      ['outside source',"update tcgcsv_source_products set name=name where product_id=$1",[plan.input.ingress.outside_product_ids[0]]],
    ]){await concurrent.query('begin');await concurrent.query("set local lock_timeout='100ms'");await assert.rejects(()=>concurrent.query(sql,args),e=>e.code==='55P03');await concurrent.query('rollback');checks.push('concurrent '+label+' mutation blocked');}
    await rollback();
    for(const lock of ['pokemon_warehouse_discovery_intake_v1','pokemon_warehouse_group_intake_v1','pokemon_world2010_subset_ingress_v1','pokemon_world2010_relationship_execution_v1']){
      await tx();await db.query('select pg_advisory_xact_lock(hashtext($1))',[lock]);await concurrent.query('begin isolation level serializable');await concurrent.query("set local lock_timeout='100ms'");await assert.rejects(()=>applyWorld2010RelationshipsLocal(concurrent,plan,originals),e=>e.code==='55P03');await concurrent.query('rollback');await rollback();checks.push(lock+' blocks competing executor');
    }
  }finally{await concurrent.end();}
  await tx();const pending=await apply();save('pending.json',pending);await assert.rejects(async()=>{await db.query('commit');throw Error('lost_acknowledgement');},/lost_acknowledgement/);
  const independent=new pg.Client({...config,options:'-c role='+binding.roles.postgres});await independent.connect();let readback;
  try{await independent.query('begin isolation level repeatable read read only');readback=await reconcileWorld2010Relationships(independent,plan);
    if(dependencyCatalog){const afterDependencies=await observeWorld2010Dependencies(independent,plan,originals,dependencyCatalog,pending);assertWorld2010DependenciesPreserved(dependencyBefore,afterDependencies);save('dependencies-independent-after.json',afterDependencies);checks.push('independent postcommit checks all actual inbound edges with exact83raw92mapping2journal IDs and all90retained raw IDs');}
    await independent.query('commit');}finally{await independent.end();}
  assertWorld2010RelationshipPending(pending,readback);save('independent-readback.json',readback);checks.push('lost commit response reconciles exact identities evidence mappings raw discovery and both ledger IDs independently');
  await db.query('begin isolation level repeatable read read only');const coverageAfter=reconcilePokemonWarehouse(await readPokemonWarehouseSnapshot(db),coverageOptions);await db.query('commit');
  const selected=new Set(plan.input.projection_inputs.snapshot.products.map(p=>String(p.product_id))),qualified=new Set(plan.input.projection_inputs.review.qualified.map(q=>q.product_id));
  const beforeRows=coverageBefore.rows.filter(r=>selected.has(r.product_id)),afterRows=coverageAfter.rows.filter(r=>selected.has(r.product_id));assert.equal(beforeRows.length,109);assert.equal(afterRows.length,109);
  assert.equal(beforeRows.filter(r=>r.status==='mapped_parent').length,0);assert.equal(afterRows.filter(r=>r.status==='mapped_parent').length,92);
  for(const r of afterRows.filter(r=>!qualified.has(r.product_id)))assert.equal(r.status,beforeRows.find(b=>b.product_id===r.product_id).status,'held_coverage_status_changed');
  for(const r of coverageBefore.rows.filter(r=>!selected.has(r.product_id)))assert.equal(coverageAfter.rows.find(a=>a.product_id===r.product_id).status,r.status,'outside_coverage_status_changed');
  save('local-coverage.json',{before:beforeRows,after:afterRows,local_only:true,production_writes:0});checks.push('actual warehouse coverage reads92 exact mapped parents;17held and all outside statuses preserved');
  const after=await snapshot(),expected={'public.raw_imports':83,'public.external_discovery_candidates':83,'public.card_print_identity':92,'public.card_print_identity_source_evidence':184,'public.external_mappings':92,'public.ingestion_jobs':2};
  for(const [table,rows]of Object.entries(baseline)){
    const actual=new Set(after[table].map(r=>JSON.stringify(r)));
    assert.ok(rows.every(r=>actual.has(JSON.stringify(r))),'retained_row_changed:'+table);
    assert.equal(after[table].length-rows.length,expected[table]??0,'unexpected_table_footprint:'+table);
  }checks.push('exact536 inserts6 tables0 updates0 deletes across full selected public/Auth clone');
  await tx();assert.deepEqual(await apply(),pending);await db.query('commit');assert.deepEqual(await snapshot(),after);checks.push('complete repeat produces zero writes');
  if(dependencyCatalog){
    for(const table of ['ai_decision_logs','mapping_conflicts']){
      await tx();await db.query(`update ${table} set created_at=created_at+interval '1 second'`);
      const changed=await observeWorld2010Dependencies(db,plan,originals,dependencyCatalog,pending);
      assert.throws(()=>assertWorld2010DependenciesPreserved(dependencyBefore,changed),/retained_dependency_changed/);await rollback();checks.push(table+' retained payload change rejected');
    }
    await tx();await db.query('insert into ai_decision_logs(raw_import_id) values($1)',[pending.ingress.rows[0].raw_import_id]);
    await assert.rejects(()=>observeWorld2010Dependencies(db,plan,originals,dependencyCatalog,pending),/unexpected_new_dependency/);await rollback();checks.push('actual outside reference to generated raw ID rejected');
    await tx();await db.query("insert into external_mapping_aliases(canonical_card_print_id,canonical_external_mapping_id,source,alias_external_id,alias_kind,evidence_reason,created_from_audit) values($1,$2,'tcgcsv','proof-world-new','proof','local fixture','local fixture')",[plan.tables.card_print_identity[0].card_print_id,pending.mappings[0].id]);
    await assert.rejects(()=>observeWorld2010Dependencies(db,plan,originals,dependencyCatalog,pending),/unexpected_new_dependency/);await rollback();checks.push('actual outside reference to generated mapping ID rejected');
    await tx();await db.query('alter table proof_world_inbound add column added_raw bigint references raw_imports(id)');
    await assert.rejects(()=>observeWorld2010Dependencies(db,plan,originals,dependencyCatalog,pending),/inbound_catalog_drift/);await rollback();checks.push('new outside FK stops catalog-bound verification');
    await tx();await db.query('set local role '+binding.roles.anon);
    await assert.rejects(()=>observeWorld2010Dependencies(db,plan,originals,dependencyCatalog,pending),/unfiltered_dependency_reader_required/);await rollback();checks.push('actual RLS-filtered principal cannot claim zero dependencies');
    await tx();const forged=structuredClone(pending);forged.mappings[0].id=String(BigInt(forged.mappings[0].id)+100000000n);
    await assert.rejects(()=>observeWorld2010Dependencies(db,plan,originals,dependencyCatalog,forged),/pending_relationship_identity_drift/);await rollback();checks.push('forged generated ID rejected against independent actual journal readback');
  }
  for(const [label,sql,args]of [
    ['mapping payload',"update external_mappings set meta=meta||'{\"changed\":true}'::jsonb where id=$1",[pending.mappings[0].id]],
    ['identity payload',"update card_print_identity set identity_payload=identity_payload||'{\"changed\":true}'::jsonb where id=$1",[plan.tables.card_print_identity[0].id]],
    ['evidence payload',"update card_print_identity_source_evidence set evidence_payload=evidence_payload||'{\"changed\":true}'::jsonb where id=$1",[plan.tables.card_print_identity_source_evidence[0].id]],
    ['missing outer journal','delete from ingestion_jobs where id=$1',[pending.ledger_id]],
    ['missing inner journal','delete from ingestion_jobs where id=$1',[pending.ingress.ledger_id]],
  ]){await tx();await db.query(sql,args);await assert.rejects(()=>reconcileWorld2010Relationships(db,plan));await rollback();checks.push(label+' rejects recovery');}
  await tx();await db.query('update ingestion_jobs set id=id+10000000 where id=$1',[pending.ledger_id]);assert.throws(()=>assertWorld2010RelationshipPending(pending, {...pending,ledger_id:String(BigInt(pending.ledger_id)+10000000n)}),/pending_relationship/);const replaced=await reconcileWorld2010Relationships(db,plan);assert.throws(()=>assertWorld2010RelationshipPending(pending,replaced),/pending_relationship/);await rollback();checks.push('replacement outer ledger rejected against immutable pending identity');
  await tx();await db.query('update external_mappings set id=id+10000000 where id=$1',[pending.mappings[0].id]);await assert.rejects(()=>reconcileWorld2010Relationships(db,plan),/relationship_journal_drift/);await rollback();checks.push('replacement mapping bigint identity rejected');
  assert.deepEqual(await snapshot(),after);
  const done={at:new Date().toISOString(),status:'whole92_relationship_transaction_locally_qualified',database:name,server_version:(await db.query('show server_version')).rows[0].server_version,checks,
    inserted:536,tables:6,updates:0,deletes:0,counts:plan.counts,plan_fingerprint:plan.fingerprint,production_writes:0,relationships_repaired:0,
    dependency_closure_replayed:Boolean(dependencyCatalog),outside_dependency_constraints:dependencyBefore?.rows.length??null,
    limits:'selected actual public/Auth schema and translated owner on PostgreSQL16; optional full six-target inbound closure plus synthetic sentinel; no real Auth application PG17 production performance or production CLI proof'};save('complete.json',done);console.log(JSON.stringify(done));
}catch(e){await db?.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),checks,error:e.stack,production_writes:0});throw e;}
finally{await fixture.end().catch(()=>{});await db?.end();}
