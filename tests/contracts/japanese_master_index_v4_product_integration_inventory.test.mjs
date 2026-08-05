import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  EXPECTED_PREFLIGHT_FINGERPRINT,
  EXPECTED_SCOPE_COUNT,
  EXPECTED_WRITER_PAYLOAD_FINGERPRINT,
  buildInventoryRows,
  buildSummary,
  classifyChildEligibility,
  classifyParentImage,
  isSelfHostedImagePath,
} from '../../scripts/audits/japanese_master_index_v4/product_integration_inventory_v1.mjs';
import { readVerifiedArtifact } from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';
import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const LIVE_ARTIFACT =
  'docs/audits/japanese_master_index_v4/product_integration_inventory_v1/'
  + 'jpn_product_integration_inventory_v1.json';

function liveRow(overrides = {}) {
  return {
    position: 1,
    card_print_id: '11111111-1111-4111-8111-111111111111',
    gv_id: 'GV-PK-JPN-TEST-001',
    name: 'Test Card',
    set_code: 'jpn-test',
    number: '001',
    identity_domain: 'pokemon_jpn',
    image_source: 'identity',
    image_path: null,
    image_url: 'https://example.test/card.png',
    image_alt_url: null,
    representative_image_url: null,
    image_status: 'ok',
    image_note: 'Evidence pointer.',
    live_child_count: 0,
    live_child_public_id_count: 0,
    family_review_id: '22222222-2222-4222-8222-222222222222',
    family_status: 'resolved_species',
    family_review_status: 'pending',
    family_link_promotion_allowed: false,
    family_review_active: true,
    reviewed_by: null,
    reviewed_at: null,
    print_search_document_count: 1,
    legacy_search_row_count: 1,
    search_v2_row_count: 1,
    legacy_fingerprint_count: 0,
    verified_legacy_fingerprint_count: 0,
    scanner_fingerprint_count: 0,
    verified_scanner_fingerprint_count: 0,
    ...overrides,
  };
}

function plannedChild(cardPrintId = liveRow().card_print_id) {
  return {
    apply_lane: 'deferred_visibility_and_storage_gate',
    gate_blockers: [
      'separate_public_visibility_approval_required',
      'self_hosted_image_pointer_not_proven',
    ],
    db_row: {
      id: '33333333-3333-4333-8333-333333333333',
      card_print_id: cardPrintId,
      printing_gv_id: 'GV-PK-JPN-TEST-001-STD',
      finish_key: 'normal',
      image_path: null,
    },
  };
}

test('inventory pins the exact applied Japanese V4 scope', () => {
  assert.equal(EXPECTED_SCOPE_COUNT, 5_336);
  assert.equal(
    EXPECTED_WRITER_PAYLOAD_FINGERPRINT,
    'b11c033901f8cb94b641f2c6e7f3586a3db2bc994242f7d8aa28cb2198218e2c',
  );
  assert.equal(
    EXPECTED_PREFLIGHT_FINGERPRINT,
    'b269de1cae5bb83113e9b88f27400613fca92508c681950861c62213cd6ec36b',
  );
});

test('image classification separates external evidence from self hosting', () => {
  assert.deepEqual(classifyParentImage(liveRow()), {
    status: 'external_image_pointer_only',
    self_hosted: false,
    has_external_pointer: true,
    has_any_pointer: true,
  });
  assert.equal(
    isSelfHostedImagePath(
      'warehouse-derived/self-hosted-images-v1/card_prints/test/card.webp',
    ),
    true,
  );
  assert.equal(classifyParentImage(liveRow({
    image_path:
      'warehouse-derived/self-hosted-images-v1/card_prints/test/card.webp',
  })).status, 'self_hosted');
});

test('child eligibility stays blocked without printing-level evidence', () => {
  const result = classifyChildEligibility({
    plannedChild: plannedChild(),
    parentImage: classifyParentImage(liveRow()),
    liveChildCount: 0,
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.structurally_complete, true);
  assert.ok(result.blockers.includes(
    'printing_level_finish_evidence_not_established',
  ));
  assert.ok(result.blockers.includes(
    'self_hosted_image_pointer_not_proven',
  ));
});

test('row inventory keeps search reachability separate from scanner readiness', () => {
  const live = liveRow();
  const rows = buildInventoryRows(
    [live],
    new Map([[live.card_print_id, plannedChild(live.card_print_id)]]),
  );
  assert.equal(rows[0].search.parent_search_reachable, true);
  assert.equal(rows[0].scanner.currently_indexed, false);
  assert.equal(rows[0].scanner.external_image_seed_available, true);
  assert.equal(rows[0].child_printing.status, 'blocked');
});

test('summary treats product gaps as governed states, not reconciliation failures', () => {
  const live = liveRow();
  const base = buildInventoryRows(
    [live],
    new Map([[live.card_print_id, plannedChild(live.card_print_id)]]),
  )[0];
  const rows = Array.from({ length: EXPECTED_SCOPE_COUNT }, (_, index) => ({
    ...structuredClone(base),
    position: index + 1,
    card_print_id: `${String(index).padStart(8, '0')}-1111-4111-8111-111111111111`,
    gv_id: `GV-PK-JPN-TEST-${index}`,
  }));
  const summary = buildSummary(rows, [{ gv_id: rows[0].gv_id, matched: true }]);
  assert.deepEqual(summary.findings, []);
  assert.equal(summary.images.self_hosted_parent_rows, 0);
  assert.equal(summary.child_printings.publication_eligible_now, 0);
  assert.equal(summary.search.print_identity_parent_documents, EXPECTED_SCOPE_COUNT);
  assert.equal(summary.scanner.currently_indexed_parent_rows, 0);
});

test('inventory source contains no mutation or storage execution path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/product_integration_inventory_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /\b(?:insert|update|delete|merge|truncate)\s+(?:into|from|public\.)/i);
  assert.doesNotMatch(source, /\.storage\s*\./i);
  assert.doesNotMatch(source, /--apply|--write|--upload/);
  assert.match(source, /withReadOnlyClient/);
  assert.match(source, /database_writes: false/);
});

test('live inventory freezes the exact production integration counts', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_ARTIFACT);
  assert.equal(
    artifact.package_id,
    'JPN-MASTER-INDEX-V4-PRODUCT-INTEGRATION-INVENTORY-V1',
  );
  assert.equal(artifact.content.status, 'inventory_complete_read_only');
  assert.deepEqual(artifact.content.summary.findings, []);
  assert.equal(artifact.content.summary.scope.applied_parent_rows, 5_336);
  assert.equal(artifact.content.summary.images.self_hosted_parent_rows, 0);
  assert.equal(artifact.content.summary.images.external_pointer_parent_rows, 5_336);
  assert.equal(artifact.content.summary.child_printings.publication_eligible_now, 0);
  assert.equal(artifact.content.summary.child_printings.blocked_now, 5_336);
  assert.equal(artifact.content.summary.family_reviews.family_status_counts.resolved_species, 3_853);
  assert.equal(artifact.content.summary.family_reviews.family_status_counts.resolved_domain, 1_483);
  assert.equal(artifact.content.summary.search.print_identity_parent_documents, 5_336);
  assert.equal(artifact.content.summary.scanner.currently_indexed_parent_rows, 0);
  assert.equal(artifact.content.execution_boundary.database_writes, false);
});

test('live row shards verify and preserve one record per applied parent', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_ARTIFACT);
  const descriptor = artifact.content.row_dataset;
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact: shard } = await readVerifiedArtifact(shardPath);
    rows.push(...shard.content.rows);
  }
  assert.equal(rows.length, descriptor.row_count);
  assert.equal(rows.length, EXPECTED_SCOPE_COUNT);
  assert.equal(contentFingerprint(rows), descriptor.content_fingerprint_sha256);
  assert.equal(new Set(rows.map((row) => row.card_print_id)).size, EXPECTED_SCOPE_COUNT);
  assert.equal(rows.every((row) => row.search.parent_search_reachable), true);
  assert.equal(rows.every((row) => !row.image.self_hosted), true);
  assert.equal(rows.every((row) => row.child_printing.status === 'blocked'), true);
  assert.equal(rows.every((row) => !row.scanner.currently_indexed), true);
});
