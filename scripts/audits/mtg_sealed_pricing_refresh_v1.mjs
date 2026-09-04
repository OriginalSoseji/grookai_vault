import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildMtgSealedPricingRefreshV1,
  validateMtgSealedPricingRefreshV1,
} from '../../backend/pricing/mtg_sealed_pricing_refresh_v1.mjs';
import {
  hashMtgSealedImageCanaryV1,
  validateMtgSealedCoverageArtifactBundleV1,
} from '../../backend/pricing/mtg_sealed_image_canary_plan_v1.mjs';
import {
  projectRefFromConnectionStringV1,
  projectRefFromSupabaseUrlV1,
  validateMtgSealedCanonicalEnvironmentV1,
} from '../../backend/pricing/mtg_sealed_image_coverage_v1.mjs';
import { hashMtgSealedV1 } from '../../backend/pricing/mtg_sealed_world_v1.mjs';
import { pgSslConfig } from './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COVERAGE_ROOT = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_image_coverage_v1', '2026-09-04_live_33841181449');
const DEFAULT_OUT = path.join(ROOT, '.tmp', 'mtg-sealed-pricing-refresh-v1');

function parseArgs(argv) {
  const result = { expectedHeadSha: '', outDir: DEFAULT_OUT,
    envFile: 'C:\\grookai_vault\\.env.local' };
  for (const argument of argv) {
    if (argument.startsWith('--expected-head-sha=')) {
      result.expectedHeadSha = argument.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (argument.startsWith('--out-dir=')) {
      result.outDir = path.resolve(argument.slice('--out-dir='.length));
    } else if (argument.startsWith('--env-file=')) {
      result.envFile = path.resolve(argument.slice('--env-file='.length));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(result.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha is required');
  }
  return result;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function repository(args) {
  const value = { branch: git('branch', '--show-current') || '(detached)',
    commit_sha: git('rev-parse', 'HEAD'), tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '' };
  if (value.commit_sha !== args.expectedHeadSha || !value.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean pricing-refresh producer');
  }
  return value;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? null;
}

function numeric(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) &&
      !key.endsWith('_id') && !key.endsWith('_identity')
      ? Number(value) : value]));
}

async function loadCoverageBundle() {
  const summaryBytes = await fs.readFile(path.join(COVERAGE_ROOT, 'summary.json'));
  const summary = JSON.parse(summaryBytes.toString('utf8'));
  const manifest = JSON.parse(await fs.readFile(
    path.join(COVERAGE_ROOT, 'permanent_manifest.json'), 'utf8'));
  const coverageCompressedBytes = await fs.readFile(
    path.join(COVERAGE_ROOT, 'coverage.jsonl.gz'));
  const coverageUncompressedBytes = gunzipSync(coverageCompressedBytes);
  const rows = coverageUncompressedBytes.toString('utf8').split(/\r?\n/)
    .filter(Boolean).map((line) => JSON.parse(line));
  const validation = validateMtgSealedCoverageArtifactBundleV1({ rows, summary,
    manifest, coverageCompressedBytes, coverageUncompressedBytes, summaryBytes });
  if (!validation.valid) {
    throw new Error(`Frozen image coverage failed validation: ${
      validation.findings.join(',')}`);
  }
  return { summary, manifest, rows, validation };
}

async function environment(client, url) {
  const config = await fs.readFile(path.join(ROOT, 'supabase', 'config.toml'), 'utf8');
  const counts = (await client.query(`select
    (select count(*)::bigint from public.card_prints) card_prints,
    (select count(*)::bigint from public.sets) sets,
    (select count(*)::bigint from public.card_print_traits) card_print_traits`)).rows[0];
  const proof = { config_project_ref: config.match(
    /^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1] ?? null,
    database_project_ref: projectRefFromConnectionStringV1(url),
    supabase_url_project_ref: projectRefFromSupabaseUrlV1(process.env.SUPABASE_URL),
    card_prints: Number(counts.card_prints), sets: Number(counts.sets),
    card_print_traits: Number(counts.card_print_traits) };
  return { ...proof, ...validateMtgSealedCanonicalEnvironmentV1(proof) };
}

async function canonicalRows(client) {
  return (await client.query(`select
      variant.id::text variant_id,family.id::text family_id,
      mapping.id::text source_mapping_id,mapping.source_product_id::bigint,
      variant.canonical_name,variant.package_form,variant.language_code,
      mapping.source_product_name,source.source_active,
      source.catalog_metadata_status
    from public.sealed_product_variants variant
    join public.sealed_product_families family on family.id=variant.family_id
    join public.sealed_product_source_mappings mapping
      on mapping.variant_id=variant.id and mapping.mapping_status='exact_reviewed'
    left join public.tcgcsv_source_products source
      on source.category_id=mapping.source_category_id
     and source.group_id=mapping.source_group_id
     and source.product_id=mapping.source_product_id
    where family.game_key='mtg' and variant.language_code='en'
      and mapping.source_provider='tcgplayer' and mapping.source_category_id=1
    order by variant.id`)).rows.map((row) => ({ ...numeric(row),
      source_product_id: Number(row.source_product_id),
      canonical_lineage_exact: true }));
}

async function latestPrices(client, productIds) {
  return (await client.query(`select distinct on
      (price.product_id,price.subtype_name_normalized)
      price.product_id::bigint as source_product_id,
      price.source_price_row_identity,price.subtype_name_normalized,
      price.observed_on::text,price.currency,price.market_price::text,
      price.low_price::text,price.payload_hash
    from public.tcgcsv_source_price_daily_observations price
    where price.product_id=any($1::bigint[])
    order by price.product_id,price.subtype_name_normalized,
      price.observed_on desc,price.updated_at desc,price.id desc`,
  [productIds])).rows.map((row) => ({ ...row,
    source_product_id: Number(row.source_product_id),
    market_price: row.market_price === null ? null : Number(row.market_price),
    low_price: row.low_price === null ? null : Number(row.low_price) }));
}

async function currentMembers(client) {
  return (await client.query(`select
      release.id::text release_id,member.variant_id::text,
      member.source_mapping_id::text,qualification.id::text qualification_id,
      qualification.source_price_row_identity,qualification.observed_on::text,
      qualification.source_observation_fingerprint,
      (qualification.qualification_evidence #>>
        '{observation,market_price}')::numeric::text market_price
    from public.sealed_product_release_pointer pointer
    join public.sealed_product_releases release
      on release.id=pointer.release_id and release.game_key=pointer.game_key
     and release.release_state='frozen'
    join public.sealed_product_release_members member
      on member.release_id=release.id
    join public.sealed_product_pricing_lane_qualifications qualification
      on qualification.id=member.qualification_id
    where pointer.game_key='mtg'
    order by member.variant_id`)).rows.map((row) => ({ ...row,
      market_price: row.market_price === null ? null : Number(row.market_price) }));
}

async function latestSync(client) {
  const row = (await client.query(`select id::text,status,observed_on::text,
      finished_at,artifact_hash
    from public.tcgcsv_source_sync_runs
    where sync_mode='current_full_sync' and status='completed'
    order by created_at desc,id desc limit 1`)).rows[0];
  return row ? { ...row, finished_at: row.finished_at
    ? new Date(row.finished_at).toISOString() : null } : null;
}

async function writeArtifacts(outDir, files) {
  await fs.mkdir(outDir, { recursive: true });
  const hashes = {};
  for (const [name, bytes] of Object.entries(files)) {
    const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    await fs.writeFile(path.join(outDir, name), body);
    hashes[name] = { bytes: body.length,
      sha256: hashMtgSealedImageCanaryV1(body) };
  }
  await fs.writeFile(path.join(outDir, 'artifact_hashes.json'),
    `${JSON.stringify({ hash_algorithm: 'sha256', artifacts: hashes }, null, 2)}\n`);
}

const args = parseArgs(process.argv.slice(2));
dotenv.config({ path: args.envFile, quiet: true });
const repo = repository(args);
const coverage = await loadCoverageBundle();
const imageEligibleVariantIds = coverage.rows.filter((row) =>
  ['exact_image_ready', 'shared_bytes_exact_variant'].includes(row.classification))
  .map((row) => row.variant_id);
const runPlan = { version: 'MTG_SEALED_PRICING_REFRESH_READ_ONLY_RUN_V1',
  repository: repo, source_coverage_fingerprint_sha256:
    coverage.summary.coverage_fingerprint_sha256,
  image_eligible_variant_count: imageEligibleVariantIds.length,
  mode: 'read_only_plan', boundaries: { provider_calls: 0,
    database_writes: 0, storage_reads: 0, storage_writes: 0,
    pricing_writes: 0, release_pointer_writes: 0, visibility_writes: 0,
    vault_writes: 0 } };
await fs.mkdir(args.outDir, { recursive: true });
await fs.writeFile(path.join(args.outDir, 'run_plan.json'),
  `${JSON.stringify(runPlan, null, 2)}\n`);

const url = databaseUrl();
if (!url) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required');
const client = new Client({ connectionString: url, ssl: pgSslConfig(url),
  connectionTimeoutMillis: 30_000, query_timeout: 300_000,
  statement_timeout: 300_000,
  application_name: 'mtg-sealed-pricing-refresh-v1-read-only' });
await client.connect();
let source;
try {
  await client.query('begin isolation level repeatable read read only');
  const env = await environment(client, url);
  if (!env.valid) throw new Error(`Canonical environment mismatch: ${
    env.findings.join(',')}`);
  const canonical = await canonicalRows(client);
  const prices = await latestPrices(client,
    canonical.map((row) => row.source_product_id));
  const members = await currentMembers(client);
  const sync = await latestSync(client);
  const transactionReadOnly = await client.query('show transaction_read_only');
  source = { env, canonical, prices, members, sync,
    transaction_read_only: transactionReadOnly.rows[0].transaction_read_only };
  await client.query('commit');
} catch (error) {
  await client.query('rollback').catch(() => {});
  throw error;
} finally {
  await client.end();
}

const today = new Date().toISOString().slice(0, 10);
const plan = buildMtgSealedPricingRefreshV1({ canonicalRows: source.canonical,
  latestPriceRows: source.prices, currentMembers: source.members,
  latestSync: source.sync, imageEligibleVariantIds, asOfDate: today,
  producerCommit: repo.commit_sha });
const validation = validateMtgSealedPricingRefreshV1(plan);
const reconciliation = {
  canonical_rows_equal_plan_rows: source.canonical.length === plan.rows.length,
  unique_plan_variant_ids: new Set(plan.rows.map((row) => row.variant_id)).size ===
    plan.rows.length,
  qualification_counts_reconcile: Object.values(
    plan.counts.qualification_statuses).reduce((sum, count) => sum + count, 0) ===
    plan.rows.length,
  delta_counts_reconcile: Object.values(plan.counts.deltas)
    .reduce((sum, count) => sum + count, 0) === plan.rows.length,
  current_release_id_unique: new Set(source.members.map((row) => row.release_id)).size === 1,
  source_artifacts_valid: coverage.validation.valid,
  transaction_read_only: source.transaction_read_only === 'on',
  zero_write_boundaries: Object.values(plan.boundaries).every((value) => value === 0),
};
const reconciliationValid = Object.values(reconciliation).every(Boolean);
const summary = { status: validation.valid && reconciliationValid &&
    plan.findings.length === 0 ? 'mtg_sealed_pricing_refresh_ready_zero_writes' :
    'mtg_sealed_pricing_refresh_blocked_zero_writes', repository: repo,
  canonical_environment: source.env, source_coverage_fingerprint_sha256:
    coverage.summary.coverage_fingerprint_sha256,
  plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
  counts: plan.counts, findings: plan.findings, validation,
  reconciliation, reconciliation_valid: reconciliationValid,
  read_only_proof: { transaction_mode: 'repeatable_read_read_only',
    transaction_read_only: source.transaction_read_only, transaction_closed: true,
    write_attribution: [] }, boundaries: plan.boundaries };
const report = `# MTG Sealed Pricing Refresh V1\n\n` +
  `- Status: \`${summary.status}\`\n` +
  `- Producer: \`${repo.commit_sha}\`\n` +
  `- Current release: \`${plan.current_release.release_id}\` (${plan.current_release.member_count} members)\n` +
  `- Proposed exact/image-backed variants: \`${plan.counts.qualified_variants}\`\n` +
  `- Plan fingerprint: \`${plan.plan_fingerprint_sha256}\`\n` +
  `- Reconciliation: \`${reconciliationValid}\`\n` +
  `- Findings: \`${plan.findings.join(', ') || 'none'}\`\n\n` +
  `This audit used one repeatable-read read-only database transaction. It made ` +
  `no provider, Storage, pricing, pointer, visibility, Vault, or other database writes.\n`;
await writeArtifacts(args.outDir, {
  'run_plan.json': `${JSON.stringify(runPlan, null, 2)}\n`,
  'refresh_plan.json.gz': gzipSync(`${JSON.stringify(plan, null, 2)}\n`),
  'refresh_rows.jsonl.gz': gzipSync(`${plan.rows.map((row) =>
    JSON.stringify(row)).join('\n')}\n`),
  'summary.json': `${JSON.stringify(summary, null, 2)}\n`,
  'reconciliation.json': `${JSON.stringify(reconciliation, null, 2)}\n`,
  'REPORT.md': report,
});
console.log(JSON.stringify(summary, null, 2));
if (!validation.valid || !reconciliationValid || plan.findings.length) {
  process.exitCode = 1;
}
