import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  CANARY_HOST_ALLOCATION,
  DEFAULT_CANARY_SIZE,
  EXPECTED_PRIMARY_HOST_COUNTS,
  EXPECTED_SCOPE_COUNT,
  buildAcquisitionManifestRows,
  inspectImageBuffer,
  selectCanaryRows,
  summarizeCanary,
  summarizeManifest,
} from '../../scripts/audits/japanese_master_index_v4/image_acquisition_readiness_v1.mjs';
import { readVerifiedArtifact } from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';
import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const LIVE_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_acquisition_readiness_v1/'
  + 'jpn_image_acquisition_readiness_v1.json';

function cardRow(index, host = 'www.pokemon-card.com') {
  const id = `${String(index).padStart(8, '0')}-1111-4111-8111-111111111111`;
  const gvId = `GV-PK-JPN-TEST-${index}`;
  return {
    id,
    gv_id: gvId,
    external_ids: {
      japanese_master_index_v4: {
        source_ids: ['test'],
        source_assertion_keys: [`assertion-${index}`],
      },
    },
    host,
  };
}

function inventoryRow(card, position) {
  return {
    position,
    card_print_id: card.id,
    gv_id: card.gv_id,
    name: `Card ${position}`,
    set_code: 'jpn-test',
    number: String(position),
    identity_domain: 'pokemon_jpn',
    image: {
      image_url: `https://${card.host}/images/${position}.jpg`,
      image_alt_url: null,
    },
  };
}

function syntheticManifestRows() {
  const rows = [];
  let position = 1;
  for (const [host, count] of Object.entries(EXPECTED_PRIMARY_HOST_COUNTS)) {
    for (let index = 0; index < count; index += 1) {
      const card = cardRow(position, host);
      rows.push(inventoryRow(card, position));
      position += 1;
    }
  }
  const cards = rows.map((row) => ({
    id: row.card_print_id,
    gv_id: row.gv_id,
    external_ids: {
      japanese_master_index_v4: {
        source_ids: ['test'],
        source_assertion_keys: [`assertion-${row.position}`],
      },
    },
  }));
  return buildAcquisitionManifestRows(rows, cards);
}

test('image readiness pins the exact scope and host allocation', () => {
  assert.equal(EXPECTED_SCOPE_COUNT, 5_336);
  assert.equal(DEFAULT_CANARY_SIZE, 70);
  assert.deepEqual(CANARY_HOST_ALLOCATION, {
    'assets.tcgdex.net': 18,
    'limitlesstcg.nyc3.cdn.digitaloceanspaces.com': 35,
    'www.pokemon-card.com': 17,
  });
});

test('manifest preserves one unique HTTPS source per applied parent', () => {
  const rows = syntheticManifestRows();
  assert.equal(rows.length, EXPECTED_SCOPE_COUNT);
  assert.equal(new Set(rows.map((row) => row.primary_source.url)).size, EXPECTED_SCOPE_COUNT);
  assert.equal(rows.every((row) => row.primary_source.url.startsWith('https://')), true);
  assert.equal(rows.every((row) => row.visual_identity_reconfirmation === 'not_performed'), true);
});

test('canary includes every minority-host row and a bounded official sample', () => {
  const selected = selectCanaryRows(syntheticManifestRows());
  const counts = Object.fromEntries(Object.keys(CANARY_HOST_ALLOCATION).map((host) => [
    host,
    selected.filter((row) => row.primary_source.host === host).length,
  ]));
  assert.equal(selected.length, DEFAULT_CANARY_SIZE);
  assert.deepEqual(counts, CANARY_HOST_ALLOCATION);
});

test('PNG inspection records dimensions, hash, and usable quality', () => {
  const buffer = Buffer.alloc(6_000);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.writeUInt32BE(600, 16);
  buffer.writeUInt32BE(825, 20);
  const observed = inspectImageBuffer(buffer, 'image/png');
  assert.equal(observed.format, 'png');
  assert.equal(observed.width, 600);
  assert.equal(observed.height, 825);
  assert.equal(observed.valid_image, true);
  assert.equal(observed.quality_band, 'high');
});

test('non-image payload is quarantinable even with an image-shaped URL', () => {
  const observed = inspectImageBuffer(
    Buffer.from('<html>not an image</html>'),
    'text/html',
  );
  assert.equal(observed.valid_image, false);
  assert.ok(observed.diagnostics.includes('non_image_content_type'));
  assert.ok(observed.diagnostics.includes('unrecognized_image_bytes'));
});

test('summaries keep local downloads separate from Storage readiness', () => {
  const manifest = syntheticManifestRows();
  const selected = selectCanaryRows(manifest);
  const manifestSummary = summarizeManifest(manifest, selected);
  const canarySummary = summarizeCanary([{
    status: 'ready_for_future_storage_canary',
    attempts: [{ http_status: 200 }],
    selected_source: {
      role: 'primary',
      source_host: 'www.pokemon-card.com',
      format: 'jpg',
      quality_band: 'high',
      size_bytes: 100_000,
    },
  }], []);
  assert.equal(manifestSummary.storage_writes, 0);
  assert.equal(manifestSummary.database_writes, 0);
  assert.equal(canarySummary.ready_rows, 1);
  assert.equal(canarySummary.storage_writes, 0);
});

test('image readiness source has no database or Supabase Storage path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/image_acquisition_readiness_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /createClient\s*\(/);
  assert.doesNotMatch(source, /new\s+pg\.Client|withReadOnlyClient/);
  assert.doesNotMatch(source, /\.storage\s*\./);
  assert.doesNotMatch(source, /\b(?:insert|update|delete|merge|truncate)\s+(?:into|from|public\.)/i);
  assert.match(source, /storage_writes: false/);
  assert.match(source, /database_writes: false/);
});

test('live image readiness artifact freezes the exact bounded canary result', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_ARTIFACT, {
    expectedPackageId:
      'JPN-MASTER-INDEX-V4-IMAGE-ACQUISITION-READINESS-V1',
  });
  assert.equal(
    artifact.content_fingerprint_sha256,
    '0cd2ef5619f4e90247aa5222ee5ca0d5645ddd005f5060a6bdae8c8fec5aaaa8',
  );
  assert.equal(
    artifact.content.status,
    'manifest_and_local_download_canary_complete',
  );
  assert.equal(artifact.content.manifest_summary.scope_rows, 5_336);
  assert.equal(artifact.content.canary_summary.selected_rows, 70);
  assert.equal(artifact.content.canary_summary.local_cache_rows, 70);
  assert.equal(artifact.content.canary_summary.ready_rows, 17);
  assert.equal(
    artifact.content.canary_summary.low_resolution_review_rows,
    53,
  );
  assert.equal(artifact.content.canary_summary.quarantined_rows, 0);
  assert.equal(artifact.content.canary_summary.selected_fallback_rows, 18);
  assert.deepEqual(
    artifact.content.canary_summary.attempt_http_status_counts,
    { 200: 70, 404: 18 },
  );
  assert.equal(artifact.content.execution_boundary.database_reads, false);
  assert.equal(artifact.content.execution_boundary.database_writes, false);
  assert.equal(artifact.content.execution_boundary.storage_reads, false);
  assert.equal(artifact.content.execution_boundary.storage_writes, false);
  assert.equal(artifact.retrieval.storage_access, false);
});

test('live image readiness row shards verify without losing source evidence', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_ARTIFACT);
  for (const descriptor of [
    artifact.content.manifest_dataset,
    artifact.content.canary_dataset,
  ]) {
    const rows = [];
    for (const shardPath of descriptor.shard_paths) {
      const { artifact: shard } = await readVerifiedArtifact(shardPath);
      assert.equal(shard.content.dataset_key, descriptor.dataset_key);
      assert.equal(shard.content.row_count, shard.content.rows.length);
      rows.push(...shard.content.rows);
    }
    assert.equal(rows.length, descriptor.row_count);
    assert.equal(
      contentFingerprint(rows),
      descriptor.content_fingerprint_sha256,
    );
  }

  const manifestRows = [];
  for (const shardPath of artifact.content.manifest_dataset.shard_paths) {
    const { artifact: shard } = await readVerifiedArtifact(shardPath);
    manifestRows.push(...shard.content.rows);
  }
  assert.equal(new Set(manifestRows.map((row) => row.card_print_id)).size, 5_336);
  assert.equal(new Set(manifestRows.map((row) => row.gv_id)).size, 5_336);
  assert.equal(
    manifestRows.every((row) => row.identity_domain === 'pokemon_jpn'),
    true,
  );
  assert.equal(
    manifestRows.every(
      (row) => row.visual_identity_reconfirmation === 'not_performed',
    ),
    true,
  );

  const canaryRows = [];
  for (const shardPath of artifact.content.canary_dataset.shard_paths) {
    const { artifact: shard } = await readVerifiedArtifact(shardPath);
    canaryRows.push(...shard.content.rows);
  }
  assert.equal(new Set(canaryRows.map((row) => row.card_print_id)).size, 70);
  assert.equal(canaryRows.every((row) => row.selected_source.valid_image), true);
  assert.equal(
    canaryRows.every((row) => row.local_cache_sha256 === row.selected_source.sha256),
    true,
  );
  assert.equal(canaryRows.every((row) => !row.storage_write_performed), true);
  assert.equal(canaryRows.every((row) => !row.database_write_performed), true);
});
