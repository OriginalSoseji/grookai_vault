#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import { assertPrintingDatabaseTarget } from '../../backend/catalog/master_index_printing_execution_guard_v1.mjs';
import { mtgTcgplayerGlobalExactReviewManifestRowV1 } from '../../backend/pricing/mtg_tcgplayer_global_exact_review_queue_v1.mjs';
import { normalizeTcgplayerMappingNumberV1 } from '../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs';
import { stripReviewedMtgTcgplayerQualifierV1 } from '../../backend/pricing/mtg_tcgplayer_qualifier_review_plan_v1.mjs';

export const MTG_TCGPLAYER_GLOBAL_EXACT_MAPPING_PREFLIGHT_V1 =
  'MTG_TCGPLAYER_GLOBAL_EXACT_MAPPING_PREFLIGHT_V1';

const REVIEW_POLICY = 'MTG_TCGPLAYER_GLOBAL_EXACT_REVIEW_QUEUE_V1';
const DECISION_VERSION = 'MTG_GLOBAL_EXACT_BATCH_0001_CONSERVATIVE_FOUNDER_REVIEW_V1';
const PACKAGE_ID = 'MTG-GLOBAL-EXACT-BATCH-0001-MAPPING-OUTCOME-V1';
const PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const PINNED_SUPABASE_ROOT_SHA256 =
  '807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa';
const PINNED_SUPABASE_INTERMEDIATE_SHA256 =
  '303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efceef0a55ea';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let bootstrappedProductionCa;

function opensslExecutable() {
  if (process.platform !== 'win32') return 'openssl';
  const gitExecPath = execFileSync('git', ['--exec-path'], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
  const candidates = [
    path.resolve(gitExecPath, '..', '..', 'bin', 'openssl.exe'),
    path.resolve(gitExecPath, '..', '..', '..', 'usr', 'bin', 'openssl.exe'),
  ];
  const executable = candidates.find((candidate) => existsSync(candidate));
  assert.ok(executable, 'production_database_openssl_unavailable');
  return executable;
}

export function sha256(value) {
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

export function stableHash(value) {
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

export function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
}

function parseArgs(argv) {
  const options = {};
  for (const token of argv) {
    assert.ok(!['--apply', '--run', '--commit', '--dry-run'].includes(token),
      'preflight_has_no_write_or_rehearsal_mode');
    const match = /^--(package-root|approval-file|out-dir|expected-head-sha)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = match[2];
  }
  assert.ok(options['package-root'], '--package-root is required');
  assert.ok(options['approval-file'], '--approval-file is required');
  assert.ok(options['out-dir'], '--out-dir is required');
  assert.match(options['expected-head-sha'] ?? '', /^[a-f0-9]{40}$/,
    '--expected-head-sha must be a full Git SHA');
  return {
    packageRoot: path.resolve(options['package-root']),
    approvalFile: path.resolve(options['approval-file']),
    outDir: path.resolve(options['out-dir']),
    expectedHeadSha: options['expected-head-sha'],
  };
}

async function readJson(file) {
  return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
}

async function readJsonlRaw(file) {
  const raw = await fs.readFile(file, 'utf8');
  return {
    raw,
    rows: raw.split(/\r?\n/).filter(Boolean)
      .map((line, index) => JSON.parse(index === 0 ? line.replace(/^\uFEFF/, '') : line)),
  };
}

function decisionBinding(row) {
  return {
    source_product_id: row.source_product_id,
    target_card_print_id: row.target_card_print_id,
    target_gv_id: row.target_gv_id,
    target_set_code: row.target_set_code,
    mapping_method: row.mapping_method,
  };
}

function expectedApprovalText(approval) {
  return `Approve MTG global exact batch 0001 conservative founder review V1. `
    + `Batch manifest ${approval.batch_manifest_sha256}. `
    + `Decision fingerprint ${approval.decision_fingerprint_sha256}. `
    + 'Accept only the 36 same-set exact mappings, hold the 13 promo-context rows, '
    + 'and reject TCGPlayer product 58205. Review approval only; no mapping, pricing, '
    + 'publication, canonical, Vault, update, delete, merge, migration, or production writes.';
}

export function reconcileApprovedDecision(rows, approval) {
  assert.equal(approval.decision_version, DECISION_VERSION, 'decision_version_changed');
  assert.equal(approval.status, 'founder_review_approved', 'founder_review_not_approved');
  assert.equal(approval.approval_text, expectedApprovalText(approval), 'approval_text_changed');
  assert.deepEqual(approval.authority, {
    mapping_writes: false,
    pricing_writes: false,
    publication_writes: false,
    canonical_writes: false,
    vault_writes: false,
    production_writes: false,
  }, 'review_approval_claims_write_authority');

  const byProduct = new Map(rows.map((row) => [Number(row.source_product_id), row]));
  assert.equal(byProduct.size, rows.length, 'duplicate_batch_source_product');
  const acceptedIds = approval.accepted_source_product_ids.map(Number);
  const heldIds = approval.held_source_product_ids.map(Number);
  const rejectedIds = approval.rejected_source_product_ids.map(Number);
  const allIds = [...acceptedIds, ...heldIds, ...rejectedIds];
  assert.equal(allIds.length, rows.length, 'decision_partition_count_changed');
  assert.equal(new Set(allIds).size, rows.length, 'decision_partition_overlap');
  assert.ok(allIds.every((id) => byProduct.has(id)), 'decision_partition_product_changed');
  assert.equal(acceptedIds.length, 36, 'accepted_scope_changed');
  assert.equal(heldIds.length, 13, 'held_scope_changed');
  assert.deepEqual(rejectedIds, [58205], 'rejected_scope_changed');

  const accepted = acceptedIds.map((id) => byProduct.get(id));
  const held = heldIds.map((id) => byProduct.get(id));
  const rejected = rejectedIds.map((id) => byProduct.get(id));
  for (const row of accepted) {
    assert.ok(text(row.group_consensus_set_code), `accepted_set_consensus_missing:${row.source_product_id}`);
    assert.equal(row.group_consensus_set_code, row.target_set_code,
      `accepted_set_code_changed:${row.source_product_id}`);
    assert.equal(row.mapping_authority, false, `review_row_claims_mapping_authority:${row.source_product_id}`);
    assert.equal(row.publication_authority, false,
      `review_row_claims_publication_authority:${row.source_product_id}`);
  }
  const decision = {
    decision_version: approval.decision_version,
    batch_manifest_sha256: approval.batch_manifest_sha256,
    accepted: accepted.map(decisionBinding),
    held: held.map(decisionBinding),
    rejected: rejected.map(decisionBinding),
    mapping_authority: false,
    pricing_authority: false,
    publication_authority: false,
  };
  assert.equal(sha256(JSON.stringify(decision)), approval.decision_fingerprint_sha256,
    'decision_fingerprint_changed');
  assert.equal(new Set(accepted.map((row) => row.target_card_print_id)).size, accepted.length,
    'accepted_target_collision');
  return { accepted, held, rejected, decision };
}

export function reviewBatchManifestSha256(rows) {
  return sha256(JSON.stringify(rows.map(mtgTcgplayerGlobalExactReviewManifestRowV1)));
}

export async function loadApprovedPackage(options, headSha) {
  const approvalRaw = await fs.readFile(options.approvalFile, 'utf8');
  const approval = JSON.parse(approvalRaw.replace(/^\uFEFF/, ''));
  const batchName = `batch-${String(approval.batch_index).padStart(4, '0')}`;
  const batchRoot = path.join(options.packageRoot, 'batches', batchName);
  const reviewPath = path.join(batchRoot, 'review_candidates.jsonl');
  const batchSummaryPath = path.join(batchRoot, 'summary.json');
  const rootSummaryPath = path.join(options.packageRoot, 'summary.json');
  const [review, batchSummaryRaw, rootSummaryRaw, hashes, complete] = await Promise.all([
    readJsonlRaw(reviewPath),
    fs.readFile(batchSummaryPath, 'utf8'),
    fs.readFile(rootSummaryPath, 'utf8'),
    readJson(path.join(options.packageRoot, 'artifact_hashes.json')),
    readJson(path.join(options.packageRoot, 'COMPLETE_V1.json')),
  ]);
  const relativeReviewPath = `batches/${batchName}/review_candidates.jsonl`;
  const relativeSummaryPath = `batches/${batchName}/summary.json`;
  assert.equal(sha256(review.raw), hashes[relativeReviewPath], 'review_rows_hash_changed');
  assert.equal(sha256(batchSummaryRaw), hashes[relativeSummaryPath], 'batch_summary_hash_changed');
  assert.equal(sha256(rootSummaryRaw), hashes['summary.json'], 'root_summary_hash_changed');
  const batchSummary = JSON.parse(batchSummaryRaw);
  const rootSummary = JSON.parse(rootSummaryRaw);
  assert.equal(rootSummary.policy_version, REVIEW_POLICY, 'review_policy_changed');
  assert.equal(rootSummary.status, 'ready_for_founder_review_batches', 'review_package_not_ready');
  assert.equal(complete.status, 'complete', 'review_package_not_complete');
  assert.equal(complete.manifest_sha256, rootSummary.manifest_sha256, 'completion_manifest_changed');
  assert.equal(approval.queue_manifest_sha256, rootSummary.manifest_sha256, 'approval_queue_manifest_changed');
  assert.equal(approval.batch_id, batchSummary.batch_id, 'approval_batch_id_changed');
  assert.equal(Number(approval.batch_index), Number(batchSummary.batch_index), 'approval_batch_index_changed');
  assert.equal(approval.batch_manifest_sha256, batchSummary.manifest_sha256,
    'approval_batch_manifest_changed');
  assert.equal(review.rows.length, batchSummary.row_count, 'batch_row_count_changed');
  assert.equal(reviewBatchManifestSha256(review.rows), approval.batch_manifest_sha256,
    'review_critical_batch_evidence_changed');
  assert.equal(approval.queue_source_commit, rootSummary.source_commit, 'queue_source_commit_changed');
  assert.match(approval.review_producer_commit ?? '', /^[a-f0-9]{40}$/,
    'review_producer_commit_invalid');
  git(['merge-base', '--is-ancestor', approval.review_producer_commit, headSha]);
  git(['merge-base', '--is-ancestor', rootSummary.source_commit, headSha]);
  const reconciled = reconcileApprovedDecision(review.rows, approval);
  return {
    ...reconciled,
    approval,
    approvalSha256: sha256(approvalRaw),
    batchRowsSha256: sha256(review.raw),
    rootSummary,
    batchSummary,
  };
}

function numberField(extendedData) {
  const values = [...new Set((Array.isArray(extendedData) ? extendedData : [])
    .filter((field) => text(field?.name).toLocaleLowerCase('en-US') === 'number')
    .map((field) => text(field?.value))
    .filter(Boolean))];
  return values.length === 1 ? values[0] : '';
}

export function connectionConfig(applicationName) {
  const publicUrl = new URL(process.env.SUPABASE_URL);
  assert.equal(publicUrl.hostname.split('.')[0], PROJECT_REF, 'production_project_ref_mismatch');
  assert.ok(process.env.SUPABASE_DB_URL, 'SUPABASE_DB_URL_required');
  assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, '0',
    'production_database_insecure_tls_environment');
  const databaseUrl = assertPrintingDatabaseTarget(process.env.SUPABASE_DB_URL);
  const configuredCa = process.env.SUPABASE_DB_CA_CERT?.trim();
  if (configuredCa) assert.match(configuredCa,
    /^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/,
    'production_database_invalid_ca_certificate');
  if (!configuredCa && !bootstrappedProductionCa) {
    // Bootstrap only public certificate bytes, without database credentials, and
    // accept the chain only after the same pinned root/intermediate proof used by
    // the governed catalog release executors.
    const chainText = execFileSync(opensslExecutable(), [
      's_client',
      '-starttls', 'postgres',
      '-connect', `${databaseUrl.hostname}:${databaseUrl.port}`,
      '-servername', databaseUrl.hostname,
      '-showcerts',
    ], {
      input: '',
      encoding: 'utf8',
      timeout: 15_000,
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    });
    const pems = chainText.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
    );
    assert.equal(pems?.length, 3, 'production_database_certificate_chain_changed');
    const certificates = pems.map((pem) => new X509Certificate(pem));
    assert.equal(sha256(certificates[2].raw), PINNED_SUPABASE_ROOT_SHA256,
      'production_database_root_certificate_changed');
    assert.equal(sha256(certificates[1].raw), PINNED_SUPABASE_INTERMEDIATE_SHA256,
      'production_database_intermediate_certificate_changed');
    assert.ok(certificates[0].checkHost(databaseUrl.hostname),
      'production_database_leaf_hostname_changed');
    const now = Date.now();
    for (const certificate of certificates) {
      assert.ok(Date.parse(certificate.validFrom) < now && Date.parse(certificate.validTo) > now,
        'production_database_certificate_expired_or_not_yet_valid');
    }
    assert.ok(certificates[0].verify(certificates[1].publicKey)
      && certificates[1].verify(certificates[2].publicKey)
      && certificates[2].verify(certificates[2].publicKey),
    'production_database_certificate_signature_changed');
    bootstrappedProductionCa = pems.slice(1);
  }
  const ca = configuredCa || bootstrappedProductionCa;
  assert.ok(ca, 'production_database_verified_ca_unavailable');
  return {
    connectionString: databaseUrl.href,
    ssl: {
      rejectUnauthorized: true,
      servername: databaseUrl.hostname,
      ca,
    },
    application_name: applicationName,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 600_000,
    query_timeout: 610_000,
  };
}

export function assertVerifiedProductionTls(client) {
  const stream = client?.connection?.stream;
  assert.equal(stream?.encrypted, true, 'production_database_tls_not_encrypted');
  assert.equal(stream?.authorized, true, 'production_database_tls_not_verified');
}

export async function protectedCounts(client) {
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

async function loadLatestSourceRun(client) {
  const row = (await client.query(`select id::text, observed_on, finished_at, artifact_hash
    from public.tcgcsv_source_sync_runs
    where sync_mode='current_full_sync' and status='completed' and failed_count=0
    order by observed_on desc, finished_at desc, id desc limit 1`)).rows[0];
  assert.ok(row?.id, 'latest_completed_source_run_missing');
  return row;
}

export async function loadLiveState(client, expected) {
  const productIds = expected.map((row) => Number(row.source_product_id));
  const targetIds = expected.map((row) => row.target_card_print_id);
  const sourceRun = await loadLatestSourceRun(client);
  const products = (await client.query(`select product.product_id,product.category_id,
    product.group_id,source_group.name group_name,product.name,product.extended_data,
    product.source_active,product.catalog_metadata_status,product.last_seen_run_id::text
    from public.tcgcsv_source_products product
    join public.tcgcsv_source_groups source_group on source_group.group_id=product.group_id
    where product.product_id=any($1::integer[]) order by product.product_id`, [productIds])).rows;
  const observations = (await client.query(`select observation.id::text,observation.product_id,
    observation.subtype_name,observation.last_seen_run_id::text,observation.observed_on
    from public.tcgcsv_source_price_daily_observations observation
    where observation.last_seen_run_id=$1::uuid and observation.product_id=any($2::integer[])
    order by observation.product_id,observation.subtype_name,observation.id`,
  [sourceRun.id, productIds])).rows;
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
  const existingMappings = (await client.query(`select id::text,card_print_id::text,
    source,external_id,active,meta,synced_at
    from public.external_mappings where source='tcgplayer'
      and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))
    order by external_id,id`, [productIds.map(String), targetIds])).rows;
  return { sourceRun, products, observations, targets, existingMappings };
}

export function assertLiveState(expected, live) {
  assert.equal(live.products.length, expected.length, 'live_source_product_count_changed');
  assert.equal(live.targets.length, expected.length, 'live_target_count_changed');
  assert.equal(live.existingMappings.length, 0, 'mapping_history_or_collision_now_exists');
  const products = new Map(live.products.map((row) => [Number(row.product_id), row]));
  const targets = new Map(live.targets.map((row) => [row.card_print_id, row]));
  const observations = new Map();
  for (const row of live.observations) {
    const values = observations.get(Number(row.product_id)) ?? [];
    values.push(row);
    observations.set(Number(row.product_id), values);
  }
  for (const row of expected) {
    const product = products.get(Number(row.source_product_id));
    const target = targets.get(row.target_card_print_id);
    const prices = observations.get(Number(row.source_product_id)) ?? [];
    assert.ok(product && target, `live_binding_missing:${row.source_product_id}`);
    assert.equal(Number(product.category_id), 1, `source_category_changed:${row.source_product_id}`);
    assert.equal(Number(product.group_id), Number(row.source_group_id),
      `source_group_changed:${row.source_product_id}`);
    assert.equal(product.group_name, row.source_group_name,
      `source_group_name_changed:${row.source_product_id}`);
    assert.equal(product.name, row.source_product_name, `source_name_changed:${row.source_product_id}`);
    assert.equal(product.source_active, true, `source_inactive:${row.source_product_id}`);
    assert.equal(product.catalog_metadata_status, 'current',
      `source_metadata_not_current:${row.source_product_id}`);
    assert.equal(product.last_seen_run_id, live.sourceRun.id,
      `source_not_in_latest_run:${row.source_product_id}`);
    assert.equal(normalizeTcgplayerMappingNumberV1(numberField(product.extended_data)),
      normalizeTcgplayerMappingNumberV1(row.printed_number),
      `source_number_changed:${row.source_product_id}`);
    const normalized = stripReviewedMtgTcgplayerQualifierV1(product.name);
    assert.equal(foldedName(normalized.base_name), foldedName(target.name),
      `source_target_name_changed:${row.source_product_id}`);
    assert.equal(target.gv_id, row.target_gv_id, `target_gv_id_changed:${row.source_product_id}`);
    assert.equal(target.set_id, row.target_set_id, `target_set_changed:${row.source_product_id}`);
    assert.equal(target.set_code, row.target_set_code,
      `target_set_code_changed:${row.source_product_id}`);
    assert.equal(target.name, row.canonical_name, `target_name_changed:${row.source_product_id}`);
    assert.equal(normalizeTcgplayerMappingNumberV1(target.number),
      normalizeTcgplayerMappingNumberV1(row.canonical_number),
      `target_number_changed:${row.source_product_id}`);
    assert.equal(target.variant_key, row.target_variant_key,
      `target_variant_changed:${row.source_product_id}`);
    assert.equal(Number(target.active_standard_identity_count), 1,
      `target_identity_not_unique:${row.source_product_id}`);
    assert.equal(Number(target.active_tcgplayer_mapping_count), 0,
      `target_mapping_now_exists:${row.source_product_id}`);
    assert.equal(prices.length, Number(row.supporting_gap_row_count),
      `current_price_observation_count_changed:${row.source_product_id}`);
    assert.deepEqual([...new Set(prices.map((price) => price.subtype_name))].sort(),
      [...row.source_subtypes].sort(), `source_price_lanes_changed:${row.source_product_id}`);
  }
}

export function mappingSnapshot(rows) {
  const normalized = rows.map((row) => ({
    id: row.id,
    card_print_id: row.card_print_id,
    source: row.source,
    external_id: row.external_id,
    active: row.active,
    meta: row.meta,
    synced_at: row.synced_at ? new Date(row.synced_at).toISOString() : null,
  }));
  return { rows: normalized, hash_sha256: stableHash(normalized) };
}

export async function independentRead(expected, applicationName) {
  const client = new pg.Client(connectionConfig(applicationName));
  await client.connect();
  try {
    assertVerifiedProductionTls(client);
    await client.query('begin transaction isolation level repeatable read read only');
    const server = (await client.query(`select current_database() database,current_user username,
      current_setting('transaction_read_only') read_only`)).rows[0];
    assert.equal(server.read_only, 'on', 'preflight_transaction_is_not_read_only');
    const live = await loadLiveState(client, expected);
    const counts = await protectedCounts(client);
    await client.query('rollback');
    return { server, live, counts, relevantMappings: mappingSnapshot(live.existingMappings) };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

export async function writeExclusive(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: 'wx' });
}

export async function runMtgTcgplayerGlobalExactMappingPreflightV1(argv) {
  const options = parseArgs(argv);
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '',
    'tracked_worktree_must_be_clean');
  const headSha = git(['rev-parse', 'HEAD']);
  assert.equal(headSha, options.expectedHeadSha, 'expected_head_sha_changed');
  const packageData = await loadApprovedPackage(options, headSha);
  const first = await independentRead(packageData.accepted,
    'mtg_global_exact_mapping_preflight_first_v1');
  assertLiveState(packageData.accepted, first.live);
  const second = await independentRead(packageData.accepted,
    'mtg_global_exact_mapping_preflight_readback_v1');
  assertLiveState(packageData.accepted, second.live);
  assert.equal(second.live.sourceRun.id, first.live.sourceRun.id,
    'latest_source_run_changed_during_preflight');
  assert.deepEqual(second.relevantMappings, first.relevantMappings,
    'relevant_mapping_snapshot_changed_during_preflight');
  assert.deepEqual(second.counts, first.counts, 'protected_mapping_counts_changed_during_preflight');

  const core = {
    version: MTG_TCGPLAYER_GLOBAL_EXACT_MAPPING_PREFLIGHT_V1,
    package_id: PACKAGE_ID,
    source_commit: headSha,
    queue_source_commit: packageData.rootSummary.source_commit,
    review_producer_commit: packageData.approval.review_producer_commit,
    queue_manifest_sha256: packageData.approval.queue_manifest_sha256,
    batch_manifest_sha256: packageData.approval.batch_manifest_sha256,
    batch_rows_sha256: packageData.batchRowsSha256,
    decision_fingerprint_sha256: packageData.approval.decision_fingerprint_sha256,
    approval_artifact_sha256: packageData.approvalSha256,
    evidence_source_sync_run_id: first.live.sourceRun.id,
    latest_catalog_artifact_hash: first.live.sourceRun.artifact_hash,
    source_products: packageData.accepted.length,
    target_card_prints: packageData.accepted.length,
    projected_price_observations: packageData.accepted.reduce(
      (sum, row) => sum + Number(row.supporting_gap_row_count), 0),
    mapping_manifest: packageData.accepted.map((row) => ({
      source_product_id: row.source_product_id,
      target_card_print_id: row.target_card_print_id,
      mapping_method: row.mapping_method,
    })),
    boundaries: {
      database_transaction_mode: 'read_only',
      mapping_writes: 0,
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
  const fingerprint = stableHash(core);
  const approvalText = `Approve real ${PACKAGE_ID} apply only. Source commit: ${headSha}. `
    + `Preflight fingerprint: ${fingerprint}. Review decision fingerprint: `
    + `${packageData.approval.decision_fingerprint_sha256}. Scope: ${core.source_products} `
    + `insert-only active TCGPlayer parent mappings covering `
    + `${core.projected_price_observations} MTG price observations. Evidence source sync: `
    + `${core.evidence_source_sync_run_id}. Read-only mapping snapshot: `
    + `${first.relevantMappings.hash_sha256} == ${second.relevantMappings.hash_sha256}. `
    + 'No canonical identity, pricing, publication, Vault, update, delete, merge, or migration writes.';
  const receipt = {
    ...core,
    preflight_fingerprint_sha256: fingerprint,
    status: 'read_only_preflight_passed_zero_mapping_authority',
    proof: {
      first_relevant_mappings: first.relevantMappings,
      independent_relevant_mappings: second.relevantMappings,
      first_protected_counts: first.counts,
      independent_protected_counts: second.counts,
      database_transaction_mode: 'read_only',
      durable_database_writes: 0,
    },
    approval_text_required: approvalText,
    execution: {
      authorized: false,
      next_gate: 'separate_exact_founder_approval',
    },
  };
  const receiptBytes = `${JSON.stringify(receipt, null, 2)}\n`;
  const selectedBytes = `${packageData.accepted.map((row) => JSON.stringify(row)).join('\n')}\n`;
  const hashes = {
    'preflight.json': sha256(receiptBytes),
    'selected_mappings.jsonl': sha256(selectedBytes),
  };
  await writeExclusive(path.join(options.outDir, 'preflight.json'), receiptBytes);
  await writeExclusive(path.join(options.outDir, 'selected_mappings.jsonl'), selectedBytes);
  await writeExclusive(path.join(options.outDir, 'artifact_hashes.json'),
    `${JSON.stringify(hashes, null, 2)}\n`);
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runMtgTcgplayerGlobalExactMappingPreflightV1(process.argv.slice(2))
    .then((receipt) => process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      preflight_fingerprint_sha256: receipt.preflight_fingerprint_sha256,
      evidence_source_sync_run_id: receipt.evidence_source_sync_run_id,
      source_products: receipt.source_products,
      projected_price_observations: receipt.projected_price_observations,
      durable_database_writes: receipt.proof.durable_database_writes,
      approval_text_required: receipt.approval_text_required,
    }, null, 2)}\n`))
    .catch((error) => {
      console.error(`[mtg-global-exact-mapping-preflight] ${error.stack ?? error.message}`);
      process.exitCode = 1;
    });
}
