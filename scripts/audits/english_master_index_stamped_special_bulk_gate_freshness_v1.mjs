import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_bulk_gate_freshness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_bulk_gate_freshness_v1.md');
const GATE = 'docs/checkpoints/master_index/20260621_stamped_special_bulk_ready_real_apply_gate_checkpoint_v2.md';

const PACKAGES = [
  {
    package_id: 'POKUMON-DETAIL-PARENT-INSERTS',
    artifact: 'english_master_index_pokumon_detail_parent_insert_guarded_dry_run_v1.json',
    expected_fingerprint: 'd8dba1ac6b247dd860107630743f1a0e6af2734d569bb63ef11c7d2b018e41a0',
    expected_dry_run_proof: 'f747a15c0c18916645906540f0338d549d9ade5a3f1128f94a981cdb902f2b73',
  },
  {
    package_id: 'LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS',
    artifact: 'english_master_index_league_placement_stamp_guarded_dry_run_v1.json',
    expected_fingerprint: 'c5bf150695b2e4c2d009de7e4c39cb2e4acf341ceaccb64e6bd2e0d20d741fc1',
    expected_dry_run_proof: 'd89787b8681dcd269a21d40944681d0a92edad536a84428bec9e387680b20853',
  },
  {
    package_id: 'DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS',
    artifact: 'english_master_index_dv1_stamp_holo_review_ready_guarded_dry_run_v1.json',
    expected_fingerprint: '46ee2cb0ad4702303aee2da1964578169dc101e6811d6d4a5b5655c3ba99893f',
    expected_dry_run_proof: 'fad519d5dc38f70bc3d3e1ad5db7cb5ddf90b1bfbb5d21669d701e3c071ac4c5',
  },
  {
    package_id: 'DV1-STAMP-HOLO-SECOND-WAVE-PARENT-INSERTS',
    artifact: 'english_master_index_dv1_stamp_holo_second_wave_guarded_dry_run_v1.json',
    expected_fingerprint: 'e69e902cea92414cc5e2c8e25679815713c02ef052d15c15d9e4ee5bb8d8019b',
    expected_dry_run_proof: '189a08eebdf16f493dbfec8bd89fc9017facd565c69d6a6fa6101435ea14c063',
  },
  {
    package_id: 'SECOND-SOURCE-MANUAL-PARENT-INSERTS',
    artifact: 'english_master_index_second_source_manual_parent_insert_guarded_dry_run_v1.json',
    expected_fingerprint: '1a6ab61b6803b788700cc123927c909f80e9de955eeb9fa4c44af9ee483c0cc2',
    expected_dry_run_proof: '61afe4fc04739e1dd5ed182f264efa4451361c01800d6a54d3f869523306c572',
  },
];

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function finishCountsFrom(packages) {
  const out = {};
  for (const pkg of packages) {
    for (const [finish, count] of Object.entries(pkg.finish_counts ?? {})) {
      out[finish] = (out[finish] ?? 0) + count;
    }
  }
  return out;
}

function renderMarkdown(report) {
  const rows = report.packages.map((pkg) => [
    pkg.package_id,
    pkg.scope.parent_insert_scope,
    pkg.scope.identity_insert_scope,
    pkg.scope.child_insert_scope,
    pkg.fingerprint_matches,
    pkg.dry_run_proof_matches,
    pkg.rollback_verified,
    pkg.freshness_status,
  ]);

  return `# English Master Index Stamped/Special Bulk Gate Freshness V1

Generated: ${report.generated_at}

This is audit-only. It performs no durable DB writes and no migrations.

## Summary

- gate_checkpoint: \`${report.gate_checkpoint}\`
- gate_fresh: ${report.summary.gate_fresh}
- packages_checked: ${report.summary.packages_checked}
- stale_packages: ${report.summary.stale_packages}
- parent_insert_scope: ${report.summary.parent_insert_scope}
- active_identity_insert_scope: ${report.summary.active_identity_insert_scope}
- child_printing_insert_scope: ${report.summary.child_printing_insert_scope}
- deletes: ${report.summary.deletes}
- merges: ${report.summary.merges}
- migrations: ${report.summary.migrations}

## Packages

${markdownTable(['package', 'parents', 'identities', 'children', 'fingerprint', 'proof', 'rollback', 'status'], rows)}

## Finish Counts

${markdownTable(['finish', 'count'], Object.entries(report.summary.finish_counts))}

## Boundary

This report only confirms freshness of the V2 gate. It is not approval and does not apply the package.
`;
}

async function main() {
  const packages = [];
  for (const pkg of PACKAGES) {
    const artifactPath = path.join(AUDIT_DIR, pkg.artifact);
    const artifact = await readJson(artifactPath);
    const summary = artifact.summary ?? {};
    const currentFingerprint = artifact.fingerprint_sha256;
    const currentDryRunProof = artifact.dry_run?.dry_run_proof_sha256 ?? artifact.dry_run_proof_sha256;
    const rollbackVerified = artifact.dry_run?.rollback_verified === true || summary.rollback_verified === true;
    const fingerprintMatches = currentFingerprint === pkg.expected_fingerprint;
    const dryRunProofMatches = currentDryRunProof === pkg.expected_dry_run_proof;
    const fresh = fingerprintMatches && dryRunProofMatches && rollbackVerified && summary.write_ready_for_approval === true;

    packages.push({
      package_id: pkg.package_id,
      artifact: rel(artifactPath),
      expected_fingerprint_sha256: pkg.expected_fingerprint,
      current_fingerprint_sha256: currentFingerprint,
      expected_dry_run_proof_sha256: pkg.expected_dry_run_proof,
      current_dry_run_proof_sha256: currentDryRunProof,
      fingerprint_matches: fingerprintMatches,
      dry_run_proof_matches: dryRunProofMatches,
      rollback_verified: rollbackVerified,
      write_ready_for_approval: summary.write_ready_for_approval === true,
      freshness_status: fresh ? 'fresh' : 'stale_or_blocked',
      scope: {
        parent_insert_scope: summary.parent_insert_scope ?? 0,
        identity_insert_scope: summary.identity_insert_scope ?? summary.active_identity_insert_scope ?? 0,
        child_insert_scope: summary.child_insert_scope ?? summary.child_printing_insert_scope ?? 0,
      },
      finish_counts: summary.finish_counts ?? {},
    });
  }

  const summary = {
    gate_fresh: packages.every((pkg) => pkg.freshness_status === 'fresh'),
    packages_checked: packages.length,
    stale_packages: packages.filter((pkg) => pkg.freshness_status !== 'fresh').length,
    parent_insert_scope: packages.reduce((sum, pkg) => sum + pkg.scope.parent_insert_scope, 0),
    active_identity_insert_scope: packages.reduce((sum, pkg) => sum + pkg.scope.identity_insert_scope, 0),
    child_printing_insert_scope: packages.reduce((sum, pkg) => sum + pkg.scope.child_insert_scope, 0),
    finish_counts: finishCountsFrom(packages),
    deletes: 0,
    merges: 0,
    migrations: 0,
  };

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_bulk_gate_freshness_v1',
    gate_checkpoint: GATE,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_performed: false,
    },
    summary,
    packages,
  };

  report.fingerprint_sha256 = sha256(stableJson({
    gate_checkpoint: report.gate_checkpoint,
    summary: report.summary,
    packages: report.packages.map((pkg) => ({
      package_id: pkg.package_id,
      fingerprint: pkg.current_fingerprint_sha256,
      proof: pkg.current_dry_run_proof_sha256,
      freshness_status: pkg.freshness_status,
      scope: pkg.scope,
      finish_counts: pkg.finish_counts,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
