import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const LIVE_CAPTURE_JSON = path.join(AUDIT_DIR, 'live_finish_snapshot_capture_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'nested_provenance_finish_extraction_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'nested_provenance_finish_extraction_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04M-NESTED-PROVENANCE-FINISH-EXTRACTION';

const FINISH_PATTERNS = [
  { finish_key: 'reverse', pattern: /\breverse\s+holo(?:foil)?\b|\breverse\s+foil(?:s)?\b/i },
  { finish_key: 'holo', pattern: /\bholo(?:foil)?\b/i },
  { finish_key: 'cosmos', pattern: /\bcosmos\s+holo\b/i },
  { finish_key: 'normal', pattern: /\bnon[-\s]?holo\b|\bnormal\b/i },
];

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
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function flattenEvidenceContext(value, out = []) {
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const item of value) flattenEvidenceContext(item, out);
    return out;
  }
  if (typeof value === 'object') {
    if (value.source_url || value.evidence_label || value.pkg15k_source_url || value.pkg15k_source_title) {
      out.push({
        source_key: value.source_key ?? value.pkg15k_source_key ?? 'preserved_nested_provenance',
        source_kind: value.source_kind ?? 'preserved_evidence',
        source_url: value.source_url ?? value.pkg15k_source_url ?? null,
        evidence_label: value.evidence_label ?? value.pkg15k_source_title ?? null,
        evidence_type: value.evidence_type ?? 'finish_presence',
      });
    }
    for (const item of Object.values(value)) flattenEvidenceContext(item, out);
  }
  return out;
}

function finishFromLabel(label) {
  if (!label) return null;
  for (const { finish_key, pattern } of FINISH_PATTERNS) {
    if (pattern.test(label)) return finish_key;
  }
  return null;
}

function classifyParent(parentRow, liveRow) {
  const payload = parentRow.external_ids?.verified_master_index_v1 ?? {};
  const contextRows = flattenEvidenceContext(payload.evidence_context);
  const sourceRows = [
    ...contextRows,
    ...(payload.evidence_urls ?? []).map((source_url, index) => ({
      source_key: (payload.preserved_evidence_sources ?? [])[index] ?? 'preserved_top_level_url',
      source_kind: 'preserved_evidence',
      source_url,
      evidence_label: (payload.evidence_labels ?? [])[index] ?? null,
      evidence_type: 'identity_or_finish_context',
    })),
  ].filter((row) => row.source_url || row.evidence_label);

  const finishEvidenceRows = sourceRows
    .map((row) => ({
      ...row,
      finish_key: finishFromLabel(row.evidence_label),
    }))
    .filter((row) => row.finish_key);

  const byFinish = new Map();
  for (const row of finishEvidenceRows) {
    const rows = byFinish.get(row.finish_key) ?? [];
    rows.push(row);
    byFinish.set(row.finish_key, rows);
  }

  const candidates = [...byFinish.entries()]
    .map(([finish_key, rows]) => ({
      finish_key,
      evidence_rows: rows,
      distinct_source_keys: [...new Set(rows.map((row) => row.source_key).filter(Boolean))],
      distinct_source_urls: [...new Set(rows.map((row) => row.source_url).filter(Boolean))],
    }))
    .filter((candidate) => candidate.distinct_source_keys.length >= 2 || candidate.distinct_source_urls.length >= 2);

  const approved = candidates.length === 1 ? candidates[0] : null;
  const status = approved
    ? 'approved_for_guarded_dry_run'
    : candidates.length > 1
      ? 'blocked_conflicting_finish_candidates'
      : 'blocked_no_two_source_exact_finish_in_nested_provenance';

  return {
    parent_id: parentRow.id,
    set_code: parentRow.set_code,
    number: parentRow.number,
    name: parentRow.name,
    variant_key: parentRow.variant_key,
    printed_identity_modifier: parentRow.printed_identity_modifier,
    gv_id: parentRow.gv_id,
    family: liveRow.family,
    live_capture_status: liveRow.capture_status,
    extraction_status: status,
    extracted_finish_key: approved?.finish_key ?? null,
    evidence_rows: approved?.evidence_rows ?? finishEvidenceRows,
    evidence_source_count: approved?.distinct_source_keys.length ?? 0,
    evidence_url_count: approved?.distinct_source_urls.length ?? 0,
    blocked_reason: approved
      ? null
      : candidates.length > 1
        ? 'More than one exact finish candidate appeared in preserved nested provenance.'
        : 'Nested provenance did not contain two independent exact finish labels.',
  };
}

function renderMarkdown(report) {
  return [
    '# Nested Provenance Finish Extraction V1',
    '',
    'Read-only extraction of exact finish evidence from nested `external_ids.verified_master_index_v1.evidence_context` payloads. This does not write to the database.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['rows_scanned', report.summary.rows_scanned],
        ['approved_for_guarded_dry_run', report.summary.approved_for_guarded_dry_run],
        ['by_status', JSON.stringify(report.summary.by_status)],
        ['approved_by_finish', JSON.stringify(report.summary.approved_by_finish)],
      ],
    ),
    '',
    '## Approved Rows',
    '',
    markdownTable(
      ['set', 'number', 'name', 'variant/modifier', 'finish', 'sources'],
      report.approved_rows.map((row) => [
        row.set_code,
        row.number,
        row.name,
        row.variant_key || row.printed_identity_modifier || row.family,
        row.extracted_finish_key,
        row.evidence_rows.map((source) => source.source_key).join(', '),
      ]),
    ),
    '',
    '## Blocked Rows',
    '',
    markdownTable(
      ['set', 'number', 'name', 'variant/modifier', 'status', 'reason'],
      report.blocked_rows.map((row) => [
        row.set_code,
        row.number,
        row.name,
        row.variant_key || row.printed_identity_modifier || row.family,
        row.extraction_status,
        row.blocked_reason,
      ]),
    ),
    '',
  ].join('\n');
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only extraction.');
  const liveCapture = await readJson(LIVE_CAPTURE_JSON);
  const liveRows = liveCapture.rows ?? [];

  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try {
    const result = await client.query(
      `select id::text, set_code, number, name, variant_key, printed_identity_modifier, gv_id, external_ids
       from public.card_prints
       where id = any($1::uuid[])
       order by set_code, number, name, id`,
      [liveRows.map((row) => row.parent_id)],
    );
    const liveByParentId = new Map(liveRows.map((row) => [row.parent_id, row]));
    const rows = result.rows.map((parentRow) => classifyParent(parentRow, liveByParentId.get(parentRow.id) ?? {}));
    const approvedRows = rows.filter((row) => row.extraction_status === 'approved_for_guarded_dry_run');
    const blockedRows = rows.filter((row) => row.extraction_status !== 'approved_for_guarded_dry_run');
    const fingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      live_capture_fingerprint_sha256: liveCapture.fingerprint_sha256,
      approved_rows: approvedRows.map((row) => ({
        parent_id: row.parent_id,
        finish_key: row.extracted_finish_key,
        evidence_urls: row.evidence_rows.map((source) => source.source_url),
        evidence_labels: row.evidence_rows.map((source) => source.evidence_label),
      })),
      blocked_rows: blockedRows.map((row) => ({ parent_id: row.parent_id, status: row.extraction_status })),
    }));
    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'read_only_nested_provenance_extraction',
      fingerprint_sha256: fingerprint,
      input_artifacts: {
        live_finish_snapshot_capture: rel(LIVE_CAPTURE_JSON),
      },
      summary: {
        rows_scanned: rows.length,
        approved_for_guarded_dry_run: approvedRows.length,
        by_status: countBy(rows, (row) => row.extraction_status),
        approved_by_finish: countBy(approvedRows, (row) => row.extracted_finish_key),
        approved_by_family: countBy(approvedRows, (row) => row.family),
      },
      approved_rows: approvedRows,
      blocked_rows: blockedRows,
      recommended_next_package: approvedRows.length
        ? {
            package_id: 'MISSING-PROMO-04N-NESTED-PROVENANCE-FINISH-CHILD-INSERT-DRY-RUN',
            mode: 'guarded_rollback_dry_run',
            scope: `${approvedRows.length} child-only card_printing candidates from nested provenance finish evidence.`,
            real_apply_authorized: false,
          }
        : {
            package_id: null,
            mode: 'continue_source_acquisition',
            scope: 'No nested provenance rows are ready for child insert.',
            real_apply_authorized: false,
          },
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_performed: false,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, `${renderMarkdown(report)}\n`);

    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      fingerprint_sha256: fingerprint,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      summary: report.summary,
      recommended_next_package: report.recommended_next_package,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
