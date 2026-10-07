import assert from 'node:assert/strict';
import {assertMtgPublicAdditivePlanV1,mtgDigestV1} from './mtg_public_additive_plan_v1.mjs';
import {captureMtgPublicProtectedStateV1,stageMtgPublicReviewV1} from './mtg_public_additive_rehearsal_v1.mjs';
import {captureMtgPromotionCollisionsV1,captureMtgPromotionExactReadbackV1,insertMtgPromotionRowsV1} from './mtg_canonical_catalog_promotion_rollback_proof_v1.mjs';

// Qualification only: this accepts one new, independently populated local clone.
// It cannot target production or the original retained rehearsal database.
export async function assertMtgCommitQualificationTargetV1(client) {
  const p=client.connectionParameters;
  assert.equal(p.host,'127.0.0.1');assert.equal(Number(p.port),55000);
  assert.equal(p.database,'mtg_public_commit_v2_20261007');assert.equal(p.user,'postgres');
  const s=(await client.query(`select current_database() db,host(inet_server_addr()) address,
    current_setting('max_worker_processes') workers,current_setting('transaction_isolation') isolation,
    (select count(*)::int from supabase_migrations.schema_migrations) migrations`)).rows[0];
  assert.equal(s.db,p.database);assert.match(s.address,/^10\.248\.37\.\d+$/);
  assert.equal(s.workers,'0');assert.equal(s.isolation,'serializable');assert.equal(s.migrations,429);
}

export async function captureMtgMappingSequenceV1(client) {
  const name=(await client.query("select pg_get_serial_sequence('public.external_mappings','id') name")).rows[0].name;
  assert.equal(name,'public.external_mappings_id_seq');
  const state=(await client.query('select last_value::text,is_called from public.external_mappings_id_seq')).rows[0];
  const definition=(await client.query("select increment_by::text,cache_size::text from pg_sequences where schemaname='public' and sequencename='external_mappings_id_seq'")).rows[0];
  assert.deepEqual(definition,{increment_by:'1',cache_size:'1'});
  return {name,...state};
}

export function assertMtgMappingAllocationV1(before,after,allocated) {
  assert.equal(before.name,after.name);assert.equal(after.is_called,true);
  const first=BigInt(before.last_value)+(before.is_called?1n:0n);
  assert.ok(first>0n);assert.ok(allocated.length>0);
  const ids=allocated.map(r=>BigInt(r.id)).sort((a,b)=>a<b?-1:a>b?1:0);
  for(let i=0;i<ids.length;i++)assert.equal(ids[i],first+BigInt(i),'Unexpected mapping ID allocation');
  assert.equal(BigInt(after.last_value),first+BigInt(ids.length)-1n);
  assert.equal(new Set(allocated.map(r=>r.source+':'+r.external_id)).size,allocated.length);
}

export async function qualifyMtgPublicCommitInTransactionV1(client,plan) {
  assertMtgPublicAdditivePlanV1(plan);await assertMtgCommitQualificationTargetV1(client);
  const release=(await client.query("select release_status from catalog_game_release_controls where game_code='mtg'")).rows;
  assert.deepEqual(release,[{release_status:'public'}]);
  assert.equal((await client.query('select pg_try_advisory_xact_lock(20261007,555960) locked')).rows[0].locked,true);
  await client.query('lock table sets,card_prints,card_print_identity,card_printings,external_mappings,external_printing_mappings,mtg_canonical_import_batches,mtg_canonical_import_rows in share row exclusive mode');
  const collisions=await captureMtgPromotionCollisionsV1(client,plan.rows);
  assert.ok(Object.values(collisions).every(n=>Number(n)===0),'Canonical collision or partial prior apply');
  const batches=(await client.query('select count(*)::int n from mtg_canonical_import_batches where id=any($1::uuid[])',[plan.stages.map(s=>s.contract.batch_id)])).rows[0].n;assert.equal(batches,0,'Staging already exists');
  const protectedState=await captureMtgPublicProtectedStateV1(client,plan),sequenceBefore=await captureMtgMappingSequenceV1(client);
  for(const stage of plan.stages)await stageMtgPublicReviewV1(client,stage);
  const inserted=await insertMtgPromotionRowsV1(client,plan.rows);
  assert.deepEqual(inserted,Object.fromEntries(Object.entries(plan.rows).map(([k,v])=>[k,v.length])));
  const exact=await captureMtgPromotionExactReadbackV1(client,plan.rows);
  for(const [table,check]of Object.entries(exact)){assert.equal(Number(check.actual_count),plan.rows[table].length,table);assert.equal(Number(check.exact_count),plan.rows[table].length,table);}
  const allocated=(await client.query("select id::text,source,external_id,card_print_id from external_mappings where source='scryfall' and external_id=any($1::text[]) order by external_id",[plan.rows.external_mappings.map(r=>r.external_id)])).rows;
  assert.equal(allocated.length,plan.rows.external_mappings.length);
  const sequenceAfter=await captureMtgMappingSequenceV1(client);assertMtgMappingAllocationV1(sequenceBefore,sequenceAfter,allocated);
  assert.deepEqual(await captureMtgPublicProtectedStateV1(client,plan),protectedState,'Existing data/security changed');
  assertMtgPublicAdditivePlanV1(plan);
  return {version:'MTG_PUBLIC_COMMIT_QUALIFICATION_V1',planSha:plan.plan_sha256,inserted,exact,allocated,allocationSha:mtgDigestV1(allocated),sequenceBefore,sequenceAfter,protectedState,productionExecution:false};
}
