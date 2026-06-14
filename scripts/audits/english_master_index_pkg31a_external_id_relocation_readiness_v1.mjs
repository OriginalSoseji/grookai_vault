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
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg28a_dependency_blocked_mapping_readiness_v1.json');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg31a_external_id_relocation_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg31a_external_id_relocation_readiness_v1.md');

const PACKAGE_ID = 'PKG-31A-EXTERNAL-ID-RELOCATION-READINESS';

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

function finishKey(value) {
  const finish = normalizeText(value);
  return finish === 'reverse_holo' ? 'reverse' : finish;
}

function targetFromExternalId(row) {
  const externalId = row.external_mappings?.[0]?.external_id;
  const match = /^(.+)-([A-Za-z]+\d+|\d+a)$/i.exec(String(externalId ?? '').trim());
  if (!match) return null;
  const [, rawSetKey, rawNumber] = match;
  const setKey = normalizeText(rawSetKey);
  const number = rawNumber.toUpperCase();
  if (/^TG\d+$/i.test(number)) {
    return {
      set_key: `${setKey}tg`,
      card_number: number,
      source: 'trainer_gallery_external_id',
    };
  }
  if (/^H\d+$/i.test(number)) {
    return {
      set_key: setKey,
      card_number: number,
      source: 'h_number_external_id',
    };
  }
  if (/^\d+a$/i.test(number)) {
    return {
      set_key: setKey,
      card_number: number.toLowerCase(),
      source: 'suffix_external_id',
    };
  }
  return null;
}

function masterFactKey(setKey, number, finish) {
  return [
    normalizeText(setKey),
    normalizeNumber(number),
    finishKey(finish),
  ].join('|');
}

function buildMasterFactIndex(masterPrintings) {
  const index = new Map();
  for (const row of masterPrintings) {
    if (row.status !== 'master_verified') continue;
    const key = masterFactKey(row.set_key, row.card_number, row.finish_key);
    const facts = index.get(key) ?? [];
    facts.push(row);
    index.set(key, facts);
  }
  return index;
}

async function loadLiveTarget(client, target, finish) {
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cpr.id::text as card_printing_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cpr.finish_key
     from public.card_prints cp
     left join public.card_printings cpr
       on cpr.card_print_id = cp.id
      and cpr.finish_key = $3
     where lower(cp.set_code) = lower($1)
       and (
         lower(cp.number) = lower($2)
         or lower(coalesce(cp.number_plain, '')) = lower($2)
       )
     order by cp.name, cpr.finish_key nulls last`,
    [target.set_key, target.card_number, finish],
  );
  return result.rows;
}

function classify(row, target, masterFacts, liveTargetRows) {
  if (!target) return 'blocked_unparsed_external_id';
  if (masterFacts.length === 0) return 'blocked_no_master_target';
  const matchingChildren = liveTargetRows.filter((live) => live.card_printing_id);
  if (matchingChildren.length === 1) return 'transfer_ready_existing_target_child';
  if (matchingChildren.length > 1) return 'blocked_multiple_target_children';
  if (liveTargetRows.length > 0) return 'blocked_target_parent_exists_child_missing';
  return 'blocked_target_parent_missing';
}

function buildMarkdown(report) {
  return `# PKG-31A External ID Relocation Readiness V1

Read-only readiness for dependency-blocked unsupported child rows whose only dependency is an external printing mapping.

This report does not authorize a real apply. No DB writes were committed. No migrations were created.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['source_readiness_fingerprint', report.source_readiness_fingerprint],
    ['input_rows', report.summary.input_rows],
    ['transfer_ready_existing_target_child', report.summary.by_classification.transfer_ready_existing_target_child ?? 0],
    ['blocked_no_master_target', report.summary.by_classification.blocked_no_master_target ?? 0],
    ['db_writes_committed', false],
    ['migrations_created', false],
  ])}

## Ready Rows By Target Rule

${markdownTable(['target_rule', 'count'], Object.entries(report.summary.ready_by_target_rule).map(([key, value]) => [key, value]))}

## Blocked Rows By Target Rule

${markdownTable(['target_rule', 'count'], Object.entries(report.summary.blocked_by_target_rule).map(([key, value]) => [key, value]))}

## Blocked Rows

${markdownTable(
    ['classification', 'source', 'external_id', 'parsed_target', 'reason'],
    report.rows
      .filter((row) => row.classification !== 'transfer_ready_existing_target_child')
      .map((row) => [
        row.classification,
        `${row.source.set_code} ${row.source.number} ${row.source.card_name} ${row.source.finish_key}`,
        row.external_mapping.external_id,
        row.target ? `${row.target.set_key} ${row.target.card_number}` : '',
        row.reason,
      ]),
  )}
`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const master = await readJson(PRINTINGS_JSON);
  const masterIndex = buildMasterFactIndex(master.printings ?? []);
  const conn = connectionString();
  if (!conn) throw new Error('Database connection unavailable');

  const client = new Client({ connectionString: conn });
  await client.connect();
  const rows = [];
  try {
    await client.query('begin read only');
    for (const row of (source.rows ?? []).filter((sourceRow) => sourceRow.external_mappings?.[0])) {
      const target = targetFromExternalId(row);
      const masterFacts = target ? (masterIndex.get(masterFactKey(target.set_key, target.card_number, row.finish_key)) ?? []) : [];
      const liveTargetRows = target ? await loadLiveTarget(client, target, row.finish_key) : [];
      const classification = classify(row, target, masterFacts, liveTargetRows);
      const targetChildRows = liveTargetRows.filter((live) => live.card_printing_id);
      rows.push({
        classification,
        reason: classification === 'transfer_ready_existing_target_child'
          ? 'external ID resolves to one Master-verified target child that already exists'
          : classification === 'blocked_no_master_target'
            ? 'external ID target does not exist as a Master-verified printing'
            : 'external ID target is not safe for deterministic relocation',
        source: {
          card_print_id: row.card_print_id,
          card_printing_id: row.card_printing_id,
          set_code: row.set_code,
          number: row.number,
          number_plain: row.number_plain,
          card_name: row.card_name,
          finish_key: row.finish_key,
        },
        external_mapping: row.external_mappings[0],
        target,
        master_facts: masterFacts.map((fact) => ({
          set_key: fact.set_key,
          card_number: fact.card_number,
          card_name: fact.card_name,
          finish_key: fact.finish_key,
          status: fact.status,
          source_count: fact.source_count,
        })),
        target_child: targetChildRows.length === 1 ? targetChildRows[0] : null,
        live_target_rows: liveTargetRows,
      });
    }
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  const byClassification = {};
  const readyByTargetRule = {};
  const blockedByTargetRule = {};
  const bySet = {};
  for (const row of rows) {
    byClassification[row.classification] = (byClassification[row.classification] ?? 0) + 1;
    bySet[row.source.set_code] = (bySet[row.source.set_code] ?? 0) + 1;
    const rule = row.target?.source ?? 'unparsed';
    if (row.classification === 'transfer_ready_existing_target_child') {
      readyByTargetRule[rule] = (readyByTargetRule[rule] ?? 0) + 1;
    } else {
      blockedByTargetRule[rule] = (blockedByTargetRule[rule] ?? 0) + 1;
    }
  }

  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: source.fingerprint,
    rows: rows.map((row) => ({
      classification: row.classification,
      source_card_printing_id: row.source.card_printing_id,
      mapping_id: row.external_mapping.id,
      target_card_printing_id: row.target_child?.card_printing_id ?? null,
      external_id: row.external_mapping.external_id,
    })),
  }));

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    fingerprint,
    source_readiness_fingerprint: source.fingerprint,
    safety: {
      db_writes_committed: false,
      migrations_created: false,
      real_apply_authorized: false,
    },
    summary: {
      input_rows: rows.length,
      by_classification: byClassification,
      ready_by_target_rule: readyByTargetRule,
      blocked_by_target_rule: blockedByTargetRule,
      by_set: bySet,
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    fingerprint,
    summary: report.summary,
    db_writes_committed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
