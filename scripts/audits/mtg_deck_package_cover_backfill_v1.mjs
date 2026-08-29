import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import {
  chooseMtgSourceGroup,
  isMtgDeckRelease,
  MTG_DECK_PACKAGE_COVER_POLICY_VERSION,
  normalizeMtgSetCode,
  rankMtgPackageProducts,
} from "../../backend/catalog/mtg_deck_package_cover_policy_v1.mjs";
import { inspectOnePieceImage } from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";

const VERSION = "MTG_DECK_PACKAGE_COVER_BACKFILL_V1_1";
const BUCKET = "external-card-images";
const PAGE_SIZE = 1000;
const USER_AGENT = "GrookaiVaultMtgDeckCover/1.0 catalog-ops@grookai.com";
const DOWNLOAD_ATTEMPTS = 3;

function parseArgs(argv) {
  const result = {
    apply: false,
    expectedPlanFingerprint: "",
    maxSets: null,
    setCodes: null,
  };
  for (const token of argv) {
    if (token === "--apply") result.apply = true;
    else if (token.startsWith("--expected-plan-fingerprint=")) {
      result.expectedPlanFingerprint = token.slice("--expected-plan-fingerprint=".length).trim();
    } else if (token.startsWith("--max-sets=")) {
      result.maxSets = Number.parseInt(token.slice("--max-sets=".length), 10);
    } else if (token.startsWith("--set-codes=")) {
      result.setCodes = [...new Set(token.slice("--set-codes=".length)
        .split(",")
        .map(normalizeMtgSetCode)
        .filter(Boolean))].sort();
    } else {
      throw new Error(`Unsupported argument: ${token}`);
    }
  }
  if (result.apply && !/^[0-9a-f]{64}$/.test(result.expectedPlanFingerprint)) {
    throw new Error("--apply requires --expected-plan-fingerprint=<sha256>");
  }
  if (result.maxSets !== null && (!Number.isInteger(result.maxSets) || result.maxSets <= 0)) {
    throw new Error("--max-sets must be a positive integer");
  }
  if (result.setCodes && result.setCodes.length === 0) {
    throw new Error("--set-codes must contain at least one set code");
  }
  return result;
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

function packageDownloadUrls(product) {
  const source = new URL(product.image_url);
  if (source.protocol !== "https:" || source.hostname.toLowerCase() !== "tcgplayer-cdn.tcgplayer.com") {
    throw new Error(`Unsupported package image authority for product ${product.product_id}`);
  }
  const high = new URL(source);
  high.pathname = high.pathname.replace(/_200w\.jpg$/i, "_in_1000x1000.jpg");
  return [
    high.toString(),
    `https://product-images.tcgplayer.com/${product.product_id}.jpg`,
    `https://product-images.tcgplayer.com/fit-in/1000x1000/${product.product_id}.jpg`,
    source.toString(),
  ].filter((value, index, values) => values.indexOf(value) === index);
}

async function downloadPackageImage(product) {
  const failures = [];
  for (const url of packageDownloadUrls(product)) {
    for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(45_000),
          headers: { accept: "image/*", "user-agent": USER_AGENT },
        });
        const host = new URL(response.url).hostname.toLowerCase();
        if (!response.ok || !["tcgplayer-cdn.tcgplayer.com", "product-images.tcgplayer.com"].includes(host)) {
          throw new Error(`http_or_redirect:${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const image = inspectOnePieceImage(buffer, response.headers.get("content-type"));
        if (!image.valid_image) throw new Error(image.diagnostics.join(","));
        return { buffer, image, source_url: url, final_url: response.url };
      } catch (error) {
        failures.push(
          `${url}:attempt_${attempt}:${error.message}:${error.cause?.code ?? "no_code"}`,
        );
        if (attempt < DOWNLOAD_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 750));
        }
      }
    }
  }
  throw new Error(`package_image_download_failed:${product.product_id}:${failures.join("|")}`);
}

async function objectExists(storage, objectPath) {
  const split = objectPath.lastIndexOf("/");
  const folder = objectPath.slice(0, split);
  const name = objectPath.slice(split + 1);
  const { data, error } = await storage.from(BUCKET).list(folder, { search: name, limit: 10 });
  if (error) throw new Error(`storage_list:${error.message}`);
  return (data ?? []).some((row) => row.name === name);
}

async function verifyStoredObject(storage, objectPath, expectedHash) {
  const { data, error } = await storage.from(BUCKET).download(objectPath);
  if (error || !data) throw new Error(`storage_download:${error?.message ?? "missing"}`);
  const hash = sha256(Buffer.from(await data.arrayBuffer()));
  if (hash !== expectedHash) throw new Error(`storage_hash_mismatch:${objectPath}`);
}

function publicObjectUrl(objectPath) {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

async function rollbackExecution(client, updatedRows, createdObjects) {
  const unsafeObjectPaths = new Set();
  const failures = [];

  for (const entry of [...updatedRows].reverse()) {
    const set = entry.candidate.set;
    const writtenUrl = publicObjectUrl(entry.objectPath);
    let query = client
      .from("sets")
      .update({
        hero_image_url: set.hero_image_url,
        hero_image_source: set.hero_image_source,
      })
      .eq("id", set.id)
      .eq("game", "mtg")
      .eq("code", set.code)
      .eq("hero_image_url", writtenUrl)
      .eq("hero_image_source", "manual");
    const { data, error } = await query.select("id");
    if (error) {
      unsafeObjectPaths.add(entry.objectPath);
      failures.push(`pointer:${set.code}:${error.message}`);
      continue;
    }
    if (data?.length === 1) continue;

    const { data: current, error: currentError } = await client
      .from("sets")
      .select("hero_image_url")
      .eq("id", set.id)
      .maybeSingle();
    if (currentError || current?.hero_image_url === writtenUrl) {
      unsafeObjectPaths.add(entry.objectPath);
      failures.push(
        `pointer:${set.code}:${currentError?.message ?? `compare_and_swap_miss:${data?.length ?? 0}`}`,
      );
    }
  }

  const removableObjects = createdObjects.filter((objectPath) => !unsafeObjectPaths.has(objectPath));
  if (removableObjects.length > 0) {
    const { error } = await client.storage.from(BUCKET).remove(removableObjects);
    if (error) failures.push(`storage:${error.message}`);
    for (const objectPath of removableObjects) {
      if (await objectExists(client.storage, objectPath)) {
        failures.push(`storage_object_still_present:${objectPath}`);
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`rollback_incomplete:${failures.join("|")}`);
  }
}

async function loadCandidates(client, requestedSetCodes) {
  const sets = await fetchAll(() =>
    client
      .from("sets")
      .select("id,game,code,name,source,set_role,hero_image_url,hero_image_source")
      .eq("game", "mtg")
      .order("code", { ascending: true }),
  );
  const allDeckSets = sets.filter(isMtgDeckRelease);
  const requested = requestedSetCodes ? new Set(requestedSetCodes) : null;
  const deckSets = requested
    ? allDeckSets.filter((set) => requested.has(normalizeMtgSetCode(set.code)))
    : allDeckSets;
  if (requested) {
    const found = new Set(deckSets.map((set) => normalizeMtgSetCode(set.code)));
    const missing = requestedSetCodes.filter((code) => !found.has(code));
    if (missing.length > 0) throw new Error(`target_set_codes_not_found:${missing.join(",")}`);
  }

  const { data: categoryRows, error: categoryError } = await client
    .from("tcgcsv_source_categories")
    .select("category_id")
    .eq("name", "Magic");
  if (categoryError || categoryRows?.length !== 1) {
    throw new Error(`Magic TCGCSV category unavailable: ${categoryError?.message ?? categoryRows?.length}`);
  }
  const categoryId = categoryRows[0].category_id;
  const groups = await fetchAll(() =>
    client
      .from("tcgcsv_source_groups")
      .select("group_id,name,abbreviation")
      .eq("category_id", categoryId)
      .order("group_id", { ascending: true }),
  );

  const groupMatches = new Map();
  for (const set of deckSets) {
    const match = chooseMtgSourceGroup(set, groups);
    if (match) groupMatches.set(set.id, match);
  }
  const groupIds = [...new Set([...groupMatches.values()].map((entry) => entry.group.group_id))];
  const products = [];
  for (let offset = 0; offset < groupIds.length; offset += 100) {
    const chunk = groupIds.slice(offset, offset + 100);
    products.push(
      ...(await fetchAll(() =>
        client
          .from("tcgcsv_source_products")
          .select("product_id,group_id,name,image_url,source_url")
          .in("group_id", chunk)
          .not("image_url", "is", null)
          .order("product_id", { ascending: true }),
      )),
    );
  }
  const productsByGroup = new Map();
  for (const product of products) {
    const rows = productsByGroup.get(product.group_id) ?? [];
    rows.push(product);
    productsByGroup.set(product.group_id, rows);
  }

  const candidates = [];
  const unresolved = [];
  for (const set of deckSets) {
    const alreadyExact =
      set.hero_image_url?.includes(`/set-covers/mtg/${normalizeMtgSetCode(set.code)}/tcgplayer/`) ?? false;
    if (alreadyExact) continue;
    const groupMatch = groupMatches.get(set.id);
    if (!groupMatch) {
      unresolved.push({
        set_id: set.id,
        set_code: set.code,
        set_name: set.name,
        reason: "source_group_unresolved",
      });
      continue;
    }
    const packageMatches = rankMtgPackageProducts(
      productsByGroup.get(groupMatch.group.group_id) ?? [],
      groupMatch.group,
    );
    if (packageMatches.length === 0) {
      unresolved.push({
        set_id: set.id,
        set_code: set.code,
        set_name: set.name,
        group_id: groupMatch.group.group_id,
        group_name: groupMatch.group.name,
        reason: "package_product_unresolved",
      });
      continue;
    }
    candidates.push({ set, groupMatch, packageMatches });
  }
  return {
    setCount: sets.length,
    deckSetCount: allDeckSets.length,
    targetedSetCount: deckSets.length,
    groupMatchCount: groupMatches.size,
    candidates,
    unresolved,
  };
}

async function resolveAvailablePackage(candidate) {
  const unavailable = [];
  for (const packageMatch of candidate.packageMatches) {
    try {
      const download = await downloadPackageImage(packageMatch.product);
      return {
        set: candidate.set,
        groupMatch: candidate.groupMatch,
        packageMatch,
        packageProductRank: unavailable.length + 1,
        higherRankedUnavailableProductIds: unavailable.map((entry) => entry.product_id),
        download,
      };
    } catch (error) {
      unavailable.push({
        product_id: packageMatch.product.product_id,
        reason: error.message,
      });
    }
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  }
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "user-agent": USER_AGENT } },
  });

  const loaded = await loadCandidates(client, args.setCodes);
  const producerCommitSha = gitValue("rev-parse", "HEAD");
  const producerBranch = gitValue("branch", "--show-current");
  const candidatePool = args.maxSets === null ? loaded.candidates : loaded.candidates.slice(0, args.maxSets);
  const rows = candidatePool.map(({
    set,
    groupMatch,
    packageMatches,
  }) => {
    const packageMatch = packageMatches[0];
    return ({
    set_id: set.id,
    game: set.game,
    set_code: set.code,
    set_name: set.name,
    set_type: set.source?.scryfall?.set_type ?? set.set_role ?? null,
    previous_hero_image_url: set.hero_image_url,
    previous_hero_image_source: set.hero_image_source,
    group_id: groupMatch.group.group_id,
    group_name: groupMatch.group.name,
    group_abbreviation: groupMatch.group.abbreviation,
    group_match_score: groupMatch.score,
    group_match_reason: groupMatch.match_reason,
    package_product_id: packageMatch.product.product_id,
    package_product_name: packageMatch.product.name,
    package_product_score: packageMatch.score,
    package_product_rank: 1,
    higher_ranked_unavailable_product_ids: [],
    package_source_image_url: packageMatch.product.image_url,
    package_source_url: packageMatch.product.source_url,
    authorized_package_candidates: packageMatches.map((entry, index) => ({
      rank: index + 1,
      product_id: entry.product.product_id,
      product_name: entry.product.name,
      score: entry.score,
      image_url: entry.product.image_url,
      source_url: entry.product.source_url,
    })),
  });
  });
  const planFingerprint = fingerprint({
    version: VERSION,
    policy_version: MTG_DECK_PACKAGE_COVER_POLICY_VERSION,
    producer_commit_sha: producerCommitSha,
    requested_set_codes: args.setCodes,
    unresolved: loaded.unresolved,
    rows,
  });
  if (args.apply && planFingerprint !== args.expectedPlanFingerprint) {
    throw new Error(`plan_fingerprint_mismatch:${planFingerprint}:${args.expectedPlanFingerprint}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const auditDirectory = path.resolve("docs/audits/mtg_deck_package_cover_backfill_v1", stamp);
  await fs.mkdir(auditDirectory, { recursive: true });
  const plan = {
    version: VERSION,
    policy_version: MTG_DECK_PACKAGE_COVER_POLICY_VERSION,
    producer_commit_sha: producerCommitSha,
    producer_branch: producerBranch,
    mode: args.apply ? "apply" : "dry_run",
    catalog_set_count: loaded.setCount,
    deck_set_count: loaded.deckSetCount,
    targeted_set_count: loaded.targetedSetCount,
    source_group_match_count: loaded.groupMatchCount,
    exact_package_upgrade_count: rows.length,
    unresolved_count: loaded.unresolved.length,
    unresolved: loaded.unresolved,
    max_sets: args.maxSets,
    requested_set_codes: args.setCodes,
    plan_fingerprint_sha256: planFingerprint,
    boundaries: {
      storage_bucket: BUCKET,
      set_pointer_columns: ["hero_image_url", "hero_image_source"],
      canonical_card_writes: false,
      pricing_writes: false,
      vault_writes: false,
      deletes: false,
    },
    rows,
  };
  await fs.writeFile(path.join(auditDirectory, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  if (!args.apply) {
    console.log(JSON.stringify({ auditDirectory, ...plan, rows: undefined }, null, 2));
    return;
  }

  if (loaded.unresolved.length > 0) {
    throw new Error(`target_set_resolution_incomplete:${loaded.unresolved.map((row) => row.set_code).join(",")}`);
  }

  const resolved = await mapLimit(candidatePool, 4, resolveAvailablePackage);
  const unavailableSetCodes = candidatePool
    .filter((candidate, index) => !resolved[index])
    .map((candidate) => candidate.set.code);
  if (unavailableSetCodes.length > 0) {
    throw new Error(`authorized_package_images_unavailable:${unavailableSetCodes.join(",")}`);
  }
  const selected = resolved;

  const prepared = selected.map((candidate) => {
    const download = candidate.download;
    const extension = download.image.format === "png" ? "png" : "jpg";
    const objectPath = `set-covers/mtg/${normalizeMtgSetCode(candidate.set.code)}/tcgplayer/${candidate.packageMatch.product.product_id}/${download.image.sha256.slice(0, 24)}.${extension}`;
    return { candidate, download, objectPath };
  });

  const createdObjects = [];
  const updatedRows = [];
  const appliedRows = [];
  try {
    for (const entry of prepared) {
      const existed = await objectExists(client.storage, entry.objectPath);
      if (!existed) {
        const { error } = await client.storage.from(BUCKET).upload(entry.objectPath, entry.download.buffer, {
          upsert: false,
          contentType: entry.download.image.content_type,
          cacheControl: "31536000",
        });
        if (error) throw new Error(`storage_upload:${error.message}`);
        createdObjects.push(entry.objectPath);
      }
      await verifyStoredObject(client.storage, entry.objectPath, entry.download.image.sha256);
    }

    for (const entry of prepared) {
      const set = entry.candidate.set;
      const heroImageUrl = publicObjectUrl(entry.objectPath);
      let query = client
        .from("sets")
        .update({ hero_image_url: heroImageUrl, hero_image_source: "manual" })
        .eq("id", set.id)
        .eq("game", "mtg")
        .eq("code", set.code);
      query = set.hero_image_url
        ? query.eq("hero_image_url", set.hero_image_url)
        : query.is("hero_image_url", null);
      const { data, error } = await query.select("id,game,code,hero_image_url,hero_image_source");
      if (error || data?.length !== 1) {
        throw new Error(`set_pointer_update_failed:${set.code}:${error?.message ?? data?.length}`);
      }
      updatedRows.push(entry);
      appliedRows.push({
        ...rows.find((row) => row.set_id === set.id),
        package_product_id: entry.candidate.packageMatch.product.product_id,
        package_product_name: entry.candidate.packageMatch.product.name,
        package_product_score: entry.candidate.packageMatch.score,
        package_product_rank: entry.candidate.packageProductRank,
        higher_ranked_unavailable_product_ids:
          entry.candidate.higherRankedUnavailableProductIds,
        hero_image_url: heroImageUrl,
        hero_image_source: "manual",
        stored_image: {
          object_path: entry.objectPath,
          sha256: entry.download.image.sha256,
          content_type: entry.download.image.content_type,
          size_bytes: entry.download.image.size_bytes,
          width: entry.download.image.width,
          height: entry.download.image.height,
          source_download_url: entry.download.source_url,
          source_final_url: entry.download.final_url,
          created_by_execution: createdObjects.includes(entry.objectPath),
        },
      });
    }

    const ids = appliedRows.map((row) => row.set_id);
    const readback = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const { data, error } = await client
        .from("sets")
        .select("id,game,code,hero_image_url,hero_image_source")
        .in("id", ids.slice(offset, offset + 100));
      if (error) throw new Error(`set_pointer_readback_failed:${error.message}`);
      readback.push(...(data ?? []));
    }
    const expected = new Map(appliedRows.map((row) => [row.set_id, row]));
    const mismatches = readback.filter((row) => {
      const target = expected.get(row.id);
      return !target || row.hero_image_url !== target.hero_image_url || row.hero_image_source !== "manual";
    });
    if (readback.length !== appliedRows.length || mismatches.length > 0) {
      throw new Error(`set_pointer_readback_mismatch:${readback.length}:${appliedRows.length}:${mismatches.length}`);
    }

    const result = {
      version: VERSION,
      policy_version: MTG_DECK_PACKAGE_COVER_POLICY_VERSION,
      mode: "apply",
      plan_fingerprint_sha256: planFingerprint,
      applied_set_count: appliedRows.length,
      created_storage_object_count: createdObjects.length,
      readback_count: readback.length,
      reconciliation_mismatch_count: 0,
      rows: appliedRows,
    };
    await fs.writeFile(path.join(auditDirectory, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ auditDirectory, ...result, rows: undefined }, null, 2));
  } catch (error) {
    try {
      await rollbackExecution(client, updatedRows, createdObjects);
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "apply_failed_and_rollback_incomplete");
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
