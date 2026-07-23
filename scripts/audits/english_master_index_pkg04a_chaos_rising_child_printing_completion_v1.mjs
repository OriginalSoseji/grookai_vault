import '../../backend/env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';

import { createBackendClient } from '../../backend/supabase_backend_client.mjs';
import {
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';
import {
  applyMe04FinishTruthV1,
  assertMe04FinishTruthV1,
} from './me04_finish_truth_v1.mjs';

const SET_KEY = 'me04';
const SET_NAME = 'Chaos Rising';
const MASTER_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const OUTPUT_DIR = 'docs/audits/verified_master_set_index_v1/chaos_rising';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'chaos_rising_child_printing_completion_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'chaos_rising_child_printing_completion_v1.md');
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';
const CREATED_BY = 'pkg04a_chaos_rising_child_printing_completion_v1';

function parseArgs() {
  return {
    apply: process.argv.includes('--apply'),
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function cardKey(number, name) {
  return [normalizeNumber(number), normalizeText(name)].join('|');
}

function printingKey(number, name, finishKey) {
  return [normalizeNumber(number), normalizeText(name), String(finishKey ?? '').trim()].join('|');
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
}

async function readMasterPrintings() {
  const artifact = await readJson(path.join(MASTER_DIR, 'english_master_index_printings_v1.json'));
  const rawRows = (artifact.printings ?? []).filter((row) => row.set_key === SET_KEY);
  const { retained } = applyMe04FinishTruthV1(rawRows);
  assertMe04FinishTruthV1(retained, 'Chaos Rising child-printing input');
  return retained
    .sort((left, right) => (
      normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true }) ||
      normalizeText(left.card_name).localeCompare(normalizeText(right.card_name)) ||
      String(left.finish_key).localeCompare(String(right.finish_key))
    ));
}

async function readLiveParents(supabase) {
  const { data, error } = await supabase
    .from('card_prints')
    .select('id, set_id, set_code, number, number_plain, name')
    .eq('set_code', SET_KEY)
    .order('number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function readLivePrintings(supabase, parentIds) {
  if (parentIds.length === 0) return [];
  const { data, error } = await supabase
    .from('card_printings')
    .select('id, card_print_id, finish_key, provenance_source, provenance_ref, created_by')
    .in('card_print_id', parentIds);
  if (error) throw error;
  return data ?? [];
}

function buildPlan({ masterPrintings, parents, livePrintings }) {
  const parentByCard = new Map();
  const duplicateParents = [];
  for (const parent of parents) {
    const key = cardKey(parent.number_plain ?? parent.number, parent.name);
    if (parentByCard.has(key)) duplicateParents.push({ key, parents: [parentByCard.get(key), parent] });
    else parentByCard.set(key, parent);
  }

  const livePrintingKeys = new Set();
  for (const printing of livePrintings) {
    livePrintingKeys.add(`${printing.card_print_id}|${printing.finish_key}`);
  }

  const rows = [];
  const missingParents = [];
  const insertRows = [];
  for (const printing of masterPrintings) {
    const parent = parentByCard.get(cardKey(printing.card_number, printing.card_name));
    if (!parent) {
      missingParents.push(printing);
      rows.push({
        status: 'missing_parent',
        card_number: printing.card_number,
        card_name: printing.card_name,
        finish_key: printing.finish_key,
      });
      continue;
    }

    const exists = livePrintingKeys.has(`${parent.id}|${printing.finish_key}`);
    const provenanceRef = `${SET_KEY}:${normalizeNumber(printing.card_number)}:${printing.finish_key}`;
    const row = {
      card_print_id: parent.id,
      card_number: printing.card_number,
      card_name: printing.card_name,
      finish_key: printing.finish_key,
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: provenanceRef,
      created_by: CREATED_BY,
      source_count: printing.source_count,
      sources: printing.sources ?? [],
      status: exists ? 'already_exists' : 'would_insert',
    };
    rows.push(row);
    if (!exists) {
      insertRows.push({
        card_print_id: parent.id,
        finish_key: printing.finish_key,
        is_provisional: false,
        provenance_source: PROVENANCE_SOURCE,
        provenance_ref: provenanceRef,
        created_by: CREATED_BY,
      });
    }
  }

  return {
    duplicateParents,
    missingParents,
    rows,
    insertRows,
  };
}

function summarize({ masterPrintings, parents, livePrintings, plan, insertedCount, errors }) {
  const byFinish = {};
  for (const row of masterPrintings) {
    byFinish[row.finish_key] = (byFinish[row.finish_key] ?? 0) + 1;
  }
  const liveByFinish = {};
  for (const row of livePrintings) {
    liveByFinish[row.finish_key] = (liveByFinish[row.finish_key] ?? 0) + 1;
  }
  return {
    master_index_printings: masterPrintings.length,
    master_index_printings_by_finish: byFinish,
    live_parent_rows: parents.length,
    live_child_printings_before: livePrintings.length,
    live_child_printings_before_by_finish: liveByFinish,
    planned_insertions: plan.insertRows.length,
    inserted_printings: insertedCount,
    missing_parent_rows: plan.missingParents.length,
    duplicate_parent_groups: plan.duplicateParents.length,
    errors,
  };
}

async function writeReport(report) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    '# Chaos Rising Child Printing Completion V1',
    '',
    `Mode: ${report.apply ? 'apply' : 'dry-run'}`,
    '',
    '## Summary',
    '',
    `- Set: ${SET_KEY} | ${SET_NAME}`,
    `- Master Index printings: ${report.summary.master_index_printings}`,
    `- Live parent rows: ${report.summary.live_parent_rows}`,
    `- Live child printings before: ${report.summary.live_child_printings_before}`,
    `- Planned insertions: ${report.summary.planned_insertions}`,
    `- Inserted printings: ${report.summary.inserted_printings}`,
    `- Missing parent rows: ${report.summary.missing_parent_rows}`,
    `- Duplicate parent groups: ${report.summary.duplicate_parent_groups}`,
    `- Errors: ${report.summary.errors}`,
    `- DB writes performed: ${report.db_writes_performed}`,
    `- Migrations created: ${report.migrations_created}`,
    `- Cleanup performed: ${report.cleanup_performed}`,
    `- Quarantine performed: ${report.quarantine_performed}`,
    '',
    '## Planned Rows',
    '',
    '| Number | Name | Finish | Card Print ID | Status |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const row of report.rows.slice(0, 300)) {
    lines.push(
      `| ${mdEscape(row.card_number)} | ${mdEscape(row.card_name)} | ${mdEscape(row.finish_key)} | ${mdEscape(row.card_print_id)} | ${mdEscape(row.status)} |`,
    );
  }

  await fs.writeFile(OUTPUT_MD, `${lines.join('\n')}\n`);
}

async function main() {
  const options = parseArgs();
  const supabase = createBackendClient();
  const masterPrintings = await readMasterPrintings();
  const parents = await readLiveParents(supabase);
  const livePrintings = await readLivePrintings(supabase, parents.map((row) => row.id));
  const plan = buildPlan({ masterPrintings, parents, livePrintings });

  let insertedCount = 0;
  let errors = 0;
  if (options.apply && plan.missingParents.length === 0 && plan.duplicateParents.length === 0 && plan.insertRows.length > 0) {
    const { error, count } = await supabase
      .from('card_printings')
      .insert(plan.insertRows, { count: 'exact' });
    if (error) {
      errors += 1;
      console.error('[pkg04a][chaos][child-printings] insert failed:', error.message);
    } else {
      insertedCount = count ?? plan.insertRows.length;
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    package: 'PKG-04A-CHAOS-RISING-CHILD-PRINTING-COMPLETION',
    apply: options.apply,
    set_key: SET_KEY,
    set_name: SET_NAME,
    summary: summarize({ masterPrintings, parents, livePrintings, plan, insertedCount, errors }),
    rows: plan.rows,
    duplicate_parent_groups: plan.duplicateParents,
    missing_parent_rows: plan.missingParents,
    db_writes_performed: options.apply && insertedCount > 0,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  };

  await writeReport(report);
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    summary: report.summary,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    cleanup_performed: report.cleanup_performed,
    quarantine_performed: report.quarantine_performed,
  }, null, 2));

  if (report.summary.missing_parent_rows > 0 || report.summary.duplicate_parent_groups > 0 || errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[pkg04a][chaos][child-printings] failed:', err?.message ?? err);
  process.exit(1);
});
