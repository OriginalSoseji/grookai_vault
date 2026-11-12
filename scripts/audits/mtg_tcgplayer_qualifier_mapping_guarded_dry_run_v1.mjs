#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import { assertPrintingDatabaseTarget } from '../../backend/catalog/master_index_printing_execution_guard_v1.mjs';
import {
  normalizeTcgplayerMappingNumberV1,
} from '../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs';
import {
  stripReviewedMtgTcgplayerQualifierV1,
} from '../../backend/pricing/mtg_tcgplayer_qualifier_review_plan_v1.mjs';

export const MTG_TCGPLAYER_QUALIFIER_MAPPING_GUARDED_DRY_RUN_V1 =
  'MTG_TCGPLAYER_QUALIFIER_MAPPING_GUARDED_DRY_RUN_V1';

const PACKAGE_ID = 'MTG-TCGPLAYER-QUALIFIER-MAPPING-RELEASE-V1';
const PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXPECTED_POLICY = 'MTG_TCGPLAYER_QUALIFIER_REVIEW_PLAN_V1';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function stableHash(value) {
  return sha256(JSON.stringify(stable(value)));
}

function text(value) {
  return String(value ?? '').trim();
}

function foldedName(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ')
    .trim();
}

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
}

function parseArgs(argv) {
  const options = {};
  for (const token of argv) {
    assert.ok(!['--apply', '--run', '--commit'].includes(token), 'rehearsal_has_no_apply_mode');
    const match = /^--(package-root|out-dir|expected-head-sha)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = match[2];
  }
  assert.ok(options['package-root'], '--package-root is required');
  assert.ok(options['out-dir'], '--out-dir is required');
  assert.match(options['expected-head-sha'] ?? '', /^[a-f0-9]{40}$/,
    '--expected-head-sha must be a full Git SHA');
  return {
    packageRoot: path.resolve(options['package-root']),
    outDir: path.resolve(options['out-dir']),
    expectedHeadSha: options['expected-head-sha'],
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return {
    raw,
    rows: raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)),
  };
}

async function loadPackage(options, headSha) {
  const summaryPath = path.join(options.packageRoot, 'summary.json');
  const readyPath = path.join(options.packageRoot, 'ready_mappings.jsonl');
  const heldPath = path.join(options.packageRoot, 'held_rows.jsonl');
  const hashPath = path.join(options.packageRoot, 'artifact_hashes.json');
  const [summaryRaw, ready, heldRaw, hashes] = await Promise.all([
    fs.readFile(summaryPath, 'utf8'),
    readJsonl(readyPath),
    fs.readFile(heldPath, 'utf8'),
    readJson(hashPath),
  ]);
  assert.equal(sha256(summaryRaw), hashes['summary.json'], 'summary_hash_changed');
  assert.equal(sha256(ready.raw), hashes['ready_mappings.jsonl'], 'ready_rows_hash_changed');
  assert.equal(sha256(heldRaw), hashes['held_rows.jsonl'], 'held_rows_hash_changed');
  const summary = JSON.parse(summaryRaw);
  assert.equal(summary.policy_version, EXPECTED_POLICY, 'package_policy_changed');
  assert.equal(summary.status, 'ready_for_founder_review', 'package_not_ready');
  assert.match(summary.source_commit ?? '', /^[a-f0-9]{40}$/, 'package_source_commit_invalid');
  try {
    git(['merge-base', '--is-ancestor', summary.source_commit, headSha]);
  } catch {
    assert.fail('package_source_commit_not_ancestor');
  }
  assert.equal(summary.counts?.ready_rows, ready.rows.length, 'package_ready_count_changed');
  assert.equal(summary.counts?.held_rows, 10, 'package_held_count_changed');
  assert.equal(summary.boundaries?.mapping_writes, false, 'review_package_claims_write_authority');
  assert.equal(summary.boundaries?.transactional_revalidation_required, true,
    'transactional_revalidation_boundary_missing');
  assert.equal(ready.rows.length, 452, 'reviewed_mapping_scope_changed');
  const products = ready.rows.map((row) => Number(row.source_product_id));
  const targets = ready.rows.map((row) => text(row.target_card_print_id));
  assert.equal(new Set(products).size, ready.rows.length, 'duplicate_source_product');
  assert.equal(new Set(targets).size, ready.rows.length, 'duplicate_target_card_print');
  const manifest = ready.rows.map((row) => ({
    source_product_id: row.source_product_id,
    source_group_id: row.source_group_id,
    target_card_print_id: row.target_card_print_id,
    target_gv_id: row.target_gv_id,
    mapping_method: row.mapping_method,
  }));
  assert.equal(sha256(JSON.stringify(manifest)), summary.manifest_sha256,
    'review_manifest_changed');
  return {
    summary,
    ready: ready.rows,
    readyBytes: ready.raw,
    hashes,
    rehearsalSourceCommit: headSha,
  };
}

function numberField(extendedData) {
  const values = [...new Set((Array.isArray(extendedData) ? extendedData : [])
    .filter((field) => text(field?.name).toLocaleLowerCase('en-US') === 'number')
    .map((field) => text(field?.value))
    .filter(Boolean))];
  return values.length === 1 ? values[0] : '';
}

function connectionConfig(applicationName) {
  const publicUrl = new URL(process.env.SUPABASE_URL);
  assert.equal(publicUrl.hostname.split('.')[0], PROJECT_REF, 'production_project_ref_mismatch');
  assert.ok(process.env.SUPABASE_DB_URL, 'SUPABASE_DB_URL_required');
  const databaseUrl = assertPrintingDatabaseTarget(process.env.SUPABASE_DB_URL);
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  return {
    connectionString: databaseUrl.href,
    ssl: ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false },
    application_name: applicationName,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 600_000,
    query_timeout: 610_000,
  };
}

async function loadLatestSourceRun(client) {
  const row = (await client.query(`select id::text, observed_on, finished_at, artifact_hash
    from public.tcgcsv_source_sync_runs
    where sync_mode='current_full_sync' and status='completed' and failed_count=0
    order by observed_on desc, finished_at desc, id desc limit 1`)).rows[0];
  assert.ok(row?.id, 'latest_completed_source_run_missing');
  return row;
}

async function protectedCounts(client) {
  return (await client.query(`select jsonb_build_object(
    'active_total', count(*) filter(where mapping.active),
    'active_mtg', count(*) filter(where mapping.active and exists(
      select 1 from public.card_print_identity identity
      where identity.card_print_id=mapping.card_print_id and identity.is_active
        and identity.identity_domain='mtg_eng_paper_print')),
    'active_non_mtg', count(*) filter(where mapping.active and not exists(
      select 1 from public.card_print_identity identity
      where identity.card_print_id=mapping.card_print_id and identity.is_active
        and identity.identity_domain='mtg_eng_paper_print'))
    ) value from public.external_mappings mapping`)).rows[0].value;
}

async function loadLiveState(client, mappings) {
  const productIds = mappings.map((row) => Number(row.source_product_id));
  const targetIds = mappings.map((row) => row.target_card_print_id);
  const groupIds = [...new Set(mappings.map((row) => Number(row.source_group_id)))];
  const sourceRun = await loadLatestSourceRun(client);
  const products = (await client.query(`select product.product_id,product.category_id,
    product.group_id,source_group.name group_name,product.name,product.extended_data,
    product.source_active,product.catalog_metadata_status,product.last_seen_run_id::text
    from public.tcgcsv_source_products product
    join public.tcgcsv_source_groups source_group on source_group.group_id=product.group_id
    where product.product_id=any($1::integer[]) order by product.product_id`, [productIds])).rows;
  const observations = (await client.query(`select id::text,product_id,subtype_name,
    last_seen_run_id::text from public.tcgcsv_source_price_daily_observations
    where last_seen_run_id=$1::uuid and observed_on=$2::date
      and product_id=any($3::integer[])
    order by product_id,subtype_name,id`, [sourceRun.id, sourceRun.observed_on, productIds])).rows;
  const targets = (await client.query(`select card.id::text card_print_id,card.gv_id,
    card.set_id::text,card.set_code,card.name,card.number,card.variant_key,
    count(distinct identity.id) filter(where identity.is_active
      and identity.identity_domain='mtg_eng_paper_print')::integer active_standard_identity_count,
    count(distinct mapping.id) filter(where mapping.source='tcgplayer'
      and mapping.active)::integer active_tcgplayer_mapping_count
    from public.card_prints card
    left join public.card_print_identity identity on identity.card_print_id=card.id
    left join public.external_mappings mapping on mapping.card_print_id=card.id
    where card.id=any($1::uuid[])
    group by card.id order by card.id`, [targetIds])).rows;
  const groups = (await client.query(`select product.group_id source_group_id,
    count(distinct mapping.external_id)::integer mapped_source_product_count,
    count(distinct card.set_id)::integer set_count,min(card.set_id::text) set_id,
    min(card.set_code) set_code
    from public.tcgcsv_source_products product
    join public.external_mappings mapping on mapping.source='tcgplayer'
      and mapping.external_id=product.product_id::text and mapping.active
    join public.card_prints card on card.id=mapping.card_print_id
    where product.group_id=any($1::integer[])
    group by product.group_id order by product.group_id`, [groupIds])).rows;
  const existingMappings = (await client.query(`select id::text,card_print_id::text,
    source,external_id,active,meta,synced_at
    from public.external_mappings where source='tcgplayer'
      and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))
    order by external_id,id`, [productIds.map(String), targetIds])).rows;
  return { sourceRun, products, observations, targets, groups, existingMappings };
}

function assertLiveState(expected, live) {
  assert.equal(live.products.length, expected.length, 'live_source_product_count_changed');
  assert.equal(live.targets.length, expected.length, 'live_target_count_changed');
  assert.equal(live.existingMappings.length, 0, 'mapping_history_or_collision_now_exists');
  const products = new Map(live.products.map((row) => [Number(row.product_id), row]));
  const targets = new Map(live.targets.map((row) => [row.card_print_id, row]));
  const groups = new Map(live.groups.map((row) => [Number(row.source_group_id), row]));
  const observations = new Map();
  for (const row of live.observations) {
    const values = observations.get(Number(row.product_id)) ?? [];
    values.push(row);
    observations.set(Number(row.product_id), values);
  }
  for (const row of expected) {
    const product = products.get(Number(row.source_product_id));
    const target = targets.get(row.target_card_print_id);
    const consensus = groups.get(Number(row.source_group_id));
    const prices = observations.get(Number(row.source_product_id)) ?? [];
    assert.ok(product && target && consensus, `live_binding_missing:${row.source_product_id}`);
    assert.equal(Number(product.category_id), 1, `source_category_changed:${row.source_product_id}`);
    assert.equal(Number(product.group_id), Number(row.source_group_id), `source_group_changed:${row.source_product_id}`);
    assert.equal(product.group_name, row.source_group_name, `source_group_name_changed:${row.source_product_id}`);
    assert.equal(product.name, row.source_product_name, `source_name_changed:${row.source_product_id}`);
    assert.equal(product.source_active, true, `source_inactive:${row.source_product_id}`);
    assert.equal(product.catalog_metadata_status, 'current', `source_metadata_not_current:${row.source_product_id}`);
    assert.equal(product.last_seen_run_id, live.sourceRun.id, `source_not_in_latest_run:${row.source_product_id}`);
    assert.equal(normalizeTcgplayerMappingNumberV1(numberField(product.extended_data)),
      normalizeTcgplayerMappingNumberV1(row.printed_number), `source_number_changed:${row.source_product_id}`);
    const normalized = stripReviewedMtgTcgplayerQualifierV1(product.name);
    assert.equal(normalized.qualifier, row.reviewed_qualifier, `source_qualifier_changed:${row.source_product_id}`);
    assert.equal(foldedName(normalized.base_name), foldedName(target.name),
      `source_target_name_changed:${row.source_product_id}`);
    assert.equal(target.gv_id, row.target_gv_id, `target_gv_id_changed:${row.source_product_id}`);
    assert.equal(target.set_id, row.target_set_id, `target_set_changed:${row.source_product_id}`);
    assert.equal(target.set_code, row.target_set_code, `target_set_code_changed:${row.source_product_id}`);
    assert.equal(target.name, row.canonical_name, `target_name_changed:${row.source_product_id}`);
    assert.equal(normalizeTcgplayerMappingNumberV1(target.number),
      normalizeTcgplayerMappingNumberV1(row.canonical_number), `target_number_changed:${row.source_product_id}`);
    assert.equal(Number(target.active_standard_identity_count), 1,
      `target_identity_not_unique:${row.source_product_id}`);
    assert.equal(Number(target.active_tcgplayer_mapping_count), 0,
      `target_mapping_now_exists:${row.source_product_id}`);
    assert.equal(Number(consensus.set_count), 1, `group_consensus_changed:${row.source_group_id}`);
    assert.equal(consensus.set_id, row.target_set_id, `group_target_changed:${row.source_group_id}`);
    assert.equal(prices.length, Number(row.supporting_gap_row_count),
      `source_price_lane_count_changed:${row.source_product_id}`);
    assert.deepEqual([...new Set(prices.map((price) => price.subtype_name))].sort(),
      [...row.source_subtypes].sort(), `source_price_lanes_changed:${row.source_product_id}`);
  }
  assert.equal(live.observations.length,
    expected.reduce((sum, row) => sum + Number(row.supporting_gap_row_count), 0),
    'projected_price_observation_count_changed');
}

function normalizeMappingRows(rows) {
  return rows.map((row) => ({
    id: row.id,
    card_print_id: row.card_print_id,
    source: row.source,
    external_id: row.external_id,
    active: row.active,
    meta: row.meta,
    synced_at: row.synced_at ? new Date(row.synced_at).toISOString() : null,
  }));
}

function snapshot(rows) {
  const normalized = normalizeMappingRows(rows);
  return { rows: normalized, hash_sha256: stableHash(normalized) };
}

async function independentState(expected, applicationName) {
  const client = new pg.Client(connectionConfig(applicationName));
  await client.connect();
  try {
    await client.query('begin read only');
    const live = await loadLiveState(client, expected);
    const counts = await protectedCounts(client);
    await client.query('rollback');
    return { live, counts, relevant_mappings: snapshot(live.existingMappings) };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function releaseCore(packageData, live) {
  return {
    version: MTG_TCGPLAYER_QUALIFIER_MAPPING_GUARDED_DRY_RUN_V1,
    package_id: PACKAGE_ID,
    source_commit: packageData.rehearsalSourceCommit,
    review_source_commit: packageData.summary.source_commit,
    review_manifest_sha256: packageData.summary.manifest_sha256,
    review_rows_sha256: packageData.hashes['ready_mappings.jsonl'],
    latest_source_sync_run_id: live.sourceRun.id,
    latest_source_artifact_hash: live.sourceRun.artifact_hash,
    source_products: packageData.ready.length,
    target_card_prints: packageData.ready.length,
    projected_price_observations: packageData.summary.counts.projected_price_observations,
    mapping_manifest: packageData.ready.map((row) => ({
      source_product_id: row.source_product_id,
      target_card_print_id: row.target_card_print_id,
      mapping_method: row.mapping_method,
    })),
    boundaries: {
      transient_mapping_inserts: packageData.ready.length,
      durable_mapping_writes: 0,
      canonical_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      updates: 0,
      deletes: 0,
      merges: 0,
      migrations: 0,
    },
  };
}

async function rehearse(packageData) {
  const before = await independentState(packageData.ready,
    'mtg_tcgplayer_qualifier_mapping_before_v1');
  assertLiveState(packageData.ready, before.live);
  assert.equal(before.relevant_mappings.rows.length, 0, 'pre_rehearsal_mapping_history_exists');
  const core = releaseCore(packageData, before.live);
  const packageFingerprint = stableHash(core);
  const client = new pg.Client(connectionConfig('mtg_tcgplayer_qualifier_mapping_rollback_v1'));
  await client.connect();
  let inserted = [];
  try {
    await client.query('begin transaction isolation level serializable');
    await client.query("select pg_advisory_xact_lock(hashtext('tcgplayer_market_exact_mapping_apply_v1'))");
    const server = (await client.query(`select current_database() database,current_user username,
      current_setting('transaction_read_only') read_only`)).rows[0];
    assert.deepEqual(server, { database: 'postgres', username: 'postgres', read_only: 'off' },
      'unexpected_database_execution_identity');
    const live = await loadLiveState(client, packageData.ready);
    assertLiveState(packageData.ready, live);
    assert.equal(live.sourceRun.id, before.live.sourceRun.id, 'source_run_changed_during_rehearsal');
    const payload = packageData.ready.map((row) => ({
      card_print_id: row.target_card_print_id,
      external_id: String(row.source_product_id),
      meta: {
        contract_version: MTG_TCGPLAYER_QUALIFIER_MAPPING_GUARDED_DRY_RUN_V1,
        package_id: PACKAGE_ID,
        package_fingerprint: packageFingerprint,
        review_manifest_sha256: packageData.summary.manifest_sha256,
        review_rows_sha256: packageData.hashes['ready_mappings.jsonl'],
        source_commit: packageData.rehearsalSourceCommit,
        review_source_commit: packageData.summary.source_commit,
        source_sync_run_id: live.sourceRun.id,
        source_group_id: row.source_group_id,
        source_group_name: row.source_group_name,
        source_product_name: row.source_product_name,
        mapping_method: row.mapping_method,
        mapping_confidence: row.mapping_confidence,
        reviewed_qualifier: row.reviewed_qualifier,
        supporting_price_observations: row.supporting_gap_row_count,
      },
    }));
    inserted = (await client.query(`insert into public.external_mappings
      (card_print_id,source,external_id,meta,active,synced_at)
      select item.card_print_id,'tcgplayer',item.external_id,item.meta,true,now()
      from jsonb_to_recordset($1::jsonb) as item(card_print_id uuid,external_id text,meta jsonb)
      order by item.external_id::bigint
      returning id::text,card_print_id::text,source,external_id,active,meta,synced_at`,
    [JSON.stringify(payload)])).rows;
    assert.equal(inserted.length, packageData.ready.length, 'transient_insert_count_mismatch');
    const afterInsert = await loadLiveState(client, packageData.ready);
    assert.equal(afterInsert.existingMappings.length, packageData.ready.length,
      'transient_mapping_readback_count_mismatch');
    for (const row of packageData.ready) {
      const mapping = afterInsert.existingMappings.find((candidate) =>
        candidate.external_id === String(row.source_product_id));
      assert.ok(mapping && mapping.card_print_id === row.target_card_print_id && mapping.active,
        `transient_mapping_readback_mismatch:${row.source_product_id}`);
      assert.equal(mapping.meta?.package_fingerprint, packageFingerprint,
        `transient_mapping_fingerprint_mismatch:${row.source_product_id}`);
    }
    const transactionCounts = await protectedCounts(client);
    assert.equal(Number(transactionCounts.active_non_mtg), Number(before.counts.active_non_mtg),
      'protected_non_mtg_mapping_count_changed');
    assert.equal(Number(transactionCounts.active_mtg) - Number(before.counts.active_mtg),
      packageData.ready.length, 'transient_mtg_mapping_delta_changed');
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  const after = await independentState(packageData.ready,
    'mtg_tcgplayer_qualifier_mapping_after_v1');
  assert.deepEqual(after.relevant_mappings, before.relevant_mappings,
    'rollback_did_not_restore_mapping_snapshot');
  assert.deepEqual(after.counts, before.counts, 'rollback_did_not_restore_protected_counts');
  assert.equal(after.live.sourceRun.id, before.live.sourceRun.id,
    'source_run_changed_before_independent_readback');
  const approval = `Approve real ${PACKAGE_ID} apply only. Source commit: ${core.source_commit}. `
    + `Review source commit: ${core.review_source_commit}. `
    + `Fingerprint: ${packageFingerprint}. Scope: ${core.source_products} insert-only active TCGPlayer `
    + `parent mappings covering ${core.projected_price_observations} MTG price observations. `
    + `Dry-run rollback proof: ${before.relevant_mappings.hash_sha256} == `
    + `${after.relevant_mappings.hash_sha256}. Source sync: ${core.latest_source_sync_run_id}. `
    + 'No canonical identity, pricing, publication, Vault, update, delete, merge, or migration writes.';
  return {
    ...core,
    package_fingerprint_sha256: packageFingerprint,
    status: 'rollback_proof_passed_zero_durable_changes',
    proof: {
      transient_mapping_inserts: inserted.length,
      before_relevant_mappings: before.relevant_mappings,
      after_rollback_relevant_mappings: after.relevant_mappings,
      before_protected_counts: before.counts,
      after_rollback_protected_counts: after.counts,
      rollback_acknowledged: true,
      committed: false,
      durable_database_writes: 0,
    },
    approval_text_required: approval,
    execution: {
      authorized: false,
      next_gate: 'separate_exact_founder_approval',
    },
  };
}

async function writeExclusive(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: 'wx' });
}

export async function runMtgTcgplayerQualifierMappingGuardedDryRunV1(argv) {
  const options = parseArgs(argv);
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '',
    'tracked_worktree_must_be_clean');
  const headSha = git(['rev-parse', 'HEAD']);
  assert.equal(headSha, options.expectedHeadSha, 'expected_head_sha_changed');
  const packageData = await loadPackage(options, headSha);
  const receipt = await rehearse(packageData);
  const receiptBytes = `${JSON.stringify(receipt, null, 2)}\n`;
  const selectedBytes = `${packageData.ready.map((row) => JSON.stringify(row)).join('\n')}\n`;
  const hashes = {
    'guarded_dry_run.json': sha256(receiptBytes),
    'selected_mappings.jsonl': sha256(selectedBytes),
  };
  await writeExclusive(path.join(options.outDir, 'guarded_dry_run.json'), receiptBytes);
  await writeExclusive(path.join(options.outDir, 'selected_mappings.jsonl'), selectedBytes);
  await writeExclusive(path.join(options.outDir, 'artifact_hashes.json'),
    `${JSON.stringify(hashes, null, 2)}\n`);
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runMtgTcgplayerQualifierMappingGuardedDryRunV1(process.argv.slice(2))
    .then((receipt) => process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      package_fingerprint_sha256: receipt.package_fingerprint_sha256,
      source_sync_run_id: receipt.latest_source_sync_run_id,
      transient_mapping_inserts: receipt.proof.transient_mapping_inserts,
      durable_database_writes: receipt.proof.durable_database_writes,
      approval_text_required: receipt.approval_text_required,
    }, null, 2)}\n`))
    .catch((error) => {
      console.error(`[mtg-tcgplayer-qualifier-mapping-rehearsal] ${error.stack ?? error.message}`);
      process.exitCode = 1;
    });
}
