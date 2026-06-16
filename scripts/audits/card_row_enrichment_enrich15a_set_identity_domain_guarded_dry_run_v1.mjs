import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich15a_set_identity_domain_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich15a_set_identity_domain_guarded_dry_run_v1.md');

const PACKAGE_ID = 'ENRICH-15A-SET-IDENTITY-DOMAIN-BACKFILL';
const TARGET_DOMAIN = 'pokemon_eng_standard';
const TARGET_SET_CODES = ['2023sv', '2024sv', 'me03', 'me04', 'mee', 'mfb'];

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
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

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function loadTargets(client) {
  return queryRows(client, `
    select
      s.id::text as set_id,
      s.code as set_code,
      s.name as set_name,
      s.identity_domain_default,
      count(distinct cp.id)::int as parent_rows,
      count(cpr.id)::int as child_printing_rows,
      count(distinct cp.id) filter (where cp.gv_id is null)::int as missing_parent_gv_id,
      count(distinct cp.id) filter (
        where not exists (
          select 1
          from public.card_print_identity cpi
          where cpi.card_print_id = cp.id
            and cpi.is_active = true
        )
      )::int as missing_active_identity,
      count(distinct cp.id) filter (
        where exists (
          select 1
          from public.external_mappings em
          where em.card_print_id = cp.id
            and coalesce(em.active, true) = true
        )
      )::int as active_mapped_parent_rows
    from public.sets s
    left join public.card_prints cp on cp.set_id = s.id
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    where s.code = any($1::text[])
    group by s.id, s.code, s.name, s.identity_domain_default
    order by s.code
  `, [TARGET_SET_CODES]);
}

async function globalSegmentCounts(client) {
  const rows = await queryRows(client, `
    select
      case
        when s.identity_domain_default like 'pokemon_eng%' then 'english_physical'
        when s.identity_domain_default is null then 'unclassified_identity_domain'
        else 'excluded_or_other'
      end as segment,
      count(distinct cp.id)::int as parent_rows,
      count(cpr.id)::int as child_printing_rows
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    group by 1
    order by 1
  `);
  return rows;
}

async function runDryRun(client, targets) {
  const beforeSegments = await globalSegmentCounts(client);
  const beforeTargets = await loadTargets(client);

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const updated = await queryRows(client, `
      update public.sets
      set identity_domain_default = $2
      where code = any($1::text[])
        and identity_domain_default is null
      returning id::text as set_id, code as set_code, name as set_name, identity_domain_default
    `, [TARGET_SET_CODES, TARGET_DOMAIN]);

    const afterTargets = await loadTargets(client);
    const afterSegments = await globalSegmentCounts(client);

    await client.query('rollback');

    return {
      pass: updated.length === TARGET_SET_CODES.length,
      updated_rows: updated,
      before_targets: beforeTargets,
      after_targets: afterTargets,
      before_segments: beforeSegments,
      after_segments: afterSegments,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        updated: updated.map((row) => ({
          set_code: row.set_code,
          identity_domain_default: row.identity_domain_default,
        })),
        after_targets: afterTargets.map((row) => ({
          set_code: row.set_code,
          identity_domain_default: row.identity_domain_default,
          parent_rows: row.parent_rows,
          child_printing_rows: row.child_printing_rows,
        })),
        after_segments: afterSegments,
      })),
      stop_findings: updated.length === TARGET_SET_CODES.length ? [] : ['not_all_target_sets_updated_in_dry_run'],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function markdown(report) {
  const rows = report.targets.map((row) => `| ${row.set_code} | ${row.set_name} | ${row.parent_rows} | ${row.child_printing_rows} | ${row.missing_parent_gv_id} | ${row.missing_active_identity} |`).join('\n');
  return `# ENRICH-15A Set Identity Domain Backfill Dry Run

Generated at: ${report.generated_at}

Mode: guarded dry-run, rollback-only.

DB writes performed: false
Migrations created: false

## Scope

Set \`identity_domain_default\` to \`${TARGET_DOMAIN}\` for six English physical sets currently classified as unclassified identity domain.

Forbidden:
- parent card_print writes
- child card_printing writes
- identity inserts
- external mapping writes
- deletes
- merges
- migrations
- image writes
- global apply

## Target Sets

| set_code | set_name | parent_rows | child_printing_rows | missing_parent_gv_id | missing_active_identity |
|---|---:|---:|---:|---:|---:|
${rows}

## Dry-Run Result

- pass: ${report.dry_run.pass}
- target_set_count: ${report.summary.target_set_count}
- dry_run_updated_sets: ${report.summary.dry_run_updated_sets}
- affected_parent_rows: ${report.summary.affected_parent_rows}
- affected_child_printing_rows: ${report.summary.affected_child_printing_rows}
- proof_hash_sha256: \`${report.dry_run.proof_hash_sha256}\`

## Safety Confirmation

This package only prepares a set-domain classification update. It does not enrich parent or child rows directly.
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const targets = await loadTargets(client);
    const stopFindings = [];
    const foundCodes = new Set(targets.map((row) => row.set_code));
    for (const code of TARGET_SET_CODES) {
      if (!foundCodes.has(code)) stopFindings.push(`missing_target_set:${code}`);
    }
    for (const row of targets) {
      if (row.identity_domain_default !== null) {
        stopFindings.push(`target_set_already_has_identity_domain:${row.set_code}:${row.identity_domain_default}`);
      }
    }

    const dryRun = stopFindings.length === 0
      ? await runDryRun(client, targets)
      : {
          pass: false,
          updated_rows: [],
          before_targets: targets,
          after_targets: targets,
          before_segments: await globalSegmentCounts(client),
          after_segments: await globalSegmentCounts(client),
          proof_hash_sha256: null,
          stop_findings: stopFindings,
        };

    const report = {
      version: 'ENRICH15A_SET_IDENTITY_DOMAIN_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'guarded_dry_run_rollback_only',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      target_domain: TARGET_DOMAIN,
      target_set_codes: TARGET_SET_CODES,
      targets,
      summary: {
        target_set_count: targets.length,
        dry_run_updated_sets: dryRun.updated_rows.length,
        affected_parent_rows: targets.reduce((sum, row) => sum + row.parent_rows, 0),
        affected_child_printing_rows: targets.reduce((sum, row) => sum + row.child_printing_rows, 0),
      },
      dry_run: dryRun,
      stop_findings: [...stopFindings, ...dryRun.stop_findings],
      forbidden: [
        'card_prints writes',
        'card_printings writes',
        'card_print_identity writes',
        'external_mappings writes',
        'deletes',
        'merges',
        'migrations',
        'image writes',
        'global apply',
      ],
    };
    report.fingerprint_sha256 = sha256(stableJson({
      package_id: report.package_id,
      target_domain: report.target_domain,
      target_set_codes: report.target_set_codes,
      targets: report.targets.map((row) => ({
        set_code: row.set_code,
        parent_rows: row.parent_rows,
        child_printing_rows: row.child_printing_rows,
        identity_domain_default: row.identity_domain_default,
      })),
      proof_hash_sha256: report.dry_run.proof_hash_sha256,
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, markdown(report));
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.stop_findings.length === 0 && report.dry_run.pass,
      fingerprint_sha256: report.fingerprint_sha256,
      dry_run_proof_hash_sha256: report.dry_run.proof_hash_sha256,
      summary: report.summary,
      stop_findings: report.stop_findings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
