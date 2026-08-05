import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  EXACT_IMAGE_FALLBACKS,
  EXPECTED_ROW_COUNT,
  STORAGE_BUCKET,
  STORAGE_PREFIX,
  buildPacketFingerprint,
  buildReviewManifest,
  buildStoragePath,
  observeImage,
  parseTcgplayerProductIdFromImageUrl,
  validateCatalogBinding,
  validateImageObservation,
} from '../../scripts/audits/special_variant_printing_self_hosted_evidence_v1.mjs';
import {
  MAX_BATCH_SIZE,
  VERSION as REVIEW_GATE_VERSION,
  expectedApprovalToken,
  selectAuthorizedRows,
  validateFounderArtifact,
} from '../../scripts/audits/special_variant_printing_review_gate_v1.mjs';
import { reconcile as reconcileSelfHostedEvidence } from '../../scripts/audits/special_variant_self_hosted_closeout_v1.mjs';

const planPath = 'docs/audits/special_variant_printing_self_hosted_evidence_v1/special_variant_printing_self_hosted_evidence_plan_v1.json';

function jpegFixture() {
  const bytes = Buffer.alloc(10_100, 0);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xc0;
  bytes.writeUInt16BE(17, 4);
  bytes[6] = 8;
  bytes.writeUInt16BE(500, 7);
  bytes.writeUInt16BE(350, 9);
  return bytes;
}

test('image observations are immutable, card-sized evidence', () => {
  const observation = observeImage(jpegFixture());
  assert.equal(observation.width, 350);
  assert.equal(observation.height, 500);
  assert.equal(observation.content_type, 'image/jpeg');
  assert.deepEqual(validateImageObservation(observation), []);
  assert.match(buildStoragePath({ card_printing_id: 'printing-1' }, observation), new RegExp(`^${STORAGE_PREFIX}printing-1/[0-9a-f]{64}\\.jpg$`));
});

test('catalog binding requires the exact active TCGplayer product record', () => {
  const queueRow = {
    source_product_id: 151706,
    source_product_title: 'Salazzle - SM73 (Prerelease) [Staff]',
    source_url: 'https://www.tcgplayer.com/product/151706/example',
    source_product_payload_hash: 'payload-hash',
  };
  const product = {
    product_id: 151706,
    name: queueRow.source_product_title,
    source_url: queueRow.source_url,
    payload_hash: queueRow.source_product_payload_hash,
    source_active: true,
    image_url: 'https://tcgplayer-cdn.tcgplayer.com/product/151706_200w.jpg',
  };
  assert.deepEqual(validateCatalogBinding(queueRow, product), []);
  assert.deepEqual(validateCatalogBinding(queueRow, { ...product, product_id: 151707 }), ['product_id_mismatch']);
  assert.equal(parseTcgplayerProductIdFromImageUrl(product.image_url), 151706);
});

test('exact fallbacks are isolated to the nine unavailable product IDs', () => {
  assert.equal(EXACT_IMAGE_FALLBACKS.size, 9);
  assert.equal(EXACT_IMAGE_FALLBACKS.get(151706)?.provider, 'ebay_exact_listing_photo');
  for (const [productId, source] of EXACT_IMAGE_FALLBACKS) {
    assert.ok(Number.isInteger(productId));
    assert.match(source.page_url, /^https:\/\//);
    assert.match(source.image_url, /^https:\/\//);
    assert.ok(source.page_title.length > 10);
  }
});

test('frozen plan contains all 143 rows and no automatic transition authority', () => {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  assert.equal(plan.selected_rows, EXPECTED_ROW_COUNT);
  assert.equal(plan.ready_rows, EXPECTED_ROW_COUNT);
  assert.equal(plan.blocked_rows, 0);
  assert.equal(plan.storage_writes_performed, false);
  assert.equal(plan.db_writes_performed, false);
  assert.equal(plan.approvals_performed, false);
  assert.equal(plan.publication_performed, false);
  assert.equal(plan.pricing_mappings_performed, false);
  assert.equal(new Set(plan.rows.map((row) => row.card_printing_id)).size, EXPECTED_ROW_COUNT);
  assert.ok(plan.rows.every((row) => row.storage_bucket === STORAGE_BUCKET));
  assert.ok(plan.rows.every((row) => row.storage_path.startsWith(STORAGE_PREFIX)));
  assert.ok(plan.rows.every((row) => row.automatic_approval_permitted === false));
  assert.equal(buildPacketFingerprint(plan.rows), plan.packet_fingerprint);
});

test('review manifest remains self-hosted and non-authoritative', () => {
  const sourceImage = {
    sha256: 'a'.repeat(64),
    size_bytes: 20_000,
    width: 700,
    height: 975,
    format: 'jpg',
    content_type: 'image/jpeg',
  };
  const row = {
    evidence_id: 'evidence-1',
    card_printing_id: 'printing-1',
    source_image: sourceImage,
    storage_bucket: STORAGE_BUCKET,
    storage_path: `${STORAGE_PREFIX}printing-1/${sourceImage.sha256}.jpg`,
    review_flags: [],
  };
  const manifest = buildReviewManifest(
    { rows: [row], packet_fingerprint: 'packet', source_queue_fingerprint: 'queue' },
    [{ evidence_id: row.evidence_id, storage_status: 'uploaded_and_verified' }],
  );
  assert.equal(manifest.self_hosted_only, true);
  assert.equal(manifest.server_writes_performed_by_review_portal, false);
  assert.equal(manifest.rows[0].self_hosted_verified, true);
  assert.equal(manifest.rows[0].automatic_approval_permitted, false);
  assert.equal(manifest.rows[0].automatic_publication_permitted, false);
  assert.equal(manifest.rows[0].automatic_pricing_mapping_permitted, false);
});

function reviewFixture() {
  const rows = Array.from({ length: 3 }, (_, index) => ({
    evidence_id: `evidence-${index}`,
    card_print_id: `00000000-0000-0000-0000-00000000000${index}`,
    card_printing_id: `10000000-0000-0000-0000-00000000000${index}`,
    truth_review_id: `20000000-0000-0000-0000-00000000000${index}`,
    printing_gv_id: `GV-${index}`,
    finish_key: 'holo',
    source_product_id: 100 + index,
    source_product_payload_hash: `payload-${index}`,
    source_provider: 'fixture',
    source_page_url: `https://example.com/${index}`,
    source_image: { sha256: String(index).repeat(64), size_bytes: 20_000 },
    storage_bucket: STORAGE_BUCKET,
    storage_path: `${STORAGE_PREFIX}${index}/${String(index).repeat(64)}.jpg`,
  }));
  const manifest = { packet_fingerprint: 'packet', rows };
  const decisions = rows.map((row, index) => ({
    evidence_id: row.evidence_id,
    card_printing_id: row.card_printing_id,
    source_image_sha256: row.source_image.sha256,
    first_pass_decision: 'exact_match',
    first_pass_decided_at: '2026-08-05T00:00:00.000Z',
    founder_decision: 'confirmed',
    publication_authorized: index !== 2,
    pricing_authorized: index === 0,
    notes: '',
    decided_at: '2026-08-05T01:00:00.000Z',
  }));
  const artifact = {
    version: 'SPECIAL_VARIANT_FOUNDER_DECISIONS_V1',
    packet_fingerprint: manifest.packet_fingerprint,
    source_first_pass_sha256: 'a'.repeat(64),
    source_first_pass_reviewer: 'PokeJavi',
    reviewer: 'founder',
    decision_count: decisions.length,
    remaining_count: 0,
    server_writes_performed: false,
    decisions,
  };
  return { manifest, artifact };
}

test('review gates preserve separate image, publication, and pricing authorization scopes', () => {
  const { manifest, artifact } = reviewFixture();
  assert.equal(validateFounderArtifact(manifest, artifact), artifact);
  assert.equal(selectAuthorizedRows(manifest, artifact, 'image', 0, 3).length, 3);
  assert.equal(selectAuthorizedRows(manifest, artifact, 'publication', 0, 2).length, 2);
  assert.equal(selectAuthorizedRows(manifest, artifact, 'pricing', 0, 1).length, 1);
  assert.equal(MAX_BATCH_SIZE, 25);
  assert.throws(() => selectAuthorizedRows(manifest, artifact, 'image', 0, 26), /between 1 and 25/);
});

test('founder artifacts reject identity drift and unauthorized transition combinations', () => {
  const { manifest, artifact } = reviewFixture();
  assert.throws(
    () => validateFounderArtifact(manifest, { ...artifact, packet_fingerprint: 'different' }),
    /packet mismatch/,
  );
  const invalid = structuredClone(artifact);
  invalid.decisions[2].pricing_authorized = true;
  assert.throws(() => validateFounderArtifact(manifest, invalid), /without publication authorization/);
});

test('approval token binds every mutable gate input', () => {
  const token = expectedApprovalToken('image', 'commit', 'packet', 'decision', 0, 25);
  assert.equal(token, `${REVIEW_GATE_VERSION}:image:commit:packet:decision:0:25`);
  assert.notEqual(token, expectedApprovalToken('publication', 'commit', 'packet', 'decision', 0, 25));
});

test('portal and executor preserve no-write review and canonical parent boundaries', () => {
  const portal = readFileSync('apps/web/src/components/review/SpecialVariantReviewClient.tsx', 'utf8');
  const imageRoute = readFileSync('apps/web/src/app/api/review/special-variants/image/[cardPrintingId]/route.ts', 'utf8');
  const executor = readFileSync('scripts/audits/special_variant_printing_review_gate_v1.mjs', 'utf8');
  assert.match(portal, /window\.localStorage/);
  assert.match(portal, /server_writes_performed: false/);
  assert.doesNotMatch(portal, /fetch\([^)]*,\s*\{[^}]*method:\s*["'](?:POST|PUT|PATCH|DELETE)/s);
  assert.match(imageRoute, /\.download\(row\.storage_path\)/);
  assert.match(imageRoute, /createHash\("sha256"\)\.update\(bytes\)\.digest\("hex"\)/);
  assert.match(imageRoute, /imageSha256 !== row\.source_image\.sha256/);
  assert.doesNotMatch(
    imageRoute,
    /\.from\([^)]*\)\s*\.(?:insert|update|upsert|delete|upload|remove|move|copy)\(/,
  );
  assert.match(executor, /MAX_BATCH_SIZE = 25/);
  assert.match(executor, /hidden_pending_review/);
  assert.match(executor, /pg_advisory_xact_lock/);
  assert.match(executor, /await client\.query\('rollback'\)/);
  assert.doesNotMatch(executor, /update\s+public\.card_prints\b/i);
  assert.doesNotMatch(executor, /delete\s+from\s+public\./i);
  assert.doesNotMatch(executor, /on\s+conflict/i);
});

test('manual workflows are bounded, SHA-bound, and never scheduled', () => {
  const evidenceWorkflow = readFileSync('.github/workflows/special-variant-self-hosted-evidence-v1.yml', 'utf8');
  const gateWorkflow = readFileSync('.github/workflows/special-variant-review-gates-v1.yml', 'utf8');
  for (const workflow of [evidenceWorkflow, gateWorkflow]) {
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /\bschedule:/);
    assert.doesNotMatch(workflow, /\bpush:/);
    assert.match(workflow, /cancel-in-progress: false/);
  }
  assert.match(evidenceWorkflow, /EXPECTED_COMMIT_SHA/);
  assert.match(evidenceWorkflow, /EXPECTED_PLAN_FINGERPRINT/);
  assert.match(evidenceWorkflow, /UPLOAD_SPECIAL_VARIANT_SELF_HOSTED_EVIDENCE_V1/);
  assert.match(gateWorkflow, /REVIEW_BATCH_SIZE/);
  assert.match(gateWorkflow, /SPECIAL_VARIANT_REVIEW_EXPECTED_DECISION_SHA/);
  assert.match(gateWorkflow, /SPECIAL_VARIANT_REVIEW_APPROVAL_TOKEN/);
  assert.match(gateWorkflow, /test "\$REVIEW_BATCH_SIZE" -le 25/);
  assert.doesNotMatch(gateWorkflow, /\$\{\{\s*inputs\.[^}]+\}\}[^\n]*node scripts\/audits/);
});

test('permanent reconciliation agrees across plan, storage readback, and review manifest', () => {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const result = JSON.parse(readFileSync(
    'docs/audits/special_variant_printing_self_hosted_evidence_v1/special_variant_printing_self_hosted_evidence_result_v1.json',
    'utf8',
  ));
  const manifest = JSON.parse(readFileSync(
    'apps/web/src/data/review/specialVariantPrintingEvidenceV1.json',
    'utf8',
  ));
  const reconciliation = reconcileSelfHostedEvidence(plan, result, manifest);
  assert.equal(reconciliation.status, 'passed');
  assert.equal(reconciliation.storage_readback_matches, EXPECTED_ROW_COUNT);
  assert.equal(reconciliation.review_manifest_rows, EXPECTED_ROW_COUNT);
  assert.deepEqual(reconciliation.failures, []);
});
