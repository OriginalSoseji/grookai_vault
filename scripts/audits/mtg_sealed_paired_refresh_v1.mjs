import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import {buildMtgSealedRefreshV1,MTG_SEALED_REFRESH_BASELINE} from '../../backend/pricing/mtg_sealed_paired_refresh_v1.mjs';
import {hashMtgSealedV1 as hash,MTG_SEALED_REVIEWER_ID} from '../../backend/pricing/mtg_sealed_world_v1.mjs';
import {insertSealedWorldPlanV1} from '../../backend/pricing/sealed_world_writer_v1.mjs';
import {insertDataset,exactReadback,writeAttribution} from './mtg_sealed_image_release_rollback_canary_v1.mjs';
import {pgSslConfig} from './japanese_master_index_v4/read_only_guard_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
assert.ok(['plan','canary','apply','run'].includes(args.mode)&&args.out);
assert.ok(Object.keys(args).every(k=>['mode','out','env','fingerprint','expected-head'].includes(k)),'Unknown option');
if(args.mode==='run')assert.equal(process.env.MTG_SEALED_REFRESH_ACTIVE,'true','Scheduled publication remains disabled until canary and durable readback pass');
if(['canary','apply'].includes(args.mode))assert.match(args.fingerprint??'',/^[a-f0-9]{64}$/,'Exact plan fingerprint required');
dotenv.config({path:args.env??'C:/grookai_vault/.env.local',override:true,quiet:true});
assert.equal(new URL(process.env.SUPABASE_URL).hostname,'ycdxbpibncqcchqiihfz.supabase.co');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(args.mode!=='plan')assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','Execution requires a clean frozen producer');
if(args.mode!=='plan')assert.equal(args['expected-head'],head,'Exact producer SHA required');
const producerSources={};
for(const file of ['scripts/audits/mtg_sealed_paired_refresh_v1.mjs','backend/pricing/mtg_sealed_paired_refresh_v1.mjs']){
  const bytes=await fs.readFile(file);
  producerSources[file]=createHash('sha256').update(bytes).digest('hex');
  if(args.mode!=='plan')assert.deepEqual(bytes,execFileSync('git',['show',`${head}:${file}`]),'Producer must be committed, not merely untracked');
}
const options={connectionString:process.env.SUPABASE_DB_URL,ssl:pgSslConfig(process.env.SUPABASE_DB_URL),
  statement_timeout:120000,connectionTimeoutMillis:30000,application_name:'mtg-sealed-paired-refresh-v1'};
async function connect(){const c=new pg.Client(options);await c.connect();return c;}
const priceTables={qualifications:'sealed_product_pricing_lane_qualifications',releases:'sealed_product_releases',members:'sealed_product_release_members'};
const imageTables={evidence:'sealed_product_image_evidence',assertions:'sealed_product_variant_image_assertions',releases:'sealed_product_image_releases',release_members:'sealed_product_image_release_members'};
async function pointers(c,other=false){return (await c.query(`select p.game_key,p.release_id::text,ip.image_release_id::text
  from sealed_product_release_pointer p left join sealed_product_image_release_pointer ip using(game_key)
  where p.game_key ${other?'<>':'='} 'mtg' order by p.game_key`)).rows;}
async function load(c){
  const counts=(await c.query('select (select count(*) from card_prints)::integer cards,(select count(*) from sets)::integer sets,(select count(*) from card_print_traits)::integer traits')).rows[0];
  assert.ok(counts.cards>=40000&&counts.sets>=150&&counts.traits>=5000,'Canonical environment mismatch');
  const sync=(await c.query(`select id::text,status,observed_on::text from tcgcsv_source_sync_runs
    where sync_mode='current_full_sync' and status='completed' order by created_at desc,id desc limit 1`)).rows[0];
  const baseline=(await c.query(`select f.game_key,v.id::text variant_id,m.id::text source_mapping_id,
    m.source_product_id,m.source_category_id,m.source_group_id,m.source_provider,m.source_payload_hash,v.language_code,
    coalesce(cq.qualification_evidence#>>'{observation,market_price}',q.qualification_evidence#>>'{observation,market_price}') previous_market_price,
    to_jsonb(e) image_evidence,to_jsonb(o) image_object
    from sealed_product_image_release_members im
    join sealed_product_image_releases ir on ir.id=im.image_release_id and ir.release_state='frozen' and ir.game_key='mtg'
    join sealed_product_variant_image_assertions a on a.id=im.image_assertion_id and a.assertion_state='exact_verified'
    join sealed_product_image_evidence e on e.id=a.image_evidence_id
    join sealed_product_image_objects o on o.id=a.image_object_id
    join sealed_product_source_mappings m on m.id=a.source_mapping_id and m.mapping_status='exact_reviewed'
    join sealed_product_variants v on v.id=a.variant_id
    join sealed_product_families f on f.id=v.family_id
    join sealed_product_release_members pm on pm.id=e.source_release_member_id
    join sealed_product_pricing_lane_qualifications q on q.id=pm.qualification_id
    left join sealed_product_release_pointer cp on cp.game_key='mtg'
    left join sealed_product_release_members cm on cm.release_id=cp.release_id and cm.variant_id=v.id
    left join sealed_product_pricing_lane_qualifications cq on cq.id=cm.qualification_id
    where im.image_release_id=$1 order by v.id`,[MTG_SEALED_REFRESH_BASELINE])).rows;
  assert.equal(baseline.length,2149,'Frozen refresh baseline changed');
  const ids=baseline.map(r=>r.source_product_id);
  const source=(await c.query(`select product_id,category_id,group_id,payload_hash,source_active from tcgcsv_source_products
    where product_id=any($1::bigint[]) and category_id=1 order by product_id`,[ids])).rows;
  const prices=[];
  for(let offset=0;offset<ids.length;offset+=100){prices.push(...(await c.query(`select distinct on(product_id,subtype_name_normalized)
    product_id,source_price_row_identity,subtype_name_normalized,observed_on::text,currency,market_price,low_price,payload_hash
    from tcgcsv_source_price_daily_observations where product_id=any($1::bigint[])
      and observed_on>=current_date-7
    order by product_id,subtype_name_normalized,observed_on desc,updated_at desc,id desc`,[ids.slice(offset,offset+100)])).rows);}
  return buildMtgSealedRefreshV1({baseline,source,prices,sync,today:(await c.query('select current_date::text today')).rows[0].today,
    producerCommit:head,pointers:await pointers(c)});
}
async function assertPriceRows(c,key,rows,frozen=false){
  for(let i=0;i<rows.length;i+=250){
    const batch=rows.slice(i,i+250).map(r=>frozen?{...r,release_state:'frozen'}:r);
    const result=await c.query(`select count(*)::integer mismatches from jsonb_array_elements($1::jsonb) expected
      left join public.${priceTables[key]} actual on actual.id=(expected->>'id')::uuid
      where actual.id is null or exists(select 1 from jsonb_each(expected) pair
        where to_jsonb(actual)->pair.key is distinct from pair.value)`,[JSON.stringify(batch)]);
    assert.equal(result.rows[0].mismatches,0,`Exact ${key} readback mismatch`);
  }
}
async function verify(c,plan){
  for(const [key,rows]of Object.entries(plan.prices))await assertPriceRows(c,key,rows,key==='releases');
  for(const [key,rows]of Object.entries(plan.images)){const r=await exactReadback(c,key,rows,key==='releases');assert.equal(r.mismatch_count,0);assert.equal(r.actual_count,rows.length);}
  assert.deepEqual(await pointers(c),[{game_key:'mtg',release_id:plan.prices.releases[0].id,image_release_id:plan.images.releases[0].id}]);
  await c.query(`select set_config('request.jwt.claims','{"role":"authenticated"}',true)`);
  const visible=[];for(let offset=0;offset<3000;offset+=100){const rows=(await c.query("select variant_id::text from get_active_sealed_product_pricing_v3('mtg',null,100,$1)",[offset])).rows;
    visible.push(...rows.map(r=>r.variant_id));if(rows.length<100)break;}
  assert.deepEqual(visible.sort(),plan.prices.members.map(m=>m.variant_id).sort(),'Published price/image set mismatch');
  await c.query(`select set_config('request.jwt.claims','{"role":"anon"}',true)`);
  assert.equal((await c.query("select * from get_active_sealed_product_pricing_v3('mtg',null,1,0)")).rowCount,0);
}
async function execute(plan,commit,phase=commit?'apply':'canary'){
  let c=await connect(),committed=false;
  const price=plan.prices.releases[0],image=plan.images.releases[0];let already=false,newRows=[];
  try{
    await c.query('begin isolation level serializable');await c.query("set local lock_timeout='5s'");
    await c.query("select pg_advisory_xact_lock(hashtext('mtg-sealed-refresh-v1'))");
    const before=await pointers(c),others=await pointers(c,true);
    already=before[0]?.release_id===price.id&&before[0]?.image_release_id===image.id;
    if(!already){
      assert.deepEqual(before,plan.expected_pointers,'Pointer drift');
      const fresh=await load(c);assert.equal(fresh.fingerprint,plan.fingerprint,'Source or price drift before apply');
      for(const [table,id]of [['sealed_product_releases',price.id],['sealed_product_image_releases',image.id]])
        assert.equal((await c.query(`select id from ${table} where id=$1`,[id])).rowCount,0,'Release collision');
      const existing=(await c.query('select id::text from sealed_product_pricing_lane_qualifications where id=any($1::uuid[])',[plan.prices.qualifications.map(q=>q.id)])).rows;
      const existingIds=new Set(existing.map(r=>r.id));
      await assertPriceRows(c,'qualifications',plan.prices.qualifications.filter(q=>existingIds.has(q.id)));
      const freshQualifications=plan.prices.qualifications.filter(q=>!existingIds.has(q.id));
      const payload={candidates:[],families:[],variants:[],reviews:[],mappings:[],evidence:[],
        qualifications:freshQualifications,releases:plan.prices.releases,members:plan.prices.members};
      await insertSealedWorldPlanV1(c,{payload},{reviewerId:MTG_SEALED_REVIEWER_ID});
      for(const [key,rows]of Object.entries(plan.images))await insertDataset(c,key,rows);
      assert.equal((await c.query('select sealed_product_image_release_manifest_fingerprint_v1($1) fp',[image.id])).rows[0].fp,image.manifest_fingerprint);
      await c.query('select sealed_product_freeze_image_release_v1($1,$2,$3)',[image.id,image.manifest_fingerprint,MTG_SEALED_REVIEWER_ID]);
      await c.query('select * from sealed_product_set_active_release_v1($1,$2,$3)',[price.id,before[0].release_id,MTG_SEALED_REVIEWER_ID]);
      await c.query('select * from sealed_product_set_active_image_release_v1($1,$2,$3)',[image.id,before[0].image_release_id,MTG_SEALED_REVIEWER_ID]);
      newRows=[...Object.entries({...plan.prices,qualifications:freshQualifications}).map(([key,rows])=>[priceTables[key],rows]),
        ...Object.entries(plan.images).map(([key,rows])=>[imageTables[key],rows])];
    }
    await verify(c,plan);assert.deepEqual(await pointers(c,true),others,'Other game pointer changed');
    const writes=await writeAttribution(c),allowed=[...Object.values(priceTables),...Object.values(imageTables),'sealed_product_release_pointer','sealed_product_image_release_pointer'];
    assert.ok(writes.every(r=>allowed.includes(r.table_name)&&r.deleted===0),'Unexpected write attribution');
    if(commit){await c.query('commit');committed=true;}else await c.query('rollback');
    await c.end();c=await connect();await c.query('begin read only');
    if(commit||already)await verify(c,plan);
    else{
      assert.deepEqual(await pointers(c),before);
      for(const [table,rows]of newRows)assert.equal((await c.query(`select count(*)::integer n from ${table} where id=any($1::uuid[])`,[rows.map(r=>r.id)])).rows[0].n,0,'Rollback residue');
    }
    await c.query('rollback');
    if(phase==='idempotency')assert.ok(already&&newRows.length===0&&writes.length===0,'Idempotency produced writes');
    const result={status:'passed',phase,committed,already_current:already,
      inserted:commit?newRows.reduce((sum,[,rows])=>sum+rows.length,0):0,pointer_writes:commit&&!already?2:0,
      price_release_id:price.id,image_release_id:image.id,published:price.expected_member_count,exclusions:plan.exclusions,
      fingerprint:plan.fingerprint,producer_commit:head,independent_readback:true,storage_writes:0,identity_writes:0,write_attribution:writes,timestamp:new Date().toISOString()};
    await fs.writeFile(path.join(args.out,`${result.phase}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify({phase:result.phase,status:result.status,inserted:result.inserted,published:result.published,already}));
  }catch(error){if(!committed)await c.query('rollback').catch(()=>{});await fs.writeFile(path.join(args.out,'failure.json'),JSON.stringify({committed,code:error.code??null,message:error.message}));throw error;}
  finally{await c.end();}
}
await fs.mkdir(args.out,{recursive:true});let plan;
await fs.writeFile(path.join(args.out,'producer.json'),JSON.stringify({head,producerSources,mode:args.mode,production_write_intent:['apply','run'].includes(args.mode),production_writes_completed:0},null,2));
if(['canary','apply'].includes(args.mode)){
  plan=JSON.parse(await fs.readFile(path.join(args.out,'run_plan.json'),'utf8'));const {fingerprint,...body}=plan;
  assert.equal(fingerprint,hash(body));assert.equal(fingerprint,args.fingerprint);assert.equal(plan.producer_commit,head);
}else{
  const c=await connect();try{await c.query('begin isolation level repeatable read read only');plan=await load(c);await c.query('rollback');}finally{await c.end();}
  await fs.writeFile(path.join(args.out,'run_plan.json'),JSON.stringify(plan));console.log(JSON.stringify({mode:args.mode,fingerprint:plan.fingerprint,proposed_members:plan.prices.members.length,exclusions:plan.exclusions.length,production_writes:0}));
}
if(['canary','run'].includes(args.mode))await execute(plan,false);
if(['apply','run'].includes(args.mode)){
  await execute(plan,true);
  await execute(plan,true,'idempotency');
}
