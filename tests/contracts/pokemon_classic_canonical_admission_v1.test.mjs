import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadClassicCanonicalBundle } from '../../backend/catalog/pokemon_classic_canonical_bundle_v1.mjs';
import { buildClassicCanonicalPlan, assertClassicCanonicalPlan, applyClassicLocalQualification } from '../../backend/catalog/pokemon_classic_canonical_admission_v1.mjs';
import { pokemonWarehouseMappingKey } from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';
import { printingManifestHash as hash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';

test('Classic canonical candidate cannot connect its local writer to production', async () => {
  let called = false;
  await assert.rejects(() => applyClassicLocalQualification({ connectionParameters: { host: 'db.ycdxbpibncqcchqiihfz.supabase.co' }, query() { called = true; } }), /local_qualification_host_required/);
  assert.equal(called, false);
});

const root = process.env.CLASSIC_PROOF_INPUT_ROOT;
test('Classic canonical original-source qualification', { skip: !root }, async t => {
  const bundle = loadClassicCanonicalBundle({ qualificationAt: new Date().toISOString(), stagingDir: root + '/classic-finish-staging-v3', speciesFile: root + '/classic-canonical-inventory-v2/species.json', observationFile: root + '/classic-family-evidence-v2/clv032-physical-domain-observation.json' });
  const ingress = JSON.parse(fs.readFileSync(root + '/classic-live-plan-v8/plan.json'));
  const built = buildClassicCanonicalPlan(bundle, ingress), plan = built.plan;
  // SQL canonical hash correctness is covered by the isolated PostgreSQL proof.
  for (const row of plan.tables.card_print_identity) row.identity_key_hash = 'a'.repeat(64);
  const { fingerprint, ...body } = plan; plan.fingerprint = hash(body);
  await t.test('all102 exact source identities and three manifests replay deterministically', () => {
    assertClassicCanonicalPlan(plan, bundle);
    assert.deepEqual(Object.fromEntries(Object.entries(plan.tables).map(([k, v]) => [k, v.length])), { sets: 3, card_prints: 102, card_print_identity: 102, card_print_identity_source_evidence: 204, card_print_family_review_queue: 102, card_printings: 102, card_printing_truth_reviews: 102, external_mappings: 102 });
    assert.deepEqual(plan.manifests.map(m => m.expected), Array(3).fill({ parents: 34, printings: 34, finishes: { holo: 34 } }));
    assert.equal(plan.manifests.flatMap(m => m.unresolved_variants).length, 1);
    assert.equal(plan.production_apply_enabled, false);
    assert.ok(plan.tables.card_printings.every(p => p.printing_gv_id.endsWith('-HOLO')));
  });
  await t.test('warehouse readers recognize the true TCGCSV group namespace', () => {
    for (const mapping of plan.tables.external_mappings) {
      assert.deepEqual(pokemonWarehouseMappingKey(mapping), { product_id: String(mapping.meta.source_lineage.product_id), group_id: '23323' });
      assert.equal(mapping.source, 'tcgcsv');
    }
    assert.equal(plan.lineage.filter(r => r.existing_raw_id).length, 81);
    assert.equal(plan.lineage.filter(r => !r.existing_raw_id).length, 21);
  });
  await t.test('physical-category adjudication retains contradictory metadata with actual agent attribution', () => {
    const family = plan.tables.card_print_family_review_queue.map(r => r.evidence_subject);
    assert.deepEqual(family.reduce((c, r) => (c[r.card_domain] = (c[r.card_domain] ?? 0) + 1, c), {}), { pokemon: 51, trainer: 42, energy: 9 });
    const resolved = family.filter(r => r.adjudication); assert.equal(resolved.length, 1);
    assert.equal(resolved[0].number, '032'); assert.equal(resolved[0].set_key, 'classic-clv');
    assert.equal(resolved[0].adjudication.metadata_domain, 'trainer'); assert.equal(resolved[0].card_domain, 'energy');
    assert.equal(resolved[0].adjudication.observation.human_signature, null);
    assert.ok(plan.tables.card_print_family_review_queue.every(r => r.review_status === 'pending' && !r.family_link_promotion_allowed));
  });
  for (const [label, mutate] of [
    ['partial card group', p => p.tables.card_prints.pop()],
    ['changed GVID', p => p.tables.card_prints[0].gv_id += '-WRONG'],
    ['cross-deck source mapping', p => p.tables.external_mappings[0].card_print_id = p.tables.card_prints[35].id],
    ['false TCGdex source', p => p.tables.external_mappings[0].source = 'tcgdex'],
    ['price-derived extra finish', p => p.tables.card_printings[0].finish_key = 'normal'],
    ['lost Jumbo review', p => p.manifests[0].unresolved_variants = []],
    ['fabricated human attribution', p => p.tables.card_printing_truth_reviews[0].reviewed_by = 'human founder'],
    ['automatic family promotion', p => p.tables.card_print_family_review_queue[0].family_link_promotion_allowed = true],
    ['modified canonical namespace', p => p.tables.sets[2].code = 'clb'],
    ['production flag', p => p.production_apply_enabled = true],
  ]) await t.test(label + ' is rejected even after rehash', () => {
    const changed = structuredClone(plan); mutate(changed); const { fingerprint, ...body } = changed; changed.fingerprint = hash(body);
    assert.throws(() => assertClassicCanonicalPlan(changed, bundle), /canonical_package_source_replay_mismatch/);
  });
  await t.test('original photo bytes cannot be replaced', () => {
    const changed = { ...bundle, finishEvidence: { ...bundle.finishEvidence, photographs: bundle.finishEvidence.photographs.map((r, i) => i ? r : { ...r, bytes: Buffer.from('altered original') }) } };
    assert.throws(() => buildClassicCanonicalPlan(changed, ingress));
  });
  await t.test('physical family adjudication cannot claim a human signature', () => {
    assert.throws(() => buildClassicCanonicalPlan({ ...bundle, observation: { ...bundle.observation, human_signature: 'invented' } }, ingress));
  });
  await t.test('missing current species blocks the whole group', () => {
    assert.throws(() => buildClassicCanonicalPlan({ ...bundle, species: [] }, ingress), /unique_exact_species_required/);
  });
});
