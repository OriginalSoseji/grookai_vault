import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import {assertPrintingDatabaseTarget} from '../../backend/catalog/master_index_printing_execution_guard_v1.mjs';
import {assertMasterPrintingAuthority} from '../../backend/catalog/master_index_printing_authority_v1.mjs';
import {
  PRINTING_COMPLETENESS_VERSION,
  assertPrintingManifest,
  printingManifestHash,
} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const VERSION = 'ENGLISH_POKEMON_BASE_PRINTING_AUTHORITY_V1';
const PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MASTER_PATH = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1',
  'english_master_index_v1', 'english_master_index_cards_v1.json');
const SUFFIX = Object.freeze({normal: 'STD', holo: 'HOLO'});

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const rel = file => path.relative(ROOT, file).replaceAll('\\', '/');
const normalizeName = value => String(value ?? '').replaceAll('♀', ' F').replaceAll('♂', ' M')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeProductName = value => normalizeName(String(value ?? '')
  .replace(/\s+-\s+\d{3}\/\d{3}(?:\s+\((?:left|right)\))?\s*$/i, ''));
const numeric = value => Number.parseInt(String(value ?? '').match(/^0*(\d+)/)?.[1] ?? '', 10);

function parseArgs(argv) {
  const options = {};
  for (const token of argv) {
    const match = /^--(source|out-dir)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = path.resolve(ROOT, match[2]);
  }
  assert.ok(options.source, '--source is required');
  assert.ok(options['out-dir'], '--out-dir is required');
  return {sourcePath: options.source, outDir: options['out-dir']};
}

function productNumber(row) {
  const value = row.extended_data?.find(field => String(field?.name).toLowerCase() === 'number')?.value;
  return numeric(value);
}

async function writeExclusive(file, value) {
  await fs.writeFile(file, Buffer.isBuffer(value) ? value : bytes(value), {flag: 'wx'});
}

function validateSource(source) {
  assert.equal(source.version, 'DELTA_REIGN_OFFICIAL_CHECKLIST_PROJECTION_V1');
  assert.equal(source.status, 'checked_transcription');
  assert.equal(source.set_code, 'me06');
  assert.equal(source.collector_number_scope.first, 1);
  assert.equal(source.collector_number_scope.last, 141);
  assert.equal(source.collector_number_scope.count, 141);
  assert.equal(source.collector_number_scope.unique_within_set, true);
  assert.equal(source.legend_transcription.normal_finish_key, 'normal');
  assert.equal(source.legend_transcription.red_outline_finish_key, 'holo');
  assert.equal(new Set(source.holo_numbers).size, 58);
  assert.ok(source.holo_numbers.every(number => Number.isSafeInteger(number) && number >= 1 && number <= 141));
  assert.deepEqual(source.expected_finish_counts, {normal: 83, holo: 58});
  assert.equal(source.tcgplayer_corroboration.authority, false);
  assert.equal(source.boundaries.reverse_holo_authorized, false);
  assert.equal(source.boundaries.mapping_authorized, false);
  assert.equal(source.boundaries.pricing_authorized, false);
  assert.equal(source.boundaries.visibility_activation_authorized, false);
  assert.ok(Number.isFinite(Date.parse(source.retrieved_at)) && Number.isFinite(Date.parse(source.reviewed_at)));
}

function assertProductNames(products, parents, source) {
  const aliases = new Map(source.reviewed_name_aliases.map(row => [Number(row.product_id), row]));
  assert.equal(aliases.size, source.reviewed_name_aliases.length);
  const mismatches = [];
  for (const product of products) {
    const number = productNumber(product);
    const parent = parents.find(row => numeric(row.number) === number);
    assert.ok(parent, `product_parent_missing:${product.product_id}`);
    const alias = aliases.get(Number(product.product_id));
    if (alias) {
      if (alias.number === number && alias.source_name === product.name && alias.canonical_name === parent.name) continue;
      mismatches.push({product_id: product.product_id, number, source_name: product.name, canonical_name: parent.name});
      continue;
    }
    if (normalizeProductName(product.name) !== normalizeName(parent.name)) {
      mismatches.push({product_id: product.product_id, number, source_name: product.name, canonical_name: parent.name});
    }
  }
  assert.deepEqual(mismatches, [], 'unreviewed_tcgplayer_name_difference');
  assert.ok([...aliases.keys()].every(id => products.some(product => Number(product.product_id) === id)),
    'stale_name_alias');
}

async function readProduction(source) {
  const publicUrl = new URL(process.env.SUPABASE_URL ?? '');
  assert.equal(publicUrl.hostname, `${PROJECT_REF}.supabase.co`, 'production_project_ref_mismatch');
  const databaseUrl = assertPrintingDatabaseTarget(process.env.SUPABASE_DB_URL ?? '');
  const client = new pg.Client({
    connectionString: databaseUrl.href,
    ssl: databaseUrl.hostname === 'localhost' ? false : {rejectUnauthorized: false},
    application_name: 'english_pokemon_base_printing_authority_v1',
    statement_timeout: 120_000,
    query_timeout: 125_000,
  });
  await client.connect();
  try {
    await client.query('begin transaction isolation level repeatable read read only');
    const server = (await client.query("select current_database() database,current_user username,current_setting('transaction_read_only') read_only")).rows[0];
    assert.deepEqual(server, {database: 'postgres', username: 'postgres', read_only: 'on'});
    const sanity = (await client.query(`select
      (select count(*)::integer from public.card_prints) card_prints,
      (select count(*)::integer from public.sets) sets,
      (select count(*)::integer from public.card_print_traits) traits`)).rows[0];
    assert.ok(sanity.card_prints >= 40000 && sanity.sets >= 150 && sanity.traits >= 5000,
      'canonical_environment_invariant_failed');
    const setRows = (await client.query(`select to_jsonb(s) set_row,
      (select to_jsonb(c) from public.catalog_set_release_controls c where c.set_id=s.id) control_row
      from public.sets s where lower(s.code)=$1`, [source.set_code])).rows;
    assert.equal(setRows.length, 1, 'canonical_set_scope_changed');
    const setRow = setRows[0];
    assert.equal(setRow.set_row.id, 'c72b4744-db4d-565f-9914-e28a2b244f5c');
    assert.equal(setRow.set_row.game, 'pokemon');
    assert.equal(setRow.control_row?.release_status, 'hidden');
    assert.equal(setRow.control_row?.activated_at, null);
    const parents = (await client.query(`select id::text,set_id::text,gv_id,name,number,identity_domain,
      variant_key,printed_identity_modifier,data_quality_flags from public.card_prints
      where set_id=$1 order by number::integer,id`, [setRow.set_row.id])).rows;
    assert.equal(parents.length, 141, 'parent_count_changed');
    assert.equal(new Set(parents.map(row => numeric(row.number))).size, 141, 'duplicate_parent_number');
    assert.ok(parents.every(row => row.data_quality_flags?.app_visibility_v1?.status === 'suppressed'),
      'parent_visibility_suppression_changed');
    const existing = (await client.query(`select id::text,card_print_id::text,finish_key,printing_gv_id
      from public.card_printings where card_print_id=any($1::uuid[]) order by id`,
    [parents.map(row => row.id)])).rows;
    assert.equal(existing.length, 0, 'fresh_set_already_has_children');
    const syncRows = (await client.query(`select id::text,status,failed_count,observed_on,artifact_hash,
      worker_version,parser_version,schema_contract_version,finished_at from public.tcgcsv_source_sync_runs
      where id=$1::uuid`, [source.tcgplayer_corroboration.source_sync_id])).rows;
    assert.equal(syncRows.length, 1, 'source_sync_missing');
    assert.equal(syncRows[0].status, 'completed');
    assert.equal(syncRows[0].failed_count, 0);
    const groups = (await client.query(`select group_id,name,payload_hash,last_seen_run_id::text,source_active,
      catalog_metadata_status from public.tcgcsv_source_groups where group_id=$1`,
    [source.tcgplayer_corroboration.group_id])).rows;
    assert.equal(groups.length, 1);
    assert.equal(groups[0].name, source.tcgplayer_corroboration.group_name);
    assert.equal(groups[0].last_seen_run_id, source.tcgplayer_corroboration.source_sync_id);
    assert.equal(groups[0].source_active, true);
    const products = (await client.query(`select product_id,name,extended_data,payload_hash,last_seen_run_id::text,
      source_active,catalog_metadata_status from public.tcgcsv_source_products where group_id=$1 and source_active
      order by product_id`, [source.tcgplayer_corroboration.group_id])).rows
      .filter(row => Number.isSafeInteger(productNumber(row)) && productNumber(row) >= 1 && productNumber(row) <= 141);
    assert.equal(products.length, 141, 'numbered_product_count_changed');
    assert.equal(new Set(products.map(productNumber)).size, 141, 'duplicate_product_number');
    assertProductNames(products, parents, source);
    const observations = (await client.query(`select id::text,product_id,subtype_name,subtype_name_normalized,
      payload_hash,source_artifact_id::text,last_seen_run_id::text from public.tcgcsv_source_price_daily_observations
      where group_id=$1 and last_seen_run_id=$2::uuid and product_id=any($3::integer[])
      order by product_id,subtype_name_normalized,id`, [source.tcgplayer_corroboration.group_id,
      source.tcgplayer_corroboration.source_sync_id, products.map(row => row.product_id)])).rows;
    const supported = observations.filter(row => ['normal', 'holofoil', 'reverse holofoil']
      .includes(row.subtype_name_normalized));
    assert.equal(supported.length, 228, 'price_subtype_scope_changed');
    const base = supported.filter(row => row.subtype_name_normalized !== 'reverse holofoil');
    const reverse = supported.filter(row => row.subtype_name_normalized === 'reverse holofoil');
    assert.equal(base.length, 141, 'base_subtype_count_changed');
    assert.equal(reverse.length, 87, 'reverse_review_lead_count_changed');
    const baseByProduct = new Map(base.map(row => [Number(row.product_id), row]));
    assert.equal(baseByProduct.size, 141, 'duplicate_base_subtype');
    const holo = new Set(source.holo_numbers);
    for (const product of products) {
      const number = productNumber(product);
      const expected = holo.has(number) ? 'holofoil' : 'normal';
      assert.equal(baseByProduct.get(Number(product.product_id))?.subtype_name_normalized, expected,
        `base_finish_corroboration_changed:${number}`);
    }
    await client.query('commit');
    return {sanity, setRow, parents, products, observations: supported, reverse, sync: syncRows[0], group: groups[0]};
  } finally {
    await client.end();
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const sourceBytes = await fs.readFile(options.sourcePath);
  const source = JSON.parse(sourceBytes);
  validateSource(source);
  await fs.mkdir(options.outDir, {recursive: false});
  const production = await readProduction(source);
  const fullMasterBytes = await fs.readFile(MASTER_PATH);
  const fullMaster = JSON.parse(fullMasterBytes);
  const facts = fullMaster.cards.filter(row => row.set_key === source.set_code && row.fact_type === 'card_identity');
  assert.equal(facts.length, 141, 'master_index_scope_changed');
  assert.ok(facts.every(row => row.status === 'master_verified' && row.source_count >= 2));
  const master = {
    version: 'ENGLISH_POKEMON_BASE_PRINTING_MASTER_PROJECTION_V1',
    upstream_path: rel(MASTER_PATH),
    upstream_sha256: sha256(fullMasterBytes),
    set_code: source.set_code,
    expected_rows: 141,
    cards: facts,
  };
  const masterBytes = bytes(master);
  const masterPath = path.join(options.outDir, 'master.json');
  const masterRef = rel(masterPath);
  const sourceRef = rel(options.sourcePath);
  const sourceSha = sha256(sourceBytes);
  const holo = new Set(source.holo_numbers);
  const parents = production.parents.map(row => ({
    id: row.id,
    set_id: row.set_id,
    gv_id: row.gv_id,
    name: row.name,
    printed_coordinate: String(row.number),
    identity_domain: row.identity_domain,
    variant_key: row.variant_key,
    printed_identity_modifier: row.printed_identity_modifier,
  }));
  const printings = parents.map(parent => {
    const number = numeric(parent.printed_coordinate);
    const finish = holo.has(number) ? 'holo' : 'normal';
    return {
      card_print_id: parent.id,
      finish_key: finish,
      printing_gv_id: `${parent.gv_id}-${SUFFIX[finish]}`,
      review_status: 'verified',
      evidence: [{
        kind: 'checked_checklist',
        source_ref: sourceRef,
        sha256: sourceSha,
        card_print_id: parent.id,
        finish_key: finish,
        official_collector_number: number,
      }],
    };
  });
  const productById = new Map(production.products.map(row => [Number(row.product_id), row]));
  const parentByNumber = new Map(parents.map(row => [numeric(row.printed_coordinate), row]));
  const unresolved = production.reverse.map(row => {
    const product = productById.get(Number(row.product_id));
    const parent = parentByNumber.get(productNumber(product));
    return {
      key: `tcgplayer:${row.product_id}:reverse_holofoil`,
      card_print_id: parent.id,
      source_ref: `tcgcsv_source_price_daily_observations:${row.id}`,
      source_product_id: Number(row.product_id),
      status: 'needs_review',
      scope: 'outside_base_release',
      reason: 'TCGPlayer Reverse Holo price subtype is retained as a lead but is not checklist authority for canonical printing creation.',
    };
  });
  let manifest = {
    version: PRINTING_COMPLETENESS_VERSION,
    game: 'pokemon',
    language: 'en',
    set_code: source.set_code,
    scope: 'base_release',
    identity_policy_version: 'POKEMON_EN_PHYSICAL_V1',
    master_index_ref: masterRef,
    master_index_sha256: sha256(masterBytes),
    parents,
    printings,
    unresolved_variants: unresolved,
    suppressed_printing_facts: [],
    expected: {parents: 141, printings: 141, finishes: {normal: 83, holo: 58}},
    authority: {
      version: 'MASTER_INDEX_PRINTING_AUTHORITY_V1',
      status: 'verified_scope',
      set_id: production.setRow.set_row.id,
      source_artifacts: [{
        ref: sourceRef,
        sha256: sourceSha,
        kind: 'checked_checklist',
        url_or_identifier: source.source_url,
        retrieved_at: source.retrieved_at,
      }],
      protected_facts: printings.map(row => ({card_print_id: row.card_print_id, finish_key: row.finish_key})),
      forbidden_facts: [],
      conflicts: [],
    },
  };
  const projection = structuredClone(manifest);
  const review = {
    status: 'verified_scope',
    master_index_sha256: manifest.master_index_sha256,
    game: manifest.game,
    language: manifest.language,
    set_code: manifest.set_code,
    scope: manifest.scope,
    reviewer: source.reviewed_by,
    reviewed_at: source.reviewed_at,
    projection_sha256: printingManifestHash(projection),
    adjudication: 'The official Pokemon checklist assigns one base finish to all 141 collector numbers: 83 standard boxes resolve to Normal and 58 red-outline holographic boxes resolve to Holo.',
    unresolved_variant_policy: 'All 87 TCGPlayer Reverse Holo subtype rows remain outside the base release because price buckets are not printing authority.',
    execution_authorized: false,
  };
  const reviewBytes = bytes(review);
  const reviewPath = path.join(options.outDir, 'review.json');
  const reviewRef = rel(reviewPath);
  manifest.authority.review = {ref: reviewRef, sha256: sha256(reviewBytes)};
  manifest.fingerprint = printingManifestHash(manifest);
  const manifestBytes = bytes(manifest);
  const artifacts = new Map([[masterRef, masterBytes], [sourceRef, sourceBytes], [reviewRef, reviewBytes]]);
  assertPrintingManifest(manifest);
  assertMasterPrintingAuthority(manifest, artifacts);
  const reconciliation = {
    version: VERSION,
    production_project_ref: PROJECT_REF,
    environment_sanity: production.sanity,
    set: production.setRow,
    source_sync: production.sync,
    source_group: production.group,
    counts: {
      parents: parents.length,
      base_printings: printings.length,
      normal: printings.filter(row => row.finish_key === 'normal').length,
      holo: printings.filter(row => row.finish_key === 'holo').length,
      reverse_holo_review_leads: unresolved.length,
      numbered_products: production.products.length,
      source_observations: production.observations.length,
    },
    boundaries: {
      database_writes: 0,
      reverse_holo_printing_writes: 0,
      mapping_writes: 0,
      pricing_writes: 0,
      visibility_writes: 0,
    },
  };
  await Promise.all([
    writeExclusive(masterPath, masterBytes),
    writeExclusive(reviewPath, reviewBytes),
    writeExclusive(path.join(options.outDir, 'manifest.json'), manifestBytes),
    writeExclusive(path.join(options.outDir, 'artifact_map.json'), [
      {ref: masterRef, path: 'master.json'},
      {ref: sourceRef, path: path.relative(options.outDir, options.sourcePath).replaceAll('\\', '/')},
      {ref: reviewRef, path: 'review.json'},
    ]),
    writeExclusive(path.join(options.outDir, 'warehouse_reconciliation.json'), reconciliation),
  ]);
  process.stdout.write(`${JSON.stringify({
    version: VERSION,
    manifest_fingerprint: manifest.fingerprint,
    counts: reconciliation.counts,
    output_dir: rel(options.outDir),
    database_writes: 0,
  }, null, 2)}\n`);
}

run().catch(error => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
