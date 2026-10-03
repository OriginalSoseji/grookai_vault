import assert from 'node:assert/strict';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const EDITIONS = ['first_edition', 'unlimited'];
const MODIFIERS = new Set(EDITIONS.map(e => `edition:${e}`));

// Preparation only. Source-reviewed requested identities are deliberately kept
// separate from executable database deltas and existing unresolved identities.
export function buildJungleEditionCatalogPlanV1({ snapshot, sourceReview }) {
  assert.equal(snapshot.read_only, true);
  assert.equal(sourceReview.version, 'JUNGLE_EDITION_SOURCE_REVIEW_V1');
  assert.equal(sourceReview.set_code, 'base2');
  assert.equal(sourceReview.execution_authorized, false);
  assert.equal(sourceReview.facts.length, 128);
  const cards = snapshot.cards;
  const ordinary = cards.filter(c => c.set_code === 'base2' && c.variant_key === '' && c.printed_identity_modifier === null)
    .sort((a, b) => Number(a.number_plain) - Number(b.number_plain));
  assert.equal(ordinary.length, 64, 'Frozen legacy ordinary scope changed');
  assert.equal(new Set(cards.map(c => c.id)).size, cards.length);
  assert.deepEqual(ordinary.map(c => c.number_plain), Array.from({ length: 64 }, (_, i) => String(i + 1)));
  assert.ok(ordinary.every(c => c.set_id === sourceReview.set_id && c.identity_domain === 'pokemon_eng_standard' &&
    c.set_identity_model === 'standard'));
  assert.ok(!cards.some(c => MODIFIERS.has(c.printed_identity_modifier)), 'Existing edition identity requires reconciliation, not duplication');
  const facts = new Map();
  for (const fact of sourceReview.facts) {
    assert.ok(EDITIONS.includes(fact.edition));
    assert.ok(['normal', 'holo'].includes(fact.finish_key));
    assert.equal(fact.finish_key, Number(fact.number) <= 16 ? 'holo' : 'normal', 'Reviewed Jungle finish profile conflict');
    assert.ok(Array.isArray(fact.evidence_refs) && fact.evidence_refs.length >= 2);
    assert.ok(fact.evidence_refs.every(ref => sourceReview.artifacts.some(a => a.ref === ref && /^[a-f0-9]{64}$/.test(a.sha256))));
    const key = `${fact.number}:${fact.edition}`;
    assert.ok(!facts.has(key), 'Duplicate reviewed version fact');
    facts.set(key, fact);
  }
  const candidates = [];
  for (const card of ordinary) for (const edition of EDITIONS) {
    const fact = facts.get(`${card.number_plain}:${edition}`);
    assert.ok(fact, 'Missing reviewed version fact');
    assert.equal(fact.name, card.name, 'Source/canonical name conflict');
    assert.equal(card.number, card.number_plain, 'Raw number conflict');
    const modifier = `edition:${edition}`;
    const gvId = buildCardPrintGvIdV1({ setCode: 'base2', printedSetAbbrev: 'JU',
      number: card.number_plain, variantKey: '', printedIdentityModifier: modifier });
    candidates.push({ legacy_card_print_id: card.id, legacy_gv_id: card.gv_id,
      proposed_parent: { gv_id: gvId, set_id: card.set_id, set_code: 'base2', name: fact.name,
        number: fact.number, number_plain: fact.number, printed_identity_modifier: modifier,
        variant_key: '', identity_domain: 'pokemon_eng_standard', set_identity_model: 'standard',
        // Never clone the legacy image or family-level provider IDs as exact proof.
        image_status: 'missing', image_path: null, image_url: null, external_ids: {} },
      proposed_child: { printing_gv_id: `${gvId}-${fact.finish_key.toUpperCase()}`, finish_key: fact.finish_key },
      evidence_refs: [...fact.evidence_refs], write_ready: false });
  }
  const proposedIds = candidates.map(c => c.proposed_parent.gv_id);
  const childIds = candidates.map(c => c.proposed_child.printing_gv_id);
  assert.equal(new Set(proposedIds).size, 128);
  assert.equal(new Set(childIds).size, 128);
  const inventory = snapshot.collision_inventory;
  assert.deepEqual([...inventory.requested_parent_gv_ids].sort(), [...proposedIds].sort(), 'Incomplete global parent collision inventory');
  assert.deepEqual([...inventory.requested_child_gv_ids].sort(), [...childIds].sort(), 'Incomplete global child collision inventory');
  const parentCollisions = inventory.parents.filter(c => proposedIds.includes(c.gv_id) ||
    (c.set_id === sourceReview.set_id && MODIFIERS.has(c.printed_identity_modifier)));
  const childCollisions = inventory.children.filter(c => childIds.includes(c.printing_gv_id));
  assert.equal(parentCollisions.length, 0, 'Parent identity collision');
  assert.equal(childCollisions.length, 0, 'Child identity collision');
  return { version: 'JUNGLE_EDITION_CATALOG_PLAN_V1', status: 'design_candidate',
    write_ready: false, execution_authorized: false, source_review_ref: sourceReview.ref,
    snapshot_at: snapshot.at, source_reviewed_versions: candidates.length,
    counts_by_edition: Object.fromEntries(EDITIONS.map(edition => [edition, {
      parents: candidates.filter(c => c.proposed_parent.printed_identity_modifier === `edition:${edition}`).length,
      holo: candidates.filter(c => c.proposed_parent.printed_identity_modifier === `edition:${edition}` && c.proposed_child.finish_key === 'holo').length,
      normal: candidates.filter(c => c.proposed_parent.printed_identity_modifier === `edition:${edition}` && c.proposed_child.finish_key === 'normal').length,
    }])),
    preserved_parent_ids: cards.map(c => c.id).sort(),
    preserved_child_ids: snapshot.printings.map(c => c.id).sort(),
    legacy_resolution: ordinary.map(c => ({ card_print_id: c.id, gv_id: c.gv_id,
      proposed_state: 'edition_unresolved', auto_reassign_owned_copies: false,
      edition_price_fallback: false, existing_detail_and_owned_read_access: 'preserve',
      new_intake_policy: 'explicit_edition_selection_required_after_atomic_cutover' })),
    ownership_dependencies: structuredClone(snapshot.owned),
    excluded_special_parent_ids: cards.filter(c => !ordinary.some(o => o.id === c.id)).map(c => c.id).sort(),
    collisions: { parent: parentCollisions.length, child: childCollisions.length },
    candidates,
    // No parent-only external_mappings changes or actionable INSERTs here.
    executable_deltas: [],
    remaining_gates: ['legacy_identity_resolution_schema_and_read_paths',
      'edition_qualified_source_binding_and_immutable_assignment',
      'complete_application_and_fk_dependency_proof', 'frozen_master_authority_and_bounded_executor',
      'isolated_rollback_and_existing_ownership_proof', 'release_shadow_and_authenticated_readback'],
  };
}
