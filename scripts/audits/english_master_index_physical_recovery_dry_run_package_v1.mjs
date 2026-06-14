import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PACKAGE_DIR = path.join(OUTPUT_DIR, 'dry_run_packages');
const DEFAULT_SET_KEY = 'ecard2';

function argValue(name, fallback = null) {
  const prefix = `${name}=`;
  const directIndex = process.argv.indexOf(name);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : fallback;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
    .sort((left, right) => left.localeCompare(right));
}

function cardKey(setKey, cardNumber, cardName) {
  return [
    normalizeText(setKey),
    normalizeNumber(cardNumber),
    normalizeText(cardName),
  ].join('|');
}

function printingKey(setKey, cardNumber, cardName, finishKey) {
  return `${cardKey(setKey, cardNumber, cardName)}|${normalizeFinishKey(finishKey) ?? ''}`;
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

function buildPrintingLookup(printingsArtifact) {
  const lookup = new Map();
  for (const row of printingsArtifact.printings ?? []) {
    lookup.set(printingKey(row.set_key, row.card_number, row.card_name, row.finish_key), row);
  }
  return lookup;
}

function targetPrintingsForRow(row, printingLookup) {
  return (row.supported_finishes ?? []).map((finishKey) => {
    const fact = printingLookup.get(printingKey(row.set_key, row.source_card_number, row.index_card_name, finishKey));
    return {
      finish_key: finishKey,
      index_status: fact?.status ?? null,
      source_count: fact?.source_count ?? null,
      sources: fact?.sources ?? [],
      source_kinds: fact?.source_kinds ?? [],
      evidence_urls: fact?.evidence_urls ?? [],
    };
  });
}

function buildPackageRows({ setKey, exactMatch, printingsArtifact }) {
  const printingLookup = buildPrintingLookup(printingsArtifact);
  return (exactMatch.rows ?? [])
    .filter((row) => row.set_key === setKey)
    .filter((row) => row.card_match_status === 'exact_card_identity_match')
    .filter((row) => row.finish_match_status === 'all_finishes_master_verified_by_index')
    .map((row) => {
      const targetPrintings = targetPrintingsForRow(row, printingLookup);
      const allTargetPrintingsMasterVerified = targetPrintings.every((printing) => printing.index_status === 'master_verified');
      return {
        card_print_id: row.card_print_id,
        current_grookai_name: row.grookai_card_name,
        target_set_key: row.set_key,
        target_set_name: row.set_name,
        target_card_number: row.source_card_number,
        target_card_name: row.index_card_name,
        source_external_id: row.source_external_id,
        source_card_url: row.source_card_url,
        target_parent_fields: {
          set_code: row.set_key,
          number: row.source_card_number,
          number_plain: row.source_card_number,
          name: row.index_card_name,
        },
        target_printings: targetPrintings,
        supported_finishes: row.supported_finishes ?? [],
        unsupported_finishes: row.unsupported_finishes ?? [],
        evidence_summary: {
          card_identity_status: row.index_card_status,
          finish_match_status: row.finish_match_status,
          supported_sources: row.supported_sources ?? [],
          supported_source_kinds: row.supported_source_kinds ?? [],
          all_target_printings_master_verified: allTargetPrintingsMasterVerified,
        },
        dry_run_status: allTargetPrintingsMasterVerified
          ? 'eligible_for_row_level_dry_run'
          : 'blocked_target_printing_not_master_verified',
        mutation_authority: 'not mutation authority',
      };
    })
    .sort((left, right) => normalizeNumber(left.target_card_number).localeCompare(normalizeNumber(right.target_card_number), undefined, { numeric: true })
      || left.target_card_name.localeCompare(right.target_card_name));
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readOnlyDbSnapshot(cardPrintIds, setKey) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      target_set: null,
      rows: [],
      impact_counts: {},
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const setResult = await client.query(
      `select to_jsonb(s) as row
       from public.sets s
       where lower(coalesce(s.code, '')) = lower($1)
       order by s.code
       limit 5`,
      [setKey],
    );
    const rowsResult = await client.query(
      `select
         cp.id,
         to_jsonb(cp) as card_print,
         coalesce((
           select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as card_printings,
         (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id) as external_mappings_count,
         (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id) as identity_rows_count,
         (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id) as trait_rows_count,
         (select count(*)::int from public.vault_items vi where vi.card_id = cp.id) as vault_items_count
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.name, cp.number, cp.id`,
      [cardPrintIds],
    );
    const impactResult = await client.query(
      `select
         count(*)::int as card_prints_found,
         coalesce(sum((select count(*) from public.card_printings cpr where cpr.card_print_id = cp.id)), 0)::int as card_printings_found,
         coalesce(sum((select count(*) from public.external_mappings em where em.card_print_id = cp.id)), 0)::int as external_mappings_found,
         coalesce(sum((select count(*) from public.card_print_identity cpi where cpi.card_print_id = cp.id)), 0)::int as identity_rows_found,
         coalesce(sum((select count(*) from public.card_print_traits cpt where cpt.card_print_id = cp.id)), 0)::int as trait_rows_found,
         coalesce(sum((select count(*) from public.vault_items vi where vi.card_id = cp.id)), 0)::int as vault_items_found
       from public.card_prints cp
       where cp.id = any($1::uuid[])`,
      [cardPrintIds],
    );
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      target_set: setResult.rows.map((row) => row.row),
      rows: rowsResult.rows.map((row) => ({
        card_print_id: row.id,
        card_print: row.card_print,
        card_printings: row.card_printings,
        dependency_counts: {
          external_mappings: row.external_mappings_count,
          card_print_identity: row.identity_rows_count,
          card_print_traits: row.trait_rows_count,
          vault_items: row.vault_items_count,
        },
      })),
      impact_counts: impactResult.rows[0] ?? {},
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Read-only DB snapshot failed: ${error.message}`,
      target_set: null,
      rows: [],
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildPlannedSqlPreview(rows) {
  const values = rows.map((row) => `('${row.card_print_id}'::uuid, '${row.target_set_key.replaceAll("'", "''")}', '${row.target_card_number.replaceAll("'", "''")}', '${row.target_card_number.replaceAll("'", "''")}', '${row.target_card_name.replaceAll("'", "''")}')`);
  return [
    '-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.',
    '-- Parent recovery shape under review:',
    'with approved(card_print_id, set_code, number, number_plain, name) as (',
    `  values\n    ${values.join(',\n    ')}`,
    ')',
    'select cp.id, cp.set_code as before_set_code, approved.set_code as after_set_code,',
    '       cp.number as before_number, approved.number as after_number,',
    '       cp.name as before_name, approved.name as after_name',
    'from public.card_prints cp',
    'join approved on approved.card_print_id = cp.id;',
  ].join('\n');
}

function buildRollbackRequirements() {
  return [
    'Capture full before-state snapshot for every target card_print row before any apply.',
    'Capture child card_printings for every target card_print row before any apply.',
    'Rollback must restore only approved target row IDs and must not touch blocked remainder rows.',
    'Rollback must preserve vault ownership and provenance references.',
    'Rollback must be reviewed before any write path is executed.',
  ];
}

function buildPostApplyVerificationQueries(rows, setKey) {
  const ids = rows.map((row) => row.card_print_id);
  return [
    {
      name: 'target_parent_rows_resolved_to_set',
      sql: `select count(*)::int as matching_rows\nfrom public.card_prints\nwhere id = any(array[${ids.map((id) => `'${id}'::uuid`).join(', ')}])\n  and lower(coalesce(set_code, '')) = '${setKey.toLowerCase()}';`,
      expected: rows.length,
    },
    {
      name: 'target_child_printing_count_unchanged',
      sql: `select count(*)::int as child_printings\nfrom public.card_printings\nwhere card_print_id = any(array[${ids.map((id) => `'${id}'::uuid`).join(', ')}]);`,
      expected: rows.reduce((total, row) => total + row.target_printings.length, 0),
    },
    {
      name: 'unsupported_finish_rows_absent_from_package',
      sql: `select cp.id, cpr.finish_key\nfrom public.card_prints cp\njoin public.card_printings cpr on cpr.card_print_id = cp.id\nwhere cp.id = any(array[${ids.map((id) => `'${id}'::uuid`).join(', ')}])\n  and cpr.finish_key not in ('normal', 'reverse');`,
      expected: '0 rows',
    },
  ];
}

function buildArtifact({ setKey, packageRows, dbSnapshot }) {
  const blockedRows = packageRows.filter((row) => row.dry_run_status !== 'eligible_for_row_level_dry_run');
  const supportedFinishCounts = {};
  for (const row of packageRows) {
    for (const finish of row.supported_finishes) supportedFinishCounts[finish] = (supportedFinishCounts[finish] ?? 0) + 1;
  }
  const packageId = `${setKey}_physical_recovery_dry_run_v1`;
  return {
    generated_at: new Date().toISOString(),
    version: packageId,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    target_set_key: setKey,
    target_set_name: packageRows[0]?.target_set_name ?? null,
    dry_run_package_status: blockedRows.length === 0 ? 'ready_for_review_no_write' : 'blocked',
    write_ready_now: 0,
    write_allowed_from_this_package: false,
    summary: {
      candidate_card_prints: packageRows.length,
      candidate_printing_rows: packageRows.reduce((total, row) => total + row.target_printings.length, 0),
      by_supported_finish: supportedFinishCounts,
      blocked_rows: blockedRows.length,
      db_snapshot_available: dbSnapshot.available,
      db_card_prints_found: dbSnapshot.impact_counts?.card_prints_found ?? null,
      db_card_printings_found: dbSnapshot.impact_counts?.card_printings_found ?? null,
      external_mappings_referencing_targets: dbSnapshot.impact_counts?.external_mappings_found ?? null,
      identity_rows_referencing_targets: dbSnapshot.impact_counts?.identity_rows_found ?? null,
      trait_rows_referencing_targets: dbSnapshot.impact_counts?.trait_rows_found ?? null,
      vault_items_referencing_targets: dbSnapshot.impact_counts?.vault_items_found ?? null,
    },
    safety: {
      rule: 'This artifact is a dry-run package only. It is not an apply package and does not authorize DB writes.',
      stop_rules: [
        'Stop if any target row is missing from the before-state snapshot.',
        'Stop if child-printing count differs from package expectation.',
        'Stop if unsupported finishes appear in the target rows.',
        'Stop if identity, ownership, vault, or provenance impact cannot be explained.',
        'Stop if rollback artifact is incomplete.',
      ],
    },
    db_snapshot: dbSnapshot,
    package_rows: packageRows,
    planned_sql_preview: buildPlannedSqlPreview(packageRows),
    rollback_requirements: buildRollbackRequirements(),
    post_apply_verification_queries: buildPostApplyVerificationQueries(packageRows, setKey),
  };
}

function buildMarkdown(artifact) {
  const rows = artifact.package_rows.map((row) => [
    row.target_card_number,
    row.target_card_name,
    row.card_print_id,
    row.supported_finishes.join(', '),
    row.evidence_summary.supported_sources.join(', '),
    row.dry_run_status,
  ]);
  const snapshotRows = artifact.db_snapshot.rows.map((row) => [
    row.card_print_id,
    row.card_print?.set_code ?? '',
    row.card_print?.number ?? '',
    row.card_print?.name ?? '',
    row.card_printings?.length ?? 0,
    row.dependency_counts?.vault_items ?? 0,
  ]);
  return `# ${artifact.target_set_name} Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: ${artifact.target_set_key}
- target_set_name: ${artifact.target_set_name}
- dry_run_package_status: ${artifact.dry_run_package_status}
- write_ready_now: ${artifact.write_ready_now}
- write_allowed_from_this_package: ${artifact.write_allowed_from_this_package}
- candidate_card_prints: ${artifact.summary.candidate_card_prints}
- candidate_printing_rows: ${artifact.summary.candidate_printing_rows}
- db_snapshot_available: ${artifact.summary.db_snapshot_available}
- db_card_prints_found: ${artifact.summary.db_card_prints_found}
- db_card_printings_found: ${artifact.summary.db_card_printings_found}
- external_mappings_referencing_targets: ${artifact.summary.external_mappings_referencing_targets}
- identity_rows_referencing_targets: ${artifact.summary.identity_rows_referencing_targets}
- trait_rows_referencing_targets: ${artifact.summary.trait_rows_referencing_targets}
- vault_items_referencing_targets: ${artifact.summary.vault_items_referencing_targets}

## Candidate Rows

${markdownTable(['number', 'card', 'card_print_id', 'finishes', 'sources', 'status'], rows)}

## Before-State Snapshot

${artifact.db_snapshot.available ? markdownTable(['card_print_id', 'before_set_code', 'before_number', 'before_name', 'child_printings', 'vault_items'], snapshotRows) : `Snapshot unavailable: ${artifact.db_snapshot.reason}`}

## Planned SQL Preview

\`\`\`sql
${artifact.planned_sql_preview}
\`\`\`

## Rollback Requirements

${artifact.rollback_requirements.map((item) => `- ${item}`).join('\n')}

## Post-Apply Verification Queries

${artifact.post_apply_verification_queries.map((query) => `### ${query.name}\n\nExpected: ${query.expected}\n\n\`\`\`sql\n${query.sql}\n\`\`\``).join('\n\n')}

## Stop Rules

${artifact.safety.stop_rules.map((item) => `- ${item}`).join('\n')}
`;
}

async function main() {
  const setKey = String(argValue('--set', DEFAULT_SET_KEY)).trim();
  const exactMatch = await readJson('english_master_index_physical_recovery_exact_match_v1.json');
  const printingsArtifact = await readJson('english_master_index_printings_v1.json');
  const packageRows = buildPackageRows({ setKey, exactMatch, printingsArtifact });
  if (!packageRows.length) {
    throw new Error(`No eligible all-finish master-verified physical recovery rows found for set ${setKey}.`);
  }
  const dbSnapshot = await readOnlyDbSnapshot(packageRows.map((row) => row.card_print_id), setKey);
  const artifact = buildArtifact({ setKey, packageRows, dbSnapshot });
  const baseName = `${setKey}_physical_recovery_dry_run_v1`;
  await writeJson(path.join(PACKAGE_DIR, `${baseName}.json`), artifact);
  await writeMarkdown(path.join(PACKAGE_DIR, `${baseName}.md`), buildMarkdown(artifact));
  console.log(JSON.stringify({
    generated_files: [
      path.join(PACKAGE_DIR, `${baseName}.json`),
      path.join(PACKAGE_DIR, `${baseName}.md`),
    ],
    target_set_key: artifact.target_set_key,
    candidate_card_prints: artifact.summary.candidate_card_prints,
    candidate_printing_rows: artifact.summary.candidate_printing_rows,
    db_snapshot_available: artifact.summary.db_snapshot_available,
    write_ready_now: artifact.write_ready_now,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
