import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { deterministicUuidV5 } from '../pricing/one_piece_canonical_import_staging_v1.mjs';
import { assertWorld2010RelationshipReview, DECKS, ACTOR } from './pokemon_world2010_relationship_review_v1.mjs';

export const VERSION = 'POKEMON_WORLD2010_IDENTITY_PROJECTION_V1';
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export const projectionHash = value => createHash('sha256').update(canonical(value)).digest('hex');
const uid = key => deterministicUuidV5(`${VERSION}:${key}`);
const normalName = name => name.trim().replace(/\s+/g, ' ').toLowerCase();

// This is a new source-bound projection for existing parents. It has no writer.
// In particular, historical child-printing reviews cannot create Master finishes.
export function projectWorld2010Identities({ snapshot, originals, review, baseline }) {
  assertWorld2010RelationshipReview(review, snapshot, originals);
  const codes = new Set(DECKS.map(d => d.code));
  for (const [kind, field] of [['cardsArtifact', 'cards'], ['setsArtifact', 'sets'], ['printingsArtifact', 'printings']]) {
    assert.ok(Array.isArray(baseline[kind]?.[field]), 'master_baseline_array_required:' + kind);
    assert.ok(baseline[kind][field].every(r => !codes.has(r.set_key ?? r.key)), 'master_deck_already_present:' + kind);
  }
  const cards = [], identities = [], evidence = [];
  for (const q of review.qualified) {
    const parent = snapshot.parents.find(p => p.id === q.parent_id);
    const product = snapshot.products.find(p => String(p.product_id) === q.product_id);
    const set = snapshot.sets.find(s => s.id === q.set_id);
    const key = [q.set_code, q.original_tuple.origin_set, parent.number, normalName(parent.name)].join('|');
    const subject = { card_print_id: parent.id, gv_id: parent.gv_id, set_code: q.set_code,
      printed_number: parent.number, printed_denominator: parent.printed_total,
      printed_name: parent.name, printed_identity_modifier: parent.printed_identity_modifier,
      variant_key: parent.variant_key, original_set_name: q.original_tuple.origin_set, signature: q.signature };
    const sources = [
      { source_key: 'bulbapedia_set_list', source_authority: 'bulbapedia.bulbagarden.net', source_kind: 'deck_checklist',
        source_url: set.source.grookai.source_url, raw_snapshot_sha256: q.original_sha256,
        original_line: q.original_line, original_tuple: q.original_tuple },
      { source_key: 'tcgcsv', source_authority: 'tcgcsv.com', source_kind: 'warehouse_product',
        source_url: `https://tcgcsv.com/tcgplayer/3/2282/products`, product_id: q.product_id,
        source_payload_hash: product.payload_hash, source_product_sha256: q.source_product_sha256,
        source_name_raw: product.name, source_number_raw: product.extended_data.find(e => e.name === 'Number').value },
    ];
    cards.push({ fact_type: 'card_identity', key, status: 'master_verified', set_key: q.set_code,
      set_name: set.name, card_number: parent.number, card_name: parent.name, finish_key: null,
      printed_total: parent.printed_total, identity_model: 'reprint_anthology',
      existing_parent: subject, source_count: 2, sources: sources.map(s => s.source_key),
      source_authorities: sources.map(s => s.source_authority), source_kinds: sources.map(s => s.source_kind),
      source_evidence: sources, evidence_count: 2, evidence_urls: sources.map(s => s.source_url),
      relationship_review_fingerprint: review.fingerprint, finish_authority: false });
    const identityId = uid(`identity:${parent.id}`);
    identities.push({ id: identityId, card_print_id: parent.id, identity_domain: parent.identity_domain,
      set_code_identity: q.set_code, printed_number: parent.number,
      normalized_printed_name: normalName(parent.name), source_name_raw: q.original_tuple.name,
      identity_key_version: 'pokemon_eng_standard:v1', identity_key_hash: null, is_active: true,
      identity_payload: { language_code: 'en', variant_key_current: parent.variant_key,
        printed_identity_modifier: parent.printed_identity_modifier, printed_total: parent.printed_total,
        identity_model: 'reprint_anthology', original_set_name: q.original_tuple.origin_set,
        original_card_number: q.original_tuple.number, release_context: { set_code_identity: q.set_code,
          deck_name: set.source.grookai.deck_name, deck_year: 2010, signature: q.signature },
        master_identity_key: key, master_index_status: 'master_verified', policy: VERSION } });
    for (const source of sources) evidence.push({ id: uid(`evidence:${parent.id}:${source.source_key}`),
      card_print_identity_id: identityId, card_print_id: parent.id,
      acquisition_key: `${VERSION}|${parent.id}|${source.source_key}`, source_key: source.source_key,
      evidence_key_hash: projectionHash({ subject, source }), evidence_subject: subject,
      evidence_payload: source, active: true });
  }
  assert.equal(new Set(cards.map(c => c.key)).size, 92, 'unique_anthology_master_keys_required');
  assert.ok(cards.every(c => !baseline.cardsArtifact.cards.some(b => b.key === c.key)), 'master_key_collision');
  assert.equal(new Set(identities.map(r => r.id)).size, 92);
  const sets = DECKS.map(deck => {
    const set = snapshot.sets.find(s => s.code === deck.code);
    const admitted = cards.filter(c => c.set_key === deck.code).length;
    const held = review.held.filter(h => h.deck === deck.deck);
    const membership = snapshot.parents.filter(p => p.set_id === set.id).length;
    assert.equal(admitted + held.length, membership, 'whole_deck_accounting_required');
    return { key: deck.code, set_name: set.name, identity_model: 'reprint_anthology', language: 'en',
      printed_total: null, expected_identity_count: membership, admitted_identity_count: admitted,
      held_identity_count: held.length, physical_deck_quantity: 60, complete: false,
      coordinate_policy: 'original_card_coordinate_and_denominator_not_deck_membership',
      canonical_set_id: set.id, preserved_canonical_set_printed_total: set.printed_total,
      finish_profile: null, finish_profile_status: 'not_admitted_by_identity_projection',
      source_aliases: { bulbapedia_set_list: deck.deck, tcgcsv: '3:2282:' + deck.signature } };
  });
  const body = { version: VERSION, actor: ACTOR, actor_type: 'automated_agent', human_signature: null,
    review_fingerprint: review.fingerprint, snapshot_sha256: projectionHash(snapshot),
    baseline_hashes: Object.fromEntries(Object.entries(baseline).map(([k, v]) => [k, projectionHash(v)])),
    cards, sets, held: structuredClone(review.held),
    tables: { card_print_identity: identities, card_print_identity_source_evidence: evidence },
    counts: { products: 109, projected_identities: 92, source_evidence: 184, held: 17, new_parents: 0,
      new_printings: 0, new_mappings: 0, retained_lineages: 9, ingress_required: 83 },
    preservation: review.preservation, production_writes: 0, active_master_changed: false,
    execution_authorized: false, identity_hash_status: 'requires_actual_sql_binding',
    open_gates: ['active_master_integration_and_completeness_guards', 'fresh_global_collisions_and_raw_absence',
      'governed83_raw_ingress_retaining9', 'new_relationship_executor_and_atomic_journal',
      'isolated_sql_dependency_rollback_repeat_lost_response', 'normal_hooks_commit_push', 'frozen_apply_independent_public_readback'] };
  return { ...body, fingerprint: projectionHash(body) };
}

export function assertWorld2010IdentityProjection(projection, inputs) {
  assert.deepEqual(projection, projectWorld2010Identities(inputs), 'world2010_identity_projection_replay_mismatch');
}

export function stageWorld2010IdentityArtifacts(projection, inputs) {
  assertWorld2010IdentityProjection(projection, inputs);
  const { baseline } = inputs;
  const staged = {
    cardsArtifact: { ...baseline.cardsArtifact, cards: [...baseline.cardsArtifact.cards, ...projection.cards] },
    setsArtifact: { ...baseline.setsArtifact, sets: [...baseline.setsArtifact.sets, ...projection.sets] },
    printingsArtifact: structuredClone(baseline.printingsArtifact),
  };
  assert.equal(projectionHash(staged.cardsArtifact.cards.slice(0, -92)), projectionHash(baseline.cardsArtifact.cards));
  assert.equal(projectionHash(staged.setsArtifact.sets.slice(0, -4)), projectionHash(baseline.setsArtifact.sets));
  assert.equal(projectionHash(staged.printingsArtifact), projectionHash(baseline.printingsArtifact));
  return staged;
}

// Actual database serialization is authoritative. This SELECT-only function
// neither inserts identities nor turns a hash/collision observation into apply authority.
export async function observeWorld2010IdentityHashes(db, projection, inputs) {
  assertWorld2010IdentityProjection(projection, inputs);
  assert.equal((await db.query('show transaction_read_only')).rows[0].transaction_read_only, 'on', 'readonly_transaction_required');
  const rows = (await db.query(`select r.id, public.card_print_identity_normalize_printed_name_v1(r.normalized_printed_name) normalized,
    public.card_print_identity_hash_v1(r.identity_domain,r.identity_key_version,r.set_code_identity,r.printed_number,
      r.normalized_printed_name,r.source_name_raw,r.identity_payload) hash
    from jsonb_populate_recordset(null::public.card_print_identity,$1::jsonb) r order by r.id`,
  [JSON.stringify(projection.tables.card_print_identity)])).rows;
  assert.equal(rows.length, 92); assert.equal(new Set(rows.map(r => r.hash)).size, 92, 'sql_identity_hash_collision');
  for (const row of rows) {
    assert.match(row.hash, /^[a-f0-9]{64}$/);
    assert.equal(row.normalized, projection.tables.card_print_identity.find(r => r.id === row.id).normalized_printed_name, 'sql_normalization_disagreement');
  }
  const collisions = (await db.query(`select id,card_print_id,identity_key_hash from public.card_print_identity
    where id=any($1::uuid[]) or card_print_id=any($2::uuid[]) or identity_key_hash=any($3::text[])
      or set_code_identity=any($4::text[]) order by id`, [rows.map(r => r.id),
    projection.tables.card_print_identity.map(r => r.card_print_id), rows.map(r => r.hash), DECKS.map(d => d.code)])).rows;
  assert.equal(collisions.length, 0, 'live_identity_collision_requires_new_review');
  return { projection_fingerprint: projection.fingerprint, hashes: rows, collisions,
    production_writes: 0, execution_authorized: false };
}
