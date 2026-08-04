import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateTcgplayerMarketQualificationV1,
} from '../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';

const migrationUrl = new URL(
  '../../supabase/migrations/20260804220000_tcgplayer_market_printing_truth_quarantine_v1.sql',
  import.meta.url,
);

test('printing truth quarantine is enforced at qualification and current-price reads', async () => {
  const sql = await fs.readFile(migrationUrl, 'utf8');

  assert.match(sql, /create or replace view public\.v_tcgplayer_market_qualification_candidates_v1/i);
  assert.match(sql, /create or replace view public\.v_market_price_current_v1/i);
  assert.match(sql, /truth_review\.card_printing_id = printing\.id/i);
  assert.match(sql, /truth_review\.card_printing_id = snapshot\.card_printing_id/i);
  assert.equal((sql.match(/hidden_pending_review/g) ?? []).length, 2);
  assert.equal((sql.match(/hidden_unsupported/g) ?? []).length, 2);
});

test('quarantine migration is non-destructive and does not mutate durable rows', async () => {
  const sql = await fs.readFile(migrationUrl, 'utf8');

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /\bdrop\s+table\b/i);
});

test('a hidden child resolved as no matching finish cannot publish', () => {
  const result = evaluateTcgplayerMarketQualificationV1({
    source_product_id: 228483,
    category_id: 3,
    source_product_active: true,
    source_product_catalog_status: 'current',
    has_printed_number_evidence: true,
    currency: 'USD',
    market_price: 10,
    source_row_hash: 'row-hash',
    source_observation_id: 'observation-id',
    source_sync_run_id: 'sync-run-id',
    source_artifact_id: 'artifact-id',
    source_artifact_hash: 'artifact-hash',
    source_artifact_byte_size: 1,
    source_price_row_identity: 'row-identity',
    source_sync_mode: 'current_full_sync',
    source_sync_status: 'completed',
    source_sync_failed_count: 0,
    source_sync_finished_at: new Date().toISOString(),
    source_mapping_count: 1,
    card_print_mapping_count: 1,
    source_mapping_id: 'mapping-id',
    mapping_method: 'exact',
    card_print_id: 'parent-id',
    gv_id: 'GV-PK-TEST-001-STAMP',
    identity_domain_count: 1,
    identity_domain: 'pokemon_eng_standard',
    normalized_finish_key: 'holo',
    source_subtype_name: 'Holofoil',
    derived_variant_assignment_status: 'no_matching_child_finish',
    card_printing_mapping_count: 0,
    duplicate_product_row_count: 1,
  });

  assert.equal(result.eligible, false);
  assert.equal(result.decision, 'quarantine');
  assert.ok(result.reason_codes.includes('variant_assignment_not_exact_child_finish'));
  assert.ok(result.reason_codes.includes('missing_exact_printing_finish_mapping'));
});

test('migration apply workflow is manual, SHA-bound, and dry-runs first', async () => {
  const workflow = await fs.readFile(
    new URL('../../.github/workflows/special-variant-printing-pricing-boundary-migration.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\bpush:/);
  assert.doesNotMatch(workflow, /\bschedule:/);
  assert.match(workflow, /APPLY_SPECIAL_VARIANT_PRICING_BOUNDARY_V1/);
  assert.match(workflow, /EXPECTED_SHA: \$\{\{ inputs\.expected_sha \}\}/);
  assert.match(workflow, /APPROVAL_PHRASE: \$\{\{ inputs\.approval_phrase \}\}/);
  assert.match(workflow, /test "\$GITHUB_SHA" = "\$EXPECTED_SHA"/);
  assert.doesNotMatch(workflow, /run:[\s\S]*\$\{\{ inputs\.expected_sha \}\}/);
  assert.doesNotMatch(workflow, /run:[\s\S]*\$\{\{ inputs\.approval_phrase \}\}/);
  assert.match(workflow, /db push[\s\S]*--dry-run[\s\S]*Apply frozen migration/);
  assert.match(workflow, /20260804220000/);
});
