import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedPricingRefreshV1,
  validateMtgSealedPricingRefreshV1,
} from '../../backend/pricing/mtg_sealed_pricing_refresh_v1.mjs';

const digest = (value) => String(value).padStart(64, '0').slice(-64);

function canonical(id, overrides = {}) {
  return {
    variant_id: `variant-${id}`,
    family_id: `family-${id}`,
    source_mapping_id: `mapping-${id}`,
    source_product_id: id,
    canonical_name: `Product ${id}`,
    source_product_name: `Product ${id}`,
    package_form: 'booster_box',
    language_code: 'en',
    source_active: true,
    catalog_metadata_status: 'current',
    canonical_lineage_exact: true,
    ...overrides,
  };
}

function price(id, overrides = {}) {
  return {
    product_id: id,
    source_product_id: id,
    source_price_row_identity: `tcgplayer:${id}:normal:2026-09-04`,
    subtype_name_normalized: 'normal',
    observed_on: '2026-09-04',
    currency: 'USD',
    market_price: 20 + id,
    low_price: 18 + id,
    payload_hash: digest(id),
    ...overrides,
  };
}

function current(id, overrides = {}) {
  return {
    release_id: 'release-current',
    variant_id: `variant-${id}`,
    source_mapping_id: `mapping-${id}`,
    qualification_id: `qualification-${id}`,
    source_price_row_identity: `tcgplayer:${id}:normal:2026-09-04`,
    observed_on: '2026-09-04',
    market_price: 20 + id,
    source_observation_fingerprint: digest(id),
    ...overrides,
  };
}

function plan(overrides = {}) {
  const canonicalRows = [canonical(1), canonical(2), canonical(3), canonical(4)];
  return buildMtgSealedPricingRefreshV1({
    canonicalRows,
    latestPriceRows: canonicalRows.map((row) => price(row.source_product_id)),
    currentMembers: canonicalRows.map((row) => current(row.source_product_id)),
    latestSync: { id: 'sync-1', status: 'completed', observed_on: '2026-09-04' },
    imageEligibleVariantIds: canonicalRows.map((row) => row.variant_id),
    asOfDate: '2026-09-04',
    producerCommit: 'a'.repeat(40),
    ...overrides,
  });
}

test('clean exact pricing refresh is deterministic and unchanged', () => {
  const left = plan();
  const right = plan();
  assert.deepEqual(left, right);
  assert.equal(left.status, 'ready_for_separately_authorized_refresh');
  assert.deepEqual(left.counts.deltas, { unchanged: 4 });
  assert.deepEqual(validateMtgSealedPricingRefreshV1(left), {
    valid: true,
    findings: [],
  });
});

test('price changes and same-price observation refreshes remain distinct', () => {
  const value = plan({
    currentMembers: [
      current(1, { market_price: 1 }),
      current(2, { source_observation_fingerprint: digest(999) }),
      current(3), current(4),
    ],
  });
  assert.equal(value.rows.find((row) => row.variant_id === 'variant-1').delta,
    'price_changed');
  assert.equal(value.rows.find((row) => row.variant_id === 'variant-2').delta,
    'observation_refreshed_same_price');
});

test('missing image, stale, absent, and nonpositive prices fail closed', () => {
  const canonicalRows = [canonical(1), canonical(2), canonical(3), canonical(4)];
  const value = plan({
    canonicalRows,
    latestPriceRows: [
      price(1),
      price(2, { observed_on: '2026-08-20' }),
      price(4, { market_price: 0 }),
    ],
    imageEligibleVariantIds: ['variant-2', 'variant-3', 'variant-4'],
    thresholds: { maximum_removed_member_ratio: 1 },
  });
  assert.deepEqual(value.rows.map((row) => row.qualification_status), [
    'image_coverage_missing',
    'blocked_stale',
    'blocked_missing_observation',
    'blocked_missing_price',
  ]);
  assert.ok(value.rows.every((row) => row.delta === 'removed'));
  assert.equal(value.counts.qualified_variants, 0);
  assert.ok(value.findings.includes('empty_proposed_release'));
});

test('a stale warehouse authority and excessive removal block the gate', () => {
  const value = plan({
    latestSync: { id: 'sync-old', status: 'completed', observed_on: '2026-08-20' },
    asOfDate: '2026-09-04',
  });
  assert.equal(value.status, 'blocked_before_refresh');
  assert.ok(value.findings.includes('latest_sync_outside_operational_freshness'));
});

test('validator rejects a qualified row without image evidence', () => {
  const value = plan();
  value.rows[0].image_eligible = false;
  assert.ok(validateMtgSealedPricingRefreshV1(value).findings.includes(
    'unsupported_exact_qualification'));
});

test('live audit and workflow remain read-only and manually dispatched', () => {
  const audit = fs.readFileSync(
    'scripts/audits/mtg_sealed_pricing_refresh_v1.mjs', 'utf8');
  const workflow = fs.readFileSync(
    '.github/workflows/mtg-sealed-pricing-refresh-v1.yml', 'utf8');
  assert.match(audit, /repeatable read read only/i);
  assert.match(audit, /write_attribution: \[\]/);
  assert.doesNotMatch(audit,
    /\b(?:insert\s+into|update|delete\s+from|truncate)\s+public\./i);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\bschedule:/);
  assert.doesNotMatch(workflow, /migration_apply|execute-durable-apply/);
});
