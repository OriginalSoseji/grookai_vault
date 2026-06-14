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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg33a_legacy_orphan_species_dependency_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg33a_legacy_orphan_species_dependency_readiness_v1.md');

const PACKAGE_ID = 'PKG-33A-LEGACY-ORPHAN-SPECIES-DEPENDENCY-READINESS';

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

async function readFkReferences(client) {
  const result = await client.query(
    `select
       tc.table_schema,
       tc.table_name,
       kcu.column_name,
       ccu.table_name as foreign_table_name,
       ccu.column_name as foreign_column_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
     join information_schema.constraint_column_usage ccu
       on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
     where tc.constraint_type = 'FOREIGN KEY'
       and tc.table_schema = 'public'
       and (
         (ccu.table_name = 'card_prints' and ccu.column_name = 'id')
         or (ccu.table_name = 'card_printings' and ccu.column_name = 'id')
       )
     order by ccu.table_name, tc.table_name, kcu.column_name`,
  );
  return result.rows;
}

async function countReference(client, ref, ids) {
  if (ids.length === 0) return 0;
  const result = await client.query(
    `select count(*)::int as count
     from ${pg.escapeIdentifier(ref.table_schema)}.${pg.escapeIdentifier(ref.table_name)}
     where ${pg.escapeIdentifier(ref.column_name)} = any($1::uuid[])`,
    [ids],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function countReferencesById(client, ref, idColumn, ids) {
  if (ids.length === 0) return new Map();
  const result = await client.query(
    `select ${pg.escapeIdentifier(ref.column_name)}::text as id, count(*)::int as count
     from ${pg.escapeIdentifier(ref.table_schema)}.${pg.escapeIdentifier(ref.table_name)}
     where ${pg.escapeIdentifier(ref.column_name)} = any($1::uuid[])
     group by ${pg.escapeIdentifier(ref.column_name)}`,
    [ids],
  );
  return new Map(result.rows.map((row) => [`${idColumn}:${row.id}`, Number(row.count ?? 0)]));
}

async function readSnapshot(rows) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', rows: [], fk_references: [] };
  const parentIds = [...new Set(rows.map((row) => row.card_print_id))];
  const childIds = [...new Set(rows.map((row) => row.card_printing_id))];
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const parentResult = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.printed_identity_modifier,
         cp.variant_key,
         coalesce((select jsonb_agg(jsonb_build_object('id', cpr.id::text, 'finish_key', cpr.finish_key) order by cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id), '[]'::jsonb) as children,
         coalesce((select jsonb_agg(jsonb_build_object(
             'id', cps.id::text,
             'species_id', cps.species_id::text,
             'role', cps.role,
             'counts_for_completion', cps.counts_for_completion,
             'source', cps.source,
             'confidence', cps.confidence::text,
             'active', cps.active,
             'evidence', cps.evidence
           ) order by cps.id)
           from public.card_print_species cps
           where cps.card_print_id = cp.id), '[]'::jsonb) as species_rows
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.number_plain, cp.number, cp.name`,
      [parentIds],
    );
    const fkReferences = await readFkReferences(client);
    const parentReferences = [];
    const childReferences = [];
    const referenceCountById = new Map();
    for (const ref of fkReferences) {
      if (ref.foreign_table_name === 'card_prints') {
        const allowedIntentionalDeleteRef = ['card_printings', 'card_print_species'].includes(ref.table_name);
        const count = await countReference(client, ref, parentIds);
        parentReferences.push({ ...ref, count, allowed_intentional_delete_ref: allowedIntentionalDeleteRef });
        if (!allowedIntentionalDeleteRef) {
          const counts = await countReferencesById(client, ref, 'parent', parentIds);
          for (const [key, value] of counts) {
            referenceCountById.set(key, (referenceCountById.get(key) ?? 0) + value);
          }
        }
      } else if (ref.foreign_table_name === 'card_printings') {
        const count = await countReference(client, ref, childIds);
        childReferences.push({ ...ref, count, allowed_intentional_delete_ref: false });
        const counts = await countReferencesById(client, ref, 'child', childIds);
        for (const [key, value] of counts) {
          referenceCountById.set(key, (referenceCountById.get(key) ?? 0) + value);
        }
      }
    }
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      rows: parentResult.rows,
      fk_references: fkReferences,
      parent_references: parentReferences,
      child_references: childReferences,
      reference_count_by_id: Object.fromEntries([...referenceCountById.entries()].sort()),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [], fk_references: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function classify(row, parent, blockingParentReferenceCount, blockingChildReferenceCount) {
  if (!parent) {
    return {
      classification: 'blocked_parent_snapshot_missing',
      action: 'do_not_apply',
      reason: 'legacy_orphan parent row was not found in fresh read-only snapshot',
    };
  }
  const children = parent.children ?? [];
  const speciesRows = parent.species_rows ?? [];
  if (parent.set_code !== 'legacy_orphan') {
    return {
      classification: 'blocked_parent_set_code_changed',
      action: 'do_not_apply',
      reason: 'fresh parent snapshot is no longer in legacy_orphan',
    };
  }
  if (children.length !== 1 || children[0]?.id !== row.card_printing_id || children[0]?.finish_key !== 'normal') {
    return {
      classification: 'blocked_child_snapshot_mismatch',
      action: 'do_not_apply',
      reason: 'fresh parent snapshot does not have exactly one matching normal child printing',
    };
  }
  if (speciesRows.length !== 1) {
    return {
      classification: 'blocked_species_row_count_mismatch',
      action: 'do_not_apply',
      reason: 'parent does not have exactly one species mapping',
    };
  }
  const species = speciesRows[0];
  if (
    species.source !== 'grookai_dex_name_rule_v1'
    || species.role !== 'primary'
    || species.active !== true
    || species.counts_for_completion !== true
  ) {
    return {
      classification: 'blocked_species_not_derived_name_rule',
      action: 'do_not_apply',
      reason: 'species mapping is not the expected derived Grookai Dex name-rule mapping',
    };
  }
  if (blockingParentReferenceCount !== 0 || blockingChildReferenceCount !== 0) {
    return {
      classification: 'blocked_external_dependencies_present',
      action: 'do_not_apply',
      reason: 'parent or child has references outside the intentional child/species cleanup scope',
    };
  }
  return {
    classification: 'legacy_orphan_species_child_parent_delete_candidate',
    action: 'eligible_for_guarded_dry_run_species_child_parent_delete',
    reason: 'legacy_orphan parent has one normal child, one derived name-rule species mapping, and no other FK dependencies',
    species_mapping_id: species.id,
  };
}

function buildMarkdown(report) {
  const eligibleRows = report.rows.filter((row) => row.action === 'eligible_for_guarded_dry_run_species_child_parent_delete');
  const blockedRows = report.rows.filter((row) => row.action !== 'eligible_for_guarded_dry_run_species_child_parent_delete');
  const blockingParentRefs = report.dependency_snapshot.parent_references.filter((row) => !row.allowed_intentional_delete_ref && row.count > 0);
  const blockingChildRefs = report.dependency_snapshot.child_references.filter((row) => row.count > 0);
  return `# PKG-33A Legacy Orphan Species Dependency Readiness V1

Read-only readiness report for the remaining \`legacy_orphan\` rows.

No DB writes were performed. No migrations were created. No deletes, merges, quarantine, or global apply are authorized by this report.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['target_rows', report.summary.target_rows],
    ['eligible_rows', report.summary.eligible_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['blocking_parent_fk_refs', blockingParentRefs.reduce((sum, row) => sum + row.count, 0)],
    ['blocking_child_fk_refs', blockingChildRefs.reduce((sum, row) => sum + row.count, 0)],
    ['db_writes_performed', false],
    ['migrations_created', false],
  ])}

## Classification Counts

${markdownTable(['classification', 'rows'], Object.entries(report.summary.by_classification))}

## Governance Rule

Legacy orphan rows are eligible only when the parent has exactly one normal child, exactly one derived \`grookai_dex_name_rule_v1\` species row, and zero FK references outside \`card_printings\` and \`card_print_species\`.

## Eligible Rows

${markdownTable(
    ['number', 'name', 'parent', 'child', 'species_mapping'],
    eligibleRows.map((row) => [
      row.number,
      row.card_name,
      row.card_print_id,
      row.card_printing_id,
      row.species_mapping_id,
    ]),
  )}

## Blocked Rows

${markdownTable(
    ['number', 'name', 'classification', 'reason'],
    blockedRows.map((row) => [row.number, row.card_name, row.classification, row.reason]),
  )}

## Blocking Parent References

${markdownTable(
    ['table', 'column', 'count'],
    blockingParentRefs.map((row) => [`${row.table_schema}.${row.table_name}`, row.column_name, row.count]),
  )}

## Blocking Child References

${markdownTable(
    ['table', 'column', 'count'],
    blockingChildRefs.map((row) => [`${row.table_schema}.${row.table_name}`, row.column_name, row.count]),
  )}
`;
}

async function main() {
  const lanes = await readJson(LANES_JSON);
  const targetRows = (lanes.rows ?? []).filter((row) => row.lane === 'set_unmapped' && row.set_code === 'legacy_orphan');
  const snapshot = await readSnapshot(targetRows);
  const parentById = new Map((snapshot.rows ?? []).map((row) => [row.card_print_id, row]));
  const rows = targetRows.map((row) => {
    const parent = parentById.get(row.card_print_id);
    const blockingParentReferenceCount = Number(snapshot.reference_count_by_id?.[`parent:${row.card_print_id}`] ?? 0);
    const blockingChildReferenceCount = Number(snapshot.reference_count_by_id?.[`child:${row.card_printing_id}`] ?? 0);
    return {
      ...row,
      parent_snapshot: parent ?? null,
      blocking_parent_reference_count: blockingParentReferenceCount,
      blocking_child_reference_count: blockingChildReferenceCount,
      ...classify(row, parent, blockingParentReferenceCount, blockingChildReferenceCount),
    };
  });
  const eligibleRows = rows.filter((row) => row.action === 'eligible_for_guarded_dry_run_species_child_parent_delete').length;
  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    source_inputs: {
      lanes_json: path.relative(process.cwd(), LANES_JSON),
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
      fk_reference_rows_read: snapshot.fk_references?.length ?? 0,
    },
    dependency_snapshot: {
      parent_references: snapshot.parent_references ?? [],
      child_references: snapshot.child_references ?? [],
      reference_count_by_id: snapshot.reference_count_by_id ?? {},
    },
    summary: {
      target_rows: rows.length,
      eligible_rows: eligibleRows,
      blocked_rows: rows.length - eligibleRows,
      by_classification: countBy(rows, (row) => row.classification),
      by_action: countBy(rows, (row) => row.action),
      by_finish: countBy(rows, (row) => row.finish_key),
    },
    rows,
  };
  report.fingerprint = sha256(stableJson({
    package_id: report.package_id,
    summary: report.summary,
    rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      species_mapping_id: row.species_mapping_id ?? null,
      classification: row.classification,
      action: row.action,
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
