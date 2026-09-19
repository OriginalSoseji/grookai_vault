import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { buildOnePieceIncrementalPrintingPromotionV2 as build, validateOnePieceIncrementalPrintingPromotionV2 as validate } from '../../backend/catalog/one_piece_incremental_printing_promotion_v2.mjs';
import { sha256, stableJson } from '../../backend/pricing/one_piece_canonical_import_staging_v1.mjs';
import { insertPlan, collisionPreflight, readback, clientOptions } from '../../scripts/workers/one_piece_incremental_promotion_v1.mjs';
const hash=v=>sha256(stableJson(v));
function fixture() {
 const raw={productId:700001,categoryId:68,groupId:24736,name:'Monkey.D.Luffy',
  presaleInfo:{isPresale:false,releasedOn:'2026-08-28'},
  extendedData:[{name:'Number',value:'OP17-001'},{name:'CardType',value:'Leader'},{name:'Rarity',value:'Leader'}]};
 const price={productId:700001,subTypeName:'Foil',marketPrice:null};
 return {asOf:'2026-09-19',setCode:'OP17',setName:'The World\'s Strongest Warriors',releaseDate:'2026-08-28',officialSeriesId:'569117',
  warehouseProducts:[{product_id:700001,category_id:68,group_id:24736,group_name:'The World\'s Strongest Warriors',name:raw.name,
   published_on:'2026-08-28',presale_info:raw.presaleInfo,extended_data:raw.extendedData,source_active:true,catalog_metadata_status:'current',
   raw_payload:raw,payload_hash:hash(raw),image_url:'https://example.com/700001.jpg'}],
  officialRecords:[{official_variant_id:'OP17-001',card_number:'OP17-001',official_name:'Monkey.D.Luffy',
   normalized_official_name:'monkey d luffy',rarity:'Leader',card_type:'leader',
   image_url:'https://en.onepiece-cardgame.com/images/op17-001.png',series_id:'569117',series_label:'The World\'s Strongest Warriors [OP-17]'}],
  finishObservations:[{id:'observation',product_id:700001,category_id:68,group_id:24736,subtype_name:'Foil',subtype_name_normalized:'foil',
   source_price_row_identity:'tcgplayer:700001:foil',source_artifact_id:'archive',source_archive_path:'warehouse/prices.json',
   observed_on:'2026-09-19',raw_payload:price,payload_hash:hash(price)}],
  finishKeys:[{key:'foil',is_active:true,meta:{game_scope:['one_piece','mtg']}},{key:'normal',is_active:true,meta:{}}]};
}

test('database transport verifies certificates and removes URL TLS overrides',()=>{
 const c=clientOptions('postgres://postgres:unused@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres?sslmode=no-verify','plan',{});
 assert.equal(c.ssl.rejectUnauthorized,true);assert.equal(new URL(c.connectionString).search,'');
 assert.equal(c.ssl.servername,'db.ycdxbpibncqcchqiihfz.supabase.co');
 assert.equal(clientOptions('postgres://postgres:unused@db.ycdxbpibncqcchqiihfz.supabase.co/postgres','plan',{}).ssl.rejectUnauthorized,true);
 const p=clientOptions('postgres://postgres.ycdxbpibncqcchqiihfz:unused@aws-1-us-east-2.pooler.supabase.com:5432/postgres','apply',{});
 assert.equal(p.ssl.rejectUnauthorized,true);
});

test('database transport rejects foreign targets, shared local DBs and insecure environment',()=>{
 for(const url of ['postgres://postgres:x@other.example:5432/postgres','postgres://postgres:x@127.0.0.1:54330/postgres',
  'postgres://other:x@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres'])assert.throws(()=>clientOptions(url,'plan',{}));
 assert.throws(()=>clientOptions('postgres://postgres:x@127.0.0.1:54330/grookai_op_incremental_test','plan',{NODE_TLS_REJECT_UNAUTHORIZED:'0'}));
 assert.equal(clientOptions('postgres://postgres:x@127.0.0.1:54330/grookai_op_incremental_test','dry-run',{}).ssl,false);
});

test('workflow passes reviewed payload fingerprint and exercises V2 contracts',()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/one-piece-incremental-promotion.yml',import.meta.url),'utf8');
 assert.match(workflow,/expected_payload_fingerprint:/);
 assert.match(workflow,/--expected-payload-fingerprint="\$EXPECTED_PAYLOAD_FINGERPRINT"/);
 assert.match(workflow,/one_piece_incremental_printing_promotion_v2.test.mjs/);
 assert.match(workflow,/one_piece_printing_admission_v1.test.mjs/);
 for(const file of ['one-piece-incremental-promotion.yml','universal-catalog-discovery.yml','operations-control-plane-maintenance.yml']){
  const text=readFileSync(new URL(`../../.github/workflows/${file}`,import.meta.url),'utf8');
  assert.match(text,/SUPABASE_DB_CA_CERT: \$\{\{ secrets.SUPABASE_DB_CA_CERT \}\}/);
 }
});
test('master-first new parent carries exact printing, evidence and review in one payload',()=>{
 const input=fixture(),before=structuredClone(input),p=build(input);
 assert.equal(p.counts.card_prints,1);assert.equal(p.counts.child_printings,1);assert.equal(p.counts.printing_reviews,1);
 assert.equal(p.payload.set_release_control.release_status,'hidden');
 const r=p.payload.rows[0];assert.equal(r.card_print.data_quality_flags.exact_printing_children_deferred,false);
 assert.equal(r.printings[0].finish_key,'foil');assert.equal(r.printings[0].card_print_id,r.card_print.id);
 assert.equal(r.printing_reviews[0].evidence.source_evidence_hash,r.source_evidence.evidence_key_hash);
 assert.equal(r.source_evidence.evidence_payload.printing_master.manifest_sha256,hash(p.payload.printing_master));
 assert.equal(validate(p).valid,true);assert.deepEqual(input,before);assert.deepEqual(build(input),p);
});
for(const [name,change] of [
 ['no finish',i=>{i.finishObservations=[];}],
 ['no archive',i=>{i.finishObservations[0].source_artifact_id=null;}],
 ['unregistered foil',i=>{i.finishKeys[0].meta.game_scope=['mtg'];}],
 ['wrong raw hash',i=>{i.warehouseProducts[0].payload_hash='0'.repeat(64);}],
 ['wrong observation product',i=>{i.finishObservations[0].raw_payload.productId=999;}],
 ['duplicate observation',i=>{i.finishObservations.push(structuredClone(i.finishObservations[0]));}],
])test(`unresolved ${name} stays in evidence staging, not a parent-only apply`,()=>{
 const i=fixture();change(i);const p=build(i);
 assert.equal(p.counts.card_prints,0);assert.equal(p.counts.child_printings,0);assert.equal(p.payload.set,null);
 assert.equal(p.status,'held_printing_evidence');assert.equal(p.holds.at(-1).status,'printing_evidence_unresolved');assert.equal(validate(p).valid,true);
});
test('two observed finishes remain distinct, not a default finish',()=>{
 const i=fixture(),l=structuredClone(i.finishObservations[0]);Object.assign(l,{id:'normal',subtype_name:'Normal',subtype_name_normalized:'normal',source_price_row_identity:'tcgplayer:700001:normal'});
 l.raw_payload.subTypeName='Normal';l.payload_hash=hash(l.raw_payload);i.finishObservations.push(l);
 assert.equal(build(i).counts.child_printings,2);
});
test('future release and already-present parents cause zero writes',()=>{
 const i=fixture();i.asOf='2026-08-27';assert.equal(build(i).counts.card_prints,0);
 const j=fixture();j.existingTcgplayerProductIds=['700001'];assert.equal(build(j).counts.child_printings,0);
});
test('existing set additions retain row-level suppression',()=>{
 const i=fixture();i.existingSetCodes=['OP17'];const p=build(i);
 assert.equal(p.payload.set,null);assert.equal(p.payload.rows[0].card_print.data_quality_flags.app_visibility_v1.status,'suppressed');
});
test('an unresolved product does not suppress unrelated fully proven products',()=>{
 const i=fixture(),second=structuredClone(i.warehouseProducts[0]);second.product_id=700002;second.raw_payload.productId=700002;second.payload_hash=hash(second.raw_payload);i.warehouseProducts.push(second);
 const p=build(i);assert.equal(p.counts.card_prints,1);assert.equal(p.holds.at(-1).source_product_id,700002);
});
for(const [name,change] of [
 ['missing children',p=>{p.payload.rows[0].printings=[];}],
 ['changed finish',p=>{p.payload.rows[0].printings[0].finish_key='holo';}],
 ['visible set',p=>{p.payload.set_release_control.release_status='active';}],
 ['missing review',p=>{p.payload.rows[0].printing_reviews=[];}],
 ['wrong evidence hash',p=>{p.payload.rows[0].source_evidence.evidence_key_hash='bad';}],
 ['changed count',p=>{p.counts.child_printings=0;}],
])test(`recomputed fingerprint does not excuse ${name}`,()=>{
 const p=build(fixture());change(p);p.payload_fingerprint_sha256=hash(p.payload);assert.equal(validate(p).valid,false);
});
test('atomic writer validates entire plan before the first SQL statement',async()=>{
 const p=build(fixture());p.payload.rows[0].printings=[];let calls=0;
 await assert.rejects(insertPlan({query:async()=>{calls++;}},p));assert.equal(calls,0);
});
test('atomic writer inserts printings and reviews after parent/evidence without committing itself',async()=>{
 const sql=[];await insertPlan({query:async(q,args)=>{sql.push(q);return {rowCount:args?.length===1?JSON.parse(args[0]).length:1};}},build(fixture()));
 assert.ok(sql.findIndex(q=>/insert into public.card_printings\s/.test(q))>sql.findIndex(q=>/insert into public.card_print_identity_source_evidence/.test(q)));
 assert.ok(sql.some(q=>/insert into public.card_printing_truth_reviews/.test(q)));
 assert.ok(sql.every(q=>!/^\s*(commit|begin)/i.test(q)));
});
test('global printing GV-ID collision blocks before mutation',async()=>{
 await assert.rejects(collisionPreflight({query:async q=>({rows:[{count:/from public.card_printings/.test(q)?1:0}]})},build(fixture())),/Collision preflight/);
});
test('readback rejects same-count rows with wrong values',async()=>{
 const p=build(fixture());await assert.rejects(readback({query:async q=>q.includes('to_jsonb')?{rows:[{row:{...p.payload.set,name:'Wrong'}}]}:{rows:[{count:1}]}},p),/exact_readback_mismatch/);
});
test('worker selects V2, frozen finish evidence, and atomic printing writes',()=>{
 const code=readFileSync(new URL('../../scripts/workers/one_piece_incremental_promotion_v1.mjs',import.meta.url),'utf8');
 assert.match(code,/one_piece_incremental_printing_promotion_v2/);assert.match(code,/finishObservations: database.finishObservations/);
 assert.match(code,/public.tcgcsv_source_price_daily_observations/);assert.match(code,/expectAbsent: true/);
 assert.doesNotMatch(code,/child_printings: 0/);
 assert.ok(code.indexOf("'frozen_promotion_plan.json'")<code.indexOf('await insertPlan(client, plan)'));
 assert.match(code,/transactionOpen && !state.commit_attempted/);
 assert.match(code,/await commitTransaction\(client, state\)/);
 assert.doesNotMatch(code,/await client.query\("commit"\)/);
});

test('local PostgreSQL: exact SQL readback, atomic rollback, collision and durable repeat',
 {skip:process.env.GROOKAI_OP_LOCAL_REHEARSAL!=='1'},async()=>{
 const connection={host:'127.0.0.1',port:54330,user:'postgres',password:'postgres',database:'postgres',ssl:false};
 const source=new Client(connection);await source.connect();
 const database=`grookai_op_incremental_${Date.now()}`;
 const tables=['sets','catalog_set_release_controls','card_prints','card_print_identity',
  'card_print_identity_source_evidence','external_mappings','card_printings','card_printing_truth_reviews'];
 const schema=[];let c;
 const receipt={database,started_at:new Date().toISOString(),production_access:false,
  scope:'Writer SQL, PostgreSQL column types and explicit local FK/uniqueness constraints; not production triggers or RLS.',cases:[]};
 try {
  for(const table of tables){
   const columns=(await source.query(`select a.attname,format_type(a.atttypid,a.atttypmod) type
    from pg_attribute a where a.attrelid=$1::regclass and a.attnum>0 and not a.attisdropped
    order by a.attnum`,[`public.${table}`])).rows;
   assert.ok(columns.length);schema.push({table,columns});
  }
  await source.query(`create database ${database}`);
  c=new Client(clientOptions(`postgres://postgres:postgres@127.0.0.1:54330/${database}`,'dry-run',{}));await c.connect();
  for(const {table,columns} of schema){
   for(const col of columns)assert.match(col.attname,/^[a-z0-9_]+$/);
   await c.query(`create table public.${table} (${columns.map(col=>`"${col.attname}" ${col.type}`).join(',')})`);
  }
  for(const table of tables.filter(t=>!['catalog_set_release_controls','external_mappings'].includes(t)))await c.query(`alter table public.${table} add primary key(id)`);
  await c.query(`alter table public.catalog_set_release_controls add primary key(set_id);
   alter table public.catalog_set_release_controls add foreign key(set_id) references public.sets(id);
   alter table public.card_prints add unique(gv_id);
   alter table public.card_prints add foreign key(set_id) references public.sets(id);
   alter table public.card_print_identity add foreign key(card_print_id) references public.card_prints(id);
   alter table public.card_print_identity_source_evidence add foreign key(card_print_id) references public.card_prints(id);
   alter table public.card_print_identity_source_evidence add foreign key(card_print_identity_id) references public.card_print_identity(id);
   alter table public.external_mappings add unique(source,external_id);
   alter table public.external_mappings add foreign key(card_print_id) references public.card_prints(id);
   alter table public.card_printings add unique(printing_gv_id);
   alter table public.card_printings add foreign key(card_print_id) references public.card_prints(id);
   alter table public.card_printing_truth_reviews add foreign key(card_printing_id) references public.card_printings(id);
   create function public.fail_review_fixture() returns trigger language plpgsql as $$begin
    if current_setting('test.fail_review',true)='yes' then raise exception 'injected_review_failure'; end if;
    return new; end$$;
   create trigger fail_review_fixture before insert on public.card_printing_truth_reviews
    for each row execute function public.fail_review_fixture()`);
  const plan=build(fixture());
  await c.query('begin');await collisionPreflight(c,plan);await insertPlan(c,plan);
  assert.deepEqual(await readback(c,plan),plan.counts);await c.query('rollback');
  assert.ok(Object.values(await readback(c,plan,{expectAbsent:true})).every(n=>n===0));
  receipt.cases.push('exact_insert_readback_and_rollback_absence');
  await c.query('begin');await c.query("set local test.fail_review='yes'");
  await assert.rejects(insertPlan(c,plan),/injected_review_failure/);await c.query('rollback');
  assert.ok(Object.values(await readback(c,plan,{expectAbsent:true})).every(n=>n===0));
  receipt.cases.push('review_failure_rolls_back_parent_and_children');
  await c.query('begin');await collisionPreflight(c,plan);await insertPlan(c,plan);await c.query('commit');
  assert.deepEqual(await readback(c,plan),plan.counts);
  receipt.cases.push('durable_exact_readback');
  await assert.rejects(collisionPreflight(c,plan),/Collision preflight/);
  assert.deepEqual(await readback(c,plan),plan.counts);
  const repeated=fixture();repeated.existingSetCodes=['OP17'];repeated.existingTcgplayerProductIds=['700001'];
  assert.ok(Object.values(build(repeated).counts).every(n=>n===0));
  receipt.cases.push('collision_preserves_durable_rows_and_source_repeat_has_zero_writes');
  await c.query('begin');await c.query("update public.sets set name='wrong' where id=$1",[plan.payload.set.id]);
  await assert.rejects(readback(c,plan),/sets_exact_readback_mismatch/);await c.query('rollback');
  assert.deepEqual(await readback(c,plan),plan.counts);receipt.cases.push('same_count_wrong_set_rejected');
  receipt.status='passed';receipt.payload_fingerprint=plan.payload_fingerprint_sha256;
 } catch(error){receipt.status='failed';receipt.error=error.message;throw error;}
 finally {
  await c?.end();await source.end();receipt.finished_at=new Date().toISOString();
  if(process.env.GROOKAI_OP_REHEARSAL_ARTIFACT_DIR){
   await fs.mkdir(process.env.GROOKAI_OP_REHEARSAL_ARTIFACT_DIR,{recursive:true});
   await fs.writeFile(path.join(process.env.GROOKAI_OP_REHEARSAL_ARTIFACT_DIR,`${database}.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  }
 }
});
