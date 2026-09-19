import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { assertPrintingDatabaseTarget } from "../../backend/catalog/master_index_printing_execution_guard_v1.mjs";
import {
  mappingTransactionState as transactionState,
  commitMappingTransaction as commitTransaction,
  rollbackMappingTransaction as rollbackTransaction,
} from "../../backend/pricing/exact_mapping_execution_guard_v1.mjs";

import { Client } from "pg";

import {
  buildOnePieceIncrementalPrintingPromotionV2 as buildOnePieceIncrementalPromotionPlanV1,
  ONE_PIECE_INCREMENTAL_PRINTING_PROMOTION_VERSION as ONE_PIECE_INCREMENTAL_PROMOTION_VERSION,
  validateOnePieceIncrementalPrintingPromotionV2 as validateOnePieceIncrementalPromotionPlanV1,
} from "../../backend/catalog/one_piece_incremental_printing_promotion_v2.mjs";
import { sha256 } from "../../backend/catalog/universal_catalog_discovery_v1.mjs";
import {
  parseOnePieceOfficialCardListHtmlV1,
} from "../../backend/pricing/one_piece_complete_official_catalog_authority_v1.mjs";

const USER_AGENT = "GrookaiVaultOnePiecePromotion/1.0 catalog-ops@grookai.com";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const options = {
    mode: "plan",
    asOf: new Date().toISOString().slice(0, 10),
    setCode: "OP17",
    officialSeriesId: "569117",
    expectedHeadSha: null,
    expectedPayloadFingerprint: null,
    databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null,
    outDir: path.join("docs", "audits", "one_piece_incremental_promotion_v1", stamp),
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) options.mode = token.slice(7);
    else if (token.startsWith("--as-of=")) options.asOf = token.slice(8);
    else if (token.startsWith("--set-code=")) options.setCode = token.slice(11).toUpperCase();
    else if (token.startsWith("--official-series-id=")) options.officialSeriesId = token.slice(21);
    else if (token.startsWith("--expected-head-sha=")) options.expectedHeadSha = token.slice(20);
    else if (token.startsWith("--expected-payload-fingerprint=")) {
      options.expectedPayloadFingerprint = token.slice(31);
    }
    else if (token.startsWith("--db-url=")) options.databaseUrl = token.slice(9);
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!new Set(["plan", "dry-run", "apply"]).has(options.mode)) {
    throw new Error("--mode must be plan, dry-run, or apply");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.asOf)) throw new Error("Invalid --as-of");
  if (!/^(OP|ST|EB|PRB)\d{2}$/.test(options.setCode)) throw new Error("Invalid --set-code");
  if (!/^\d+$/.test(options.officialSeriesId)) throw new Error("Invalid official series ID");
  if (!options.databaseUrl) throw new Error("SUPABASE_DB_URL is required");
  if (options.mode === "apply" && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha ?? "")) {
    throw new Error("Apply requires --expected-head-sha");
  }
  if (options.mode === "apply" &&
      !/^[0-9a-f]{64}$/.test(options.expectedPayloadFingerprint ?? "")) {
    throw new Error("Apply requires --expected-payload-fingerprint");
  }
  return options;
}

export function clientOptions(connectionString, mode, env = process.env) {
  assert.ok(['plan', 'dry-run', 'apply'].includes(mode), 'Invalid database mode');
  assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, '0', 'Insecure TLS environment');
  let url = new URL(connectionString);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'Invalid database protocol');
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (local) {
    assert.match(url.pathname, /^\/grookai_op_incremental_[a-z0-9_]+$/, 'Local database must be isolated');
    assert.equal(url.search, '', 'Unexpected local connection options');
  } else if (url.hostname === 'db.ycdxbpibncqcchqiihfz.supabase.co') {
    assert.equal(decodeURIComponent(url.username), 'postgres', 'Wrong database user');
    assert.equal(url.pathname, '/postgres', 'Wrong database');
    assert.equal(url.port || '5432', '5432', 'Wrong database port');
    for (const key of url.searchParams.keys()) assert.ok(['sslmode', 'sslcert', 'sslkey', 'sslrootcert'].includes(key), 'Unexpected connection option');
    url.search = '';
  } else {
    url = assertPrintingDatabaseTarget(connectionString);
  }
  const ca = env.SUPABASE_DB_CA_CERT?.trim();
  if (ca) assert.match(ca, /-----BEGIN CERTIFICATE-----/, 'Invalid database CA certificate');
  return {
    connectionString: url.href,
    ssl: local ? false : { rejectUnauthorized: true, servername: url.hostname, ...(ca ? { ca } : {}) },
    application_name: `one-piece-incremental-promotion-v1-${mode}`,
    connectionTimeoutMillis: 20_000,
    statement_timeout: 300_000,
    query_timeout: 300_000,
  };
}

async function fetchOfficialSeries(seriesId) {
  const requestUrl = "https://en.onepiece-cardgame.com/cardlist/";
  const marker = "__GROOKAI_CURL_META__";
  const response = execFileSync("curl", [
    "--fail-with-body",
    "--silent",
    "--show-error",
    "--location",
    "--max-time",
    "30",
    "--request",
    "POST",
    "--user-agent",
    USER_AGENT,
    "--header",
    "Content-Type: application/x-www-form-urlencoded",
    "--data-urlencode",
    `series=${seriesId}`,
    "--write-out",
    `\n${marker}%{http_code}\t%{url_effective}`,
    requestUrl,
  ], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 35_000,
    windowsHide: true,
  });
  const markerIndex = response.lastIndexOf(`\n${marker}`);
  if (markerIndex < 0) throw new Error("Official One Piece response metadata was missing");
  const body = response.slice(0, markerIndex);
  const [httpStatusRaw, finalUrl] = response.slice(markerIndex + marker.length + 1).trim().split("\t");
  const httpStatus = Number(httpStatusRaw);
  if (httpStatus !== 200) {
    throw new Error(`Official One Piece series returned HTTP ${httpStatus}`);
  }
  const series = {
    series_id: String(seriesId),
    label: "incremental official series",
    set_codes: [],
    url: requestUrl,
  };
  const records = parseOnePieceOfficialCardListHtmlV1({
    html: body,
    series,
    finalUrl,
  });
  return {
    body,
    records,
    snapshot: {
      request_method: "POST",
      request_url: requestUrl,
      request_form: { series: String(seriesId) },
      final_url: finalUrl,
      fetched_at: new Date().toISOString(),
      http_status: httpStatus,
      byte_size: Buffer.byteLength(body),
      body_sha256: sha256(body),
      parsed_record_count: records.length,
    },
  };
}

async function loadDatabase(client, setCode) {
  const group = await client.query(`
    select group_id, category_id, name, abbreviation, published_on::date::text,
           source_active
    from public.tcgcsv_source_groups
    where category_id = 68
      and source_active
      and regexp_replace(upper(abbreviation), '[^A-Z0-9]', '', 'g') = $1
  `, [setCode]);
  if (group.rows.length !== 1) throw new Error(`One Piece warehouse group is not unique for ${setCode}`);
  const sourceGroup = group.rows[0];
  const products = await client.query(`
    select p.*, p.product_id::int as product_id, p.category_id::int as category_id,
           p.group_id::int as group_id, g.name as group_name, g.published_on::date::text
    from public.tcgcsv_source_products p
    join public.tcgcsv_source_groups g
      on g.category_id = p.category_id and g.group_id = p.group_id
    where p.category_id = 68 and p.group_id = $1 and p.source_active
    order by p.product_id
  `, [sourceGroup.group_id]);
  const sets = await client.query(`
    select code from public.sets where game = 'one_piece'
  `);
  const mappings = await client.query(`
    select external_id from public.external_mappings
    where source = 'tcgplayer'
      and external_id = any($1::text[])
  `, [products.rows.map((row) => String(row.product_id))]);
  const finishes = await client.query(`select o.*,o.product_id::int as product_id,
    o.category_id::int as category_id,o.group_id::int as group_id,o.observed_on::text as observed_on
    from unnest($1::bigint[]) p(product_id)
    cross join lateral (select t.* from public.tcgcsv_source_price_daily_observations t
      where t.product_id=p.product_id and t.observed_on=(select z.observed_on
        from public.tcgcsv_source_price_daily_observations z where z.product_id=p.product_id
        order by z.observed_on desc limit 1)) o order by o.id`, [products.rows.map(p=>p.product_id)]);
  const registry = await client.query('select * from public.finish_keys order by key');
  return {
    sourceGroup,
    products: products.rows,
    existingSetCodes: sets.rows.map((row) => row.code),
    existingProductIds: mappings.rows.map((row) => row.external_id),
    finishObservations: finishes.rows,
    finishKeys: registry.rows,
  };
}

export async function collisionPreflight(client, plan) {
  const rows = plan.payload.rows;
  const children = rows.flatMap(r=>r.printings), reviews = rows.flatMap(r=>r.printing_reviews);
  const checks = {
    set: plan.payload.set ? Number((await client.query(
      "select count(*)::int as count from public.sets where id=$1::uuid or (game='one_piece' and upper(code)=$2)",
      [plan.payload.set.id, plan.payload.set.code],
    )).rows[0].count) : 0,
    set_release_controls: plan.payload.set_release_control ? Number((await client.query(
      "select count(*)::int as count from public.catalog_set_release_controls where set_id=$1::uuid",
      [plan.payload.set_release_control.set_id],
    )).rows[0].count) : 0,
    card_prints: rows.length ? Number((await client.query(`
      select count(*)::int as count from public.card_prints
      where id=any($1::uuid[]) or gv_id=any($2::text[])
    `, [rows.map((row) => row.card_print.id), rows.map((row) => row.card_print.gv_id)])).rows[0].count) : 0,
    identities: rows.length ? Number((await client.query(`
      select count(*)::int as count from public.card_print_identity
      where id=any($1::uuid[]) or (is_active and identity_key_hash=any($2::text[]))
    `, [rows.map((row) => row.identity.id), rows.map((row) => row.identity.identity_key_hash)])).rows[0].count) : 0,
    evidence: rows.length ? Number((await client.query(`
      select count(*)::int as count from public.card_print_identity_source_evidence
      where id=any($1::uuid[])
    `, [rows.map((row) => row.source_evidence.id)])).rows[0].count) : 0,
    mappings: rows.length ? Number((await client.query(`
      select count(*)::int as count from public.external_mappings
      where source='tcgplayer' and external_id=any($1::text[])
    `, [rows.map((row) => row.external_mapping.external_id)])).rows[0].count) : 0,
    child_printings: children.length ? Number((await client.query(`select count(*)::int as count
      from public.card_printings where id=any($1::uuid[]) or printing_gv_id=any($2::text[])
      or card_print_id=any($3::uuid[])`, [children.map(c=>c.id),children.map(c=>c.printing_gv_id),rows.map(r=>r.card_print.id)])).rows[0].count) : 0,
    printing_reviews: reviews.length ? Number((await client.query(`select count(*)::int as count
      from public.card_printing_truth_reviews where id=any($1::uuid[]) or card_printing_id=any($2::uuid[])`,
      [reviews.map(r=>r.id),children.map(c=>c.id)])).rows[0].count) : 0,
  };
  if (Object.values(checks).some((count) => count !== 0)) {
    throw new Error(`Collision preflight failed: ${JSON.stringify(checks)}`);
  }
  return checks;
}

export async function insertPlan(client, plan) {
  const validation = validateOnePieceIncrementalPromotionPlanV1(plan);
  assert.equal(validation.valid, true, validation.findings.join(','));
  if (plan.payload.set) {
    await client.query(`insert into public.sets (
      id,game,code,name,release_date,source,identity_domain_default
    ) values ($1::uuid,$2,$3,$4,$5::date,$6::jsonb,$7)`, [
      plan.payload.set.id,
      plan.payload.set.game,
      plan.payload.set.code,
      plan.payload.set.name,
      plan.payload.set.release_date,
      JSON.stringify(plan.payload.set.source),
      plan.payload.set.identity_domain_default,
    ]);
  }
  if (plan.payload.set_release_control) {
    await client.query(`insert into public.catalog_set_release_controls (
      set_id,release_status,release_version,evidence,activated_at,activated_by
    ) values ($1::uuid,$2,$3,$4::jsonb,$5::timestamptz,$6)`, [
      plan.payload.set_release_control.set_id,
      plan.payload.set_release_control.release_status,
      plan.payload.set_release_control.release_version,
      JSON.stringify(plan.payload.set_release_control.evidence),
      plan.payload.set_release_control.activated_at,
      plan.payload.set_release_control.activated_by,
    ]);
  }
  const rows = plan.payload.rows;
  if (!rows.length) return;
  await client.query(`insert into public.card_prints (
    id,game_id,set_id,set_code,name,number,variant_key,rarity,gv_id,tcgplayer_id,
    external_ids,identity_domain,print_identity_key,image_url,image_alt_url,
    image_source,image_status,image_note,data_quality_flags,ai_metadata
  ) select x.id,x.game_id,x.set_id,x.set_code,x.name,x.number,x.variant_key,
    x.rarity,x.gv_id,x.tcgplayer_id,x.external_ids,x.identity_domain,
    x.print_identity_key,x.image_url,x.image_alt_url,x.image_source,x.image_status,
    x.image_note,x.data_quality_flags,x.ai_metadata
  from jsonb_to_recordset($1::jsonb) as x(
    id uuid,game_id uuid,set_id uuid,set_code text,name text,number text,
    variant_key text,rarity text,gv_id text,tcgplayer_id text,external_ids jsonb,
    identity_domain text,print_identity_key text,image_url text,image_alt_url text,
    image_source text,image_status text,image_note text,data_quality_flags jsonb,
    ai_metadata jsonb
  )`, [JSON.stringify(rows.map((row) => row.card_print))]);
  await client.query(`insert into public.card_print_identity (
    id,card_print_id,identity_domain,set_code_identity,printed_number,
    normalized_printed_name,source_name_raw,identity_payload,identity_key_version,
    identity_key_hash,is_active
  ) select x.id,x.card_print_id,x.identity_domain,x.set_code_identity,
    x.printed_number,x.normalized_printed_name,x.source_name_raw,x.identity_payload,
    x.identity_key_version,x.identity_key_hash,x.is_active
  from jsonb_to_recordset($1::jsonb) as x(
    id uuid,card_print_id uuid,identity_domain text,set_code_identity text,
    printed_number text,normalized_printed_name text,source_name_raw text,
    identity_payload jsonb,identity_key_version text,identity_key_hash text,
    is_active boolean
  )`, [JSON.stringify(rows.map((row) => row.identity))]);
  await client.query(`insert into public.card_print_identity_source_evidence (
    id,card_print_identity_id,card_print_id,acquisition_key,source_key,
    evidence_key_hash,evidence_subject,evidence_payload,active
  ) select x.id,x.card_print_identity_id,x.card_print_id,x.acquisition_key,
    x.source_key,x.evidence_key_hash,x.evidence_subject,x.evidence_payload,x.active
  from jsonb_to_recordset($1::jsonb) as x(
    id uuid,card_print_identity_id uuid,card_print_id uuid,acquisition_key text,
    source_key text,evidence_key_hash text,evidence_subject jsonb,
    evidence_payload jsonb,active boolean
  )`, [JSON.stringify(rows.map((row) => row.source_evidence))]);
  await client.query(`insert into public.external_mappings (
    card_print_id,source,external_id,meta,active
  ) select x.card_print_id,x.source,x.external_id,x.meta,x.active
  from jsonb_to_recordset($1::jsonb) as x(
    card_print_id uuid,source text,external_id text,meta jsonb,active boolean
  )`, [JSON.stringify(rows.map((row) => row.external_mapping))]);
  const children=rows.flatMap(r=>r.printings), reviews=rows.flatMap(r=>r.printing_reviews);
  for(const [table, records] of [['card_printings',children],['card_printing_truth_reviews',reviews]]) {
    if(!records.length)continue;
    const columns=Object.keys(records[0]);
    const inserted=await client.query(`insert into public.${table} (${columns.join(',')})
      select ${columns.join(',')} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(records)]);
    assert.equal(inserted.rowCount,records.length,`${table}_insert_count_mismatch`);
  }
}

export async function readback(client, plan, { expectAbsent = false } = {}) {
  const rows = plan.payload.rows;
  const cardIds = rows.map((row) => row.card_print.id);
  const productIds = rows.map((row) => row.external_mapping.external_id);
  const counts = {
    sets: plan.payload.set ? Number((await client.query(
      "select count(*)::int as count from public.sets where id=$1::uuid",
      [plan.payload.set.id],
    )).rows[0].count) : 0,
    set_release_controls: plan.payload.set_release_control ? Number((await client.query(
      "select count(*)::int as count from public.catalog_set_release_controls where set_id=$1::uuid and release_status='hidden'",
      [plan.payload.set_release_control.set_id],
    )).rows[0].count) : 0,
    card_prints: cardIds.length ? Number((await client.query(
      "select count(*)::int as count from public.card_prints where id=any($1::uuid[])", [cardIds],
    )).rows[0].count) : 0,
    identities: cardIds.length ? Number((await client.query(
      "select count(*)::int as count from public.card_print_identity where card_print_id=any($1::uuid[])", [cardIds],
    )).rows[0].count) : 0,
    evidence: cardIds.length ? Number((await client.query(
      "select count(*)::int as count from public.card_print_identity_source_evidence where card_print_id=any($1::uuid[])", [cardIds],
    )).rows[0].count) : 0,
    external_mappings: productIds.length ? Number((await client.query(
      "select count(*)::int as count from public.external_mappings where source='tcgplayer' and external_id=any($1::text[])", [productIds],
    )).rows[0].count) : 0,
    child_printings: cardIds.length ? Number((await client.query(
      'select count(*)::int as count from public.card_printings where card_print_id=any($1::uuid[])',[cardIds])).rows[0].count) : 0,
    printing_reviews: cardIds.length ? Number((await client.query(`select count(*)::int as count
      from public.card_printing_truth_reviews r join public.card_printings p on p.id=r.card_printing_id
      where p.card_print_id=any($1::uuid[])`,[cardIds])).rows[0].count) : 0,
  };
  if(!expectAbsent)for(const [table, expected, field] of [
    ['sets',plan.payload.set ? [plan.payload.set] : [],'id'],
    ['catalog_set_release_controls',plan.payload.set_release_control ? [plan.payload.set_release_control] : [],'set_id'],
    ['card_prints',rows.map(r=>r.card_print),'id'],
    ['card_print_identity',rows.map(r=>r.identity),'id'],
    ['card_print_identity_source_evidence',rows.map(r=>r.source_evidence),'id'],
    ['external_mappings',rows.map(r=>r.external_mapping),'card_print_id'],
    ['card_printings',rows.flatMap(r=>r.printings),'id'],
    ['card_printing_truth_reviews',rows.flatMap(r=>r.printing_reviews),'id'],
  ]) {
    if(!expected.length)continue;
    const actual=(await client.query(`select to_jsonb(t) row from public.${table} t where ${field}=any($1::uuid[])`,
      [expected.map(r=>r[field])])).rows.map(r=>r.row);
    assert.equal(actual.length,expected.length,`${table}_readback_count_mismatch`);
    for(const wanted of expected) {
      const matches=actual.filter(r=>r[field]===wanted[field]);assert.equal(matches.length,1);
      const projected=Object.fromEntries(Object.keys(wanted).map(k=>[k,k==='reviewed_at'?new Date(matches[0][k]).toISOString():matches[0][k]]));
      assert.deepEqual(projected,wanted,`${table}_exact_readback_mismatch`);
    }
  }
  return counts;
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, { encoding: "utf8", flag: "wx" });
  return Buffer.from(body);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean: git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (options.mode === "apply" && (repository.commit_sha !== options.expectedHeadSha ||
      !repository.tracked_worktree_clean)) {
    throw new Error("Apply requires the exact clean frozen commit");
  }
  const runPlan = {
    version: ONE_PIECE_INCREMENTAL_PROMOTION_VERSION,
    mode: options.mode,
    as_of: options.asOf,
    expected_payload_fingerprint: options.expectedPayloadFingerprint,
    repository,
    target: { set_code: options.setCode, official_series_id: options.officialSeriesId },
    boundaries: {
      insert_only: true,
      set_release_status: "hidden",
      public_visibility_changes: 0,
      updates: 0,
      deletes: 0,
      child_printings: "source_verified_only_atomic_with_parent",
      don_writes: 0,
      sealed_writes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
    },
  };
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);
  const client = new Client(clientOptions(options.databaseUrl, options.mode));
  await client.connect();
  let transactionOpen = false;
  const state = transactionState();
  try {
    await client.query(options.mode === "plan"
      ? "begin transaction isolation level repeatable read read only"
      : "begin transaction isolation level serializable");
    transactionOpen = true;
    const database = await loadDatabase(client, options.setCode);
    const official = await fetchOfficialSeries(options.officialSeriesId);
    const plan = buildOnePieceIncrementalPromotionPlanV1({
      asOf: options.asOf,
      setCode: options.setCode,
      setName: database.sourceGroup.name,
      releaseDate: database.sourceGroup.published_on,
      officialSeriesId: options.officialSeriesId,
      warehouseProducts: database.products,
      officialRecords: official.records,
      existingSetCodes: database.existingSetCodes,
      existingTcgplayerProductIds: database.existingProductIds,
      finishObservations: database.finishObservations,
      finishKeys: database.finishKeys,
    });
    const validation = validateOnePieceIncrementalPromotionPlanV1(plan);
    if (!validation.valid) throw new Error(validation.findings.join(","));
    if (options.expectedPayloadFingerprint &&
        options.expectedPayloadFingerprint !== plan.payload_fingerprint_sha256) {
      throw new Error("Expected payload fingerprint does not match the frozen One Piece plan");
    }
    const collisions = await collisionPreflight(client, plan);
    // Preserve the exact evidence and reviewed payload before any SQL mutation.
    const frozenArtifacts = {
      'run_plan.json': await fs.readFile(path.join(options.outDir, 'run_plan.json')),
      'frozen_promotion_plan.json': await writeJson(path.join(options.outDir, 'frozen_promotion_plan.json'), plan),
      'source_records.json': await writeJson(path.join(options.outDir, 'source_records.json'), official.records),
      'source_snapshot.json': await writeJson(path.join(options.outDir, 'source_snapshot.json'), official.snapshot),
      'official-source.html': Buffer.from(official.body),
    };
    await fs.writeFile(path.join(options.outDir, 'official-source.html'), official.body, { encoding: 'utf8', flag: 'wx' });
    await writeJson(path.join(options.outDir, 'frozen_artifact_hashes.json'), Object.fromEntries(
      Object.entries(frozenArtifacts).map(([name,bytes])=>[name,sha256(bytes)])));
    const expected = plan.counts;
    let transactionResult = { action: "plan_only", expected };
    if (options.mode === "plan") {
      await client.query("rollback");
      transactionOpen = false;
    } else {
      await insertPlan(client, plan);
      const inserted = await readback(client, plan);
      if (JSON.stringify(inserted) !== JSON.stringify(expected)) {
        throw new Error(`Transaction readback mismatch: ${JSON.stringify(inserted)}`);
      }
      if (options.mode === "dry-run") {
        await client.query("rollback");
        transactionOpen = false;
        const absent = await readback(client, plan, { expectAbsent: true });
        if (Object.values(absent).some((count) => count !== 0)) {
          throw new Error(`Rollback absence proof failed: ${JSON.stringify(absent)}`);
        }
        transactionResult = { action: "rolled_back", inserted_readback: inserted, post_rollback_readback: absent };
      } else {
        await commitTransaction(client, state);
        transactionOpen = false;
        const durable = await readback(client, plan);
        if (JSON.stringify(durable) !== JSON.stringify(expected)) {
          throw new Error(`Durable readback mismatch: ${JSON.stringify(durable)}`);
        }
        transactionResult = { action: "committed", durable_readback: durable };
      }
    }
    const finalPlan = { ...plan, collision_preflight: collisions, transaction_result: transactionResult };
    const summary = {
      version: ONE_PIECE_INCREMENTAL_PROMOTION_VERSION,
      mode: options.mode,
      status: options.mode === "apply" ? "applied" : options.mode === "dry-run" ? "rollback_proven" : plan.status,
      target: plan.target,
      release_eligible: plan.release_eligible,
      source_counts: plan.source_counts,
      counts: plan.counts,
      payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
      transaction_result: transactionResult,
      boundaries: runPlan.boundaries,
    };
    const artifacts = {
      ...frozenArtifacts,
      "promotion_plan.json": await writeJson(path.join(options.outDir, "promotion_plan.json"), finalPlan),
      "summary.json": await writeJson(path.join(options.outDir, "summary.json"), summary),
    };
    await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
      algorithm: "sha256",
      artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
        path: artifactPath,
        bytes: body.length,
        sha256: sha256(body),
      })),
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    if (transactionOpen && !state.commit_attempted) await rollbackTransaction(client, state);
    await writeJson(path.join(options.outDir, 'failure.json'), {
      error: error.message,
      transaction: state,
      automatic_retry_allowed: false,
      next_action: state.commit_attempted
        ? 'Read back the frozen payload on a fresh connection; never assume a failed response means rollback.'
        : 'Inspect preserved evidence and transaction state before another execution.',
    });
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
