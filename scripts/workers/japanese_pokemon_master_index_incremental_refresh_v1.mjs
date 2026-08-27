import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildJapanesePokemonMasterIndexIncrementalV1,
  JAPANESE_POKEMON_MASTER_INDEX_INCREMENTAL_VERSION,
  japaneseIncrementalFingerprint,
  stableJapaneseIncrementalJson,
} from "../../backend/catalog/japanese_pokemon_master_index_incremental_v1.mjs";
import { readVerifiedArtifact } from
  "../audits/japanese_master_index_v4/artifact_rows_v1.mjs";
import { contentFingerprint } from
  "../audits/japanese_master_index_v4/deterministic_artifact_v1.mjs";

const JAPANESE_MASTER_INDEX_DIR = path.join(
  "docs",
  "audits",
  "japanese_master_index_v4",
  "final",
);
const DEFAULT_OVERLAY_PATH = path.join(
  "docs",
  "audits",
  "pokemon_language_master_index_v1",
  "ja",
  "japanese_incremental_admitted_v1.json",
);
const CANDIDATE_FILE = "japanese_incremental_admitted_v1.json";

function parseArgs(argv) {
  const options = {
    mode: "plan",
    discoveryDir: null,
    outDir: null,
    planDir: null,
    overlayPath: DEFAULT_OVERLAY_PATH,
    asOf: new Date().toISOString().slice(0, 10),
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) options.mode = token.slice(7);
    else if (token.startsWith("--discovery-dir=")) options.discoveryDir = token.slice(16);
    else if (token.startsWith("--out-dir=")) options.outDir = token.slice(10);
    else if (token.startsWith("--plan-dir=")) options.planDir = token.slice(11);
    else if (token.startsWith("--overlay-path=")) options.overlayPath = token.slice(15);
    else if (token.startsWith("--as-of=")) options.asOf = token.slice(8);
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!["plan", "apply-to-worktree"].includes(options.mode)) {
    throw new Error("--mode must be plan or apply-to-worktree");
  }
  if (options.mode === "plan" && (!options.discoveryDir || !options.outDir)) {
    throw new Error("--discovery-dir and --out-dir are required for plan mode");
  }
  if (options.mode === "apply-to-worktree" && !options.planDir) {
    throw new Error("--plan-dir is required for apply mode");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.asOf)) throw new Error("Invalid --as-of");
  return options;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function loadVerifiedDataset(descriptorName, expectedKey) {
  const descriptorPath = path.join(JAPANESE_MASTER_INDEX_DIR, descriptorName);
  const { artifact } = await readVerifiedArtifact(descriptorPath);
  const descriptor = artifact.content?.dataset;
  if (descriptor?.dataset_key !== expectedKey) {
    throw new Error(`Japanese Master Index descriptor mismatch: ${expectedKey}`);
  }
  const rows = [];
  for (let index = 0; index < descriptor.shard_paths.length; index += 1) {
    const { artifact: shard } = await readVerifiedArtifact(descriptor.shard_paths[index]);
    if (shard.content?.dataset_key !== expectedKey ||
        shard.content?.shard_index !== index + 1 ||
        shard.content?.shard_count !== descriptor.shard_count ||
        shard.content?.row_count !== shard.content?.rows?.length) {
      throw new Error(`Japanese Master Index shard mismatch: ${expectedKey}`);
    }
    rows.push(...shard.content.rows);
  }
  if (rows.length !== descriptor.row_count ||
      contentFingerprint(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error(`Japanese Master Index dataset fingerprint mismatch: ${expectedKey}`);
  }
  return rows;
}

async function loadBaseMasterIndex() {
  const [sets, cards] = await Promise.all([
    loadVerifiedDataset("jpn_master_admissible_sets_v1.json", "master_admissible_set_rows_v1"),
    loadVerifiedDataset("jpn_master_admissible_cards_v1.json", "master_admissible_card_rows_v1"),
  ]);
  return { sets, cards };
}

function validateOverlay(overlay) {
  if (overlay.version !== JAPANESE_POKEMON_MASTER_INDEX_INCREMENTAL_VERSION ||
      japaneseIncrementalFingerprint(overlay.sets) !== overlay.sets_fingerprint_sha256 ||
      japaneseIncrementalFingerprint(overlay.cards) !== overlay.cards_fingerprint_sha256) {
    throw new Error("Japanese incremental overlay fingerprint mismatch.");
  }
  return overlay;
}

async function plan(options) {
  const sourceSets = await readJson(path.join(options.discoveryDir, "source_sets.json"));
  const [base, currentOverlay] = await Promise.all([
    loadBaseMasterIndex(),
    exists(options.overlayPath).then(async (present) =>
      present ? validateOverlay(await readJson(options.overlayPath)) : null
    ),
  ]);
  const built = buildJapanesePokemonMasterIndexIncrementalV1({
    sourceSets,
    baseSets: base.sets,
    baseCards: base.cards,
    currentOverlay,
    asOf: options.asOf,
  });
  const overlay = {
    version: JAPANESE_POKEMON_MASTER_INDEX_INCREMENTAL_VERSION,
    policy: built.policy,
    canonical_writes: false,
    sets: built.sets,
    cards: built.cards,
    sets_fingerprint_sha256: built.sets_fingerprint_sha256,
    cards_fingerprint_sha256: built.cards_fingerprint_sha256,
  };
  const changed = !currentOverlay ||
    currentOverlay.sets_fingerprint_sha256 !== overlay.sets_fingerprint_sha256 ||
    currentOverlay.cards_fingerprint_sha256 !== overlay.cards_fingerprint_sha256;
  const report = {
    version: JAPANESE_POKEMON_MASTER_INDEX_INCREMENTAL_VERSION,
    generated_at: new Date().toISOString(),
    as_of: options.asOf,
    changed,
    prior_set_count: currentOverlay?.sets.length ?? 0,
    prior_card_count: currentOverlay?.cards.length ?? 0,
    candidate_set_count: overlay.sets.length,
    candidate_card_count: overlay.cards.length,
    admitted_set_delta: overlay.sets.length - (currentOverlay?.sets.length ?? 0),
    admitted_card_delta: overlay.cards.length - (currentOverlay?.cards.length ?? 0),
    decisions: built.decisions,
    database_writes: false,
    storage_writes: false,
    canonical_writes: false,
    overlay_fingerprint_sha256: japaneseIncrementalFingerprint(overlay),
  };
  report.plan_fingerprint_sha256 = japaneseIncrementalFingerprint({
    ...report,
    generated_at: null,
  });
  await fs.mkdir(options.outDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(options.outDir, CANDIDATE_FILE), stableJapaneseIncrementalJson(overlay)),
    fs.writeFile(path.join(options.outDir, "plan.json"), stableJapaneseIncrementalJson(report)),
    fs.writeFile(path.join(options.outDir, "summary.json"), stableJapaneseIncrementalJson(report)),
  ]);
  return report;
}

async function applyToWorktree(options) {
  const report = await readJson(path.join(options.planDir, "plan.json"));
  const expectedPlanFingerprint = japaneseIncrementalFingerprint({
    ...report,
    generated_at: null,
    plan_fingerprint_sha256: undefined,
  });
  if (report.version !== JAPANESE_POKEMON_MASTER_INDEX_INCREMENTAL_VERSION ||
      report.plan_fingerprint_sha256 !== expectedPlanFingerprint) {
    throw new Error("Japanese incremental plan fingerprint mismatch.");
  }
  const candidate = validateOverlay(await readJson(path.join(options.planDir, CANDIDATE_FILE)));
  if (japaneseIncrementalFingerprint(candidate) !== report.overlay_fingerprint_sha256) {
    throw new Error("Japanese incremental candidate does not match frozen plan.");
  }
  if (report.changed) {
    await fs.mkdir(path.dirname(options.overlayPath), { recursive: true });
    await fs.copyFile(path.join(options.planDir, CANDIDATE_FILE), options.overlayPath);
  }
  return report;
}

const options = parseArgs(process.argv.slice(2));
const report = options.mode === "plan"
  ? await plan(options)
  : await applyToWorktree(options);
process.stdout.write(stableJapaneseIncrementalJson(report));
