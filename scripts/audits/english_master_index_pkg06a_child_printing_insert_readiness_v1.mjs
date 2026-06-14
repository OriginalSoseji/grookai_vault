import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'english_master_index_pkg06a_child_printing_insert_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'english_master_index_pkg06a_child_printing_insert_readiness_v1.md');

const PACKAGE_ID = 'PKG-06A-EXISTING-PARENT-CHILD-PRINTING-INSERTS';
const PKG05A_PENDING_SET_KEYS = new Set(['2023sv', '2024sv', 'mee', 'mfb']);
const RECOMMENDED_MAX_SETS = 10;
const RECOMMENDED_TARGET_MIN_CHILD_INSERTS = 300;
const RECOMMENDED_TARGET_MAX_CHILD_INSERTS = 500;

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
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

function addCount(target, key, count = 1) {
  const normalized = String(key ?? '').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function topEntries(object, limit = 30) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, value]) => ({ key, count: value }));
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

function parentKey(setCode, number, name) {
  return [normalizeText(setCode), normalizeNumber(number), normalizeText(name)].join('|');
}

function printingKey(setCode, number, name, finishKey) {
  return [
    normalizeText(setCode),
    normalizeNumber(number),
    normalizeText(name),
    normalizeFinishKey(finishKey),
  ].join('|');
}

async function readLiveParentsAndPrintings() {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(`
      select
        cp.id::text as card_print_id,
        cp.set_code,
        cp.number,
        cp.number_plain,
        cp.name as card_name,
        cp.printed_identity_modifier,
        cpr.id::text as card_printing_id,
        cpr.finish_key
      from public.card_prints cp
      left join public.card_printings cpr on cpr.card_print_id = cp.id
    `);
    const finishKeys = await client.query(`
      select key, label, is_active
      from public.finish_keys
      order by key
    `);
    await client.query('rollback');
    return { available: true, reason: null, rows: result.rows, finish_keys: finishKeys.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Read-only live parent/printing read failed: ${error.message}`,
      rows: [],
      finish_keys: [],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildLiveLookups(liveRows) {
  const parentsByExact = new Map();
  const childFinishByParentId = new Map();

  for (const row of liveRows) {
    const exactParentKey = parentKey(row.set_code, row.number, row.card_name);
    if (!parentsByExact.has(exactParentKey)) parentsByExact.set(exactParentKey, new Map());
    parentsByExact.get(exactParentKey).set(row.card_print_id, {
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      printed_identity_modifier: row.printed_identity_modifier,
    });

    if (!childFinishByParentId.has(row.card_print_id)) childFinishByParentId.set(row.card_print_id, new Set());
    if (row.card_printing_id && row.finish_key) {
      childFinishByParentId.get(row.card_print_id).add(normalizeFinishKey(row.finish_key));
    }
  }

  return { parentsByExact, childFinishByParentId };
}

function buildSetAliasMap(sets) {
  const map = new Map();
  for (const set of sets) map.set(set.key, aliasValuesForSet(set));
  return map;
}

function classifyPrintings({ sets, printings, liveLookups, activeFinishKeys }) {
  const aliasesBySet = buildSetAliasMap(sets);
  const rows = [];
  const byClass = {};
  const bySet = {};
  const byFinish = {};

  for (const printing of printings) {
    if (printing.status !== 'master_verified') continue;
    const setKey = printing.set_key;
    const finishKey = normalizeFinishKey(printing.finish_key);
    const aliases = aliasesBySet.get(setKey) ?? [normalizeText(setKey)];
    const parentMatchesById = new Map();

    for (const alias of aliases) {
      const matches = liveLookups.parentsByExact.get(parentKey(alias, printing.card_number, printing.card_name));
      if (!matches) continue;
      for (const [id, match] of matches.entries()) parentMatchesById.set(id, match);
    }

    const parentMatches = [...parentMatchesById.values()];
    const exactExistingChild = parentMatches.some((parent) =>
      liveLookups.childFinishByParentId.get(parent.card_print_id)?.has(finishKey));

    let classification;
    let reason;
    if (exactExistingChild) {
      classification = 'already_present_in_grookai';
      reason = 'An exact parent and finish already exist in live Grookai.';
    } else if (!activeFinishKeys.has(finishKey)) {
      classification = 'blocked_finish_taxonomy_not_child_ready';
      reason = 'The Master Index fact uses a label that is not an active child finish_key; it requires taxonomy/canonical-version strategy before child insertion.';
    } else if (PKG05A_PENDING_SET_KEYS.has(setKey)) {
      classification = 'blocked_pending_pkg05a_missing_set_apply';
      reason = 'This set is part of the pending PKG-05A missing-set insert package and must not be mixed into child-only work.';
    } else if (parentMatches.length === 1) {
      classification = 'eligible_child_printing_insert_only';
      reason = 'Exactly one live parent exists and only the verified child finish is missing.';
    } else if (parentMatches.length > 1) {
      classification = 'blocked_multiple_parent_matches';
      reason = 'More than one live parent matches this set, number, and name; child insert would be ambiguous.';
    } else {
      classification = 'blocked_parent_missing_or_alias_unresolved';
      reason = 'No exact live parent exists under known set aliases; requires parent insert or alias/identity work first.';
    }

    addCount(byClass, classification);
    if (classification !== 'already_present_in_grookai') {
      addCount(bySet, `${setKey}|${printing.set_name}`);
      addCount(byFinish, finishKey);
    }

    rows.push({
      classification,
      set_key: setKey,
      set_name: printing.set_name,
      card_number: printing.card_number,
      card_name: printing.card_name,
      finish_key: finishKey,
      source_count: printing.source_count,
      sources: printing.sources,
      evidence_urls: printing.evidence_urls,
      live_parent_match_count: parentMatches.length,
      live_parent_card_print_ids: parentMatches.map((parent) => parent.card_print_id),
      target_card_print_id: parentMatches.length === 1 ? parentMatches[0].card_print_id : null,
      reason,
    });
  }

  return { rows, byClass, bySet, byFinish };
}

function selectRecommendedBucket(eligibleRows) {
  const bySet = new Map();
  for (const row of eligibleRows) {
    if (!bySet.has(row.set_key)) bySet.set(row.set_key, []);
    bySet.get(row.set_key).push(row);
  }

  const rankedSets = [...bySet.entries()]
    .map(([setKey, rows]) => ({
      set_key: setKey,
      set_name: rows[0]?.set_name,
      child_printing_inserts: rows.length,
      finish_counts: rows.reduce((acc, row) => {
        addCount(acc, row.finish_key);
        return acc;
      }, {}),
      rows: rows
        .sort((left, right) =>
          normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true }) ||
          left.finish_key.localeCompare(right.finish_key)),
    }))
    .sort((left, right) =>
      Number(right.child_printing_inserts) - Number(left.child_printing_inserts) ||
      left.set_key.localeCompare(right.set_key));

  const selected = [];
  let selectedRows = 0;
  for (const set of rankedSets) {
    if (selected.length >= RECOMMENDED_MAX_SETS) break;
    const wouldExceedMax = selectedRows + set.child_printing_inserts > RECOMMENDED_TARGET_MAX_CHILD_INSERTS;
    if (wouldExceedMax && selectedRows >= RECOMMENDED_TARGET_MIN_CHILD_INSERTS) continue;
    selected.push(set);
    selectedRows += set.child_printing_inserts;
    if (selectedRows >= RECOMMENDED_TARGET_MIN_CHILD_INSERTS) break;
  }
  return selected;
}

function renderMarkdown(report) {
  const recommendedRows = report.recommended_bucket.sets.map((set) => [
    set.set_key,
    set.set_name,
    set.child_printing_inserts,
    JSON.stringify(set.finish_counts),
  ]);
  const classificationRows = Object.entries(report.summary.by_classification)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]));
  const setRows = report.summary.top_blocked_or_missing_sets.map((row) => {
    const [setKey, setName] = row.key.split('|');
    return [setKey, setName, row.count];
  });

  return `# PKG-06A Existing-Parent Child Printing Insert Readiness V1

This is a read-only classifier. It does not execute apply, create SQL artifacts, create migrations, delete rows, merge rows, run cleanup, or mutate canonical truth.

## Safety

- audit_only: true
- db_reads_performed: ${report.db_reads_performed}
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- apply_paths_executed: false
- write_ready_now: 0

## Summary

- package_id: ${report.package_id}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- live_read_available: ${report.live_read.available}
- live_parent_printing_rows_read: ${report.live_read.rows_read}
- master_verified_printings_classified: ${report.summary.master_verified_printings_classified}
- eligible_child_printing_insert_only: ${report.summary.eligible_child_printing_insert_only}
- recommended_bucket_sets: ${report.recommended_bucket.sets.length}
- recommended_bucket_child_printing_inserts: ${report.recommended_bucket.child_printing_inserts}
- write_ready_now: ${report.write_ready_now}

## Classification Counts

${markdownTable(['classification', 'count'], classificationRows)}

## Recommended Readiness Bucket

${recommendedRows.length ? markdownTable(['set_key', 'set_name', 'child_printing_inserts', 'finish_counts'], recommendedRows) : 'No child-only insert bucket selected.'}

## Top Remaining Blocked Or Missing Sets

${setRows.length ? markdownTable(['set_key', 'set_name', 'rows'], setRows) : 'No blocked rows.'}

## Stop Rules

- Do not execute apply from this report.
- Do not create a SQL artifact from this report without a separate approval boundary.
- Do not mix PKG-05A pending missing-set inserts into PKG-06A.
- Do not insert a child printing unless the finish is active in public.finish_keys and exactly one live parent card_print matches the Master Index set, number, and card name.
- Do not include taxonomy-blocked labels such as first_edition_holo, first_edition_normal, or stamped in child-only insert packages.
- Do not include deletes, merges, unsupported cleanup, parent inserts, or identity modifier work.
- A future PKG-06A dry-run package must create its own fresh snapshot, rollback proof, dry-run transaction artifact, approval fingerprint, and real-apply gate.
`;
}

async function main() {
  const [setsArtifact, printingsArtifact] = await Promise.all([
    readJson('english_master_index_sets_v1.json'),
    readJson('english_master_index_printings_v1.json'),
  ]);
  const live = await readLiveParentsAndPrintings();
  const liveLookups = buildLiveLookups(live.rows);
  const activeFinishKeys = new Set((live.finish_keys ?? []).filter((row) => row.is_active).map((row) => normalizeFinishKey(row.key)));
  const classified = classifyPrintings({
    sets: setsArtifact.sets ?? [],
    printings: printingsArtifact.printings ?? [],
    liveLookups,
    activeFinishKeys,
  });
  const eligibleRows = classified.rows.filter((row) => row.classification === 'eligible_child_printing_insert_only');
  const recommendedSets = selectRecommendedBucket(eligibleRows);
  const selectedRowIds = recommendedSets.flatMap((set) =>
    set.rows.map((row) => printingKey(set.set_key, row.card_number, row.card_name, row.finish_key)));
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    selected_row_ids: selectedRowIds,
    child_printing_inserts: recommendedSets.reduce((sum, set) => sum + set.child_printing_inserts, 0),
  }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg06a_child_printing_insert_readiness_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_reads_performed: live.available,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    package_fingerprint_sha256: packageFingerprint,
    scope_lock: {
      allowed_future_mutation_class: 'child_printing_insert_only_after_separate_dry_run_and_approval',
      parent_inserts_allowed: false,
      parent_updates_allowed: false,
      deletes_allowed: false,
      merges_allowed: false,
      unsupported_cleanup_allowed: false,
      identity_modifier_work_allowed: false,
      pkg05a_pending_sets_excluded: [...PKG05A_PENDING_SET_KEYS].sort(),
    },
    live_read: {
      available: live.available,
      reason: live.reason,
      rows_read: live.rows.length,
      unique_parent_rows_read: liveLookups.childFinishByParentId.size,
      finish_keys: live.finish_keys ?? [],
      active_finish_keys: [...activeFinishKeys].sort(),
    },
    summary: {
      master_verified_printings_classified: classified.rows.length,
      eligible_child_printing_insert_only: eligibleRows.length,
      by_classification: classified.byClass,
      by_finish_for_non_present_rows: classified.byFinish,
      top_blocked_or_missing_sets: topEntries(classified.bySet, 40),
    },
    recommended_bucket: {
      basis: 'largest_safe_set_bounded_existing_parent_child_only_sets',
      target_min_child_printing_inserts: RECOMMENDED_TARGET_MIN_CHILD_INSERTS,
      target_max_child_printing_inserts: RECOMMENDED_TARGET_MAX_CHILD_INSERTS,
      max_sets: RECOMMENDED_MAX_SETS,
      sets: recommendedSets,
      child_printing_inserts: recommendedSets.reduce((sum, set) => sum + set.child_printing_inserts, 0),
      note: 'This is readiness only. A future package must build a fresh snapshot and rollback-only transaction artifact before any real apply can be considered.',
    },
    eligible_rows_sample: eligibleRows.slice(0, 200),
    blocked_samples: {
      blocked_parent_missing_or_alias_unresolved: classified.rows
        .filter((row) => row.classification === 'blocked_parent_missing_or_alias_unresolved')
        .slice(0, 100),
      blocked_multiple_parent_matches: classified.rows
        .filter((row) => row.classification === 'blocked_multiple_parent_matches')
        .slice(0, 100),
      blocked_pending_pkg05a_missing_set_apply: classified.rows
        .filter((row) => row.classification === 'blocked_pending_pkg05a_missing_set_apply')
        .slice(0, 100),
      blocked_finish_taxonomy_not_child_ready: classified.rows
        .filter((row) => row.classification === 'blocked_finish_taxonomy_not_child_ready')
        .slice(0, 100),
    },
    stop_rules: [
      'Do not execute apply from this report.',
      'Do not create a SQL artifact from this report without a separate approval boundary.',
      'Do not mix PKG-05A pending missing-set inserts into PKG-06A.',
      'Do not insert a child printing unless the finish is active in public.finish_keys and exactly one live parent card_print matches the Master Index set, number, and card name.',
      'Do not include taxonomy-blocked labels such as first_edition_holo, first_edition_normal, or stamped in child-only insert packages.',
      'Do not include deletes, merges, unsupported cleanup, parent inserts, or identity modifier work.',
      'A future PKG-06A dry-run package must create its own fresh snapshot, rollback proof, dry-run transaction artifact, approval fingerprint, and real-apply gate.',
    ],
  };

  await writeJson(OUTPUT_JSON, report);
  await writeMarkdown(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    generated_files: [
      path.relative(process.cwd(), OUTPUT_JSON).replaceAll('\\', '/'),
      path.relative(process.cwd(), OUTPUT_MD).replaceAll('\\', '/'),
    ],
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    eligible_child_printing_insert_only: report.summary.eligible_child_printing_insert_only,
    recommended_bucket_sets: report.recommended_bucket.sets.length,
    recommended_bucket_child_printing_inserts: report.recommended_bucket.child_printing_inserts,
    write_ready_now: report.write_ready_now,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
