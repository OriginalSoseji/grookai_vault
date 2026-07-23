import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import {
  connectVerifiedDbClient,
  targetBindingFromEnvironment,
  targetBindingsEqual,
} from './self_hosted_images_wh22_common.mjs';
import {
  ME04_EXPECTED_FINISH_COUNTS_V1,
  ME04_EXPECTED_PARENT_COUNT_V1,
  ME04_EXPECTED_PRINTING_COUNT_V1,
  ME04_PHANTOM_NORMAL_IDENTITIES_V1,
  ME04_VALID_BUILD_BATTLE_NORMAL_NUMBERS_V1,
  isMe04PhantomNormalV1,
} from './me04_finish_truth_v1.mjs';

dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'me04_printing_truth_repair_v1');
const PACKAGE_ID = 'ME04-PRINTING-TRUTH-REPAIR-V1';
const EXPECTED_PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const EXPECTED_BEFORE_PRINTING_COUNTS = Object.freeze({
  total: 247,
  normal: 113,
  reverse: 76,
  holo: 58,
});
const EXPECTED_ASSIGNMENT_COUNT = 270;
const EXPECTED_ASSIGNMENTS_PER_CHILD = 6;
const ALIAS_FLAG = 'finish_alias_tcgdex_cardmarket_unsuffixed_to_holo';
const VARIANT_CONFLICT_FLAG = 'source_finish_hint_conflicts_with_provider_variant_metadata';
const ALIAS_REASON = 'TCGdex Cardmarket unsuffixed price lane mapped to holo because source card variants declare holo=true and normal=false';
const CODE_BUNDLE_FILES = Object.freeze([
  'scripts/audits/me04_printing_truth_repair_v1.mjs',
  'scripts/audits/me04_finish_truth_v1.mjs',
  'scripts/audits/self_hosted_images_wh22_common.mjs',
]);
const CHILD_BACKUP_JSONL = path.join(OUTPUT_DIR, 'me04_phantom_normal_child_backup_v1.jsonl');
const ASSIGNMENT_BACKUP_JSONL = path.join(OUTPUT_DIR, 'me04_market_assignment_backup_v1.jsonl');
const ASSIGNMENT_PLAN_JSONL = path.join(OUTPUT_DIR, 'me04_market_assignment_holo_repoint_plan_v1.jsonl');
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'me04_printing_truth_repair_dry_run_v1.json');
const DRY_RUN_MD = path.join(OUTPUT_DIR, 'me04_printing_truth_repair_dry_run_v1.md');
const APPLY_RESULT_JSON = path.join(OUTPUT_DIR, 'me04_printing_truth_repair_apply_result_v1.json');
const APPLY_RESULT_MD = path.join(OUTPUT_DIR, 'me04_printing_truth_repair_apply_result_v1.md');
const RECOVERY_MD = path.join(OUTPUT_DIR, 'me04_printing_truth_repair_recovery_v1.md');

const MUTATION_CONTRACT = Object.freeze({
  target_set: 'me04',
  target_child_rows: 45,
  target_finish: 'normal',
  child_action: 'delete_exact_full_snapshot_compare_and_swap',
  assignment_rows: EXPECTED_ASSIGNMENT_COUNT,
  assignment_action: 'preserve_evidence_and_repoint_unsuffixed_tcgdex_cardmarket_lane_to_holo_sibling',
  assignment_columns_changed: [
    'card_printing_id',
    'printing_gv_id',
    'assigned_finish_key',
    'variant_assignment_status',
    'variant_assignment_confidence',
    'variant_assignment_reason',
    'variant_assignment_flags',
    'assignment_payload',
    'needs_review',
    'publishable',
    'app_visible',
    'market_truth',
  ],
  preserved: [
    'all parent card_prints',
    'all holo child printings',
    'all reverse child printings',
    'valid Build & Battle normal printings 013/029/051/068',
    'all raw market-reference evidence rows',
    'all user vault rows',
  ],
  transaction: 'single_atomic_postgres_transaction',
  failure_recovery: 'automatic_rollback_before_commit_and_full_row_backup_after_commit',
  migrations: false,
});

const EXPECTED_FK_INVENTORY = Object.freeze([
  ['canon_warehouse_candidates', 'promoted_card_printing_id', 'RESTRICT'],
  ['card_printing_truth_reviews', 'card_printing_id', 'RESTRICT'],
  ['external_printing_mappings', 'card_printing_id', 'RESTRICT'],
  ['market_evidence_variant_assignments', 'card_printing_id', 'NO ACTION'],
  ['vault_item_instances', 'card_printing_id', 'RESTRICT'],
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function proofHash(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(stableJson(value));
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeNumber(value) {
  return String(Number(String(value).trim())).padStart(3, '0');
}

function parentGvId(cardNumber) {
  return `GV-PK-CRI-${normalizeNumber(cardNumber)}`;
}

function childGvId(cardNumber) {
  return `${parentGvId(cardNumber)}-STD`;
}

function compareStrings(left, right) {
  return String(left).localeCompare(String(right));
}

function sortedUnique(values) {
  return [...new Set(values)].sort(compareStrings);
}

function rowSnapshotHash(entry) {
  return proofHash(entry.row_snapshot);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    fingerprint: null,
    planHash: null,
    mutationContractHash: null,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--apply') args.apply = true;
    else if (value === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (value === '--plan-hash') args.planHash = argv[++index] ?? null;
    else if (value === '--mutation-contract-hash') args.mutationContractHash = argv[++index] ?? null;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonl(filePath) {
  const body = await fs.readFile(filePath, 'utf8');
  return body.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
}

async function computeCodeBundleHash() {
  const files = [];
  for (const relativePath of CODE_BUNDLE_FILES) {
    files.push({
      relative_path: relativePath,
      sha256: proofHash(await fs.readFile(path.join(ROOT, relativePath))),
    });
  }
  return { files, hash: proofHash(files) };
}

function expectedTargetIdentities() {
  return ME04_PHANTOM_NORMAL_IDENTITIES_V1
    .map((row) => ({
      set_code: 'me04',
      number: normalizeNumber(row.card_number),
      name: row.card_name,
      finish_key: 'normal',
      parent_gv_id: parentGvId(row.card_number),
      printing_gv_id: childGvId(row.card_number),
    }))
    .sort((left, right) => compareStrings(left.number, right.number));
}

async function fetchSetState(client) {
  const result = await client.query(`
    select
      count(distinct cp.id)::int as parent_count,
      count(cpr.id)::int as printing_count,
      count(cpr.id) filter (where cpr.finish_key = 'normal')::int as normal_count,
      count(cpr.id) filter (where cpr.finish_key = 'reverse')::int as reverse_count,
      count(cpr.id) filter (where cpr.finish_key = 'holo')::int as holo_count,
      count(cpr.id) filter (where cpr.finish_key not in ('normal', 'reverse', 'holo'))::int as other_finish_count
    from public.card_prints cp
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    where lower(cp.set_code) = 'me04'
  `);
  return result.rows[0];
}

async function fetchFinishState(client, gvIds) {
  const result = await client.query(`
    select
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.number,
      cp.name,
      coalesce(array_agg(cpr.finish_key order by cpr.finish_key) filter (where cpr.id is not null), array[]::text[]) as finish_keys
    from public.card_prints cp
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    where cp.gv_id = any($1::text[])
    group by cp.id, cp.gv_id, cp.number, cp.name
    order by cp.gv_id
  `, [gvIds]);
  return result.rows;
}

async function fetchTargetChildren(client, lock = false) {
  const identities = expectedTargetIdentities();
  const result = await client.query(`
    select
      cp.id::text as parent_id,
      cp.gv_id as parent_gv_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name,
      to_jsonb(cpr) as row_snapshot
    from public.card_prints cp
    join public.card_printings cpr on cpr.card_print_id = cp.id
    where cp.gv_id = any($1::text[])
      and cpr.finish_key = 'normal'
    order by cp.gv_id
    ${lock ? 'for update of cpr' : ''}
  `, [identities.map((row) => row.parent_gv_id)]);
  return result.rows;
}

async function fetchHoloSiblings(client, lock = false) {
  const identities = expectedTargetIdentities();
  const result = await client.query(`
    select
      cp.id::text as parent_id,
      cp.gv_id as parent_gv_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name,
      to_jsonb(cpr) as row_snapshot
    from public.card_prints cp
    join public.card_printings cpr on cpr.card_print_id = cp.id
    where cp.gv_id = any($1::text[])
      and cpr.finish_key = 'holo'
    order by cp.gv_id
    ${lock ? 'for update of cpr' : ''}
  `, [identities.map((row) => row.parent_gv_id)]);
  return result.rows;
}

async function fetchChildrenByIds(client, ids, lock = false) {
  const result = await client.query(`
    select to_jsonb(cpr) as row_snapshot
    from public.card_printings cpr
    where cpr.id = any($1::uuid[])
    order by cpr.id
    ${lock ? 'for update' : ''}
  `, [ids]);
  return result.rows;
}

async function fetchAssignmentsForChildren(client, childIds, printingGvIds, lock = false) {
  const result = await client.query(`
    select to_jsonb(assignment) as row_snapshot
    from public.market_evidence_variant_assignments assignment
    where assignment.card_printing_id = any($1::uuid[])
       or assignment.printing_gv_id = any($2::text[])
    order by assignment.id
    ${lock ? 'for update' : ''}
  `, [childIds, printingGvIds]);
  return result.rows;
}

async function fetchAssignmentsByIds(client, ids, lock = false) {
  const result = await client.query(`
    select to_jsonb(assignment) as row_snapshot
    from public.market_evidence_variant_assignments assignment
    where assignment.id = any($1::uuid[])
    order by assignment.id
    ${lock ? 'for update' : ''}
  `, [ids]);
  return result.rows;
}

async function fetchDependencyCounts(client, childIds, printingGvIds) {
  const result = await client.query(`
    select
      (select count(*)::int from public.vault_item_instances row where row.card_printing_id = any($1::uuid[])) as vault_item_instances,
      (select count(*)::int from public.external_printing_mappings row where row.card_printing_id = any($1::uuid[])) as external_printing_mappings,
      (select count(*)::int from public.card_printing_truth_reviews row where row.card_printing_id = any($1::uuid[])) as card_printing_truth_reviews,
      (select count(*)::int from public.canon_warehouse_candidates row where row.promoted_card_printing_id = any($1::uuid[])) as canon_warehouse_candidates,
      (select count(*)::int from public.market_evidence_variant_assignments row where row.card_printing_id = any($1::uuid[])) as market_assignment_fk_refs,
      (select count(*)::int from public.market_evidence_variant_assignments row where row.printing_gv_id = any($2::text[])) as market_assignment_text_refs
  `, [childIds, printingGvIds]);
  return result.rows[0];
}

async function fetchFkInventory(client) {
  const result = await client.query(`
    select distinct
      tc.table_name,
      kcu.column_name,
      rc.delete_rule
    from information_schema.referential_constraints rc
    join information_schema.table_constraints tc
      on tc.constraint_catalog = rc.constraint_catalog
     and tc.constraint_schema = rc.constraint_schema
     and tc.constraint_name = rc.constraint_name
    join information_schema.key_column_usage kcu
      on kcu.constraint_catalog = tc.constraint_catalog
     and kcu.constraint_schema = tc.constraint_schema
     and kcu.constraint_name = tc.constraint_name
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_catalog = rc.unique_constraint_catalog
     and ccu.constraint_schema = rc.unique_constraint_schema
     and ccu.constraint_name = rc.unique_constraint_name
    where tc.table_schema = 'public'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'card_printings'
      and ccu.column_name = 'id'
    order by tc.table_name, kcu.column_name
  `);
  return result.rows;
}

async function fetchPrintingGvIdBaseColumns(client) {
  const result = await client.query(`
    select columns.table_name, columns.column_name
    from information_schema.columns columns
    join information_schema.tables tables
      on tables.table_schema = columns.table_schema
     and tables.table_name = columns.table_name
    where columns.table_schema = 'public'
      and columns.column_name = 'printing_gv_id'
      and tables.table_type = 'BASE TABLE'
    order by columns.table_name
  `);
  return result.rows;
}

function assertSetState(state, expected) {
  if (state.parent_count !== ME04_EXPECTED_PARENT_COUNT_V1) {
    throw new Error(`ME04 parent count mismatch: ${state.parent_count}`);
  }
  if (state.printing_count !== expected.total) throw new Error(`ME04 printing count mismatch: ${state.printing_count}`);
  if (state.normal_count !== expected.normal) throw new Error(`ME04 normal count mismatch: ${state.normal_count}`);
  if (state.reverse_count !== expected.reverse) throw new Error(`ME04 reverse count mismatch: ${state.reverse_count}`);
  if (state.holo_count !== expected.holo) throw new Error(`ME04 holo count mismatch: ${state.holo_count}`);
  if (state.other_finish_count !== 0) throw new Error(`ME04 unexpected finish count: ${state.other_finish_count}`);
}

function assertTargetChildren(rows) {
  const expected = expectedTargetIdentities();
  if (rows.length !== expected.length || rows.length !== 45) {
    throw new Error(`Target child count mismatch: ${rows.length}`);
  }
  const byParentGvId = new Map(rows.map((row) => [row.parent_gv_id, row]));
  if (byParentGvId.size !== 45) throw new Error('Target parent identities are not unique.');
  for (const identity of expected) {
    const row = byParentGvId.get(identity.parent_gv_id);
    if (!row) throw new Error(`Missing target child: ${identity.printing_gv_id}`);
    if (!isMe04PhantomNormalV1({
      set_code: row.set_code,
      number: row.number_plain ?? row.number,
      name: row.name,
      finish_key: row.row_snapshot.finish_key,
    })) {
      throw new Error(`Target does not satisfy ME04 phantom-normal contract: ${identity.printing_gv_id}`);
    }
    if (row.row_snapshot.printing_gv_id !== identity.printing_gv_id) {
      throw new Error(`Printing GV ID mismatch: ${identity.printing_gv_id}`);
    }
    if (row.row_snapshot.card_print_id !== row.parent_id) {
      throw new Error(`Parent/child linkage mismatch: ${identity.printing_gv_id}`);
    }
    if (row.row_snapshot.is_provisional !== false) throw new Error(`Unexpected provisional target: ${identity.printing_gv_id}`);
    if (row.row_snapshot.provenance_source !== 'verified_master_set_index_v1') {
      throw new Error(`Unexpected provenance source: ${identity.printing_gv_id}`);
    }
    if (row.row_snapshot.created_by !== 'pkg04a_chaos_rising_child_printing_completion_v1') {
      throw new Error(`Unexpected creator: ${identity.printing_gv_id}`);
    }
  }
}

function assertHoloSiblings(rows) {
  const expected = expectedTargetIdentities();
  if (rows.length !== expected.length || rows.length !== 45) {
    throw new Error(`Holo sibling count mismatch: ${rows.length}`);
  }
  const byParentGvId = new Map(rows.map((row) => [row.parent_gv_id, row]));
  if (byParentGvId.size !== 45) throw new Error('Holo sibling parent identities are not unique.');
  for (const identity of expected) {
    const row = byParentGvId.get(identity.parent_gv_id);
    if (!row) throw new Error(`Missing Holo sibling: ${identity.parent_gv_id}-HOLO`);
    if (row.row_snapshot.card_print_id !== row.parent_id || row.row_snapshot.finish_key !== 'holo') {
      throw new Error(`Invalid Holo sibling linkage: ${identity.parent_gv_id}`);
    }
    if (row.row_snapshot.printing_gv_id !== `${identity.parent_gv_id}-HOLO`) {
      throw new Error(`Holo sibling GV ID mismatch: ${identity.parent_gv_id}`);
    }
  }
}

function assertSchemaInventory(fkRows, printingGvRows) {
  const observedFks = fkRows.map((row) => [row.table_name, row.column_name, row.delete_rule]);
  if (stableJson(observedFks) !== stableJson(EXPECTED_FK_INVENTORY)) {
    throw new Error(`card_printings FK inventory drift: ${JSON.stringify(observedFks)}`);
  }
  const observedGvColumns = printingGvRows.map((row) => [row.table_name, row.column_name]);
  const expectedGvColumns = [
    ['card_printings', 'printing_gv_id'],
    ['market_evidence_variant_assignments', 'printing_gv_id'],
  ];
  if (stableJson(observedGvColumns) !== stableJson(expectedGvColumns)) {
    throw new Error(`printing_gv_id base-column inventory drift: ${JSON.stringify(observedGvColumns)}`);
  }
}

function assertDependencyCounts(counts, expectedAssignments) {
  for (const key of [
    'vault_item_instances',
    'external_printing_mappings',
    'card_printing_truth_reviews',
    'canon_warehouse_candidates',
  ]) {
    if (counts[key] !== 0) throw new Error(`Blocked by ${key} dependencies: ${counts[key]}`);
  }
  if (counts.market_assignment_fk_refs !== expectedAssignments) {
    throw new Error(`Market assignment FK reference mismatch: ${counts.market_assignment_fk_refs}`);
  }
  if (counts.market_assignment_text_refs !== expectedAssignments) {
    throw new Error(`Market assignment text reference mismatch: ${counts.market_assignment_text_refs}`);
  }
}

function assertAssignments(rows, childRows) {
  if (rows.length !== EXPECTED_ASSIGNMENT_COUNT) {
    throw new Error(`Market assignment count mismatch: ${rows.length}`);
  }
  const childById = new Map(childRows.map((row) => [row.row_snapshot.id, row]));
  const countsByChild = new Map();
  const uniqueIds = new Set();
  for (const entry of rows) {
    const row = entry.row_snapshot;
    uniqueIds.add(row.id);
    const child = childById.get(row.card_printing_id);
    if (!child) throw new Error(`Assignment points outside exact target scope: ${row.id}`);
    if (row.printing_gv_id !== child.row_snapshot.printing_gv_id) {
      throw new Error(`Assignment child ID/GV ID mismatch: ${row.id}`);
    }
    countsByChild.set(row.card_printing_id, (countsByChild.get(row.card_printing_id) ?? 0) + 1);
    if (row.source_family !== 'market_reference' || row.source_table !== 'market_reference_candidates') {
      throw new Error(`Unexpected assignment source: ${row.id}`);
    }
    if (row.source_finish_hint !== 'normal' || row.normalized_finish_key !== 'normal' || row.assigned_finish_key !== 'normal') {
      throw new Error(`Unexpected assignment finish state: ${row.id}`);
    }
    if (row.variant_assignment_status !== 'exact_child_finish' || Number(row.variant_assignment_confidence) !== 0.96) {
      throw new Error(`Unexpected assignment decision state: ${row.id}`);
    }
    if (row.variant_assignment_reason !== 'source finish hint matched one child finish row') {
      throw new Error(`Unexpected assignment reason: ${row.id}`);
    }
    if (row.needs_review !== true || row.publishable !== false || row.app_visible !== false || row.market_truth !== false) {
      throw new Error(`Assignment publication guard mismatch: ${row.id}`);
    }
    if (Number(row.assignment_payload?.child_count) !== 2) throw new Error(`Assignment child count mismatch: ${row.id}`);
    if (stableJson(sortedUnique(row.assignment_payload?.child_finish_keys ?? [])) !== stableJson(['holo', 'normal'])) {
      throw new Error(`Assignment child finish payload mismatch: ${row.id}`);
    }
  }
  if (uniqueIds.size !== EXPECTED_ASSIGNMENT_COUNT) throw new Error('Market assignment IDs are not unique.');
  for (const childId of childById.keys()) {
    if (countsByChild.get(childId) !== EXPECTED_ASSIGNMENTS_PER_CHILD) {
      throw new Error(`Expected ${EXPECTED_ASSIGNMENTS_PER_CHILD} assignments for child ${childId}; found ${countsByChild.get(childId) ?? 0}.`);
    }
  }
}

function mutateAssignmentSnapshot(before, holoSibling) {
  const payload = structuredClone(before.assignment_payload ?? {});
  payload.child_count = 1;
  payload.child_finish_keys = ['holo'];
  payload.finish_alias_applied = 'tcgdex_cardmarket_unsuffixed_to_holo';
  payload.finish_alias_policy = 'only_when_tcgdex_variants_holo_true_normal_false';
  payload.source_variant_evidence = { holo: true, normal: false };
  payload.catalog_truth_repair_v1 = {
    package_id: PACKAGE_ID,
    correction: 'phantom_normal_child_removed_and_market_lane_repointed_to_holo',
    prior_assignment: {
      card_printing_id: before.card_printing_id,
      printing_gv_id: before.printing_gv_id,
      assigned_finish_key: before.assigned_finish_key,
      variant_assignment_status: before.variant_assignment_status,
      variant_assignment_confidence: before.variant_assignment_confidence,
    },
  };
  return {
    ...before,
    card_printing_id: holoSibling.id,
    printing_gv_id: holoSibling.printing_gv_id,
    assigned_finish_key: 'holo',
    variant_assignment_status: 'exact_child_finish',
    variant_assignment_confidence: 0.88,
    variant_assignment_reason: ALIAS_REASON,
    variant_assignment_flags: [ALIAS_FLAG, VARIANT_CONFLICT_FLAG],
    assignment_payload: payload,
    needs_review: true,
    publishable: false,
    app_visible: false,
    market_truth: false,
  };
}

function buildPackage(targetBinding, codeBundle, childRows, holoRows, assignmentRows) {
  const holoByParentId = new Map(holoRows.map((row) => [row.parent_id, row]));
  const children = [...childRows]
    .sort((left, right) => compareStrings(left.parent_gv_id, right.parent_gv_id))
    .map((entry) => {
      const holoSibling = holoByParentId.get(entry.parent_id);
      if (!holoSibling) throw new Error(`Holo sibling missing from package: ${entry.parent_gv_id}`);
      return {
        ...entry,
        snapshot_hash: rowSnapshotHash(entry),
        holo_row_snapshot: holoSibling.row_snapshot,
        holo_snapshot_hash: rowSnapshotHash(holoSibling),
      };
    });
  const childById = new Map(children.map((row) => [row.row_snapshot.id, row]));
  const assignments = [...assignmentRows]
    .sort((left, right) => compareStrings(left.row_snapshot.id, right.row_snapshot.id))
    .map((entry) => {
      const child = childById.get(entry.row_snapshot.card_printing_id);
      if (!child) throw new Error(`Assignment target is outside child package: ${entry.row_snapshot.id}`);
      const expected = mutateAssignmentSnapshot(entry.row_snapshot, child.holo_row_snapshot);
      return {
        assignment_id: entry.row_snapshot.id,
        before_snapshot_hash: rowSnapshotHash(entry),
        expected_after_snapshot_hash: proofHash(expected),
        row_snapshot: entry.row_snapshot,
        expected_after_snapshot: expected,
      };
    });
  const mutationContractHash = proofHash(MUTATION_CONTRACT);
  const childBackupHash = proofHash(children.map((row) => row.row_snapshot));
  const holoSiblingHash = proofHash(children.map((row) => row.holo_row_snapshot));
  const assignmentBackupHash = proofHash(assignments.map((row) => row.row_snapshot));
  const assignmentPlanHash = proofHash(assignments.map((row) => ({
    assignment_id: row.assignment_id,
    before_snapshot_hash: row.before_snapshot_hash,
    expected_after_snapshot_hash: row.expected_after_snapshot_hash,
  })));
  const planHash = proofHash({
    package_id: PACKAGE_ID,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    mutation_contract_hash: mutationContractHash,
    child_backup_hash: childBackupHash,
    holo_sibling_hash: holoSiblingHash,
    assignment_backup_hash: assignmentBackupHash,
    assignment_plan_hash: assignmentPlanHash,
    target_child_ids: children.map((row) => row.row_snapshot.id),
    target_printing_gv_ids: children.map((row) => row.row_snapshot.printing_gv_id),
    target_holo_ids: children.map((row) => row.holo_row_snapshot.id),
    target_holo_gv_ids: children.map((row) => row.holo_row_snapshot.printing_gv_id),
  });
  const fingerprint = proofHash({
    package_id: PACKAGE_ID,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    mutation_contract_hash: mutationContractHash,
    plan_hash: planHash,
  });
  return {
    children,
    assignments,
    mutationContractHash,
    childBackupHash,
    holoSiblingHash,
    assignmentBackupHash,
    assignmentPlanHash,
    planHash,
    fingerprint,
  };
}

function assertExactSnapshotSet(actualEntries, expectedEntries, label) {
  const actual = [...actualEntries]
    .map((entry) => [entry.row_snapshot.id, rowSnapshotHash(entry)])
    .sort((left, right) => compareStrings(left[0], right[0]));
  const expected = [...expectedEntries]
    .map((entry) => [entry.row_snapshot.id, proofHash(entry.row_snapshot)])
    .sort((left, right) => compareStrings(left[0], right[0]));
  if (stableJson(actual) !== stableJson(expected)) {
    throw new Error(`${label} full-row snapshot drift.`);
  }
}

async function assertPreservedFinishStates(client) {
  const buildBattleIds = ME04_VALID_BUILD_BATTLE_NORMAL_NUMBERS_V1.map(parentGvId);
  const buildBattle = await fetchFinishState(client, buildBattleIds);
  if (buildBattle.length !== buildBattleIds.length) throw new Error('Build & Battle parent scope mismatch.');
  for (const row of buildBattle) {
    if (stableJson(row.finish_keys) !== stableJson(['holo', 'normal', 'reverse'])) {
      throw new Error(`Build & Battle finishes changed: ${row.gv_id} ${JSON.stringify(row.finish_keys)}`);
    }
  }
  const representatives = await fetchFinishState(client, [
    parentGvId('001'),
    parentGvId('003'),
    parentGvId('109'),
    parentGvId('120'),
  ]);
  const expected = new Map([
    [parentGvId('001'), ['normal', 'reverse']],
    [parentGvId('003'), ['holo']],
    [parentGvId('109'), ['holo']],
    [parentGvId('120'), ['holo']],
  ]);
  for (const row of representatives) {
    if (stableJson(row.finish_keys) !== stableJson(expected.get(row.gv_id))) {
      throw new Error(`Representative finish mismatch: ${row.gv_id} ${JSON.stringify(row.finish_keys)}`);
    }
  }
  if (representatives.length !== expected.size) throw new Error('Representative parent scope mismatch.');
  return { build_battle: buildBattle, representatives };
}

async function executeMutation(client, repairPackage, commit) {
  const childIds = repairPackage.children.map((row) => row.row_snapshot.id);
  const printingGvIds = repairPackage.children.map((row) => row.row_snapshot.printing_gv_id);
  const holoIds = repairPackage.children.map((row) => row.holo_row_snapshot.id);
  const assignmentIds = repairPackage.assignments.map((row) => row.assignment_id);
  const startedAt = new Date().toISOString();
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const lockedChildren = await fetchChildrenByIds(client, childIds, true);
    const lockedHoloSiblings = await fetchChildrenByIds(client, holoIds, true);
    const lockedAssignments = await fetchAssignmentsByIds(client, assignmentIds, true);
    const fkInventory = await fetchFkInventory(client);
    const printingGvColumns = await fetchPrintingGvIdBaseColumns(client);
    assertExactSnapshotSet(lockedChildren, repairPackage.children, 'Child target');
    assertExactSnapshotSet(
      lockedHoloSiblings,
      repairPackage.children.map((row) => ({ row_snapshot: row.holo_row_snapshot })),
      'Holo sibling',
    );
    assertExactSnapshotSet(lockedAssignments, repairPackage.assignments, 'Market assignment');
    assertSchemaInventory(fkInventory, printingGvColumns);

    const beforeState = await fetchSetState(client);
    assertSetState(beforeState, EXPECTED_BEFORE_PRINTING_COUNTS);
    const dependencies = await fetchDependencyCounts(client, childIds, printingGvIds);
    assertDependencyCounts(dependencies, EXPECTED_ASSIGNMENT_COUNT);

    await client.query(`
      create temporary table me04_assignment_repair_targets (
        id uuid primary key,
        before_snapshot jsonb not null,
        expected_after_snapshot jsonb not null
      ) on commit drop
    `);
    await client.query(`
      insert into me04_assignment_repair_targets (id, before_snapshot, expected_after_snapshot)
      select id, before_snapshot, expected_after_snapshot
      from jsonb_to_recordset($1::jsonb) as target(
        id uuid,
        before_snapshot jsonb,
        expected_after_snapshot jsonb
      )
    `, [JSON.stringify(repairPackage.assignments.map((row) => ({
      id: row.assignment_id,
      before_snapshot: row.row_snapshot,
      expected_after_snapshot: row.expected_after_snapshot,
    })))]);

    const updatedAssignments = await client.query(`
      update public.market_evidence_variant_assignments assignment
      set
        card_printing_id = (target.expected_after_snapshot ->> 'card_printing_id')::uuid,
        printing_gv_id = target.expected_after_snapshot ->> 'printing_gv_id',
        assigned_finish_key = target.expected_after_snapshot ->> 'assigned_finish_key',
        variant_assignment_status = target.expected_after_snapshot ->> 'variant_assignment_status',
        variant_assignment_confidence = (target.expected_after_snapshot ->> 'variant_assignment_confidence')::numeric,
        variant_assignment_reason = target.expected_after_snapshot ->> 'variant_assignment_reason',
        variant_assignment_flags = array(
          select jsonb_array_elements_text(target.expected_after_snapshot -> 'variant_assignment_flags')
        ),
        assignment_payload = target.expected_after_snapshot -> 'assignment_payload',
        needs_review = (target.expected_after_snapshot ->> 'needs_review')::boolean,
        publishable = (target.expected_after_snapshot ->> 'publishable')::boolean,
        app_visible = (target.expected_after_snapshot ->> 'app_visible')::boolean,
        market_truth = (target.expected_after_snapshot ->> 'market_truth')::boolean
      from me04_assignment_repair_targets target
      where assignment.id = target.id
        and to_jsonb(assignment) = target.before_snapshot
      returning assignment.id::text as id, to_jsonb(assignment) as row_snapshot
    `);
    if (updatedAssignments.rowCount !== EXPECTED_ASSIGNMENT_COUNT) {
      throw new Error(`Guarded assignment update count mismatch: ${updatedAssignments.rowCount}`);
    }
    const expectedAssignmentHashes = new Map(
      repairPackage.assignments.map((row) => [row.assignment_id, row.expected_after_snapshot_hash]),
    );
    for (const row of updatedAssignments.rows) {
      if (proofHash(row.row_snapshot) !== expectedAssignmentHashes.get(row.id)) {
        throw new Error(`Assignment post-update snapshot mismatch: ${row.id}`);
      }
    }

    await client.query(`
      create temporary table me04_child_delete_targets (
        id uuid primary key,
        before_snapshot jsonb not null
      ) on commit drop
    `);
    await client.query(`
      insert into me04_child_delete_targets (id, before_snapshot)
      select id, before_snapshot
      from jsonb_to_recordset($1::jsonb) as target(id uuid, before_snapshot jsonb)
    `, [JSON.stringify(repairPackage.children.map((row) => ({
      id: row.row_snapshot.id,
      before_snapshot: row.row_snapshot,
    })))]);
    const deletedChildren = await client.query(`
      delete from public.card_printings child
      using me04_child_delete_targets target
      where child.id = target.id
        and to_jsonb(child) = target.before_snapshot
      returning child.id::text as id, to_jsonb(child) as row_snapshot
    `);
    if (deletedChildren.rowCount !== 45) {
      throw new Error(`Guarded child delete count mismatch: ${deletedChildren.rowCount}`);
    }
    const childHashes = new Map(repairPackage.children.map((row) => [row.row_snapshot.id, row.snapshot_hash]));
    for (const row of deletedChildren.rows) {
      if (proofHash(row.row_snapshot) !== childHashes.get(row.id)) {
        throw new Error(`Deleted child snapshot mismatch: ${row.id}`);
      }
    }

    const afterState = await fetchSetState(client);
    assertSetState(afterState, {
      total: ME04_EXPECTED_PRINTING_COUNT_V1,
      ...ME04_EXPECTED_FINISH_COUNTS_V1,
    });
    const remainingTargets = await fetchChildrenByIds(client, childIds, false);
    if (remainingTargets.length !== 0) throw new Error(`Deleted target rows remain: ${remainingTargets.length}`);
    const afterDependencies = await fetchDependencyCounts(client, childIds, printingGvIds);
    assertDependencyCounts(afterDependencies, 0);
    const afterAssignments = await fetchAssignmentsByIds(client, assignmentIds, false);
    if (afterAssignments.length !== EXPECTED_ASSIGNMENT_COUNT) throw new Error('Assignment evidence rows were not preserved.');
    const actualAssignmentHashes = new Map(afterAssignments.map((row) => [row.row_snapshot.id, rowSnapshotHash(row)]));
    for (const row of repairPackage.assignments) {
      if (actualAssignmentHashes.get(row.assignment_id) !== row.expected_after_snapshot_hash) {
        throw new Error(`Assignment final readback mismatch: ${row.assignment_id}`);
      }
    }
    const preservedFinishStates = await assertPreservedFinishStates(client);

    if (commit) await client.query('commit');
    else await client.query('rollback');
    return {
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      committed: commit,
      before_state: beforeState,
      inside_transaction_after_state: afterState,
      before_dependencies: dependencies,
      inside_transaction_after_dependencies: afterDependencies,
      assignments_updated: updatedAssignments.rowCount,
      children_deleted: deletedChildren.rowCount,
      preserved_finish_states: preservedFinishStates,
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original failure.
    }
    throw error;
  }
}

function renderDryRunMarkdown(summary) {
  return `# ${PACKAGE_ID}\n\n- Generated: ${summary.generated_at}\n- Mode: ${summary.mode}\n- Supabase project: \`${summary.target_binding.supabase_project_ref}\`\n- Approval fingerprint: \`${summary.fingerprint}\`\n- Plan hash: \`${summary.plan_hash}\`\n- Mutation contract hash: \`${summary.mutation_contract_hash}\`\n- Child backup hash: \`${summary.child_backup_hash}\`\n- Holo sibling hash: \`${summary.holo_sibling_hash}\`\n- Assignment backup hash: \`${summary.assignment_backup_hash}\`\n- Exact phantom Normal children: ${summary.scope.child_rows}\n- Quarantined assignment rows preserved and repointed to Holo: ${summary.scope.assignment_rows}\n- Pre-repair ME04 printings: ${summary.execution.before_state.printing_count}\n- Proven post-repair ME04 printings: ${summary.execution.inside_transaction_after_state.printing_count}\n- Proven post-repair finishes: ${summary.execution.inside_transaction_after_state.normal_count} normal / ${summary.execution.inside_transaction_after_state.reverse_count} reverse / ${summary.execution.inside_transaction_after_state.holo_count} holo\n- Dry-run transaction rolled back: ${summary.execution.rolled_back}\n- Database writes retained: ${summary.db_writes_retained}\n- Migrations created: ${summary.migrations_created}\n- Ready for apply: ${summary.ready_for_apply}\n\nThe dry run locked and compared complete Normal and Holo row snapshots, repointed exactly 270 non-public TCGdex Cardmarket evidence assignments to their governed Holo siblings, deleted exactly 45 phantom Normal children, proved the governed 202-printing result, and rolled the transaction back. Full before snapshots are retained for recovery.\n`;
}

function renderApplyMarkdown(result) {
  return `# ${PACKAGE_ID} apply result\n\n- Completed: ${result.ended_at}\n- Supabase project: \`${result.target_binding.supabase_project_ref}\`\n- Fingerprint: \`${result.fingerprint}\`\n- Plan hash: \`${result.plan_hash}\`\n- Proof hash: \`${result.proof_hash}\`\n- Assignment evidence rows repointed to Holo: ${result.execution.assignments_updated}\n- Phantom Normal children deleted: ${result.execution.children_deleted}\n- ME04 parent rows preserved: ${result.final_state.parent_count}\n- ME04 child printings: ${result.final_state.printing_count}\n- Finish counts: ${result.final_state.normal_count} normal / ${result.final_state.reverse_count} reverse / ${result.final_state.holo_count} holo\n- Batch atomic: ${result.batch_atomic}\n- Migrations created: ${result.migrations_created}\n`;
}

async function collectPreflight(client) {
  const setState = await fetchSetState(client);
  const childRows = await fetchTargetChildren(client, false);
  const holoRows = await fetchHoloSiblings(client, false);
  const fkInventory = await fetchFkInventory(client);
  const printingGvColumns = await fetchPrintingGvIdBaseColumns(client);
  assertSetState(setState, EXPECTED_BEFORE_PRINTING_COUNTS);
  assertTargetChildren(childRows);
  assertHoloSiblings(holoRows);
  assertSchemaInventory(fkInventory, printingGvColumns);
  const childIds = childRows.map((row) => row.row_snapshot.id);
  const printingGvIds = childRows.map((row) => row.row_snapshot.printing_gv_id);
  const assignments = await fetchAssignmentsForChildren(client, childIds, printingGvIds, false);
  const dependencies = await fetchDependencyCounts(client, childIds, printingGvIds);
  assertAssignments(assignments, childRows);
  assertDependencyCounts(dependencies, EXPECTED_ASSIGNMENT_COUNT);
  return { setState, childRows, holoRows, assignments, dependencies, fkInventory, printingGvColumns };
}

async function runDryRun(targetBinding, codeBundle) {
  const client = await connectVerifiedDbClient(targetBinding);
  try {
    const preflight = await collectPreflight(client);
    const repairPackage = buildPackage(
      targetBinding,
      codeBundle,
      preflight.childRows,
      preflight.holoRows,
      preflight.assignments,
    );
    const execution = await executeMutation(client, repairPackage, false);
    const afterRollbackState = await fetchSetState(client);
    const afterRollbackChildren = await fetchChildrenByIds(
      client,
      repairPackage.children.map((row) => row.row_snapshot.id),
      false,
    );
    const afterRollbackAssignments = await fetchAssignmentsByIds(
      client,
      repairPackage.assignments.map((row) => row.assignment_id),
      false,
    );
    assertSetState(afterRollbackState, EXPECTED_BEFORE_PRINTING_COUNTS);
    assertExactSnapshotSet(afterRollbackChildren, repairPackage.children, 'Rollback child');
    assertExactSnapshotSet(afterRollbackAssignments, repairPackage.assignments, 'Rollback assignment');
    const summary = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'guarded_dry_run_rolled_back',
      target_binding: targetBinding,
      code_bundle: codeBundle,
      fingerprint: repairPackage.fingerprint,
      plan_hash: repairPackage.planHash,
      mutation_contract: MUTATION_CONTRACT,
      mutation_contract_hash: repairPackage.mutationContractHash,
      child_backup_hash: repairPackage.childBackupHash,
      holo_sibling_hash: repairPackage.holoSiblingHash,
      assignment_backup_hash: repairPackage.assignmentBackupHash,
      assignment_plan_hash: repairPackage.assignmentPlanHash,
      scope: {
        parent_rows_preserved: ME04_EXPECTED_PARENT_COUNT_V1,
        child_rows: repairPackage.children.length,
        assignment_rows: repairPackage.assignments.length,
        raw_evidence_rows_deleted: 0,
        vault_rows_touched: 0,
      },
      schema_inventory: {
        foreign_keys: preflight.fkInventory,
        printing_gv_id_base_columns: preflight.printingGvColumns,
      },
      execution: {
        ...execution,
        after_rollback_state: afterRollbackState,
        rolled_back: true,
        after_rollback_child_snapshot_hash: proofHash(afterRollbackChildren.map((row) => row.row_snapshot)),
        after_rollback_assignment_snapshot_hash: proofHash(afterRollbackAssignments.map((row) => row.row_snapshot)),
      },
      child_backup_jsonl: path.relative(ROOT, CHILD_BACKUP_JSONL),
      assignment_backup_jsonl: path.relative(ROOT, ASSIGNMENT_BACKUP_JSONL),
      assignment_plan_jsonl: path.relative(ROOT, ASSIGNMENT_PLAN_JSONL),
      db_writes_retained: false,
      migrations_created: false,
      ready_for_apply: true,
    };
    await writeJsonl(CHILD_BACKUP_JSONL, repairPackage.children);
    await writeJsonl(ASSIGNMENT_BACKUP_JSONL, repairPackage.assignments.map((row) => ({
      assignment_id: row.assignment_id,
      before_snapshot_hash: row.before_snapshot_hash,
      row_snapshot: row.row_snapshot,
    })));
    await writeJsonl(ASSIGNMENT_PLAN_JSONL, repairPackage.assignments.map((row) => ({
      assignment_id: row.assignment_id,
      before_snapshot_hash: row.before_snapshot_hash,
      expected_after_snapshot_hash: row.expected_after_snapshot_hash,
      expected_after_snapshot: row.expected_after_snapshot,
    })));
    await writeJson(DRY_RUN_JSON, summary);
    await fs.writeFile(DRY_RUN_MD, renderDryRunMarkdown(summary), 'utf8');
    await fs.writeFile(RECOVERY_MD, `# ${PACKAGE_ID} recovery material\n\nThe two backup JSONL files preserve all 45 deleted \`card_printings\` rows, the 45 unchanged Holo sibling snapshots, and all 270 pre-repair \`market_evidence_variant_assignments\` rows as complete JSON snapshots. If recovery is ever authorized, restore the Normal child rows first, then compare-and-swap the assignment rows back to their recorded snapshots in one transaction. Do not execute recovery from these artifacts without a new guarded dry run against the then-current schema and dependencies.\n`, 'utf8');
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      mode: summary.mode,
      fingerprint: summary.fingerprint,
      plan_hash: summary.plan_hash,
      mutation_contract_hash: summary.mutation_contract_hash,
      child_rows: summary.scope.child_rows,
      assignment_rows: summary.scope.assignment_rows,
      proven_after_counts: summary.execution.inside_transaction_after_state,
      rolled_back: summary.execution.rolled_back,
      ready_for_apply: summary.ready_for_apply,
      summary_json: path.relative(ROOT, DRY_RUN_JSON),
    }, null, 2));
  } finally {
    await client.end();
  }
}

async function rebuildPackageFromArtifacts(targetBinding, codeBundle) {
  const [summary, children, assignmentBackups, assignmentPlans] = await Promise.all([
    readJson(DRY_RUN_JSON),
    readJsonl(CHILD_BACKUP_JSONL),
    readJsonl(ASSIGNMENT_BACKUP_JSONL),
    readJsonl(ASSIGNMENT_PLAN_JSONL),
  ]);
  const plansById = new Map(assignmentPlans.map((row) => [row.assignment_id, row]));
  const assignments = assignmentBackups.map((backup) => {
    const plan = plansById.get(backup.assignment_id);
    if (!plan) throw new Error(`Missing assignment plan: ${backup.assignment_id}`);
    return {
      assignment_id: backup.assignment_id,
      before_snapshot_hash: backup.before_snapshot_hash,
      expected_after_snapshot_hash: plan.expected_after_snapshot_hash,
      row_snapshot: backup.row_snapshot,
      expected_after_snapshot: plan.expected_after_snapshot,
    };
  });
  const recomputed = buildPackage(
    targetBinding,
    codeBundle,
    children.map((row) => ({ ...row, snapshot_hash: undefined })),
    children.map((row) => ({
      parent_id: row.parent_id,
      parent_gv_id: row.parent_gv_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      name: row.name,
      row_snapshot: row.holo_row_snapshot,
    })),
    assignments.map((row) => ({ row_snapshot: row.row_snapshot })),
  );
  const findings = [];
  if (summary.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (summary.ready_for_apply !== true) findings.push('dry_run_not_apply_ready');
  if (!targetBindingsEqual(summary.target_binding, targetBinding)) findings.push('target_binding_mismatch');
  if (summary.code_bundle?.hash !== codeBundle.hash) findings.push('code_bundle_hash_mismatch');
  if (summary.fingerprint !== recomputed.fingerprint) findings.push('fingerprint_mismatch');
  if (summary.plan_hash !== recomputed.planHash) findings.push('plan_hash_mismatch');
  if (summary.mutation_contract_hash !== recomputed.mutationContractHash) findings.push('mutation_contract_hash_mismatch');
  if (summary.child_backup_hash !== recomputed.childBackupHash) findings.push('child_backup_hash_mismatch');
  if (summary.holo_sibling_hash !== recomputed.holoSiblingHash) findings.push('holo_sibling_hash_mismatch');
  if (summary.assignment_backup_hash !== recomputed.assignmentBackupHash) findings.push('assignment_backup_hash_mismatch');
  if (summary.assignment_plan_hash !== recomputed.assignmentPlanHash) findings.push('assignment_plan_hash_mismatch');
  if (children.length !== 45) findings.push('child_backup_count_mismatch');
  if (assignmentBackups.length !== EXPECTED_ASSIGNMENT_COUNT || assignmentPlans.length !== EXPECTED_ASSIGNMENT_COUNT) {
    findings.push('assignment_artifact_count_mismatch');
  }
  if (findings.length) throw new Error(`Apply artifact validation failed: ${findings.join(', ')}`);
  return { summary, repairPackage: recomputed };
}

async function runApply(args, targetBinding, codeBundle) {
  const { summary, repairPackage } = await rebuildPackageFromArtifacts(targetBinding, codeBundle);
  if (args.fingerprint !== repairPackage.fingerprint) {
    throw new Error(`Fingerprint mismatch. Expected ${repairPackage.fingerprint}.`);
  }
  if (args.planHash !== repairPackage.planHash) {
    throw new Error(`Plan hash mismatch. Expected ${repairPackage.planHash}.`);
  }
  if (args.mutationContractHash !== repairPackage.mutationContractHash) {
    throw new Error(`Mutation contract hash mismatch. Expected ${repairPackage.mutationContractHash}.`);
  }
  const client = await connectVerifiedDbClient(targetBinding);
  try {
    const execution = await executeMutation(client, repairPackage, true);
    const finalState = await fetchSetState(client);
    assertSetState(finalState, {
      total: ME04_EXPECTED_PRINTING_COUNT_V1,
      ...ME04_EXPECTED_FINISH_COUNTS_V1,
    });
    const result = {
      package_id: PACKAGE_ID,
      mode: 'guarded_apply_committed',
      started_at: execution.started_at,
      ended_at: new Date().toISOString(),
      target_binding: targetBinding,
      code_bundle: codeBundle,
      fingerprint: repairPackage.fingerprint,
      plan_hash: repairPackage.planHash,
      mutation_contract_hash: repairPackage.mutationContractHash,
      dry_run_generated_at: summary.generated_at,
      execution,
      final_state: finalState,
      child_backup_hash: repairPackage.childBackupHash,
      holo_sibling_hash: repairPackage.holoSiblingHash,
      assignment_backup_hash: repairPackage.assignmentBackupHash,
      batch_atomic: true,
      database_writes_performed: true,
      migrations_created: false,
    };
    result.proof_hash = proofHash(result);
    await writeJson(APPLY_RESULT_JSON, result);
    await fs.writeFile(APPLY_RESULT_MD, renderApplyMarkdown(result), 'utf8');
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const [targetBinding, codeBundle] = await Promise.all([
    targetBindingFromEnvironment(),
    computeCodeBundleHash(),
  ]);
  if (targetBinding.supabase_project_ref !== EXPECTED_PROJECT_REF) {
    throw new Error(`Wrong Supabase project: ${targetBinding.supabase_project_ref}`);
  }
  if (args.apply) await runApply(args, targetBinding, codeBundle);
  else await runDryRun(targetBinding, codeBundle);
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
