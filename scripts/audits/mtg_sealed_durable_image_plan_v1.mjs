import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

import {
  buildMtgSealedDurableImagePlanV1,
  hashMtgSealedDurableImagePlanV1,
  validateMtgSealedDurableImagePlanV1,
} from '../../backend/pricing/mtg_sealed_durable_image_plan_v1.mjs';
import {
  validateMtgSealedCoverageArtifactBundleV1,
} from '../../backend/pricing/mtg_sealed_image_canary_plan_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_SOURCE = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_image_coverage_v1', '2026-09-04_live_33841181449');
const DEFAULT_OUT = path.join(ROOT, '.tmp', 'mtg-sealed-durable-image-plan-v1');

function parseArgs(argv) {
  const result = { sourceDir: DEFAULT_SOURCE, outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument.startsWith('--source-dir=')) {
      result.sourceDir = path.resolve(argument.slice(13));
    } else if (argument.startsWith('--out-dir=')) {
      result.outDir = path.resolve(argument.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return result;
}

function repository() {
  const git = (...args) => execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  return {
    commit_sha: git('rev-parse', 'HEAD'),
    branch: git('branch', '--show-current'),
    tracked_worktree_clean:
      git('status', '--short', '--untracked-files=no') === '',
  };
}

function jsonl(rows) {
  return Buffer.from(`${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

async function writeArtifacts(outDir, artifacts) {
  await fs.mkdir(outDir, { recursive: true });
  const hashes = {};
  for (const [name, bytes] of Object.entries(artifacts)) {
    await fs.writeFile(path.join(outDir, name), bytes);
    hashes[name] = {
      bytes: bytes.length,
      sha256: hashMtgSealedDurableImagePlanV1(bytes),
    };
  }
  const manifest = Buffer.from(`${JSON.stringify({
    hash_algorithm: 'sha256',
    artifacts: hashes,
  }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'artifact_hashes.json'), manifest);
  return { ...hashes, 'artifact_hashes.json': {
    bytes: manifest.length,
    sha256: hashMtgSealedDurableImagePlanV1(manifest),
  } };
}

const args = parseArgs(process.argv.slice(2));
const repo = repository();
if (!repo.tracked_worktree_clean) {
  throw new Error('Tracked worktree must be clean before freezing the plan');
}

const summaryBytes = await fs.readFile(path.join(args.sourceDir, 'summary.json'));
const summary = JSON.parse(summaryBytes.toString('utf8'));
const manifestBytes = await fs.readFile(
  path.join(args.sourceDir, 'permanent_manifest.json'));
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const coverageCompressedBytes = await fs.readFile(
  path.join(args.sourceDir, 'coverage.jsonl.gz'));
const coverageUncompressedBytes = gunzipSync(coverageCompressedBytes);
const rows = coverageUncompressedBytes.toString('utf8')
  .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const sourceValidation = validateMtgSealedCoverageArtifactBundleV1({
  rows,
  summary,
  manifest,
  coverageCompressedBytes,
  coverageUncompressedBytes,
  summaryBytes,
});
if (!sourceValidation.valid) {
  throw new Error(`Invalid preserved source artifacts: ${
    sourceValidation.findings.join(', ')}`);
}

const sourceArtifacts = {
  source_directory: path.relative(ROOT, args.sourceDir).replaceAll('\\', '/'),
  coverage_jsonl_gz_sha256:
    manifest.preserved_artifacts['coverage.jsonl.gz'].sha256,
  coverage_jsonl_sha256:
    manifest.preserved_artifacts['coverage.jsonl.gz'].uncompressed_sha256,
  summary_json_sha256: manifest.preserved_artifacts['summary.json'].sha256,
  permanent_manifest_sha256:
    hashMtgSealedDurableImagePlanV1(manifestBytes),
};
const bundle = buildMtgSealedDurableImagePlanV1(rows, {
  coverageFingerprint: summary.coverage_fingerprint_sha256,
  producerCommitSha: repo.commit_sha,
  sourceReportedUniqueValidImages: summary.unique_image_count,
  sourceArtifacts,
});
const validation = validateMtgSealedDurableImagePlanV1(bundle, {
  coverageFingerprint: summary.coverage_fingerprint_sha256,
});
if (!validation.valid) {
  throw new Error(`Invalid durable image plan: ${validation.findings.join(', ')}`);
}

const objectBytes = jsonl(bundle.objects);
const compressedObjectBytes = gzipSync(objectBytes, { level: 9, mtime: 0 });
const exclusionBytes = jsonl(bundle.exclusions);
const shardBytes = Buffer.from(`${JSON.stringify(bundle.shards, null, 2)}\n`);
const runPlanBytes = Buffer.from(`${JSON.stringify(bundle.plan, null, 2)}\n`);
const result = {
  status: 'mtg_sealed_durable_image_plan_frozen_zero_calls',
  repository: repo,
  source_artifact_validation: sourceValidation,
  validation,
  source_release_id: bundle.plan.source_release_id,
  source_coverage_fingerprint_sha256:
    bundle.plan.source_coverage_fingerprint_sha256,
  plan_fingerprint_sha256: bundle.plan.plan_fingerprint_sha256,
  selected_member_count: bundle.plan.reconciliation.selected_members,
  eligible_variant_count: bundle.plan.reconciliation.eligible_variants,
  eligible_unique_object_count:
    bundle.plan.reconciliation.eligible_unique_objects,
  exclusion_count: bundle.plan.reconciliation.exclusions,
  source_reported_unique_valid_image_count:
    bundle.plan.reconciliation.source_reported_unique_valid_images,
  excluded_valid_placeholder_hash_count:
    bundle.plan.reconciliation.excluded_valid_placeholder_hashes,
  source_accounting_correction:
    bundle.plan.reconciliation.source_accounting_correction,
  expected_durable_bytes:
    bundle.plan.reconciliation.eligible_expected_bytes,
  shard_count: bundle.shards.length,
  maximum_source_request_attempts:
    bundle.plan.execution_policy.maximum_source_request_attempts,
  boundaries: bundle.plan.boundaries,
};
const summaryOutputBytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
const reportBytes = Buffer.from(
  `# MTG Sealed Durable Image Plan V1\n\n` +
  `- Status: \`${result.status}\`\n` +
  `- Producer commit: \`${repo.commit_sha}\`\n` +
  `- Source coverage: \`${result.source_coverage_fingerprint_sha256}\`\n` +
  `- Durable plan: \`${result.plan_fingerprint_sha256}\`\n` +
  `- Selected release members: \`${result.selected_member_count}\`\n` +
  `- Eligible variants: \`${result.eligible_variant_count}\`\n` +
  `- Eligible unique objects: \`${result.eligible_unique_object_count}\`\n` +
  `- Preserved exclusions: \`${result.exclusion_count}\`\n` +
  `- Durable bytes: \`${result.expected_durable_bytes}\`\n` +
  `- Shards: \`${result.shard_count}\` (maximum 100 objects each)\n` +
  `- Source request ceiling: \`${result.maximum_source_request_attempts}\`\n` +
  `- Source accounting correction: ` +
    `\`${result.source_reported_unique_valid_image_count}\` reported unique ` +
    `valid images included \`${result.excluded_valid_placeholder_hash_count}\` ` +
    `excluded placeholder hashes; the uploadable exact count is ` +
    `\`${result.eligible_unique_object_count}\`.\n\n` +
  `This plan read only the preserved coverage bundle. It made zero network, ` +
  `database, Storage, image-evidence, pointer, pricing, visibility, Vault, ` +
  `client, or cross-game calls or writes. Durable execution requires a ` +
  `separately frozen executor and exact authority.\n`,
);
await writeArtifacts(args.outDir, {
  'run_plan.json': runPlanBytes,
  'objects.jsonl.gz': compressedObjectBytes,
  'exclusions.jsonl': exclusionBytes,
  'shards.json': shardBytes,
  'summary.json': summaryOutputBytes,
  'REPORT.md': reportBytes,
});
console.log(JSON.stringify(result, null, 2));
