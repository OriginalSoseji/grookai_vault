import fsSync from 'node:fs';
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
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08h_external_mapping_collision_adjudication_v1.json');
const MASTER_PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08k_suffix_collision_split_strategy_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08k_suffix_collision_split_strategy_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08k_suffix_collision_split_strategy_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08K-SUFFIX-COLLISION-SPLIT-STRATEGY';

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function baseNumber(number) {
  return String(number ?? '').replace(/[a-z]+$/i, '');
}

async function loadLiveRows(cardPrintIds) {
  const conn = connectionString();
  if (!conn || cardPrintIds.length === 0) return { available: Boolean(conn), reason: conn ? null : 'database_connection_unavailable', rows: [] };
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_id::text,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.variant_key,
         cp.external_ids,
         cp.ai_metadata,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'card_printing_id', cpr.id::text,
             'finish_key', cpr.finish_key,
             'provenance_source', cpr.provenance_source,
             'provenance_ref', cpr.provenance_ref,
             'created_by', cpr.created_by
           ) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as child_printings,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'external_mapping_id', em.id::text,
             'source', em.source,
             'external_id', em.external_id
           ) order by em.source, em.external_id, em.id)
           from public.external_mappings em
           where em.card_print_id = cp.id
         ), '[]'::jsonb) as external_mappings,
         coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count,
         coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id), 0) as vault_item_instance_count
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.set_code, cp.number, cp.name, cp.id`,
      [cardPrintIds],
    );
    await client.query('rollback');
    return { available: true, reason: null, rows: result.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function masterFinishes(masterPrintings, { setKey, cardNumber, cardName }) {
  return [...new Set((masterPrintings.printings ?? [])
    .filter((row) => (
      row.status === 'master_verified' &&
      row.set_key === setKey &&
      String(row.card_number) === String(cardNumber) &&
      normalizeText(row.card_name) === normalizeText(cardName)
    ))
    .map((row) => row.finish_key))]
    .sort();
}

function classify({ sourceRow, liveRow, masterPrintings }) {
  const suffixNumber = sourceRow.card_number;
  const rootNumber = baseNumber(suffixNumber);
  const baseFinishes = masterFinishes(masterPrintings, {
    setKey: sourceRow.set_key,
    cardNumber: rootNumber,
    cardName: sourceRow.card_name,
  });
  const suffixFinishes = masterFinishes(masterPrintings, {
    setKey: sourceRow.set_key,
    cardNumber: suffixNumber,
    cardName: sourceRow.card_name,
  });
  const liveFinishes = [...new Set((liveRow?.child_printings ?? []).map((row) => row.finish_key))].sort();
  const finishesNeededOnBase = baseFinishes.filter((finish) => !liveFinishes.includes(finish));
  const finishesNeededOnSuffix = suffixFinishes;
  const unsupportedOnMergedParent = liveFinishes.filter((finish) => !baseFinishes.includes(finish) && !suffixFinishes.includes(finish));
  const overlappingFinishes = liveFinishes.filter((finish) => baseFinishes.includes(finish) && suffixFinishes.includes(finish));

  let split_readiness = 'blocked_split_parent_required';
  let recommended_next_action = 'Do not update the existing parent number. Existing live parent must remain available for the base card while a suffix parent is introduced separately.';
  if (baseFinishes.length === 0 || suffixFinishes.length === 0) {
    split_readiness = 'blocked_master_base_or_suffix_missing';
    recommended_next_action = 'Do not write until both base and suffix identities are master verified.';
  } else if ((liveRow?.vault_item_count ?? 0) > 0 || (liveRow?.vault_item_instance_count ?? 0) > 0) {
    split_readiness = 'blocked_vault_dependency_review_required';
    recommended_next_action = 'Vault references require explicit split semantics before parent or child movement.';
  }

  return {
    split_readiness,
    recommended_next_action,
    future_write_shape_if_approved_later: {
      create_suffix_parent: true,
      transfer_tcgdex_mapping_to_suffix_parent: true,
      insert_suffix_child_printings: finishesNeededOnSuffix,
      preserve_existing_parent_as_base_number: true,
      insert_missing_base_child_printings: finishesNeededOnBase,
      unsupported_child_cleanup_deferred: unsupportedOnMergedParent,
      delete_existing_parent: false,
      global_apply: false,
    },
    set_key: sourceRow.set_key,
    set_name: sourceRow.set_name,
    card_name: sourceRow.card_name,
    base_card_number: rootNumber,
    suffix_card_number: suffixNumber,
    tcgdex_external_id: sourceRow.tcgdex_external_id,
    finish_key_from_gap: sourceRow.finish_key,
    live_parent: liveRow ? {
      card_print_id: liveRow.card_print_id,
      set_id: liveRow.set_id,
      set_code: liveRow.set_code,
      number: liveRow.number,
      number_plain: liveRow.number_plain,
      name: liveRow.name,
      external_mappings: liveRow.external_mappings,
      child_printings: liveRow.child_printings,
      vault_item_count: liveRow.vault_item_count,
      vault_item_instance_count: liveRow.vault_item_instance_count,
    } : null,
    master_truth: {
      base_finishes: baseFinishes,
      suffix_finishes: suffixFinishes,
      both_base_and_suffix_master_verified: baseFinishes.length > 0 && suffixFinishes.length > 0,
    },
    live_vs_master: {
      live_finishes: liveFinishes,
      overlapping_finishes: overlappingFinishes,
      unsupported_on_merged_parent: unsupportedOnMergedParent,
      finishes_needed_on_base: finishesNeededOnBase,
      finishes_needed_on_suffix: finishesNeededOnSuffix,
    },
    sources: sourceRow.sources ?? [],
    evidence_urls: sourceRow.evidence_urls ?? [],
  };
}

function renderMarkdown(report) {
  const rows = report.rows.map((row) => [
    row.set_key,
    row.base_card_number,
    row.suffix_card_number,
    row.card_name,
    row.split_readiness,
    row.master_truth.base_finishes.join(', '),
    row.master_truth.suffix_finishes.join(', '),
    row.live_vs_master.live_finishes.join(', '),
    row.live_vs_master.unsupported_on_merged_parent.join(', '),
  ]);
  return `# PKG-08K Suffix Collision Split Strategy V1

Read-only split strategy for suffix-number cards that are currently represented by a base-number live parent.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- split_parent_required_rows: ${report.summary.split_parent_required_rows}
- by_split_readiness: ${JSON.stringify(report.summary.by_split_readiness)}

${markdownTable(['set', 'base', 'suffix', 'card', 'readiness', 'base finishes', 'suffix finishes', 'live finishes', 'unsupported on merged'], rows)}

## Conclusion

These rows must not be handled as a simple parent number update. The base card and suffix card are both master-verified identities.
Future repair requires a separate guarded split package that preserves the base parent, creates a suffix parent, transfers the suffix mapping, and handles child printings with cleanup deferred unless separately approved.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08K Suffix Collision Split Strategy Checkpoint V1](20260610_pkg08k_suffix_collision_split_strategy_checkpoint_v1.md) | Read-only split strategy for suffix-number collision rows; blocks simple parent number update. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08k_suffix_collision_split_strategy_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08k_suffix_collision_split_strategy_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const masterPrintings = await readJson(MASTER_PRINTINGS_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.adjudication_lane === 'number_suffix_identity_modifier_candidate');
const live = await loadLiveRows([...new Set(sourceRows.map((row) => row.mapped_parent?.card_print_id).filter(Boolean))]);
const liveById = new Map(live.rows.map((row) => [row.card_print_id, row]));
const rows = sourceRows.map((row) => classify({
  sourceRow: row,
  liveRow: liveById.get(row.mapped_parent?.card_print_id),
  masterPrintings,
}));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08k_suffix_collision_split_strategy_v1',
  package_id: PACKAGE_ID,
  source_adjudication_package_id: source.package_id,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  live_read: {
    available: live.available,
    reason: live.reason,
    rows_read: live.rows.length,
  },
  summary: {
    source_rows: sourceRows.length,
    split_parent_required_rows: rows.filter((row) => row.split_readiness === 'blocked_split_parent_required').length,
    by_split_readiness: countBy(rows, (row) => row.split_readiness),
    rows_with_unsupported_child_cleanup_deferred: rows.filter((row) => row.live_vs_master.unsupported_on_merged_parent.length > 0).length,
  },
  rows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  summary: report.summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
