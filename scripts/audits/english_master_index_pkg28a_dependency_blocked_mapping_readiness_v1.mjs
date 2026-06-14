import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const LANES_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg28a_dependency_blocked_mapping_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg28a_dependency_blocked_mapping_readiness_v1.md');

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

function normalizeFinish(value) {
  const finish = normalizeText(value);
  if (finish === 'reverse_holo') return 'reverse';
  if (finish === 'holofoil') return 'holo';
  return finish;
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function table(headers, rows) {
  return markdownTable(headers, rows.map((row) => row.map(mdEscape)));
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

function firstExternalNumber(row) {
  const mapping = row.external_mappings?.[0];
  const externalId = mapping?.external_id ?? '';
  const prefix = `${row.canonical_set_key ?? row.set_key}-`;
  if (externalId.toLowerCase().startsWith(prefix.toLowerCase())) {
    return externalId.slice(prefix.length);
  }
  return null;
}

function masterKey(setKey, cardNumber, cardName, finishKey) {
  return [
    normalizeText(setKey),
    normalizeNumber(cardNumber),
    normalizeText(cardName),
    normalizeFinish(finishKey),
  ].join('|');
}

function parentCandidateKey(setCode, number, name) {
  return [
    normalizeText(setCode),
    normalizeNumber(number),
    normalizeText(name),
  ].join('|');
}

function buildMasterLookup(printings) {
  const lookup = new Map();
  for (const row of printings) {
    if (row.fact_type && row.fact_type !== 'printing_finish') continue;
    if (row.status !== 'master_verified') continue;
    const key = masterKey(row.set_key, row.card_number, row.card_name, row.finish_key);
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push(row);
  }
  return lookup;
}

function chooseTargetChild({ row, liveRowsByParentKey, externalNumber, exactMasterFacts }) {
  const candidateKeys = [
    parentCandidateKey(row.canonical_set_key, externalNumber, row.card_name),
    parentCandidateKey(row.canonical_set_key, row.number, row.card_name),
  ].filter((value, index, values) => value && values.indexOf(value) === index);

  const candidates = candidateKeys.flatMap((key) => liveRowsByParentKey.get(key) ?? []);
  const exactFinishCandidates = candidates.flatMap((parent) => (
    (parent.children ?? [])
      .filter((child) => normalizeFinish(child.finish_key) === normalizeFinish(row.finish_key))
      .map((child) => ({ parent, child }))
  ));
  const differentChildCandidates = exactFinishCandidates.filter((candidate) => candidate.child.id !== row.card_printing_id);

  if (differentChildCandidates.length === 1) {
    return {
      target_status: 'target_child_found',
      target_card_print_id: differentChildCandidates[0].parent.id,
      target_card_printing_id: differentChildCandidates[0].child.id,
      target_number: differentChildCandidates[0].parent.number,
      target_number_plain: differentChildCandidates[0].parent.number_plain,
      target_finish_key: differentChildCandidates[0].child.finish_key,
    };
  }

  if (differentChildCandidates.length > 1) {
    return {
      target_status: 'blocked_multiple_target_children',
      target_candidates: differentChildCandidates.map((candidate) => ({
        target_card_print_id: candidate.parent.id,
        target_card_printing_id: candidate.child.id,
        target_number: candidate.parent.number,
        target_number_plain: candidate.parent.number_plain,
        target_finish_key: candidate.child.finish_key,
      })),
    };
  }

  const currentIsExactMaster = exactMasterFacts.length > 0
    && normalizeNumber(row.number) === normalizeNumber(externalNumber)
    && normalizeFinish(row.finish_key) === normalizeFinish(exactMasterFacts[0]?.finish_key);

  if (currentIsExactMaster) {
    return {
      target_status: 'current_child_is_master_supported_when_using_printed_number',
      target_card_print_id: row.card_print_id,
      target_card_printing_id: row.card_printing_id,
      target_number: row.number,
      target_number_plain: row.card_number,
      target_finish_key: row.finish_key,
    };
  }

  return { target_status: 'blocked_no_target_child' };
}

function classify(row, target, exactMasterFacts, externalNumber) {
  if (!externalNumber) return 'blocked_external_number_unavailable';
  if (exactMasterFacts.length === 0) return 'blocked_external_number_not_master_verified';
  if (target.target_status === 'target_child_found') return 'transfer_ready_external_mapping_to_verified_target_child';
  if (target.target_status === 'current_child_is_master_supported_when_using_printed_number') {
    return 'identity_alignment_ready_no_delete';
  }
  return target.target_status;
}

async function readLiveRows(targetRows) {
  const conn = connectionString();
  if (!conn) {
    return { available: false, reason: 'database_connection_unavailable', rows: [] };
  }
  const client = new Client({ connectionString: conn });
  const childIds = targetRows.map((row) => row.card_printing_id);

  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const mappingResult = await client.query(
      `select
         em.id::text,
         em.card_printing_id::text,
         em.source,
         em.external_id,
         em.active,
         em.meta
       from public.external_printing_mappings em
       where em.card_printing_id = any($1::uuid[])
       order by em.source, em.external_id, em.id`,
      [childIds],
    );
    const mappingsByChild = new Map();
    for (const mapping of mappingResult.rows) {
      if (!mappingsByChild.has(mapping.card_printing_id)) mappingsByChild.set(mapping.card_printing_id, []);
      mappingsByChild.get(mapping.card_printing_id).push(mapping);
    }
    const parentIdentityTuples = targetRows.flatMap((row) => {
      const external_mappings = mappingsByChild.get(row.card_printing_id) ?? [];
      const enriched = { ...row, external_mappings };
      return [
        { set_code: row.canonical_set_key, number: firstExternalNumber(enriched), name: row.card_name },
        { set_code: row.canonical_set_key, number: row.number, name: row.card_name },
        { set_code: row.canonical_set_key, number: row.card_number, name: row.card_name },
      ];
    }).filter((row) => row.number);

    const liveResult = await client.query(
      `with wanted as (
         select *
         from jsonb_to_recordset($1::jsonb) as row(set_code text, number text, name text)
       )
       select
         cp.id::text,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.printed_identity_modifier,
         cp.variant_key,
         coalesce(
           jsonb_agg(
             jsonb_build_object('id', cpr.id::text, 'finish_key', cpr.finish_key)
             order by cpr.finish_key, cpr.id
           ) filter (where cpr.id is not null),
           '[]'::jsonb
         ) as children
       from public.card_prints cp
       join wanted w
         on lower(cp.set_code) = lower(w.set_code)
        and lower(cp.name) = lower(w.name)
        and (
          lower(coalesce(cp.number, '')) = lower(w.number)
          or lower(coalesce(cp.number_plain, '')) = lower(w.number)
        )
       left join public.card_printings cpr on cpr.card_print_id = cp.id
       group by cp.id
       order by cp.set_code, cp.number_plain, cp.number, cp.name, cp.id`,
      [JSON.stringify(parentIdentityTuples)],
    );
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      mappings: mappingResult.rows,
      live_rows: liveResult.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, mappings: [], live_rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMarkdown(report) {
  const sections = [
    '# PKG-28A Dependency-Blocked Mapping Readiness V1',
    '',
    'Read-only readiness report for unsupported child rows blocked only by `external_printing_mappings` dependencies.',
    '',
    'No DB writes were performed. No migrations were created. No deletes, merges, cleanup, quarantine, or global apply are authorized by this report.',
    '',
    '## Summary',
    '',
    table(
      ['metric', 'value'],
      [
      ['package_id', report.package_id],
      ['fingerprint', report.fingerprint],
      ['target_rows', report.summary.target_rows],
      ['external_mapping_refs', report.summary.external_mapping_refs],
      ['transfer_ready', report.summary.by_classification.transfer_ready_external_mapping_to_verified_target_child ?? 0],
      ['identity_alignment_ready_no_delete', report.summary.by_classification.identity_alignment_ready_no_delete ?? 0],
      ['blocked', report.summary.blocked_rows],
      ['db_writes_performed', false],
      ['migrations_created', false],
      ['cleanup_performed', false],
      ['quarantine_performed', false],
      ],
    ),
    '',
    '## Classification Counts',
    '',
    table(
      ['classification', 'rows'],
      [
      ...Object.entries(report.summary.by_classification).map(([key, value]) => [key, value]),
      ],
    ),
    '',
    '## Set Counts',
    '',
    table(
      ['set', 'rows'],
      [
      ...Object.entries(report.summary.by_set).map(([key, value]) => [key, value]),
      ],
    ),
    '',
    '## Transfer-Ready Rows',
    '',
    table(
      ['set', 'card', 'source_child', 'mapping', 'target_child', 'reason'],
      [
      ...report.rows
        .filter((row) => row.classification === 'transfer_ready_external_mapping_to_verified_target_child')
        .slice(0, 80)
        .map((row) => [
          row.canonical_set_key ?? row.set_key,
          `${row.number} ${row.card_name} ${row.finish_key}`,
          row.card_printing_id,
          row.external_mappings.map((mapping) => `${mapping.source}:${mapping.external_id}`).join(', '),
          row.target.target_card_printing_id,
          row.reason,
        ]),
      ],
    ),
    '',
    '## Identity-Alignment Rows',
    '',
    'These rows are Master-supported when matched by the printed number from the external mapping, but the current unsupported lane used `number_plain` plus modifier. They should not be deleted as unsupported.',
    '',
    table(
      ['set', 'card', 'finish', 'external_number', 'current_number_plain', 'modifier', 'reason'],
      [
      ...report.rows
        .filter((row) => row.classification === 'identity_alignment_ready_no_delete')
        .slice(0, 120)
        .map((row) => [
          row.canonical_set_key ?? row.set_key,
          `${row.number} ${row.card_name}`,
          row.finish_key,
          row.external_number,
          row.card_number,
          row.printed_identity_modifier,
          row.reason,
        ]),
      ],
    ),
    '',
    '## Blocked Rows',
    '',
    table(
      ['set', 'card', 'finish', 'external_number', 'classification', 'reason'],
      [
      ...report.rows
        .filter((row) => ![
          'transfer_ready_external_mapping_to_verified_target_child',
          'identity_alignment_ready_no_delete',
        ].includes(row.classification))
        .slice(0, 120)
        .map((row) => [
          row.canonical_set_key ?? row.set_key,
          `${row.number} ${row.card_name}`,
          row.finish_key,
          row.external_number,
          row.classification,
          row.reason,
        ]),
      ],
    ),
    '',
    '## Allowed Next Step',
    '',
    'Prepare a rollback-only dry-run artifact for only the `transfer_ready_external_mapping_to_verified_target_child` rows. Keep identity-alignment rows out of delete packages until the unsupported-lane matcher is prefix-aware or a separate parent identity backfill package is prepared.',
    '',
  ];
  return `${sections.join('\n')}\n`;
}

async function main() {
  const lanes = await readJson(LANES_JSON);
  const printingsRaw = await readJson(PRINTINGS_JSON);
  const printings = Array.isArray(printingsRaw) ? printingsRaw : (printingsRaw.printings ?? printingsRaw.rows ?? []);
  const masterLookup = buildMasterLookup(printings);
  const targetRows = (lanes.rows ?? []).filter((row) => row.lane === 'dependency_blocked_unsupported_child');

  const liveSnapshot = await readLiveRows(targetRows);
  const mappingsByChild = new Map();
  for (const mapping of liveSnapshot.mappings ?? []) {
    if (!mappingsByChild.has(mapping.card_printing_id)) mappingsByChild.set(mapping.card_printing_id, []);
    mappingsByChild.get(mapping.card_printing_id).push(mapping);
  }
  const liveRowsByParentKey = new Map();
  for (const liveRow of liveSnapshot.live_rows ?? []) {
    for (const number of [liveRow.number, liveRow.number_plain]) {
      const key = parentCandidateKey(liveRow.set_code, number, liveRow.name);
      if (!liveRowsByParentKey.has(key)) liveRowsByParentKey.set(key, []);
      if (!liveRowsByParentKey.get(key).some((row) => row.id === liveRow.id)) {
        liveRowsByParentKey.get(key).push(liveRow);
      }
    }
  }

  const rows = targetRows.map((row) => {
    const external_mappings = mappingsByChild.get(row.card_printing_id) ?? [];
    const enriched = { ...row, external_mappings };
    const externalNumber = firstExternalNumber(enriched);
    const exactMasterFacts = masterLookup.get(masterKey(row.canonical_set_key, externalNumber, row.card_name, row.finish_key)) ?? [];
    const target = chooseTargetChild({ row, liveRowsByParentKey, externalNumber, exactMasterFacts });
    const classification = classify(row, target, exactMasterFacts, externalNumber);
    const reason = {
      transfer_ready_external_mapping_to_verified_target_child: 'external mapping number resolves to a different existing Master-verified target child',
      identity_alignment_ready_no_delete: 'current child is Master-supported when matched by printed external number instead of number_plain',
      blocked_external_number_unavailable: 'external mapping does not expose a set-local card number',
      blocked_external_number_not_master_verified: 'external mapping number and finish do not resolve to a Master-verified fact',
      blocked_multiple_target_children: 'more than one possible target child exists',
      blocked_no_target_child: 'Master fact exists but no separate target child exists in DB',
    }[classification] ?? classification;
    return {
      ...row,
      external_number: externalNumber,
      exact_master_fact_count: exactMasterFacts.length,
      exact_master_facts: exactMasterFacts.map((fact) => ({
        set_key: fact.set_key,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: fact.finish_key,
        sources: fact.sources,
        evidence_urls: fact.evidence_urls,
      })),
      target,
      classification,
      reason,
      external_mappings,
    };
  });

  const blockedRows = rows.filter((row) => ![
    'transfer_ready_external_mapping_to_verified_target_child',
    'identity_alignment_ready_no_delete',
  ].includes(row.classification)).length;

  const report = {
    package_id: 'PKG-28A-DEPENDENCY-BLOCKED-MAPPING-READINESS',
    generated_at: new Date().toISOString(),
    source_inputs: {
      lanes_json: path.relative(process.cwd(), LANES_JSON),
      printings_json: path.relative(process.cwd(), PRINTINGS_JSON),
    },
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_authorized: false,
    },
    live_snapshot: {
      available: liveSnapshot.available,
      reason: liveSnapshot.reason,
      mappings_read: liveSnapshot.mappings?.length ?? 0,
      live_parent_rows_read: liveSnapshot.live_rows?.length ?? 0,
    },
    summary: {
      target_rows: targetRows.length,
      external_mapping_refs: rows.reduce((sum, row) => sum + row.external_mappings.length, 0),
      by_classification: countBy(rows, (row) => row.classification),
      by_set: countBy(rows, (row) => row.canonical_set_key ?? row.set_key),
      by_finish: countBy(rows, (row) => row.finish_key),
      blocked_rows: blockedRows,
    },
    rows,
  };
  report.fingerprint = sha256(stableJson({
    package_id: report.package_id,
    summary: report.summary,
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      classification: row.classification,
      external_number: row.external_number,
      mappings: row.external_mappings.map((mapping) => ({
        id: mapping.id,
        source: mapping.source,
        external_id: mapping.external_id,
      })),
      target: row.target,
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
