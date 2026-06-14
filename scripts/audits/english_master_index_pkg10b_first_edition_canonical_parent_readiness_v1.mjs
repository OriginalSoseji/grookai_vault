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
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');

const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10_finish_taxonomy_unlock_readiness_v1.json');
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg10b_first_edition_canonical_parent_readiness_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_pkg10b_first_edition_canonical_parent_readiness_v1.md',
);
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260610_pkg10b_first_edition_canonical_parent_readiness_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-10B-FIRST-EDITION-CANONICAL-PARENT-READINESS';
const PROPOSED_PRINTED_IDENTITY_MODIFIER = 'edition:first_edition';
const PROPOSED_VARIANT_KEY = null;
const FIRST_EDITION_FINISHES = new Set(['first_edition_normal', 'first_edition_holo']);

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
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
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
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function topEntries(counts, limit = 20) {
  return Object.entries(counts).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function targetChildFinish(finishKey) {
  if (finishKey === 'first_edition_holo') return 'holo';
  if (finishKey === 'first_edition_normal') return 'normal';
  return null;
}

function numberCandidates(row) {
  return [...new Set([
    row.card_number,
    row.number,
    row.number_plain,
  ].filter((value) => value !== null && value !== undefined && String(value).trim()).map(normalizeNumber))];
}

function parentExactKey(setCode, number, name) {
  return [normalizeText(setCode), normalizeNumber(number), normalizeText(name)].join('|');
}

function parentNumberKey(setCode, number) {
  return [normalizeText(setCode), normalizeNumber(number)].join('|');
}

function childExactKey(setCode, number, name, finishKey) {
  return [parentExactKey(setCode, number, name), normalizeText(finishKey)].join('|');
}

function nameCandidates(name) {
  const raw = String(name ?? '').trim();
  const strippedParenthetical = raw.replace(/\s+\([^)]*\)\s*$/, '').trim();
  return [...new Set([raw, strippedParenthetical].filter(Boolean))];
}

function modifierKey(value) {
  return normalizeText(value).replace(/\s+/g, '_');
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function liveCatalogUnavailable(reason) {
  return {
    available: false,
    reason,
    parents: [],
    children: [],
    active_finish_keys: [],
    identity_indexes: [],
  };
}

async function loadLiveCatalog(setKeys) {
  const conn = connectionString();
  if (!conn) {
    return liveCatalogUnavailable('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.');
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');

    const parents = await client.query(
      `select
         cp.id::text,
         cp.set_id::text,
         coalesce(cp.set_code, s.code) as set_code,
         s.name as live_set_name,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.rarity,
         cp.variant_key,
         cp.printed_identity_modifier,
         cp.set_identity_model,
         cp.print_identity_key,
         cp.gv_id
       from public.card_prints cp
       join public.sets s on s.id = cp.set_id
       where coalesce(cp.set_code, s.code) = any($1::text[])
       order by coalesce(cp.set_code, s.code), cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
      [[...setKeys]],
    );

    const children = await client.query(
      `select
         cpr.id::text as card_printing_id,
         cpr.card_print_id::text,
         coalesce(cp.set_code, s.code) as set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cpr.finish_key
       from public.card_printings cpr
       join public.card_prints cp on cp.id = cpr.card_print_id
       join public.sets s on s.id = cp.set_id
       where coalesce(cp.set_code, s.code) = any($1::text[])
       order by coalesce(cp.set_code, s.code), cp.number_plain nulls first, cp.number nulls first, cp.name, cpr.finish_key`,
      [[...setKeys]],
    );

    const finishes = await client.query(
      `select key
       from public.finish_keys
       where is_active = true
       order by key`,
    );

    const indexes = await client.query(
      `select indexname, indexdef
       from pg_indexes
       where schemaname = 'public'
         and tablename = 'card_prints'
         and indexname in (
           'uq_card_prints_identity_v2_standard_sets',
           'uq_card_prints_identity_v3_print_identity'
         )
       order by indexname`,
    );

    await client.query('rollback');
    return {
      available: true,
      reason: null,
      parents: parents.rows,
      children: children.rows,
      active_finish_keys: finishes.rows.map((row) => row.key),
      identity_indexes: indexes.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return liveCatalogUnavailable(error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

function buildLiveIndexes(live) {
  const parentsByExact = new Map();
  const parentsByNumber = new Map();
  const parentsByIdentity = new Map();
  const childKeys = new Set();
  const setCodes = new Set();

  for (const parent of live.parents) {
    setCodes.add(normalizeText(parent.set_code));
    for (const number of numberCandidates(parent)) {
      const exact = parentExactKey(parent.set_code, number, parent.name);
      const numberKey = parentNumberKey(parent.set_code, number);
      const identityKey = [
        String(parent.set_id ?? ''),
        String(parent.number_plain ?? number ?? ''),
        modifierKey(parent.printed_identity_modifier),
        modifierKey(parent.variant_key),
      ].join('|');

      if (!parentsByExact.has(exact)) parentsByExact.set(exact, []);
      parentsByExact.get(exact).push(parent);
      if (!parentsByNumber.has(numberKey)) parentsByNumber.set(numberKey, []);
      parentsByNumber.get(numberKey).push(parent);
      if (!parentsByIdentity.has(identityKey)) parentsByIdentity.set(identityKey, []);
      parentsByIdentity.get(identityKey).push(parent);
    }
  }

  for (const child of live.children) {
    for (const number of numberCandidates(child)) {
      childKeys.add(childExactKey(child.set_code, number, child.name, child.finish_key));
    }
  }

  return {
    parentsByExact,
    parentsByNumber,
    parentsByIdentity,
    childKeys,
    setCodes,
  };
}

function classifyRow(row, liveIndexes, activeFinishKeys) {
  const decomposedFinish = targetChildFinish(row.finish_key);
  const setKey = normalizeText(row.set_key);
  const exactKeys = nameCandidates(row.card_name).map((name) => ({
    key: parentExactKey(row.set_key, row.card_number, name),
    name,
  }));
  const numberKey = parentNumberKey(row.set_key, row.card_number);
  const allExactParents = exactKeys.flatMap(({ key }) => liveIndexes.parentsByExact.get(key) ?? []);
  const baseParents = allExactParents.filter((parent) => (
    isBlank(parent.printed_identity_modifier)
    && isBlank(parent.variant_key)
    && parent.set_identity_model === 'standard'
  ));
  const sameNumberParents = liveIndexes.parentsByNumber.get(numberKey) ?? [];
  const sameNumberNames = [...new Set(sameNumberParents.map((parent) => parent.name).filter(Boolean))].sort();
  const baseParent = baseParents.length === 1 ? baseParents[0] : null;
  const nameAliasApplied = baseParent
    ? normalizeText(baseParent.name) !== normalizeText(row.card_name)
    : false;
  const proposedNumberPlain = baseParent?.number_plain ?? normalizeNumber(row.card_number);
  const proposedIdentityKey = [
    String(baseParent?.set_id ?? ''),
    String(proposedNumberPlain ?? ''),
    modifierKey(PROPOSED_PRINTED_IDENTITY_MODIFIER),
    modifierKey(PROPOSED_VARIANT_KEY),
  ].join('|');
  const proposedIdentityRows = baseParent
    ? liveIndexes.parentsByIdentity.get(proposedIdentityKey) ?? []
    : [];
  const existingFirstEditionParent = proposedIdentityRows.find((parent) => (
    normalizeText(parent.name) === normalizeText(row.card_name)
  ));
  const proposedChildAlreadyExists = existingFirstEditionParent
    ? liveIndexes.childKeys.has(childExactKey(
      existingFirstEditionParent.set_code,
      existingFirstEditionParent.number_plain ?? existingFirstEditionParent.number,
      existingFirstEditionParent.name,
      decomposedFinish,
    ))
    : false;

  let readiness_status = nameAliasApplied
    ? 'ready_parent_identity_insert_candidate_name_alias'
    : 'ready_parent_identity_insert_candidate';
  let exclusion_reason = null;

  if (!activeFinishKeys.has(decomposedFinish)) {
    readiness_status = 'blocked_child_finish_inactive';
    exclusion_reason = `decomposed child finish ${decomposedFinish} is not active in finish_keys.`;
  } else if (!liveIndexes.setCodes.has(setKey)) {
    readiness_status = 'set_missing';
    exclusion_reason = 'target set_code was not found in live card_prints.';
  } else if (baseParents.length === 0 && sameNumberParents.length > 0) {
    readiness_status = 'name_or_variant_review_required';
    exclusion_reason = 'same set/number exists, but no base parent matched set + number + name with blank modifier/variant.';
  } else if (baseParents.length === 0) {
    readiness_status = 'base_parent_missing';
    exclusion_reason = 'no base parent matched set + number + name.';
  } else if (baseParents.length > 1) {
    readiness_status = 'base_parent_ambiguous';
    exclusion_reason = 'multiple base parents matched set + number + name.';
  } else if (proposedIdentityRows.length > 0 && !existingFirstEditionParent) {
    readiness_status = 'parent_identity_collision';
    exclusion_reason = 'the proposed first-edition identity slot is already occupied by another parent.';
  } else if (existingFirstEditionParent && proposedChildAlreadyExists) {
    readiness_status = 'existing_first_edition_parent_and_child_found';
    exclusion_reason = 'the target first-edition parent and decomposed child finish already exist.';
  } else if (existingFirstEditionParent) {
    readiness_status = 'ready_child_insert_existing_first_edition_parent';
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    source_finish_key: row.finish_key,
    proposed_child_finish_key: decomposedFinish,
    source_count: row.source_count,
    sources: row.sources ?? [],
    evidence_urls: row.evidence_urls ?? [],
    readiness_status,
    exclusion_reason,
    proposed_strategy: 'canonical parent identity modifier; do not activate first_edition_* as child finish keys',
    proposed_printed_identity_modifier: PROPOSED_PRINTED_IDENTITY_MODIFIER,
    proposed_variant_key: PROPOSED_VARIANT_KEY,
    proposed_number_plain: proposedNumberPlain,
    base_parent: baseParent
      ? {
        card_print_id: baseParent.id,
        set_id: baseParent.set_id,
        set_code: baseParent.set_code,
        number: baseParent.number,
        number_plain: baseParent.number_plain,
        name: baseParent.name,
        variant_key: baseParent.variant_key,
        printed_identity_modifier: baseParent.printed_identity_modifier,
        set_identity_model: baseParent.set_identity_model,
        gv_id: baseParent.gv_id,
      }
      : null,
    exact_parent_match_count: allExactParents.length,
    base_parent_match_count: baseParents.length,
    name_alias_applied: nameAliasApplied,
    matched_parent_name: baseParent?.name ?? null,
    same_number_parent_count: sameNumberParents.length,
    same_number_live_names: sameNumberNames,
    proposed_identity_collision_count: proposedIdentityRows.length,
    proposed_identity_collision_parent_ids: proposedIdentityRows.map((parent) => parent.id),
    existing_first_edition_parent_id: existingFirstEditionParent?.id ?? null,
    proposed_child_already_exists: proposedChildAlreadyExists,
    future_write_shape_after_approval: existingFirstEditionParent
      ? 'insert decomposed normal/holo child under existing first-edition parent after guarded dry-run proof'
      : 'insert first-edition parent identity, then insert decomposed normal/holo child under that parent after guarded dry-run proof',
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_readiness_status).map(([status, count]) => [
    status,
    count,
    (report.summary.top_sets_by_status[status] ?? []).slice(0, 8).map((row) => `${row.key}:${row.count}`).join(', '),
  ]);
  const setRows = Object.entries(report.summary.by_set).map(([setKey, count]) => [
    setKey,
    count,
    report.summary.by_set_and_finish[setKey]?.first_edition_holo ?? 0,
    report.summary.by_set_and_finish[setKey]?.first_edition_normal ?? 0,
  ]);

  return `# English Master Index PKG-10B First Edition Canonical Parent Readiness V1

Read-only readiness report for Master Index rows currently represented as \`first_edition_normal\` or \`first_edition_holo\`.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- real_apply_authorized: false

## Strategy

- \`first_edition_normal\` and \`first_edition_holo\` must not be activated as child finish keys.
- First edition is modeled as a parent print identity using \`printed_identity_modifier=${PROPOSED_PRINTED_IDENTITY_MODIFIER}\`.
- Child printings are decomposed to active finish keys: \`first_edition_normal -> normal\`, \`first_edition_holo -> holo\`.
- This report prepares readiness only. It creates no SQL artifact and performs no writes.

## Summary

- source_rows: ${report.summary.source_rows}
- ready_parent_identity_insert_candidate: ${report.summary.by_readiness_status.ready_parent_identity_insert_candidate ?? 0}
- ready_child_insert_existing_first_edition_parent: ${report.summary.by_readiness_status.ready_child_insert_existing_first_edition_parent ?? 0}
- blocked_or_review_rows: ${report.summary.blocked_or_review_rows}
- package_fingerprint_sha256: ${report.package_fingerprint_sha256}

${markdownTable(['readiness_status', 'rows', 'top_sets'], statusRows)}

## Set Breakdown

${markdownTable(['set_key', 'rows', 'first_edition_holo', 'first_edition_normal'], setRows)}

## Collision Guard

- unique_identity_index_observed: ${report.live_read.unique_identity_index_observed}
- proposed_printed_identity_modifier: ${PROPOSED_PRINTED_IDENTITY_MODIFIER}
- proposed_variant_key: ${PROPOSED_VARIANT_KEY ?? 'null'}
- proposed_identity_collision_rows: ${report.summary.proposed_identity_collision_rows}

## Recommended Next Package

${report.recommended_next_package.package_id}

- status: ${report.recommended_next_package.status}
- candidate_rows: ${report.recommended_next_package.candidate_rows}
- recommended_bucket: ${report.recommended_next_package.recommended_bucket}
- next_action: ${report.recommended_next_package.next_action}

## Guardrails

- No first-edition child rows may be inserted under unlimited/base parents.
- No \`first_edition_normal\` or \`first_edition_holo\` finish key activation.
- No DB write is authorized by this report.
- Future apply requires fresh snapshot, rollback-only dry-run proof, fingerprinted approval, and post-apply reconciliation.
`;
}

function checkpointText(report) {
  return `# PKG-10B First Edition Canonical Parent Readiness Checkpoint V1

- generated_at: ${report.generated_at}
- package_id: ${PACKAGE_ID}
- package_fingerprint_sha256: ${report.package_fingerprint_sha256}
- source_rows: ${report.summary.source_rows}
- ready_parent_identity_insert_candidate: ${report.summary.by_readiness_status.ready_parent_identity_insert_candidate ?? 0}
- blocked_or_review_rows: ${report.summary.blocked_or_review_rows}
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Strategy

First edition is treated as parent identity, not a child finish taxonomy activation.

- proposed_printed_identity_modifier: ${PROPOSED_PRINTED_IDENTITY_MODIFIER}
- first_edition_normal decomposes to child finish: normal
- first_edition_holo decomposes to child finish: holo

## Next

${report.recommended_next_package.next_action}
`;
}

async function updateCheckpointIndex(report) {
  let existing = '';
  try {
    existing = await fs.readFile(CHECKPOINT_INDEX, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const line = '| 2026-06-10 | [PKG-10B First Edition Canonical Parent Readiness Checkpoint V1](20260610_pkg10b_first_edition_canonical_parent_readiness_checkpoint_v1.md) | Read-only readiness for 942 first-edition Master Index rows using parent identity modifiers, not finish-key activation. No writes or migrations. |';
  if (existing.includes('20260610_pkg10b_first_edition_canonical_parent_readiness_checkpoint_v1.md')) return;
  const next = existing.endsWith('\n') || existing.length === 0 ? `${existing}${line}\n` : `${existing}\n${line}\n`;
  await fs.mkdir(path.dirname(CHECKPOINT_INDEX), { recursive: true });
  await fs.writeFile(CHECKPOINT_INDEX, next);
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => (
  row.recommended_package === PACKAGE_ID || FIRST_EDITION_FINISHES.has(row.finish_key)
));
const setKeys = new Set(sourceRows.map((row) => row.set_key).filter(Boolean));
const live = await loadLiveCatalog(setKeys);
const activeFinishKeys = new Set(live.active_finish_keys ?? []);
const liveIndexes = buildLiveIndexes(live);
const rows = sourceRows.map((row) => classifyRow(row, liveIndexes, activeFinishKeys));
const byStatus = countBy(rows, (row) => row.readiness_status);
const bySet = countBy(rows, (row) => row.set_key);
const byFinish = countBy(rows, (row) => row.source_finish_key);
const bySetAndFinish = {};
for (const row of rows) {
  bySetAndFinish[row.set_key] ??= {};
  bySetAndFinish[row.set_key][row.source_finish_key] = (bySetAndFinish[row.set_key][row.source_finish_key] ?? 0) + 1;
}
const topSetsByStatus = {};
for (const status of Object.keys(byStatus)) {
  topSetsByStatus[status] = topEntries(countBy(rows.filter((row) => row.readiness_status === status), (row) => row.set_key), 20);
}

const readyRows = rows.filter((row) => (
  row.readiness_status === 'ready_parent_identity_insert_candidate'
  || row.readiness_status === 'ready_parent_identity_insert_candidate_name_alias'
  || row.readiness_status === 'ready_child_insert_existing_first_edition_parent'
));
const blockedOrReviewRows = rows.length - readyRows.length;
const proposedIdentityCollisionRows = rows.filter((row) => row.proposed_identity_collision_count > 0).length;
const packageFingerprint = sha256(stableJson(rows.map((row) => ({
  set_key: row.set_key,
  card_number: row.card_number,
  card_name: row.card_name,
  source_finish_key: row.source_finish_key,
  proposed_child_finish_key: row.proposed_child_finish_key,
  readiness_status: row.readiness_status,
  proposed_printed_identity_modifier: row.proposed_printed_identity_modifier,
  proposed_number_plain: row.proposed_number_plain,
  base_parent_id: row.base_parent?.card_print_id ?? null,
  proposed_identity_collision_count: row.proposed_identity_collision_count,
}))));

const uniqueIdentityIndexObserved = (live.identity_indexes ?? []).some((row) => (
  row.indexname === 'uq_card_prints_identity_v2_standard_sets'
  && row.indexdef.includes('printed_identity_modifier')
));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg10b_first_edition_canonical_parent_readiness_v1',
  package_id: PACKAGE_ID,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: SOURCE_JSON,
  package_fingerprint_sha256: packageFingerprint,
  strategy: {
    source_finish_keys_are_not_child_finish_keys: ['first_edition_normal', 'first_edition_holo'],
    proposed_parent_identity_modifier: PROPOSED_PRINTED_IDENTITY_MODIFIER,
    proposed_variant_key: PROPOSED_VARIANT_KEY,
    child_finish_decomposition: {
      first_edition_normal: 'normal',
      first_edition_holo: 'holo',
    },
  },
  live_read: {
    available: live.available,
    reason: live.reason,
    target_set_keys: [...setKeys].sort(),
    parent_rows_loaded: live.parents.length,
    child_rows_loaded: live.children.length,
    active_finish_keys: live.active_finish_keys,
    unique_identity_index_observed: uniqueIdentityIndexObserved,
    identity_indexes: live.identity_indexes,
  },
  summary: {
    source_rows: rows.length,
    ready_rows: readyRows.length,
    blocked_or_review_rows: blockedOrReviewRows,
    proposed_identity_collision_rows: proposedIdentityCollisionRows,
    by_readiness_status: byStatus,
    by_set: bySet,
    by_finish: byFinish,
    by_set_and_finish: bySetAndFinish,
    top_sets_by_status: topSetsByStatus,
  },
  recommended_next_package: {
    package_id: 'PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT',
    status: blockedOrReviewRows === 0 && proposedIdentityCollisionRows === 0
      ? 'ready_for_guarded_dry_run_preparation'
      : 'blocked_until_review_rows_are_resolved',
    candidate_rows: readyRows.length,
    recommended_bucket: 'one medium WOTC set first, then bulk remaining WOTC sets only after rollback proof passes',
    next_action: 'Prepare a rollback-only dry-run artifact that inserts first-edition parent identities and normal/holo child printings for one selected set; no real apply without explicit fingerprinted approval.',
  },
  rows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, checkpointText(report));
await updateCheckpointIndex(report);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  package_fingerprint_sha256: packageFingerprint,
  summary: report.summary,
  recommended_next_package: report.recommended_next_package,
}, null, 2));
