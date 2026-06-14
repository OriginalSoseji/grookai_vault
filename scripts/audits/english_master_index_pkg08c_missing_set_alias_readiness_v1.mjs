import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08c_missing_set_alias_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08c_missing_set_alias_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08c_missing_set_alias_readiness_checkpoint_v1.md');

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function tcgdexExternalId(row) {
  for (const url of row.evidence_urls ?? []) {
    const match = String(url).match(/api\.tcgdex\.net\/v2\/en\/cards\/([^/?#]+)/i);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

async function loadLiveState(rows) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable' };
  const aliases = [...new Set(rows.flatMap((row) => row.set_aliases_checked ?? [row.set_key]).map(normalizeText))];
  const externalIds = [...new Set(rows.map(tcgdexExternalId).filter(Boolean))];
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const sets = await client.query(
      `select id::text, code, name
       from public.sets
       where game = 'pokemon'
         and lower(coalesce(code, '')) = any($1::text[])
       order by code, id`,
      [aliases],
    );
    const mappings = await client.query(
      `select em.id::text, em.source, em.external_id, em.card_print_id::text,
              cp.set_code, cp.number, cp.name
       from public.external_mappings em
       left join public.card_prints cp on cp.id = em.card_print_id
       where em.source = 'tcgdex'
         and em.external_id = any($1::text[])
       order by em.external_id, em.id`,
      [externalIds],
    );
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      sets: sets.rows,
      mappings: mappings.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, sets: [], mappings: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  const setRows = Object.entries(report.summary.by_set).map(([set, count]) => [set, count]);
  const finishRows = Object.entries(report.summary.by_finish).map(([finish, count]) => [finish, count]);
  const stopRows = report.stop_findings.map((finding) => [finding]);
  return `# PKG-08C Missing Set/Alias Readiness V1

Read-only readiness for Master Index rows whose set code is not present in live Grookai card_prints.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Scope

- source_rows: ${report.summary.source_rows}
- expected_set_inserts: ${report.summary.expected_set_inserts}
- expected_parent_inserts: ${report.summary.expected_parent_inserts}
- expected_child_inserts: ${report.summary.expected_child_inserts}
- expected_external_mapping_inserts: ${report.summary.expected_external_mapping_inserts}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`

${markdownTable(['set_key', 'rows'], setRows)}

${markdownTable(['finish_key', 'rows'], finishRows)}

## Live Collision Checks

- matching_live_sets: ${report.live_checks.matching_live_sets}
- tcgdex_mapping_collisions: ${report.live_checks.tcgdex_mapping_collisions}

## Stop Findings

${markdownTable(['finding'], stopRows)}

## Next Step

${report.next_step}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08C Missing Set/Alias Readiness Checkpoint V1](20260610_pkg08c_missing_set_alias_readiness_checkpoint_v1.md) | Read-only readiness for missing set/alias lane. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08c_missing_set_alias_readiness_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08c_missing_set_alias_readiness_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const rows = (source.rows ?? []).filter((row) => row.lane === 'missing_set_or_set_alias');
const live = await loadLiveState(rows);
const externalIds = rows.map((row) => ({ ...row, tcgdex_external_id: tcgdexExternalId(row) }));
const setKeys = [...new Set(rows.map((row) => row.set_key))].sort();
const fingerprint = sha256(stableJson(externalIds.map((row) => ({
  set_key: row.set_key,
  set_name: row.set_name,
  card_number: row.card_number,
  card_name: row.card_name,
  finish_key: row.finish_key,
  tcgdex_external_id: row.tcgdex_external_id,
}))));

const stopFindings = [
  ...(live.available ? [] : [`live_read_failed:${live.reason}`]),
  ...(setKeys.length === 0 ? ['no_missing_set_rows'] : []),
  ...(setKeys.length > 1 ? ['multiple_set_keys_in_scope'] : []),
  ...((live.sets ?? []).length > 0 ? ['live_set_alias_already_exists'] : []),
  ...((live.mappings ?? []).length > 0 ? ['tcgdex_external_mapping_collision'] : []),
  ...(externalIds.some((row) => !row.tcgdex_external_id) ? ['tcgdex_external_id_missing'] : []),
];

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08c_missing_set_alias_readiness_v1',
  package_id: 'PKG-08C-MISSING-SET-ALIAS-READINESS',
  package_fingerprint_sha256: fingerprint,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  real_apply_authorized: false,
  summary: {
    source_rows: rows.length,
    expected_set_inserts: stopFindings.includes('live_set_alias_already_exists') ? 0 : setKeys.length,
    expected_parent_inserts: rows.length,
    expected_child_inserts: rows.length,
    expected_external_mapping_inserts: rows.length,
    by_set: countBy(rows, (row) => row.set_key),
    by_finish: countBy(rows, (row) => row.finish_key),
  },
  live_checks: {
    available: live.available,
    reason: live.reason,
    matching_live_sets: live.sets?.length ?? 0,
    matching_live_set_rows: live.sets ?? [],
    tcgdex_mapping_collisions: live.mappings?.length ?? 0,
    tcgdex_mapping_collision_rows: live.mappings ?? [],
  },
  rows: externalIds,
  stop_findings: stopFindings,
  next_step: stopFindings.length === 0
    ? 'Eligible for a guarded rollback-only dry-run artifact. No real apply without explicit approval.'
    : 'Resolve stop findings before any dry-run or apply package.',
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  summary: report.summary,
  live_checks: {
    matching_live_sets: report.live_checks.matching_live_sets,
    tcgdex_mapping_collisions: report.live_checks.tcgdex_mapping_collisions,
  },
  stop_findings: report.stop_findings,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));

if (stopFindings.length !== 0) process.exitCode = 1;
