import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import {
  buildMtgSealedTransientImageCanaryPlanV1,
  hashMtgSealedImageCanaryV1,
  validateMtgSealedCoverageArtifactBundleV1,
  validateMtgSealedTransientImageCanaryPlanV1,
} from '../../backend/pricing/mtg_sealed_image_canary_plan_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_SOURCE = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_image_coverage_v1', '2026-09-04_live_33841181449');
const DEFAULT_OUT = path.join(ROOT, '.tmp', 'mtg-sealed-image-canary-plan-v1');

function parseArgs(argv) {
  const result = { sourceDir: DEFAULT_SOURCE, outDir: DEFAULT_OUT, count: 17 };
  for (const argument of argv) {
    if (argument.startsWith('--source-dir=')) {
      result.sourceDir = path.resolve(argument.slice(13));
    } else if (argument.startsWith('--out-dir=')) {
      result.outDir = path.resolve(argument.slice(10));
    } else if (argument.startsWith('--count=')) {
      result.count = Number(argument.slice(8));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return result;
}

function repository() {
  const git = (...args) => execFileSync('git', args, {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  return {
    commit_sha: git('rev-parse', 'HEAD'),
    branch: git('branch', '--show-current'),
    tracked_worktree_clean: git('status', '--short', '--untracked-files=no') === '',
  };
}

async function writeArtifacts(outDir, files) {
  await fs.mkdir(outDir, { recursive: true });
  const artifacts = {};
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.from(name.endsWith('.json')
      ? `${JSON.stringify(value, null, 2)}\n`
      : String(value));
    await fs.writeFile(path.join(outDir, name), body);
    artifacts[name] = {
      bytes: body.length,
      sha256: hashMtgSealedImageCanaryV1(body),
    };
  }
  await fs.writeFile(path.join(outDir, 'artifact_hashes.json'),
    `${JSON.stringify({ hash_algorithm: 'sha256', artifacts }, null, 2)}\n`);
}

const args = parseArgs(process.argv.slice(2));
const summaryBytes = await fs.readFile(path.join(args.sourceDir, 'summary.json'));
const summary = JSON.parse(summaryBytes.toString('utf8'));
const manifest = JSON.parse(await fs.readFile(
  path.join(args.sourceDir, 'permanent_manifest.json'), 'utf8'));
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
const plan = buildMtgSealedTransientImageCanaryPlanV1(rows, {
  count: args.count,
  coverageFingerprint: summary.coverage_fingerprint_sha256,
});
const validation = validateMtgSealedTransientImageCanaryPlanV1(plan);
if (!validation.valid) {
  throw new Error(`Invalid canary plan: ${validation.findings.join(', ')}`);
}
const packageForms = Object.fromEntries([...new Set(plan.rows.map((row) =>
  row.package_form))].sort().map((value) => [value,
  plan.rows.filter((row) => row.package_form === value).length]));
const result = {
  status: 'mtg_sealed_transient_image_canary_planned_zero_calls',
  repository: repository(),
  source_release_id: plan.source_release_id,
  source_coverage_fingerprint_sha256:
    plan.source_coverage_fingerprint_sha256,
  selected_variant_count: plan.rows.length,
  selected_unique_object_count: new Set(plan.rows.map((row) =>
    row.expected_image.content_sha256)).size,
  package_form_counts: packageForms,
  plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
  source_artifact_validation: sourceValidation,
  validation,
  boundaries: plan.boundaries,
};
const report = `# MTG Sealed Transient Image Canary Plan V1\n\n` +
  `- Status: \`${result.status}\`\n` +
  `- Source release: \`${result.source_release_id}\`\n` +
  `- Selected exact variants/objects: \`${plan.rows.length}/${result.selected_unique_object_count}\`\n` +
  `- Plan fingerprint: \`${plan.plan_fingerprint_sha256}\`\n` +
  `- Preserved source validation: \`${sourceValidation.valid}\`\n` +
  `- Validation: \`${validation.valid}\`\n\n` +
  `This operation read committed audit files only. It made zero provider, ` +
  `database, Storage, pricing, visibility, or Vault calls or writes. A future ` +
  `transient execution requires separate authority and must remove and verify ` +
  `absence of every object it creates.\n`;
await writeArtifacts(args.outDir, {
  'canary_plan.json': plan,
  'summary.json': result,
  'REPORT.md': report,
});
console.log(JSON.stringify(result, null, 2));
