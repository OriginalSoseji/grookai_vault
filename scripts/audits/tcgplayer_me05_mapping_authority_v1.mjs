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
import { normalizeTcgplayerMappingNumberV1 } from '../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs';

const VERSION = 'TCGPLAYER_ME05_MAPPING_AUTHORITY_V1';
const PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const SET_CODE = 'me05';
const SET_ID = '6f0ede4b-c59a-5b22-ac0f-d0bd6ed2b6c4';
const GROUP_ID = 24688;
const MAX_BATCH_SIZE = 25;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_MASTER = path.join(REPO_ROOT, 'docs', 'audits', 'verified_master_set_index_v1',
  'english_master_index_v1', 'english_master_index_cards_v1.json');

const sha256 = value => createHash('sha256').update(value).digest('hex');
const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const number = value => normalizeTcgplayerMappingNumberV1(String(value ?? ''));
const normalizeName = value => String(value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const git = args => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

function parseArgs(args) {
  const options = {};
  for (const token of args) {
    const match = /^--(plan-dir|out-dir|master|reviewed-at|tcgdex-source-dir)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = match[2];
  }
  assert.ok(options['plan-dir'], '--plan-dir is required');
  assert.ok(options['out-dir'], '--out-dir is required');
  assert.ok(Number.isFinite(Date.parse(options['reviewed-at'])), '--reviewed-at is required');
  return {
    planDir: path.resolve(REPO_ROOT, options['plan-dir']),
    outDir: path.resolve(REPO_ROOT, options['out-dir']),
    masterPath: path.resolve(REPO_ROOT, options.master ?? DEFAULT_MASTER),
    tcgdexSourceDir: options['tcgdex-source-dir']
      ? path.resolve(REPO_ROOT, options['tcgdex-source-dir']) : null,
    reviewedAt: new Date(options['reviewed-at']).toISOString(),
  };
}

function productNumber(product) {
  return product.extended_data?.find(field => String(field?.name).toLowerCase() === 'number')?.value ?? '';
}

function supportedFinishes(card) {
  return ['normal', 'reverse', 'holo'].filter(key => card.variants?.[key] === true).sort();
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'Grookai-ME05-authority/1' } });
  assert.equal(response.status, 200, `source_fetch_failed:${response.status}:${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchAll(rows, concurrency = 12) {
  const results = new Array(rows.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor++;
      results[index] = await fetchJson(rows[index].url);
    }
  }));
  return results;
}

async function readDatabase(candidates) {
  const publicUrl = new URL(process.env.SUPABASE_URL);
  assert.equal(publicUrl.hostname.split('.')[0], PROJECT_REF, 'production_project_ref_mismatch');
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: true },
    application_name: 'me05_mapping_authority_read_only',
    statement_timeout: 120_000,
    query_timeout: 125_000,
  });
  await client.connect();
  try {
    await client.query('begin transaction isolation level repeatable read read only');
    const server = (await client.query(`select current_database() database,current_user username,
      current_setting('transaction_read_only') read_only`)).rows[0];
    assert.deepEqual(server, { database: 'postgres', username: 'postgres', read_only: 'on' });
    const counts = (await client.query(`select
      (select count(*)::integer from public.card_prints) card_prints,
      (select count(*)::integer from public.sets) sets,
      (select count(*)::integer from public.card_print_traits) traits`)).rows[0];
    assert.ok(counts.card_prints >= 40000 && counts.sets >= 150 && counts.traits >= 5000,
      'canonical_environment_invariant_failed');
    const ids = candidates.map(row => row.target.card_print_id);
    const productIds = candidates.map(row => Number(row.source_product_id));
    const parents = (await client.query(`select id,set_id,name,number,variant_key,gv_id,identity_domain,
      printed_identity_modifier from public.card_prints where id=any($1::uuid[]) order by id`, [ids])).rows;
    const printings = (await client.query(`select card_print_id,finish_key,printing_gv_id,is_provisional,
      provenance_source,provenance_ref from public.card_printings where card_print_id=any($1::uuid[])
      order by card_print_id,finish_key`, [ids])).rows;
    const products = (await client.query(`select product_id,category_id,group_id,name,clean_name,source_url,
      source_modified_on,extended_data,raw_payload,payload_hash,last_seen_at,last_seen_run_id,source_active,
      catalog_metadata_status from public.tcgcsv_source_products where product_id=any($1::integer[])
      order by product_id`, [productIds])).rows;
    const existing = (await client.query(`select external_id,card_print_id from public.external_mappings
      where source='tcgplayer' and active and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))`,
    [productIds.map(String), ids])).rows;
    await client.query('commit');
    return { counts, parents, printings, products, existing };
  } finally {
    await client.end();
  }
}

async function writeFileExclusive(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: 'wx' });
}

export async function buildMe05Authority(args) {
  const options = parseArgs(args);
  const candidateBytes = await fs.readFile(path.join(options.planDir, 'candidates.jsonl'));
  const candidates = candidateBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  assert.equal(candidates.length, 120, 'whole_set_candidate_count_changed');
  assert.ok(candidates.every(row => row.source_group_id === GROUP_ID && row.target?.set_code === SET_CODE &&
    row.target?.set_id === SET_ID && row.evidence_lane === 'embedded_tcgcsv_identity'), 'me05_scope_drift');
  assert.equal(new Set(candidates.map(row => row.source_product_id)).size, 120, 'duplicate_source_product');
  assert.equal(new Set(candidates.map(row => row.target.card_print_id)).size, 120, 'duplicate_target_parent');

  const masterSourceBytes = await fs.readFile(options.masterPath);
  const masterSource = JSON.parse(masterSourceBytes);
  const facts = masterSource.cards.filter(row => row.set_key === SET_CODE && row.fact_type === 'card_identity');
  assert.equal(facts.length, 120, 'me05_master_scope_changed');
  const factFor = candidate => {
    const matches = facts.filter(row => number(row.card_number) === number(candidate.target.canonical_number) &&
      normalizeName(row.card_name) === normalizeName(candidate.target.canonical_name) && row.status === 'master_verified');
    assert.equal(matches.length, 1, `master_identity_not_unique:${candidate.source_product_id}`);
    return matches[0];
  };
  const sources = candidates.map(candidate => {
    const fact = factFor(candidate);
    const url = fact.source_evidence?.find(row => row.source_key === 'tcgdex')?.source_url;
    assert.ok(url?.startsWith('https://api.tcgdex.net/v2/en/cards/'), `tcgdex_source_missing:${candidate.source_product_id}`);
    return { candidate, fact, url };
  });
  const tcgdexBytes = options.tcgdexSourceDir
    ? await Promise.all(sources.map(row => fs.readFile(path.join(options.tcgdexSourceDir,
      `${row.url.split('/').at(-1)}.json`))))
    : await fetchAll(sources);
  const tcgdexCards = tcgdexBytes.map(bytes => JSON.parse(bytes));
  const db = await readDatabase(candidates);
  assert.equal(db.parents.length, 120, 'live_parent_count_changed');
  assert.equal(db.products.length, 120, 'live_source_product_count_changed');
  assert.equal(db.existing.length, 0, 'target_or_source_already_mapped');

  const parents = [];
  const printings = [];
  const selectedPrintings = [];
  const sourceArtifacts = [];
  const externalMappingAssertions = [];
  const protectedFacts = [];
  const artifactBytes = new Map();
  const master = {
    version: 'POKEMON_TCGPLAYER_IDENTITY_REPAIR_MASTER_V1', set_code: SET_CODE, set_id: SET_ID,
    selected_cards: sources.map(row => ({ ...row.fact, language: 'en' })), selected_printings: selectedPrintings,
  };

  const groupSourceRef = 'tcgcsv-group-24688';
  const groupSnapshot = {
    version: 'TCGCSV_PRODUCT_GROUP_SNAPSHOT_V1', category_id: 3, group_id: GROUP_ID,
    source_sync_run_ids: [...new Set(db.products.map(row => row.last_seen_run_id))].sort(),
    products: db.products.map(row => row.raw_payload),
  };
  const groupBytes = jsonBytes(groupSnapshot);
  artifactBytes.set(groupSourceRef, groupBytes);
  sourceArtifacts.push({ ref: groupSourceRef, sha256: sha256(groupBytes), kind: 'exact_printing_mapping',
    url_or_identifier: 'https://tcgcsv.com/tcgplayer/3/24688/products',
    retrieved_at: new Date(Math.max(...db.products.map(row => Date.parse(row.last_seen_at)))).toISOString() });

  for (let index = 0; index < sources.length; index += 1) {
    const { candidate, fact, url } = sources[index];
    const card = tcgdexCards[index];
    const raw = tcgdexBytes[index];
    const parent = db.parents.find(row => row.id === candidate.target.card_print_id);
    const product = db.products.find(row => Number(row.product_id) === Number(candidate.source_product_id));
    assert.ok(parent && product, `live_identity_missing:${candidate.source_product_id}`);
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
    assert.equal(number(productNumber(product)), number(candidate.printed_number));
    assert.ok(normalizeName(product.name).startsWith(normalizeName(candidate.source_product_name)),
      `source_product_name_mismatch:${candidate.source_product_id}`);
    assert.equal(card.id, url.split('/').at(-1));
    assert.equal(card.set?.id, SET_CODE);
    assert.equal(number(card.localId), number(candidate.target.canonical_number));
    assert.equal(normalizeName(card.name), normalizeName(candidate.target.canonical_name));
    const tcgplayerIds = [...new Set((card.variants_detailed ?? [])
      .map(row => Number(row.thirdParty?.tcgplayer)).filter(Number.isSafeInteger))];
    assert.ok(tcgplayerIds.includes(Number(candidate.source_product_id)),
      `tcgdex_product_mismatch:${candidate.source_product_id}`);
    const finishes = supportedFinishes(card);
    const livePrintings = db.printings.filter(row => row.card_print_id === parent.id);
    assert.deepEqual(livePrintings.map(row => row.finish_key).sort(), finishes,
      `finish_inventory_mismatch:${candidate.source_product_id}`);
    assert.ok(livePrintings.every(row => row.is_provisional === false && row.printing_gv_id &&
      row.provenance_source && row.provenance_ref), `printing_not_verified:${candidate.source_product_id}`);

    parents.push({ id: parent.id, name: parent.name, gv_id: parent.gv_id, set_id: parent.set_id,
      variant_key: parent.variant_key, identity_domain: parent.identity_domain,
      printed_coordinate: parent.number, printed_identity_modifier: parent.printed_identity_modifier });
    const sourceRef = `tcgdex-${card.id}`;
    const sourceHash = sha256(raw);
    artifactBytes.set(sourceRef, raw);
    sourceArtifacts.push({ ref: sourceRef, sha256: sourceHash, kind: 'checked_checklist',
      url_or_identifier: url, retrieved_at: options.reviewedAt });
    for (const printing of livePrintings) {
      printings.push({ card_print_id: parent.id, finish_key: printing.finish_key,
        printing_gv_id: printing.printing_gv_id, review_status: 'verified', evidence: [{
          kind: 'checked_checklist', source_ref: sourceRef, sha256: sourceHash,
          card_print_id: parent.id, finish_key: printing.finish_key,
        }] });
      selectedPrintings.push({ set_key: SET_CODE, set_name: fact.set_name,
        card_number: fact.card_number, card_name: fact.card_name, finish_key: printing.finish_key,
        language: 'en', source_count: 1, sources: ['tcgdex'], source_kinds: ['structured_api'],
        status: 'master_verified', evidence_urls: [url] });
      protectedFacts.push({ card_print_id: parent.id, finish_key: printing.finish_key });
    }
    externalMappingAssertions.push({ source: 'tcgplayer', external_id: String(candidate.source_product_id),
      card_print_id: parent.id, candidate_fingerprint: candidate.candidate_fingerprint,
      source_ref: groupSourceRef, source_sha256: sha256(groupBytes) });
  }

  parents.sort((a, b) => a.id.localeCompare(b.id));
  printings.sort((a, b) => a.card_print_id.localeCompare(b.card_print_id) || a.finish_key.localeCompare(b.finish_key));
  selectedPrintings.sort((a, b) => number(a.card_number).localeCompare(number(b.card_number), undefined, { numeric: true }) ||
    a.finish_key.localeCompare(b.finish_key));
  protectedFacts.sort((a, b) => a.card_print_id.localeCompare(b.card_print_id) || a.finish_key.localeCompare(b.finish_key));
  externalMappingAssertions.sort((a, b) => Number(a.external_id) - Number(b.external_id));
  sourceArtifacts.sort((a, b) => a.ref.localeCompare(b.ref));
  const masterBytes = jsonBytes(master);
  const masterRef = 'master:me05:tcgplayer-backfill-20261014';
  const reviewRef = 'review:me05:tcgplayer-backfill-20261014';
  artifactBytes.set(masterRef, masterBytes);
  const finishCounts = Object.fromEntries([...new Set(printings.map(row => row.finish_key))].sort()
    .map(key => [key, printings.filter(row => row.finish_key === key).length]));
  const authority = { version: 'MASTER_INDEX_PRINTING_AUTHORITY_V1', status: 'verified_scope', set_id: SET_ID,
    source_artifacts: sourceArtifacts, protected_facts: protectedFacts, forbidden_facts: [], conflicts: [] };
  const manifestBody = {
    version: 'PRINTING_COMPLETENESS_GATE_V1', game: 'pokemon', language: 'en', set_code: SET_CODE,
    scope: 'complete_set', identity_policy_version: 'POKEMON_EN_PHYSICAL_V1', master_index_ref: masterRef,
    master_index_sha256: sha256(masterBytes), parents, printings, unresolved_variants: [],
    suppressed_printing_facts: [], expected: { parents: parents.length, printings: printings.length, finishes: finishCounts },
    external_mapping_assertions: externalMappingAssertions, authority,
  };
  const projection = structuredClone(manifestBody);
  const review = {
    status: 'verified_scope', master_index_sha256: manifestBody.master_index_sha256, game: 'pokemon', language: 'en',
    set_code: SET_CODE, scope: manifestBody.scope, reviewer: 'Codex source adjudication; not founder mutation approval',
    reviewed_at: options.reviewedAt, projection_sha256: printingManifestHash(projection), reasoning: [
      'All 120 candidate parents match the retained English Master set by exact normalized name and printed coordinate.',
      'Each captured TCGdex card identifies the same canonical ME05 card, enumerates the exact live finish inventory, and binds one TCGplayer product ID.',
      'The current TCGCSV group snapshot independently matches every candidate product, printed coordinate, and active source record.',
      'This authority binds evidence for five bounded mapping batches and does not itself authorize a database mutation.',
    ], mutation_authority: false,
  };
  const reviewBytes = jsonBytes(review);
  artifactBytes.set(reviewRef, reviewBytes);
  manifestBody.authority.review = { ref: reviewRef, sha256: sha256(reviewBytes) };
  const manifest = { ...manifestBody, fingerprint: printingManifestHash(manifestBody) };
  assertMasterPrintingAuthority(manifest, artifactBytes);

  await fs.mkdir(path.dirname(options.outDir), { recursive: true });
  await fs.mkdir(options.outDir, { recursive: false });
  const authorityDir = path.join(options.outDir, 'authority', SET_CODE);
  await writeFileExclusive(path.join(authorityDir, 'manifest.json'), jsonBytes(manifest));
  await writeFileExclusive(path.join(authorityDir, 'master.json'), masterBytes);
  await writeFileExclusive(path.join(authorityDir, 'review.json'), reviewBytes);
  await writeFileExclusive(path.join(authorityDir, 'sources', '24688-products.json'), groupBytes);
  for (let index = 0; index < sources.length; index += 1) {
    await writeFileExclusive(path.join(authorityDir, 'sources', `${tcgdexCards[index].id}.json`), tcgdexBytes[index]);
  }
  const artifactMap = [
    { ref: masterRef, path: 'master.json' }, { ref: reviewRef, path: 'review.json' },
    { ref: groupSourceRef, path: 'sources/24688-products.json' },
    ...tcgdexCards.map(card => ({ ref: `tcgdex-${card.id}`, path: `sources/${card.id}.json` })),
  ].sort((a, b) => a.ref.localeCompare(b.ref));
  await writeFileExclusive(path.join(authorityDir, 'artifact_map.json'), jsonBytes(artifactMap));

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
    const bundle = freezeMasterMappingAuthority(selected, [{ manifest, artifacts: artifactBytes }]);
    const bundleBytes = jsonBytes(bundle);
    await writeFileExclusive(path.join(batchDir, 'package', 'master_authority.json'), bundleBytes);
    await writeFileExclusive(path.join(batchDir, 'package', 'selected_candidates.jsonl'), selectedBytes);
    const receipt = { version: 'MASTER_INDEX_MAPPING_PACKAGE_RECEIPT_V1', batch: summary.batch,
      authority_fingerprint: bundle.fingerprint, authority_file_sha256: sha256(bundleBytes),
      selected_file_sha256: sha256(selectedBytes), selected_count: selected.length, scope_count: 1,
      execution_authorized: false, database_writes: 0 };
    await writeFileExclusive(path.join(batchDir, 'package', 'receipt.json'), jsonBytes(receipt));
    batches.push({ batch: batchName, candidates: selected.length, projected_gap_rows: summary.counts.projected_gap_rows,
      candidates_sha256: sha256(selectedBytes), authority_sha256: sha256(bundleBytes) });
  }
  const receipt = { version: VERSION, status: 'verified_scope', reviewed_at: options.reviewedAt,
    source_plan_candidates_sha256: sha256(candidateBytes), master_source_sha256: sha256(masterSourceBytes),
    counts: { candidates: candidates.length, parents: parents.length, printings: printings.length,
      tcgcsv_products: db.products.length, tcgdex_cards: tcgdexCards.length, batches: batches.length,
      projected_gap_rows: candidates.reduce((sum, row) => sum + Number(row.supporting_gap_row_count), 0) },
    tracked_worktree_clean: trackedClean, commit_sha: head, batches, database_writes: 0,
    execution_authorized: false };
  await writeFileExclusive(path.join(options.outDir, 'receipt.json'), jsonBytes(receipt));
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildMe05Authority(process.argv.slice(2)).then(receipt => console.log(JSON.stringify(receipt, null, 2)))
    .catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
