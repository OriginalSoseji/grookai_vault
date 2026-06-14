import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

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

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'english_master_index_pkg05a_missing_set_insert_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'english_master_index_pkg05a_missing_set_insert_readiness_v1.md');
const PACKAGE_ID = 'PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS';
const TARGET_MIN_BUCKET_SIZE = 5;
const MAX_BUCKET_SIZE = 10;

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(filePath, data) {
  await fs.writeFile(filePath, data);
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

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
    .sort((left, right) => left.localeCompare(right));
}

function aliasValuesForSet(set) {
  return uniqueSorted([
    set.key,
    set.set_name,
    set.pokemontcg,
    set.tcgdex,
    ...(set.manual_aliases ?? []),
    set.source_aliases?.pokemontcg_api,
    set.source_aliases?.tcgdex,
    set.source_aliases?.official_checklist_pdf,
    set.source_aliases?.official_pokemon_checklist,
    set.source_aliases?.thepricedex,
    set.source_aliases?.thepricedex_price_list,
    set.source_aliases?.pkmncards,
    set.source_aliases?.bulbapedia,
    set.source_aliases?.bulbapedia_set_list,
  ].map(normalizeText));
}

function cardKey(number, name) {
  return [normalizeNumber(number), normalizeText(name)].join('|');
}

function factKey(setKey, number, name, finishKey) {
  return [normalizeText(setKey), normalizeNumber(number), normalizeText(name), String(finishKey ?? '').trim()].join('|');
}

function extractTcgdexCardIds(rows) {
  const ids = [];
  for (const row of rows) {
    for (const url of row.evidence_urls ?? []) {
      const match = String(url).match(/api\.tcgdex\.net\/v2\/en\/cards\/([^/?#]+)/i);
      if (match?.[1]) ids.push(match[1]);
    }
  }
  return uniqueSorted(ids);
}

function groupBySet(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  return grouped;
}

async function readLiveState() {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      sets: [],
      parents: [],
      externalMappings: [],
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const [sets, parents] = await Promise.all([
      client.query(`
        select
          id::text as id,
          code,
          name,
          source
        from public.sets
        where game = 'pokemon'
      `),
      client.query(`
        select
          id::text as id,
          set_id::text as set_id,
          set_code,
          number,
          number_plain,
          name,
          external_ids
        from public.card_prints
      `),
    ]);
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      sets: sets.rows,
      parents: parents.rows,
      externalMappings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Read-only live state read failed: ${error.message}`,
      sets: [],
      parents: [],
      externalMappings: [],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function readExternalMappingCollisions(externalIds) {
  const conn = connectionString();
  if (!conn || externalIds.length === 0) return { available: Boolean(conn), rows: [] };
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select source, external_id, card_print_id::text as card_print_id, active
       from public.external_mappings
       where source = 'tcgdex'
         and external_id = any($1::text[])`,
      [externalIds],
    );
    await client.query('rollback');
    return { available: true, rows: result.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function liveSetAliases(row) {
  return uniqueSorted([
    row.code,
    row.name,
    row.source?.tcgdex?.id,
    row.source?.tcgdex?.name,
    row.source?.pokemontcg?.id,
    row.source?.pokemontcg?.name,
  ].map(normalizeText));
}

function buildLiveIndexes(live) {
  const liveSetsByAlias = new Map();
  for (const row of live.sets) {
    for (const alias of liveSetAliases(row)) {
      if (!alias) continue;
      if (!liveSetsByAlias.has(alias)) liveSetsByAlias.set(alias, []);
      liveSetsByAlias.get(alias).push(row);
    }
  }

  const parentsBySetCode = new Map();
  for (const row of live.parents) {
    const setCode = normalizeText(row.set_code);
    if (!setCode) continue;
    if (!parentsBySetCode.has(setCode)) parentsBySetCode.set(setCode, []);
    parentsBySetCode.get(setCode).push(row);
  }

  return { liveSetsByAlias, parentsBySetCode };
}

function duplicatePlannedCards(cards) {
  const counts = new Map();
  for (const card of cards) {
    const key = cardKey(card.card_number, card.card_name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));
}

function duplicatePlannedPrintings(printings) {
  const counts = new Map();
  for (const printing of printings) {
    const key = factKey(printing.set_key, printing.card_number, printing.card_name, printing.finish_key);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));
}

function buildCandidateRows({ sets, cards, printings, liveIndexes }) {
  const cardsBySet = groupBySet(cards);
  const printingsBySet = groupBySet(printings);
  const rows = [];

  for (const set of sets) {
    const setCards = cardsBySet.get(set.key) ?? [];
    const setPrintings = printingsBySet.get(set.key) ?? [];
    const aliases = aliasValuesForSet(set);
    const liveSetCollisions = aliases.flatMap((alias) => liveIndexes.liveSetsByAlias.get(alias) ?? []);
    const liveParentCollisions = aliases.flatMap((alias) => liveIndexes.parentsBySetCode.get(alias) ?? []);
    const plannedCardDuplicates = duplicatePlannedCards(setCards);
    const plannedPrintingDuplicates = duplicatePlannedPrintings(setPrintings);
    const tcgdexCardIds = extractTcgdexCardIds(setPrintings);

    const exclusionReasons = [];
    if (setCards.length === 0) exclusionReasons.push('no_master_index_cards');
    if (setPrintings.length === 0) exclusionReasons.push('no_master_index_printings');
    if (setCards.some((row) => row.status !== 'master_verified')) exclusionReasons.push('not_all_cards_master_verified');
    if (setPrintings.some((row) => row.status !== 'master_verified')) exclusionReasons.push('not_all_printings_master_verified');
    if (liveSetCollisions.length > 0) exclusionReasons.push('live_set_collision_or_existing_set');
    if (liveParentCollisions.length > 0) exclusionReasons.push('live_parent_rows_present_for_set_alias');
    if (!set.source_aliases?.tcgdex && !set.tcgdex) exclusionReasons.push('tcgdex_alias_unavailable');
    if (tcgdexCardIds.length !== setCards.length) exclusionReasons.push('tcgdex_card_id_coverage_not_exact_parent_count');
    if (plannedCardDuplicates.length > 0) exclusionReasons.push('duplicate_planned_parent_identity');
    if (plannedPrintingDuplicates.length > 0) exclusionReasons.push('duplicate_planned_printing_identity');

    rows.push({
      set_key: set.key,
      set_name: set.set_name,
      aliases,
      tcgdex_set_id: set.source_aliases?.tcgdex ?? set.tcgdex ?? null,
      expected_parent_rows: setCards.length,
      expected_child_printings: setPrintings.length,
      expected_finish_counts: setPrintings.reduce((acc, row) => {
        acc[row.finish_key] = (acc[row.finish_key] ?? 0) + 1;
        return acc;
      }, {}),
      source_status: set.source_status ?? {},
      tcgdex_card_ids: tcgdexCardIds,
      collision_checks: {
        live_set_collisions: liveSetCollisions.map((row) => ({ id: row.id, code: row.code, name: row.name })),
        live_parent_rows_for_aliases: liveParentCollisions.slice(0, 25).map((row) => ({
          id: row.id,
          set_code: row.set_code,
          number: row.number_plain ?? row.number,
          name: row.name,
        })),
        live_parent_collision_count: liveParentCollisions.length,
        duplicate_planned_parent_identities: plannedCardDuplicates,
        duplicate_planned_printing_identities: plannedPrintingDuplicates,
      },
      exclusion_reasons: exclusionReasons,
      eligible_for_pkg05a: exclusionReasons.length === 0,
    });
  }

  return rows;
}

function selectBucket(candidates) {
  return candidates
    .filter((row) => row.eligible_for_pkg05a)
    .sort((left, right) => (
      left.expected_child_printings - right.expected_child_printings ||
      left.expected_parent_rows - right.expected_parent_rows ||
      left.set_key.localeCompare(right.set_key)
    ))
    .slice(0, MAX_BUCKET_SIZE);
}

function applyExternalMappingChecks(selected, mappingRows) {
  const mappingByExternalId = new Map();
  for (const row of mappingRows) {
    if (!mappingByExternalId.has(row.external_id)) mappingByExternalId.set(row.external_id, []);
    mappingByExternalId.get(row.external_id).push(row);
  }

  for (const set of selected) {
    const collisions = set.tcgdex_card_ids.flatMap((id) => mappingByExternalId.get(id) ?? []);
    set.collision_checks.external_mapping_collisions = collisions.map((row) => ({
      source: row.source,
      external_id: row.external_id,
      card_print_id: row.card_print_id,
      active: row.active,
    }));
    set.collision_checks.external_mapping_collision_count = collisions.length;
    if (collisions.length > 0) {
      set.eligible_for_pkg05a = false;
      set.exclusion_reasons.push('external_mapping_collision');
    }
  }
}

function buildFingerprint(selected) {
  const payload = selected.map((row) => ({
    set_key: row.set_key,
    set_name: row.set_name,
    tcgdex_set_id: row.tcgdex_set_id,
    expected_parent_rows: row.expected_parent_rows,
    expected_child_printings: row.expected_child_printings,
    expected_finish_counts: row.expected_finish_counts,
    tcgdex_card_ids: row.tcgdex_card_ids,
  }));
  return sha256(stableJson(payload));
}

function buildMarkdown(report) {
  const selectedRows = report.selected_sets.map((row) => [
    row.set_key,
    row.set_name,
    row.expected_parent_rows,
    row.expected_child_printings,
    JSON.stringify(row.expected_finish_counts),
    row.collision_checks.external_mapping_collision_count ?? 0,
  ]);
  const exclusionRows = report.exclusions_by_reason.flatMap(([reason, rows]) => (
    rows.slice(0, 20).map((row) => [reason, row.set_key, row.set_name, row.expected_parent_rows, row.expected_child_printings])
  ));
  return `# PKG-05A Missing Master-Verified Set Inserts Readiness V1

This is a read-only bucket plan. It does not execute apply, create migrations, delete rows, merge rows, run cleanup, or perform identity modifier work.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- apply_paths_executed: ${report.apply_paths_executed}
- write_ready_now: ${report.write_ready_now}

## Bucket

- package_id: ${report.package_id}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- target_bucket_size_range: ${report.target_bucket_size_range.min}-${report.target_bucket_size_range.max}
- recommended_bucket_size: ${report.recommended_bucket_size}
- recommended_bucket_size_reason: ${report.recommended_bucket_size_reason}
- selected_set_count: ${report.summary.selected_set_count}
- expected_parent_rows: ${report.summary.selected_expected_parent_rows}
- expected_child_printings: ${report.summary.selected_expected_child_printings}

## Selected Sets

${selectedRows.length ? markdownTable(['set_key', 'set_name', 'expected_parent_rows', 'expected_child_printings', 'finish_counts', 'external_mapping_collisions'], selectedRows) : 'No sets selected.'}

## Exclusion Summary

${markdownTable(['reason', 'count'], report.exclusions_by_reason.map(([reason, rows]) => [reason, rows.length]))}

## Exclusion Samples

${exclusionRows.length ? markdownTable(['reason', 'set_key', 'set_name', 'expected_parent_rows', 'expected_child_printings'], exclusionRows) : 'No exclusions.'}

## Stop Rules

${report.stop_rules.map((item) => `- ${item}`).join('\n')}
`;
}

async function main() {
  const [setsArtifact, cardsArtifact, printingsArtifact, postChaosReadiness] = await Promise.all([
    readJson('english_master_index_sets_v1.json'),
    readJson('english_master_index_cards_v1.json'),
    readJson('english_master_index_printings_v1.json'),
    readJson('english_master_index_post_pkg02_write_class_readiness_v1.json'),
  ]);

  const sets = setsArtifact.sets ?? [];
  const cards = cardsArtifact.cards ?? [];
  const printings = printingsArtifact.printings ?? [];
  const live = await readLiveState();
  const liveIndexes = buildLiveIndexes(live);
  const allCandidateRows = buildCandidateRows({ sets, cards, printings, liveIndexes });
  let selected = selectBucket(allCandidateRows);
  const externalIds = uniqueSorted(selected.flatMap((row) => row.tcgdex_card_ids));
  const externalMappingCheck = await readExternalMappingCollisions(externalIds);
  applyExternalMappingChecks(selected, externalMappingCheck.rows ?? []);
  selected = selected.filter((row) => row.eligible_for_pkg05a).slice(0, TARGET_MIN_BUCKET_SIZE);
  const recommendedBucketSize = selected.length;

  const exclusionsByReasonMap = new Map();
  for (const row of allCandidateRows.filter((item) => !item.eligible_for_pkg05a || !selected.some((set) => set.set_key === item.set_key))) {
    const reasons = row.exclusion_reasons.length ? row.exclusion_reasons : ['eligible_but_not_in_first_recommended_bucket'];
    for (const reason of reasons) {
      if (!exclusionsByReasonMap.has(reason)) exclusionsByReasonMap.set(reason, []);
      exclusionsByReasonMap.get(reason).push(row);
    }
  }

  const packageFingerprint = buildFingerprint(selected);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg05a_missing_set_insert_readiness_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    scope_lock: {
      insert_only: true,
      no_deletes: true,
      no_merges: true,
      no_unsupported_cleanup: true,
      no_identity_modifier_work: true,
      no_migrations: true,
    },
    source_context: {
      post_chaos_readiness_generated_at: postChaosReadiness.generated_at,
      post_chaos_missing_master_verified_from_grookai: postChaosReadiness.summary?.missing_master_verified_from_grookai ?? null,
      post_chaos_chaos_rising_missing_printings: postChaosReadiness.summary?.chaos_rising_missing_printings ?? null,
    },
    live_read: {
      available: live.available,
      reason: live.reason,
      live_set_rows_read: live.sets.length,
      live_parent_rows_read: live.parents.length,
      external_mapping_check_available: externalMappingCheck.available,
      external_mapping_check_reason: externalMappingCheck.reason ?? null,
    },
    target_bucket_size_range: { min: TARGET_MIN_BUCKET_SIZE, max: MAX_BUCKET_SIZE },
    recommended_bucket_size: recommendedBucketSize,
    recommended_bucket_size_reason: recommendedBucketSize < TARGET_MIN_BUCKET_SIZE
      ? 'Only four sets satisfy all PKG-05A insert-only guardrails. Do not pad the bucket with riskier sets.'
      : 'Use the first five eligible sets for the initial longer insert-only bucket.',
    maximum_bucket_size_considered: MAX_BUCKET_SIZE,
    package_fingerprint_sha256: packageFingerprint,
    summary: {
      total_master_index_sets: sets.length,
      eligible_insert_only_sets_before_external_mapping_check: allCandidateRows.filter((row) => row.eligible_for_pkg05a).length,
      selected_set_count: selected.length,
      selected_expected_parent_rows: selected.reduce((sum, row) => sum + row.expected_parent_rows, 0),
      selected_expected_child_printings: selected.reduce((sum, row) => sum + row.expected_child_printings, 0),
      selected_finish_counts: selected.reduce((acc, set) => {
        for (const [finish, count] of Object.entries(set.expected_finish_counts)) {
          acc[finish] = (acc[finish] ?? 0) + Number(count);
        }
        return acc;
      }, {}),
    },
    selected_sets: selected,
    exclusions_by_reason: [...exclusionsByReasonMap.entries()]
      .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0])),
    stop_rules: [
      'Do not execute apply from this report.',
      'Do not include any set with an existing live set row or live parent row collision.',
      'Do not include any set with external mapping collisions.',
      'Do not include sets with non-master-verified card or printing facts.',
      'Do not mix deletes, merges, unsupported cleanup, or identity modifier work into PKG-05A.',
      'A future apply package must create its own fresh snapshot, rollback proof, dry-run transaction artifact, and approval fingerprint.',
    ],
  };

  await writeJson(OUTPUT_JSON, report);
  await writeMarkdown(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    cleanup_performed: report.cleanup_performed,
    quarantine_performed: report.quarantine_performed,
  }, null, 2));
}

main().catch((error) => {
  console.error('[pkg05a][missing-set-insert-readiness] failed:', error?.message ?? error);
  process.exitCode = 1;
});
