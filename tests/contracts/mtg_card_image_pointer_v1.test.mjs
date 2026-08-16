import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  MTG_GAME_ID,
  MTG_IMAGE_SOURCE,
  buildMtgImagePointerPlanV1,
  buildMtgPointerAggregateV1,
  inspectMtgImagePointerPlanV1,
  inspectMtgPointerAggregateV1,
  mtgFaceRecordV1,
  mtgParentImageAfterV1,
} from '../../backend/pricing/mtg_card_image_pointer_v1.mjs';

const ids = {
  one: '00000000-0000-4000-8000-000000000001',
  two: '00000000-0000-4000-8000-000000000002',
  gap: '00000000-0000-4000-8000-000000000003',
  printOne: '10000000-0000-4000-8000-000000000001',
  printTwo: '10000000-0000-4000-8000-000000000002',
};

function pointer(cardPrintId, printId, faceIndex) {
  const faceRole = faceIndex === 0 ? 'front' : 'back';
  return {
    card_print_id: cardPrintId,
    gv_id: `GV-MTG-${cardPrintId.slice(-4)}`,
    set_code: 'tst',
    scryfall_print_id: printId,
    face_index: faceIndex,
    face_role: faceRole,
    source_quality: 'large',
    source_url: `https://cards.scryfall.io/large/${faceRole}/${printId}.jpg`,
    image_path: `warehouse-derived/self-hosted-images-v1/card_prints/mtg/tst/${printId}/${faceRole}/asset.jpg`,
    image_url: `https://example.supabase.co/storage/v1/object/public/user-card-images/warehouse-derived/self-hosted-images-v1/card_prints/mtg/tst/${printId}/${faceRole}/asset.jpg`,
    image_hash: 'a'.repeat(64),
    content_type: 'image/jpeg',
    width: 672,
    height: 936,
    size_bytes: 123456,
    image_source: MTG_IMAGE_SOURCE,
    image_status: 'exact',
  };
}

function blankRow(id, scryfallPrintId) {
  return {
    id,
    gv_id: `GV-MTG-${id.slice(-4)}`,
    game_id: MTG_GAME_ID,
    scryfall_print_id: scryfallPrintId,
    image_url: null,
    image_alt_url: null,
    image_source: null,
    image_hash: null,
    image_status: null,
    image_res: null,
    image_last_checked_at: null,
    image_path: null,
    image_note: null,
    representative_image_url: null,
  };
}

function fixture() {
  const chunks = [{ run_id: '101', summary: {
    start_index: 0,
    selected_assets: 3,
    manifest_logical_sha256: 'b'.repeat(64),
  }, pointers: [
    pointer(ids.one, ids.printOne, 0),
    pointer(ids.one, ids.printOne, 1),
    pointer(ids.two, ids.printTwo, 0),
  ] }];
  const expectedAggregate = { faces: 3, fronts: 2, backs: 1, cards: 2 };
  const expectedPlan = { sourceFaces: 3, catalog: 3, parents: 2, faces: 3, gaps: 1 };
  const aggregate = buildMtgPointerAggregateV1(chunks, expectedAggregate);
  const currentRows = [
    blankRow(ids.one, ids.printOne),
    blankRow(ids.two, ids.printTwo),
  ];
  const gapRows = [blankRow(ids.gap, null)];
  const checkedAt = '2026-08-16T12:00:00.000Z';
  const plan = buildMtgImagePointerPlanV1({ aggregate, currentRows,
    existingFaceRows: [], gapRows, checkedAt, producerCommit: 'c'.repeat(40),
    boundarySnapshot: { mtg_release_status: 'hidden' },
    expectedCounts: expectedPlan });
  return { aggregate, currentRows, gapRows, checkedAt, plan,
    expectedAggregate, expectedPlan };
}

test('small exact aggregate preserves front/back roles and source runs', () => {
  const value = fixture();
  assert.deepEqual(inspectMtgPointerAggregateV1(value.aggregate.rows,
    value.expectedAggregate).findings, []);
  assert.equal(value.aggregate.counts.faces, 3);
  assert.equal(value.aggregate.counts.fronts, 2);
  assert.equal(value.aggregate.counts.backs, 1);
  assert.equal(value.aggregate.source_runs[0].run_id, '101');
});

test('aggregate rejects duplicate face keys and back faces without fronts', () => {
  const row = pointer(ids.one, ids.printOne, 1);
  const duplicate = inspectMtgPointerAggregateV1([row, row], {
    faces: 2, fronts: 0, backs: 2, cards: 0,
  });
  assert.ok(duplicate.findings.includes('duplicate_face_key'));
  assert.ok(duplicate.findings.includes('back_without_front'));
});

test('pointer plan is exact, additive, and keeps the coverage gap blank', () => {
  const value = fixture();
  assert.deepEqual(inspectMtgImagePointerPlanV1(value.plan,
    value.expectedPlan).findings, []);
  assert.equal(value.plan.parent_rows.length, 2);
  assert.equal(value.plan.face_rows.length, 3);
  assert.deepEqual(value.plan.gap_card_print_ids, [ids.gap]);
  assert.equal(value.plan.mutation_contract.face_rows_insert_only, true);
  assert.equal(value.plan.mutation_contract.deletes, 0);
  assert.equal(value.plan.mutation_contract.release_writes, 0);
  assert.equal(value.plan.mutation_contract.pricing_writes, 0);
  assert.equal(value.plan.mutation_contract.vault_writes, 0);
});

test('already-applied parent and face rows become idempotent no-ops', () => {
  const value = fixture();
  const fronts = value.aggregate.rows.filter((row) => row.face_role === 'front');
  const currentRows = value.currentRows.map((row, index) => ({
    ...row,
    ...mtgParentImageAfterV1(fronts[index], value.checkedAt),
  }));
  const existingFaceRows = value.aggregate.rows.map((row, index) => ({
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    ...mtgFaceRecordV1(row, row.source_storage_run_id),
    created_at: value.checkedAt,
  }));
  const plan = buildMtgImagePointerPlanV1({ aggregate: value.aggregate,
    currentRows, existingFaceRows, gapRows: value.gapRows,
    checkedAt: '2026-08-16T13:00:00.000Z', producerCommit: 'c'.repeat(40),
    boundarySnapshot: { mtg_release_status: 'hidden' },
    expectedCounts: value.expectedPlan });
  assert.deepEqual(inspectMtgImagePointerPlanV1(plan,
    value.expectedPlan).findings, []);
  assert.ok(plan.parent_rows.every((row) =>
    row.disposition === 'already_applied_no_op'));
});

test('identity mismatch and nonblank conflicting parent pointer block the plan', () => {
  const value = fixture();
  const currentRows = value.currentRows.map((row) => ({ ...row }));
  currentRows[0].scryfall_print_id = ids.printTwo;
  currentRows[1].image_url = 'https://unexpected.example/card.jpg';
  const plan = buildMtgImagePointerPlanV1({ aggregate: value.aggregate,
    currentRows, existingFaceRows: [], gapRows: value.gapRows,
    checkedAt: value.checkedAt, producerCommit: 'c'.repeat(40),
    boundarySnapshot: {}, expectedCounts: value.expectedPlan });
  assert.ok(plan.findings.some((finding) =>
    finding.startsWith('scryfall_mapping_mismatch:')));
  assert.ok(plan.findings.some((finding) =>
    finding.startsWith('nonblank_parent_image_conflict:')));
});

test('migration creates signed-in face reads while anonymous access stays denied', () => {
  const sql = fs.readFileSync(
    'supabase/migrations/20260816163000_mtg_card_image_faces_v1.sql',
    'utf8',
  );
  assert.match(sql, /create table if not exists public\.card_print_image_faces/i);
  assert.match(sql, /unique \(card_print_id, face_index\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant select[\s\S]*to authenticated/i);
  assert.match(sql, /catalog_game_id_visible_to_request_v1\(card\.game_id\)/i);
  assert.match(sql, /revoke all on function[\s\S]*from public, anon/i);
});

test('operator never deletes images or canonical rows', () => {
  const source = fs.readFileSync(
    'scripts/audits/mtg_card_image_pointer_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /delete\s+from\s+public\./i);
  assert.doesNotMatch(source, /truncate\s+/i);
  assert.doesNotMatch(source, /release_status\s*=/i);
  assert.doesNotMatch(source, /market_price/i);
});

test('operator recaptures protected boundaries inside the apply transaction', () => {
  const source = fs.readFileSync(
    'scripts/audits/mtg_card_image_pointer_v1.mjs',
    'utf8',
  );
  const mutateBody = source.slice(
    source.indexOf('async function mutate('),
    source.indexOf('\nasync function main()'),
  );

  assert.match(mutateBody, /const lockedBoundary = await boundarySnapshot\(client\)/);
  assert.match(mutateBody, /buildPlan\([\s\S]*lockedBoundary\)/);
  assert.match(mutateBody, /const inTransactionBoundary = await boundarySnapshot\(client\)/);
  assert.match(mutateBody, /evaluateState\([\s\S]*inTransactionBoundary\)/);
  assert.ok(
    mutateBody.indexOf('const inTransactionBoundary') < mutateBody.indexOf("client.query('commit')"),
  );
});
