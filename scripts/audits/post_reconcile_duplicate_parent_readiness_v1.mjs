import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const INPUT_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'post_reconcile_integrity_v1',
  'post_reconcile_integrity_audit_v1.json',
);
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'post_reconcile_integrity_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'post_reconcile_duplicate_parent_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'post_reconcile_duplicate_parent_readiness_v1.md');

const ALLOWED_PARENT_DEPENDENCIES = new Set([
  'public.card_print_identity.card_print_id',
  'public.card_print_species.card_print_id',
  'public.card_print_traits.card_print_id',
  'public.card_printings.card_print_id',
  'public.external_mappings.card_print_id',
]);

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

function qident(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function normalizeNumber(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^0*(\d+)([a-z]*)$/i);
  if (!match) return text.toLowerCase();
  return `${Number.parseInt(match[1], 10)}${match[2].toLowerCase()}`;
}

function hasLeadingZeroNumber(value) {
  return /^0+\d/.test(String(value ?? '').trim());
}

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

async function getForeignKeyDependencies(client, targetTable) {
  const { rows } = await client.query(
    `
      select
        ns.nspname as schema_name,
        rel.relname as table_name,
        att.attname as column_name
      from pg_constraint con
      join pg_class target on target.oid = con.confrelid
      join pg_namespace target_ns on target_ns.oid = target.relnamespace
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
      join unnest(con.conkey) with ordinality as keys(attnum, ord) on true
      join pg_attribute att on att.attrelid = rel.oid and att.attnum = keys.attnum
      where con.contype = 'f'
        and target_ns.nspname = 'public'
        and target.relname = $1
      order by ns.nspname, rel.relname, att.attname
    `,
    [targetTable],
  );
  return rows;
}

async function collectDependencyCountsById(client, dependencies, ids) {
  const countsById = new Map(ids.map((id) => [id, []]));
  for (const dependency of dependencies) {
    const { rows } = await client.query(
      `
        select ${qident(dependency.column_name)}::text as id, count(*)::int as count
        from ${qident(dependency.schema_name)}.${qident(dependency.table_name)}
        where ${qident(dependency.column_name)} = any($1::uuid[])
        group by ${qident(dependency.column_name)}
      `,
      [ids],
    );
    for (const row of rows) {
      const existing = countsById.get(row.id) ?? [];
      existing.push({
        key: `${dependency.schema_name}.${dependency.table_name}.${dependency.column_name}`,
        count: row.count,
      });
      countsById.set(row.id, existing);
    }
  }
  return countsById;
}

function choosePaddedCanonical(rows) {
  if (rows.length !== 2) return null;
  const padded = rows.filter((row) => hasLeadingZeroNumber(row.number) || hasLeadingZeroNumber(row.number_plain));
  const unpadded = rows.filter((row) => !hasLeadingZeroNumber(row.number) && !hasLeadingZeroNumber(row.number_plain));
  if (padded.length !== 1 || unpadded.length !== 1) return null;
  if (normalizeNumber(padded[0].number) !== normalizeNumber(unpadded[0].number)) return null;
  return { canonical: padded[0], duplicate: unpadded[0] };
}

function summarizeBySet(groups) {
  const bySet = new Map();
  for (const group of groups) {
    const setCode = group.set_code ?? 'unknown';
    const current = bySet.get(setCode) ?? {
      set_code: setCode,
      groups: 0,
      dry_run_candidates: 0,
      blocked_groups: 0,
      duplicate_parent_rows: 0,
      duplicate_child_rows: 0,
    };
    current.groups += 1;
    if (group.readiness_status === 'ready_for_guarded_dry_run') current.dry_run_candidates += 1;
    else current.blocked_groups += 1;
    current.duplicate_parent_rows += group.duplicate_parent_id ? 1 : 0;
    current.duplicate_child_rows += group.duplicate_child_rows.length;
    bySet.set(setCode, current);
  }
  return [...bySet.values()].sort((a, b) => b.groups - a.groups || a.set_code.localeCompare(b.set_code));
}

function buildMarkdown(report) {
  const setLines = report.by_set.slice(0, 30).map((row) =>
    `| ${row.set_code} | ${row.groups} | ${row.dry_run_candidates} | ${row.blocked_groups} | ${row.duplicate_child_rows} |`,
  ).join('\n');
  const readyLines = report.ready_groups.slice(0, 40).map((group) =>
    `| ${group.set_code} | ${group.normalized_key} | ${group.canonical_gv_id} | ${group.duplicate_gv_id} | ${group.duplicate_child_rows.length} |`,
  ).join('\n');
  const blockedLines = report.blocked_groups.slice(0, 40).map((group) =>
    `| ${group.set_code} | ${group.normalized_key} | ${group.blockers.join('; ')} |`,
  ).join('\n');

  return `# Post Reconcile Duplicate Parent Readiness V1

Read-only readiness report for the duplicate-parent failure class exposed by SVP Grey Felt Hat.

## Safety

- db_writes_performed: ${report.safety.db_writes_performed}
- migrations_created: ${report.safety.migrations_created}
- cleanup_performed: ${report.safety.cleanup_performed}
- quarantine_performed: ${report.safety.quarantine_performed}

## Summary

- source_duplicate_groups: ${report.summary.source_duplicate_groups}
- governed_exception_groups: ${report.summary.governed_exception_groups}
- evaluated_groups: ${report.summary.evaluated_groups}
- ready_for_guarded_dry_run: ${report.summary.ready_for_guarded_dry_run}
- blocked_groups: ${report.summary.blocked_groups}
- deterministic_padded_unpadded_groups: ${report.summary.deterministic_padded_unpadded_groups}
- duplicate_parent_rows: ${report.summary.duplicate_parent_rows}
- duplicate_child_rows: ${report.summary.duplicate_child_rows}
- package_fingerprint: \`${report.package_fingerprint_sha256}\`

## Meaning

This report does not authorize apply. It only identifies duplicate parent groups that look like deterministic padded/unpadded identity drift and have no protected dependency references on the duplicate side.

Future cleanup still requires a fresh rollback-only transaction proof, dependency transfer simulation, exact fingerprinted approval, and post-apply verification.

## Set Breakdown

| Set | Groups | Dry-run candidates | Blocked | Duplicate child rows |
| --- | ---: | ---: | ---: | ---: |
${setLines || '| none | 0 | 0 | 0 | 0 |'}

## Ready Groups

| Set | Normalized key | Canonical | Duplicate | Duplicate children |
| --- | --- | --- | --- | ---: |
${readyLines || '| none | - | - | - | 0 |'}

## Blocked Groups

| Set | Normalized key | Blockers |
| --- | --- | --- |
${blockedLines || '| none | - | - |'}
`;
}

async function main() {
  const source = await readJson(INPUT_JSON);
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const parentDependencies = await getForeignKeyDependencies(client, 'card_prints');
    const childDependencies = await getForeignKeyDependencies(client, 'card_printings');
    const parentIds = [
      ...new Set(
        (source.duplicate_parent_identity_groups_actionable ?? source.duplicate_parent_identity_groups ?? [])
          .flatMap((group) => group.rows ?? [])
          .map((row) => row.id)
          .filter(Boolean),
      ),
    ];

    const parents = await client.query(
      `
        select id, gv_id, name, set_code, number, number_plain, printed_identity_modifier, variant_key
        from public.card_prints
        where id = any($1::uuid[])
      `,
      [parentIds],
    );
    const parentById = new Map(parents.rows.map((row) => [row.id, row]));

    const children = await client.query(
      `
        select id, card_print_id, printing_gv_id, finish_key
        from public.card_printings
        where card_print_id = any($1::uuid[])
        order by card_print_id, finish_key, printing_gv_id
      `,
      [parentIds],
    );
    const childrenByParent = new Map();
    const childIds = [];
    for (const child of children.rows) {
      childIds.push(child.id);
      const rows = childrenByParent.get(child.card_print_id) ?? [];
      rows.push(child);
      childrenByParent.set(child.card_print_id, rows);
    }
    const parentDependencyCounts = await collectDependencyCountsById(client, parentDependencies, parentIds);
    const childDependencyCounts = await collectDependencyCountsById(client, childDependencies, childIds);

    const evaluated = [];
    const sourceGroups = source.duplicate_parent_identity_groups_actionable
      ?? source.duplicate_parent_identity_groups
      ?? [];

    for (const sourceGroup of sourceGroups) {
      const rows = (sourceGroup.rows ?? []).map((row) => parentById.get(row.id)).filter(Boolean);
      const pair = choosePaddedCanonical(rows);
      const blockers = [];
      if (!pair) blockers.push('not_a_two_row_padded_unpadded_pair');

      const canonical = pair?.canonical ?? null;
      const duplicate = pair?.duplicate ?? null;
      const duplicateParentDeps = duplicate ? (parentDependencyCounts.get(duplicate.id) ?? []) : [];
      const disallowedParentDeps = duplicateParentDeps.filter((dependency) => !ALLOWED_PARENT_DEPENDENCIES.has(dependency.key));
      if (disallowedParentDeps.length > 0) blockers.push('duplicate_parent_has_protected_dependencies');

      const duplicateChildRows = duplicate ? (childrenByParent.get(duplicate.id) ?? []) : [];
      const duplicateChildDeps = [];
      for (const child of duplicateChildRows) {
        const deps = childDependencyCounts.get(child.id) ?? [];
        const activeDeps = deps.filter((dependency) => dependency.count > 0);
        if (activeDeps.length > 0) {
          duplicateChildDeps.push({
            card_printing_id: child.id,
            printing_gv_id: child.printing_gv_id,
            dependencies: activeDeps,
          });
        }
      }
      if (duplicateChildDeps.length > 0) blockers.push('duplicate_child_has_protected_dependencies');

      const canonicalChildRows = canonical ? (childrenByParent.get(canonical.id) ?? []) : [];
      const canonicalFinishes = new Set(canonicalChildRows.map((row) => row.finish_key));
      const duplicateFinishCollisions = duplicateChildRows.filter((row) => canonicalFinishes.has(row.finish_key));
      const duplicateFinishTransfers = duplicateChildRows.filter((row) => !canonicalFinishes.has(row.finish_key));

      evaluated.push({
        source_key: sourceGroup.key,
        normalized_key: sourceGroup.key,
        set_code: canonical?.set_code ?? duplicate?.set_code ?? rows[0]?.set_code ?? null,
        classification: pair ? 'deterministic_padded_unpadded' : 'blocked_unclear_identity_shape',
        readiness_status: blockers.length === 0 ? 'ready_for_guarded_dry_run' : 'blocked',
        blockers,
        canonical_parent_id: canonical?.id ?? null,
        canonical_gv_id: canonical?.gv_id ?? null,
        canonical_number: canonical?.number ?? null,
        duplicate_parent_id: duplicate?.id ?? null,
        duplicate_gv_id: duplicate?.gv_id ?? null,
        duplicate_number: duplicate?.number ?? null,
        duplicate_parent_dependencies: duplicateParentDeps,
        duplicate_child_rows: duplicateChildRows,
        duplicate_child_dependencies: duplicateChildDeps,
        duplicate_finish_collisions: duplicateFinishCollisions.map((row) => row.finish_key),
        duplicate_finish_transfers: duplicateFinishTransfers.map((row) => row.finish_key),
      });
    }

    const readyGroups = evaluated.filter((group) => group.readiness_status === 'ready_for_guarded_dry_run');
    const blockedGroups = evaluated.filter((group) => group.readiness_status !== 'ready_for_guarded_dry_run');
    const reportCore = {
      generated_at: new Date().toISOString(),
      source_audit: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
      safety: {
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
      },
      summary: {
        source_duplicate_groups: source.summary?.duplicate_parent_identity_groups ?? null,
        governed_exception_groups: source.summary?.duplicate_parent_identity_groups_governed_exceptions ?? 0,
        evaluated_groups: evaluated.length,
        ready_for_guarded_dry_run: readyGroups.length,
        blocked_groups: blockedGroups.length,
        deterministic_padded_unpadded_groups: evaluated.filter((group) => group.classification === 'deterministic_padded_unpadded').length,
        duplicate_parent_rows: evaluated.filter((group) => group.duplicate_parent_id).length,
        duplicate_child_rows: evaluated.reduce((sum, group) => sum + group.duplicate_child_rows.length, 0),
      },
      by_set: summarizeBySet(evaluated),
      ready_groups: readyGroups,
      blocked_groups: blockedGroups,
    };
    const packageFingerprint = sha256(stableJson({
      summary: reportCore.summary,
      ready_groups: readyGroups.map((group) => ({
        canonical_parent_id: group.canonical_parent_id,
        duplicate_parent_id: group.duplicate_parent_id,
        duplicate_child_rows: group.duplicate_child_rows.map((row) => row.id),
      })),
    }));
    const report = {
      ...reportCore,
      package_fingerprint_sha256: packageFingerprint,
      next_recommended_step: readyGroups.length > 0
        ? 'Build a rollback-only guarded dry-run transaction for the largest ready set lane. Do not real-apply from this report.'
        : 'Resolve blockers before preparing cleanup SQL.',
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      summary: report.summary,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
    }, null, 2));
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
