import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_world_championship_decks_v1');
const DRY_RUN_SUMMARY = path.join(AUDIT_DIR, 'world_championship_decks_09d_rollback_sql_dry_run_summary_v1.json');
const DRY_RUN_SQL = path.join(ROOT, 'docs', 'sql', 'world_championship_decks_09d_rollback_sql_dry_run_v1.sql');
const REAL_APPLY_SQL = path.join(ROOT, 'docs', 'sql', 'world_championship_decks_09e_real_apply_v1.sql');
const REPORT_JSON = path.join(AUDIT_DIR, 'world_championship_decks_09e_real_apply_result_v1.json');
const REPORT_MD = path.join(AUDIT_DIR, 'world_championship_decks_09e_real_apply_result_v1.md');
const PACKAGE_ID = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09E-REAL-APPLY';
const DRY_RUN_PACKAGE_ID = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09D-ROLLBACK-SQL-DRY-RUN';
const APPLY_ID = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-V1';
const EXPECTED_DRY_SQL_HASH = '87420883c2944b53b5324c648b167424224b6095c83b854227026cf6fcc5b94f';
const EXPECTED_FINGERPRINT = '25c2fb7b2f8c0c6db41de63b84a95689243cdb8ab3501697f83d50df238ebc55';
const EXPECTED_ROLLBACK_PROOF = '870a3927c512949479ed85f17c406b145422f9feb5b457bfe5ee81b796382aaa';
const USER_APPROVAL = 'Approve real MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-V1 apply only. Fingerprint: 25c2fb7b2f8c0c6db41de63b84a95689243cdb8ab3501697f83d50df238ebc55. SQL hash: 87420883c2944b53b5324c648b167424224b6095c83b854227026cf6fcc5b94f. Scope: 80 World Championship Deck derived set lane inserts and 1,944 card_print parent identity inserts only. Dry-run proof: 870a3927c512949479ed85f17c406b145422f9feb5b457bfe5ee81b796382aaa == 870a3927c512949479ed85f17c406b145422f9feb5b457bfe5ee81b796382aaa. No child writes. No identity-table writes. No external mapping writes. No price writes. No storage writes. No deletes. No merges. No migrations. No exact image claims. No global apply.';

function dbUrl() {
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

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value, 'utf8');
}

function buildRealApplySql(drySql) {
  const withoutFinalRollback = drySql.replace(/\nrollback;\s*$/i, '\ncommit;\n');
  if (withoutFinalRollback === drySql) {
    throw new Error('REAL_APPLY_BUILD_BLOCKED: final rollback statement not found');
  }
  return withoutFinalRollback.replace(
    '-- No durable writes are allowed from this artifact.',
    '-- Real apply artifact generated after exact operator approval; commits only this approved scope.',
  );
}

function validateSql(sql) {
  const stripped = sql.replace(/--.*$/gm, '');
  const findings = [];
  if (!/(^|\n)\s*begin\s*;/i.test(stripped)) findings.push('missing_begin');
  if (!/(^|\n)\s*commit\s*;\s*$/i.test(stripped)) findings.push('missing_final_commit');
  if (/(^|\n)\s*rollback\s*;/i.test(stripped)) findings.push('contains_rollback');
  if (/\bdelete\s+from\b/i.test(stripped)) findings.push('contains_delete');
  if (/\bupdate\s+public\./i.test(stripped)) findings.push('contains_update_public');
  if (/\bcard_printings\b/i.test(stripped)) findings.push('contains_child_table_card_printings');
  if (/\bprice_/i.test(stripped) || /\bcard_prices\b/i.test(stripped)) findings.push('contains_price_surface');
  if (!/\binsert\s+into\s+public\.sets\b/i.test(stripped)) findings.push('missing_sets_insert');
  if (!/\binsert\s+into\s+public\.card_prints\b/i.test(stripped)) findings.push('missing_card_prints_insert');
  return findings;
}

async function captureSnapshot(client) {
  const result = await client.query(`
    select 'set' as row_type, s.code, s.name, null::text as gv_id, null::text as image_status
    from public.sets s
    where s.code like 'wcd20%'
    union all
    select 'card_print' as row_type, cp.set_code as code, cp.name, cp.gv_id, cp.image_status
    from public.card_prints cp
    where cp.set_code like 'wcd20%' or cp.gv_id like 'GV-PK-WCD-%'
    order by row_type, code, gv_id
  `);
  const rows = result.rows;
  return {
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      total_rows: rows.length,
      set_rows: rows.filter((row) => row.row_type === 'set').length,
      card_print_rows: rows.filter((row) => row.row_type === 'card_print').length,
    },
  };
}

async function captureReadback(client) {
  const setRows = await client.query(`
      select count(*)::int as count
      from public.sets
      where code like 'wcd20%'
        and source->'grookai'->>'apply_family' = $1
    `, [APPLY_ID]);
  const cardRows = await client.query(`
      select count(*)::int as count
      from public.card_prints
      where gv_id like 'GV-PK-WCD-%'
        and external_ids->'grookai'->>'apply_family' = $1
    `, [APPLY_ID]);
  const statusRows = await client.query(`
      select image_status, image_source, set_identity_model, count(*)::int as count
      from public.card_prints
      where gv_id like 'GV-PK-WCD-%'
      group by image_status, image_source, set_identity_model
      order by image_status, image_source, set_identity_model
    `);
  const forbiddenRows = await client.query(`
      select count(*)::int as count
      from public.card_prints
      where gv_id like 'GV-PK-WCD-%'
        and (image_status <> 'missing' or image_source is not null or image_url is not null or image_path is not null)
    `);
  const childRows = await client.query(`
      select count(*)::int as count
      from public.card_printings cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      where cp.gv_id like 'GV-PK-WCD-%'
    `);
  return {
    set_rows: Number(setRows.rows[0]?.count ?? 0),
    card_print_rows: Number(cardRows.rows[0]?.count ?? 0),
    image_status_rows: statusRows.rows,
    forbidden_image_claim_rows: Number(forbiddenRows.rows[0]?.count ?? 0),
    child_rows: Number(childRows.rows[0]?.count ?? 0),
  };
}

function buildMarkdown(report) {
  const statusTable = [
    '| image_status | image_source | set_identity_model | count |',
    '| --- | --- | --- | ---: |',
    ...report.readback.image_status_rows.map((row) => `| ${row.image_status ?? ''} | ${row.image_source ?? ''} | ${row.set_identity_model ?? ''} | ${row.count} |`),
  ].join('\n');
  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Apply executed: ${report.apply_executed}
- Durable DB writes performed: ${report.durable_db_writes_performed}
- Real apply SQL hash: \`${report.real_apply_sql_hash_sha256}\`
- Approved dry-run SQL hash: \`${report.approved_dry_run_sql_hash_sha256}\`
- Fingerprint: \`${report.fingerprint}\`
- Inserted set rows: ${report.inserted_set_rows}
- Inserted card_print rows: ${report.inserted_card_print_rows}
- Forbidden rows in apply proof: ${report.forbidden_rows}
- Readback set rows: ${report.readback.set_rows}
- Readback card_print rows: ${report.readback.card_print_rows}
- Readback child rows: ${report.readback.child_rows}
- Readback forbidden image claim rows: ${report.readback.forbidden_image_claim_rows}
- Stop findings: ${report.stop_findings.length}

## Image/Model Readback

${statusTable}

## Approval

\`${report.approval_text}\`
`;
}

export async function runWorldChampionshipDecks09eRealApplyV1() {
  const connectionString = dbUrl();
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const drySummary = await readJson(DRY_RUN_SUMMARY);
  const drySql = await fs.readFile(DRY_RUN_SQL, 'utf8');
  const dryHash = sha256(drySql);
  const gateFindings = [];

  if (USER_APPROVAL !== drySummary.required_real_apply_approval_text) gateFindings.push('approval_text_mismatch_dry_summary');
  if (dryHash !== EXPECTED_DRY_SQL_HASH) gateFindings.push('dry_sql_hash_mismatch');
  if (drySummary.sql_hash_sha256 !== EXPECTED_DRY_SQL_HASH) gateFindings.push('dry_summary_sql_hash_mismatch');
  if (drySummary.rollback_sql_fingerprint !== EXPECTED_FINGERPRINT) gateFindings.push('fingerprint_mismatch');
  if (drySummary.write_ready_now !== true) gateFindings.push('dry_summary_not_write_ready');
  if ((drySummary.stop_findings ?? []).length !== 0) gateFindings.push('dry_summary_stop_findings_present');
  if (drySummary.execution?.before_snapshot?.hash_sha256 !== EXPECTED_ROLLBACK_PROOF) gateFindings.push('dry_before_proof_mismatch');
  if (drySummary.execution?.after_snapshot?.hash_sha256 !== EXPECTED_ROLLBACK_PROOF) gateFindings.push('dry_after_proof_mismatch');
  if (drySummary.proof_row?.package_id !== DRY_RUN_PACKAGE_ID) gateFindings.push('dry_proof_package_mismatch');
  if (Number(drySummary.proof_row?.inserted_set_rows) !== 80) gateFindings.push('dry_proof_set_count_mismatch');
  if (Number(drySummary.proof_row?.inserted_card_print_rows) !== 1944) gateFindings.push('dry_proof_card_count_mismatch');
  if (Number(drySummary.proof_row?.forbidden_rows) !== 0) gateFindings.push('dry_proof_forbidden_rows_present');

  const realSql = buildRealApplySql(drySql);
  const realSqlFindings = validateSql(realSql);
  gateFindings.push(...realSqlFindings);
  if (gateFindings.length > 0) {
    throw new Error(`REAL_APPLY_GATE_BLOCKED: ${gateFindings.join(',')}`);
  }

  await writeText(REAL_APPLY_SQL, realSql);
  const realSqlHash = sha256(realSql);

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const beforeSnapshot = await captureSnapshot(client);
    if (beforeSnapshot.counts.total_rows !== 0) {
      throw new Error(`PRE_APPLY_TARGET_NOT_EMPTY: ${beforeSnapshot.counts.total_rows}`);
    }

    const result = await client.query(realSql);
    const resultSets = Array.isArray(result) ? result : [result];
    const proofRows = resultSets.flatMap((entry) => entry.rows ?? []).filter((row) => row.package_id === DRY_RUN_PACKAGE_ID);
    const proofRow = proofRows[0] ?? null;
    const afterSnapshot = await captureSnapshot(client);
    const readback = await captureReadback(client);

    const stopFindings = [];
    if (!proofRow) stopFindings.push('apply_proof_row_missing');
    if (proofRow && Number(proofRow.inserted_set_rows) !== 80) stopFindings.push('apply_proof_set_count_mismatch');
    if (proofRow && Number(proofRow.inserted_card_print_rows) !== 1944) stopFindings.push('apply_proof_card_count_mismatch');
    if (proofRow && Number(proofRow.forbidden_rows) !== 0) stopFindings.push('apply_proof_forbidden_rows_present');
    if (afterSnapshot.counts.set_rows !== 80) stopFindings.push('after_set_count_mismatch');
    if (afterSnapshot.counts.card_print_rows !== 1944) stopFindings.push('after_card_print_count_mismatch');
    if (readback.set_rows !== 80) stopFindings.push('readback_set_count_mismatch');
    if (readback.card_print_rows !== 1944) stopFindings.push('readback_card_print_count_mismatch');
    if (readback.child_rows !== 0) stopFindings.push('readback_child_rows_present');
    if (readback.forbidden_image_claim_rows !== 0) stopFindings.push('readback_forbidden_image_claim_rows_present');

    const report = {
      package_id: PACKAGE_ID,
      apply_family: APPLY_ID,
      generated_at: new Date().toISOString(),
      approval_text: USER_APPROVAL,
      fingerprint: EXPECTED_FINGERPRINT,
      approved_dry_run_sql_hash_sha256: EXPECTED_DRY_SQL_HASH,
      real_apply_sql_path: path.relative(ROOT, REAL_APPLY_SQL),
      real_apply_sql_hash_sha256: realSqlHash,
      apply_executed: true,
      durable_db_writes_performed: true,
      storage_writes_performed: false,
      migrations_created: false,
      inserted_set_rows: proofRow ? Number(proofRow.inserted_set_rows) : null,
      inserted_card_print_rows: proofRow ? Number(proofRow.inserted_card_print_rows) : null,
      forbidden_rows: proofRow ? Number(proofRow.forbidden_rows) : null,
      before_snapshot: beforeSnapshot,
      after_snapshot: {
        hash_sha256: afterSnapshot.hash_sha256,
        counts: afterSnapshot.counts,
      },
      apply_proof_row: proofRow,
      readback,
      stop_findings: stopFindings,
    };

    await writeJson(REPORT_JSON, report);
    await writeText(REPORT_MD, buildMarkdown(report));
    return report;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWorldChampionshipDecks09eRealApplyV1()
    .then((report) => {
      console.log(JSON.stringify({
        package_id: report.package_id,
        apply_executed: report.apply_executed,
        durable_db_writes_performed: report.durable_db_writes_performed,
        inserted_set_rows: report.inserted_set_rows,
        inserted_card_print_rows: report.inserted_card_print_rows,
        forbidden_rows: report.forbidden_rows,
        readback: report.readback,
        stop_findings: report.stop_findings,
        report_md: path.relative(ROOT, REPORT_MD),
      }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
