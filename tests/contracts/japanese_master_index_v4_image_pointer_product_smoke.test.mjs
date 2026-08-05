import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  EXPECTED_MUTATION_CONTRACT_HASH,
  EXPECTED_PACKAGE_FINGERPRINT,
  EXPECTED_POINTER_PLAN_HASH,
  EXPECTED_PRODUCT_SMOKE_ROWS,
  buildProductSmokeRow,
  buildProductSmokeSummary,
  choosePreferredSetMetadataRow,
  fetchResponse,
  renderedHtmlHasPath,
  renderedSetPageHasCount,
} from '../../scripts/audits/japanese_master_index_v4/image_pointer_product_smoke_v1.mjs';
import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const LIVE_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1/'
  + 'jpn_image_pointer_product_smoke_v1.json';
const PRODUCT_SMOKE_ARTIFACT_ROOT =
  'docs/audits/japanese_master_index_v4/image_pointer_product_smoke_v1';

function findNamedFiles(root, fileName) {
  const matches = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      matches.push(...findNamedFiles(entryPath, fileName));
    } else if (entry.name === fileName) {
      matches.push(entryPath);
    }
  }
  return matches;
}

function response(status, body = 'response') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => name === 'content-type' ? 'text/plain' : null,
    },
    text: async () => body,
    arrayBuffer: async () => Buffer.from(body),
  };
}

function fixture() {
  const rowSnapshot = {
    id: '11111111-1111-4111-8111-111111111111',
    gv_id: 'GV-PK-JPN-TEST-001',
    image_source: 'identity',
    image_path:
      'warehouse-derived/self-hosted-images-v1/card_prints/jpn-test/test.jpg',
    image_status: 'exact',
    image_url: 'https://example.test/fallback.jpg',
  };
  const pointerRow = {
    target_row_id: rowSnapshot.id,
    gv_id: rowSnapshot.gv_id,
    target_storage_path: rowSnapshot.image_path,
    expected_after_snapshot_hash: contentFingerprint(rowSnapshot),
    preserved_values: { image_url: rowSnapshot.image_url },
  };
  const liveRow = {
    position: 1,
    card_print_id: rowSnapshot.id,
    gv_id: rowSnapshot.gv_id,
    name: 'Test Card',
    set_code: 'jpn-test',
    number: '001',
    row_snapshot: rowSnapshot,
    live_child_count: 0,
    print_search_document_count: 1,
    legacy_search_row_count: 1,
    search_v2_row_count: 1,
    exact_search_rpc_match: true,
  };
  return {
    pointerRow,
    liveRow,
    imageCheck: { exact_bytes_match: true },
    cardPageCheck: { passed: true },
    setGridCheck: { hosted_first: true, fallback_preserved: true },
  };
}

test('product smoke pins the exact approved 53-row package', () => {
  assert.equal(EXPECTED_PRODUCT_SMOKE_ROWS, 53);
  assert.equal(
    EXPECTED_PACKAGE_FINGERPRINT,
    'e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912',
  );
  assert.equal(
    EXPECTED_POINTER_PLAN_HASH,
    '0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be',
  );
  assert.equal(
    EXPECTED_MUTATION_CONTRACT_HASH,
    '5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9',
  );
});

test('a fully reconciled product row passes every boundary', () => {
  const row = buildProductSmokeRow(fixture());
  assert.equal(row.passed, true);
  assert.deepEqual(row.failures, []);
  assert.equal(Object.values(row.checks).every(Boolean), true);
});

test('hosted-first, fallback, search, and byte failures remain explicit', () => {
  const input = fixture();
  input.liveRow.exact_search_rpc_match = false;
  input.imageCheck.exact_bytes_match = false;
  input.setGridCheck.hosted_first = false;
  input.setGridCheck.fallback_preserved = false;
  const row = buildProductSmokeRow(input);
  assert.equal(row.passed, false);
  assert.deepEqual(row.failures, [
    'exact_search_rpc',
    'production_image_exact_bytes',
    'production_set_grid_hosted_first',
    'production_set_grid_fallback',
  ]);
});

test('summary requires every row and set page to pass', () => {
  const row = buildProductSmokeRow(fixture());
  const summary = buildProductSmokeSummary(
    [row],
    [{
      set_code: 'jpn-test',
      passed: true,
      contains_canonical_card_count: true,
      contains_set_name: true,
    }],
  );
  assert.equal(summary.passed_rows, 1);
  assert.equal(summary.exact_production_image_byte_matches, 1);
  assert.equal(summary.production_set_grid_hosted_first, 1);
  assert.equal(summary.set_pages_passed, 1);
  assert.equal(summary.set_page_total_matches, 1);
  assert.equal(summary.set_page_name_matches, 1);
  assert.deepEqual(summary.failures, []);
});

test('product smoke set metadata selection matches the client read contract', () => {
  const preferred = choosePreferredSetMetadataRow([
    {
      code: 'jpn-s8b',
      name: 'Japanese S8b',
      release_date: '2021-12-03',
    },
    {
      code: 'jpn-S8b',
      name: 'VMAX Climax',
      release_date: '2021-12-03',
    },
  ]);
  assert.equal(preferred.name, 'VMAX Climax');
});

test('set-page totals accept exact HTML and React payload rendering only', () => {
  assert.equal(renderedSetPageHasCount('287 catalog rows', 287), true);
  assert.equal(
    renderedSetPageHasCount('"children":["287"," catalog rows"]', 287),
    true,
  );
  assert.equal(
    renderedSetPageHasCount('\\"children\\":[\\"287\\",\\" catalog rows\\"]', 287),
    true,
  );
  assert.equal(renderedSetPageHasCount('286 catalog rows', 287), false);
});

test('rendered image paths match literal or once-encoded output without HTML decoding', () => {
  const path = '/api/canon/cards/GV-PK-JPN-S8B-148/image';
  assert.equal(renderedHtmlHasPath(`src="${path}"`, path), true);
  assert.equal(renderedHtmlHasPath(encodeURIComponent(path), path), true);
  assert.equal(renderedHtmlHasPath('&amp;unrelated', path), false);
});

test('read-only HTTP checks retry transport and server failures with an audit trail', async () => {
  const attempts = [
    new Error('transport failed'),
    response(503, 'temporarily unavailable'),
    response(200, 'ready'),
  ];
  const delays = [];
  const result = await fetchResponse('https://example.test/read-only', 'text', {
    fetchImpl: async () => {
      const next = attempts.shift();
      if (next instanceof Error) throw next;
      return next;
    },
    sleep: async (milliseconds) => delays.push(milliseconds),
  });
  assert.equal(result.ok, true);
  assert.equal(result.body, 'ready');
  assert.equal(result.request_count, 3);
  assert.equal(result.retry_count, 2);
  assert.deepEqual(result.transient_failures, [
    { attempt: 1, status: null, error: 'transport failed' },
    { attempt: 2, status: 503, error: null },
  ]);
  assert.deepEqual(delays, [250, 500]);
});

test('read-only HTTP checks do not retry client failures', async () => {
  let calls = 0;
  const result = await fetchResponse('https://example.test/not-found', 'text', {
    fetchImpl: async () => {
      calls += 1;
      return response(404, 'not found');
    },
    sleep: async () => assert.fail('4xx response must not retry'),
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 404);
  assert.equal(result.request_count, 1);
  assert.equal(result.retry_count, 0);
  assert.deepEqual(result.transient_failures, []);
});

test('product smoke source is read-only and avoids telemetry search routes', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/image_pointer_product_smoke_v1.mjs',
    'utf8',
  );
  const guardSource = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/read_only_guard_v1.mjs',
    'utf8',
  );
  assert.match(source, /assertAuditOnlyArgs/);
  assert.match(source, /withReadOnlyClient/);
  assert.match(guardSource, /begin read only/);
  assert.match(source, /search_print_identity_v1/);
  assert.match(source, /partition by lower\(parent\.set_code\)/);
  assert.match(source, /normalized_set_code = lower\(parent\.set_code\)/);
  assert.doesNotMatch(source, /\/search\?q=/);
  assert.doesNotMatch(source, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
  assert.doesNotMatch(source, /\.storage\s*\.\s*(?:upload|remove|move|copy)\s*\(/);
});

test('web and Flutter set loaders preserve mixed-case canonical set codes', () => {
  const webSetLoader = fs.readFileSync(
    'apps/web/src/lib/publicSets.ts',
    'utf8',
  );
  const webSetStats = fs.readFileSync(
    'apps/web/src/lib/publicSetMasterSetStats.ts',
    'utf8',
  );
  const flutterSetLoader = fs.readFileSync(
    'lib/services/public/public_sets_service.dart',
    'utf8',
  );
  assert.match(webSetLoader, /\.ilike\("set_code", setCodePattern\)/);
  assert.doesNotMatch(webSetLoader, /\.eq\("set_code", normalizedCode\)/);
  assert.match(webSetStats, /\.ilike\("set_code", setCodePattern\)/);
  assert.match(
    flutterSetLoader,
    /\.ilike\('set_code', _escapePostgrestLikePattern\(normalizedCode\)\)/,
  );
  assert.doesNotMatch(flutterSetLoader, /\.eq\('set_code', normalizedCode\)/);
});

test('live artifact proves the repaired 53-row product boundary', () => {
  const artifact = JSON.parse(fs.readFileSync(LIVE_ARTIFACT, 'utf8'));
  assert.equal(
    artifact.package_id,
    'JPN-MASTER-INDEX-V4-IMAGE-POINTER-PRODUCT-SMOKE-V1',
  );
  assert.equal(
    artifact.content.status,
    'complete_read_only_product_smoke',
  );
  assert.equal(artifact.content.summary.selected_rows, 53);
  assert.equal(artifact.content.summary.passed_rows, 53);
  assert.equal(artifact.content.summary.failed_rows, 0);
  assert.equal(artifact.content.summary.complete_row_hash_matches, 53);
  assert.equal(artifact.content.summary.exact_search_rpc_matches, 53);
  assert.equal(
    artifact.content.summary.exact_production_image_byte_matches,
    53,
  );
  assert.equal(artifact.content.summary.production_card_detail_passes, 53);
  assert.equal(
    artifact.content.summary.production_set_grid_hosted_first,
    53,
  );
  assert.equal(
    artifact.content.summary.production_set_grid_fallback_preserved,
    53,
  );
  assert.equal(artifact.content.summary.set_pages_passed, 27);
  assert.equal(artifact.content.summary.set_page_total_matches, 27);
  assert.equal(artifact.content.summary.set_page_name_matches, 27);
  assert.equal(artifact.content.guard.transaction_read_only, 'on');
  assert.equal(artifact.content.execution_boundary.database_writes, false);
  assert.equal(artifact.content.execution_boundary.storage_writes, false);
  assert.equal(
    contentFingerprint(artifact.content),
    artifact.content_fingerprint_sha256,
  );
});

test('every product smoke hash manifest resolves and verifies its own artifacts', () => {
  const manifests = findNamedFiles(
    PRODUCT_SMOKE_ARTIFACT_ROOT,
    'artifact_hashes_v1.json',
  );
  assert.ok(manifests.length >= 10);
  for (const manifestPath of manifests) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const manifestDirectory = path.dirname(manifestPath).replaceAll('\\', '/');
    for (const entry of manifest.artifacts) {
      assert.equal(
        path.posix.dirname(entry.path),
        manifestDirectory,
        `${manifestPath} points outside its artifact directory`,
      );
      const bytes = fs.readFileSync(entry.path);
      assert.equal(bytes.byteLength, entry.bytes, `${entry.path} byte count`);
      assert.equal(
        crypto.createHash('sha256').update(bytes).digest('hex'),
        entry.sha256,
        `${entry.path} SHA-256`,
      );
    }
  }
});
