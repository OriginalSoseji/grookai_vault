import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMtgTransactionWritesV1, assertMtgProductionReleaseTargetV1, assertMtgReleaseEnvelopeV1,
  MTG_PUBLIC_RELEASE_PLAN_SHA, MTG_PUBLIC_RELEASE_COUNTS, mtgTransactionWriteDeltaV1 } from '../../scripts/audits/mtg_public_release_v1.mjs';
import { mtgDigestV1 } from '../../scripts/audits/mtg_public_additive_plan_v1.mjs';
const producer = 'a'.repeat(40), now = new Date('2026-10-08T05:00:00Z');
const seal = core => ({ ...core, sha256: mtgDigestV1(core) });
const core = { version: 'MTG_PUBLIC_RELEASE_V1', plan_sha256: MTG_PUBLIC_RELEASE_PLAN_SHA,
  executor_commit_sha: producer, project_ref: 'ycdxbpibncqcchqiihfz',
  source_bulk_sha256: '2115c5b0e666476475d53347918b869cdcf6bd57cecc5cde3858505325624e5f',
  source_updated_at: '2026-10-07T21:05:42.958+00:00',
  source_sync_run_id: '3732f66b-66f0-42e2-8afa-9699d7a0f286', source_sync_finished_at: '2026-10-07T09:31:11.339Z',
  qualification_commit_sha: '86a39f88469bdb5c5e0a0f74a7c8aa7136a623ac', schema_versions_sha256: 'b'.repeat(64), database_structure_sha256: 'c'.repeat(64),
  boundaries: { inserts: MTG_PUBLIC_RELEASE_COUNTS, staging_batches: 2, staging_rows: 3572, updates: false, deletes: false,
    ddl: false, pricing_activation: false, release_control_changes: false, vault_writes: false } };
test('release authority is separate, immutable and time limited', () => {
  assertMtgReleaseEnvelopeV1(seal(core), { producer, now });
  assert.throws(() => assertMtgReleaseEnvelopeV1(seal(core), { producer: 'd'.repeat(40), now }));
  assert.throws(() => assertMtgReleaseEnvelopeV1(seal(core), { producer, now: new Date('2026-10-09') }));
  assert.throws(() => assertMtgReleaseEnvelopeV1(seal(core), { producer, now: new Date('2026-10-07') }));
});
for (const change of [{project_ref:'another'}, {plan_sha256:'d'.repeat(64)}, {source_bulk_sha256:'d'.repeat(64)},
  {boundaries:{...core.boundaries,vault_writes:true}}, {source_sync_run_id:'another'}, {schema_versions_sha256:null}]) {
  test('rehashing does not admit changed authority '+JSON.stringify(change), () => {
    assert.throws(() => assertMtgReleaseEnvelopeV1(seal({...core,...change}), { producer, now }));
  });
}
const writes = [{schemaname:'public',relname:'card_prints',n_tup_ins:'555',n_tup_upd:'0',n_tup_del:'0'}];
test('only exact inserts pass transaction write guard', () => assertMtgTransactionWritesV1(writes,{card_prints:555}));
for (const change of [{schemaname:'auth'}, {relname:'vault_item_instances'}, {n_tup_upd:'1'}, {n_tup_del:'1'}, {n_tup_ins:'556'}]) {
  test('reject trigger side effect '+JSON.stringify(change), () => assert.throws(() => assertMtgTransactionWritesV1([{...writes[0],...change}],{card_prints:555})));
}
test('missing and duplicate counter rows fail', () => {
  assert.throws(() => assertMtgTransactionWritesV1([],{card_prints:555}));
  assert.throws(() => assertMtgTransactionWritesV1([...writes,...writes],{card_prints:555}));
});
test('pending prior counters are subtracted exactly; resets cannot hide writes', () => {
  const before = [{...writes[0], n_tup_ins:'9007199254740993'}];
  assert.deepEqual(mtgTransactionWriteDeltaV1(before, [{...before[0],n_tup_ins:'9007199254741548'}]), writes);
  assert.throws(() => mtgTransactionWriteDeltaV1(before, []), /counters reset/);
  assert.deepEqual(mtgTransactionWriteDeltaV1(before, before), []);
});
for (const change of [{host:'127.0.0.1'}, {port:6543}, {user:'postgres'}, {database:'other'}, {ssl:{rejectUnauthorized:false}}]) {
  test('reject misrouted production endpoint '+JSON.stringify(change), async () => {
    let queried=false;
    await assert.rejects(() => assertMtgProductionReleaseTargetV1({connectionParameters:{host:'aws-1-us-east-2.pooler.supabase.com',port:5432,user:'postgres.ycdxbpibncqcchqiihfz',database:'postgres',ssl:{rejectUnauthorized:true},...change},query:async()=>{queried=true;}}));
    assert.equal(queried,false);
  });
}
