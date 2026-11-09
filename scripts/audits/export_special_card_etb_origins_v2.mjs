import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {applyProductOrigins, fingerprint} from './export_special_card_etb_origins_v1.mjs';

export const VERSION = 'SPECIAL_CARD_ETB_MAIN_BRAND_PARITY_V2';
const V1_AUDIT = 'docs/audits/special_card_product_origins_v1_20261105';
const V2_AUDIT = 'docs/audits/special_card_product_origins_main_v2_20261105';
const WEB = 'apps/web/src/lib/cards/variantOriginPublicCopy.generated.json';
const payload = data => ({families:data.families, by_gv_id:data.by_gv_id, by_card_print_id:data.by_card_print_id});

function validateReview(packet, review) {
  assert.equal(review.version, 'SPECIAL_CARD_ETB_MAIN_INTEGRATION_REVIEW_V2');
  assert.equal(review.source_commit, 'd48ea00792787ca548c6d885a29bdf7fb128c7d2');
  assert.equal(review.baseline_web_payload_sha256, packet.baseline_payload_sha256);
  assert.equal(review.original_packet_fingerprint, fingerprint(packet), 'original_packet_changed');
  assert.ok(Object.values(review.boundaries).every(value => value === 0));
  const corrections = review.preserved_mobile_brand_corrections;
  assert.equal(corrections.length, 18);
  assert.equal(new Set(corrections.map(change => change.family_key)).size, 18);
  for (const change of corrections) {
    assert.equal(change.field, 'grookai_rule');
    assert.notEqual(change.before, change.after);
    assert.equal(change.before.replace(/\bGrookai\b/g, 'grookai'), change.after, 'brand_only_correction_required');
  }
}

// Reconstruct the exact V1 source payload for compatibility checks. The frozen
// V1 source packet and its baseline hash are never changed to accept new data.
export function projectOriginalV1(current, packet, review) {
  validateReview(packet, review);
  assert.ok(current.source_version.endsWith('+' + VERSION), 'v2_projection_requires_v2_output');
  const result = structuredClone(current);
  for (const change of review.preserved_mobile_brand_corrections) {
    assert.equal(result.families[change.family_key][change.field], change.after, 'current_main_brand_drift');
    result.families[change.family_key][change.field] = change.before;
  }
  result.source_version = result.source_version.slice(0, -VERSION.length - 1);
  result.generated_at = packet.prepared_at;
  result.source_fingerprint_sha256 = review.original_v1_export_fingerprint;
  return result;
}

export function applyMainProductOrigins(current, packet, review) {
  validateReview(packet, review);
  const source = current.source_version.endsWith('+' + VERSION) ? projectOriginalV1(current, packet, review) : current;
  for (const change of review.preserved_mobile_brand_corrections) {
    assert.equal(source.families[change.family_key][change.field], change.before, 'unexpected_pre_overlay_brand_text');
  }
  const result = applyProductOrigins(source, packet);
  assert.equal(result.source_fingerprint_sha256, review.original_v1_export_fingerprint, 'v1_source_projection_mismatch');
  for (const change of review.preserved_mobile_brand_corrections) result.families[change.family_key][change.field] = change.after;
  const retained = structuredClone(payload(result));
  for (const target of packet.targets) {
    delete retained.families[target.origin_family_key];
    retained.by_gv_id[target.gv_id] = target.prior_reference;
    retained.by_card_print_id[target.card_print_id] = target.prior_reference;
  }
  assert.equal(fingerprint(retained), review.baseline_mobile_payload_sha256, 'current_main_mobile_content_not_preserved');
  result.generated_at = review.prepared_at;
  result.source_version += '+' + VERSION;
  result.source_fingerprint_sha256 = fingerprint({version:VERSION, original_v1:review.original_v1_export_fingerprint,
    integration_review:fingerprint(review), payload:payload(result)});
  return result;
}

async function main() {
  const root = process.cwd();
  const bytes = await fs.readFile(path.join(root, V1_AUDIT, 'product_origins.json'));
  const packet = JSON.parse(bytes);
  const review = JSON.parse(await fs.readFile(path.join(root, V2_AUDIT, 'integration_review.json'), 'utf8'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), review.original_packet_sha256, 'frozen_v1_packet_bytes_changed');
  const current = JSON.parse(await fs.readFile(path.join(root, WEB), 'utf8'));
  const result = applyMainProductOrigins(current, packet, review);
  await fs.writeFile(path.join(root, WEB), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({status:'fresh_main_content_overlay_prepared',product_descriptions:4,
    existing_mobile_brand_corrections_preserved:18,source_fingerprint_sha256:result.source_fingerprint_sha256,database_writes:0}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
