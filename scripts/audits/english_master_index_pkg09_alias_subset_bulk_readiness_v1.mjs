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
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg09_alias_subset_bulk_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg09_alias_subset_bulk_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg09_alias_subset_bulk_readiness_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-09-ALIAS-SUBSET-BULK-READINESS';
const TARGET_LANE = 'missing_set_or_set_alias';
const HOST_SET_CODES = {
  cel25c: ['cel25'],
  swsh12pt5gg: ['swsh12.5', 'swsh12pt5'],
};
const SET_LEVEL_BLOCKS = {
  exu: 'duplicate_with_ex10_unown_collection_identity_review_required',
};

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function topEntries(counts, limit = 20) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim()).map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function cardKey(setCode, number, name) {
  return [normalizeText(setCode), normalizeNumber(number), normalizeText(name)].join('|');
}

function numberKey(setCode, number) {
  return [normalizeText(setCode), normalizeNumber(number)].join('|');
}

function childKey(parentId, finishKey) {
  return [parentId, normalizeText(finishKey)].join('|');
}

function sourceExternalKey(source, externalId) {
  return [normalizeText(source), String(externalId ?? '').trim()].join('|');
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function externalIdFromUrl(url, source) {
  const text = String(url ?? '');
  if (source === 'tcgdex') {
    const match = text.match(/api\.tcgdex\.net\/v2\/en\/cards\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
  if (source === 'pokemonapi') {
    const match = text.match(/api\.pokemontcg\.io\/v2\/cards\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
  return null;
}

function externalIdsForRow(row) {
  const ids = [];
  for (const url of row.evidence_urls ?? []) {
    const tcgdex = externalIdFromUrl(url, 'tcgdex');
    if (tcgdex) ids.push({ source: 'tcgdex', external_id: tcgdex });
    const pokemonapi = externalIdFromUrl(url, 'pokemonapi');
    if (pokemonapi) ids.push({ source: 'pokemonapi', external_id: pokemonapi });
  }
  return uniqueSorted(ids.map((item) => `${item.source}|${item.external_id}`)).map((value) => {
    const [source, ...rest] = value.split('|');
    return { source, external_id: rest.join('|') };
  });
}

async function readLiveState() {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.',
      sets: [],
      parents: [],
      children: [],
      mappings: [],
      vaultRefs: [],
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const sets = await client.query(`
        select id::text as id, code, name, source
        from public.sets
        where game = 'pokemon'
      `);
    const parents = await client.query(`
        select id::text as id, set_id::text as set_id, set_code, number, number_plain, name
        from public.card_prints
      `);
    const children = await client.query(`
        select id::text as id, card_print_id::text as card_print_id, finish_key
        from public.card_printings
      `);
    const mappings = await client.query(`
        select id::text as id, source, external_id, card_print_id::text as card_print_id, active
        from public.external_mappings
      `);
    const vaultRefs = await client.query(`
        select card_id::text as card_print_id, count(*)::int as vault_items
        from public.vault_items
        group by card_id
      `);
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      sets: sets.rows,
      parents: parents.rows,
      children: children.rows,
      mappings: mappings.rows,
      vaultRefs: vaultRefs.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      sets: [],
      parents: [],
      children: [],
      mappings: [],
      vaultRefs: [],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildLiveIndexes(live) {
  const setsByCode = new Map();
  for (const set of live.sets) setsByCode.set(normalizeText(set.code), set);

  const parentsById = new Map(live.parents.map((parent) => [parent.id, parent]));
  const parentsByExact = new Map();
  const parentsByNumber = new Map();
  for (const parent of live.parents) {
    const numbers = uniqueSorted([parent.number, parent.number_plain].map(normalizeNumber));
    for (const number of numbers) {
      const exact = cardKey(parent.set_code, number, parent.name);
      if (!parentsByExact.has(exact)) parentsByExact.set(exact, []);
      parentsByExact.get(exact).push(parent);
      const nKey = numberKey(parent.set_code, number);
      if (!parentsByNumber.has(nKey)) parentsByNumber.set(nKey, []);
      parentsByNumber.get(nKey).push(parent);
    }
  }

  const childKeys = new Set(live.children.map((row) => childKey(row.card_print_id, row.finish_key)));
  const mappingsBySourceExternal = new Map();
  for (const mapping of live.mappings) {
    const key = sourceExternalKey(mapping.source, mapping.external_id);
    if (!mappingsBySourceExternal.has(key)) mappingsBySourceExternal.set(key, []);
    mappingsBySourceExternal.get(key).push(mapping);
  }
  const vaultRefsByParent = new Map(live.vaultRefs.map((row) => [row.card_print_id, Number(row.vault_items ?? 0)]));

  return {
    setsByCode,
    parentsById,
    parentsByExact,
    parentsByNumber,
    childKeys,
    mappingsBySourceExternal,
    vaultRefsByParent,
  };
}

function classifyRows({ sourceRows, indexes }) {
  const rows = [];
  for (const row of sourceRows) {
    const targetSet = indexes.setsByCode.get(normalizeText(row.set_key));
    const targetExactParents = indexes.parentsByExact.get(cardKey(row.set_key, row.card_number, row.card_name)) ?? [];
    const targetSameNumberParents = indexes.parentsByNumber.get(numberKey(row.set_key, row.card_number)) ?? [];
    const hostCodes = HOST_SET_CODES[row.set_key] ?? [];
    const hostExactParents = hostCodes.flatMap((hostCode) => (
      indexes.parentsByExact.get(cardKey(hostCode, row.card_number, row.card_name)) ?? []
    ));
    const externalIds = externalIdsForRow(row);
    const mappingCollisions = externalIds.flatMap((item) => (
      indexes.mappingsBySourceExternal.get(sourceExternalKey(item.source, item.external_id)) ?? []
    ));
    const hostParentIds = new Set(hostExactParents.map((parent) => parent.id));
    const targetOrphanParents = mappingCollisions
      .map((mapping) => indexes.parentsById.get(mapping.card_print_id))
      .filter((parent) => (
        parent
        && normalizeText(parent.set_id) === normalizeText(targetSet?.id)
        && !normalizeText(parent.set_code)
        && normalizeNumber(parent.number_plain ?? parent.number) === normalizeNumber(row.card_number)
        && normalizeText(parent.name) === normalizeText(row.card_name)
      ));
    const targetOrphanIds = new Set(targetOrphanParents.map((parent) => parent.id));
    const externalCollisionsOutsideHost = mappingCollisions.filter((mapping) => !hostParentIds.has(mapping.card_print_id));

    let readiness_lane = 'blocked_manual_review_required';
    let allowed_write_shape = 'none';
    let blocked_reason = null;

    if (SET_LEVEL_BLOCKS[row.set_key]) {
      blocked_reason = SET_LEVEL_BLOCKS[row.set_key];
    } else if (!targetSet) {
      blocked_reason = 'target_set_row_missing';
    } else if (targetExactParents.length > 0) {
      blocked_reason = 'target_parent_already_exists_recheck_lane';
    } else if (hostExactParents.length > 1) {
      blocked_reason = 'multiple_host_parent_matches';
    } else if (hostExactParents.length === 1) {
      const hostParent = hostExactParents[0];
      const childExists = indexes.childKeys.has(childKey(hostParent.id, row.finish_key));
      if (!childExists) {
        readiness_lane = 'host_parent_relocation_plus_child_insert_candidate';
        allowed_write_shape = 'parent set_id/set_code update + child insert only';
      } else {
        readiness_lane = 'host_parent_relocation_candidate';
        allowed_write_shape = 'parent set_id/set_code update only; child rows preserved';
      }
    } else if (targetOrphanParents.length === 1) {
      const targetOrphan = targetOrphanParents[0];
      const childExists = indexes.childKeys.has(childKey(targetOrphan.id, row.finish_key));
      if (!childExists) {
        readiness_lane = 'target_orphan_parent_set_code_backfill_plus_child_insert_candidate';
        allowed_write_shape = 'parent set_code backfill + child insert only';
      } else {
        readiness_lane = 'target_orphan_parent_set_code_backfill_candidate';
        allowed_write_shape = 'parent set_code backfill only; child rows preserved';
      }
    } else if (targetOrphanParents.length > 1) {
      blocked_reason = 'multiple_target_orphan_parent_matches';
    } else if (targetSameNumberParents.length > 0) {
      blocked_reason = 'target_set_same_number_parent_name_mismatch';
    } else if (externalCollisionsOutsideHost.filter((mapping) => !targetOrphanIds.has(mapping.card_print_id)).length > 0) {
      blocked_reason = 'external_mapping_collision_outside_target_or_host';
    } else if (externalIds.length === 0) {
      blocked_reason = 'no_stable_external_id_for_parent_insert';
    } else {
      readiness_lane = 'existing_set_parent_child_insert_candidate';
      allowed_write_shape = 'parent insert + child insert + external mapping insert only';
    }

    rows.push({
      readiness_lane,
      allowed_write_shape,
      blocked_reason,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_count: row.source_count,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
      target_set_id: targetSet?.id ?? null,
      host_set_codes_checked: hostCodes,
      host_parent_matches: hostExactParents.map((parent) => ({
        card_print_id: parent.id,
        set_id: parent.set_id,
        set_code: parent.set_code,
        number: parent.number,
        number_plain: parent.number_plain,
        name: parent.name,
        child_finish_present: indexes.childKeys.has(childKey(parent.id, row.finish_key)),
        vault_items: indexes.vaultRefsByParent.get(parent.id) ?? 0,
      })),
      target_orphan_parent_matches: targetOrphanParents.map((parent) => ({
        card_print_id: parent.id,
        set_id: parent.set_id,
        set_code: parent.set_code,
        number: parent.number,
        number_plain: parent.number_plain,
        name: parent.name,
        child_finish_present: indexes.childKeys.has(childKey(parent.id, row.finish_key)),
        vault_items: indexes.vaultRefsByParent.get(parent.id) ?? 0,
      })),
      target_same_number_parent_count: targetSameNumberParents.length,
      target_same_number_live_names: targetSameNumberParents.slice(0, 5).map((parent) => parent.name),
      target_exact_parent_count: targetExactParents.length,
      external_ids: externalIds,
      external_mapping_collision_count: mappingCollisions.length,
      external_collisions_outside_host_count: externalCollisionsOutsideHost.length,
      external_mapping_collisions: mappingCollisions.slice(0, 10).map((mapping) => ({
        source: mapping.source,
        external_id: mapping.external_id,
        card_print_id: mapping.card_print_id,
        active: mapping.active,
      })),
    });
  }
  const plannedParentKeys = new Set(rows
    .filter((row) => [
      'existing_set_parent_child_insert_candidate',
      'target_orphan_parent_set_code_backfill_candidate',
      'target_orphan_parent_set_code_backfill_plus_child_insert_candidate',
    ].includes(row.readiness_lane))
    .map(parentInsertKey));
  for (const row of rows) {
    if (row.blocked_reason !== 'no_stable_external_id_for_parent_insert') continue;
    if (!plannedParentKeys.has(parentInsertKey(row))) continue;
    row.readiness_lane = 'planned_parent_extra_child_insert_candidate';
    row.allowed_write_shape = 'child insert under planned parent only';
    row.blocked_reason = null;
  }
  return rows;
}

function parentInsertKey(row) {
  return [row.set_key, normalizeNumber(row.card_number), normalizeText(row.card_name)].join('|');
}

function hostRelocationKey(row) {
  return row.host_parent_matches[0]?.card_print_id ?? `${row.set_key}|${row.card_number}|${row.card_name}`;
}

function summarize(rows, sourceRows, sourceFingerprint) {
  const parentInsertRows = rows.filter((row) => row.readiness_lane === 'existing_set_parent_child_insert_candidate');
  const relocationRows = rows.filter((row) => row.readiness_lane === 'host_parent_relocation_candidate');
  const relocationPlusChildRows = rows.filter((row) => row.readiness_lane === 'host_parent_relocation_plus_child_insert_candidate');
  const orphanBackfillRows = rows.filter((row) => row.readiness_lane === 'target_orphan_parent_set_code_backfill_candidate');
  const orphanBackfillPlusChildRows = rows.filter((row) => row.readiness_lane === 'target_orphan_parent_set_code_backfill_plus_child_insert_candidate');
  const plannedParentExtraChildRows = rows.filter((row) => row.readiness_lane === 'planned_parent_extra_child_insert_candidate');
  const blockedRows = rows.filter((row) => row.blocked_reason);
  const parentInsertParents = new Set(parentInsertRows.map(parentInsertKey));
  const relocationParents = new Set([...relocationRows, ...relocationPlusChildRows].map(hostRelocationKey));
  const orphanBackfillParents = new Set([...orphanBackfillRows, ...orphanBackfillPlusChildRows].map((row) => (
    row.target_orphan_parent_matches[0]?.card_print_id ?? parentInsertKey(row)
  )));
  const targetParentUpdatesBySet = {};
  for (const row of [...relocationRows, ...relocationPlusChildRows]) {
    targetParentUpdatesBySet[row.set_key] = (targetParentUpdatesBySet[row.set_key] ?? 0) + 1;
  }

  const scope = {
    package_id: 'PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE',
    source_rows: sourceRows.length,
    candidate_rows: rows.length - blockedRows.length,
    blocked_rows: blockedRows.length,
    parent_set_code_update_rows: relocationParents.size + orphanBackfillParents.size,
    parent_insert_rows: parentInsertParents.size,
    child_insert_rows: parentInsertRows.length + relocationPlusChildRows.length + orphanBackfillPlusChildRows.length + plannedParentExtraChildRows.length,
    child_rows_preserved_by_parent_relocation: relocationRows.length + orphanBackfillRows.length,
    external_mapping_insert_rows: [...new Set(parentInsertRows.flatMap((row) => row.external_ids.map((item) => `${parentInsertKey(row)}|${item.source}|${item.external_id}`)))].length,
    target_sets: uniqueSorted(rows.map((row) => row.set_key)),
    allowed_write_shapes: uniqueSorted(rows.filter((row) => !row.blocked_reason).map((row) => row.allowed_write_shape)),
  };

  const packageFingerprint = sha256(stableJson({
    package_id: scope.package_id,
    source_fingerprint: sourceFingerprint,
    rows: rows.map((row) => ({
      readiness_lane: row.readiness_lane,
      blocked_reason: row.blocked_reason,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      host_parent_ids: row.host_parent_matches.map((match) => match.card_print_id),
      external_ids: row.external_ids,
    })),
    scope,
  }));

  return {
    source_rows: sourceRows.length,
    classified_rows: rows.length,
    source_fingerprint_sha256: sourceFingerprint,
    package_fingerprint_sha256: packageFingerprint,
    by_readiness_lane: countBy(rows, (row) => row.readiness_lane),
    by_blocked_reason: countBy(blockedRows, (row) => row.blocked_reason),
    by_set: countBy(rows, (row) => row.set_key),
    by_set_and_lane: countBy(rows, (row) => `${row.set_key}|${row.readiness_lane}`),
    by_finish: countBy(rows, (row) => row.finish_key),
    scope,
    top_sets: topEntries(countBy(rows, (row) => row.set_key)),
  };
}

function renderMarkdown(report) {
  const laneRows = Object.entries(report.summary.by_readiness_lane).map(([lane, count]) => [
    lane,
    count,
  ]);
  const setRows = Object.entries(report.summary.by_set_and_lane).map(([key, count]) => {
    const [setKey, lane] = key.split('|');
    return [setKey, lane, count];
  });
  const scope = report.summary.scope;
  const sampleRows = report.rows.slice(0, 60).map((row) => [
    row.readiness_lane,
    row.blocked_reason ?? '',
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.host_parent_matches.map((match) => `${match.set_code}:${match.card_print_id}`).join(', '),
    row.external_ids.map((item) => `${item.source}:${item.external_id}`).join(', '),
  ]);

  return `# PKG-09 Alias / Subset Bulk Readiness V1

Read-only readiness package for the remaining Master Index rows in \`${TARGET_LANE}\`.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- apply_paths_executed: ${report.apply_paths_executed}

## Bulk Package

- recommended_package_id: ${scope.package_id}
- package_fingerprint_sha256: \`${report.summary.package_fingerprint_sha256}\`
- source_rows: ${scope.source_rows}
- candidate_rows: ${scope.candidate_rows}
- blocked_rows: ${scope.blocked_rows}
- parent_set_code_update_rows: ${scope.parent_set_code_update_rows}
- parent_insert_rows: ${scope.parent_insert_rows}
- child_insert_rows: ${scope.child_insert_rows}
- child_rows_preserved_by_parent_relocation: ${scope.child_rows_preserved_by_parent_relocation}
- external_mapping_insert_rows: ${scope.external_mapping_insert_rows}
- target_sets: ${scope.target_sets.join(', ')}

## Classification

${markdownTable(['readiness_lane', 'rows'], laneRows)}

## By Set

${markdownTable(['set_key', 'readiness_lane', 'rows'], setRows)}

## Recommended Next Step

Build one rollback-only guarded dry-run transaction for \`${scope.package_id}\` only if the operator accepts this mixed but bounded write shape:

- parent set_id/set_code updates for host-subset parents
- parent inserts for missing parents in existing special sets
- child inserts for newly inserted parents or host parents missing a child
- external mapping inserts only for newly inserted parents

No deletes, no merges, no unsupported cleanup, no migrations, no global apply.

## Sample Rows

${markdownTable(['lane', 'blocked_reason', 'set', 'number', 'card', 'finish', 'host_parent', 'external_ids'], sampleRows.map((row) => row.map(mdEscape)))}
`;
}

async function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-09 Alias / Subset Bulk Readiness Checkpoint V1](20260610_pkg09_alias_subset_bulk_readiness_checkpoint_v1.md) | Read-only bulk readiness for remaining missing-set/subset rows; scopes parent set-code updates plus parent/child inserts for one future guarded dry-run, with no writes or migrations. |';
  let current = '';
  try {
    current = await fs.readFile(indexPath, 'utf8');
  } catch {
    current = '# Master Index Checkpoint Index\n\n| date | checkpoint | notes |\n| --- | --- | --- |\n';
  }
  if (!current.includes('20260610_pkg09_alias_subset_bulk_readiness_checkpoint_v1.md')) {
    current = `${current.trimEnd()}\n${line}\n`;
    await writeText(indexPath, current);
  }
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const sourceRows = (source.rows ?? []).filter((row) => row.lane === TARGET_LANE);
  const sourceFingerprint = sha256(stableJson(sourceRows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    sources: row.sources,
    evidence_urls: row.evidence_urls,
  }))));
  const live = await readLiveState();
  const indexes = buildLiveIndexes(live);
  const rows = classifyRows({ sourceRows, indexes });
  const summary = summarize(rows, sourceRows, sourceFingerprint);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg09_alias_subset_bulk_readiness_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    live_read: {
      available: live.available,
      reason: live.reason,
      sets_read: live.sets.length,
      parents_read: live.parents.length,
      children_read: live.children.length,
      mappings_read: live.mappings.length,
    },
    host_set_code_policy: HOST_SET_CODES,
    summary,
    rows,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  const checkpoint = `# PKG-09 Alias / Subset Bulk Readiness Checkpoint V1

- package_id: ${PACKAGE_ID}
- recommended_package_id: ${summary.scope.package_id}
- package_fingerprint_sha256: \`${summary.package_fingerprint_sha256}\`
- source_rows: ${summary.scope.source_rows}
- candidate_rows: ${summary.scope.candidate_rows}
- blocked_rows: ${summary.scope.blocked_rows}
- parent_set_code_update_rows: ${summary.scope.parent_set_code_update_rows}
- parent_insert_rows: ${summary.scope.parent_insert_rows}
- child_insert_rows: ${summary.scope.child_insert_rows}
- external_mapping_insert_rows: ${summary.scope.external_mapping_insert_rows}
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

Next: build one rollback-only guarded dry-run for \`${summary.scope.package_id}\` if this bulk scope remains acceptable.
`;
  await writeText(CHECKPOINT_MD, checkpoint);
  await updateCheckpointIndex();
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    checkpoint_md: path.relative(ROOT, CHECKPOINT_MD),
    summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
