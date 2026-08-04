import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  buildOperationalWorklists,
} from '../../scripts/audits/special_variant_printing_operational_worklists_v1.mjs';

const readJson = (relativePath) => fs.readFile(
  new URL(`../../${relativePath}`, import.meta.url),
  'utf8',
).then(JSON.parse);

async function build() {
  const [authority, manifest, coverage] = await Promise.all([
    readJson('docs/audits/special_variant_printing_authority_v1/special_variant_printing_authority_v1.json'),
    readJson('docs/audits/special_variant_printing_authority_v1/special_variant_printing_guarded_manifest_v1.json'),
    readJson('docs/audits/special_variant_printing_coverage_v1/special_variant_printing_coverage_v1.json'),
  ]);
  return buildOperationalWorklists({
    authority,
    manifest,
    coverage,
    generatedAt: '2026-08-04T00:00:00.000Z',
  });
}

test('human review queue preserves all 143 hidden candidates without approval', async () => {
  const { humanReview } = await build();

  assert.equal(humanReview.rows.length, 143);
  assert.equal(new Set(humanReview.rows.map((row) => row.card_printing_id)).size, 143);
  assert.equal(new Set(humanReview.rows.map((row) => row.truth_review_id)).size, 143);
  assert.ok(humanReview.rows.every((row) => row.durable_state.review_status === 'quarantined_candidate'));
  assert.ok(humanReview.rows.every((row) => row.durable_state.public_visibility === 'hidden_pending_review'));
  assert.ok(humanReview.rows.every((row) => row.human_disposition === null));
  assert.ok(humanReview.rows.every((row) => row.automatic_approval_permitted === false));
  assert.ok(humanReview.rows.every((row) => row.pricing_policy === 'prohibited_while_hidden_pending_review'));
});

test('source queue preserves every blocked lane and introduces no apply authority', async () => {
  const { sourceAcquisition } = await build();

  assert.equal(sourceAcquisition.rows.length, 2886);
  assert.deepEqual(sourceAcquisition.summary.by_lane, {
    identity_or_finish_conflict: 381,
    missing_child_no_source_finish_evidence: 2406,
    public_child_identity_incomplete: 60,
    tcgcsv_product_missing: 1,
    variant_identity_corroborated_finish_needs_second_source: 38,
  });
  assert.ok(sourceAcquisition.rows.every((row) => row.automatic_apply_permitted === false));
});

test('exact-image queue captures every non-exact image without treating representatives as proof', async () => {
  const { exactImages } = await build();

  assert.equal(exactImages.rows.length, 3295);
  assert.equal(exactImages.summary.applied_hidden_priority, 142);
  assert.equal(exactImages.summary.applied_hidden_exact_already_available, 1);
  assert.ok(exactImages.rows.every((row) => row.current_image_status !== 'exact'));
  assert.ok(exactImages.rows.every((row) => row.representative_image_proves_variant_marker === false));
  assert.ok(exactImages.rows.every((row) => row.automatic_identity_promotion_permitted === false));
});

test('operational worklist generator contains no database mutation client', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/special_variant_printing_operational_worklists_v1.mjs', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /\b(?:insert|update|delete|upsert)\s+into\b/i);
  assert.doesNotMatch(source, /\bfrom\([^)]*\)\s*\.\s*(?:insert|update|delete|upsert)\b/i);
  assert.doesNotMatch(source, /\bSUPABASE_(?:URL|SECRET|SERVICE)/);
});
