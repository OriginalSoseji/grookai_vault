import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

import {
  CONTRACT_KEY,
  OUTPUT_DIR,
} from './base_set_print_run_lanes_contract_v1.mjs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const PACKAGE_ID = 'BASE-SET-PRINT-RUN-LANES-REAL-APPLY-V1';
const APPROVAL_TEXT = 'Approve real BASE-SET-PRINT-RUN-LANES-V1 apply only. Fingerprint: 0591c77f3be63792f0b03a1c980e728604d7abb57d563eba94fae38ff8faf3ee. SQL hash: db97aa1cfafa79d820d756115c6a6f67e1beabe862da05c5fe82e321d6687304. Scope: 3 derived Base Set collector lane set inserts and 304 card_print lane identity inserts for Shadowless, 1st Edition, and 1999-2000. Dry-run proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. No child writes. No identity-table writes. No external mapping writes. No price writes. No deletes. No merges. No migrations. No exact image claims. No global apply.';
const GATE_JSON = path.join(OUTPUT_DIR, 'base_set_print_run_lanes_real_apply_gate_v1.json');
const REAL_APPLY_SQL = 'docs/sql/base_set_print_run_lanes_real_apply_v1.sql';
const REPORT_JSON = path.join(OUTPUT_DIR, 'base_set_print_run_lanes_real_apply_v1.json');
const REPORT_MD = path.join(OUTPUT_DIR, 'base_set_print_run_lanes_real_apply_v1.md');

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

async function captureSnapshot(client) {
  const result = await client.query(
    `select 'set' as row_type, s.id::text as id, s.code, s.name, null::text as gv_id, null::text as number_plain, null::text as variant_key, null::text as image_status
     from public.sets s
     where s.code in ('base1-shadowless', 'base1-first-edition', 'base1-1999-2000')
     union all
     select 'card_print' as row_type, cp.id::text as id, cp.set_code as code, cp.name, cp.gv_id, cp.number_plain, cp.variant_key, cp.image_status
     from public.card_prints cp
     where cp.set_code in ('base1-shadowless', 'base1-first-edition', 'base1-1999-2000')
        or cp.gv_id in ('GV-PK-BASE1-58-SHADOWLESS', 'GV-PK-BASE1-58-FIRST-EDITION')
     order by row_type, code, number_plain, gv_id, variant_key`,
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      total_rows: rows.length,
      set_rows: rows.filter((row) => row.row_type === 'set').length,
      card_print_rows: rows.filter((row) => row.row_type === 'card_print').length,
    },
  };
}

async function captureLaneProof(client) {
  const result = await client.query(
    `with lane_rows as (
       select set_code, number_plain, gv_id, variant_key, image_status
       from public.card_prints
       where set_code in ('base1-shadowless', 'base1-first-edition', 'base1-1999-2000')
     ),
     special_rows as (
       select
         case
           when variant_key in ('shadowless_red_cheeks', 'shadowless_yellow_cheeks') then 'base1-shadowless'
           when variant_key in ('first_edition_red_cheeks', 'first_edition_yellow_cheeks') then 'base1-first-edition'
         end as lane_code,
         number_plain
       from public.card_prints
       where set_code = 'base1'
         and variant_key in (
           'shadowless_red_cheeks',
           'shadowless_yellow_cheeks',
           'first_edition_red_cheeks',
           'first_edition_yellow_cheeks'
         )
     ),
     lane_slots as (
       select set_code as lane_code, number_plain from lane_rows
       union
       select lane_code, number_plain from special_rows where lane_code is not null
     )
     select
       lane.lane_code,
       (select count(*)::int from public.sets s where s.code = lane.lane_code) as set_rows,
       (select count(*)::int from lane_rows lr where lr.set_code = lane.lane_code) as lane_card_print_rows,
       count(distinct lane_slots.number_plain)::int as covered_slots,
       (select count(*)::int from special_rows sr where sr.lane_code = lane.lane_code) as special_pikachu_identity_rows,
       (select count(*)::int from lane_rows lr where lr.set_code = lane.lane_code and lr.image_status = 'missing') as missing_image_status_rows
     from (values
       ('base1-shadowless'),
       ('base1-first-edition'),
       ('base1-1999-2000')
     ) as lane(lane_code)
     left join lane_slots on lane_slots.lane_code = lane.lane_code
     group by lane.lane_code
     order by lane.lane_code`,
  );

  const forbidden = await client.query(
    `select count(*)::int as forbidden_count
     from public.card_prints
     where gv_id in ('GV-PK-BASE1-58-SHADOWLESS', 'GV-PK-BASE1-58-FIRST-EDITION')
        or set_code in ('base1-shadowless', 'base1-first-edition', 'base1-1999-2000')
           and image_status <> 'missing'`,
  );

  return {
    lanes: result.rows,
    forbidden_rows: Number(forbidden.rows[0]?.forbidden_count ?? 0),
  };
}

function validateGate({ gate, sqlText }) {
  const findings = [];
  const realSqlHash = sha256(sqlText);
  if (gate.contract_key !== CONTRACT_KEY) findings.push('gate_contract_key_mismatch');
  if (gate.apply_allowed_by_gate !== true) findings.push('gate_not_apply_allowed');
  if (gate.apply_executed !== false) findings.push('gate_already_reports_apply_executed');
  if (gate.durable_db_writes_performed !== false) findings.push('gate_reports_durable_write');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('gate_stop_findings_present');
  if (gate.required_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (gate.real_apply_sql_hash_sha256 !== realSqlHash) findings.push('real_apply_sql_hash_mismatch');
  if (gate.dry_run_sql_hash_sha256 !== 'db97aa1cfafa79d820d756115c6a6f67e1beabe862da05c5fe82e321d6687304') {
    findings.push('approved_dry_run_sql_hash_mismatch');
  }
  if (!/(^|\n)\s*commit\s*;\s*$/i.test(sqlText.replace(/--.*$/gm, ''))) findings.push('real_apply_sql_missing_final_commit');
  return { findings, realSqlHash };
}

function buildMarkdown(report) {
  const laneRows = report.post_apply_lane_proof.lanes;
  const laneTable = [
    '| Lane | Set Rows | Card Print Rows | Covered Slots | Special Pikachu Rows | Missing Image Rows |',
    '| --- | --- | --- | --- | --- | --- |',
    ...laneRows.map((row) => `| ${row.lane_code} | ${row.set_rows} | ${row.lane_card_print_rows} | ${row.covered_slots} | ${row.special_pikachu_identity_rows} | ${row.missing_image_status_rows} |`),
  ].join('\n');

  return `# Base Set Print Run Lanes Real Apply V1

Generated: ${report.generated_at}

Package: ${report.package_id}

Contract: ${report.contract_key}

## Result

- apply_executed: ${report.apply_executed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- inserted_set_rows: ${report.inserted_set_rows}
- inserted_card_print_rows: ${report.inserted_card_print_rows}
- forbidden_rows: ${report.post_apply_lane_proof.forbidden_rows}
- stop_findings: ${report.stop_findings.length}

## Lane Proof

${laneTable}

## Approval

\`${report.approval_text}\`
`;
}

export async function runBaseSetPrintRunLanesRealApplyV1() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const gate = await readJson(GATE_JSON);
  const sqlText = await fs.readFile(REAL_APPLY_SQL, 'utf8');
  const { findings: gateFindings, realSqlHash } = validateGate({ gate, sqlText });
  if (gateFindings.length > 0) {
    throw new Error(`REAL_APPLY_GATE_BLOCKED: ${gateFindings.join(',')}`);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const beforeSnapshot = await captureSnapshot(client);
    if (beforeSnapshot.counts.total_rows !== 0) {
      throw new Error(`PRE_APPLY_TARGET_NOT_EMPTY: ${beforeSnapshot.counts.total_rows}`);
    }

    const result = await client.query(sqlText);
    const resultSets = Array.isArray(result) ? result : [result];
    const proofRows = resultSets.flatMap((entry) => entry.rows ?? []).filter((row) => row.package_id === 'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1');
    const proofRow = proofRows[0] ?? null;
    const afterSnapshot = await captureSnapshot(client);
    const postApplyLaneProof = await captureLaneProof(client);

    const stopFindings = [];
    if (!proofRow) stopFindings.push('apply_proof_row_missing');
    if (proofRow && Number(proofRow.inserted_set_rows) !== 3) stopFindings.push('apply_proof_set_count_mismatch');
    if (proofRow && Number(proofRow.inserted_card_print_rows) !== 304) stopFindings.push('apply_proof_card_print_count_mismatch');
    if (proofRow && Number(proofRow.forbidden_rows) !== 0) stopFindings.push('apply_proof_forbidden_rows_present');
    if (afterSnapshot.counts.set_rows !== 3) stopFindings.push('after_set_count_mismatch');
    if (afterSnapshot.counts.card_print_rows !== 304) stopFindings.push('after_card_print_count_mismatch');
    if (postApplyLaneProof.forbidden_rows !== 0) stopFindings.push('post_apply_forbidden_rows_present');
    for (const lane of postApplyLaneProof.lanes) {
      if (Number(lane.set_rows) !== 1) stopFindings.push(`lane_set_count_mismatch:${lane.lane_code}`);
      if (Number(lane.covered_slots) !== 102) stopFindings.push(`lane_coverage_not_102:${lane.lane_code}`);
    }

    const report = {
      package_id: PACKAGE_ID,
      contract_key: CONTRACT_KEY,
      generated_at: new Date().toISOString(),
      approval_text: APPROVAL_TEXT,
      real_apply_sql_path: REAL_APPLY_SQL,
      real_apply_sql_hash_sha256: realSqlHash,
      apply_executed: true,
      durable_db_writes_performed: true,
      inserted_set_rows: proofRow ? Number(proofRow.inserted_set_rows) : null,
      inserted_card_print_rows: proofRow ? Number(proofRow.inserted_card_print_rows) : null,
      before_snapshot: beforeSnapshot,
      after_snapshot: {
        ...afterSnapshot,
        rows: afterSnapshot.rows.slice(0, 20),
      },
      post_apply_lane_proof: postApplyLaneProof,
      apply_proof_row: proofRow,
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
  runBaseSetPrintRunLanesRealApplyV1()
    .then((report) => {
      console.log(JSON.stringify({
        package_id: report.package_id,
        apply_executed: report.apply_executed,
        durable_db_writes_performed: report.durable_db_writes_performed,
        inserted_set_rows: report.inserted_set_rows,
        inserted_card_print_rows: report.inserted_card_print_rows,
        forbidden_rows: report.post_apply_lane_proof.forbidden_rows,
        stop_findings: report.stop_findings,
        report_path: REPORT_MD,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
