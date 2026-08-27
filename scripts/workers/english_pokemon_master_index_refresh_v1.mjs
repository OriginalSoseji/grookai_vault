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
import { mergeEnglishPokemonFoldedSubsetOwnersV1 } from
  "../../backend/catalog/english_pokemon_master_index_ownership_v1.mjs";

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

function continuitySetKey(card) {
  const setKey = clean(card.set_key).toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "");
  return setKey || normalizeText(card.set_name);
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
    continuitySetKey(card),
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

function aliasSourceKey(row) {
  return normalizeText(row?.from_set_key ?? row?.source_set_key);
}

function aliasTargetKey(row) {
  return normalizeText(row?.to_set_key ?? row?.canonical_set_key);
}

export function preserveHistoricalSetAliasesV1({
  baselineAliasReport = {},
  candidateAliasReport = {},
}) {
  const candidateTargetBySource = new Map();
  const effectiveByIdentity = new Map();
  const aliasIdentity = (row) => [
    aliasSourceKey(row),
    normalizeText(row?.from_set_name),
    aliasTargetKey(row),
    normalizeText(row?.to_set_name),
  ].join("|");
  for (const row of candidateAliasReport.remaps ?? []) {
    const source = aliasSourceKey(row);
    if (!source) continue;
    const target = aliasTargetKey(row);
    const existingTarget = candidateTargetBySource.get(source);
    if (existingTarget && existingTarget !== target) {
      throw new Error(`Candidate Master Index has conflicting alias targets for ${source}`);
    }
    candidateTargetBySource.set(source, target);
    effectiveByIdentity.set(aliasIdentity(row), row);
  }
  const preserved = [];
  for (const row of baselineAliasReport.remaps ?? []) {
    const source = aliasSourceKey(row);
    if (!source) continue;
    const candidateTarget = candidateTargetBySource.get(source);
    if (candidateTarget && candidateTarget !== aliasTargetKey(row)) {
      throw new Error(
        `Candidate Master Index changes historical alias ${source} from ` +
        `${aliasTargetKey(row)} to ${candidateTarget}`,
      );
    }
    const identity = aliasIdentity(row);
    if (!effectiveByIdentity.has(identity)) {
      effectiveByIdentity.set(identity, row);
      preserved.push(row);
    }
  }
  const remaps = [...effectiveByIdentity.values()].sort((left, right) =>
    aliasSourceKey(left).localeCompare(aliasSourceKey(right)) ||
    aliasTargetKey(left).localeCompare(aliasTargetKey(right)) ||
    normalizeText(left.from_set_name).localeCompare(normalizeText(right.from_set_name)) ||
    normalizeText(left.to_set_name).localeCompare(normalizeText(right.to_set_name)));
  const foldedSubsetOwners = mergeEnglishPokemonFoldedSubsetOwnersV1([
    ...(baselineAliasReport.folded_subset_owners ?? []),
    ...(candidateAliasReport.folded_subset_owners ?? []),
  ]);
  return {
    report: {
      ...candidateAliasReport,
      summary: {
        ...(candidateAliasReport.summary ?? {}),
        historical_remaps_preserved: preserved.length,
        effective_remaps: remaps.length,
        folded_subset_owners: foldedSubsetOwners.length,
      },
      folded_subset_owners: foldedSubsetOwners,
      remaps,
    },
    preserved,
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

export function preserveUnobservedPrintingAuthorityV1({
  baselinePrintings = [],
  candidatePrintings = [],
}) {
  const candidateKeys = new Set(candidatePrintings.map(printingKey));
  const candidateByCardKey = new Map();
  for (const printing of candidatePrintings) {
    const key = printingCardKey(printing);
    const rows = candidateByCardKey.get(key) ?? [];
    rows.push(printing);
    candidateByCardKey.set(key, rows);
  }
  const preserved = baselinePrintings.filter((printing) => {
    if (candidateKeys.has(printingKey(foldedPrinting(printing)))) return false;
    if (isRevokedLegacyUnqualifiedNormal(printing)) return false;
    if (allowedPrintingSupersession(printing, candidateByCardKey)) return false;
    return true;
  });
  return {
    printings: [...candidatePrintings, ...preserved],
    preserved,
  };
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

function factProjection({ sets, cards, printings, aliases = [] }) {
  return {
    sets: sets.map((row) => ({
      key: row.key,
      set_name: row.set_name,
      manual_aliases: row.manual_aliases,
      release_date: row.release_date,
      source_aliases: row.source_aliases,
      source_totals: row.source_totals,
    })).sort((left, right) => normalizeText(left.key ?? left.set_name)
      .localeCompare(normalizeText(right.key ?? right.set_name))),
    cards: [...cards].sort((left, right) => cardKey(left).localeCompare(cardKey(right))),
    printings: [...printings]
      .sort((left, right) => printingKey(left).localeCompare(printingKey(right))),
    aliases: [...aliases]
      .map((row) => ({
        source: aliasSourceKey(row),
        target: aliasTargetKey(row),
      }))
      .sort((left, right) => left.source.localeCompare(right.source)),
  };
}

export function reconcileMasterIndexMarkdownV1({
  markdown,
  printingStatusCounts,
  manualReviewCount,
}) {
  const statusOrder = [
    "api_agreed",
    "candidate_unconfirmed",
    "human_source_verified",
    "master_verified",
  ];
  const statuses = [
    ...statusOrder.filter((status) => printingStatusCounts[status] !== undefined),
    ...Object.keys(printingStatusCounts)
      .filter((status) => !statusOrder.includes(status))
      .sort(),
  ];
  const printingSection = [
    "## Printings By Status",
    "",
    "| status | count |",
    "| --- | --- |",
    ...statuses.map((status) => `| ${status} | ${printingStatusCounts[status]} |`),
  ].join("\n");
  return String(markdown)
    .replace(/\| manual review \| \d+ \|/, `| manual review | ${manualReviewCount} |`)
    .replace(
      /## Printings By Status\r?\n\r?\n[\s\S]*?\r?\n\r?\n## Source Evidence Rows/,
      `${printingSection}\n\n## Source Evidence Rows`,
    );
}

export function preserveExistingFactOrderV1({
  baselineRows = [],
  candidateRows = [],
  baselineKey = (row) => row.key,
  candidateKey = (row) => row.key,
}) {
  const candidateByKey = new Map(candidateRows.map((row) => [candidateKey(row), row]));
  const seen = new Set();
  const ordered = [];

  for (const baselineRow of baselineRows) {
    const key = baselineKey(baselineRow);
    const candidateRow = candidateByKey.get(key);
    if (!candidateRow || seen.has(key)) continue;
    ordered.push(candidateRow);
    seen.add(key);
  }

  const additions = candidateRows
    .filter((row) => !seen.has(candidateKey(row)))
    .sort((left, right) => candidateKey(left).localeCompare(candidateKey(right)));
  return [...ordered, ...additions];
}

export function buildEnglishPokemonMasterIndexRefreshPlanV1({
  baselineSets = [],
  baselineCards = [],
  baselinePrintings = [],
  baselineAliases = [],
  candidateSets = [],
  candidateCards = [],
  candidatePrintings = [],
  candidateAliases = [],
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
  const unobservedPrintings = removedPrintings.filter((printing) =>
    !isRevokedLegacyUnqualifiedNormal(printing)
    && !allowedPrintingSupersession(printing, candidatePrintingsByCardKey));
  const effectiveCandidate = preserveUnobservedPrintingAuthorityV1({
    baselinePrintings,
    candidatePrintings,
  });
  const effectiveAliases = preserveHistoricalSetAliasesV1({
    baselineAliasReport: { remaps: baselineAliases },
    candidateAliasReport: { remaps: candidateAliases },
  });
  const baselinePrintingKeys = new Set(
    baselinePrintings.map((printing) => printingKey(foldedPrinting(printing))),
  );
  const addedPrintings = candidatePrintings.filter((printing) =>
    !baselinePrintingKeys.has(printingKey(printing)));
  const baselineFingerprint = sha256(stableJson(factProjection({
    sets: baselineSets,
    cards: baselineCards,
    printings: baselinePrintings,
    aliases: baselineAliases,
  })));
  const candidateFingerprint = sha256(stableJson(factProjection({
    sets: candidateSets,
    cards: candidateCards,
    printings: effectiveCandidate.printings,
    aliases: effectiveAliases.report.remaps,
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
      source_candidate_printings: candidatePrintings.length,
      candidate_printings: effectiveCandidate.printings.length,
      added_printings: addedPrintings.length,
      revoked_legacy_printings: revokedLegacyPrintings.length,
      superseded_printings: supersededPrintings.length,
      preserved_unobserved_printings: unobservedPrintings.length,
      baseline_alias_remaps: baselineAliases.length,
      source_candidate_alias_remaps: candidateAliases.length,
      candidate_alias_remaps: effectiveAliases.report.remaps.length,
      preserved_historical_alias_remaps: effectiveAliases.preserved.length,
      unexplained_removed_printings: 0,
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
    preserved_unobserved_printings: unobservedPrintings.slice(0, 250)
      .map((printing) => ({
        set_key: printing.set_key,
        card_number: printing.card_number,
        card_name: printing.card_name,
        finish_key: printing.finish_key,
        sources: printing.sources ?? [],
        reason: "historical_master_index_authority_pending_source_revalidation",
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
  const [sets, cards, printings, conflicts, aliases] = await Promise.all([
    readJson(dir, "english_master_index_sets_v1.json"),
    readJson(dir, "english_master_index_cards_v1.json"),
    readJson(dir, "english_master_index_printings_v1.json"),
    readJson(dir, "english_master_index_conflicts_v1.json"),
    readJson(dir, "english_master_index_set_alias_normalization_v1.json"),
  ]);
  return {
    sets: sets.sets ?? [],
    cards: cards.cards ?? [],
    printings: printings.printings ?? [],
    conflicts: conflicts.conflicts ?? [],
    aliases: aliases.remaps ?? [],
  };
}

async function writeJson(file, value, { compact = false } = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = compact ? JSON.stringify(value) : JSON.stringify(value, null, 2);
  await fs.writeFile(file, `${body}\n`, "utf8");
}

async function applyCandidateAuthority(options) {
  const orderAwareFiles = new Set([
    "english_master_index_cards_v1.json",
    "english_master_index_printings_v1.json",
    "english_master_index_set_alias_normalization_v1.json",
  ]);
  for (const file of MASTER_INDEX_AUTHORITY_FILES) {
    if (orderAwareFiles.has(file)) continue;
    await fs.copyFile(path.join(options.candidateDir, file), path.join(options.baselineDir, file));
  }

  const [baselineCards, candidateCards, baselinePrintings, candidatePrintings,
    baselineAliases, candidateAliases, candidateManualReview, candidateIndex,
    candidateMarkdown] =
    await Promise.all([
      readJson(options.baselineDir, "english_master_index_cards_v1.json"),
      readJson(options.candidateDir, "english_master_index_cards_v1.json"),
      readJson(options.baselineDir, "english_master_index_printings_v1.json"),
      readJson(options.candidateDir, "english_master_index_printings_v1.json"),
      readJson(options.baselineDir, "english_master_index_set_alias_normalization_v1.json"),
      readJson(options.candidateDir, "english_master_index_set_alias_normalization_v1.json"),
      readJson(options.candidateDir, "english_master_index_manual_review_v1.json"),
      readJson(options.candidateDir, "english_master_index_v1.json"),
      fs.readFile(path.join(options.candidateDir, "english_master_index_v1.md"), "utf8"),
    ]);

  candidateCards.cards = preserveExistingFactOrderV1({
    baselineRows: baselineCards.cards ?? [],
    candidateRows: candidateCards.cards ?? [],
    baselineKey: cardKey,
    candidateKey: cardKey,
  });
  const effectiveCandidatePrintings = preserveUnobservedPrintingAuthorityV1({
    baselinePrintings: baselinePrintings.printings ?? [],
    candidatePrintings: candidatePrintings.printings ?? [],
  });
  candidatePrintings.printings = preserveExistingFactOrderV1({
    baselineRows: baselinePrintings.printings ?? [],
    candidateRows: effectiveCandidatePrintings.printings,
    baselineKey: (row) => printingKey(foldedPrinting(row)),
    candidateKey: printingKey,
  });
  candidatePrintings.finish_absences = preserveExistingFactOrderV1({
    baselineRows: baselinePrintings.finish_absences ?? [],
    candidateRows: candidatePrintings.finish_absences ?? [],
    baselineKey: (row) => printingKey(foldedPrinting(row)),
    candidateKey: printingKey,
  });
  const continuityReviewRows = effectiveCandidatePrintings.preserved.map((printing) => ({
    fact_type: "printing_finish_source_revalidation",
    key: `${printing.key}|historical-source-revalidation`,
    status: "needs_manual_review",
    set_key: printing.set_key,
    set_name: printing.set_name,
    card_number: printing.card_number,
    card_name: printing.card_name,
    finish_key: printing.finish_key,
    source_count: printing.source_count,
    sources: printing.sources ?? [],
    source_authorities: printing.source_authorities ?? [],
    source_kinds: printing.source_kinds ?? [],
    evidence: [],
    review_reason:
      "Previously admitted printing authority was not re-observed in the latest source refresh; authority was preserved pending explicit revalidation or revocation.",
  }));
  const reviewByKey = new Map([
    ...(candidateManualReview.manual_review ?? []),
    ...continuityReviewRows,
  ].map((row) => [row.key, row]));
  candidateManualReview.manual_review = [...reviewByKey.values()]
    .sort((left, right) => left.key.localeCompare(right.key));

  const printingStatusCounts = {};
  for (const printing of candidatePrintings.printings) {
    printingStatusCounts[printing.status] =
      (printingStatusCounts[printing.status] ?? 0) + 1;
  }
  candidateIndex.summary.printings_by_status = printingStatusCounts;
  candidateIndex.summary.manual_review = candidateManualReview.manual_review.length;
  candidateIndex.summary.continuity_carry_forward = {
    printing_count: effectiveCandidatePrintings.preserved.length,
    policy: "preserve_historical_authority_until_explicit_revalidation_or_revocation",
  };
  const effectiveAliases = preserveHistoricalSetAliasesV1({
    baselineAliasReport: baselineAliases,
    candidateAliasReport: candidateAliases,
  });
  candidateIndex.summary.continuity_carry_forward.alias_remap_count =
    effectiveAliases.preserved.length;
  const reconciledMarkdown = reconcileMasterIndexMarkdownV1({
    markdown: candidateMarkdown,
    printingStatusCounts,
    manualReviewCount: candidateManualReview.manual_review.length,
  });

  await writeJson(
    path.join(options.baselineDir, "english_master_index_cards_v1.json"),
    candidateCards,
    { compact: true },
  );
  await writeJson(
    path.join(options.baselineDir, "english_master_index_printings_v1.json"),
    candidatePrintings,
  );
  await writeJson(
    path.join(options.baselineDir, "english_master_index_manual_review_v1.json"),
    candidateManualReview,
  );
  await writeJson(
    path.join(options.baselineDir, "english_master_index_v1.json"),
    candidateIndex,
  );
  await writeJson(
    path.join(options.baselineDir, "english_master_index_set_alias_normalization_v1.json"),
    effectiveAliases.report,
  );
  await fs.writeFile(
    path.join(options.baselineDir, "english_master_index_v1.md"),
    reconciledMarkdown,
    "utf8",
  );
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
    baselineAliases: baseline.aliases,
    candidateSets: candidate.sets,
    candidateCards: candidate.cards,
    candidatePrintings: candidate.printings,
    candidateAliases: candidate.aliases,
    candidateConflicts: candidate.conflicts,
  });
  if (options.mode === "apply-to-worktree" && plan.changed) {
    await applyCandidateAuthority(options);
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
