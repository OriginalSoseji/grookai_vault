import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { sha256, stableJson } from
  "../../backend/catalog/universal_catalog_discovery_v1.mjs";
import {
  canonicalCardNameKey,
  normalizeNumber,
  normalizeText,
} from "../audits/verified_master_set_index_v1/shared.mjs";

export const ENGLISH_POKEMON_MASTER_INDEX_REFRESH_VERSION =
  "ENGLISH_POKEMON_MASTER_INDEX_REFRESH_V1";

export const MASTER_INDEX_AUTHORITY_FILES = Object.freeze([
  "english_master_index_v1.json",
  "english_master_index_v1.md",
  "english_master_index_sets_v1.json",
  "english_master_index_cards_v1.json",
  "english_master_index_printings_v1.json",
  "english_master_index_conflicts_v1.json",
  "english_master_index_conflicts_v1.md",
  "english_master_index_source_agreement_v1.json",
  "english_master_index_source_agreement_v1.md",
  "english_master_index_set_alias_normalization_v1.json",
  "english_master_index_source_availability_v1.json",
  "english_master_index_manual_review_v1.json",
]);

function clean(value) {
  return String(value ?? "").normalize("NFKC").trim();
}

function parseArgs(argv) {
  const options = {
    mode: "plan",
    baselineDir: null,
    candidateDir: null,
    outDir: null,
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) options.mode = token.slice(7);
    else if (token.startsWith("--baseline-dir=")) {
      options.baselineDir = path.resolve(token.slice(15));
    } else if (token.startsWith("--candidate-dir=")) {
      options.candidateDir = path.resolve(token.slice(16));
    } else if (token.startsWith("--out-dir=")) {
      options.outDir = path.resolve(token.slice(10));
    } else throw new Error(`Unknown argument: ${token}`);
  }
  if (!new Set(["plan", "apply-to-worktree"]).has(options.mode)) {
    throw new Error("--mode must be plan or apply-to-worktree");
  }
  if (!options.baselineDir || !options.candidateDir || !options.outDir) {
    throw new Error("--baseline-dir, --candidate-dir, and --out-dir are required");
  }
  return options;
}

async function readJson(dir, file) {
  return JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
}

function cardKey(card) {
  return [
    normalizeText(card.set_name ?? card.set_key),
    normalizeNumber(card.card_number).toUpperCase(),
    canonicalCardNameKey(card),
  ].join("|");
}

function printingCardKey(printing) {
  return cardKey(printing);
}

function printingKey(printing) {
  return [
    printingCardKey(printing),
    normalizeText(printing.finish_key),
  ].join("|");
}

function foldedPrinting(printing) {
  if (clean(printing.set_key).toLowerCase() !== "sma") return printing;
  return {
    ...printing,
    set_key: "sm115",
    set_name: "Hidden Fates",
  };
}

const LEGACY_UNQUALIFIED_NORMAL_SOURCES = new Set([
  "cardtrader_blueprint_index",
  "pokemontcg_api",
  "tcgdex",
]);

function isRevokedLegacyUnqualifiedNormal(printing) {
  const sources = printing.sources ?? [];
  return normalizeText(printing.finish_key) === "normal"
    && sources.includes("cardtrader_blueprint_index")
    && sources.every((source) => LEGACY_UNQUALIFIED_NORMAL_SOURCES.has(source));
}

const EXPLICIT_PRINTING_SUPERSESSIONS = new Map([
  ["mep|18|cottonee|holo", "cosmos"],
  ["mep|19|whimsicott|holo", "cosmos"],
  ["mep|20|sneasel|holo", "cosmos"],
  ["mep|21|weavile|holo", "cosmos"],
  ["svp|224|paradise resort|normal", "stamped"],
]);

function printingSupersessionKey(printing) {
  return [
    clean(printing.set_key).toLowerCase(),
    normalizeNumber(printing.card_number).toUpperCase(),
    canonicalCardNameKey(printing),
    normalizeText(printing.finish_key),
  ].join("|");
}

function allowedPrintingSupersession(printing, candidateByCardKey) {
  const replacementFinish = EXPLICIT_PRINTING_SUPERSESSIONS.get(
    printingSupersessionKey(printing),
  );
  if (!replacementFinish) return false;
  return (candidateByCardKey.get(printingCardKey(printing)) ?? [])
    .some((candidate) => normalizeText(candidate.finish_key) === replacementFinish);
}

function allowedFoldedReplacement(card, candidateKeys) {
  if (clean(card.set_key).toLowerCase() !== "sma") return false;
  return candidateKeys.has(cardKey({
    ...card,
    set_key: "sm115",
    set_name: "Hidden Fates",
  })) || candidateKeys.has(cardKey({
    ...card,
    set_key: "sm115",
    set_name: null,
  }));
}

function factProjection({ sets, cards, printings }) {
  return {
    sets: sets.map((row) => ({
      key: row.key,
      set_name: row.set_name,
      manual_aliases: row.manual_aliases,
      release_date: row.release_date,
      source_aliases: row.source_aliases,
      source_totals: row.source_totals,
    })),
    cards,
    printings,
  };
}

export function buildEnglishPokemonMasterIndexRefreshPlanV1({
  baselineSets = [],
  baselineCards = [],
  baselinePrintings = [],
  candidateSets = [],
  candidateCards = [],
  candidatePrintings = [],
  candidateConflicts = [],
}) {
  if (candidateSets.length === 0 || candidateCards.length === 0) {
    throw new Error("Candidate Master Index is empty");
  }
  if (candidateConflicts.length !== 0) {
    throw new Error(`Candidate Master Index has ${candidateConflicts.length} conflicts`);
  }
  const candidateKeys = new Set(candidateCards.map(cardKey));
  if (candidateKeys.size !== candidateCards.length) {
    throw new Error("Candidate Master Index repeats a card coordinate");
  }
  const removed = baselineCards.filter((card) => !candidateKeys.has(cardKey(card)));
  const unexplainedRemoved = removed.filter((card) =>
    !allowedFoldedReplacement(card, candidateKeys));
  if (unexplainedRemoved.length > 0) {
    throw new Error(
      `Candidate Master Index removes ${unexplainedRemoved.length} unexplained card facts`,
    );
  }
  const baselineKeys = new Set(baselineCards.map(cardKey));
  const added = candidateCards.filter((card) => !baselineKeys.has(cardKey(card)));
  const candidatePrintingKeys = new Set(candidatePrintings.map(printingKey));
  if (candidatePrintingKeys.size !== candidatePrintings.length) {
    throw new Error("Candidate Master Index repeats a printing coordinate");
  }
  const candidatePrintingsByCardKey = new Map();
  for (const printing of candidatePrintings) {
    const key = printingCardKey(printing);
    const rows = candidatePrintingsByCardKey.get(key) ?? [];
    rows.push(printing);
    candidatePrintingsByCardKey.set(key, rows);
  }
  const removedPrintings = baselinePrintings.filter((printing) =>
    !candidatePrintingKeys.has(printingKey(foldedPrinting(printing))));
  const revokedLegacyPrintings = removedPrintings.filter(
    isRevokedLegacyUnqualifiedNormal,
  );
  const supersededPrintings = removedPrintings.filter((printing) =>
    !isRevokedLegacyUnqualifiedNormal(printing)
    && allowedPrintingSupersession(printing, candidatePrintingsByCardKey));
  const unexplainedRemovedPrintings = removedPrintings.filter((printing) =>
    !isRevokedLegacyUnqualifiedNormal(printing)
    && !allowedPrintingSupersession(printing, candidatePrintingsByCardKey));
  if (unexplainedRemovedPrintings.length > 0) {
    throw new Error(
      `Candidate Master Index removes ${unexplainedRemovedPrintings.length} unexplained printing facts`,
    );
  }
  const baselinePrintingKeys = new Set(
    baselinePrintings.map((printing) => printingKey(foldedPrinting(printing))),
  );
  const addedPrintings = candidatePrintings.filter((printing) =>
    !baselinePrintingKeys.has(printingKey(printing)));
  const baselineFingerprint = sha256(stableJson(factProjection({
    sets: baselineSets,
    cards: baselineCards,
    printings: baselinePrintings,
  })));
  const candidateFingerprint = sha256(stableJson(factProjection({
    sets: candidateSets,
    cards: candidateCards,
    printings: candidatePrintings,
  })));
  return {
    version: ENGLISH_POKEMON_MASTER_INDEX_REFRESH_VERSION,
    changed: baselineFingerprint !== candidateFingerprint,
    baseline_fact_fingerprint_sha256: baselineFingerprint,
    candidate_fact_fingerprint_sha256: candidateFingerprint,
    counts: {
      baseline_sets: baselineSets.length,
      candidate_sets: candidateSets.length,
      baseline_cards: baselineCards.length,
      candidate_cards: candidateCards.length,
      added_cards: added.length,
      folded_alias_cards: removed.length,
      unexplained_removed_cards: unexplainedRemoved.length,
      baseline_printings: baselinePrintings.length,
      candidate_printings: candidatePrintings.length,
      added_printings: addedPrintings.length,
      revoked_legacy_printings: revokedLegacyPrintings.length,
      superseded_printings: supersededPrintings.length,
      unexplained_removed_printings: unexplainedRemovedPrintings.length,
      candidate_conflicts: candidateConflicts.length,
    },
    added_cards: added.slice(0, 250).map((card) => ({
      set_key: card.set_key,
      card_number: card.card_number,
      card_name: card.card_name,
      status: card.status,
      source_count: card.source_count,
    })),
    folded_alias_cards: removed.slice(0, 250).map((card) => ({
      from_set_key: card.set_key,
      to_set_key: "sm115",
      card_number: card.card_number,
      card_name: card.card_name,
    })),
    revoked_legacy_printings: revokedLegacyPrintings.slice(0, 250).map((printing) => ({
      set_key: printing.set_key,
      card_number: printing.card_number,
      card_name: printing.card_name,
      finish_key: printing.finish_key,
      reason: "unqualified_cardtrader_normal_revoked_by_ingestion_contract_v1",
    })),
    superseded_printings: supersededPrintings.slice(0, 250).map((printing) => ({
      set_key: printing.set_key,
      card_number: printing.card_number,
      card_name: printing.card_name,
      from_finish_key: printing.finish_key,
      to_finish_key: EXPLICIT_PRINTING_SUPERSESSIONS.get(
        printingSupersessionKey(printing),
      ),
      reason: "explicit_source_backed_printing_supersession",
    })),
    boundaries: {
      database_writes: false,
      storage_writes: false,
      canonical_writes: false,
      output: "governed_data_only_pull_request",
    },
  };
}

async function loadAuthority(dir) {
  const [sets, cards, printings, conflicts] = await Promise.all([
    readJson(dir, "english_master_index_sets_v1.json"),
    readJson(dir, "english_master_index_cards_v1.json"),
    readJson(dir, "english_master_index_printings_v1.json"),
    readJson(dir, "english_master_index_conflicts_v1.json"),
  ]);
  return {
    sets: sets.sets ?? [],
    cards: cards.cards ?? [],
    printings: printings.printings ?? [],
    conflicts: conflicts.conflicts ?? [],
  };
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [baseline, candidate] = await Promise.all([
    loadAuthority(options.baselineDir),
    loadAuthority(options.candidateDir),
  ]);
  const plan = buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: baseline.sets,
    baselineCards: baseline.cards,
    baselinePrintings: baseline.printings,
    candidateSets: candidate.sets,
    candidateCards: candidate.cards,
    candidatePrintings: candidate.printings,
    candidateConflicts: candidate.conflicts,
  });
  if (options.mode === "apply-to-worktree" && plan.changed) {
    for (const file of MASTER_INDEX_AUTHORITY_FILES) {
      await fs.copyFile(path.join(options.candidateDir, file), path.join(options.baselineDir, file));
    }
  }
  await writeJson(path.join(options.outDir, "refresh_plan.json"), {
    ...plan,
    mode: options.mode,
    completed_at: new Date().toISOString(),
  });
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
