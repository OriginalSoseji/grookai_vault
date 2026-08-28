import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import tls from "node:tls";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

import {
  buildOnePieceSetClosureSnapshotV1,
  buildOnePieceSetImagePointerV1,
  evaluateOnePieceSetReleaseReadinessV1,
  hashOnePieceSetReleaseClosureV1,
  isOnePieceSelfHostedExactImageV1,
  normalizeOnePieceSetCodeV1,
  ONE_PIECE_SET_IMAGE_BUCKET,
  ONE_PIECE_SET_RELEASE_CLOSURE_VERSION,
  resolveOnePieceGovernedExternalExactImageV1,
  resolveOnePieceOfficialBaseImageV1,
  validateOnePieceSetImagePointersV1,
} from "../../backend/catalog/one_piece_set_release_closure_v1.mjs";
import { inspectOnePieceImage } from
  "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import { parseOnePieceOfficialCardListHtmlV1 } from
  "../../backend/pricing/one_piece_complete_official_catalog_authority_v1.mjs";
import { pgSslConfig } from
  "../audits/japanese_master_index_v4/read_only_guard_v1.mjs";

tls.setDefaultCACertificates([
  ...tls.getCACertificates("default"),
  ...tls.getCACertificates("system"),
]);

const USER_AGENT = "GrookaiVaultOnePieceSetClosure/1.0 catalog-ops@grookai.com";
const MODES = new Set([
  "audit",
  "image-canary",
  "image-apply",
  "activation-canary",
  "activate",
  "verify",
]);

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const args = {
    mode: "audit",
    setCode: "OP17",
    officialSeriesId: "569117",
    expectedHeadSha: null,
    expectedSnapshotFingerprint: null,
    databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null,
    supabaseUrl: process.env.SUPABASE_URL ?? null,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? null,
    concurrency: 12,
    canarySize: 10,
    outDir: path.resolve("artifacts", "one_piece_set_release_closure_v1", stamp),
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) args.mode = token.slice(7);
    else if (token.startsWith("--set-code=")) args.setCode = token.slice(11);
    else if (token.startsWith("--official-series-id=")) args.officialSeriesId = token.slice(21);
    else if (token.startsWith("--expected-head-sha=")) args.expectedHeadSha = token.slice(20);
    else if (token.startsWith("--expected-snapshot-fingerprint=")) {
      args.expectedSnapshotFingerprint = token.slice(32);
    } else if (token.startsWith("--db-url=")) args.databaseUrl = token.slice(9);
    else if (token.startsWith("--concurrency=")) args.concurrency = Number(token.slice(14));
    else if (token.startsWith("--canary-size=")) args.canarySize = Number(token.slice(14));
    else if (token.startsWith("--out-dir=")) args.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unsupported argument: ${token}`);
  }
  if (!MODES.has(args.mode)) throw new Error(`Unsupported mode: ${args.mode}`);
  args.setCode = normalizeOnePieceSetCodeV1(args.setCode);
  if (!/^\d+$/.test(args.officialSeriesId)) throw new Error("Invalid official series ID");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha ?? "")) {
    throw new Error("Exact producer SHA is required");
  }
  if (args.mode !== "audit" &&
      !/^[0-9a-f]{64}$/.test(args.expectedSnapshotFingerprint ?? "")) {
    throw new Error("Mutation and verification modes require an exact snapshot fingerprint");
  }
  if (!args.databaseUrl) throw new Error("SUPABASE_DB_URL is required");
  if (!args.supabaseUrl) throw new Error("SUPABASE_URL is required");
  const supabaseUrl = new URL(args.supabaseUrl);
  if (supabaseUrl.protocol !== "https:") {
    throw new Error("SUPABASE_URL must use HTTPS");
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 30) {
    throw new Error("Concurrency must be between 1 and 30");
  }
  if (!Number.isInteger(args.canarySize) || args.canarySize < 1 || args.canarySize > 25) {
    throw new Error("Canary size must be between 1 and 25");
  }
  return args;
}

function repository(args) {
  const result = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean: git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (result.commit_sha !== args.expectedHeadSha || !result.tracked_worktree_clean) {
    throw new Error("Execution requires the exact clean frozen producer commit");
  }
  return result;
}

function clientOptions(connectionString, mode) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    application_name: `one-piece-set-closure-v1-${mode}`,
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
  if (markerIndex < 0) throw new Error("Official response metadata missing");
  const body = response.slice(0, markerIndex);
  const [statusRaw, finalUrl] = response
    .slice(markerIndex + marker.length + 1).trim().split("\t");
  if (Number(statusRaw) !== 200) throw new Error(`Official HTTP ${statusRaw}`);
  const records = parseOnePieceOfficialCardListHtmlV1({
    html: body,
    series: { series_id: String(seriesId), label: "set closure", set_codes: [], url: requestUrl },
    finalUrl,
  });
  return {
    artwork_record_count: records.length,
    unique_number_count: new Set(records.map((row) => row.card_number)).size,
    body_sha256: hashOnePieceSetReleaseClosureV1(body),
    final_url: finalUrl,
    records,
  };
}

async function loadClosureRows(client, setCode) {
  const setResult = await client.query(`
    select id::text, game, upper(code) code, name, release_date::text
    from public.sets
    where game='one_piece' and upper(code)=$1
  `, [setCode]);
  if (setResult.rows.length !== 1) throw new Error(`Canonical set ${setCode} is not unique`);
  const set = setResult.rows[0];
  const controlResult = await client.query(`
    select set_id::text, release_status, release_version, evidence,
           activated_at, activated_by
    from public.catalog_set_release_controls
    where set_id=$1::uuid
  `, [set.id]);
  const releaseControl = controlResult.rows[0] ?? null;
  const rows = (await client.query(`
    select cp.id::text card_print_id, cp.gv_id, upper(cp.set_code) set_code,
           cp.name, cp.number, cp.image_url, cp.image_alt_url, cp.image_source,
           cp.image_hash, cp.image_status, cp.image_res, cp.image_path,
           cp.image_note,
           coalesce(cp.data_quality_flags #>> '{app_visibility_v1,status}', 'visible')
             visibility_status,
           coalesce(identity.active_identity_count,0)::int active_identity_count,
           coalesce(evidence.active_evidence_count,0)::int active_evidence_count,
           coalesce(mapping.active_mapping_count,0)::int active_mapping_count,
           mapping.source_product_id,
           product.name source_product_name,
           product.image_url source_image_url
    from public.card_prints cp
    left join lateral (
      select count(*) filter(where identity.is_active)::int active_identity_count
      from public.card_print_identity identity
      where identity.card_print_id=cp.id
    ) identity on true
    left join lateral (
      select count(*) filter(where evidence.active)::int active_evidence_count
      from public.card_print_identity_source_evidence evidence
      where evidence.card_print_id=cp.id
    ) evidence on true
    left join lateral (
      select count(*) filter(where mapping.active)::int active_mapping_count,
             min(mapping.external_id) filter(where mapping.active) source_product_id
      from public.external_mappings mapping
      where mapping.card_print_id=cp.id and mapping.source='tcgplayer'
    ) mapping on true
    left join public.tcgcsv_source_products product
      on product.category_id=68
     and product.product_id::text=mapping.source_product_id
    where cp.set_id=$1::uuid
       or cp.data_quality_flags #>> '{app_visibility_v1,release_set_code}'=$2
    order by cp.id
  `, [set.id, setCode])).rows;
  return { set, releaseControl, rows };
}

async function loadSourcePricing(client, rows) {
  const productIds = rows.map((row) => Number(row.source_product_id))
    .filter(Number.isInteger);
  if (!productIds.length) return { market_product_count: 0, latest_observed_on: null };
  const result = await client.query(`
    select count(distinct observation.product_id) filter(
             where observation.market_price is not null
               and observation.market_price > 0
           )::int market_product_count,
           max(observation.observed_on)::text latest_observed_on
    from public.tcgcsv_source_price_daily_observations observation
    where observation.category_id=68
      and observation.product_id=any($1::integer[])
      and observation.observed_on=(
        select max(latest.observed_on)
        from public.tcgcsv_source_price_daily_observations latest
        where latest.category_id=68
          and latest.product_id=any($1::integer[])
      )
  `, [productIds]);
  return result.rows[0];
}

function imagePublicBaseUrl(args) {
  return `${args.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/` +
    ONE_PIECE_SET_IMAGE_BUCKET;
}

async function captureSnapshot(client, setCode, official, publicBaseUrl) {
  const closure = await loadClosureRows(client, setCode);
  const sourcePricing = await loadSourcePricing(client, closure.rows);
  return buildOnePieceSetClosureSnapshotV1({
    ...closure,
    sourcePricing,
    official,
    imagePublicBaseUrl: publicBaseUrl,
  });
}

async function writeArtifacts(dir, files, producerSha) {
  await fs.mkdir(dir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.isBuffer(value)
      ? value
      : Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    await fs.writeFile(path.join(dir, name), body);
    hashes[name] = { bytes: body.length, sha256: hashOnePieceSetReleaseClosureV1(body) };
  }
  await fs.writeFile(path.join(dir, "artifact_hashes.json"),
    `${JSON.stringify({ producer_commit_sha: producerSha, artifacts: hashes }, null, 2)}\n`);
}

function assertSnapshotBinding(snapshot, args) {
  if (snapshot.snapshot_fingerprint_sha256 !== args.expectedSnapshotFingerprint) {
    throw new Error(
      `Snapshot drift: ${snapshot.snapshot_fingerprint_sha256} != ${args.expectedSnapshotFingerprint}`,
    );
  }
}

function imageCandidates(snapshot) {
  return snapshot.rows.filter((row) =>
    !isOnePieceSelfHostedExactImageV1(
      row,
      snapshot.image_public_base_url,
    )).map((row) => ({
      ...row,
      official_base_image: resolveOnePieceOfficialBaseImageV1(
        row,
        snapshot.official?.records,
      ),
      governed_external_image:
        resolveOnePieceGovernedExternalExactImageV1(row),
    }));
}

function imageUrls(row) {
  const source = new URL(row.source_image_url);
  if (source.protocol !== "https:" ||
      source.hostname.toLowerCase() !== "tcgplayer-cdn.tcgplayer.com") {
    throw new Error(`Invalid source image host for ${row.gv_id}`);
  }
  const high = new URL(source);
  high.pathname = high.pathname.replace(/_200w\.jpg$/i, "_in_1000x1000.jpg");
  const productImage =
    `https://product-images.tcgplayer.com/fit-in/1000x1000/` +
    `${row.source_product_id}.jpg`;
  const candidates = [
    {
      role: "tcgplayer_high_resolution",
      authority: "tcgplayer_exact_product",
      hosts: ["tcgplayer-cdn.tcgplayer.com"],
      url: high.toString(),
    },
    {
      role: "tcgplayer_source_fallback",
      authority: "tcgplayer_exact_product",
      hosts: ["tcgplayer-cdn.tcgplayer.com"],
      url: source.toString(),
    },
    {
      role: "tcgplayer_product_image_host",
      authority: "tcgplayer_exact_product",
      hosts: ["product-images.tcgplayer.com"],
      url: productImage,
    },
  ];
  if (row.official_base_image?.status === "exact_official_base_image") {
    candidates.push({
      role: "bandai_official_exact_base_art",
      authority: "bandai_official_exact_base_art",
      hosts: ["en.onepiece-cardgame.com"],
      url: row.official_base_image.image_url,
    });
  }
  if (row.governed_external_image) {
    candidates.push({
      role: "governed_external_exact_product",
      authority: "verified_external_exact_product",
      hosts: ["www.tcgintel.app"],
      url: row.governed_external_image.download_url,
      evidence_url: row.governed_external_image.evidence_url,
      expected_sha256: row.governed_external_image.expected_sha256,
    });
  }
  return candidates.filter((candidate, index, values) =>
    values.findIndex((other) => other.url === candidate.url) === index);
}

async function responseBuffer(response) {
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 8_000_000) throw new Error("image_exceeds_8mb");
  return buffer;
}

async function downloadImage(row) {
  const errors = [];
  for (const candidate of imageUrls(row)) {
    try {
      const response = await fetch(candidate.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(45_000),
        headers: { "user-agent": USER_AGENT, accept: "image/*" },
      });
      if (!response.ok || !candidate.hosts.includes(
        new URL(response.url).hostname.toLowerCase(),
      )) {
        throw new Error(`http_or_redirect:${response.status}`);
      }
      const buffer = await responseBuffer(response);
      const image = inspectOnePieceImage(buffer, response.headers.get("content-type"));
      if (!image.valid_image) throw new Error(image.diagnostics.join(","));
      if (candidate.expected_sha256 && image.sha256 !== candidate.expected_sha256) {
        throw new Error(`expected_hash_mismatch:${image.sha256}`);
      }
      return {
        buffer,
        image: {
          ...image,
          source_download_role: candidate.role,
          source_authority: candidate.authority,
          source_download_url: candidate.url,
          source_final_url: response.url,
          source_evidence_url: candidate.evidence_url ?? null,
          source_expected_sha256: candidate.expected_sha256 ?? null,
        },
      };
    } catch (error) {
      errors.push(`${candidate.role}:${candidate.url}:${error.message}`);
    }
  }
  throw new Error(`Image download failed for ${row.gv_id}: ${errors.join("|")}`);
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      try {
        results[index] = { ok: true, value: await mapper(values[index]) };
      } catch (error) {
        results[index] = {
          ok: false,
          error: error.message,
          input: values[index],
          created_pointer: error.createdPointer ?? null,
          cleanup_verified: error.cleanupVerified ?? null,
        };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function storageClient(args) {
  if (!args.supabaseUrl || !args.supabaseSecretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required for image modes");
  }
  const client = createClient(args.supabaseUrl, args.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "user-agent": USER_AGENT } },
  });
  return {
    storage: client.storage,
    publicBaseUrl: imagePublicBaseUrl(args),
  };
}

async function objectExists(storage, imagePath) {
  const split = imagePath.lastIndexOf("/");
  const folder = imagePath.slice(0, split);
  const name = imagePath.slice(split + 1);
  const result = await storage.from(ONE_PIECE_SET_IMAGE_BUCKET)
    .list(folder, { search: name, limit: 10 });
  if (result.error) throw new Error(`storage_list:${result.error.message}`);
  return (result.data ?? []).some((row) => row.name === name);
}

async function verifyStored(storage, pointer) {
  const result = await storage.from(ONE_PIECE_SET_IMAGE_BUCKET)
    .download(pointer.image_path);
  if (result.error || !result.data) {
    throw new Error(`storage_download:${result.error?.message ?? "missing"}`);
  }
  const buffer = Buffer.from(await result.data.arrayBuffer());
  if (hashOnePieceSetReleaseClosureV1(buffer) !== pointer.image_hash ||
      buffer.length !== pointer.size_bytes) {
    throw new Error(`storage_hash_mismatch:${pointer.gv_id}`);
  }
}

async function uploadOne(storage, publicBaseUrl, row) {
  const { buffer, image } = await downloadImage(row);
  const pointer = buildOnePieceSetImagePointerV1({ row, image, publicBaseUrl });
  const existed = await objectExists(storage, pointer.image_path);
  let created = false;
  if (!existed) {
    const result = await storage.from(ONE_PIECE_SET_IMAGE_BUCKET)
      .upload(pointer.image_path, buffer, {
        upsert: false,
        contentType: pointer.content_type,
        cacheControl: "31536000",
      });
    if (result.error) throw new Error(`storage_upload:${result.error.message}`);
    created = true;
  }
  try {
    await verifyStored(storage, pointer);
  } catch (error) {
    if (created) {
      try {
        await removeCreated(storage, [pointer]);
      } catch (cleanupError) {
        const wrapped = new Error(
          `${error.message}; storage_cleanup_failed:${cleanupError.message}`,
        );
        wrapped.createdPointer = pointer;
        wrapped.cleanupVerified = false;
        throw wrapped;
      }
    }
    throw error;
  }
  return { pointer, created, reused_verified: existed };
}

async function removeCreated(storage, pointers) {
  if (!pointers.length) return { removed: 0, absent: 0 };
  const result = await storage.from(ONE_PIECE_SET_IMAGE_BUCKET)
    .remove(pointers.map((row) => row.image_path));
  if (result.error) throw new Error(`storage_remove:${result.error.message}`);
  const absent = await Promise.all(pointers.map(async (row) =>
    !(await objectExists(storage, row.image_path))));
  if (!absent.every(Boolean)) throw new Error("storage_rollback_residue");
  return { removed: pointers.length, absent: absent.filter(Boolean).length };
}

async function applyPointers(client, setCode, pointers) {
  await client.query("begin transaction isolation level serializable");
  try {
    await client.query("set local lock_timeout='20s'");
    const targetSet = await client.query(`
      select id from public.sets
      where game='one_piece' and upper(code)=$1
      for share
    `, [setCode]);
    if (targetSet.rowCount !== 1) throw new Error("Target set lock mismatch");
    const control = await client.query(`
      select release_status from public.catalog_set_release_controls
      where set_id=$1::uuid
      for update
    `, [targetSet.rows[0].id]);
    const releaseStatus = control.rows[0]?.release_status ?? "inherited";
    if (!["hidden", "signed_in", "inherited"].includes(releaseStatus)) {
      throw new Error("Image pointers require a non-public target set");
    }
    await client.query(`create temp table op_set_image_pointer_v1 (
      id uuid primary key, image_url text, image_alt_url text,
      image_source text, image_hash text, image_status text,
      image_res jsonb, image_path text, image_note text,
      source_product_id bigint, source_product_name text,
      source_image_url text
    ) on commit drop`);
    await client.query(`insert into op_set_image_pointer_v1
      select * from jsonb_to_recordset($1::jsonb) as x(
        id uuid, image_url text, image_alt_url text, image_source text,
        image_hash text, image_status text, image_res jsonb,
        image_path text, image_note text, source_product_id bigint,
        source_product_name text, source_image_url text
      )`, [JSON.stringify(pointers.map((pointer) => ({
      id: pointer.card_print_id,
      image_url: pointer.image_url,
      image_alt_url: pointer.image_alt_url,
      image_source: pointer.image_source,
      image_hash: pointer.image_hash,
      image_status: pointer.image_status,
      image_res: pointer.image_res,
      image_path: pointer.image_path,
      image_note: pointer.image_note,
      source_product_id: pointer.source_product_id,
      source_product_name: pointer.source_product_name,
      source_image_url: pointer.source_image_url,
    })))]);
    const mappingLock = await client.query(`
      select payload.id
      from op_set_image_pointer_v1 payload
      join public.external_mappings mapping
        on mapping.card_print_id=payload.id
       and mapping.source='tcgplayer'
       and mapping.active
       and mapping.external_id=payload.source_product_id::text
      join public.tcgcsv_source_products product
        on product.category_id=68
       and product.product_id=payload.source_product_id
       and product.name=payload.source_product_name
       and product.image_url=payload.source_image_url
      for share of mapping, product
    `);
    if (mappingLock.rowCount !== pointers.length) {
      throw new Error(
        `Snapshot-bound mapping revalidation failed ${mappingLock.rowCount}/${pointers.length}`,
      );
    }
    const updated = await client.query(`update public.card_prints card set
      image_url=payload.image_url,
      image_alt_url=payload.image_alt_url,
      image_source=payload.image_source,
      image_hash=payload.image_hash,
      image_status=payload.image_status,
      image_res=payload.image_res,
      image_last_checked_at=now(),
      image_path=payload.image_path,
      image_note=payload.image_note
      from op_set_image_pointer_v1 payload
      where card.id=payload.id
        and (
          card.set_id=(select id from public.sets where game='one_piece' and upper(code)=$1)
          or card.data_quality_flags #>> '{app_visibility_v1,release_set_code}'=$1
        )
      returning card.id::text`, [setCode]);
    if (updated.rowCount !== pointers.length) {
      throw new Error(`Pointer update mismatch ${updated.rowCount}/${pointers.length}`);
    }
    await client.query("commit");
    return updated.rowCount;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function visibilityCounts(client, snapshot) {
  const ids = snapshot.rows.map((row) => row.card_print_id);
  await client.query("select set_config('request.jwt.claim.role','anon',false)");
  const anonymous = await client.query(`
    select public.catalog_set_visible_to_request_v1($1::uuid) set_visible,
           count(*) filter(where public.catalog_card_print_visible_to_request_v1(id))::int card_count
    from unnest($2::uuid[]) id
  `, [snapshot.set.id, ids]);
  await client.query("select set_config('request.jwt.claim.role','authenticated',false)");
  const authenticated = await client.query(`
    select public.catalog_set_visible_to_request_v1($1::uuid) set_visible,
           count(*) filter(where public.catalog_card_print_visible_to_request_v1(id))::int card_count
    from unnest($2::uuid[]) id
  `, [snapshot.set.id, ids]);
  return { anonymous: anonymous.rows[0], authenticated: authenticated.rows[0] };
}

async function activateSet(client, snapshot, args, rollback) {
  const readiness = evaluateOnePieceSetReleaseReadinessV1(snapshot);
  if (!readiness.valid) throw new Error(`Readiness failed: ${readiness.findings.join(",")}`);
  await client.query("begin transaction isolation level serializable");
  try {
    const update = await client.query(`update public.catalog_set_release_controls
      set release_status='signed_in',
          release_version=$2,
          evidence=coalesce(evidence,'{}'::jsonb) || $3::jsonb,
          activated_at=now(),
          activated_by='one_piece_set_release_closure_v1',
          updated_at=now()
      where set_id=$1::uuid and release_status='hidden'
      returning set_id`, [
      snapshot.set.id,
      ONE_PIECE_SET_RELEASE_CLOSURE_VERSION,
      JSON.stringify({
        closure_snapshot_fingerprint_sha256: snapshot.snapshot_fingerprint_sha256,
        producer_commit_sha: args.expectedHeadSha,
        release_set_code: args.setCode,
      }),
    ]);
    if (update.rowCount !== 1) throw new Error("Set release control update mismatch");
    const unsuppressed = await client.query(`update public.card_prints
      set data_quality_flags=jsonb_set(
        coalesce(data_quality_flags,'{}'::jsonb),
        '{app_visibility_v1,status}',
        '"visible"'::jsonb,
        true
      )
      where data_quality_flags #>> '{app_visibility_v1,release_set_code}'=$1
        and data_quality_flags #>> '{app_visibility_v1,status}'='suppressed'
      returning id`, [args.setCode]);
    const visibility = await visibilityCounts(client, snapshot);
    if (visibility.anonymous.set_visible !== false ||
        Number(visibility.anonymous.card_count) !== 0 ||
        visibility.authenticated.set_visible !== true ||
        Number(visibility.authenticated.card_count) !== snapshot.rows.length) {
      throw new Error(`Visibility readback mismatch: ${JSON.stringify(visibility)}`);
    }
    if (rollback) await client.query("rollback");
    else await client.query("commit");
    return {
      committed: !rollback,
      release_rows: update.rowCount,
      unsuppressed_rows: unsuppressed.rowCount,
      visibility,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const official = await fetchOfficialSeries(args.officialSeriesId);
  const publicBaseUrl = imagePublicBaseUrl(args);
  const client = new Client(clientOptions(args.databaseUrl, args.mode));
  await client.connect();
  try {
    let snapshot;
    try {
      await client.query("begin transaction isolation level repeatable read read only");
      snapshot = await captureSnapshot(
        client,
        args.setCode,
        official,
        publicBaseUrl,
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
    const base = {
    version: ONE_PIECE_SET_RELEASE_CLOSURE_VERSION,
    mode: args.mode,
    repository: repo,
    target: { set_code: args.setCode, official_series_id: args.officialSeriesId },
    snapshot_fingerprint_sha256: snapshot.snapshot_fingerprint_sha256,
  };
    if (args.mode === "audit") {
    const readiness = evaluateOnePieceSetReleaseReadinessV1(snapshot);
    const summary = { ...base, status: "read_only_audit_complete", counts: snapshot.counts,
      release_control: snapshot.release_control, readiness, database_writes: 0,
      storage_writes: 0 };
    await writeArtifacts(args.outDir, {
      "run_plan.json": base,
      "closure_snapshot.json": snapshot,
      "summary.json": summary,
    }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
    }
    assertSnapshotBinding(snapshot, args);
    if (args.mode === "image-canary" || args.mode === "image-apply") {
    const candidates = imageCandidates(snapshot);
    if (!candidates.length) throw new Error("No missing image candidates remain");
    if (candidates.some((row) => !row.source_image_url)) {
      throw new Error("Image candidates include missing exact source references");
    }
    const selected = args.mode === "image-canary"
      ? candidates.slice(0, Math.min(args.canarySize, candidates.length))
      : candidates;
    await writeArtifacts(args.outDir, {
      "run_plan.json": base,
      "before_snapshot.json": snapshot,
      "selected_image_candidates.json": selected,
    }, repo.commit_sha);
    const storage = storageClient(args);
    const results = await mapLimit(selected, args.concurrency, (row) =>
      uploadOne(storage.storage, storage.publicBaseUrl, row));
    const failures = results.filter((result) => !result.ok);
    const successes = results.filter((result) => result.ok).map((result) => result.value);
    const created = successes.filter((result) => result.created).map((result) => result.pointer);
    if (failures.length) {
      const failedCreated = failures.map((failure) => failure.created_pointer)
        .filter(Boolean);
      let rollback;
      let cleanupError = null;
      try {
        rollback = await removeCreated(
          storage.storage,
          [...created, ...failedCreated],
        );
      } catch (error) {
        cleanupError = error.message;
        rollback = {
          removed: null,
          absent: null,
          cleanup_verified: false,
        };
      }
      await writeArtifacts(args.outDir, {
        "run_plan.json": base,
        "before_snapshot.json": snapshot,
        "selected_image_candidates.json": selected,
        "image_failures.json": failures,
        "summary.json": {
          ...base,
          status: cleanupError
            ? "image_operation_failed_cleanup_unverified"
            : "image_operation_failed_zero_created_object_residue",
          selected: selected.length,
          failures: failures.length,
          successes_before_rollback: successes.length,
          rollback,
          cleanup_error: cleanupError,
          database_writes: 0,
        },
      }, repo.commit_sha);
      if (cleanupError) {
        throw new Error(
          `Image upload failures with unverified cleanup: ${cleanupError}; ` +
          JSON.stringify(failures),
        );
      }
      throw new Error(`Image upload failures: ${JSON.stringify(failures)}`);
    }
    const pointers = successes.map((result) => result.pointer);
    const validation = validateOnePieceSetImagePointersV1(pointers, selected.length);
    if (!validation.valid) {
      await removeCreated(storage.storage, created);
      throw new Error(validation.findings.join(","));
    }
    let mutation;
    if (args.mode === "image-canary") {
      const rollback = await removeCreated(storage.storage, created);
      mutation = { database_writes: 0, created: created.length, ...rollback };
    } else {
      try {
        const updated = await applyPointers(client, args.setCode, pointers);
        mutation = { database_writes: updated, created: created.length,
          reused_verified: successes.length - created.length };
      } catch (error) {
        await removeCreated(storage.storage, created);
        throw error;
      }
    }
    const after = await captureSnapshot(
      client,
      args.setCode,
      official,
      publicBaseUrl,
    );
    const summary = { ...base,
      status: args.mode === "image-canary"
        ? "image_canary_passed_zero_residue"
        : "image_apply_committed_and_verified",
      selected: selected.length,
      candidates_before: candidates.length,
      mutation,
      after_snapshot_fingerprint_sha256: after.snapshot_fingerprint_sha256,
      after_counts: after.counts,
      readiness: evaluateOnePieceSetReleaseReadinessV1(after),
    };
    if (args.mode === "image-canary" &&
        after.snapshot_fingerprint_sha256 !== snapshot.snapshot_fingerprint_sha256) {
      throw new Error("Image canary changed database state");
    }
    if (args.mode === "image-apply" &&
        Number(after.counts.self_hosted_exact_images) !== snapshot.rows.length) {
      throw new Error("Image apply did not close the cohort");
    }
    await writeArtifacts(args.outDir, {
      "run_plan.json": base,
      "before_snapshot.json": snapshot,
      "selected_image_candidates.json": selected,
      "image_pointers.json": pointers,
      "after_snapshot.json": after,
      "summary.json": summary,
    }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
    }
    if (args.mode === "activation-canary" || args.mode === "activate") {
    const activation = await activateSet(
      client,
      snapshot,
      args,
      args.mode === "activation-canary",
    );
    const after = await captureSnapshot(
      client,
      args.setCode,
      official,
      publicBaseUrl,
    );
    if (args.mode === "activation-canary" &&
        after.snapshot_fingerprint_sha256 !== snapshot.snapshot_fingerprint_sha256) {
      throw new Error("Activation canary left durable residue");
    }
    if (args.mode === "activate" &&
        (after.release_control?.release_status !== "signed_in" ||
         Number(after.counts.suppressed_rows) !== 0)) {
      throw new Error("Activation durable readback failed");
    }
    const summary = { ...base,
      status: args.mode === "activation-canary"
        ? "activation_canary_passed_zero_residue"
        : "signed_in_activation_committed_and_verified",
      activation,
      after_snapshot_fingerprint_sha256: after.snapshot_fingerprint_sha256,
      after_counts: after.counts,
      release_control: after.release_control,
    };
    await writeArtifacts(args.outDir, {
      "run_plan.json": base,
      "before_snapshot.json": snapshot,
      "after_snapshot.json": after,
      "summary.json": summary,
    }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
    }
    const visibility = await visibilityCounts(client, snapshot);
    if (snapshot.release_control?.release_status !== "signed_in" ||
        Number(snapshot.counts.suppressed_rows) !== 0 ||
        visibility.anonymous.set_visible !== false ||
        Number(visibility.anonymous.card_count) !== 0 ||
        visibility.authenticated.set_visible !== true ||
        Number(visibility.authenticated.card_count) !== snapshot.rows.length) {
      throw new Error(`Independent release readback failed: ${JSON.stringify({
        release_status: snapshot.release_control?.release_status ?? null,
        suppressed_rows: snapshot.counts.suppressed_rows,
        visibility,
      })}`);
    }
    const summary = { ...base, status: "independent_release_readback_complete",
      counts: snapshot.counts, release_control: snapshot.release_control,
      visibility, database_writes: 0, storage_writes: 0 };
    await writeArtifacts(args.outDir, {
      "run_plan.json": base,
      "closure_snapshot.json": snapshot,
      "summary.json": summary,
    }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
