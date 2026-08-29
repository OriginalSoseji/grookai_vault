import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import { inspectOnePieceImage } from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";

const VERSION = "CROSS_TCG_SET_COVER_BACKFILL_V1_2";
const BUCKET = "external-card-images";
const USER_AGENT = "GrookaiVaultSetCoverBackfill/1.0 catalog-ops@grookai.com";
const PAGE_SIZE = 1000;
const DEFAULT_GAMES = ["one_piece", "mtg"];
const PACKAGE_DOWNLOAD_ATTEMPTS = 3;

function parseArgs(argv) {
  const args = {
    apply: false,
    games: DEFAULT_GAMES,
    replace: false,
    setCodes: null,
    expectedPlanFingerprint: "",
  };
  for (const token of argv) {
    if (token === "--apply") args.apply = true;
    else if (token === "--replace") args.replace = true;
    else if (token.startsWith("--games=")) {
      args.games = token.slice("--games=".length).split(",").map(normalizeGame).filter(Boolean);
    } else if (token.startsWith("--set-codes=")) {
      args.setCodes = [...new Set(token.slice("--set-codes=".length)
        .split(",")
        .map(normalizeCode)
        .filter(Boolean))].sort();
    } else if (token.startsWith("--expected-plan-fingerprint=")) {
      args.expectedPlanFingerprint = token
        .slice("--expected-plan-fingerprint=".length)
        .trim();
    } else {
      throw new Error(`Unsupported argument: ${token}`);
    }
  }
  if (args.games.length === 0 || args.games.some((game) => !DEFAULT_GAMES.includes(game))) {
    throw new Error("--games must contain one_piece and/or mtg");
  }
  if (args.setCodes && args.setCodes.length === 0) {
    throw new Error("--set-codes must contain at least one set code");
  }
  if (args.apply && !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error("--apply requires --expected-plan-fingerprint=<sha256>");
  }
  return args;
}

function normalizeGame(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeCode(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

function fingerprint(value) {
  return sha256(JSON.stringify(stable(value)));
}

function gitValue(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

async function fetchAll(buildQuery) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

function packageScore(product, setCode) {
  const name = normalizeText(product.name);
  const isDeck = setCode.startsWith("st");
  let score = 0;

  if (/display case|case of|set of|bonus pack/.test(name)) score -= 500;
  if (/display/.test(name)) score -= 40;
  if (isDeck) {
    if (/starter deck|ultra deck/.test(name)) score += 220;
    if (!/display|case|bonus|set of/.test(name)) score += 180;
  } else {
    if (/booster box/.test(name)) score += 240;
    if (/booster pack/.test(name)) score += 160;
    if (/double pack/.test(name)) score += 80;
  }
  if (product.image_url) score += 30;
  return score;
}

function choosePackageProduct(products, setCode) {
  const candidates = products
    .filter((product) => product.image_url)
    .map((product) => ({ product, score: packageScore(product, setCode) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.product.product_id - right.product.product_id);
  return candidates[0]?.product ?? null;
}

function packageDownloadUrls(product) {
  const source = new URL(product.image_url);
  if (source.protocol !== "https:" || source.hostname.toLowerCase() !== "tcgplayer-cdn.tcgplayer.com") {
    throw new Error(`Unsupported package image authority for product ${product.product_id}`);
  }
  const high = new URL(source);
  high.pathname = high.pathname.replace(/_200w\.jpg$/i, "_in_1000x1000.jpg");
  return [
    high.toString(),
    `https://product-images.tcgplayer.com/fit-in/1000x1000/${product.product_id}.jpg`,
    source.toString(),
  ].filter((value, index, values) => values.indexOf(value) === index);
}

async function downloadPackageImage(product) {
  const errors = [];
  for (const url of packageDownloadUrls(product)) {
    for (let attempt = 1; attempt <= PACKAGE_DOWNLOAD_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(45_000),
          headers: { accept: "image/*", "user-agent": USER_AGENT },
        });
        const finalHost = new URL(response.url).hostname.toLowerCase();
        if (!response.ok || !["tcgplayer-cdn.tcgplayer.com", "product-images.tcgplayer.com"].includes(finalHost)) {
          throw new Error(`http_or_redirect:${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const image = inspectOnePieceImage(buffer, response.headers.get("content-type"));
        if (!image.valid_image) throw new Error(image.diagnostics.join(","));
        return { buffer, image, sourceUrl: url, finalUrl: response.url };
      } catch (error) {
        errors.push(`${url}:attempt_${attempt}:${error.message}`);
        if (attempt < PACKAGE_DOWNLOAD_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 750));
        }
      }
    }
  }
  throw new Error(`Package image download failed for ${product.product_id}: ${errors.join("|")}`);
}

async function findRepresentativeCard(client, set) {
  const { data, error } = await client
    .from("card_prints")
    .select("id,gv_id,name,number,image_url,image_path,image_source,image_status")
    .eq("set_id", set.id)
    .not("gv_id", "is", null)
    .not("image_path", "is", null)
    .not("image_url", "is", null)
    .order("number_plain", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(1);
  if (error) throw new Error(`[${set.game}:${set.code}] ${error.message}`);
  const card = data?.[0];
  if (!card?.gv_id || !card.image_path || !card.image_url) {
    throw new Error(`[${set.game}:${set.code}] no self-hosted representative card image`);
  }
  const url = new URL(card.image_url);
  if (!url.hostname.toLowerCase().endsWith(".supabase.co") || !url.pathname.includes("/storage/v1/object/")) {
    throw new Error(`[${set.game}:${set.code}] representative image is not self-hosted`);
  }
  const storageMatch = url.pathname.match(
    /^\/storage\/v1\/object\/(public|authenticated|sign)\/([^/]+)\/(.+)$/,
  );
  if (!storageMatch) {
    throw new Error(`[${set.game}:${set.code}] representative storage object cannot be resolved`);
  }
  const [, accessMode, sourceStorageBucket, encodedSourcePath] = storageMatch;
  const sourceStoragePath = encodedSourcePath
    .split("/")
    .map((part) => decodeURIComponent(part))
    .join("/");
  const expectedPrefix = `set-covers/${normalizeGame(set.game)}/${normalizeCode(set.code)}/`;
  const isPublicCoverObject = accessMode === "public" &&
    sourceStorageBucket === BUCKET &&
    sourceStoragePath.startsWith(expectedPrefix);
  return {
    card_print_id: card.id,
    gv_id: card.gv_id,
    card_name: card.name,
    card_number: card.number,
    source_image_url: card.image_url,
    source_image_path: card.image_path,
    source_image_status: card.image_status,
    source_storage_bucket: sourceStorageBucket,
    source_storage_path: sourceStoragePath,
    hero_image_url: isPublicCoverObject ? card.image_url : null,
    requires_public_cover_copy: !isPublicCoverObject,
  };
}

async function downloadRepresentativeImage(client, representative) {
  const { data, error } = await client.storage
    .from(representative.source_storage_bucket)
    .download(representative.source_storage_path);
  if (error || !data) {
    throw new Error(`representative_download:${error?.message ?? "missing"}`);
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const image = inspectOnePieceImage(buffer, data.type);
  if (!image.valid_image) {
    throw new Error(`representative_image_invalid:${image.diagnostics.join(",")}`);
  }
  return { buffer, image };
}

async function loadOnePiecePackages(client, sets) {
  const { data: categoryRows, error: categoryError } = await client
    .from("tcgcsv_source_categories")
    .select("category_id")
    .eq("name", "One Piece Card Game");
  if (categoryError || categoryRows?.length !== 1) {
    throw new Error(`One Piece TCGCSV category unavailable: ${categoryError?.message ?? categoryRows?.length}`);
  }
  const categoryId = categoryRows[0].category_id;
  const groups = await fetchAll(() => client
    .from("tcgcsv_source_groups")
    .select("group_id,name,abbreviation")
    .eq("category_id", categoryId));
  const groupsByCode = new Map();
  for (const group of groups) {
    const key = normalizeCode(group.abbreviation);
    if (key && !groupsByCode.has(key)) groupsByCode.set(key, group);
  }
  const matchedGroups = sets
    .map((set) => groupsByCode.get(normalizeCode(set.code)))
    .filter(Boolean);
  const groupIds = [...new Set(matchedGroups.map((group) => group.group_id))];
  if (groupIds.length === 0) return new Map();

  const products = [];
  for (let start = 0; start < groupIds.length; start += 100) {
    const chunk = groupIds.slice(start, start + 100);
    products.push(...await fetchAll(() => client
      .from("tcgcsv_source_products")
      .select("product_id,group_id,name,image_url,source_url")
      .in("group_id", chunk)
      .not("image_url", "is", null)
      .or("name.ilike.%Booster Box%,name.ilike.%Booster Pack%,name.ilike.%Starter Deck%,name.ilike.%Ultra Deck%,name.ilike.%Display%,name.ilike.%Double Pack%")));
  }
  const productsByGroup = new Map();
  for (const product of products) {
    const values = productsByGroup.get(product.group_id) ?? [];
    values.push(product);
    productsByGroup.set(product.group_id, values);
  }
  const result = new Map();
  for (const set of sets) {
    if (["p", "don"].includes(normalizeCode(set.code))) continue;
    const group = groupsByCode.get(normalizeCode(set.code));
    if (!group) continue;
    const product = choosePackageProduct(productsByGroup.get(group.group_id) ?? [], normalizeCode(set.code));
    if (product) result.set(set.id, { group, product });
  }
  return result;
}

async function objectExists(storage, objectPath) {
  const split = objectPath.lastIndexOf("/");
  const folder = objectPath.slice(0, split);
  const name = objectPath.slice(split + 1);
  const { data, error } = await storage.from(BUCKET).list(folder, { search: name, limit: 10 });
  if (error) throw new Error(`storage_list:${error.message}`);
  return (data ?? []).some((row) => row.name === name);
}

async function verifyObject(storage, objectPath, expectedHash) {
  const { data, error } = await storage.from(BUCKET).download(objectPath);
  if (error || !data) throw new Error(`storage_download:${error?.message ?? "missing"}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  if (sha256(buffer) !== expectedHash) throw new Error(`storage_hash_mismatch:${objectPath}`);
}

function publicObjectUrl(supabaseUrl, objectPath) {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

async function rollbackExecution(client, updatedRows, createdObjects) {
  const unsafeObjectPaths = new Set();
  const failures = [];
  for (const entry of [...updatedRows].reverse()) {
    const row = entry.row;
    let query = client
      .from("sets")
      .update({
        hero_image_url: row.previous_hero_image_url,
        hero_image_source: row.previous_hero_image_source,
      })
      .eq("id", row.set_id)
      .eq("game", row.game)
      .eq("code", row.set_code)
      .eq("hero_image_url", entry.writtenUrl)
      .eq("hero_image_source", "manual");
    const { data, error } = await query.select("id");
    if (error || data?.length !== 1) {
      if (entry.objectPath) unsafeObjectPaths.add(entry.objectPath);
      failures.push(
        `pointer:${row.game}:${row.set_code}:${error?.message ?? `compare_and_swap_miss:${data?.length ?? 0}`}`,
      );
    }
  }
  const removable = createdObjects.filter((objectPath) => !unsafeObjectPaths.has(objectPath));
  if (removable.length > 0) {
    const { error } = await client.storage.from(BUCKET).remove(removable);
    if (error) failures.push(`storage:${error.message}`);
    for (const objectPath of removable) {
      if (await objectExists(client.storage, objectPath)) {
        failures.push(`storage_object_still_present:${objectPath}`);
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`rollback_incomplete:${failures.join("|")}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  const client = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "user-agent": USER_AGENT } },
  });

  const sets = [];
  for (const game of args.games) {
    sets.push(...await fetchAll(() => client
      .from("sets")
      .select("id,game,code,name,hero_image_url,hero_image_source")
      .eq("game", game)
      .order("code", { ascending: true })));
  }
  const requestedSetCodes = args.setCodes ? new Set(args.setCodes) : null;
  const targetedSets = requestedSetCodes
    ? sets.filter((set) => requestedSetCodes.has(normalizeCode(set.code)))
    : sets;
  if (requestedSetCodes) {
    const found = new Set(targetedSets.map((set) => normalizeCode(set.code)));
    const missing = args.setCodes.filter((code) => !found.has(code));
    if (missing.length > 0) throw new Error(`target_set_codes_not_found:${missing.join(",")}`);
  }
  const eligibleSets = targetedSets.filter((set) => args.replace || !set.hero_image_url);
  const onePiecePackages = args.games.includes("one_piece")
    ? await loadOnePiecePackages(client, eligibleSets.filter((set) => set.game === "one_piece"))
    : new Map();
  const representatives = await mapLimit(eligibleSets, 12, (set) => findRepresentativeCard(client, set));
  const planRows = eligibleSets.map((set, index) => {
    const packageMatch = onePiecePackages.get(set.id);
    const representative = representatives[index];
    return {
      set_id: set.id,
      game: set.game,
      set_code: set.code,
      set_name: set.name,
      previous_hero_image_url: set.hero_image_url,
      previous_hero_image_source: set.hero_image_source,
      planned_cover_kind: packageMatch ? "exact_package" : "representative_card",
      package_group_id: packageMatch?.group.group_id ?? null,
      package_group_name: packageMatch?.group.name ?? null,
      package_product_id: packageMatch?.product.product_id ?? null,
      package_product_name: packageMatch?.product.name ?? null,
      package_source_image_url: packageMatch?.product.image_url ?? null,
      package_source_url: packageMatch?.product.source_url ?? null,
      representative,
    };
  });
  const producerCommitSha = gitValue("rev-parse", "HEAD");
  const producerBranch = gitValue("branch", "--show-current");
  const planFingerprint = fingerprint({
    version: VERSION,
    producer_commit_sha: producerCommitSha,
    games: args.games,
    requested_set_codes: args.setCodes,
    rows: planRows,
  });
  if (args.apply && planFingerprint !== args.expectedPlanFingerprint) {
    throw new Error(`plan_fingerprint_mismatch:${planFingerprint}:${args.expectedPlanFingerprint}`);
  }
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const auditDirectory = path.resolve("docs/audits/cross_tcg_set_cover_backfill_v1", runStamp);
  await fs.mkdir(auditDirectory, { recursive: true });
  await fs.writeFile(path.join(auditDirectory, "plan.json"), JSON.stringify({
    version: VERSION,
    mode: args.apply ? "apply" : "dry_run",
    producer_commit_sha: producerCommitSha,
    producer_branch: producerBranch,
    games: args.games,
    requested_set_codes: args.setCodes,
    selected_set_count: planRows.length,
    exact_package_count: planRows.filter((row) => row.planned_cover_kind === "exact_package").length,
    representative_card_count: planRows.filter((row) => row.planned_cover_kind === "representative_card").length,
    plan_fingerprint_sha256: planFingerprint,
    rows: planRows,
  }, null, 2));

  if (!args.apply) {
    console.log(JSON.stringify({ auditDirectory, planFingerprint, rows: planRows.length }, null, 2));
    return;
  }

  const createdObjects = [];
  const updatedRows = [];
  const appliedRows = [];
  try {
    for (const row of planRows) {
      let heroImageUrl = row.representative.hero_image_url;
      let storedImage = null;
      if (row.planned_cover_kind === "exact_package") {
        const product = onePiecePackages.get(row.set_id).product;
        const downloaded = await downloadPackageImage(product);
        const extension = downloaded.image.format === "png" ? "png" : "jpg";
        const objectPath = `set-covers/${row.game}/${normalizeCode(row.set_code)}/tcgplayer/${product.product_id}/${downloaded.image.sha256.slice(0, 24)}.${extension}`;
        const existed = await objectExists(client.storage, objectPath);
        if (!existed) {
          const { error } = await client.storage.from(BUCKET).upload(objectPath, downloaded.buffer, {
            upsert: false,
            contentType: downloaded.image.content_type,
            cacheControl: "31536000",
          });
          if (error) throw new Error(`storage_upload:${error.message}`);
          createdObjects.push(objectPath);
        }
        await verifyObject(client.storage, objectPath, downloaded.image.sha256);
        heroImageUrl = publicObjectUrl(supabaseUrl, objectPath);
        storedImage = {
          cover_source_kind: "exact_package",
          object_path: objectPath,
          sha256: downloaded.image.sha256,
          size_bytes: downloaded.image.size_bytes,
          width: downloaded.image.width,
          height: downloaded.image.height,
          source_download_url: downloaded.sourceUrl,
          source_final_url: downloaded.finalUrl,
          created_by_execution: !existed,
        };
      } else if (row.representative.requires_public_cover_copy) {
        const downloaded = await downloadRepresentativeImage(client, row.representative);
        const extension = downloaded.image.format === "png" ? "png" : "jpg";
        const objectPath = `set-covers/${row.game}/${normalizeCode(row.set_code)}/representative/${normalizeCode(row.representative.gv_id)}/${downloaded.image.sha256.slice(0, 24)}.${extension}`;
        const existed = await objectExists(client.storage, objectPath);
        if (!existed) {
          const { error } = await client.storage.from(BUCKET).upload(objectPath, downloaded.buffer, {
            upsert: false,
            contentType: downloaded.image.content_type,
            cacheControl: "31536000",
          });
          if (error) throw new Error(`storage_upload:${error.message}`);
          createdObjects.push(objectPath);
        }
        await verifyObject(client.storage, objectPath, downloaded.image.sha256);
        heroImageUrl = publicObjectUrl(supabaseUrl, objectPath);
        storedImage = {
          cover_source_kind: "representative_card",
          object_path: objectPath,
          sha256: downloaded.image.sha256,
          size_bytes: downloaded.image.size_bytes,
          width: downloaded.image.width,
          height: downloaded.image.height,
          source_storage_bucket: row.representative.source_storage_bucket,
          source_storage_path: row.representative.source_storage_path,
          created_by_execution: !existed,
        };
      }

      if (!heroImageUrl) {
        throw new Error(`set_cover_url_unresolved:${row.game}:${row.set_code}`);
      }

      let query = client
        .from("sets")
        .update({ hero_image_url: heroImageUrl, hero_image_source: "manual" })
        .eq("id", row.set_id)
        .eq("game", row.game)
        .eq("code", row.set_code);
      query = row.previous_hero_image_url
        ? query.eq("hero_image_url", row.previous_hero_image_url)
        : query.is("hero_image_url", null);
      query = row.previous_hero_image_source
        ? query.eq("hero_image_source", row.previous_hero_image_source)
        : query.is("hero_image_source", null);
      const { data, error } = await query
        .select("id,game,code,hero_image_url,hero_image_source");
      if (error || data?.length !== 1) {
        throw new Error(`set_update_failed:${row.game}:${row.set_code}:${error?.message ?? data?.length}`);
      }
      updatedRows.push({ row, writtenUrl: heroImageUrl, objectPath: storedImage?.object_path ?? null });
      appliedRows.push({ ...row, hero_image_url: heroImageUrl, hero_image_source: "manual", stored_image: storedImage });
    }
  } catch (error) {
    await rollbackExecution(client, updatedRows, createdObjects);
    throw error;
  }

  const readback = [];
  for (let start = 0; start < planRows.length; start += 100) {
    const ids = planRows.slice(start, start + 100).map((row) => row.set_id);
    const { data, error } = await client.from("sets")
      .select("id,game,code,hero_image_url,hero_image_source")
      .in("id", ids);
    if (error) throw new Error(`readback_failed:${error.message}`);
    readback.push(...(data ?? []));
  }
  const expectedById = new Map(appliedRows.map((row) => [row.set_id, row]));
  const mismatches = readback.filter((row) => {
    const expected = expectedById.get(row.id);
    return !expected || row.hero_image_url !== expected.hero_image_url || row.hero_image_source !== "manual";
  });
  if (readback.length !== appliedRows.length || mismatches.length > 0) {
    await rollbackExecution(client, updatedRows, createdObjects);
    throw new Error(`readback_reconciliation_failed:${readback.length}:${appliedRows.length}:${mismatches.length}`);
  }

  const result = {
    version: VERSION,
    mode: "apply",
    plan_fingerprint_sha256: planFingerprint,
    applied_set_count: appliedRows.length,
    exact_package_count: appliedRows.filter((row) => row.planned_cover_kind === "exact_package").length,
    representative_card_count: appliedRows.filter((row) => row.planned_cover_kind === "representative_card").length,
    created_storage_object_count: createdObjects.length,
    readback_count: readback.length,
    reconciliation_mismatch_count: 0,
    rows: appliedRows,
  };
  await fs.writeFile(path.join(auditDirectory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ auditDirectory, ...result, rows: undefined }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
