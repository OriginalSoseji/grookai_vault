import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

export const CONTRACT_KEY = 'BASE_SET_PRINT_RUN_LANES_V1';
export const SOURCE_SET_CODE = 'base1';
export const EXPECTED_SLOTS_PER_LANE = 102;
export const OUTPUT_DIR = 'docs/audits/base_set_print_run_lanes_v1';

export const LANE_CONFIGS = Object.freeze([
  {
    lane_code: 'base1-unlimited',
    label: 'Base Set Unlimited',
    source_set_code: SOURCE_SET_CODE,
    lane_kind: 'source_default',
    required_modifier: null,
  },
  {
    lane_code: 'base1-shadowless',
    label: 'Base Set Shadowless',
    source_set_code: SOURCE_SET_CODE,
    lane_kind: 'derived_print_run',
    required_modifier: 'print_run:shadowless',
  },
  {
    lane_code: 'base1-first-edition',
    label: 'Base Set 1st Edition',
    source_set_code: SOURCE_SET_CODE,
    lane_kind: 'derived_print_run',
    required_modifier: 'edition:first_edition;print_run:shadowless',
  },
  {
    lane_code: 'base1-1999-2000',
    label: 'Base Set 1999-2000',
    source_set_code: SOURCE_SET_CODE,
    lane_kind: 'derived_print_run',
    required_modifier: 'print_run:1999-2000',
  },
]);

export const PIKACHU_SLOT_RULE = Object.freeze({
  number_plain: '58',
  shadowless_identity_variant_keys: Object.freeze([
    'shadowless_red_cheeks',
    'shadowless_yellow_cheeks',
  ]),
  first_edition_identity_variant_keys: Object.freeze([
    'first_edition_red_cheeks',
    'first_edition_yellow_cheeks',
  ]),
  excluded_from_ordinary_lane_coverage: Object.freeze(['ghost_stamp_shadowless']),
  generic_shadowless_row_allowed: false,
  generic_first_edition_row_allowed: false,
});

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function numberSortValue(row) {
  const number = Number.parseInt(clean(row.number_plain || row.number), 10);
  return Number.isFinite(number) ? number : 9999;
}

function isOrdinaryBaseChecklistRow(row) {
  return lower(row.set_code) === SOURCE_SET_CODE
    && clean(row.gv_id)
    && !clean(row.variant_key)
    && !clean(row.printed_identity_modifier)
    && Number.isFinite(numberSortValue(row));
}

function modifierHas(row, token) {
  return lower(row.printed_identity_modifier).split(';').map((part) => part.trim()).includes(token);
}

function isGhostStamp(row) {
  return PIKACHU_SLOT_RULE.excluded_from_ordinary_lane_coverage.includes(lower(row.variant_key))
    || modifierHas(row, 'stamp_error:ghost_first_edition');
}

function rowSatisfiesLane(row, laneCode) {
  if (laneCode === 'base1-unlimited') return isOrdinaryBaseChecklistRow(row);
  if (laneCode === 'base1-shadowless') {
    return modifierHas(row, 'print_run:shadowless')
      && !modifierHas(row, 'edition:first_edition')
      && !isGhostStamp(row);
  }
  if (laneCode === 'base1-first-edition') {
    return modifierHas(row, 'edition:first_edition')
      && modifierHas(row, 'print_run:shadowless')
      && !isGhostStamp(row);
  }
  if (laneCode === 'base1-1999-2000') {
    return modifierHas(row, 'print_run:1999-2000')
      || lower(row.variant_key) === '1999_2000'
      || lower(row.variant_key) === '1999-2000';
  }
  return false;
}

function proposedGvId(laneCode, sourceRow) {
  const number = clean(sourceRow.number_plain || sourceRow.number).toUpperCase();
  if (laneCode === 'base1-shadowless') return `GV-PK-BASE1-${number}-SHADOWLESS`;
  if (laneCode === 'base1-first-edition') return `GV-PK-BASE1-${number}-FIRST-EDITION`;
  if (laneCode === 'base1-1999-2000') return `GV-PK-BASE1-${number}-1999-2000`;
  return clean(sourceRow.gv_id);
}

function proposedModifier(laneCode) {
  if (laneCode === 'base1-shadowless') return 'print_run:shadowless';
  if (laneCode === 'base1-first-edition') return 'edition:first_edition;print_run:shadowless';
  if (laneCode === 'base1-1999-2000') return 'print_run:1999-2000';
  return null;
}

function proposedVariantKey(laneCode) {
  if (laneCode === 'base1-shadowless') return 'shadowless';
  if (laneCode === 'base1-first-edition') return 'first_edition';
  if (laneCode === 'base1-1999-2000') return '1999_2000';
  return '';
}

function formatRows(rows, limit = 12) {
  return rows.slice(0, limit).map((row) => ({
    gv_id: row.gv_id,
    name: row.name,
    number: row.number,
    number_plain: row.number_plain,
    variant_key: row.variant_key,
    printed_identity_modifier: row.printed_identity_modifier,
    image_status: row.image_status,
  }));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
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

export function buildLaneAudit({ setRows, cardRows }) {
  const sourceSet = setRows.find((row) => lower(row.code) === SOURCE_SET_CODE) ?? null;
  const derivedSetRows = setRows.filter((row) => lower(row.code) !== SOURCE_SET_CODE);
  const ordinaryRows = cardRows.filter(isOrdinaryBaseChecklistRow)
    .sort((a, b) => numberSortValue(a) - numberSortValue(b) || clean(a.name).localeCompare(clean(b.name)));
  const ordinarySlotNumbers = new Set(ordinaryRows.map((row) => clean(row.number_plain || row.number)));
  const existingGvIds = new Set(cardRows.map((row) => clean(row.gv_id)).filter(Boolean));

  const laneAudits = LANE_CONFIGS.map((lane) => {
    const satisfyingRows = cardRows.filter((row) => rowSatisfiesLane(row, lane.lane_code))
      .sort((a, b) => numberSortValue(a) - numberSortValue(b) || clean(a.variant_key).localeCompare(clean(b.variant_key)));
    const satisfiedSlots = new Set(satisfyingRows.map((row) => clean(row.number_plain || row.number)));
    const missingSlots = ordinaryRows
      .filter((row) => !satisfiedSlots.has(clean(row.number_plain || row.number)))
      .map((row) => ({
        number: clean(row.number),
        number_plain: clean(row.number_plain || row.number),
        name: clean(row.name),
        source_gv_id: clean(row.gv_id),
      }));
    const proposalRows = [];

    if (lane.lane_code !== 'base1-unlimited') {
      for (const row of ordinaryRows) {
        const numberPlain = clean(row.number_plain || row.number);
        const isPikachuSpecialSlot = numberPlain === PIKACHU_SLOT_RULE.number_plain
          && (lane.lane_code === 'base1-shadowless' || lane.lane_code === 'base1-first-edition');
        if (satisfiedSlots.has(numberPlain)) continue;
        if (isPikachuSpecialSlot) continue;

        const gvId = proposedGvId(lane.lane_code, row);
        proposalRows.push({
          lane_code: lane.lane_code,
          source_gv_id: clean(row.gv_id),
          proposed_gv_id: gvId,
          name: clean(row.name),
          number: clean(row.number),
          number_plain: numberPlain,
          variant_key: proposedVariantKey(lane.lane_code),
          printed_identity_modifier: proposedModifier(lane.lane_code),
          image_status: 'missing',
          image_note: `${CONTRACT_KEY}: exact lane image not cataloged yet`,
          image_source: null,
          image_url: null,
          blockers: existingGvIds.has(gvId) ? ['proposed_gv_id_existing_collision'] : [],
        });
      }
    }

    return {
      ...lane,
      expected_slots: EXPECTED_SLOTS_PER_LANE,
      current_identity_rows: satisfyingRows.length,
      current_satisfied_slots: satisfiedSlots.size,
      current_missing_slots: EXPECTED_SLOTS_PER_LANE - satisfiedSlots.size,
      existing_rows_sample: formatRows(satisfyingRows),
      missing_slots: missingSlots,
      proposed_new_identity_rows: proposalRows,
      proposed_new_identity_row_count: proposalRows.length,
    };
  });

  const pikachuRows = cardRows
    .filter((row) => clean(row.number_plain || row.number) === PIKACHU_SLOT_RULE.number_plain)
    .sort((a, b) => clean(a.variant_key).localeCompare(clean(b.variant_key)));
  const ghostStampRows = pikachuRows.filter(isGhostStamp);
  const proposedRows = laneAudits.flatMap((lane) => lane.proposed_new_identity_rows);

  return {
    contract_key: CONTRACT_KEY,
    generated_at: new Date().toISOString(),
    write_mode: 'read_only_no_db_writes',
    source_set: sourceSet,
    derived_set_rows: derivedSetRows,
    expected_slots_per_lane: EXPECTED_SLOTS_PER_LANE,
    ordinary_base_checklist: {
      row_count: ordinaryRows.length,
      slot_count: ordinarySlotNumbers.size,
      expected_slot_count: EXPECTED_SLOTS_PER_LANE,
      complete: ordinaryRows.length === EXPECTED_SLOTS_PER_LANE && ordinarySlotNumbers.size === EXPECTED_SLOTS_PER_LANE,
    },
    pikachu_slot_rule: {
      ...PIKACHU_SLOT_RULE,
      existing_pikachu_rows: formatRows(pikachuRows, 20),
      ghost_stamp_rows_excluded_from_ordinary_lane_coverage: formatRows(ghostStampRows, 10),
    },
    lane_audits: laneAudits,
    summary: {
      lanes: laneAudits.length,
      derived_set_rows_present: derivedSetRows.length,
      total_current_lane_identity_rows: laneAudits.reduce((sum, lane) => sum + lane.current_identity_rows, 0),
      total_current_satisfied_slots: laneAudits.reduce((sum, lane) => sum + lane.current_satisfied_slots, 0),
      total_missing_slots: laneAudits.reduce((sum, lane) => sum + lane.current_missing_slots, 0),
      total_proposed_new_identity_rows: proposedRows.length,
      proposed_rows_with_blockers: proposedRows.filter((row) => row.blockers.length > 0).length,
    },
  };
}

function buildMarkdown(audit) {
  const laneRows = audit.lane_audits.map((lane) => ({
    lane_code: lane.lane_code,
    label: lane.label,
    current_identity_rows: lane.current_identity_rows,
    current_satisfied_slots: lane.current_satisfied_slots,
    current_missing_slots: lane.current_missing_slots,
    proposed_new_identity_row_count: lane.proposed_new_identity_row_count,
  }));
  const proposalRows = audit.lane_audits.flatMap((lane) => lane.proposed_new_identity_rows);

  return `# Base Set Print Run Lanes V1 Audit

Generated: ${audit.generated_at}

Contract: ${audit.contract_key}

Mode: ${audit.write_mode}

## Summary

- Source set: ${audit.source_set?.code ?? 'missing'} / ${audit.source_set?.name ?? 'missing'}
- Ordinary Base Set checklist rows: ${audit.ordinary_base_checklist.row_count}/${audit.ordinary_base_checklist.expected_slot_count}
- Derived set rows currently present: ${audit.summary.derived_set_rows_present}
- Proposed new identity rows: ${audit.summary.total_proposed_new_identity_rows}
- Proposed rows with blockers: ${audit.summary.proposed_rows_with_blockers}

## Lane Coverage

${markdownTable(laneRows, [
  { label: 'Lane', value: (row) => row.lane_code },
  { label: 'Label', value: (row) => row.label },
  { label: 'Identity Rows', value: (row) => row.current_identity_rows },
  { label: 'Satisfied Slots', value: (row) => row.current_satisfied_slots },
  { label: 'Missing Slots', value: (row) => row.current_missing_slots },
  { label: 'Proposed Rows', value: (row) => row.proposed_new_identity_row_count },
])}

## Pikachu Slot 58

Base Set Pikachu #58 is special. Shadowless and 1st Edition use existing red-cheeks/yellow-cheeks rows for slot 58. Ghost Stamp is excluded from ordinary lane coverage.

${markdownTable(audit.pikachu_slot_rule.existing_pikachu_rows, [
  { label: 'GV ID', value: (row) => row.gv_id },
  { label: 'Variant', value: (row) => row.variant_key },
  { label: 'Modifier', value: (row) => row.printed_identity_modifier },
  { label: 'Image', value: (row) => row.image_status },
])}

## Proposed Row Samples

${markdownTable(proposalRows.slice(0, 40), [
  { label: 'Lane', value: (row) => row.lane_code },
  { label: 'Proposed GV ID', value: (row) => row.proposed_gv_id },
  { label: 'Name', value: (row) => row.name },
  { label: 'No.', value: (row) => row.number },
  { label: 'Modifier', value: (row) => row.printed_identity_modifier },
  { label: 'Blockers', value: (row) => row.blockers.join(', ') },
])}

## Apply Boundary

This audit does not write to Supabase. A later apply step must introduce a guarded migration or lane-membership write plan and must keep Ghost Stamp outside ordinary Shadowless coverage.
`;
}

export async function runBaseSetPrintRunLanesContractAuditV1() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const laneCodes = LANE_CONFIGS.map((lane) => lane.lane_code);
    const setRows = await queryRows(
      client,
      `select id, code, name, printed_set_abbrev, printed_total, identity_model, set_role, release_date
       from public.sets
       where lower(code) = any($1::text[])
       order by code`,
      [[SOURCE_SET_CODE, ...laneCodes]],
    );
    const cardRows = await queryRows(
      client,
      `select id, gv_id, set_id, set_code, name, number, number_plain, variant_key, rarity,
              printed_identity_modifier, image_status, image_source, image_url, image_alt_url,
              printed_set_abbrev, printed_total
       from public.card_prints
       where lower(set_code) = any($1::text[])
       order by number_plain::int nulls last, number, name, variant_key nulls first`,
      [[SOURCE_SET_CODE, ...laneCodes]],
    );
    const audit = buildLaneAudit({ setRows, cardRows });
    await writeJson(path.join(OUTPUT_DIR, 'base_set_print_run_lanes_contract_v1.json'), audit);
    await writeText(path.join(OUTPUT_DIR, 'base_set_print_run_lanes_contract_v1.md'), buildMarkdown(audit));
    return audit;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBaseSetPrintRunLanesContractAuditV1()
    .then((audit) => {
      console.log(JSON.stringify({
        contract_key: audit.contract_key,
        ordinary_base_checklist_rows: audit.ordinary_base_checklist.row_count,
        lane_coverage: audit.lane_audits.map((lane) => ({
          lane_code: lane.lane_code,
          current_satisfied_slots: lane.current_satisfied_slots,
          current_missing_slots: lane.current_missing_slots,
          proposed_new_identity_rows: lane.proposed_new_identity_row_count,
        })),
        total_proposed_new_identity_rows: audit.summary.total_proposed_new_identity_rows,
        output_dir: OUTPUT_DIR,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
