import assert from 'node:assert/strict';
import test from 'node:test';
import { buildJungleEditionCatalogPlanV1 as plan } from '../../backend/catalog/jungle_edition_catalog_plan_v1.mjs';
import { buildCardPrintGvIdV1 as gvid } from '../../backend/warehouse/buildCardPrintGvIdV1.mjs';

function fixture() {
  const cards = Array.from({ length: 64 }, (_, i) => ({ id: `parent-${i}`, gv_id: `GV-PK-JU-${i+1}`,
    name: `Card ${i}`, number: String(i+1), number_plain: String(i+1), set_id: 'jungle', set_code: 'base2',
    variant_key: '', printed_identity_modifier: null, identity_domain: 'pokemon_eng_standard', set_identity_model: 'standard' }));
  const facts = cards.flatMap(c => ['first_edition', 'unlimited'].map(edition => ({ name: c.name,
    number: c.number, edition, finish_key: Number(c.number) <= 16 ? 'holo' : 'normal', evidence_refs: ['checklist', 'edition-source'] })));
  const parentIds = facts.map(f => `GV-PK-JU-${f.number}-${f.edition === 'first_edition' ? 'FIRST-EDITION' : 'UNLIMITED'}`);
  return { sourceReview: { version: 'JUNGLE_EDITION_SOURCE_REVIEW_V1', ref: 'fixture', set_code: 'base2', set_id: 'jungle',
    execution_authorized: false, facts, artifacts: ['checklist', 'edition-source'].map(ref => ({ ref, sha256: 'a'.repeat(64) })) },
  snapshot: { at: '2026-10-01T04:00:00Z', read_only: true, cards, printings: [{ id: 'saved-child', card_print_id: 'parent-0' }],
    owned: [{ table: 'vault_item_instances', counts: [{ card_print_id: 'parent-0', count: 2 }] }],
    collision_inventory: { requested_parent_gv_ids: parentIds,
      requested_child_gv_ids: parentIds.map((id, i) => `${id}-${facts[i].finish_key.toUpperCase()}`), parents: [], children: [] } } };
}

test('explicit edition GV-IDs do not collide with each other or the legacy ID', () => {
  const base = { setCode: 'base2', printedSetAbbrev: 'JU', number: '1' };
  assert.equal(gvid(base), 'GV-PK-JU-1');
  assert.equal(gvid({ ...base, printedIdentityModifier: 'edition:first_edition' }), 'GV-PK-JU-1-FIRST-EDITION');
  assert.equal(gvid({ ...base, printedIdentityModifier: 'edition:unlimited' }), 'GV-PK-JU-1-UNLIMITED');
});

test('two reviewed edition proposals preserve legacy identity, children and ownership without executable writes', () => {
  const input = fixture();
  input.snapshot.cards.push({ id: 'special-parent', gv_id: 'GV-PK-BASE2-1-NO-SYMBOL',
    set_id: 'jungle', set_code: 'base2', variant_key: 'no_symbol_error',
    printed_identity_modifier: 'recognized_error:no_jungle_symbol' });
  const before = structuredClone(input);
  const result = plan(input);
  assert.equal(result.candidates.length, 128);
  assert.deepEqual(result.counts_by_edition, { first_edition: { parents: 64, holo: 16, normal: 48 }, unlimited: { parents: 64, holo: 16, normal: 48 } });
  assert.equal(result.preserved_parent_ids.length, 65);
  assert.deepEqual(result.excluded_special_parent_ids, ['special-parent']);
  assert.deepEqual(result.preserved_child_ids, ['saved-child']);
  assert.deepEqual(result.ownership_dependencies, input.snapshot.owned);
  assert.ok(result.legacy_resolution.every(r => !r.auto_reassign_owned_copies && !r.edition_price_fallback));
  assert.ok(result.candidates.every(c => c.proposed_parent.image_path === null && Object.keys(c.proposed_parent.external_ids).length === 0));
  assert.equal(result.write_ready, false);
  assert.deepEqual(result.executable_deltas, []);
  assert.deepEqual(input, before);
});

test('global collision inventory includes other-set parent and child GV-IDs', () => {
  for (const kind of ['parents', 'children', 'incomplete']) {
    const f = fixture();
    if (kind === 'parents') f.snapshot.collision_inventory.parents.push({ gv_id: 'GV-PK-JU-1-FIRST-EDITION', set_id: 'other' });
    if (kind === 'children') f.snapshot.collision_inventory.children.push({ printing_gv_id: 'GV-PK-JU-1-FIRST-EDITION-HOLO' });
    if (kind === 'incomplete') f.snapshot.collision_inventory.requested_parent_gv_ids.pop();
    assert.throws(() => plan(f), /collision|inventory/);
  }
});

test('existing edition siblings and legacy identity drift require reconciliation', () => {
  for (const patch of [{ printed_identity_modifier: 'edition:first_edition' }, { number: '01' }, { name: 'Wrong card' }, { variant_key: 'no_symbol_error' }]) {
    const f = fixture(); Object.assign(f.snapshot.cards[0], patch);
    assert.throws(() => plan(f));
  }
});

test('duplicate, missing and wrong-finish source facts cannot inflate catalog completeness', () => {
  for (const mutate of [f => f.sourceReview.facts.pop(), f => { f.sourceReview.facts[1] = { ...f.sourceReview.facts[0] }; },
    f => { f.sourceReview.facts[0].finish_key = 'normal'; }, f => { f.sourceReview.facts[0].evidence_refs = ['unknown', 'checklist']; }]) {
    const f = fixture(); mutate(f); assert.throws(() => plan(f));
  }
});
