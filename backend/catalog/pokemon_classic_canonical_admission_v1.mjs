import assert from 'node:assert/strict';
import { deterministicUuidV5 } from '../pricing/one_piece_canonical_import_staging_v1.mjs';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';
import { DECKS, sha256, identityNameKey, qualifyClassicIdentities } from './pokemon_classic_identity_evidence_v1.mjs';
import { qualifyClassicFinishes } from './pokemon_classic_finish_evidence_v1.mjs';
import { qualifyClassicFamilies } from './pokemon_classic_family_evidence_v1.mjs';
import { assertClassicMasterProfiles, CLASSIC_SCOPE } from './pokemon_classic_master_profile_v1.mjs';
import { assertIntakePlan, applyDiscoveryIntakeBatch, verifyGroupPreservation, verifyDiscoveryIntakeBatch } from './pokemon_warehouse_group_intake_v1.mjs';
import { PRINTING_COMPLETENESS_VERSION, printingManifestHash as hash, printingCandidateId } from './printing_completeness_gate_v1.mjs';
import { MASTER_PRINTING_AUTHORITY_VERSION, assertMasterPrintingAuthority } from './master_index_printing_authority_v1.mjs';

export const VERSION = 'POKEMON_CLASSIC_CANONICAL_ADMISSION_V1';
export const ACTOR = 'automated_agent:codex_pokemon_relationship_repair';
export const TABLES = Object.freeze(['sets', 'card_prints', 'card_print_identity', 'card_print_identity_source_evidence',
  'card_print_family_review_queue', 'card_printings', 'card_printing_truth_reviews', 'external_mappings']);
const uid = key => deterministicUuidV5(`${VERSION}:${key}`);
const plain = x => JSON.parse(JSON.stringify(x));
const refParts = ref => { const m = ref.match(/^([^#]+)#sha256=([a-f0-9]{64})$/); assert.ok(m); return { ref: m[1], sha256: m[2] }; };
const keyed = rows => [...rows].sort((a, b) => String(a.id ?? a.external_id).localeCompare(String(b.id ?? b.external_id)));

export function qualifyClassicCanonicalBundle(bundle) {
  const identity = qualifyClassicIdentities(bundle); assert.deepEqual(identity, bundle.identity);
  const finish = qualifyClassicFinishes({ ...bundle.finishEvidence, identity }); assert.deepEqual(finish, bundle.finish);
  assertClassicMasterProfiles(bundle.master);
  for (const [kind, rows] of [['cardsArtifact', identity.cards], ['printingsArtifact', finish.printings]]) {
    const key = kind === 'cardsArtifact' ? 'cards' : 'printings';
    assert.deepEqual(bundle.master[kind][key].filter(r => DECKS.some(d => d.set_key === r.set_key)), rows, 'master_original_source_replay_mismatch');
  }
  const family = qualifyClassicFamilies({ identity, sources: bundle.sources, ...bundle.finishEvidence, species: bundle.species, observation: bundle.observation });
  return { identity, finish, family };
}

export function buildClassicCanonicalPlan(bundle, ingress) {
  assertIntakePlan(ingress);
  assert.equal(ingress.group_input.category_id, 3); assert.equal(ingress.group_input.group_id, 23323);
  assert.equal(ingress.entries.length, 21); assert.equal(ingress.retained.length, 81); assert.equal(ingress.held.length, 1);
  const { identity, finish, family } = qualifyClassicCanonicalBundle(bundle);
  const tables = Object.fromEntries(TABLES.map(t => [t, []])), manifests = [], reviewArtifacts = new Map();
  const products = ingress.group_input.products.filter(p => p.extended_data.some(e => e.name === 'Number'));
  assert.equal(products.length, 102);
  const joins = products.map(product => {
    const numbers = product.extended_data.filter(e => e.name === 'Number'); assert.equal(numbers.length, 1);
    const number = String(numbers[0].value).match(/^(\d{3})\/034$/)?.[1]; assert.ok(number);
    const suffix = product.name.match(/ \((CLV|CLC|CLB)\)$/)?.[1];
    const name = product.name.replace(/ \((CLV|CLC|CLB)\)$/, '');
    const matches = identity.joins.filter(c => c.number === number && (!suffix || c.deck_code === suffix) && identityNameKey(c.card_name) === identityNameKey(name));
    assert.equal(matches.length, 1, 'unique_exact_source_deck_coordinate_required');
    return { product, card: matches[0] };
  });
  assert.equal(new Set(joins.map(j => j.card.set_key + j.card.number)).size, 102, 'duplicate_source_identity');
  const lineage = joins.map(({ product, card }) => {
    const old = ingress.retained.find(r => r.product_id === String(product.product_id));
    if (old) { assert.equal(old.discovery_ids.length, 1); assert.equal(old.raw_ids.length, 1); }
    const next = ingress.entries.find(r => r.source.product_id === product.product_id);
    assert.ok(old || next);
    return { product_id: product.product_id, set_key: card.set_key, number: card.number,
      discovery_id: old?.discovery_ids[0] ?? next.candidate_id, existing_raw_id: old?.raw_ids[0] ?? null,
      ingress_fingerprint: ingress.fingerprint, payload_hash: product.payload_hash };
  });
  const masterBytes = Buffer.from(JSON.stringify({ cards: identity.cards, printings: finish.printings, profiles: finish.profiles }));
  const artifacts = new Map(bundle.artifacts); artifacts.set('classic-master-projection.json', masterBytes);
  for (const deck of DECKS) {
    const set = { id: uid(`set:${deck.set_key}`), game: 'pokemon', code: deck.set_key,
      name: `Pokémon Trading Card Game Classic: ${deck.title}`, printed_total: 34, printed_set_abbrev: deck.printed_code,
      set_role: 'product_insert', identity_domain_default: 'pokemon_eng_standard', identity_model: 'standard',
      source: { policy: VERSION, language: 'en', scope: CLASSIC_SCOPE, whole_product_complete: false,
        identity_fingerprint: identity.fingerprint, finish_fingerprint: finish.fingerprint } };
    tables.sets.push(set);
    const parents = [], printings = [], sources = new Map();
    for (const card of identity.cards.filter(c => c.set_key === deck.set_key)) {
      const join = joins.find(j => j.card.set_key === card.set_key && j.card.number === card.card_number);
      const f = family.rows.find(r => r.set_key === card.set_key && r.number === card.card_number);
      const finishFact = finish.printings.find(r => r.set_key === card.set_key && r.card_number === card.card_number);
      const id = uid(`parent:${deck.set_key}:${card.card_number}`), identityId = uid(`identity:${deck.set_key}:${card.card_number}`);
      const gv = buildCardPrintGvIdV1({ setCode: deck.set_key, printedSetAbbrev: deck.printed_code, number: card.card_number, numberPlain: card.card_number, variantKey: 'base' });
      assert.ok(gv);
      const parent = { id, set_id: set.id, name: card.card_name, number: card.card_number, number_plain: card.card_number,
        variant_key: '', gv_id: gv, set_code: deck.set_key, printed_set_abbrev: deck.printed_code, printed_total: 34,
        identity_domain: 'pokemon_eng_standard', printed_identity_modifier: null, set_identity_model: 'standard', image_status: 'missing',
        external_ids: { pokemon_classic_canonical_admission_v1: { policy: VERSION, source: 'tcgcsv', product_id: join.product.product_id,
          group_id: 23323, category_id: 3, source_payload_hash: join.product.payload_hash, master_identity_key: card.key } } };
      tables.card_prints.push(parent);
      const identityRow = { id: identityId, card_print_id: id, identity_domain: 'pokemon_eng_standard', set_code_identity: deck.set_key,
        printed_number: card.card_number, normalized_printed_name: card.card_name, source_name_raw: join.product.name,
        identity_key_version: 'pokemon_eng_standard:v1', identity_key_hash: null, is_active: true,
        identity_payload: { language_code: 'en', variant_key_current: 'base', release_context: { registry_key: deck.set_key, set_code_identity: deck.set_key },
          card_domain: f.card_domain, card_type: f.card_type, family_key: f.family_key, printed_identity_modifier: null, master_index_status: 'master_verified' } };
      tables.card_print_identity.push(identityRow);
      for (const e of card.evidence) {
        const binding = refParts(e.raw_snapshot_ref); assert.equal(sha256(artifacts.get(binding.ref)), binding.sha256);
        const subject = { set_code: deck.set_key, printed_number: card.card_number, printed_name: card.card_name, source_product_id: join.product.product_id };
        tables.card_print_identity_source_evidence.push({ id: uid(`evidence:${id}:${e.source_key}`), card_print_identity_id: identityId, card_print_id: id,
          acquisition_key: `${VERSION}|${id}|${e.source_key}`, source_key: e.source_key, evidence_key_hash: hash({ subject, evidence: e }), evidence_subject: subject, evidence_payload: e, active: true });
      }
      // Family links have their own promotion boundary. This preserves candidate evidence honestly.
      tables.card_print_family_review_queue.push({ id: uid(`family:${id}`), card_print_identity_id: identityId, card_print_id: id,
        acquisition_key: `${VERSION}|${id}`, family_status: f.family_status, family_candidate_source: VERSION,
        normalized_family_candidate: f.species?.id ?? f.family_key, review_status: 'pending', family_link_promotion_allowed: false,
        review_key_hash: hash(f), evidence_subject: f, active: true });
      parents.push({ id, gv_id: gv, set_id: set.id, name: card.card_name, printed_coordinate: card.card_number,
        identity_domain: 'pokemon_eng_standard', variant_key: '', printed_identity_modifier: null });
      const evidence = finishFact.evidence.map(e => {
        const binding = refParts(e.raw_snapshot_ref), kind = e.source_kind === 'marketplace_checklist' ? 'checked_checklist' : 'image_confirmed';
        assert.equal(sha256(artifacts.get(binding.ref)), binding.sha256);
        sources.set(binding.ref, { ...binding, kind, url_or_identifier: e.source_url, retrieved_at: e.retrieved_at });
        return { kind, source_ref: binding.ref, sha256: binding.sha256, card_print_id: id, finish_key: 'holo' };
      });
      printings.push({ card_print_id: id, finish_key: 'holo', printing_gv_id: `${gv}-HOLO`, review_status: 'verified', evidence });
      const sourceLineage = lineage.find(r => r.product_id === join.product.product_id);
      tables.external_mappings.push({ card_print_id: id, source: 'tcgcsv', external_id: `tcgcsv:23323:${join.product.product_id}`,
        active: true, meta: { policy: VERSION, actor_type: 'automated_agent', source_lineage: sourceLineage,
          exact_identity_sources: card.evidence, finish_authority: 'separate_printing_manifest', no_price_finish_inference: true } });
    }
    const outside = finish.outside_scope_reviews.filter(r => r.deck_code === deck.printed_code);
    const manifest = { version: PRINTING_COMPLETENESS_VERSION, game: 'pokemon', language: 'en', set_code: deck.set_key, scope: 'base_release',
      identity_policy_version: 'POKEMON_EN_PHYSICAL_V1', master_index_ref: 'classic-master-projection.json', master_index_sha256: sha256(masterBytes),
      parents, printings, expected: { parents: 34, printings: 34, finishes: { holo: 34 } }, suppressed_printing_facts: [],
      unresolved_variants: outside.map(r => ({ key: `${r.deck_code}:${r.number}:jumbo`, card_print_id: parents.find(p => p.printed_coordinate === r.number).id,
        source_ref: r.source_url, reason: r.reason, status: 'needs_review', scope: 'outside_base_release' })),
      authority: { version: MASTER_PRINTING_AUTHORITY_VERSION, status: 'verified_scope', set_id: set.id, source_artifacts: [...sources.values()],
        protected_facts: printings.map(p => ({ card_print_id: p.card_print_id, finish_key: p.finish_key })), forbidden_facts: [], conflicts: [] } };
    const review = { status: 'verified_scope', game: 'pokemon', language: 'en', set_code: deck.set_key, scope: 'base_release',
      master_index_sha256: manifest.master_index_sha256, projection_sha256: hash(manifest), reviewer: ACTOR,
      reviewed_at: bundle.qualificationAt, actor_type: 'automated_agent', human_signature: null, policy: VERSION,
      qualification: 'exact original identity/checklist/photo replay; isolated executor candidate; no production authority',
      identity_fingerprint: identity.fingerprint, finish_fingerprint: finish.fingerprint };
    const ref = `reviews/${deck.set_key}.json`, bytes = Buffer.from(JSON.stringify(review)); artifacts.set(ref, bytes); reviewArtifacts.set(ref, bytes);
    manifest.authority.review = { ref, sha256: sha256(bytes) }; manifest.fingerprint = hash(manifest);
    assertMasterPrintingAuthority(manifest, artifacts); manifests.push(manifest);
    for (const p of printings) {
      const id = printingCandidateId(p);
      tables.card_printings.push({ id, card_print_id: p.card_print_id, finish_key: 'holo', printing_gv_id: p.printing_gv_id,
        is_provisional: false, provenance_source: VERSION, provenance_ref: `manifest:${manifest.fingerprint}`, created_by: ACTOR });
      tables.card_printing_truth_reviews.push({ id: uid(`printing-review:${id}`), card_printing_id: id, review_status: 'verified', public_visibility: 'visible',
        active: true, reason: 'Exact English standard-deck Holo checklist and independently reviewed physical original.', confidence: 'high',
        evidence_sources_checked: p.evidence.map(e => e.source_ref), evidence_sources_for_finish: p.evidence.map(e => e.source_ref),
        expected_finish_keys: ['holo'], evidence: { policy: VERSION, actor_type: 'automated_agent', human_signature: null, manifest_fingerprint: manifest.fingerprint, sources: p.evidence },
        source_report_path: ref, reviewed_by: ACTOR, reviewed_at: bundle.qualificationAt });
    }
  }
  const body = { version: VERSION, qualification_at: bundle.qualificationAt, execution_scope: 'isolated_local_qualification_only', production_apply_enabled: false,
    ingress, lineage, tables, manifests, identity_fingerprint: identity.fingerprint, finish_fingerprint: finish.fingerprint,
    family_fingerprint: hash(family), artifact_hashes: [...artifacts].map(([ref, bytes]) => ({ ref, sha256: sha256(bytes) })).sort((a, b) => a.ref.localeCompare(b.ref)) };
  return { plan: { ...body, fingerprint: hash(body) }, artifacts, reviewArtifacts, masterBytes };
}

export async function bindClassicIdentityHashes(db, plan) {
  const hashes = (await db.query(`select r.id, public.card_print_identity_hash_v1(
    r.identity_domain,r.identity_key_version,r.set_code_identity,r.printed_number,
    r.normalized_printed_name,r.source_name_raw,r.identity_payload) hash
    from jsonb_populate_recordset(null::public.card_print_identity,$1::jsonb) r`,
  [JSON.stringify(plan.tables.card_print_identity)])).rows;
  assert.equal(hashes.length, plan.tables.card_print_identity.length, 'identity_sql_hash_count');
  const byId = new Map(hashes.map(r => [r.id, r.hash]));
  assert.equal(byId.size, hashes.length, 'duplicate_identity_sql_hash');
  for (const r of plan.tables.card_print_identity) {
    const value = byId.get(r.id); assert.match(value ?? '', /^[a-f0-9]{64}$/);
    if (r.identity_key_hash !== null) assert.equal(r.identity_key_hash, value, 'identity_sql_hash_drift');
    r.identity_key_hash = value;
  }
  const { fingerprint, ...body } = plan; plan.fingerprint = hash(body); return plan;
}

export function assertClassicCanonicalPlan(plan, bundle) {
  const rebuilt = buildClassicCanonicalPlan(bundle, plan.ingress).plan;
  for (const r of rebuilt.tables.card_print_identity) r.identity_key_hash = plan.tables.card_print_identity.find(p => p.id === r.id)?.identity_key_hash;
  const { fingerprint, ...body } = rebuilt; rebuilt.fingerprint = hash(body);
  assert.deepEqual(plan, rebuilt, 'canonical_package_source_replay_mismatch');
  assert.ok(plan.tables.card_print_identity.every(r => /^[a-f0-9]{64}$/.test(r.identity_key_hash)), 'sql_identity_hash_binding_required');
}

// This candidate deliberately cannot write to production. The next governed
// release must qualify full dependencies and an independently reviewed apply CLI.
export async function applyClassicLocalQualification(db, plan, bundle) {
  assert.ok(['127.0.0.1', 'localhost'].includes(db.connectionParameters?.host), 'local_qualification_host_required');
  assert.match((await db.query('select current_database() name')).rows[0].name, /^grookai_classic_canonical_proof_[a-z0-9_]+$/);
  assert.equal((await db.query('show transaction_isolation')).rows[0].transaction_isolation, 'serializable');
  assert.equal((await db.query('show transaction_read_only')).rows[0].transaction_read_only, 'off');
  assertClassicCanonicalPlan(plan, bundle); await bindClassicIdentityHashes(db, plan);
  await db.query("select pg_advisory_xact_lock(hashtext('pokemon_classic_canonical_admission_v1'))");
  await db.query("select pg_advisory_xact_lock(hashtext('pokemon_warehouse_discovery_intake_v1'))");
  // All source, collision and readback scopes stay frozen through commit.
  await db.query('lock table public.tcgcsv_source_products in share mode');
  await db.query(`lock table ${[...TABLES, 'external_discovery_candidates', 'raw_imports', 'external_printing_mappings', 'pokemon_species', 'finish_keys'].map(t => 'public.' + t).join(',')} in share row exclusive mode`);
  await verifyGroupPreservation(db, plan.ingress, { lock: true });
  const species = [...new Map(plan.tables.card_print_family_review_queue.filter(r => r.evidence_subject.species)
    .map(r => [r.evidence_subject.species.id, r.evidence_subject.species])).values()];
  const currentSpecies = (await db.query('select id,national_dex_number,display_name from public.pokemon_species where active and id=any($1::uuid[]) order by id for share', [species.map(s => s.id)])).rows;
  assert.deepEqual(keyed(currentSpecies), keyed(species), 'species_identity_drift');
  assert.equal((await db.query("select 1 from public.finish_keys where key='holo' and is_active")).rowCount, 1, 'active_holo_taxonomy_required');
  const existing = Number((await db.query('select count(*) n from sets where id=any($1::uuid[])', [plan.tables.sets.map(s => s.id)])).rows[0].n);
  if (existing) { await verifyClassicCanonicalReadback(db, plan); return { status: 'already_succeeded', inserted: 0 }; }
  await assertClassicCanonicalAbsence(db, plan);
  await applyDiscoveryIntakeBatch(db, plan.ingress, plan.ingress.entries, { authorization: {
    approved: true, plan_fingerprint: plan.ingress.fingerprint, operator: ACTOR, request: 'isolated local whole102 qualification only' } });
  for (const table of TABLES) {
    const rows = plan.tables[table];
    // One statement per dependency-ordered table bounds network round trips
    // while retaining every ordinary constraint and row trigger. Generated
    // columns remain in expected readback only; defaults remain database-owned.
    const columns = Object.keys(rows[0]).filter(c => !(table === 'card_prints' && c === 'number_plain'));
    assert.ok(columns.every(c => /^[a-z_]+$/.test(c)));
    for (const row of rows) assert.deepEqual(Object.keys(row), Object.keys(rows[0]), 'uniform_canonical_columns_required');
    const inserted = await db.query(`insert into public.${table} (${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`, [JSON.stringify(rows)]);
    assert.equal(inserted.rowCount, rows.length, `canonical_bulk_insert_count:${table}`);
  }
  await verifyClassicCanonicalReadback(db, plan);
  return { status: 'inserted_local_qualification', inserted: 102 };
}

export async function assertClassicCanonicalAbsence(db, plan) {
  const sets = plan.tables.sets, parents = plan.tables.card_prints, children = plan.tables.card_printings;
  const checks = [
    ['sets', 'id=any($1::uuid[]) or lower(code)=any($2::text[])', [sets.map(s => s.id), sets.map(s => s.code)]],
    ['card_prints', 'id=any($1::uuid[]) or gv_id=any($2::text[]) or set_id=any($3::uuid[]) or tcgplayer_id=any($4::text[])', [parents.map(p => p.id), parents.map(p => p.gv_id), sets.map(s => s.id), plan.lineage.map(r => String(r.product_id))]],
    ['card_print_identity', 'id=any($1::uuid[]) or identity_key_hash=any($2::text[]) or set_code_identity=any($3::text[])', [plan.tables.card_print_identity.map(p => p.id), plan.tables.card_print_identity.map(p => p.identity_key_hash), sets.map(s => s.code)]],
    ['card_printings', 'id=any($1::uuid[]) or printing_gv_id=any($2::text[]) or card_print_id=any($3::uuid[])', [children.map(p => p.id), children.map(p => p.printing_gv_id), parents.map(p => p.id)]],
    ['external_mappings', "source in ('tcgcsv','tcgplayer','justtcg') and external_id=any($1::text[])", [plan.lineage.flatMap(r => [String(r.product_id), `tcgcsv:3:${r.product_id}`, `tcgcsv:23323:${r.product_id}`])]],
  ];
  for (const [table, where, args] of checks) assert.equal((await db.query(`select 1 from public.${table} where ${where} limit 1`, args)).rowCount, 0, `canonical_collision:${table}`);
}

export async function verifyClassicCanonicalReadback(db, plan) {
  await verifyGroupPreservation(db, plan.ingress);
  await verifyDiscoveryIntakeBatch(db, plan.ingress, plan.ingress.entries);
  const parentIds = plan.tables.card_prints.map(p => p.id), setIds = plan.tables.sets.map(p => p.id), childIds = plan.tables.card_printings.map(p => p.id);
  const scopes = { sets: ['id=any($1::uuid[]) or lower(code)=any($2::text[])', [setIds, plan.tables.sets.map(s => s.code)]],
    card_prints: ['set_id=any($1::uuid[])', [setIds]], card_print_identity: ['card_print_id=any($1::uuid[])', [parentIds]],
    card_print_identity_source_evidence: ['card_print_id=any($1::uuid[])', [parentIds]], card_print_family_review_queue: ['card_print_id=any($1::uuid[])', [parentIds]],
    card_printings: ['card_print_id=any($1::uuid[])', [parentIds]], card_printing_truth_reviews: ['card_printing_id=any($1::uuid[])', [childIds]],
    external_mappings: ['card_print_id=any($1::uuid[])', [parentIds]] };
  const counts = {};
  for (const table of TABLES) {
    const expected = plan.tables[table], columns = Object.keys(expected[0]), [where, args] = scopes[table];
    const rows = (await db.query(`select ${columns.join(',')} from public.${table} where ${where}`, args)).rows;
    assert.deepEqual(keyed(plain(rows)), keyed(plain(expected)), `canonical_exact_readback:${table}`); counts[table] = rows.length;
  }
  assert.equal((await db.query('select 1 from public.card_prints where id=any($1::uuid[]) and (image_url is not null or image_path is not null or representative_image_url is not null)', [parentIds])).rowCount, 0, 'image_admission_is_separate');
  assert.equal((await db.query('select 1 from public.external_printing_mappings where card_printing_id=any($1::uuid[])', [childIds])).rowCount, 0, 'no_invented_provider_finish_mapping');
  return counts;
}
