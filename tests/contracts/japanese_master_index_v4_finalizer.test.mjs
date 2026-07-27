import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  readVerifiedArtifact,
} from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';

const INDEX_ROOT = 'docs/audits/japanese_master_index_v4/index';
const FINAL_ROOT = 'docs/audits/japanese_master_index_v4/final';

test('final package proves strict admission, replay, and live no-write baseline', async () => {
  const [packageRecord, buildRecord] = await Promise.all([
    readVerifiedArtifact(
      `${INDEX_ROOT}/jpn_master_index_final_package_v1.json`,
      { expectedPackageId: 'JPN-MASTER-INDEX-FINAL-PACKAGE-V1' },
    ),
    readVerifiedArtifact(
      `${FINAL_ROOT}/jpn_master_build_manifest_v1.json`,
      { expectedPackageId: 'JPN-MASTER-BUILD-MANIFEST-V1' },
    ),
  ]);
  const packageContent = packageRecord.artifact.content;
  const buildContent = buildRecord.artifact.content;

  assert.equal(packageContent.status, 'complete_no_write_master_index');
  assert.equal(
    packageContent.checks.every((check) => check.passed),
    true,
  );
  assert.equal(
    buildContent.completion.all_static_admission_checks_pass,
    true,
  );
  assert.equal(packageContent.replay.performed, true);
  assert.equal(packageContent.replay.all_match, true);
  assert.equal(
    packageContent.live_baseline_recheck.performed,
    true,
  );
  assert.equal(
    packageContent.live_baseline_recheck.all_match,
    true,
  );
  assert.equal(
    packageContent.live_baseline_recheck
      .row_dataset_comparisons.length,
    9,
  );
  assert.equal(
    packageContent.live_baseline_recheck
      .row_dataset_comparisons.every((row) => row.matches),
    true,
  );
  assert.equal(
    packageContent.live_baseline_recheck
      .no_write_guard_established,
    true,
  );
  assert.equal(
    Object.entries(packageContent.execution_boundary)
      .filter(([key]) => !key.startsWith('database_read'))
      .every(([, value]) => value === false),
    true,
  );
  assert.equal(
    Object.values(buildContent.execution_boundary)
      .every((value) => value === false),
    true,
  );
  assert.equal(
    packageContent.checks.find(
      (check) => check.name === 'raw_source_evidence_archives_are_verified',
    )?.passed,
    true,
  );
  assert.equal(
    packageContent.checks.find(
      (check) => check.name === 'release_uses_packaged_source_evidence_only',
    )?.passed,
    true,
  );
});

test('all required strict output descriptors and reports exist', async () => {
  const buildRecord = await readVerifiedArtifact(
    `${FINAL_ROOT}/jpn_master_build_manifest_v1.json`,
    { expectedPackageId: 'JPN-MASTER-BUILD-MANIFEST-V1' },
  );
  const content = buildRecord.artifact.content;
  assert.equal(content.datasets.length, 12);
  assert.equal(content.required_files.length, 12);
  assert.equal(
    new Set(content.datasets.map((row) => row.dataset_key)).size,
    12,
  );
  await Promise.all([
    fs.access(`${FINAL_ROOT}/jpn_master_admissible_export_v1.json`),
    fs.access(`${FINAL_ROOT}/jpn_master_completion_report_v1.md`),
    ...content.required_files.map((record) => fs.access(record.path)),
  ]);
});
