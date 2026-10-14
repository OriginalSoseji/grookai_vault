import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import { assertMasterPrintingAuthority } from '../../backend/catalog/master_index_printing_authority_v1.mjs';
import { printingManifestHash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import { freezeMasterMappingAuthority } from '../../backend/pricing/master_index_mapping_authority_v1.mjs';
import {
  normalizeTcgplayerMappingNameV1,
  normalizeTcgplayerMappingNumberV1,
} from '../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs';

const VERSION = 'TCGPLAYER_30C_CLASSIC_MAPPING_AUTHORITY_V1';
const PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const SET_CODE = '30c-classic';
const SET_ID = '69ee4802-7bfb-52e5-a1f5-4cddac79002d';
const GROUP_ID = 24837;
const EXACT_CANDIDATE_COUNT = 28;
const MAX_BATCH_SIZE = 25;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const sha256 = value => createHash('sha256').update(value).digest('hex');
const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const number = value => normalizeTcgplayerMappingNumberV1(String(value ?? ''));
const git = args => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

function parseArgs(args) {
  const options = {};
  for (const token of args) {
    const match = /^--(plan-dir|out-dir|printing-authority-dir|reviewed-at)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = match[2];
  }
  for (const name of ['plan-dir', 'out-dir', 'printing-authority-dir', 'reviewed-at']) {
    assert.ok(options[name], `--${name} is required`);
  }
  assert.ok(Number.isFinite(Date.parse(options['reviewed-at'])), '--reviewed-at must be an ISO timestamp');
  return {
    planDir: path.resolve(options['plan-dir']),
    outDir: path.resolve(options['out-dir']),
    printingAuthorityDir: path.resolve(options['printing-authority-dir']),
    reviewedAt: new Date(options['reviewed-at']).toISOString(),
  };
}

async function writeFileExclusive(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: 'wx' });
}

async function loadPrintingAuthority(directory) {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
  const artifactMap = JSON.parse(await fs.readFile(path.join(directory, 'artifact-map.json'), 'utf8'));
  const artifacts = new Map();
  for (const entry of artifactMap) {
    artifacts.set(entry.ref, await fs.readFile(path.join(directory, entry.path)));
  }
  assertMasterPrintingAuthority(manifest, artifacts);
  assert.equal(manifest.set_code, SET_CODE, 'printing_authority_set_code_changed');
  assert.equal(manifest.authority.set_id, SET_ID, 'printing_authority_set_id_changed');
  return { manifest, artifacts };
}

function productNumber(product) {
  return product.extended_data?.find(field => String(field?.name ?? '').toLowerCase() === 'number')?.value ?? '';
}

async function readDatabase(candidates) {
  const publicUrl = new URL(process.env.SUPABASE_URL);
  assert.equal(publicUrl.hostname.split('.')[0], PROJECT_REF, 'production_project_ref_mismatch');
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true },
    application_name: '30c_classic_mapping_authority_read_only',
    statement_timeout: 120_000,
    query_timeout: 125_000,
  });
  await client.connect();
  try {
    await client.query('begin transaction isolation level repeatable read read only');
    const server = (await client.query(`select current_database() database,current_user username,
      current_setting('transaction_read_only') read_only`)).rows[0];
    assert.deepEqual(server, { database: 'postgres', username: 'postgres', read_only: 'on' });
    const ids = candidates.map(row => row.target.card_print_id);
    const productIds = candidates.map(row => Number(row.source_product_id));
    const parents = (await client.query(`select id::text,set_id::text,name,number,variant_key,gv_id,
      identity_domain,printed_identity_modifier from public.card_prints where id=any($1::uuid[]) order by id`, [ids])).rows;
    const printings = (await client.query(`select id::text,card_print_id::text,finish_key,printing_gv_id,
      is_provisional,provenance_source,provenance_ref from public.card_printings
      where card_print_id=any($1::uuid[]) order by card_print_id,finish_key`, [ids])).rows;
    const products = (await client.query(`select product_id,category_id,group_id,name,clean_name,source_url,
      source_modified_on,extended_data,raw_payload,payload_hash,last_seen_at,last_seen_run_id,source_active,
      catalog_metadata_status from public.tcgcsv_source_products where product_id=any($1::integer[])
      order by product_id`, [productIds])).rows;
    const existing = (await client.query(`select external_id,card_print_id::text from public.external_mappings
      where source='tcgplayer' and active and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))`,
    [productIds.map(String), ids])).rows;
    await client.query('commit');
    return { parents, printings, products, existing };
  } finally {
    await client.end();
  }
}

export async function build30cClassicAuthority(args) {
  const options = parseArgs(args);
  const candidateBytes = await fs.readFile(path.join(options.planDir, 'candidates.jsonl'));
  const candidates = candidateBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  assert.equal(candidates.length, EXACT_CANDIDATE_COUNT, 'exact_candidate_count_changed');
  assert.ok(candidates.every(row => row.source_group_id === GROUP_ID && row.target?.set_code === SET_CODE &&
    row.target?.set_id === SET_ID && row.evidence_lane === 'reviewed_group_set_authority'), '30c_classic_scope_drift');
  assert.equal(new Set(candidates.map(row => row.source_product_id)).size, candidates.length, 'duplicate_source_product');
  assert.equal(new Set(candidates.map(row => row.target.card_print_id)).size, candidates.length, 'duplicate_target_parent');

  const historical = await loadPrintingAuthority(options.printingAuthorityDir);
  const selectedIds = new Set(candidates.map(row => row.target.card_print_id));
  const reviewedParents = historical.manifest.parents.filter(row => selectedIds.has(row.id));
  const reviewedPrintings = historical.manifest.printings.filter(row => selectedIds.has(row.card_print_id));
  assert.equal(reviewedParents.length, candidates.length, 'reviewed_parent_scope_changed');
  assert.equal(reviewedPrintings.length, candidates.length, 'reviewed_printing_scope_changed');

  const db = await readDatabase(candidates);
  assert.equal(db.parents.length, candidates.length, 'live_parent_count_changed');
  assert.equal(db.products.length, candidates.length, 'live_source_product_count_changed');
  assert.equal(db.existing.length, 0, 'target_or_source_already_mapped');
  assert.equal(db.printings.length, candidates.length, 'live_printing_count_changed');

  for (const candidate of candidates) {
    const parent = db.parents.find(row => row.id === candidate.target.card_print_id);
    const product = db.products.find(row => Number(row.product_id) === Number(candidate.source_product_id));
    const printing = db.printings.find(row => row.card_print_id === candidate.target.card_print_id);
    const reviewedPrinting = reviewedPrintings.find(row => row.card_print_id === candidate.target.card_print_id);
    assert.ok(parent && product && printing && reviewedPrinting, `live_identity_missing:${candidate.source_product_id}`);
    assert.equal(parent.set_id, SET_ID);
    assert.equal(parent.identity_domain, 'pokemon_eng_standard');
    assert.equal(parent.gv_id, candidate.target.gv_id);
    assert.equal(parent.name, candidate.target.canonical_name);
    assert.equal(number(parent.number), number(candidate.target.canonical_number));
    assert.equal(parent.variant_key, candidate.target.variant_key);
    assert.equal(product.category_id, 3);
    assert.equal(product.group_id, GROUP_ID);
    assert.equal(product.source_active, true);
    assert.equal(product.catalog_metadata_status, 'current');
    assert.equal(product.name, candidate.source_product_name);
    assert.equal(normalizeTcgplayerMappingNameV1(product.name), candidate.normalized_source_name);
    assert.equal(number(productNumber(product)), number(candidate.printed_number));
    assert.equal(printing.finish_key, 'holo');
    assert.equal(printing.printing_gv_id, reviewedPrinting.printing_gv_id);
    assert.equal(printing.is_provisional, false);
    assert.ok(printing.provenance_source && printing.provenance_ref, `printing_not_verified:${candidate.source_product_id}`);
  }

  const groupSourceRef = 'tcgcsv-group-24837';
  const groupSnapshot = {
    version: 'TCGCSV_PRODUCT_GROUP_SNAPSHOT_V1',
    category_id: 3,
    group_id: GROUP_ID,
    source_sync_run_ids: [...new Set(db.products.map(row => row.last_seen_run_id))].sort(),
    products: db.products.map(row => row.raw_payload),
  };
  const groupBytes = jsonBytes(groupSnapshot);
  const oldReviewRef = historical.manifest.authority.review.ref;
  const artifacts = new Map([...historical.artifacts].filter(([ref]) => ref !== oldReviewRef));
  artifacts.set(groupSourceRef, groupBytes);
  const mappingAssertions = candidates.map(candidate => ({
    source: 'tcgplayer',
    external_id: String(candidate.source_product_id),
    card_print_id: candidate.target.card_print_id,
    candidate_fingerprint: candidate.candidate_fingerprint,
    source_ref: groupSourceRef,
    source_sha256: sha256(groupBytes),
  })).sort((left, right) => Number(left.external_id) - Number(right.external_id));
  const historicalSources = historical.manifest.authority.source_artifacts;
  const manifestBody = {
    ...historical.manifest,
    scope_note: 'Exact 28-card mapping subset. Genesect EX (Team Plasma) and Gengar (Prime) remain outside this package pending explicit alias review.',
    parents: reviewedParents,
    printings: reviewedPrintings,
    unresolved_variants: [],
    suppressed_printing_facts: [],
    expected: { parents: reviewedParents.length, printings: reviewedPrintings.length, finishes: { holo: reviewedPrintings.length } },
    external_mapping_assertions: mappingAssertions,
    authority: {
      ...historical.manifest.authority,
      source_artifacts: [...historicalSources, {
        ref: groupSourceRef,
        sha256: sha256(groupBytes),
        kind: 'exact_printing_mapping',
        url_or_identifier: 'https://tcgcsv.com/tcgplayer/3/24837/products',
        retrieved_at: new Date(Math.max(...db.products.map(row => Date.parse(row.last_seen_at)))).toISOString(),
      }],
      protected_facts: reviewedPrintings.map(row => ({ card_print_id: row.card_print_id, finish_key: row.finish_key })),
      forbidden_facts: [],
      conflicts: [],
    },
  };
  delete manifestBody.fingerprint;
  delete manifestBody.authority.review;
  const reviewRef = 'review:30c-classic:tcgplayer-backfill-20261014';
  const review = {
    status: 'verified_scope',
    master_index_sha256: manifestBody.master_index_sha256,
    game: 'pokemon',
    language: 'en',
    set_code: SET_CODE,
    scope: manifestBody.scope,
    reviewer: 'Codex source adjudication; not founder mutation approval',
    reviewed_at: options.reviewedAt,
    projection_sha256: printingManifestHash(manifestBody),
    reasoning: [
      'All 28 selected products match reviewed 30c-classic parents by exact normalized name and printed coordinate.',
      'The retained September printing authority binds each selected parent to one verified Holo child with frozen source bytes.',
      'The current TCGCSV group snapshot binds every selected TCGPlayer product and printed coordinate.',
      'Genesect EX (Team Plasma) and Gengar (Prime) are excluded because their source labels require separate alias adjudication.',
      'This evidence package does not itself authorize a database mutation.',
    ],
    mutation_authority: false,
  };
  const reviewBytes = jsonBytes(review);
  artifacts.set(reviewRef, reviewBytes);
  manifestBody.authority.review = { ref: reviewRef, sha256: sha256(reviewBytes) };
  const manifest = { ...manifestBody, fingerprint: printingManifestHash(manifestBody) };
  assertMasterPrintingAuthority(manifest, artifacts);

  await fs.mkdir(path.dirname(options.outDir), { recursive: true });
  await fs.mkdir(options.outDir, { recursive: false });
  const authorityDir = path.join(options.outDir, 'authority', SET_CODE);
  await writeFileExclusive(path.join(authorityDir, 'manifest.json'), jsonBytes(manifest));
  for (const [ref, bytes] of artifacts) {
    const safe = ref.replace(/[^a-z0-9._-]+/gi, '_');
    await writeFileExclusive(path.join(authorityDir, 'artifacts', safe), bytes);
  }
  await writeFileExclusive(path.join(authorityDir, 'artifact_map.json'), jsonBytes(
    [...artifacts.keys()].sort().map(ref => ({ ref, path: `artifacts/${ref.replace(/[^a-z0-9._-]+/gi, '_')}` })),
  ));

  const baseSummary = JSON.parse(await fs.readFile(path.join(options.planDir, 'summary.json'), 'utf8'));
  const baseRunPlan = JSON.parse(await fs.readFile(path.join(options.planDir, 'run_plan.json'), 'utf8'));
  const head = git(['rev-parse', 'HEAD']);
  const trackedClean = git(['status', '--porcelain', '--untracked-files=no']) === '';
  const batches = [];
  for (let offset = 0; offset < candidates.length; offset += MAX_BATCH_SIZE) {
    const selected = candidates.slice(offset, offset + MAX_BATCH_SIZE);
    const batchNumber = batches.length + 1;
    const batchName = `batch-${String(batchNumber).padStart(2, '0')}`;
    const batchDir = path.join(options.outDir, 'batches', batchName);
    const selectedBytes = Buffer.from(`${selected.map(row => JSON.stringify(row)).join('\n')}\n`);
    const summary = { ...baseSummary, counts: { ...baseSummary.counts, candidates: selected.length,
      projected_gap_rows: selected.reduce((sum, row) => sum + Number(row.supporting_gap_row_count), 0) },
      batch: { index: batchNumber, total: Math.ceil(candidates.length / MAX_BATCH_SIZE), offset, size: selected.length } };
    const runPlan = { ...baseRunPlan, commit_sha: head, branch: git(['branch', '--show-current']),
      tracked_worktree_clean: trackedClean, source_plan_commit_sha: baseRunPlan.commit_sha,
      source_plan_candidates_sha256: sha256(candidateBytes), batch: summary.batch };
    await writeFileExclusive(path.join(batchDir, 'plan', 'candidates.jsonl'), selectedBytes);
    await writeFileExclusive(path.join(batchDir, 'plan', 'summary.json'), jsonBytes(summary));
    await writeFileExclusive(path.join(batchDir, 'plan', 'run_plan.json'), jsonBytes(runPlan));
    const bundle = freezeMasterMappingAuthority(selected, [{ manifest, artifacts }]);
    const bundleBytes = jsonBytes(bundle);
    await writeFileExclusive(path.join(batchDir, 'package', 'master_authority.json'), bundleBytes);
    await writeFileExclusive(path.join(batchDir, 'package', 'selected_candidates.jsonl'), selectedBytes);
    await writeFileExclusive(path.join(batchDir, 'package', 'receipt.json'), jsonBytes({
      version: 'MASTER_INDEX_MAPPING_PACKAGE_RECEIPT_V1', batch: summary.batch,
      authority_fingerprint: bundle.fingerprint, authority_file_sha256: sha256(bundleBytes),
      selected_file_sha256: sha256(selectedBytes), selected_count: selected.length, scope_count: 1,
      execution_authorized: false, database_writes: 0,
    }));
    batches.push({ batch: batchName, candidates: selected.length,
      projected_gap_rows: summary.counts.projected_gap_rows, candidates_sha256: sha256(selectedBytes),
      authority_sha256: sha256(bundleBytes) });
  }
  const receipt = {
    version: VERSION, status: 'verified_scope', reviewed_at: options.reviewedAt,
    source_plan_candidates_sha256: sha256(candidateBytes), historical_manifest_fingerprint: historical.manifest.fingerprint,
    counts: { candidates: candidates.length, parents: reviewedParents.length, printings: reviewedPrintings.length,
      tcgcsv_products: db.products.length, batches: batches.length,
      projected_gap_rows: candidates.reduce((sum, row) => sum + Number(row.supporting_gap_row_count), 0) },
    tracked_worktree_clean: trackedClean, commit_sha: head, batches, database_writes: 0,
    execution_authorized: false,
  };
  await writeFileExclusive(path.join(options.outDir, 'receipt.json'), jsonBytes(receipt));
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  build30cClassicAuthority(process.argv.slice(2)).then(receipt => console.log(JSON.stringify(receipt, null, 2)))
    .catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
