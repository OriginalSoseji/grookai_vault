import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedImageStorageCanaryExecutionPlanV1,
  hashMtgSealedStorageCanaryV1,
  recoverMtgSealedImageStorageCanaryV1,
  retrieveMtgSealedCanarySourceBytesV1,
  runMtgSealedImageStorageCanaryV1,
  validateMtgSealedImageStorageCanaryExecutionPlanV1,
} from '../../backend/pricing/mtg_sealed_image_storage_canary_v1.mjs';
import { buildMtgSealedTransientImageCanaryPlanV1 } from
  '../../backend/pricing/mtg_sealed_image_canary_plan_v1.mjs';

function png(index) {
  const buffer = Buffer.alloc(2_100, index);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
  buffer.writeUInt32BE(100 + index, 16);
  buffer.writeUInt32BE(200 + index, 20);
  return buffer;
}

function coverageRow(index, buffer = png(index)) {
  const sha = hashMtgSealedStorageCanaryV1(buffer);
  return {
    release_id: '25626032-7d72-5542-a8e0-7a6532c2f776',
    release_member_id: `00000000-0000-0000-0001-${String(index).padStart(12, '0')}`,
    variant_id: `00000000-0000-0000-0002-${String(index).padStart(12, '0')}`,
    source_mapping_id: `00000000-0000-0000-0003-${String(index).padStart(12, '0')}`,
    game_key: 'mtg',
    canonical_name: `Fixture ${index}`,
    package_form: ['pack', 'box', 'deck', 'kit'][index % 4],
    source_product_id: index,
    classification: index === 1
      ? 'shared_bytes_exact_variant' : 'exact_image_ready',
    retrieval: {
      selected_source_url:
        `https://tcgplayer-cdn.tcgplayer.com/product/${index}_in_1000x1000.jpg`,
      selected_role: 'tcgplayer_source_high_resolution',
    },
    image: {
      valid_image: true,
      placeholder_suspected: false,
      format: 'png',
      content_type: 'image/png',
      width: 100 + index,
      height: 200 + index,
      size_bytes: buffer.length,
      sha256: sha,
    },
    proposed_storage_path: `sealed/mtg/sha256/${sha.slice(0, 2)}/${sha}.png`,
    fixture_buffer: buffer,
  };
}

function executionFixture() {
  const sourceRows = Array.from({ length: 20 }, (_, index) =>
    coverageRow(index + 1));
  const canaryPlan = buildMtgSealedTransientImageCanaryPlanV1(sourceRows, {
    count: 17,
  });
  const buffers = new Map(sourceRows.map((row) =>
    [row.image.sha256, row.fixture_buffer]));
  return {
    plan: buildMtgSealedImageStorageCanaryExecutionPlanV1({
      canaryPlan,
      canaryPlanFileSha256: 'a'.repeat(64),
      producerCommitSha: 'b'.repeat(40),
    }),
    buffers,
  };
}

test('execution plan is exact, deterministic, and separately authorized', () => {
  const left = executionFixture().plan;
  const right = executionFixture().plan;
  assert.equal(left.execution_fingerprint_sha256,
    right.execution_fingerprint_sha256);
  assert.equal(left.selected_object_count, 17);
  assert.equal(left.operation_contract.source_fetch_retries, 2);
  assert.equal(left.operation_contract.maximum_source_request_attempts, 51);
  assert.equal(left.operation_contract.tls_trust_policy,
    'node_bundled_plus_windows_system_ca');
  assert.equal(left.operation_contract.tls_certificate_verification_required,
    true);
  assert.equal(left.boundaries.database_connections, 0);
  assert.equal(left.boundaries.durable_storage_objects, 0);
  assert.match(left.required_approval_message,
    /exactly 17 upsert=false transient uploads/);
  assert.deepEqual(validateMtgSealedImageStorageCanaryExecutionPlanV1(left), {
    valid: true,
    findings: [],
  });
});

test('source retrieval retries only within the frozen transport ceiling', async () => {
  const { plan, buffers } = executionFixture();
  const row = plan.rows[0];
  const journal = [];
  const delays = [];
  let calls = 0;
  const result = await retrieveMtgSealedCanarySourceBytesV1({
    row,
    maximumBytes: 20_000_000,
    retryCount: 2,
    requestSourceBytes: async () => {
      calls += 1;
      if (calls < 3) {
        const error = new Error('fetch failed');
        error.cause = { code: 'ECONNRESET' };
        error.retryable = true;
        throw error;
      }
      return {
        buffer: buffers.get(row.expected_image.content_sha256),
        contentType: row.expected_image.content_type,
      };
    },
    sleep: async (milliseconds) => { delays.push(milliseconds); },
    journal: async (event) => { journal.push(event); },
  });
  assert.equal(result.requestAttempts, 3);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [1_000, 2_000]);
  assert.equal(journal.filter((event) =>
    event.event === 'source_request_failed').length, 2);
  assert.ok(journal.filter((event) =>
    event.event === 'source_request_failed')
    .every((event) => event.error_code === 'econnreset'));
});

test('non-retryable source failures stop after one recorded attempt', async () => {
  const { plan } = executionFixture();
  const row = plan.rows[0];
  let calls = 0;
  await assert.rejects(async () => retrieveMtgSealedCanarySourceBytesV1({
    row,
    maximumBytes: 20_000_000,
    retryCount: 2,
    requestSourceBytes: async () => {
      calls += 1;
      const error = new Error('source too large');
      error.code = 'source_too_large';
      error.retryable = false;
      throw error;
    },
    sleep: async () => { throw new Error('must_not_sleep'); },
  }), /source_transport_source_too_large_after_1_attempts/);
  assert.equal(calls, 1);
});

test('execution plan rejects host, path, scope, and operation drift', () => {
  const { plan } = executionFixture();
  plan.rows[0].source_image_url = 'https://example.com/image.jpg';
  plan.rows[1].upload_upsert = true;
  plan.boundaries.database_reads = 1;
  const validation = validateMtgSealedImageStorageCanaryExecutionPlanV1(plan);
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.includes('source_url_not_exact'));
  assert.ok(validation.findings.includes('upsert_not_false'));
  assert.ok(validation.findings.includes('nonzero_forbidden_boundary'));
});

test('successful canary uploads, verifies, removes, and proves absence', async () => {
  const { plan, buffers } = executionFixture();
  const objects = new Map();
  const result = await runMtgSealedImageStorageCanaryV1({
    plan,
    fetchSourceBytes: async (row) => ({
      buffer: buffers.get(row.expected_image.content_sha256),
      contentType: row.expected_image.content_type,
    }),
    storage: {
      objectExists: async (row) => objects.has(row.transient_object_path),
      upload: async (row, buffer) => {
        assert.equal(objects.has(row.transient_object_path), false);
        objects.set(row.transient_object_path, buffer);
      },
      download: async (row) => ({
        buffer: objects.get(row.transient_object_path),
        contentType: row.expected_image.content_type,
      }),
      remove: async (paths) => paths.forEach((value) => objects.delete(value)),
    },
  });
  assert.equal(result.status,
    'passed_uploaded_read_back_removed_and_absent');
  assert.equal(result.uploaded_count, 17);
  assert.equal(result.readback_verified_count, 17);
  assert.equal(result.removed_count, 17);
  assert.equal(result.durable_objects_after_run, 0);
  assert.equal(objects.size, 0);
});

test('partial upload failure removes every execution-owned object', async () => {
  const { plan, buffers } = executionFixture();
  const objects = new Map();
  let uploads = 0;
  const result = await runMtgSealedImageStorageCanaryV1({
    plan,
    fetchSourceBytes: async (row) => ({
      buffer: buffers.get(row.expected_image.content_sha256),
      contentType: row.expected_image.content_type,
    }),
    storage: {
      objectExists: async (row) => objects.has(row.transient_object_path),
      upload: async (row, buffer) => {
        uploads += 1;
        if (uploads === 6) throw new Error('fixture_upload_failure');
        objects.set(row.transient_object_path, buffer);
      },
      download: async (row) => ({
        buffer: objects.get(row.transient_object_path),
        contentType: row.expected_image.content_type,
      }),
      remove: async (paths) => paths.forEach((value) => objects.delete(value)),
    },
  });
  assert.equal(result.status, 'failed_and_absence_verified');
  assert.equal(result.uploaded_count, 5);
  assert.equal(result.removed_count, 5);
  assert.equal(result.final_absent_count, 17);
  assert.equal(objects.size, 0);
});

test('pre-existing collision stops before source retrieval and upload', async () => {
  const { plan } = executionFixture();
  let fetches = 0;
  let uploads = 0;
  const result = await runMtgSealedImageStorageCanaryV1({
    plan,
    fetchSourceBytes: async () => {
      fetches += 1;
      throw new Error('must_not_fetch');
    },
    storage: {
      objectExists: async (row) => row === plan.rows[0],
      upload: async () => { uploads += 1; },
      download: async () => { throw new Error('must_not_download'); },
      remove: async () => { throw new Error('must_not_remove'); },
    },
  });
  assert.equal(result.status, 'failed_cleanup_incomplete');
  assert.equal(fetches, 0);
  assert.equal(uploads, 0);
  assert.match(result.errors.join(','), /Storage collision before upload/);
});

test('recovery refuses cleanup without verified write-ahead ownership', async () => {
  const { plan } = executionFixture();
  await assert.rejects(() => recoverMtgSealedImageStorageCanaryV1({
    plan,
    ownershipScopeVerified: false,
    storage: {
      objectExists: async () => false,
      remove: async () => {},
    },
  }), /verified write-ahead ownership scope/);
});

test('recovery removes only frozen execution paths and proves absence', async () => {
  const { plan } = executionFixture();
  const unrelatedPath = 'sealed/mtg/not-owned/preserve.jpg';
  const objects = new Set([
    ...plan.rows.slice(0, 6).map((row) => row.transient_object_path),
    unrelatedPath,
  ]);
  const removed = [];
  const result = await recoverMtgSealedImageStorageCanaryV1({
    plan,
    ownershipScopeVerified: true,
    storage: {
      objectExists: async (row) => objects.has(row.transient_object_path),
      remove: async (paths) => {
        removed.push(...paths);
        paths.forEach((value) => objects.delete(value));
      },
    },
  });
  assert.equal(result.status, 'recovery_passed_all_execution_paths_absent');
  assert.equal(result.discovered_present_count, 6);
  assert.equal(result.removed_count, 6);
  assert.equal(result.final_absent_count, 17);
  assert.deepEqual(removed.sort(), plan.rows.slice(0, 6)
    .map((row) => row.transient_object_path).sort());
  assert.equal(objects.has(unrelatedPath), true);
});

test('operator has exact authority and no database or signer path', () => {
  const source = fs.readFileSync(
    'scripts/audits/mtg_sealed_image_storage_canary_v1.mjs', 'utf8');
  assert.match(source, /MTG_SEALED_IMAGE_STORAGE_CANARY_APPROVAL_ENV_V1/);
  assert.match(source, /upsert: false/);
  assert.match(source, /\.download\(/);
  assert.match(source, /\.remove\(/);
  assert.match(source, /--recover/);
  assert.match(source, /ownership_scope_activated/);
  assert.match(source, /NODE_TLS_REJECT_UNAUTHORIZED/);
  assert.match(source, /--use-system-ca/);
  assert.doesNotMatch(source, /new Client\(|\.rpc\(|functions\.deploy/);
});

test('operator runs with bundled and Windows system CA trust', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(
    packageJson.scripts['mtg:sealed:image-storage-canary:v1'],
    'node --use-system-ca scripts/audits/mtg_sealed_image_storage_canary_v1.mjs',
  );
  const source = fs.readFileSync(
    'scripts/audits/mtg_sealed_image_storage_canary_v1.mjs', 'utf8');
  assert.match(source, /getCACertificates\('system'\)/);
  assert.match(source, /getCACertificates\('bundled'\)/);
  assert.match(source, /Unfrozen custom TLS certificate inputs are not allowed/);
});
