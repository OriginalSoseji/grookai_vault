import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import {
  buildJapaneseOfficialIncrementalSetPlanV1,
  JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION,
  isCompatibleJapanesePrintedSetCodeV1,
  validateJapaneseOfficialIncrementalSetPlanV1,
} from "../../backend/catalog/japanese_official_incremental_promotion_v1.mjs";
import {
  collisionPreflight,
  computeIdentityHashes,
  insertRows,
  readback,
} from "./catalog_incremental_promotion_v1.mjs";
import {
  sha256,
} from "../../backend/catalog/universal_catalog_discovery_v1.mjs";

const { Client } = pg;

function clean(value) {
  return String(value ?? "").trim();
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const options = {
    mode: "plan",
    asOf: new Date().toISOString().slice(0, 10),
    databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null,
    discoveryDir: null,
    sourceSetCode: null,
    databaseSetCode: null,
    productId: null,
    expectedHeadSha: null,
    outDir: path.join(
      "docs", "audits", "japanese_official_incremental_promotion_v1", stamp,
    ),
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) options.mode = token.slice(7);
    else if (token.startsWith("--as-of=")) options.asOf = token.slice(8);
    else if (token.startsWith("--db-url=")) options.databaseUrl = token.slice(9);
    else if (token.startsWith("--discovery-dir=")) {
      options.discoveryDir = path.resolve(token.slice(16));
    } else if (token.startsWith("--source-set-code=")) {
      options.sourceSetCode = token.slice(18).toUpperCase();
    } else if (token.startsWith("--database-set-code=")) {
      options.databaseSetCode = token.slice(20);
    } else if (token.startsWith("--product-id=")) options.productId = token.slice(13);
    else if (token.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = token.slice(20);
    } else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!new Set(["plan", "dry-run", "apply"]).has(options.mode)) {
    throw new Error("--mode must be plan, dry-run, or apply");
  }
  if (!options.databaseUrl || !options.discoveryDir || !options.sourceSetCode ||
      !options.databaseSetCode || !options.productId) {
    throw new Error(
      "--discovery-dir, --source-set-code, --database-set-code, --product-id, and DB URL are required",
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.asOf)) throw new Error("Invalid --as-of");
  if (options.mode === "apply" && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha ?? "")) {
    throw new Error("Apply requires --expected-head-sha");
  }
  return options;
}

function clientOptions(connectionString, applicationName) {
  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: applicationName,
    connectionTimeoutMillis: 20_000,
    statement_timeout: 300_000,
    query_timeout: 300_000,
  };
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function loadFrozenDiscovery(options) {
  const files = {
    source_sets: path.join(options.discoveryDir, "source_sets.json"),
    recent_japanese_card_gaps: path.join(
      options.discoveryDir,
      "recent_japanese_card_gaps.json",
    ),
    artifact_hashes: path.join(options.discoveryDir, "artifact_hashes.json"),
  };
  const [sourceBytes, recentBytes, hashesBytes] = await Promise.all([
    fs.readFile(files.source_sets),
    fs.readFile(files.recent_japanese_card_gaps),
    fs.readFile(files.artifact_hashes),
  ]);
  const hashes = JSON.parse(hashesBytes);
  for (const [name, bytes] of [
    ["source_sets.json", sourceBytes],
    ["recent_japanese_card_gaps.json", recentBytes],
  ]) {
    if (hashes[name] !== sha256(bytes)) {
      throw new Error(`Frozen discovery hash mismatch: ${name}`);
    }
  }
  const sourceSets = JSON.parse(sourceBytes);
  const recent = JSON.parse(recentBytes);
  const candidates = sourceSets.filter((row) =>
    row.game_code === "pokemon" &&
    row.source_id === "pokemon_card_official_jp_products" &&
    clean(row.code).toUpperCase() === options.sourceSetCode &&
    clean(row.source_set_id) === clean(options.productId));
  if (candidates.length !== 1) {
    throw new Error("Frozen discovery lacks one exact Japanese source set");
  }
  const officialCards = (recent.cards ?? []).filter((card) =>
    clean(card.source_set_code).toUpperCase() === options.sourceSetCode &&
    card.status === "canonical_card_missing");
  return {
    sourceSet: candidates[0],
    officialCards,
    hashes: {
      source_sets_sha256: sha256(sourceBytes),
      recent_japanese_card_gaps_sha256: sha256(recentBytes),
      artifact_hashes_sha256: sha256(hashesBytes),
    },
  };
}

async function loadDatabase(client, options) {
  const setResult = await client.query(`
    select id::text, code::text, name::text, release_date::text
    from public.sets
    where game = 'pokemon' and lower(code) = lower($1)
  `, [options.databaseSetCode]);
  if (setResult.rows.length !== 1) {
    throw new Error("Target Japanese set is not uniquely canonical");
  }
  const set = setResult.rows[0];
  const cards = await client.query(`
    select cp.id::text, cp.gv_id::text, cp.name::text, cp.number::text,
      cp.number_plain::text, cp.printed_set_abbrev::text
    from public.card_prints cp
    join public.card_print_identity identity
      on identity.card_print_id = cp.id
     and identity.is_active
     and identity.identity_domain = 'pokemon_jpn'
    where cp.set_id = $1::uuid
    order by cp.number_plain, cp.id
  `, [set.id]);
  const printedCodes = new Set(cards.rows.map((row) =>
    clean(row.printed_set_abbrev).toUpperCase()).filter(Boolean));
  if (printedCodes.size > 1 || [...printedCodes].some((printedSetCode) =>
    !isCompatibleJapanesePrintedSetCodeV1({
      existingPrintedSetCode: printedSetCode,
      sourcePrintedSetCode: options.sourceSetCode,
      canonicalSetCode: set.code,
    }))) {
    throw new Error("Canonical set printed abbreviation conflicts with source set");
  }
  return { set, existingCards: cards.rows };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (options.mode === "apply" &&
      (repository.commit_sha !== options.expectedHeadSha ||
       !repository.tracked_worktree_clean)) {
    throw new Error("Apply requires the exact clean frozen commit");
  }
  const frozen = await loadFrozenDiscovery(options);
  const runPlan = {
    version: JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION,
    mode: options.mode,
    as_of: options.asOf,
    repository,
    target: {
      source_set_code: options.sourceSetCode,
      database_set_code: options.databaseSetCode,
      product_id: options.productId,
    },
    frozen_discovery: frozen.hashes,
    boundaries: {
      insert_only: true,
      updates: 0,
      deletes: 0,
      child_printings: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
    },
  };
  const artifacts = {};
  artifacts["run_plan.json"] = await writeJson(
    path.join(options.outDir, "run_plan.json"),
    runPlan,
  );

  const client = new Client(clientOptions(
    options.databaseUrl,
    `japanese-official-incremental-v1-${options.mode}`,
  ));
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query(options.mode === "plan"
      ? "begin transaction isolation level repeatable read read only"
      : "begin transaction isolation level serializable");
    transactionOpen = true;
    const database = await loadDatabase(client, options);
    const promotion = buildJapaneseOfficialIncrementalSetPlanV1({
      set: database.set,
      sourceSet: frozen.sourceSet,
      officialCards: frozen.officialCards,
      existingCards: database.existingCards,
    });
    const validation = validateJapaneseOfficialIncrementalSetPlanV1(promotion);
    if (!validation.valid) throw new Error(validation.findings.join(","));
    await computeIdentityHashes(client, promotion);
    const collisions = await collisionPreflight(client, promotion);
    const expectedReadback = {
      cards: promotion.counts.card_prints,
      identities: promotion.counts.identities,
      evidence: promotion.counts.evidence,
      family_reviews: promotion.counts.family_reviews,
    };
    let transactionResult = { action: "plan_only", expected: expectedReadback };
    if (options.mode === "plan") {
      await client.query("rollback");
      transactionOpen = false;
    } else {
      await insertRows(client, promotion);
      const inserted = await readback(client, promotion);
      if (JSON.stringify(inserted) !== JSON.stringify(expectedReadback)) {
        throw new Error(`Transaction readback mismatch: ${JSON.stringify(inserted)}`);
      }
      if (options.mode === "dry-run") {
        await client.query("rollback");
        transactionOpen = false;
        const absent = await readback(client, promotion);
        if (Object.values(absent).some((count) => count !== 0)) {
          throw new Error(`Rollback absence proof failed: ${JSON.stringify(absent)}`);
        }
        transactionResult = {
          action: "rolled_back",
          inserted_readback: inserted,
          post_rollback_readback: absent,
        };
      } else {
        await client.query("commit");
        transactionOpen = false;
        const durable = await readback(client, promotion);
        if (JSON.stringify(durable) !== JSON.stringify(expectedReadback)) {
          throw new Error(`Durable readback mismatch: ${JSON.stringify(durable)}`);
        }
        transactionResult = { action: "committed", durable_readback: durable };
      }
    }
    const artifactPlan = {
      ...promotion,
      payload: {
        ...promotion.payload,
        rows: promotion.payload.rows.map(({ identity_hash_input: ignored, ...row }) => {
          void ignored;
          return row;
        }),
      },
      collision_preflight: collisions,
      transaction_result: transactionResult,
    };
    const summary = {
      version: JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION,
      mode: options.mode,
      status: options.mode === "apply" ? "applied"
        : options.mode === "dry-run" ? "rollback_proven" : "planned",
      target: promotion.target,
      existing_card_count: database.existingCards.length,
      planned_card_count: promotion.counts.card_prints,
      resulting_card_count: promotion.payload.source_counts.resulting_canonical,
      image_candidate_count: promotion.counts.image_candidates,
      payload_fingerprint_sha256: promotion.payload_fingerprint_sha256,
      transaction_result: transactionResult,
      boundaries: runPlan.boundaries,
    };
    artifacts["promotion_plan.json"] = await writeJson(
      path.join(options.outDir, "promotion_plan.json"),
      artifactPlan,
    );
    artifacts["image_candidate_manifest.json"] = await writeJson(
      path.join(options.outDir, "image_candidate_manifest.json"),
      {
        version: JAPANESE_OFFICIAL_INCREMENTAL_PROMOTION_VERSION,
        policy: "candidate_only_requires_separate_self_hosting_promotion",
        candidates: promotion.payload.image_candidates,
      },
    );
    artifacts["summary.json"] = await writeJson(
      path.join(options.outDir, "summary.json"),
      summary,
    );
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
    if (transactionOpen) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
