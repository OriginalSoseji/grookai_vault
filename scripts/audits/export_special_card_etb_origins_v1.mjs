import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const VERSION = 'SPECIAL_CARD_ETB_PRODUCT_ORIGINS_V1';
export const TARGETS = Object.freeze({
  'GV-PK-PR-SV-173': ['a36f8d8a-353f-4cca-ba89-912eb7f10c3a', 'special_card_etb_eevee_173_unstamped'],
  'GV-PK-SVP-173-POKEMON-CENTER-STAMP': ['cffe987c-a680-4f7e-b1cf-96c89bc9e229', 'special_card_etb_eevee_173_pokemon_center'],
  'GV-PK-PR-SV-051': ['c7171ec8-743d-453d-bc8b-47517986916f', 'special_card_etb_snorlax_051_unstamped'],
  'GV-PK-SVP-051-POKEMON-CENTER-STAMP': ['f605056d-5521-4dcf-a6e2-176b6d2ca7b5', 'special_card_etb_snorlax_051_pokemon_center'],
});
const AUDIT = 'docs/audits/special_card_product_origins_v1_20261105';
const WEB = 'apps/web/src/lib/cards/variantOriginPublicCopy.generated.json';
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const fingerprint = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const payload = data => ({families:data.families, by_gv_id:data.by_gv_id, by_card_print_id:data.by_card_print_id});

export function applyProductOrigins(current, packet) {
  assert.equal(packet.version, VERSION);
  assert.deepEqual(packet.targets.map(row => row.gv_id).sort(), Object.keys(TARGETS).sort(), 'exact_four_card_cohort_required');
  assert.ok(Object.values(packet.boundaries).every(value => value === 0), 'content_only_boundaries');
  const result = structuredClone(current);
  const baseline = structuredClone(payload(current));
  const alreadyApplied = String(current.source_version).endsWith('+' + VERSION);
  const documents = new Map(packet.source_documents.map(source => [source.id, source]));
  assert.equal(documents.size, packet.source_documents.length, 'duplicate_source_id');
  for (const source of documents.values()) {
    assert.equal(source.tier, 'TIER_1');
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(['www.pokemon.com', 'press.pokemon.com'].includes(url.hostname), 'official_product_source_required');
  }
  for (const target of packet.targets) {
    const [id, familyKey] = TARGETS[target.gv_id];
    assert.equal(target.card_print_id, id, 'canonical_uuid_mismatch');
    assert.equal(target.origin_family_key, familyKey, 'target_family_mismatch');
    assert.equal(target.identity_domain, 'pokemon_eng_standard');
    assert.equal(target.public_copy.family_key, familyKey);
    assert.equal(target.prior_reference.card_print_id, id);
    assert.equal(target.prior_reference.gv_id, target.gv_id);
    assert.equal(target.prior_reference.origin_family_key, 'sv_black_star_promos');
    const expectedVariant = target.gv_id.endsWith('-POKEMON-CENTER-STAMP') ? 'pokemon_center_stamp' : '';
    assert.equal(target.variant_key, expectedVariant);
    assert.equal(target.image_review.pokemon_center_logo, expectedVariant ? 'present' : 'absent');
    assert.equal(target.image_review.status, 'current_parent_visual_identity_matches');
    const urls = target.source_ids.map(sourceId => {
      assert.ok(documents.has(sourceId), 'missing_official_product_source');
      return documents.get(sourceId).url;
    });
    assert.deepEqual([...target.public_copy.source_urls].sort(), [...urls].sort(), 'copy_sources_must_match_review');
    for (const distribution of target.distribution) {
      assert.ok(distribution.source_ids.length > 0);
      assert.ok(distribution.source_ids.every(sourceId => target.source_ids.includes(sourceId)));
    }
    for (const field of ['family_label', 'why_it_exists', 'why_collectors_care', 'how_to_identify', 'grookai_rule']) {
      assert.ok(target.public_copy[field]?.trim(), 'missing_public_copy:' + field);
    }
    const wanted = {...target.prior_reference, origin_family_key:familyKey};
    const before = alreadyApplied ? wanted : target.prior_reference;
    assert.deepEqual(current.by_gv_id[target.gv_id], before, 'gv_id_reference_drift');
    assert.deepEqual(current.by_card_print_id[id], before, 'uuid_reference_drift');
    if (alreadyApplied) {
      assert.deepEqual(current.families[familyKey], target.public_copy, 'existing_exact_copy_drift');
      baseline.by_gv_id[target.gv_id] = target.prior_reference;
      baseline.by_card_print_id[id] = target.prior_reference;
      delete baseline.families[familyKey];
    } else {
      assert.ok(!Object.hasOwn(current.families, familyKey), 'family_key_collision');
    }
    result.families[familyKey] = structuredClone(target.public_copy);
    result.by_gv_id[target.gv_id] = wanted;
    result.by_card_print_id[id] = wanted;
  }
  assert.equal(fingerprint(baseline), packet.baseline_payload_sha256, 'unreviewed_baseline_copy_drift');
  result.generated_at = packet.prepared_at;
  result.source_version = alreadyApplied ? current.source_version : current.source_version + '+' + VERSION;
  result.summary = {...current.summary, public_copy_safe_parent_rows:Object.keys(result.by_card_print_id).length,
    public_copy_safe_families:Object.keys(result.families).length,
    special_card_etb_product_origin_rows:4, special_card_etb_product_origin_families:4};
  result.source_fingerprint_sha256 = fingerprint({version:VERSION, packet:fingerprint(packet), payload:payload(result)});
  return result;
}

async function main() {
  const root = process.cwd();
  const packet = JSON.parse(await fs.readFile(path.join(root, AUDIT, 'product_origins.json'), 'utf8'));
  const current = JSON.parse(await fs.readFile(path.join(root, WEB), 'utf8'));
  const output = applyProductOrigins(current, packet);
  await fs.writeFile(path.join(root, WEB), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify({version:VERSION, exact_product_descriptions:4, source_fingerprint_sha256:output.source_fingerprint_sha256,
    database_writes:0, storage_uploads:0, image_changes:0}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
