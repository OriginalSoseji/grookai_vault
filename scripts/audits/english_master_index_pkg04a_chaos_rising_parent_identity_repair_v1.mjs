import '../../backend/env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';

import { createBackendClient } from '../../backend/supabase_backend_client.mjs';

const SET_KEY = 'me04';
const SET_NAME = 'Chaos Rising';
const SOURCE = 'tcgdex';
const OUTPUT_DIR = 'docs/audits/verified_master_set_index_v1/chaos_rising';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'chaos_rising_parent_identity_repair_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'chaos_rising_parent_identity_repair_v1.md');

function parseArgs() {
  return {
    apply: process.argv.includes('--apply'),
  };
}

function normalizeNumber(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function cardNumber(cardData, payload) {
  return normalizeNumber(
    cardData?.number ??
      cardData?.localId ??
      cardData?.local_id ??
      payload?.number ??
      payload?.localId ??
      payload?.local_id,
  );
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
}

async function readRawCards(supabase) {
  const { data, error } = await supabase
    .from('raw_imports')
    .select('id, payload, status')
    .eq('source', SOURCE)
    .eq('payload->>_kind', 'card')
    .eq('payload->>_set_external_id', SET_KEY)
    .in('status', ['pending', 'normalized'])
    .order('id', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function readSet(supabase) {
  const { data, error } = await supabase
    .from('sets')
    .select('id, code, name')
    .eq('game', 'pokemon')
    .eq('code', SET_KEY)
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function readCardPrintByTcgdexId(supabase, setId, externalId) {
  const { data, error } = await supabase
    .from('card_prints')
    .select('id, set_id, set_code, number, number_plain, name, external_ids')
    .eq('set_id', setId)
    .eq('external_ids->>tcgdex', externalId)
    .limit(2);
  if (error) throw error;
  return data ?? [];
}

async function writeReport(report) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    '# Chaos Rising Parent Identity Repair V1',
    '',
    `Mode: ${report.apply ? 'apply' : 'dry-run'}`,
    '',
    '## Summary',
    '',
    `- Set: ${SET_KEY} | ${SET_NAME}`,
    `- Raw card rows: ${report.summary.raw_card_rows}`,
    `- Exact external-id matches: ${report.summary.exact_external_id_matches}`,
    `- Rows needing repair: ${report.summary.rows_needing_repair}`,
    `- Rows repaired: ${report.summary.rows_repaired}`,
    `- Missing card_print rows: ${report.summary.missing_card_print_rows}`,
    `- Duplicate card_print rows: ${report.summary.duplicate_card_print_rows}`,
    `- Errors: ${report.summary.errors}`,
    `- DB writes performed: ${report.db_writes_performed}`,
    `- Migrations created: ${report.migrations_created}`,
    `- Cleanup performed: ${report.cleanup_performed}`,
    `- Quarantine performed: ${report.quarantine_performed}`,
    '',
    '## Repair Rows',
    '',
    '| Number | Name | Card Print ID | Before Set Code | Before Number | After Set Code | After Number | Status |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of report.rows.slice(0, 150)) {
    lines.push(
      `| ${mdEscape(row.after?.number)} | ${mdEscape(row.after?.name)} | ${mdEscape(row.card_print_id)} | ${mdEscape(row.before?.set_code)} | ${mdEscape(row.before?.number)} | ${mdEscape(row.after?.set_code)} | ${mdEscape(row.after?.number)} | ${mdEscape(row.status)} |`,
    );
  }

  await fs.writeFile(OUTPUT_MD, `${lines.join('\n')}\n`);
}

async function main() {
  const options = parseArgs();
  const supabase = createBackendClient();
  const setRow = await readSet(supabase);
  if (!setRow) throw new Error(`Set ${SET_KEY} was not found in Grookai.`);

  const raws = await readRawCards(supabase);
  const rows = [];
  let exactMatches = 0;
  let rowsNeedingRepair = 0;
  let rowsRepaired = 0;
  let missing = 0;
  let duplicate = 0;
  let errors = 0;

  for (const raw of raws) {
    const payload = raw.payload ?? {};
    const cardData = payload.card ?? payload;
    const externalId = payload._external_id ?? cardData.id ?? null;
    const number = cardNumber(cardData, payload);
    const name = cardData.name ?? externalId;
    const matches = await readCardPrintByTcgdexId(supabase, setRow.id, externalId);

    if (matches.length === 0) {
      missing += 1;
      rows.push({ raw_import_id: raw.id, external_id: externalId, status: 'missing_card_print' });
      continue;
    }
    if (matches.length > 1) {
      duplicate += 1;
      rows.push({ raw_import_id: raw.id, external_id: externalId, status: 'duplicate_card_print' });
      continue;
    }

    exactMatches += 1;
    const current = matches[0];
    const updates = {};
    if (current.set_code !== SET_KEY) updates.set_code = SET_KEY;
    if (number && current.number !== number) updates.number = number;

    const needsRepair = Object.keys(updates).length > 0;
    if (needsRepair) rowsNeedingRepair += 1;

    let status = needsRepair ? 'would_repair' : 'already_correct';
    if (needsRepair && options.apply) {
      const { error } = await supabase.from('card_prints').update(updates).eq('id', current.id);
      if (error) {
        errors += 1;
        status = 'error';
      } else {
        rowsRepaired += 1;
        status = 'repaired';
      }
    }

    rows.push({
      raw_import_id: raw.id,
      external_id: externalId,
      card_print_id: current.id,
      before: {
        set_code: current.set_code,
        number: current.number,
        number_plain: current.number_plain,
        name: current.name,
      },
      after: {
        set_code: SET_KEY,
        number,
        name,
      },
      status,
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    package: 'PKG-04A-CHAOS-RISING-PARENT-IDENTITY-REPAIR',
    apply: options.apply,
    set_key: SET_KEY,
    set_name: SET_NAME,
    summary: {
      raw_card_rows: raws.length,
      exact_external_id_matches: exactMatches,
      rows_needing_repair: rowsNeedingRepair,
      rows_repaired: rowsRepaired,
      missing_card_print_rows: missing,
      duplicate_card_print_rows: duplicate,
      errors,
    },
    rows,
    db_writes_performed: options.apply && rowsRepaired > 0,
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

  if (missing || duplicate || errors) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[pkg04a][chaos][parent-identity-repair] failed:', err?.message ?? err);
  process.exit(1);
});
