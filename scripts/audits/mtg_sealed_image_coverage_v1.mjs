import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  MTG_SEALED_IMAGE_COVERAGE_V1,
  buildMtgSealedImageSourcePlanV1,
  finalizeMtgSealedImageCoverageV1,
  hashMtgSealedImageV1,
  inspectMtgSealedImageBytesV1,
  projectRefFromConnectionStringV1,
  projectRefFromSupabaseUrlV1,
  validateMtgSealedCanonicalEnvironmentV1,
  validateMtgSealedImageCoverageV1,
} from '../../backend/pricing/mtg_sealed_image_coverage_v1.mjs';
import { pgSslConfig } from './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_OUT = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_image_coverage_v1', 'operator_v1');
const USER_AGENT = 'Grookai-MTG-Sealed-Image-Coverage-V1/1.0';

function parseArgs(argv) {
  const args = {
    expectedHeadSha: '',
    expectedMemberCount: 2182,
    concurrency: 12,
    retries: 2,
    timeoutMs: 30_000,
    maxBytes: 12_000_000,
    outDir: DEFAULT_OUT,
    envFile: 'C:\\grookai_vault\\.env.local',
  };
  for (const argument of argv) {
    if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (argument.startsWith('--expected-member-count=')) {
      args.expectedMemberCount = Number(argument.slice('--expected-member-count='.length));
    } else if (argument.startsWith('--concurrency=')) {
      args.concurrency = Number(argument.slice('--concurrency='.length));
    } else if (argument.startsWith('--retries=')) {
      args.retries = Number(argument.slice('--retries='.length));
    } else if (argument.startsWith('--timeout-ms=')) {
      args.timeoutMs = Number(argument.slice('--timeout-ms='.length));
    } else if (argument.startsWith('--max-bytes=')) {
      args.maxBytes = Number(argument.slice('--max-bytes='.length));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice('--out-dir='.length));
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice('--env-file='.length));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha is required');
  }
  for (const [key, value] of Object.entries({
    expectedMemberCount: args.expectedMemberCount,
    concurrency: args.concurrency,
    retries: args.retries,
    timeoutMs: args.timeoutMs,
    maxBytes: args.maxBytes,
  })) {
    if (!Number.isInteger(value) || value < (key === 'retries' ? 0 : 1)) {
      throw new Error(`Invalid ${key}`);
    }
  }
  if (args.concurrency > 32 || args.retries > 4 || args.maxBytes > 25_000_000) {
    throw new Error('Probe bounds exceed the governed coverage envelope');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function repository(args) {
  const result = {
    branch: git('branch', '--show-current') || '(detached)',
    commit_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '',
  };
  if (result.commit_sha !== args.expectedHeadSha || !result.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean image-coverage producer');
  }
  return result;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? null;
}

async function loadActiveReleaseMembers(client) {
  const result = await client.query(`select
      release.id::text as release_id,
      member.id::text as release_member_id,
      member.member_fingerprint,
      family.id::text as family_id,
      family.game_key,
      variant.id::text as variant_id,
      variant.canonical_name,
      variant.package_form,
      variant.language_code,
      mapping.id::text as source_mapping_id,
      mapping.source_provider,
      mapping.source_category_id::bigint,
      mapping.source_group_id::bigint,
      mapping.source_product_id::bigint,
      mapping.source_product_name,
      mapping.source_payload_hash as mapping_source_payload_hash,
      source.product_id::bigint as current_source_product_id,
      source.category_id::bigint as current_source_category_id,
      source.group_id::bigint as current_source_group_id,
      source.name as current_source_product_name,
      source.payload_hash as current_source_payload_hash,
      source.image_url as source_image_url,
      source.image_count as source_image_count,
      source.source_active,
      source.catalog_metadata_status
    from public.sealed_product_release_pointer pointer
    join public.sealed_product_releases release
      on release.id=pointer.release_id
     and release.game_key=pointer.game_key
     and release.release_state='frozen'
    join public.sealed_product_release_members member
      on member.release_id=release.id
    join public.sealed_product_variants variant
      on variant.id=member.variant_id
    join public.sealed_product_families family
      on family.id=variant.family_id
     and family.game_key=release.game_key
    join public.sealed_product_source_mappings mapping
      on mapping.id=member.source_mapping_id
     and mapping.variant_id=variant.id
     and mapping.mapping_status='exact_reviewed'
    left join public.tcgcsv_source_products source
      on source.product_id=mapping.source_product_id
     and source.category_id=mapping.source_category_id
     and source.group_id=mapping.source_group_id
    where pointer.game_key='mtg'
    order by member.id`);
  return result.rows.map((row) => ({ ...row,
    source_category_id: Number(row.source_category_id),
    source_group_id: Number(row.source_group_id),
    source_product_id: Number(row.source_product_id),
    current_source_product_id: row.current_source_product_id == null
      ? null : Number(row.current_source_product_id),
    current_source_category_id: row.current_source_category_id == null
      ? null : Number(row.current_source_category_id),
    current_source_group_id: row.current_source_group_id == null
      ? null : Number(row.current_source_group_id),
  }));
}

async function canonicalEnvironment(client, url) {
  const config = await fs.readFile(path.join(ROOT, 'supabase', 'config.toml'), 'utf8');
  const configProjectRef = config.match(/^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1] ?? null;
  const counts = (await client.query(`select
      (select count(*)::bigint from public.card_prints) as card_prints,
      (select count(*)::bigint from public.sets) as sets,
      (select count(*)::bigint from public.card_print_traits) as card_print_traits`)).rows[0];
  const proof = {
    config_project_ref: configProjectRef,
    database_project_ref: projectRefFromConnectionStringV1(url),
    supabase_url_project_ref: projectRefFromSupabaseUrlV1(process.env.SUPABASE_URL),
    card_prints: Number(counts.card_prints),
    sets: Number(counts.sets),
    card_print_traits: Number(counts.card_print_traits),
  };
  const validation = validateMtgSealedCanonicalEnvironmentV1(proof);
  return { ...proof, ...validation };
}

async function readBoundedBuffer(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error('image_exceeds_max_bytes');
  }
  if (!response.body) throw new Error('missing_response_body');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('image_exceeds_max_bytes');
        throw new Error('image_exceeds_max_bytes');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

function safeErrorCode(error) {
  const message = String(error?.message ?? error ?? 'unknown_error');
  if (message.startsWith('http_')) return message;
  if (message.includes('timeout') || error?.name === 'TimeoutError') return 'request_timeout';
  if (message === 'image_exceeds_max_bytes') return message;
  if (message === 'redirect_host_not_allowed') return message;
  if (message === 'invalid_image') return message;
  return 'request_failed';
}

async function probeOne(row, args) {
  const attempted = [];
  const errors = [];
  let lastInvalid = null;
  if (row.identity_conflict || row.invalid_source_url) {
    return { status: 'identity_conflict', attempted_urls: [],
      error_codes: ['source_identity_conflict'] };
  }
  for (const candidate of row.candidate_urls) {
    for (let attempt = 0; attempt <= args.retries; attempt += 1) {
      const attemptRecord = { role: candidate.role, url: candidate.url,
        attempt: attempt + 1, http_status: null, result: null };
      attempted.push(attemptRecord);
      try {
        const response = await fetch(candidate.url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(args.timeoutMs),
          headers: { 'user-agent': USER_AGENT, accept: 'image/*' },
        });
        attemptRecord.http_status = response.status;
        const finalHost = new URL(response.url).hostname.toLowerCase();
        if (!['product-images.tcgplayer.com', 'tcgplayer-cdn.tcgplayer.com']
          .includes(finalHost)) throw new Error('redirect_host_not_allowed');
        if (!response.ok) throw new Error(`http_${response.status}`);
        const buffer = await readBoundedBuffer(response, args.maxBytes);
        const image = inspectMtgSealedImageBytesV1(buffer,
          response.headers.get('content-type'));
        if (!image.valid_image) {
          attemptRecord.result = 'invalid_image';
          errors.push('invalid_image');
          lastInvalid = {
            retrieved_at: new Date().toISOString(),
            selected_role: candidate.role,
            selected_source_url: candidate.url,
            final_url: response.url,
            http_status: response.status,
            image,
          };
          break;
        }
        attemptRecord.result = image.placeholder_suspected ? 'placeholder' : 'valid_image';
        return {
          status: 'image_retrieved',
          retrieved_at: new Date().toISOString(),
          attempted_urls: attempted,
          selected_role: candidate.role,
          selected_source_url: candidate.url,
          final_url: response.url,
          http_status: response.status,
          error_codes: [...new Set(errors)],
          image,
        };
      } catch (error) {
        const code = safeErrorCode(error);
        attemptRecord.result = code;
        errors.push(code);
        if (code.startsWith('http_4') && code !== 'http_408' && code !== 'http_429') {
          break;
        }
      }
    }
  }
  return {
    status: row.candidate_urls.length === 0 ||
      (errors.length > 0 && errors.every((code) => code === 'http_404'))
      ? 'missing_source_image' : 'invalid_image',
    retrieved_at: new Date().toISOString(),
    attempted_urls: attempted,
    error_codes: [...new Set(errors.length ? errors : ['no_image_candidate'])],
    ...lastInvalid,
  };
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath,
    rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''),
  'utf8');
}

function report(summary) {
  return `# MTG Sealed Image Coverage V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Producer SHA: \`${summary.repository.commit_sha}\`\n` +
    `- Release: \`${summary.release_id}\`\n` +
    `- Release members reconciled: \`${summary.selected_member_count}/${summary.expected_member_count}\`\n` +
    `- Image eligible: \`${summary.image_eligible_member_count}\`\n` +
    `- Explicitly excluded: \`${summary.excluded_member_count}\`\n` +
    `- Unique valid image bytes: \`${summary.unique_image_count}\`\n` +
    `- Source-plan SHA-256: \`${summary.source_plan_fingerprint_sha256}\`\n` +
    `- Coverage SHA-256: \`${summary.coverage_fingerprint_sha256}\`\n\n` +
    `## Classifications\n\n` +
    Object.entries(summary.classification_counts)
      .map(([key, value]) => `- ${key}: \`${value}\``).join('\n') +
    `\n\n## Boundaries\n\n` +
    `This audit performed read-only database queries and external image GETs. ` +
    `It wrote no database rows, Storage objects, image pointers, prices, release ` +
    `pointers, visibility controls, or Vault rows. Proposed Storage paths are ` +
    `artifact-only and carry no mutation authority.\n`;
}

async function writeHashes(outDir, names) {
  const artifacts = {};
  for (const name of names) {
    artifacts[name] = hashMtgSealedImageV1(await fs.readFile(path.join(outDir, name)));
  }
  await writeJson(path.join(outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256', artifacts,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  dotenv.config({ path: args.envFile, quiet: true });
  const repo = repository(args);
  const url = databaseUrl();
  if (!url) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required');
  await fs.mkdir(args.outDir, { recursive: true });
  const client = new Client({ connectionString: url, ssl: pgSslConfig(url),
    connectionTimeoutMillis: 30_000, query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: 'mtg-sealed-image-coverage-v1-read-only' });
  await client.connect();
  let sourceRows;
  let environment;
  try {
    await client.query('begin read only');
    environment = await canonicalEnvironment(client, url);
    if (!environment.valid) {
      throw new Error(`Environment mismatch - fix before proceeding: ${environment.findings.join(',')}`);
    }
    sourceRows = await loadActiveReleaseMembers(client);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  const plan = buildMtgSealedImageSourcePlanV1(sourceRows, {
    expectedMemberCount: args.expectedMemberCount,
  });
  const runPlan = {
    version: MTG_SEALED_IMAGE_COVERAGE_V1,
    created_at: new Date().toISOString(),
    repository: repo,
    canonical_environment: environment,
    release_id: plan.release_id,
    expected_member_count: args.expectedMemberCount,
    selected_member_count: plan.selected_member_count,
    exact_release_member_ids: plan.rows.map((row) => row.release_member_id),
    source_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    concurrency: args.concurrency,
    retries_per_candidate: args.retries,
    timeout_ms: args.timeoutMs,
    max_image_bytes: args.maxBytes,
    allowed_source_hosts: ['product-images.tcgplayer.com',
      'tcgplayer-cdn.tcgplayer.com'],
    boundaries: plan.boundaries,
  };
  await writeJson(path.join(args.outDir, 'run_plan.json'), runPlan);
  await writeJsonl(path.join(args.outDir, 'source_plan.jsonl'), plan.rows);
  if (!plan.valid) {
    await writeJson(path.join(args.outDir, 'summary.json'), {
      status: 'mtg_sealed_image_source_plan_failed', repository: repo,
      findings: plan.findings, boundaries: plan.boundaries,
    });
    throw new Error(`Source plan failed: ${plan.findings.join(',')}`);
  }
  const startedAt = Date.now();
  const probes = await mapLimit(plan.rows, args.concurrency,
    (row) => probeOne(row, args));
  const coverage = finalizeMtgSealedImageCoverageV1(plan, probes);
  const validation = validateMtgSealedImageCoverageV1(coverage);
  const exceptions = coverage.rows.filter((row) =>
    !['exact_image_ready', 'shared_bytes_exact_variant'].includes(row.classification));
  const retryCount = probes.reduce((total, result) => total +
    Math.max(0, (result.attempted_urls?.length ?? 0) -
      new Set((result.attempted_urls ?? []).map((attempt) => attempt.url)).size), 0);
  const requestCount = probes.reduce((total, result) =>
    total + (result.attempted_urls?.length ?? 0), 0);
  const summary = {
    status: validation.valid
      ? 'mtg_sealed_image_coverage_completed_zero_writes'
      : 'mtg_sealed_image_coverage_reconciliation_failed',
    repository: repo,
    release_id: coverage.release_id,
    expected_member_count: coverage.expected_member_count,
    selected_member_count: coverage.selected_member_count,
    image_eligible_member_count: coverage.image_eligible_member_count,
    excluded_member_count: coverage.excluded_member_count,
    unique_image_count: coverage.unique_image_count,
    classification_counts: coverage.classification_counts,
    request_count: requestCount,
    retry_count: retryCount,
    elapsed_ms: Date.now() - startedAt,
    source_plan_fingerprint_sha256: coverage.source_plan_fingerprint_sha256,
    coverage_fingerprint_sha256: coverage.coverage_fingerprint_sha256,
    findings: validation.findings,
    zero_reconciliation_mismatches: validation.valid,
    boundaries: coverage.boundaries,
  };
  await writeJsonl(path.join(args.outDir, 'coverage.jsonl'), coverage.rows);
  await writeJsonl(path.join(args.outDir, 'exceptions.jsonl'), exceptions);
  await writeJson(path.join(args.outDir, 'summary.json'), summary);
  await fs.writeFile(path.join(args.outDir, 'REPORT.md'), report(summary), 'utf8');
  await writeHashes(args.outDir, ['run_plan.json', 'source_plan.jsonl',
    'coverage.jsonl', 'exceptions.jsonl', 'summary.json', 'REPORT.md']);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!validation.valid) process.exitCode = 1;
}

await main();
