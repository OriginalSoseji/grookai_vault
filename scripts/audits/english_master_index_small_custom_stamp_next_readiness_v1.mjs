import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_small_custom_stamp_preserved_crosscheck_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_small_custom_stamp_next_readiness_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_small_custom_stamp_next_readiness_v1.md',
);

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function sourceAuthority(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function exactFinishEvidence(row) {
  return (row.evidence ?? []).filter((evidence) => evidence.finish_key);
}

function packageEvidence(row) {
  return exactFinishEvidence(row).filter((evidence) => evidence.package_ready);
}

function classify(row) {
  const packageItems = packageEvidence(row);
  const exactItems = exactFinishEvidence(row);
  const authorities = unique(exactItems.flatMap((item) => item.source_urls ?? []).map(sourceAuthority));
  const finishKeys = unique(exactItems.map((item) => item.finish_key));

  if (packageItems.length > 0 && authorities.length >= 2 && finishKeys.length === 1) {
    return {
      readiness_status: 'refresh_existing_guarded_package_candidate',
      recommended_next_action: 'Refresh the prior rollback-only guarded package against live DB state before any approval packet. Do not reuse stale proof blindly.',
      source_authority_count: authorities.length,
      finish_keys: finishKeys,
      source_authorities: authorities,
    };
  }

  if (exactItems.length > 0) {
    return {
      readiness_status: 'exact_finish_seen_but_still_blocked',
      recommended_next_action: 'Do not prepare a write package yet. Resolve missing second source, conflicting stamp taxonomy, or stale governance first.',
      source_authority_count: authorities.length,
      finish_keys: finishKeys,
      source_authorities: authorities,
    };
  }

  return {
    readiness_status: 'fresh_exact_source_required',
    recommended_next_action: 'Run fresh source acquisition for exact set + number + card + stamp/variant + finish.',
    source_authority_count: 0,
    finish_keys: [],
    source_authorities: [],
  };
}

function buildMarkdown(report) {
  return `# Small Custom Stamp Next Readiness V1

Audit-only next-readiness split for the current small custom stamp queue.

This report does not generate SQL. It identifies which rows are worth refreshing into a new guarded package and which rows still need evidence.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['refresh_existing_guarded_package_candidate', report.summary.by_readiness_status.refresh_existing_guarded_package_candidate ?? 0],
    ['exact_finish_seen_but_still_blocked', report.summary.by_readiness_status.exact_finish_seen_but_still_blocked ?? 0],
    ['fresh_exact_source_required', report.summary.by_readiness_status.fresh_exact_source_required ?? 0],
    ['write_ready_now', report.summary.write_ready_now],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Refresh Candidates

${markdownTable(
    ['set', 'number', 'card', 'stamp', 'finish', 'source authorities', 'next action'],
    report.rows
      .filter((row) => row.readiness_status === 'refresh_existing_guarded_package_candidate')
      .map((row) => [
        row.set_key,
        row.card_number,
        row.card_name,
        row.stamp_label,
        row.finish_keys.join(', '),
        row.source_authorities.join(', '),
        row.recommended_next_action,
      ]),
  )}

## Still Blocked

${markdownTable(
    ['status', 'set', 'number', 'card', 'stamp', 'finish seen', 'next action'],
    report.rows
      .filter((row) => row.readiness_status !== 'refresh_existing_guarded_package_candidate')
      .map((row) => [
        row.readiness_status,
        row.set_key,
        row.card_number,
        row.card_name,
        row.stamp_label,
        row.finish_keys.join(', ') || 'unresolved',
        row.recommended_next_action,
      ]),
  )}

## Safety

- No DB writes.
- No migrations.
- No SQL generated.
- Existing rollback-only packages are not treated as fresh proof.
- Any future write path must start with a fresh guarded dry-run against live DB state.
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = (input.rows ?? []).map((row) => ({
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    crosscheck_status: row.crosscheck_status,
    evidence_count: row.evidence?.length ?? 0,
    ...classify(row),
    write_ready_now: false,
  }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_small_custom_stamp_next_readiness_v1',
    input_report: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      sql_generated: false,
    },
    summary: {
      target_rows: rows.length,
      write_ready_now: 0,
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      refresh_candidate_count: rows.filter((row) => row.readiness_status === 'refresh_existing_guarded_package_candidate').length,
      blocked_count: rows.filter((row) => row.readiness_status !== 'refresh_existing_guarded_package_candidate').length,
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    summary: report.summary,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      readiness_status: row.readiness_status,
      finish_keys: row.finish_keys,
      source_authorities: row.source_authorities,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
