import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const INPUT_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'second_source_needed_packet_v1', 'second_source_found_manual_candidates_v1.json');
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_second_source_manual_candidate_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_second_source_manual_candidate_readiness_v1.md');

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function targetGvId(row, base) {
  const setToken = String(base.printed_set_abbrev || base.set_code || row.set_key).toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  const number = String(base.number_plain || base.number || row.card_number).replace(/^0+(?=\d)/, '');
  const variant = String(row.variant_key).toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  return `GV-PK-${setToken}-${number}-${variant}`;
}

function finishSuffix(finishKey) {
  if (finishKey === 'normal') return 'STD';
  if (finishKey === 'reverse') return 'RH';
  if (finishKey === 'cosmos') return 'COSMOS';
  if (finishKey === 'holo') return 'HOLO';
  return String(finishKey).toUpperCase().replace(/[^A-Z0-9]+/g, '-');
}

function classify({ row, base, existing, childFinishExists, finishActive }) {
  const blockers = [];
  if (row.status === 'context_only_not_target_variant') blockers.push('context_only_not_target_variant');
  if (!row.candidate_finish_key) blockers.push('missing_candidate_finish_key');
  if (!finishActive) blockers.push('inactive_candidate_finish_key');
  if (!base) blockers.push('missing_base_parent');

  if (blockers.length) return { route: 'blocked', blockers };
  if (existing && childFinishExists) return { route: 'already_satisfied_existing_parent_child_present', blockers: [] };
  if (existing && !childFinishExists) return { route: 'existing_parent_child_missing_candidate', blockers: [] };
  return { route: 'parent_identity_child_insert_candidate', blockers: [] };
}

async function buildRows(client, inputRows) {
  const result = await client.query(
    `with candidates as (
       select *
       from jsonb_to_recordset($1::jsonb) as candidate(
         set_key text,
         set_name text,
         card_number text,
         card_name text,
         variant_key text,
         stamp_label text,
         candidate_finish_key text,
         status text,
         source_urls jsonb,
         evidence_labels jsonb,
         why_not_write_ready text
       )
     )
     select
       candidate.*,
       base.id as base_parent_id,
       base.set_id as base_set_id,
       base.set_code as base_set_code,
       base.number as base_number,
       base.number_plain as base_number_plain,
       base.name as base_name,
       base.printed_set_abbrev,
       existing.id as existing_variant_parent_id,
       existing.gv_id as existing_variant_gv_id,
       exists (
         select 1 from public.finish_keys fk
         where fk.key = candidate.candidate_finish_key and fk.is_active = true
       ) as finish_active,
       exists (
         select 1 from public.card_printings cpr
         where cpr.card_print_id = existing.id and cpr.finish_key = candidate.candidate_finish_key
       ) as existing_child_finish_exists,
       exists (
         select 1 from public.card_print_identity cpi
         where cpi.card_print_id = existing.id and cpi.is_active = true
       ) as existing_active_identity_exists
     from candidates candidate
     left join public.card_prints base
       on base.set_code = candidate.set_key
      and coalesce(base.number_plain, base.number) = regexp_replace(candidate.card_number, '^0+(?=\\d)', '')
      and lower(base.name) = lower(candidate.card_name)
      and coalesce(base.variant_key, '') = ''
     left join public.card_prints existing
       on existing.set_id = base.set_id
      and coalesce(existing.number_plain, existing.number) = coalesce(base.number_plain, base.number)
      and lower(existing.name) = lower(base.name)
      and (
        coalesce(existing.variant_key, '') = candidate.variant_key
        or coalesce(existing.printed_identity_modifier, '') = candidate.variant_key
      )
     order by candidate.set_key, candidate.card_number, candidate.card_name, candidate.variant_key`,
    [JSON.stringify(inputRows)],
  );

  return result.rows.map((dbRow) => {
    const input = inputRows.find((row) => row.set_key === dbRow.set_key && row.card_number === dbRow.card_number && row.card_name === dbRow.card_name && row.variant_key === dbRow.variant_key);
    const base = dbRow.base_parent_id ? {
      id: dbRow.base_parent_id,
      set_code: dbRow.base_set_code,
      number: dbRow.base_number,
      number_plain: dbRow.base_number_plain,
      printed_set_abbrev: dbRow.printed_set_abbrev,
    } : null;
    const existing = dbRow.existing_variant_parent_id ? {
      id: dbRow.existing_variant_parent_id,
      gv_id: dbRow.existing_variant_gv_id,
    } : null;
    const classification = classify({
      row: input,
      base,
      existing,
      childFinishExists: dbRow.existing_child_finish_exists,
      finishActive: dbRow.finish_active,
    });
    const gvId = existing?.gv_id ?? (base ? targetGvId(input, base) : null);
    return {
      set_key: dbRow.set_key,
      set_name: dbRow.set_name,
      card_number: dbRow.card_number,
      card_name: dbRow.card_name,
      variant_key: dbRow.variant_key,
      stamp_label: dbRow.stamp_label,
      candidate_finish_key: dbRow.candidate_finish_key,
      input_status: dbRow.status,
      readiness_route: classification.route,
      blockers: classification.blockers,
      base_parent_id: dbRow.base_parent_id,
      existing_variant_parent_id: dbRow.existing_variant_parent_id,
      existing_active_identity_exists: dbRow.existing_active_identity_exists,
      existing_child_finish_exists: dbRow.existing_child_finish_exists,
      target_gv_id: gvId,
      target_printing_gv_id: gvId ? `${gvId}-${finishSuffix(dbRow.candidate_finish_key)}` : null,
      source_urls: input.source_urls,
      evidence_labels: input.evidence_labels,
      why_not_write_ready: input.why_not_write_ready,
    };
  });
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function renderMarkdown(report) {
  return `# Second Source Manual Candidate Readiness V1

Generated: ${report.generated_at}

Audit-only readiness split for manual second-source stamped/special evidence candidates.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Summary

${markdownTable(['metric', 'value'], [
    ['rows', report.summary.rows],
    ['existing_parent_child_missing_candidates', report.summary.existing_parent_child_missing_candidates],
    ['parent_identity_child_insert_candidates', report.summary.parent_identity_child_insert_candidates],
    ['already_satisfied_rows', report.summary.already_satisfied_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['write_ready_now', report.summary.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Rows

${markdownTable(['set', 'number', 'card', 'variant', 'finish', 'route', 'blockers'], report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.variant_key,
    row.candidate_finish_key,
    row.readiness_route,
    row.blockers.join(', '),
  ]))}

## Boundary

This report does not authorize writes. Existing-parent candidates need a separate rollback-only child/identity reconciliation artifact. Parent insert candidates need a separate rollback-only parent/identity/child insert artifact.
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string');
  const input = await readJson(INPUT_JSON);
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const rows = await buildRows(client, input.rows ?? []);
    const report = {
      package_id: 'SECOND-SOURCE-MANUAL-CANDIDATE-READINESS-V1',
      generated_at: new Date().toISOString(),
      input_artifact: rel(INPUT_JSON),
      safety: {
        db_writes_performed: false,
        migrations_created: false,
        apply_performed: false,
        cleanup_performed: false,
        write_ready_now: 0,
      },
      summary: {
        rows: rows.length,
        existing_parent_child_missing_candidates: rows.filter((row) => row.readiness_route === 'existing_parent_child_missing_candidate').length,
        parent_identity_child_insert_candidates: rows.filter((row) => row.readiness_route === 'parent_identity_child_insert_candidate').length,
        already_satisfied_rows: rows.filter((row) => row.readiness_route === 'already_satisfied_existing_parent_child_present').length,
        blocked_rows: rows.filter((row) => row.readiness_route === 'blocked').length,
        write_ready_now: 0,
        by_route: countBy(rows, (row) => row.readiness_route),
      },
      rows,
    };
    report.fingerprint_sha256 = sha256(stableJson({ rows }));
    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      fingerprint_sha256: report.fingerprint_sha256,
      summary: report.summary,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
