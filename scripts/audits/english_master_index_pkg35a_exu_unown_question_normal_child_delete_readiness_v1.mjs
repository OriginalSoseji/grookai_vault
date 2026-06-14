import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const LANES_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg35a_exu_unown_question_normal_child_delete_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg35a_exu_unown_question_normal_child_delete_readiness_v1.md');

const PACKAGE_ID = 'PKG-35A-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE-READINESS';

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function readSnapshot(targets) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', rows: [], child_references: [] };
  const parentIds = targets.map((row) => row.card_print_id);
  const childIds = targets.map((row) => row.card_printing_id);
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const parents = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.name,
         cp.variant_key,
         coalesce((select jsonb_agg(jsonb_build_object('id', cpr.id::text, 'finish_key', cpr.finish_key) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id), '[]'::jsonb) as children,
         coalesce((select count(*)::int from public.external_mappings em where em.card_print_id = cp.id), 0) as external_mapping_count,
         coalesce((select count(*)::int from public.card_print_species cps where cps.card_print_id = cp.id), 0) as species_count,
         coalesce((select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id), 0) as trait_count,
         coalesce((select count(*)::int from public.justtcg_variants jv where jv.card_print_id = cp.id), 0) as justtcg_variant_count
       from public.card_prints cp
       where cp.id = any($1::uuid[])`,
      [parentIds],
    );
    const refs = await client.query(
      `select tc.table_schema, tc.table_name, kcu.column_name
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on tc.constraint_name = kcu.constraint_name
        and tc.table_schema = kcu.table_schema
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name
        and ccu.table_schema = tc.table_schema
       where tc.constraint_type = 'FOREIGN KEY'
         and tc.table_schema = 'public'
         and ccu.table_name = 'card_printings'
         and ccu.column_name = 'id'
       order by tc.table_name, kcu.column_name`,
    );
    const childReferences = [];
    for (const ref of refs.rows) {
      const result = await client.query(
        `select count(*)::int as count
         from ${pg.escapeIdentifier(ref.table_schema)}.${pg.escapeIdentifier(ref.table_name)}
         where ${pg.escapeIdentifier(ref.column_name)} = any($1::uuid[])`,
        [childIds],
      );
      const count = Number(result.rows[0]?.count ?? 0);
      if (count > 0) childReferences.push({ ...ref, count });
    }
    await client.query('rollback');
    return { available: true, reason: null, rows: parents.rows, child_references: childReferences };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [], child_references: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function masterFacts() {
  return readJson(PRINTINGS_JSON).then((raw) => {
    const rows = raw.printings ?? raw.rows ?? [];
    return rows.filter((row) => (
      row.status === 'master_verified'
      && row.set_key === 'exu'
      && row.card_number === '%3F'
      && row.card_name === 'Unown'
    ));
  });
}

function classify(row, parent, supportedFacts, childReferences) {
  if (!parent) {
    return { classification: 'blocked_parent_snapshot_missing', action: 'do_not_apply', reason: 'fresh parent snapshot missing' };
  }
  if (parent.set_code !== 'exu' || parent.number !== '?' || parent.name !== 'Unown') {
    return { classification: 'blocked_parent_identity_mismatch', action: 'do_not_apply', reason: 'parent is not exu Unown ?' };
  }
  const children = parent.children ?? [];
  const normalChildren = children.filter((child) => child.finish_key === 'normal');
  const holoChildren = children.filter((child) => child.finish_key === 'holo');
  if (normalChildren.length !== 1 || normalChildren[0]?.id !== row.card_printing_id) {
    return { classification: 'blocked_normal_child_mismatch', action: 'do_not_apply', reason: 'unsupported normal child no longer matches exactly one target' };
  }
  if (holoChildren.length !== 1) {
    return { classification: 'blocked_supported_holo_missing', action: 'do_not_apply', reason: 'supported holo child is not present exactly once' };
  }
  if (childReferences.length > 0) {
    return { classification: 'blocked_child_dependencies_present', action: 'do_not_apply', reason: 'unsupported normal child has FK dependencies' };
  }
  const supportedFinishes = [...new Set(supportedFacts.map((fact) => fact.finish_key))].sort();
  if (supportedFinishes.length !== 1 || supportedFinishes[0] !== 'holo') {
    return { classification: 'blocked_master_index_not_holo_only', action: 'do_not_apply', reason: 'Master Index does not resolve this Unown ? fact to holo-only' };
  }
  return {
    classification: 'exu_unown_question_normal_child_delete_candidate',
    action: 'eligible_for_guarded_dry_run_child_delete',
    reason: 'parent is valid, holo child is supported, normal child is unsupported and dependency-free',
    supported_child_printing_id: holoChildren[0].id,
  };
}

function buildMarkdown(report) {
  return `# PKG-35A EXU Unown Question Normal Child Delete Readiness V1

Read-only readiness report for the single unsupported normal child on \`exu\` Unown \`?\`.

No DB writes were performed. No migrations were created. No parent writes, deletes, merges, quarantine, or global apply are authorized by this report.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['target_rows', report.summary.target_rows],
    ['eligible_rows', report.summary.eligible_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['supported_master_finishes', report.summary.supported_master_finishes.join(', ')],
    ['db_writes_performed', false],
    ['migrations_created', false],
  ])}

## Rows

${markdownTable(
    ['set', 'number', 'name', 'finish', 'classification', 'action', 'reason'],
    report.rows.map((row) => [row.set_code, row.number, row.card_name, row.finish_key, row.classification, row.action, row.reason]),
  )}
`;
}

async function main() {
  const lanes = await readJson(LANES_JSON);
  const targetRows = (lanes.rows ?? []).filter((row) => row.lane === 'invalid_or_unknown_card_number_review' && row.set_code === 'exu');
  const facts = await masterFacts();
  const snapshot = await readSnapshot(targetRows);
  const parentById = new Map((snapshot.rows ?? []).map((row) => [row.card_print_id, row]));
  const rows = targetRows.map((row) => ({
    ...row,
    parent_snapshot: parentById.get(row.card_print_id) ?? null,
    supported_master_facts: facts,
    child_references: snapshot.child_references ?? [],
    ...classify(row, parentById.get(row.card_print_id), facts, snapshot.child_references ?? []),
  }));
  const eligibleRows = rows.filter((row) => row.action === 'eligible_for_guarded_dry_run_child_delete').length;
  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    source_inputs: {
      lanes_json: path.relative(process.cwd(), LANES_JSON),
      printings_json: path.relative(process.cwd(), PRINTINGS_JSON),
    },
    safety: {
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      deletes_authorized: false,
      real_apply_authorized: false,
    },
    snapshot: {
      available: snapshot.available,
      reason: snapshot.reason,
      parent_rows_read: snapshot.rows?.length ?? 0,
      child_reference_rows: snapshot.child_references?.length ?? 0,
    },
    summary: {
      target_rows: rows.length,
      eligible_rows: eligibleRows,
      blocked_rows: rows.length - eligibleRows,
      supported_master_finishes: [...new Set(facts.map((fact) => fact.finish_key))].sort(),
    },
    rows,
  };
  report.fingerprint = sha256(stableJson({
    package_id: report.package_id,
    summary: report.summary,
    rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      classification: row.classification,
      action: row.action,
      supported_child_printing_id: row.supported_child_printing_id ?? null,
    })),
  }));
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    fingerprint: report.fingerprint,
    summary: report.summary,
  }, null, 2));
}

await main();
