import assert from 'node:assert/strict';
import { DECKS, sha256, identityNameKey } from './pokemon_classic_identity_evidence_v1.mjs';
import { classifyEvidence } from '../../scripts/audits/verified_master_set_index_v1/agreement_engine/classifier.mjs';

export const VERSION = 'POKEMON_CLASSIC_FINISH_EVIDENCE_V1';
export const REVIEW_METHOD = 'automated_visual_review_of_exact_final_english_photograph';
const hash = value => sha256(JSON.stringify(value));
const decode = s => s.replace(/&amp;/g, '&').replace(/&(?:#0?39|apos|#8217|rsquo);/g, "'")
  .replace(/&eacute;/g, 'é').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#x([a-f0-9]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const text = s => decode(s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '')).trim();
const coordinate = row => `${row.deck_code}-${row.number}`;
const expectedKeys = DECKS.flatMap(d => Array.from({ length: 34 }, (_, i) => `${d.printed_code}-${String(i + 1).padStart(3, '0')}`)).sort();
function exact102(rows) {
  assert.deepEqual(rows.map(coordinate).sort(), expectedKeys, 'whole102_exact_deck_coordinates_required');
}
function checkedAcquisition(source, host) {
  assert.equal(source.status, 200, 'successful_acquisition_required');
  assert.equal(source.verified_tls, true, 'verified_tls_required');
  for (const value of [source.url, source.final_url]) {
    const url = new URL(value); assert.equal(url.protocol, 'https:'); assert.equal(url.hostname, host, 'source_host_mismatch');
  }
  assert.ok(Number.isFinite(Date.parse(source.retrieved_at)), 'retrieval_time_required');
  assert.match(source.sha256, /^[a-f0-9]{64}$/);
  assert.equal(sha256(source.bytes), source.sha256, 'source_bytes_hash_mismatch');
}

// Read visible, exact Variant cells. Prices and rarity do not contribute a finish.
// Embedded metadata independently checks page scope and that no displayed row
// was silently lost, but is the SAME authority, never a second finish vote.
export function parseClassicPriceDex(source, deck) {
  checkedAcquisition(source, 'www.thepricedex.com');
  const expectedUrl = `https://www.thepricedex.com/set/${deck.printed_code.toLowerCase()}/pokemon-tcg-classic-${deck.slug}/price-list`;
  assert.equal(source.url, expectedUrl); assert.equal(source.final_url, expectedUrl);
  const html = source.bytes.toString('utf8');
  const match = html.match(/id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'source_scope_metadata_required');
  const data = JSON.parse(match[1]).props.pageProps, set = data.initialSetInfo;
  assert.equal(set.id, deck.printed_code.toLowerCase()); assert.equal(set.code, deck.printed_code);
  assert.equal(set.name, `Pokémon TCG Classic - ${deck.slug[0].toUpperCase()}${deck.slug.slice(1)}`);
  assert.equal(set.language, 'English'); assert.equal(set.languageCode, 'EN'); assert.equal(set.isOnlineOnly, false);
  assert.equal(set.printedTotal, 34); assert.equal(set.total, 34);
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)].filter(m => m[1].includes('price-list-card-name'));
  assert.equal(tables.length, 1, 'one_visible_checklist_required');
  const headers = [...tables[0][1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m => text(m[1]));
  assert.deepEqual(headers, ['☐', '#', 'Name', 'Rarity', 'Variant', 'Price', 'Info'], 'exact_variant_column_required');
  const body = tables[0][1].match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1]; assert.ok(body);
  const summaries = [];
  const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].flatMap(m => {
    const cells = [...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(c => text(c[1]));
    if (cells.length === 4) {
      assert.equal(cells[0], ''); assert.equal(cells[3], '');
      assert.match(cells[1], /^Total: 34 cards, \d+ variants$/); summaries.push(cells[1]); return [];
    }
    assert.equal(cells.length, 7); assert.match(cells[1], /^\d{1,2}$/);
    return [{ deck_code: deck.printed_code, number: cells[1].padStart(3, '0'), raw_name: cells[2], raw_rarity: cells[3], raw_variant: cells[4] }];
  });
  assert.deepEqual(summaries, [`Total: 34 cards, ${rows.length} variants`], 'checklist_summary_count_mismatch');
  assert.equal(data.initialCards.length, 34, 'metadata_whole34_required');
  const embedded = data.initialCards.flatMap(c => {
    assert.equal(c.expansion.id, set.id); assert.equal(c.expansion.printedTotal, 34);
    return c.variants.map(v => ({ number: String(c.number).padStart(3, '0'), raw_name: c.name, raw_variant: ({ holofoil: 'Holo', jumbo: 'Jumbo' })[v.name] ?? `UNKNOWN:${v.name}` }));
  });
  const projection = r => `${r.number}|${identityNameKey(r.raw_name)}|${r.raw_variant}`;
  assert.deepEqual(rows.map(projection).sort(), embedded.map(projection).sort(), 'visible_metadata_variant_disagreement');
  const standard = rows.filter(r => r.raw_variant === 'Holo'), outside = rows.filter(r => r.raw_variant !== 'Holo');
  assert.deepEqual(standard.map(r => r.number).sort(), Array.from({ length: 34 }, (_, i) => String(i + 1).padStart(3, '0')), 'whole34_explicit_holo_rows_required');
  for (const r of outside) assert.ok(r.deck_code === 'CLV' && r.number === '017' && r.raw_name === 'Lugia ex' && r.raw_variant === 'Jumbo', 'unreviewed_extra_variant_blocks_scope');
  assert.ok(outside.length <= 1, 'duplicate_outside_scope_variant');
  return { standard, outside };
}

export function qualifyClassicFinishes({ identity, checklists, photographs, review, reviewBytes }) {
  const { fingerprint, ...identityBody } = identity;
  assert.equal(hash(identityBody), fingerprint, 'identity_package_hash_mismatch');
  exact102(identity.joins); assert.equal(identity.cards.length, 102);
  assert.ok(identity.cards.every(c => c.status === 'master_verified'), 'qualified_identity_required');
  assert.equal(checklists.length, 3); assert.equal(photographs.length, 102); exact102(photographs);
  assert.equal(sha256(reviewBytes), hash(review), 'review_canonical_bytes_required');
  assert.equal(review.version, VERSION); assert.equal(review.actor_type, 'automated_agent');
  assert.equal(review.actor, 'Codex Pokemon relationship repair agent');
  assert.equal(review.human_signature, null); assert.equal(review.method, REVIEW_METHOD);
  assert.ok(Number.isFinite(Date.parse(review.reviewed_at))); assert.equal(review.identity_fingerprint, identity.fingerprint);
  exact102(review.rows);
  const photoHashes = new Set(), records = [], outsideScope = [];
  for (const deck of DECKS) {
    const source = checklists.find(s => s.key === 'pricedex-' + deck.printed_code.toLowerCase()); assert.ok(source);
    const parsed = parseClassicPriceDex(source, deck);
    outsideScope.push(...parsed.outside.map(r => ({ ...r, status: 'outside_standard_deck_scope_review_required', resolved: false,
      source_url: source.url, source_sha256: source.sha256,
      reason: 'Jumbo is a separate size claim, not a standard-card finish. No jumbo existence, identity or mapping admission is made.' })));
    for (const row of parsed.standard) {
      const key = coordinate(row), id = identity.joins.find(r => coordinate(r) === key);
      assert.equal(identityNameKey(row.raw_name), identityNameKey(id.card_name), `checklist_identity_conflict:${key}`);
      const photo = photographs.find(r => coordinate(r) === key), observed = review.rows.find(r => coordinate(r) === key);
      const host = key === 'CLC-027' ? 'i.ebayimg.com' : 'www.tcgmartlondon.com';
      checkedAcquisition(photo, host);
      assert.ok(!photoHashes.has(photo.sha256), 'reused_photo_cannot_prove_another_identity'); photoHashes.add(photo.sha256);
      assert.equal(observed.image_sha256, photo.sha256, `review_image_binding:${key}`);
      assert.equal(observed.image_url, photo.url); assert.equal(observed.printed_total, '034');
      assert.equal(identityNameKey(observed.printed_name), identityNameKey(id.card_name), `photo_identity_conflict:${key}`);
      assert.equal(observed.language, 'en'); assert.equal(observed.media_kind, 'final_physical_card_photograph');
      assert.equal(observed.identity_visible, true); assert.equal(observed.holographic_surface_visible, true);
      assert.equal(observed.finish_key, 'holo'); assert.deepEqual(observed.conflicts, []);
      assert.ok(['patterned_reflective_foil', 'diagonal_rainbow_foil'].includes(observed.surface_observation), 'explicit_surface_observation_required');
      assert.ok(Date.parse(review.reviewed_at) >= Date.parse(photo.retrieved_at), 'review_predates_acquisition');
      const common = { set_key: deck.set_key, set_name: identity.sets.find(s => s.set_key === deck.set_key).set_name,
        card_number: row.number, card_name: id.card_name, printed_deck_code: deck.printed_code, printed_total: '034',
        finish_key: 'holo', rarity: null, language: 'en', evidence_type: 'finish_presence' };
      records.push({ ...common, source_key: 'thepricedex_price_list', source_kind: 'marketplace_checklist', source_url: source.url,
        source_card_name: row.raw_name, finish_key_raw: row.raw_variant, retrieved_at: source.retrieved_at,
        evidence_label: `${deck.printed_code} ${row.number}/034 ${row.raw_name}: exact visible Variant cell Holo`,
        raw_snapshot_ref: `source_snapshots/${source.key}.html.gz#sha256=${source.sha256}`,
        notes: 'One checklist authority. Embedded prices, rarity and linked marketplaces are not additional finish evidence.' });
      records.push({ ...common, source_key: key === 'CLC-027' ? 'ebay_c2gcollect_physical_classic' : 'tcgmart_london_physical_classic',
        source_kind: 'collector_reference', source_url: photo.url, source_card_name: observed.printed_name,
        finish_key_raw: observed.surface_observation, retrieved_at: photo.retrieved_at,
        evidence_label: `${key}/034 ${observed.printed_name}: English identity and holographic surface visually reviewed`,
        raw_snapshot_ref: `photographs/${key}${key === 'CLC-027' ? '.jpg' : '.webp'}#sha256=${photo.sha256}`,
        notes: `Automated visual review ${hash(review)}; no human signature. Holo matches the exact checklist label. No Cosmos, Reverse, named pattern taxonomy or finish absence is inferred.` });
    }
  }
  const classified = classifyEvidence(records);
  assert.equal(classified.printings.length, 102); assert.equal(classified.conflicts.length, 0); assert.equal(classified.manual_review.length, 0);
  assert.ok(classified.printings.every(p => p.status === 'master_verified' && p.source_count === 2 && p.finish_key === 'holo'), 'independent_exact_finish_agreement_required');
  const profiles = DECKS.map(d => {
    const facts = classified.printings.filter(p => p.set_key === d.set_key).map(p => ({ set_key: p.set_key, card_number: p.card_number,
      card_name: p.card_name, finish_key: p.finish_key })).sort((a, b) => a.card_number.localeCompare(b.card_number));
    assert.equal(facts.length, 34);
    return { version: VERSION, scope: 'standard_english_deck_cards_only', set_key: d.set_key, printed_deck_code: d.printed_code,
      parents: 34, printings: 34, finish_counts: { holo: 34 }, exact_facts: facts, exact_facts_sha256: hash(facts),
      protected_facts: facts, forbidden_facts: [], conflicts: [], finish_absence_claims: [],
      outside_scope_reviews: outsideScope.filter(r => r.deck_code === d.printed_code), review_sha256: hash(review) };
  });
  const body = { version: VERSION, status: 'qualified_standard_deck_finish_candidate', actor_type: 'automated_agent',
    policy: 'exact_visible_checklist_variant_plus_independent_reviewed_physical_photo', human_signature: null,
    identity_fingerprint: identity.fingerprint, review_sha256: hash(review), records, printings: classified.printings, profiles,
    qualified_standard_printings: 102, outside_scope_reviews: outsideScope, whole_product_complete: false,
    write_ready: false, active_master_changed: false, production_writes: 0,
    limitations: ['Source qualification is not canonical executor authorization.', 'Named holographic subpatterns are preserved as observations, not new finish keys.',
      'Jumbo and other outside-standard product claims require separate qualification; no whole-product completeness claim.',
      'Active Master integration, guarded staging, normal Git/hooks and canonical set/parent/printing/mapping SQL proof remain separate gates.'] };
  return { ...body, fingerprint: hash(body) };
}
