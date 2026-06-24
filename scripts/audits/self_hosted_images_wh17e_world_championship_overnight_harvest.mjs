import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh17a_world_championship_pricecharting_exact_probe_summary_v1.json');
const SOURCE_SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh17a_world_championship_pricecharting_exact_probe_summary_v1.md');
const SOURCE_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh17a_world_championship_pricecharting_exact_upload_manifest_v1.jsonl');
const AGGREGATE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh17e_world_championship_overnight_harvest_summary_v1.json');
const AGGREGATE_SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh17e_world_championship_overnight_harvest_summary_v1.md');
const AGGREGATE_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh17e_world_championship_overnight_harvest_manifest_v1.jsonl');
const PACKAGE_ID = 'IMG-HOST-WH-17A-WORLD-CHAMPIONSHIP-PRICECHARTING-EXACT-PROBE';
const HARVEST_PACKAGE_ID = 'IMG-HOST-WH-17E-WORLD-CHAMPIONSHIP-OVERNIGHT-HARVEST';

function parseArgs(argv) {
  const args = {
    startOffset: Number.parseInt(process.env.WH17E_START_OFFSET ?? '671', 10),
    batchLimit: Number.parseInt(process.env.WH17E_BATCH_LIMIT ?? '100', 10),
    maxBatches: Number.parseInt(process.env.WH17E_MAX_BATCHES ?? '25', 10),
    delayMs: Number.parseInt(process.env.WH17E_DELAY_MS ?? '250', 10),
    timeoutSec: Number.parseInt(process.env.WH17E_TIMEOUT_SEC ?? '25', 10),
    stopAfterEmptyBatches: Number.parseInt(process.env.WH17E_STOP_AFTER_EMPTY_BATCHES ?? '2', 10),
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--start-offset') args.startOffset = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--batch-limit') args.batchLimit = Number.parseInt(argv[++index] ?? '100', 10);
    else if (arg === '--max-batches') args.maxBatches = Number.parseInt(argv[++index] ?? '25', 10);
    else if (arg === '--delay-ms') args.delayMs = Number.parseInt(argv[++index] ?? '250', 10);
    else if (arg === '--timeout-sec') args.timeoutSec = Number.parseInt(argv[++index] ?? '25', 10);
    else if (arg === '--stop-after-empty-batches') args.stopAfterEmptyBatches = Number.parseInt(argv[++index] ?? '2', 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.startOffset = Math.max(0, args.startOffset || 0);
  args.batchLimit = Math.max(1, args.batchLimit || 100);
  args.maxBatches = Math.max(1, args.maxBatches || 1);
  args.delayMs = Math.max(0, args.delayMs || 0);
  args.timeoutSec = Math.max(10, args.timeoutSec || 25);
  args.stopAfterEmptyBatches = Math.max(1, args.stopAfterEmptyBatches || 1);
  return args;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function renderMarkdown(summary) {
  const batchRows = summary.batches.map((batch) => (
    `| ${batch.index} | ${batch.offset} | ${batch.rows_probed} | ${batch.exact_image_candidate_rows} | ${batch.blocked_rows} | \`${batch.fingerprint}\` |`
  )).join('\n');
  return `# ${HARVEST_PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Start offset: ${summary.start_offset}
- Batch limit: ${summary.batch_limit}
- Batches completed: ${summary.batches_completed}
- Rows probed: ${summary.rows_probed}
- Exact image candidates: ${summary.exact_image_candidate_rows}
- Blocked rows: ${summary.blocked_rows}
- Nonproduction assets staged: ${summary.nonproduction_assets_staged}
- Standard WH17A manifest rewritten: ${summary.standard_wh17a_manifest_rewritten}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}

## By Set

${Object.entries(summary.by_set_code_exact_candidates).map(([key, count]) => `- ${key}: ${count}`).join('\n') || '_None._'}

## Batches

| batch | offset | probed | exact | blocked | fingerprint |
| --- | ---: | ---: | ---: | ---: | --- |
${batchRows || '| _none_ | | | | | |'}

## Next Action

Run the normal WH17B storage upload plan against the rewritten WH17A manifest. This harvest does not authorize storage writes, DB writes, identity-table writes, price writes, deletes, merges, migrations, or global apply.
`;
}

async function runProbeBatch(offset, args) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    'scripts/audits/self_hosted_images_wh17a_world_championship_pricecharting_exact_probe.mjs',
    '--offset',
    String(offset),
    '--limit',
    String(args.batchLimit),
    '--delay-ms',
    String(args.delayMs),
    '--timeout-sec',
    String(args.timeoutSec),
  ], {
    cwd: ROOT,
    timeout: (args.batchLimit * (args.delayMs + ((args.timeoutSec + 10) * 1000))) + 120000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (stderr.trim()) process.stderr.write(stderr);
  const result = JSON.parse(stdout);
  const summary = await readJson(SOURCE_SUMMARY_JSON);
  const manifestRows = await readJsonl(SOURCE_MANIFEST_JSONL);
  return { result, summary, manifestRows };
}

async function main() {
  const args = parseArgs(process.argv);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const batches = [];
  const manifestRows = [];
  const seenStoragePaths = new Set();
  let offset = args.startOffset;
  let emptyBatches = 0;

  for (let batchIndex = 0; batchIndex < args.maxBatches; batchIndex += 1) {
    const { summary, manifestRows: batchManifestRows } = await runProbeBatch(offset, args);
    batches.push({
      index: batchIndex + 1,
      offset,
      rows_probed: summary.rows_probed,
      exact_image_candidate_rows: summary.exact_image_candidate_rows,
      blocked_rows: summary.blocked_rows,
      fingerprint: summary.fingerprint,
    });

    for (const row of batchManifestRows) {
      const storagePath = row.asset?.target_storage_path;
      if (!storagePath || seenStoragePaths.has(storagePath)) continue;
      seenStoragePaths.add(storagePath);
      manifestRows.push(row);
    }

    if (summary.rows_probed === 0) emptyBatches += 1;
    else emptyBatches = 0;
    if (emptyBatches >= args.stopAfterEmptyBatches) break;
    if (summary.rows_probed < args.batchLimit) break;

    // This harvest does not DB-point exact candidates as it goes, so the representative
    // rowset remains stable for the duration of the run. Advance by rows probed.
    offset += summary.rows_probed;
  }

  await fs.writeFile(AGGREGATE_MANIFEST_JSONL, `${manifestRows.map((row) => JSON.stringify(row)).join('\n')}${manifestRows.length ? '\n' : ''}`, 'utf8');
  await fs.writeFile(SOURCE_MANIFEST_JSONL, `${manifestRows.map((row) => JSON.stringify(row)).join('\n')}${manifestRows.length ? '\n' : ''}`, 'utf8');

  const summaryBase = {
    package_id: PACKAGE_ID,
    harvest_package_id: HARVEST_PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'overnight_aggregate_exact_source_probe_no_db_no_storage_writes',
    source: 'pricecharting_direct_product_pages',
    start_offset: args.startOffset,
    batch_limit: args.batchLimit,
    max_batches: args.maxBatches,
    batches_completed: batches.length,
    rows_probed: batches.reduce((sum, batch) => sum + batch.rows_probed, 0),
    exact_image_candidate_rows: manifestRows.length,
    blocked_rows: batches.reduce((sum, batch) => sum + batch.blocked_rows, 0),
    nonproduction_assets_staged: manifestRows.length,
    manifest_jsonl: path.relative(ROOT, SOURCE_MANIFEST_JSONL),
    aggregate_manifest_jsonl: path.relative(ROOT, AGGREGATE_MANIFEST_JSONL),
    aggregate_summary_json: path.relative(ROOT, AGGREGATE_SUMMARY_JSON),
    standard_wh17a_manifest_rewritten: true,
    by_set_code_exact_candidates: countBy(manifestRows, (row) => row.set_code),
    batches,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
  };
  const summary = {
    ...summaryBase,
    samples: {
      exact_candidates: manifestRows.slice(0, 50).map((row) => ({
        gv_id: row.gv_id,
        set_code: row.set_code,
        name: row.name,
        number: row.number,
        source_url: row.source_url,
        asset_url: row.asset_url,
        target_storage_path: row.asset?.target_storage_path ?? null,
      })),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    harvest_package_id: summary.harvest_package_id,
    start_offset: summary.start_offset,
    batch_limit: summary.batch_limit,
    batches: summary.batches,
    manifest: manifestRows.map((row) => ({
      gv_id: row.gv_id,
      set_code: row.set_code,
      number: row.number,
      name: row.name,
      source_url: row.source_url,
      asset_url: row.asset_url,
      sha256: row.asset?.normalized_sha256 ?? null,
      target_storage_path: row.asset?.target_storage_path ?? null,
    })),
  });

  await fs.writeFile(AGGREGATE_SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(AGGREGATE_SUMMARY_MD, renderMarkdown(summary), 'utf8');
  await fs.writeFile(SOURCE_SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SOURCE_SUMMARY_MD, renderMarkdown(summary), 'utf8');

  console.log(JSON.stringify({
    package_id: HARVEST_PACKAGE_ID,
    summary_json: path.relative(ROOT, AGGREGATE_SUMMARY_JSON),
    summary_md: path.relative(ROOT, AGGREGATE_SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, AGGREGATE_MANIFEST_JSONL),
    standard_wh17a_manifest_jsonl: path.relative(ROOT, SOURCE_MANIFEST_JSONL),
    fingerprint: summary.fingerprint,
    batches_completed: summary.batches_completed,
    rows_probed: summary.rows_probed,
    exact_image_candidate_rows: summary.exact_image_candidate_rows,
    blocked_rows: summary.blocked_rows,
    nonproduction_assets_staged: summary.nonproduction_assets_staged,
    db_writes_performed: summary.db_writes_performed,
    storage_writes_performed: summary.storage_writes_performed,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
