import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyMtgCanaryPayloadIntegrityV1 } from './mtg_canonical_catalog_canary_preflight_v1.mjs';
import { stableJson, buildMtgCanaryStageContractV1 } from './mtg_canonical_catalog_canary_stage_v1.mjs';

export const MTG_PUBLIC_ADDITIVE_REHEARSAL_V1 = Object.freeze({
  version: 'MTG_PUBLIC_ADDITIVE_REHEARSAL_V1',
  target: 'attested_retained_local_database',
  required_release_status: 'public',
  allowed_inserts: Object.freeze(['sets', 'card_prints', 'card_print_identity', 'card_printings', 'external_mappings', 'external_printing_mappings']),
  rollback_only: true,
  production_execution: false,
  canonical_updates: false,
  release_control_changes: false,
  pricing_publication: false,
  images: false,
  vault_writes: false,
});
export const mtgDigestV1 = value => createHash('sha256').update(stableJson(value)).digest('hex');

// This is a qualification plan, not a new authority for the frozen V1 writer.
export function buildMtgPublicAdditivePlanV1(drafts, truth) {
  assert.equal(truth.version, 'MTG_REALITY_FRACTURE_RELEASED_TRUTH_V1');
  assert.equal(truth.production_authority, false);
  assert.equal(drafts.length, truth.sets.length);
  assert.equal(new Set(drafts.map(d => d.selected_set.code)).size, drafts.length);
  const rows = Object.fromEntries(MTG_PUBLIC_ADDITIVE_REHEARSAL_V1.allowed_inserts.map(k => [k, []]));
  const stages = [];
  for (const draft of drafts) {
    assert.equal(draft.plan_version, 'MTG_PUBLIC_ADDITIVE_REVIEW_DRAFT_V1');
    assert.deepEqual(verifyMtgCanaryPayloadIntegrityV1(draft), { ok: true, issues: [] });
    const set = truth.sets.find(s => s.code === draft.selected_set.code);
    assert.ok(set, 'Set outside reviewed scope');
    assert.equal(draft.writer_payload_fingerprint, set.payload_fingerprint, 'Frozen payload changed');
    assert.equal(draft.source_bulk_sha256, truth.source_bulk_sha256);
    assert.deepEqual(Object.keys(draft.rows).sort(), [...MTG_PUBLIC_ADDITIVE_REHEARSAL_V1.allowed_inserts].sort());
    assert.equal(mtgDigestV1(draft.rows), set.rows_sha256, 'Exact reviewed rows changed');
    assert.deepEqual(Object.fromEntries(Object.entries(draft.rows).map(([k, v]) => [k, v.length])), set.row_counts);
    const finishes = {};
    const facts = draft.rows.card_printings.map(p => {
      finishes[p.finish_key] = (finishes[p.finish_key] ?? 0) + 1;
      const parent = draft.rows.card_prints.find(c => c.id === p.card_print_id);
      assert.ok(parent);
      return `${parent.external_ids.scryfall}:${p.finish_key}`;
    }).sort();
    assert.deepEqual(finishes, set.finish_counts);
    assert.equal(new Set(facts).size, facts.length);
    assert.equal(mtgDigestV1(facts), set.protected_printing_facts_sha256);
    for (const parent of draft.rows.card_prints) {
      assert.equal(parent.game_id, '4d544700-0000-4000-8000-000000000001');
      assert.equal(parent.set_code, set.code);
      assert.ok(!truth.held_future_print_ids.includes(parent.external_ids.scryfall), 'Future card entered released draft');
    }
    assert.ok(draft.selected_set.released_at <= truth.as_of);
    for (const key of Object.keys(rows)) rows[key].push(...structuredClone(draft.rows[key]));
    stages.push({ payload: structuredClone(draft), contract: buildMtgCanaryStageContractV1(draft) });
  }
  for (const key of ['sets', 'card_prints', 'card_print_identity', 'card_printings']) {
    assert.equal(new Set(rows[key].map(r => r.id)).size, rows[key].length, `Cross-set ${key} collision`);
  }
  for (const key of ['external_mappings', 'external_printing_mappings']) {
    assert.equal(new Set(rows[key].map(r => `${r.source}:${r.external_id}`)).size, rows[key].length);
  }
  const core = { contract: MTG_PUBLIC_ADDITIVE_REHEARSAL_V1, truth_sha256: mtgDigestV1(truth), rows, stages };
  return { ...core, plan_sha256: mtgDigestV1(core) };
}

export function assertMtgPublicAdditivePlanV1(plan) {
  const { plan_sha256, ...core } = plan;
  assert.equal(mtgDigestV1(core), plan_sha256, 'Plan mutated after qualification');
  assert.deepEqual(plan.contract, MTG_PUBLIC_ADDITIVE_REHEARSAL_V1);
}
