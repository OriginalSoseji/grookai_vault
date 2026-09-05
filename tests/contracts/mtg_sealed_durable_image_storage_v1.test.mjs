import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';

import {
  buildMtgSealedDurableImagePlanV1,
} from '../../backend/pricing/mtg_sealed_durable_image_plan_v1.mjs';
import {
  buildMtgSealedDurableImageStorageExecutionPlanV1,
  hashMtgSealedDurableImageStorageV1,
  processMtgSealedDurableImageObjectV1,
  retrieveMtgSealedDurableImageSourceBytesV1,
  runMtgSealedDurableImageStorageV1,
  validateMtgSealedDurableImageStorageExecutionPlanV1,
  validateMtgSealedDurableImageResumeJournalV1,
} from '../../backend/pricing/mtg_sealed_durable_image_storage_v1.mjs';

const EXPECTATIONS = Object.freeze({
  selected_members: 6,
  eligible_variants: 4,
  eligible_objects: 3,
  exclusions: 2,
  source_reported_unique_valid_images: 4,
  excluded_placeholder_images: 1,
});
const VALIDATION_OPTIONS = Object.freeze({
  coverageFingerprint: 'a'.repeat(64),
  expectations: EXPECTATIONS,
});

function png(seed) {
  const buffer = Buffer.alloc(2_100, seed);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
  buffer.writeUInt32BE(100 + seed, 16);
  buffer.writeUInt32BE(200 + seed, 20);
  return buffer;
}

function imageFor(buffer, overrides = {}) {
  return {
    valid_image: true,
    placeholder_suspected: false,
    format: 'png',
    content_type: 'image/png',
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    size_bytes: buffer.length,
    sha256: hashMtgSealedDurableImageStorageV1(buffer),
    diagnostics: [],
    ...overrides,
  };
}

function coverageRow(index, buffer, overrides = {}) {
  const image = overrides.image === undefined
    ? imageFor(buffer, overrides.imageOverrides)
    : overrides.image;
  return {
    selected_index: index,
    release_id: '25626032-7d72-5542-a8e0-7a6532c2f776',
    release_member_id: `00000000-0000-0000-0001-${String(index).padStart(12, '0')}`,
    member_fingerprint: hashMtgSealedDurableImageStorageV1(`member-${index}`),
    game_key: 'mtg',
    family_id: `00000000-0000-0000-0002-${String(index).padStart(12, '0')}`,
    variant_id: `00000000-0000-0000-0003-${String(index).padStart(12, '0')}`,
    source_mapping_id: `00000000-0000-0000-0004-${String(index).padStart(12, '0')}`,
    source_product_id: 2000 + index,
    canonical_name: `Fixture ${index}`,
    package_form: 'box',
    language_code: 'en',
    classification: overrides.classification ?? 'exact_image_ready',
    retrieval: {
      selected_source_url:
        `https://tcgplayer-cdn.tcgplayer.com/product/${2000 + index}_in_1000x1000.jpg`,
      selected_role: 'tcgplayer_source_high_resolution',
      attempted_urls: [],
    },
    image,
    proposed_storage_path: image
      ? `sealed/mtg/sha256/${image.sha256.slice(0, 2)}/` +
        `${image.sha256}.png`
      : null,
    ...overrides,
  };
}

function fixture() {
  const one = png(1);
  const shared = png(2);
  const four = png(4);
  const placeholder = png(5);
  const rows = [
    coverageRow(1, one),
    coverageRow(2, shared, { classification: 'shared_bytes_exact_variant' }),
    coverageRow(3, shared, { classification: 'shared_bytes_exact_variant' }),
    coverageRow(4, four),
    coverageRow(5, placeholder, {
      classification: 'placeholder',
      imageOverrides: { placeholder_suspected: true },
    }),
    coverageRow(6, null, { classification: 'invalid_image', image: null }),
  ];
  const durableBundle = buildMtgSealedDurableImagePlanV1(rows, {
    coverageFingerprint: 'a'.repeat(64),
    producerCommitSha: 'b'.repeat(40),
    sourceReportedUniqueValidImages: 4,
    expectations: EXPECTATIONS,
    shardSize: 2,
  });
  const durableArtifactHashes = Object.fromEntries([
    'run_plan.json', 'objects.jsonl.gz', 'exclusions.jsonl', 'shards.json',
    'summary.json', 'REPORT.md',
  ].map((name, index) => [name, {
    bytes: 100 + index,
    sha256: hashMtgSealedDurableImageStorageV1(name),
  }]));
  const executionPlan = buildMtgSealedDurableImageStorageExecutionPlanV1({
    durableBundle,
    durableArtifactHashes,
    producerCommitSha: 'c'.repeat(40),
    durableValidationOptions: VALIDATION_OPTIONS,
  });
  const buffers = new Map([
    [imageFor(one).sha256, one],
    [imageFor(shared).sha256, shared],
    [imageFor(four).sha256, four],
  ]);
  return { durableBundle, executionPlan, buffers };
}

function memoryStorage(initial = new Map(), overrides = {}) {
  const objects = new Map(initial);
  const calls = { exists: 0, upload: 0, download: 0, remove: 0 };
  return {
    objects,
    calls,
    adapter: {
      async objectExists(row) {
        calls.exists += 1;
        return objects.has(row.durable_object_path);
      },
      async upload(row, buffer) {
        calls.upload += 1;
        if (objects.has(row.durable_object_path)) {
          throw new Error('upsert_false_collision');
        }
        objects.set(row.durable_object_path, {
          buffer,
          contentType: row.expected_image.content_type,
        });
      },
      async download(row) {
        calls.download += 1;
        const value = objects.get(row.durable_object_path);
        if (!value) throw new Error('fixture_missing_object');
        return value;
      },
      async remove(paths) {
        calls.remove += paths.length;
        for (const objectPath of paths) objects.delete(objectPath);
      },
      ...overrides,
    },
  };
}

function sourceRequest(buffers) {
  return async (row) => ({
    buffer: buffers.get(row.content_sha256),
    contentType: row.expected_image.content_type,
  });
}

test('execution plan is exact, deterministic, and separately authorized', () => {
  const left = fixture();
  const right = fixture();
  assert.equal(left.executionPlan.execution_fingerprint_sha256,
    right.executionPlan.execution_fingerprint_sha256);
  assert.equal(left.executionPlan.selected_object_count, 3);
  assert.equal(left.executionPlan.selected_variant_count, 4);
  assert.equal(left.executionPlan.exclusion_count, 2);
  assert.equal(left.executionPlan.operation_contract.shard_size, 2);
  assert.equal(left.executionPlan.operation_contract.maximum_source_request_attempts,
    9);
  assert.match(left.executionPlan.required_approval_message,
    /at most 3 upsert=false durable uploads/);
  assert.deepEqual(validateMtgSealedDurableImageStorageExecutionPlanV1(
    left.executionPlan,
    left.durableBundle,
    VALIDATION_OPTIONS,
  ), { valid: true, findings: [] });
});

test('execution validation rejects authority, collision, and boundary drift', () => {
  const { executionPlan, durableBundle } = fixture();
  executionPlan.operation_contract.upload_upsert = true;
  executionPlan.forbidden_boundaries.database_writes = 1;
  executionPlan.selected_object_count = 4;
  const validation = validateMtgSealedDurableImageStorageExecutionPlanV1(
    executionPlan,
    durableBundle,
    VALIDATION_OPTIONS,
  );
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.includes('scope_count_mismatch'));
  assert.ok(validation.findings.includes('collision_or_upload_policy_unsafe'));
  assert.ok(validation.findings.includes('nonzero_forbidden_boundary'));
  assert.ok(validation.findings.includes('execution_fingerprint_mismatch'));
});

test('all absent objects upload, exact-readback, and remain durable', async () => {
  const { executionPlan, durableBundle, buffers } = fixture();
  const storage = memoryStorage();
  const result = await runMtgSealedDurableImageStorageV1({
    executionPlan,
    durableBundle,
    durableValidationOptions: VALIDATION_OPTIONS,
    storage: storage.adapter,
    requestSourceBytes: sourceRequest(buffers),
    concurrency: 2,
  });
  assert.equal(result.status, 'passed_all_durable_objects_exactly_verified');
  assert.equal(result.exact_verified_object_count, 3);
  assert.equal(result.exact_verified_variant_count, 4);
  assert.equal(result.uploaded_object_count, 3);
  assert.equal(result.peak_concurrency, 2);
  assert.equal(result.zero_reconciliation_mismatches, true);
  assert.equal(storage.objects.size, 3);
  assert.equal(storage.calls.remove, 0);
});

test('resume reuses exact existing objects without source retrieval or upload', async () => {
  const { executionPlan, durableBundle, buffers } = fixture();
  const existing = new Map(durableBundle.objects.map((row) => [
    row.durable_object_path,
    { buffer: buffers.get(row.content_sha256),
      contentType: row.expected_image.content_type },
  ]));
  const storage = memoryStorage(existing);
  let sourceCalls = 0;
  const result = await runMtgSealedDurableImageStorageV1({
    executionPlan,
    durableBundle,
    durableValidationOptions: VALIDATION_OPTIONS,
    storage: storage.adapter,
    requestSourceBytes: async () => {
      sourceCalls += 1;
      throw new Error('must_not_fetch');
    },
    concurrency: 2,
  });
  assert.equal(result.status, 'passed_all_durable_objects_exactly_verified');
  assert.equal(result.reused_preexisting_object_count, 3);
  assert.equal(result.uploaded_object_count, 0);
  assert.equal(sourceCalls, 0);
  assert.equal(storage.calls.remove, 0);
});

test('mismatched preexisting object hard-stops without fetch, overwrite, or delete', async () => {
  const { executionPlan, durableBundle } = fixture();
  const first = durableBundle.objects[0];
  const storage = memoryStorage(new Map([[
    first.durable_object_path,
    { buffer: png(99), contentType: 'image/png' },
  ]]));
  let sourceCalls = 0;
  const result = await runMtgSealedDurableImageStorageV1({
    executionPlan,
    durableBundle,
    durableValidationOptions: VALIDATION_OPTIONS,
    storage: storage.adapter,
    requestSourceBytes: async () => {
      sourceCalls += 1;
      throw new Error('must_not_fetch');
    },
    concurrency: 1,
  });
  assert.equal(result.status, 'failed_partial_verified_progress_retained');
  assert.equal(result.attempted_object_count, 1);
  assert.equal(result.unattempted_object_count, 2);
  assert.equal(sourceCalls, 0);
  assert.equal(storage.calls.upload, 0);
  assert.equal(storage.calls.remove, 0);
  assert.equal(storage.objects.has(first.durable_object_path), true);
});

test('failed source retrieval retains verified progress and launches no later shard', async () => {
  const { executionPlan, durableBundle, buffers } = fixture();
  const storage = memoryStorage();
  let sourceCalls = 0;
  const result = await runMtgSealedDurableImageStorageV1({
    executionPlan,
    durableBundle,
    durableValidationOptions: VALIDATION_OPTIONS,
    storage: storage.adapter,
    requestSourceBytes: async (row) => {
      sourceCalls += 1;
      if (row.object_index === 1) {
        const error = new Error('offline');
        error.code = 'ECONNRESET';
        error.retryable = true;
        throw error;
      }
      return sourceRequest(buffers)(row);
    },
    sleep: async () => {},
    concurrency: 1,
  });
  assert.equal(result.status, 'failed_partial_verified_progress_retained');
  assert.equal(result.attempted_object_count, 2);
  assert.equal(result.exact_verified_object_count, 1);
  assert.equal(result.unattempted_object_count, 1);
  assert.equal(result.counters.source_http_requests, 4);
  assert.equal(sourceCalls, 4);
  assert.equal(storage.objects.size, 1);
});

test('new upload readback failure removes only that current-attempt object', async () => {
  const { executionPlan, durableBundle, buffers } = fixture();
  const first = durableBundle.objects[0];
  const storage = memoryStorage();
  const normalDownload = storage.adapter.download;
  storage.adapter.download = async (row) => {
    if (row.durable_object_path === first.durable_object_path) {
      storage.calls.download += 1;
      return { buffer: png(98), contentType: 'image/png' };
    }
    return normalDownload(row);
  };
  const result = await runMtgSealedDurableImageStorageV1({
    executionPlan,
    durableBundle,
    durableValidationOptions: VALIDATION_OPTIONS,
    storage: storage.adapter,
    requestSourceBytes: sourceRequest(buffers),
    concurrency: 1,
  });
  assert.equal(result.status, 'failed_partial_verified_progress_retained');
  assert.equal(result.failed_object_count, 1);
  assert.equal(result.failures[0].cleanup_verified, true);
  assert.equal(storage.calls.remove, 1);
  assert.equal(storage.objects.has(first.durable_object_path), false);
});

test('ambiguous upload success is adopted only after exact readback', async () => {
  const { executionPlan, durableBundle, buffers } = fixture();
  const first = durableBundle.objects[0];
  const storage = memoryStorage();
  storage.adapter.upload = async (row, buffer) => {
    storage.calls.upload += 1;
    storage.objects.set(row.durable_object_path, {
      buffer,
      contentType: row.expected_image.content_type,
    });
    throw new Error('transport_lost_after_commit');
  };
  const result = await processMtgSealedDurableImageObjectV1({
    row: first,
    executionPlan,
    storage: storage.adapter,
    requestSourceBytes: sourceRequest(buffers),
  });
  assert.equal(result.status, 'adopted_exact_object_after_ambiguous_upload');
  assert.equal(storage.objects.has(first.durable_object_path), true);
  assert.equal(storage.calls.remove, 0);
});

test('cumulative per-object source ceiling survives resume', async () => {
  const { executionPlan, durableBundle } = fixture();
  const first = durableBundle.objects[0];
  const storage = memoryStorage();
  let sourceCalls = 0;
  const result = await runMtgSealedDurableImageStorageV1({
    executionPlan,
    durableBundle,
    durableValidationOptions: VALIDATION_OPTIONS,
    storage: storage.adapter,
    requestSourceBytes: async () => {
      sourceCalls += 1;
      throw new Error('must_not_fetch');
    },
    priorRequestAttemptsByPath: new Map([[first.durable_object_path, 3]]),
    concurrency: 1,
  });
  assert.equal(result.status, 'failed_partial_verified_progress_retained');
  assert.equal(result.prior_source_request_count, 3);
  assert.equal(result.cumulative_source_request_count, 3);
  assert.equal(sourceCalls, 0);
});

test('source retry helper records bounded attempts and rejects exhausted resume', async () => {
  const { executionPlan, durableBundle, buffers } = fixture();
  const first = durableBundle.objects[0];
  let calls = 0;
  const result = await retrieveMtgSealedDurableImageSourceBytesV1({
    row: first,
    priorRequestAttempts: 1,
    maximumAttempts: 3,
    requestSourceBytes: async (row) => {
      calls += 1;
      if (calls === 1) {
        const error = new Error('reset');
        error.code = 'ECONNRESET';
        error.retryable = true;
        throw error;
      }
      return sourceRequest(buffers)(row);
    },
    sleep: async () => {},
  });
  assert.equal(result.requestAttempts, 2);
  await assert.rejects(() => retrieveMtgSealedDurableImageSourceBytesV1({
    row: first,
    priorRequestAttempts: 3,
    maximumAttempts: 3,
    requestSourceBytes: async () => {
      throw new Error('must_not_fetch');
    },
  }), /source_attempt_ceiling_exhausted/);
});

test('resume journal binds sequence, authority, paths, and cumulative attempts', () => {
  const { executionPlan, durableBundle } = fixture();
  const first = durableBundle.objects[0].durable_object_path;
  const events = [1, 2].map((sequence) => ({
    sequence,
    execution_fingerprint_sha256:
      executionPlan.execution_fingerprint_sha256,
    event: 'source_request_started',
    object_path: first,
  }));
  const validated = validateMtgSealedDurableImageResumeJournalV1({
    events,
    executionPlan,
    knownObjectPaths: new Set(durableBundle.objects.map((row) =>
      row.durable_object_path)),
  });
  assert.equal(validated.priorRequestAttemptsByPath.get(first), 2);
  assert.equal(validated.nextSequence, 3);
  events[1].sequence = 3;
  assert.throws(() => validateMtgSealedDurableImageResumeJournalV1({
    events,
    executionPlan,
    knownObjectPaths: new Set([first]),
  }), /sequence or authority mismatch/);
});

test('interrupted verified progress is reused by the next complete pass', async () => {
  const { executionPlan, durableBundle, buffers } = fixture();
  const storage = memoryStorage();
  const first = await processMtgSealedDurableImageObjectV1({
    row: durableBundle.objects[0],
    executionPlan,
    storage: storage.adapter,
    requestSourceBytes: sourceRequest(buffers),
  });
  assert.equal(first.status, 'uploaded_and_exact_readback_verified');
  const resumed = await runMtgSealedDurableImageStorageV1({
    executionPlan,
    durableBundle,
    durableValidationOptions: VALIDATION_OPTIONS,
    storage: storage.adapter,
    requestSourceBytes: sourceRequest(buffers),
    concurrency: 2,
  });
  assert.equal(resumed.status, 'passed_all_durable_objects_exactly_verified');
  assert.equal(resumed.reused_preexisting_object_count, 1);
  assert.equal(resumed.uploaded_object_count, 2);
  assert.equal(storage.objects.size, 3);
});

test('operator keeps plan mode inert and apply authority exact', () => {
  const source = fs.readFileSync(
    'scripts/audits/mtg_sealed_durable_image_storage_v1.mjs', 'utf8');
  assert.match(source, /MTG_SEALED_DURABLE_IMAGE_STORAGE_APPROVAL_ENV_V1/);
  assert.match(source, /--expected-execution-fingerprint/);
  assert.match(source, /--use-system-ca/);
  assert.match(source, /getCACertificates\('system'\)/);
  assert.match(source, /upsert: false/);
  assert.match(source, /mode === 'plan'/);
  assert.match(source, /dotenv\.config/);
  assert.doesNotMatch(source, /new Client\s*\(|\.rpc\s*\(|functions\.deploy/);
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(packageJson.scripts['mtg:sealed:durable-image-storage:v1'],
    'node --use-system-ca scripts/audits/mtg_sealed_durable_image_storage_v1.mjs');
});

test('preserved 2141-object durable plan builds an exact execution scope', () => {
  const root =
    'docs/audits/pricing/mtg_sealed_durable_image_plan_v1/2026-09-04T22-07-02Z_offline';
  const artifactHashes = JSON.parse(fs.readFileSync(
    `${root}/artifact_hashes.json`, 'utf8')).artifacts;
  const durableBundle = {
    plan: JSON.parse(fs.readFileSync(`${root}/run_plan.json`, 'utf8')),
    objects: gunzipSync(fs.readFileSync(`${root}/objects.jsonl.gz`))
      .toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse),
    exclusions: fs.readFileSync(`${root}/exclusions.jsonl`, 'utf8')
      .split(/\r?\n/).filter(Boolean).map(JSON.parse),
    shards: JSON.parse(fs.readFileSync(`${root}/shards.json`, 'utf8')),
  };
  const executionPlan = buildMtgSealedDurableImageStorageExecutionPlanV1({
    durableBundle,
    durableArtifactHashes: artifactHashes,
    producerCommitSha: 'd'.repeat(40),
  });
  assert.equal(executionPlan.source_durable_plan_fingerprint_sha256,
    '92c9189e0c42adba6f274ad283a3f0a5af5e0324ff1ce4b506368f8d0f3010bc');
  assert.equal(executionPlan.selected_object_count, 2141);
  assert.equal(executionPlan.selected_variant_count, 2149);
  assert.equal(executionPlan.exclusion_count, 33);
  assert.equal(executionPlan.operation_contract.maximum_source_request_attempts,
    6423);
  assert.deepEqual(validateMtgSealedDurableImageStorageExecutionPlanV1(
    executionPlan,
    durableBundle,
  ), { valid: true, findings: [] });
});
