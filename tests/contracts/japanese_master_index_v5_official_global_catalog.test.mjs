import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import {
  readVerifiedArtifact,
} from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';

const root = process.cwd();
const catalogRoot =
  'docs/audits/japanese_master_index_v5/official_global_catalog';
const reconciliationRoot =
  'docs/audits/japanese_master_index_v5/'
  + 'official_global_catalog_reconciliation';
const discoveryPath = path.join(
  catalogRoot,
  'official_jp_global_card_discovery_v1.json.gz',
);
const healthPath = path.join(
  catalogRoot,
  'official_jp_global_catalog_health_v1.json',
);

test('Official JP global catalog preserves the complete published census', async () => {
  const { artifact: discovery } = await readVerifiedArtifact(discoveryPath);
  const { artifact: health } = await readVerifiedArtifact(healthPath);
  assert.equal(
    discovery.content.status,
    'official_global_catalog_complete',
  );
  assert.equal(discovery.content.cards.length, 23_165);
  assert.equal(discovery.content.page_proofs.length, 594);
  assert.equal(health.content.reported_hit_count, 23_165);
  assert.equal(health.content.reported_max_page, 594);
  assert.equal(health.content.captured_page_count, 594);
  assert.equal(health.content.unique_card_count, 23_165);
  assert.equal(
    new Set(
      discovery.content.cards.map((row) => row.official_card_id),
    ).size,
    23_165,
  );
  assert.ok(discovery.content.cards.every((row) =>
    row.printed_name && row.image_url));
});

test('every Official JP catalog page retains an exact source hash', async () => {
  const { artifact: discovery } = await readVerifiedArtifact(discoveryPath);
  for (const proof of discovery.content.page_proofs) {
    const body = fs.readFileSync(proof.raw_snapshot_ref);
    assert.equal(
      crypto.createHash('sha256').update(body).digest('hex'),
      proof.raw_snapshot_sha256,
    );
  }
});

test('global catalog reconciliation partitions every official card once', async () => {
  const report = JSON.parse(fs.readFileSync(
    path.join(
      reconciliationRoot,
      'official_jp_global_catalog_reconciliation_report_v1.json',
    ),
    'utf8',
  ));
  const { artifact: reconciliation } = await readVerifiedArtifact(
    path.join(
      reconciliationRoot,
      'official_jp_global_catalog_reconciliation_v1.json.gz',
    ),
  );
  const { artifact: queue } = await readVerifiedArtifact(
    path.join(
      reconciliationRoot,
      'official_jp_global_detail_fetch_queue_v1.json.gz',
    ),
  );
  assert.equal(report.official_global_card_count, 23_165);
  assert.equal(reconciliation.content.reconciliation.length, 23_165);
  assert.equal(
    Object.values(report.prior_coverage_counts)
      .reduce((sum, value) => sum + value, 0),
    23_165,
  );
  assert.equal(
    Object.values(report.registry_match_counts)
      .reduce((sum, value) => sum + value, 0),
    23_165,
  );
  assert.equal(
    Object.values(report.detail_disposition_counts)
      .reduce((sum, value) => sum + value, 0),
    23_165,
  );
  assert.equal(queue.content.work_items.length, report.detail_fetch_queue_count);
  assert.equal(
    new Set(queue.content.work_items.map((row) => row.official_card_id)).size,
    queue.content.work_items.length,
  );
  assert.ok(queue.content.work_items.every((row) =>
    row.source_url.endsWith(`/card/${row.official_card_id}/regu/all`)));
});

test('global catalog and reconciliation replay deterministically offline', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-v5-official-global-'),
  );
  try {
    const replayCatalog = path.join(temp, '.tmp', 'catalog');
    const replayReconciliation = path.join(
      temp,
      '.tmp',
      'reconciliation',
    );
    fs.cpSync(
      path.join(catalogRoot, 'raw'),
      path.join(replayCatalog, 'raw'),
      { recursive: true },
    );
    execFileSync(process.execPath, [
      'scripts/audits/japanese_master_index_v5/'
      + 'official_global_catalog_harvest_v1.mjs',
      `--output-root=${replayCatalog}`,
      '--offline',
      '--quiet',
    ], { cwd: root });
    for (const filename of [
      'official_jp_global_card_discovery_v1.json.gz',
      'official_jp_global_catalog_health_v1.json',
    ]) {
      assert.deepEqual(
        fs.readFileSync(path.join(replayCatalog, filename)),
        fs.readFileSync(path.join(catalogRoot, filename)),
      );
    }
    execFileSync(process.execPath, [
      'scripts/audits/japanese_master_index_v5/'
      + 'official_global_catalog_reconcile_v1.mjs',
      `--output-root=${replayReconciliation}`,
      '--quiet',
    ], { cwd: root });
    for (const filename of [
      'official_jp_global_catalog_reconciliation_v1.json.gz',
      'official_jp_global_detail_fetch_queue_v1.json.gz',
      'official_jp_global_catalog_reconciliation_report_v1.json',
    ]) {
      assert.deepEqual(
        fs.readFileSync(path.join(replayReconciliation, filename)),
        fs.readFileSync(path.join(reconciliationRoot, filename)),
      );
    }
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('global catalog lane has no database or storage mutation path', () => {
  const source = [
    'official_global_catalog_harvest_v1.mjs',
    'official_global_catalog_reconcile_v1.mjs',
  ].map((filename) => fs.readFileSync(
    `scripts/audits/japanese_master_index_v5/${filename}`,
    'utf8',
  )).join('\n');
  assert.doesNotMatch(source, /@supabase|from\s+['"]pg['"]/i);
  assert.doesNotMatch(
    source,
    /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
  );
});
