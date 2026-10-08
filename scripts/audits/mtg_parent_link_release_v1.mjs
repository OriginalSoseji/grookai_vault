import assert from 'node:assert/strict';
import { buildMtgParentMappingPlanV1 } from '../../backend/pricing/mtg_tcgplayer_parent_mapping_policy_v1.mjs';
import { mtgDigestV1 } from './mtg_public_additive_plan_v1.mjs';
import { assertMtgReleasePayloadV1, assertMtgProductionReleaseTargetV1, captureMtgDatabaseStructureV1,
  captureMtgTransactionWritesV1, mtgTransactionWriteDeltaV1, assertMtgTransactionWritesV1 } from './mtg_public_release_v1.mjs';
import { captureMtgMappingSequenceV1, assertMtgMappingAllocationV1 } from './mtg_public_commit_qualification_v1.mjs';
import { captureMtgPromotionExactReadbackV1 } from './mtg_canonical_catalog_promotion_rollback_proof_v1.mjs';

export const MTG_PARENT_LINK_PLAN_V1 = '1b80df6ae83b09ebb05e6d16f4cd46d5e46b72d70916fda5375f36b923c89846';
const rowSha = 'acb733a22dddbf7a4dba64b3b59fab427686eb55bb2d358cc4a6633158ae7984';
const metadata = r => ({ contract_version: 'MTG_TCGPLAYER_PARENT_MAPPING_BACKFILL_V1',
  mapping_method: 'deterministic_mtg_printing_evidence_bridge', derived_from: 'exact_tcgplayer_market_printing_mappings',
  confidence: '1.0000', source_category_id: 1, supporting_printing_mapping_count: r.supporting_printing_mapping_count });
export function assertMtgParentLinkPlanV1(plan) {
  assert.equal(plan.plan_fingerprint, MTG_PARENT_LINK_PLAN_V1);
  const { plan_fingerprint, required_approval, insert_rows, unsafe_rows, review_only_rows, ...core } = plan;
  assert.equal(mtgDigestV1(core), plan_fingerprint, 'Plan changed');
  assert.equal(mtgDigestV1(insert_rows), rowSha, 'Unreviewed source ownership');
  assert.equal(core.insert_rows_sha256, rowSha);
  assert.equal(insert_rows.length, 546);assert.deepEqual(unsafe_rows, []);assert.deepEqual(review_only_rows, []);
  assert.equal(required_approval, `APPLY_MTG_TCGPLAYER_PARENT_MAPPINGS_V1:${plan_fingerprint}:546`);
}
export async function captureMtgParentLinkPreservationV1(client, plan) {
  assertMtgParentLinkPlanV1(plan);
  const tables = {};
  for (const name of ['sets','card_prints','card_print_identity','card_printings','external_mappings',
    'external_printing_mappings','mtg_canonical_import_batches','mtg_canonical_import_rows',
    'vault_item_instances','catalog_game_release_controls','market_price_current_publication']) {
    const where = name === 'external_mappings' ? "where not(source='tcgplayer' and external_id=any($1::text[]))" : '';
    tables[name] = (await client.query(`select count(*)::int count,
      encode(sha256(convert_to(coalesce(string_agg(h,'' order by h),''),'UTF8')),'hex') sha256
      from (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') h from public.${name} t ${where}) hashes`,
    where ? [plan.insert_rows.map(r => r.source_product_id)] : [])).rows[0];
  }
  return { tables, ledger: mtgDigestV1((await client.query('select * from supabase_migrations.schema_migrations order by version')).rows),
    structure: await captureMtgDatabaseStructureV1(client) };
}
export async function readMtgParentLinksV1(client, plan) {
  return (await client.query("select id::text,source,external_id,card_print_id,active,meta from public.external_mappings where source='tcgplayer' and external_id=any($1::text[]) order by external_id::bigint", [plan.insert_rows.map(r => r.source_product_id)])).rows;
}
export function assertMtgParentLinksExactV1(rows, plan) {
  assert.deepEqual(rows.map(({id,...r}) => r), plan.insert_rows.map(r => ({source:'tcgplayer',external_id:r.source_product_id,
    card_print_id:r.card_print_id,active:true,meta:metadata(r)})));
  assert.ok(rows.every(r => BigInt(r.id) > 0n));
}

// Caller owns the connection, durable intent, commit and uncertain-outcome recovery.
// This core inserts only the frozen links. It never creates cards or assignments.
export async function insertMtgParentLinksInTransactionV1(client, plan, admission) {
  assertMtgParentLinkPlanV1(plan);assertMtgReleasePayloadV1(admission);
  assert.equal((await client.query('show transaction_isolation')).rows[0].transaction_isolation,'serializable');
  const writesBefore = await captureMtgTransactionWritesV1(client);
  assert.equal((await client.query('select pg_try_advisory_xact_lock(20261008,546945) locked')).rows[0].locked,true);
  await client.query('lock table public.external_mappings,public.external_printing_mappings,public.card_prints,public.card_print_identity,public.card_printings in share row exclusive mode');
  const candidates = (await client.query('select * from public.v_mtg_tcgplayer_parent_mapping_candidates_v1 where source_product_id=any($1::text[]) order by source_product_id::bigint',[plan.insert_rows.map(r=>r.source_product_id)])).rows;
  assert.deepEqual(buildMtgParentMappingPlanV1(candidates,plan.repository),plan,'Source ownership, existing mapping or active source drift');
  const canonical = await captureMtgPromotionExactReadbackV1(client,admission.rows);
  for (const [name,r] of Object.entries(canonical)) {
    assert.equal(Number(r.actual_count),admission.rows[name].length,name);assert.equal(Number(r.exact_count),admission.rows[name].length,name);
  }
  const before = await captureMtgParentLinkPreservationV1(client,plan),sequenceBefore = await captureMtgMappingSequenceV1(client);
  const otherSequences = async () => (await client.query("select schemaname,sequencename,last_value::text from pg_sequences where schemaname in ('public','auth','storage') and not(schemaname='public' and sequencename='external_mappings_id_seq') order by 1,2")).rows;
  const sequencesBefore = await otherSequences();
  const payload = plan.insert_rows.map(r => ({...r,meta:metadata(r)}));
  const inserted = await client.query(`insert into public.external_mappings(card_print_id,source,external_id,active,meta)
    select card_print_id,'tcgplayer',source_product_id,true,meta from jsonb_to_recordset($1::jsonb)
    as r(card_print_id uuid,source_product_id text,meta jsonb) order by source_product_id::bigint`,[JSON.stringify(payload)]);
  assert.equal(inserted.rowCount,546);await client.query('set constraints all immediate');
  const allocated = await readMtgParentLinksV1(client,plan);assertMtgParentLinksExactV1(allocated,plan);
  const sequenceAfter = await captureMtgMappingSequenceV1(client);assertMtgMappingAllocationV1(sequenceBefore,sequenceAfter,allocated);
  assert.deepEqual(await otherSequences(),sequencesBefore,'Another sequence advanced; never reset or retry automatically');
  const writes = mtgTransactionWriteDeltaV1(writesBefore,await captureMtgTransactionWritesV1(client));
  assertMtgTransactionWritesV1(writes,{external_mappings:546});
  assert.deepEqual(await captureMtgParentLinkPreservationV1(client,plan),before,'Preserved data or schema changed');
  assert.deepEqual(mtgTransactionWriteDeltaV1(writesBefore,await captureMtgTransactionWritesV1(client)),writes);
  return {planFingerprint:plan.plan_fingerprint,inserted:546,allocated,sequenceBefore,sequenceAfter,preservation:before,writes,committed:false};
}
export async function prepareMtgParentLinkProductionV1(client, plan, admission, envelope, producer, now=new Date()) {
  assertMtgParentLinkPlanV1(plan);assertMtgReleasePayloadV1(admission);
  const {sha256,...core}=envelope;assert.equal(mtgDigestV1(core),sha256,'Envelope changed');
  assert.equal(core.version,'MTG_PARENT_LINK_RELEASE_V1');assert.equal(core.executor_commit_sha,producer);assert.match(producer,/^[a-f0-9]{40}$/);
  assert.equal(core.plan_fingerprint,MTG_PARENT_LINK_PLAN_V1);assert.equal(core.project_ref,'ycdxbpibncqcchqiihfz');
  assert.equal(core.insert_count,546);assert.equal(core.pricing_activation,false);
  await assertMtgProductionReleaseTargetV1(client);
  const source=(await client.query("select id,status,failed_count,error,finished_at from public.tcgcsv_source_sync_runs where sync_mode='current_full_sync' and status='completed' order by finished_at desc limit 1")).rows[0];
  assert.equal(source.id,core.source_sync_run_id);assert.equal(source.failed_count,0);assert.equal(source.error,null);
  const age=now.getTime()-new Date(source.finished_at).getTime();assert.ok(age>=0&&age<=36*3600000,'Source expired');
  assert.ok(now.getTime()<Date.parse('2026-10-23T00:00:00Z'),'Held-card review expired');
  const versions=(await client.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version);
  assert.equal(mtgDigestV1(versions),core.schema_versions_sha256);
  assert.equal((await captureMtgDatabaseStructureV1(client)).sha256,core.database_structure_sha256);
  return {...await insertMtgParentLinksInTransactionV1(client,plan,admission),envelopeSha:sha256,producer};
}
