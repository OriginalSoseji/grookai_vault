import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich15a_set_identity_domain_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich15a_set_identity_domain_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich15a_set_identity_domain_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-15A-SET-IDENTITY-DOMAIN-BACKFILL';
const EXPECTED_FINGERPRINT = '291200956a4305e69804cf2309660ba0e8ac79cbd2795743ae7831569879fe74';
const EXPECTED_DRY_RUN_PROOF = '3f778632b7489b6c4156f5e0b6956dea2d1ac741b734714ce3f0203a97fc6696';
const TARGET_DOMAIN = 'pokemon_eng_standard';
const TARGET_SET_CODES = ['2023sv', '2024sv', 'me03', 'me04', 'mee', 'mfb'];

const REQUIRED_APPROVAL_TEXT = 'Approve real ENRICH-15A-SET-IDENTITY-DOMAIN-BACKFILL apply only. Fingerprint: 291200956a4305e69804cf2309660ba0e8ac79cbd2795743ae7831569879fe74. Scope: 6 set identity_domain_default updates to pokemon_eng_standard for 2023sv, 2024sv, me03, me04, mee, and mfb; affected rows after classification: 320 parent rows and 517 child printings moved into English physical enrichment lane. Dry-run proof: 3f778632b7489b6c4156f5e0b6956dea2d1ac741b734714ce3f0203a97fc6696 == 3f778632b7489b6c4156f5e0b6956dea2d1ac741b734714ce3f0203a97fc6696. No card_prints writes. No card_printings writes. No identity writes. No external mapping writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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
  return queryRows(client, `
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
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.dry_run?.proof_hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if (dryRun.dry_run?.pass !== true) findings.push('dry_run_not_passed');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.target_domain !== TARGET_DOMAIN) findings.push('target_domain_mismatch');
  if (stableJson(dryRun.target_set_codes ?? []) !== stableJson(TARGET_SET_CODES)) findings.push('target_set_codes_mismatch');
  if (dryRun.summary?.target_set_count !== 6) findings.push('target_set_count_mismatch');
  if (dryRun.summary?.dry_run_updated_sets !== 6) findings.push('dry_run_updated_sets_mismatch');
  if (dryRun.summary?.affected_parent_rows !== 320) findings.push('affected_parent_rows_mismatch');
  if (dryRun.summary?.affected_child_printing_rows !== 517) findings.push('affected_child_printing_rows_mismatch');
  return findings;
}

async function applyPackage(client) {
  const beforeTargets = await loadTargets(client);
  const beforeSegments = await globalSegmentCounts(client);

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const stillNull = beforeTargets.filter((row) => row.identity_domain_default === null);
    if (stillNull.length !== TARGET_SET_CODES.length) {
      throw new Error(`target sets are not all null before apply: ${JSON.stringify(beforeTargets)}`);
    }

    const updated = await queryRows(client, `
      update public.sets
      set identity_domain_default = $2
      where code = any($1::text[])
        and identity_domain_default is null
      returning id::text as set_id, code as set_code, name as set_name, identity_domain_default
    `, [TARGET_SET_CODES, TARGET_DOMAIN]);

    if (updated.length !== TARGET_SET_CODES.length) {
      throw new Error(`expected ${TARGET_SET_CODES.length} set updates, got ${updated.length}`);
    }

    await client.query('commit');

    const afterTargets = await loadTargets(client);
    const afterSegments = await globalSegmentCounts(client);

    return {
      before_targets: beforeTargets,
      before_segments: beforeSegments,
      updated_rows: updated,
      after_targets: afterTargets,
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
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original error.
    }
    throw error;
  }
}

function markdown(report) {
  const rows = report.apply.updated_rows.map((row) => `| ${row.set_code} | ${row.set_name} | ${row.identity_domain_default} |`).join('\n');
  return `# ENRICH-15A Set Identity Domain Backfill Real Apply

Generated at: ${report.generated_at}

Package: ${PACKAGE_ID}

## Applied

| set_code | set_name | identity_domain_default |
|---|---|---|
${rows}

## Proof

- dry_run_fingerprint: \`${EXPECTED_FINGERPRINT}\`
- dry_run_proof: \`${EXPECTED_DRY_RUN_PROOF}\`
- real_apply_proof_hash_sha256: \`${report.apply.proof_hash_sha256}\`
- updated_sets: ${report.apply.updated_rows.length}

## Safety

- card_prints writes: 0
- card_printings writes: 0
- identity writes: 0
- external mapping writes: 0
- deletes: 0
- merges: 0
- migrations: 0
- image writes: 0
- global apply: 0
`;
}

const conn = connectionString();
if (!conn) throw new Error('Missing database connection string.');

const dryRun = await readJson(DRY_RUN_JSON);
const dryRunFindings = validateDryRun(dryRun);
if (dryRunFindings.length > 0) {
  throw new Error(`Dry-run validation failed: ${dryRunFindings.join(', ')}`);
}

const client = new Client({ connectionString: conn });
await client.connect();
try {
  const applied = await applyPackage(client);
  const report = {
    version: 'ENRICH15A_SET_IDENTITY_DOMAIN_REAL_APPLY_V1',
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    db_writes_performed: true,
    migrations_created: false,
    cleanup_performed: false,
    dry_run_fingerprint_sha256: EXPECTED_FINGERPRINT,
    dry_run_proof_hash_sha256: EXPECTED_DRY_RUN_PROOF,
    required_approval_text: REQUIRED_APPROVAL_TEXT,
    apply: applied,
    stop_findings: [],
  };
  report.fingerprint_sha256 = sha256(stableJson({
    package_id: PACKAGE_ID,
    dry_run_fingerprint_sha256: EXPECTED_FINGERPRINT,
    dry_run_proof_hash_sha256: EXPECTED_DRY_RUN_PROOF,
    updated_rows: applied.updated_rows.map((row) => ({
      set_code: row.set_code,
      identity_domain_default: row.identity_domain_default,
    })),
    real_apply_proof_hash_sha256: applied.proof_hash_sha256,
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, markdown(report));

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    pass: true,
    fingerprint_sha256: report.fingerprint_sha256,
    real_apply_proof_hash_sha256: report.apply.proof_hash_sha256,
    updated_sets: report.apply.updated_rows.length,
    stop_findings: report.stop_findings,
  }, null, 2));
} finally {
  await client.end();
}
