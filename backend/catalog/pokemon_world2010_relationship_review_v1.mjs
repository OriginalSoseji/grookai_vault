import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const VERSION = 'POKEMON_WORLD2010_EXISTING_RELATIONSHIP_REVIEW_V1';
export const ACTOR = 'automated_agent:codex_pokemon_relationship_repair';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const hash = value => sha(canonical(value));
const norm = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const DECKS = Object.freeze([
  { deck: 'Boltevoir', code: 'wcd2010-boltevoir', signature: 'Michael Pramawat', sha256: 'd30a48f373040929f5154c0ddbc1edb78bd8e1d2a1b763464f14cafc9b51c1f4' },
  { deck: 'LuxChomp of the Spirit', code: 'wcd2010-luxchomp-of-the-spirit', signature: 'Yuta Komatsuda', sha256: '7ba0d65d5a24a4437486264dc75933471caa2233f7b85bd9b4bc65f6e5b4aed0' },
  { deck: 'Happy Luck', code: 'wcd2010-happy-luck', signature: 'Mychael Bryan', sha256: 'bd32d560eb52e45802d9ef815434f0f4c4a76cc5179c06e07c721bb3b0dab9d6' },
  { deck: 'Power Cottonweed', code: 'wcd2010-power-cottonweed', signature: 'Yuka Furusawa', sha256: 'fddf30e8a5c8337ba0d3895aa621f23fed5376952df4d437f1d15c3d4fc1e7fc' },
]);
const PRODUCT_IDS = '479990,479991,479992,479993,479994,479995,479996,479998,479999,480000,480011,480012,480013,480014,480015,480017,480018,480019,480020,480021,480022,480023,480024,480025,480026,480027,480028,480029,480030,480031,480033,480035,480037,480039,480040,480041,480042,480045,480046,480047,480049,480050,480051,480052,480053,480054,480056,480057,480062,480066,480067,480069,480072,480073,480075,480076,480077,480078,480079,480080,480081,480082,480084,480085,480086,480087,480088,480089,480090,480092,480093,480094,480095,480096,480097,480098,480099,480100,480101,480105,480106,480107,480108,480109,480110,480111,480112,480113,480114,480115,480116,480117,480118,480119,480120,480121,480122,480123,480124,480125,480126,480127,480128,480129,480131,480133,534467,534491,690647'.split(',');
const EXPECTED_HOLDS = '479998,480030,480042,480045,480046,480047,480051,480067,480072,480075,480076,480077,480078,480087,480100,480115,480118'.split(',');

// Parse only actual deck-list rows. Repeated wiki links in one row are the same
// tuple; text outside an individual link can never enter its origin set.
export function parseWorld2010Checklist(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/).filter(s => s.startsWith('{{decklist/entry|'))) {
    const copies = Number(line.match(/^\{\{decklist\/entry\|([1-9][0-9]*)\|/)?.[1]);
    assert.ok(copies > 0, 'deck_quantity_required');
    const tuples = [];
    for (const m of line.matchAll(/\{\{TCG ID\|([^|}]+)\|([^|}]+)\|([^|}]+)\}\}/g))
      tuples.push({ origin_set: m[1], name: m[2], number: m[3] });
    for (const m of line.matchAll(/\[\[([^\[\]|]+)(?:\|[^\[\]]*)?\]\]/g)) {
      const t = m[1].match(/^(.+) \((.+) ([A-Za-z]*[0-9]+)\)$/);
      if (t) tuples.push({ origin_set: t[2], name: t[1], number: t[3] });
    }
    const unique = [...new Map(tuples.map(t => [canonical(t), t])).values()];
    assert.ok(unique.length <= 1, 'multiple_distinct_card_tuples_in_deck_row');
    rows.push({ copies, line, tuple: unique[0] ?? null });
  }
  assert.ok(rows.length, 'actual_deck_rows_required');
  return rows;
}
function unique(rows, field, label) {
  assert.equal(new Set(rows.map(r => String(r[field]))).size, rows.length, 'duplicate_' + label);
}

// New automated identity review, not an executable mapping package. Historical
// printing reviews are retained data, never reused as authority for a new write.
export function qualifyWorld2010Relationships(snapshot, originals, reviewedAt) {
  assert.ok(Number.isFinite(Date.parse(reviewedAt)), 'actual_review_time_required');
  assert.equal(originals.size, 4, 'all_four_originals_required');
  for (const key of ['sets','parents','printings','reviews','products','discovery','raw_receipts'])
    unique(snapshot[key], key === 'products' ? 'product_id' : 'id', key);
  assert.deepEqual(snapshot.products.map(p => String(p.product_id)).sort(), PRODUCT_IDS, 'whole109_product_universe_required');
  assert.equal(snapshot.parents.length, 109, 'whole109_existing_parents_required');
  assert.equal(snapshot.printings.length, 100, 'preserve100_existing_printings');
  assert.equal(snapshot.reviews.length, 100, 'preserve100_existing_reviews');
  assert.equal(snapshot.identities.length, 0, 'existing_identity_requires_new_reconciliation');
  assert.equal(snapshot.mappings.length, 0, 'existing_mapping_requires_new_reconciliation');
  assert.deepEqual(snapshot.sets.map(s => s.code).sort(), DECKS.map(d => d.code).sort());
  const decks = new Map(DECKS.map(d => {
    const bytes = originals.get(d.code); assert.ok(Buffer.isBuffer(bytes), 'original_bytes_required');
    assert.equal(sha(bytes), d.sha256, 'original_checklist_hash_mismatch');
    const text = bytes.toString('utf8'), rows = parseWorld2010Checklist(text);
    assert.ok(text.includes('|title=' + d.deck + '\n') && text.includes(d.signature) && text.includes('2010 World Championships'), 'deck_year_signature_binding_required');
    assert.equal(rows.reduce((n, r) => n + r.copies, 0), 60, 'whole60_physical_deck_required');
    const set = snapshot.sets.find(s => s.code === d.code);
    assert.equal(set.identity_model, 'reprint_anthology'); assert.equal(set.identity_domain_default, 'pokemon_eng_standard');
    assert.equal(set.source.grookai.deck_name, d.deck); assert.equal(set.source.grookai.deck_year, 2010);
    return [d.signature, { ...d, set, rows }];
  }));
  const qualified = [], held = [], retainedRaw = new Set(), matchedParents = new Set();
  for (const product of snapshot.products) {
    const id = String(product.product_id), reasons = [];
    assert.equal(product.category_id, 3); assert.equal(product.group_id, 2282); assert.equal(product.source_active, true);
    assert.equal(product.raw_payload.productId, product.product_id); assert.equal(product.raw_payload.groupId, 2282);
    assert.equal(product.raw_payload.categoryId, 3); assert.equal(product.raw_payload.name, product.name);
    assert.deepEqual(product.raw_payload.extendedData, product.extended_data);
    assert.match(product.payload_hash, /^[a-f0-9]{64}$/);
    const named = product.name.match(/^(.+) - 2010 \(([^)]+)\)$/); assert.ok(named, 'exact_year_signature_product_required');
    const deck = decks.get(named[2]); assert.ok(deck, 'unqualified_signature');
    const numbers = product.extended_data.filter(e => e.name === 'Number'); assert.ok(numbers.length <= 1, 'ambiguous_source_number');
    const number = numbers[0]?.value?.match(/^([A-Za-z]*[0-9]+)\/([0-9]+)$/);
    let name = named[1], alias = null;
    const redundant = name.match(/^(.+) \(([0-9]+)\)$/);
    if (redundant && number && redundant[2] === number[1]) { name = redundant[1]; alias = 'redundant_coordinate_suffix'; }
    const candidates = number ? deck.rows.filter(r => r.tuple && norm(r.tuple.name) === norm(name) && r.tuple.number === number[1]) : [];
    if (!number) reasons.push('unnumbered_source_requires_separate_energy_identity_review');
    else if (candidates.length !== 1) reasons.push('source_coordinate_not_unique_in_original_deck');
    const original = candidates[0];
    const sameName = snapshot.parents.filter(p => p.set_id === deck.set.id && norm(p.name) === norm(name));
    const exact = original ? sameName.filter(p => p.number === original.tuple.number) : [];
    if (number && original && exact.length !== 1) reasons.push('canonical_coordinate_or_name_disagreement');
    const parent = exact[0];
    if (parent) {
      const m = parent.external_ids?.grookai;
      assert.equal(parent.identity_domain, 'pokemon_eng_standard');
      assert.equal(parent.tcgplayer_id, null, 'existing_numeric_mapping_requires_reconciliation');
      assert.equal(parent.number_plain, parent.number, 'stored_coordinate_projection_disagreement');
      assert.equal(parent.variant_key, 'world_championship_deck_replica');
      assert.equal(parent.printed_identity_modifier, `2010 World Championships Deck: ${deck.deck}`);
      assert.equal(m?.deck_name, deck.deck); assert.equal(m?.deck_year, 2010);
      if (String(parent.printed_total) !== number[2]) reasons.push('stored_parent_denominator_disagrees_with_source_hint');
      if (m.source_set_name !== original.tuple.origin_set || m.source_card_number !== original.tuple.number)
        reasons.push('retained_origin_provenance_coordinate_disagrees_with_original');
    }
    if (reasons.length) { held.push({ product_id: id, deck: deck.deck, reasons, source_payload_hash: product.payload_hash,
      parent_ids: sameName.map(p => p.id), source_number: numbers[0]?.value ?? null, source_original_sha256: deck.sha256,
      original_name_candidates: deck.rows.filter(r => r.tuple && norm(r.tuple.name) === norm(name)),
      parent_coordinates: sameName.map(p => ({ id: p.id, number: p.number, printed_total: p.printed_total, origin: p.external_ids?.grookai })) }); continue; }
    assert.ok(!matchedParents.has(parent.id), 'multiple_products_same_parent'); matchedParents.add(parent.id);
    const children = snapshot.printings.filter(p => p.card_print_id === parent.id);
    assert.equal(children.length, 1, 'one_preserved_child_required'); const child = children[0];
    const reviews = snapshot.reviews.filter(r => r.card_printing_id === child.id && r.active);
    assert.equal(reviews.length, 1, 'one_preserved_active_review_required');
    assert.equal(reviews[0].review_status, 'verified'); assert.equal(reviews[0].public_visibility, 'visible');
    const discovery = snapshot.discovery.filter(r => String(r.tcgplayer_id) === id);
    assert.ok(discovery.length <= 1, 'duplicate_discovery'); let lineage = null;
    if (discovery.length) {
      const d = discovery[0]; assert.equal(d.source, 'tcgcsv'); assert.equal(d.upstream_id, 'tcgcsv:3:' + id);
      assert.equal(d.card_print_id, null); const raws = snapshot.raw_receipts.filter(r => String(r.id) === d.raw_import_id);
      assert.equal(raws.length, 1, 'exact_retained_raw_required'); const raw = raws[0]; assert.equal(raw.source, 'tcgcsv');
      assert.deepEqual(raw.payload, d.payload); assert.equal(String(raw.payload.tcgplayerId), id);
      assert.equal(raw.payload._external_id, d.upstream_id); assert.equal(raw.payload._set_external_id, 'tcgcsv:3:group:2282');
      assert.equal(raw.payload._source_warehouse_snapshot.payload_hash, product.payload_hash);
      assert.ok(!retainedRaw.has(raw.id), 'reused_raw_id'); retainedRaw.add(raw.id);
      lineage = { discovery_id: d.id, raw_import_id: raw.id, raw_sha256: hash(raw), discovery_sha256: hash(d) };
    }
    qualified.push({ product_id: id, source: 'tcgcsv', external_id: `tcgcsv:2282:${id}`, parent_id: parent.id, gv_id: parent.gv_id,
      set_id: deck.set.id, set_code: deck.code, signature: deck.signature, source_payload_hash: product.payload_hash,
      source_product_sha256: hash(product), parent_sha256: hash(parent), original_sha256: deck.sha256,
      original_line: original.line, original_tuple: original.tuple, source_name_alias: alias,
      preserved_printing_id: child.id, preserved_printing_sha256: hash(child), preserved_review_id: reviews[0].id,
      preserved_review_sha256: hash(reviews[0]), lineage, ingress_required: lineage === null,
      reviewed_relationship: 'exact_existing_deck_replica_parent', finish_authority: false, new_parent_allowed: false });
  }
  assert.equal(qualified.length, 92, 'exact92_scope_required');
  assert.deepEqual(held.map(r => r.product_id).sort(), EXPECTED_HOLDS, 'all17_holds_required');
  assert.equal(retainedRaw.size, 9, 'exact9_retained_raw_required');
  assert.equal(snapshot.discovery.length, 9); assert.equal(snapshot.raw_receipts.length, 9);
  const body = { version: VERSION, actor: ACTOR, actor_type: 'automated_agent', human_signature: null, reviewed_at: reviewedAt,
    status: 'whole109_existing_parent_relationship_reviewed_not_execution_authority', source: 'tcgcsv', source_snapshot_sha256: hash(snapshot),
    qualified, held, counts: { products: 109, qualified: 92, held: 17, retained_lineages: 9, ingress_required: 83 },
    preservation: { parents: hash(snapshot.parents), sets: hash(snapshot.sets), printings: hash(snapshot.printings), reviews: hash(snapshot.reviews),
      historical_printing_raw: hash(snapshot.historical_printing_raw) },
    production_writes: 0, execution_authorized: false, identity_insertion_authorized: false, finish_insertion_authorized: false,
    open_gates: ['fresh_global_collision_and_raw_absence', 'source_bound_identity_projection', 'governed83_raw_ingress',
      'new_mapping_executor_and_atomic_receipt', 'isolated_sql_preservation_and_unknown_commit', 'normal_hooks_commit_push', 'fresh_frozen_apply_and_public_readback'] };
  return { ...body, fingerprint: hash(body) };
}



export function assertWorld2010RelationshipReview(review, snapshot, originals) {
  assert.deepEqual(review, qualifyWorld2010Relationships(snapshot, originals, review.reviewed_at), 'world2010_source_review_replay_mismatch');
  return { qualified: 92, held: 17, execution_authorized: false };
}
