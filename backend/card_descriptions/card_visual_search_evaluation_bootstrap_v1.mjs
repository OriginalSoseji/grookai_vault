import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { CARD_VISUAL_CORPUS_EXPECTED_BRANCH, sha256JsonV1 } from "./card_visual_corpus_v1_inventory.mjs";

export const CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_VERSION = "CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_V1";
export const CARD_VISUAL_SEARCH_QUERY_SUITE_VERSION = "CARD_VISUAL_SEARCH_QUERY_SUITE_V1_CANDIDATE";
export const CARD_VISUAL_SEARCH_JUDGMENT_VERSION = "CARD_VISUAL_SEARCH_JUDGMENTS_V1_BOOTSTRAP_NOT_GOLD";
export const CARD_VISUAL_SEARCH_CANDIDATE_INDEX_VERSION = "CARD_VISUAL_SEARCH_CANDIDATE_INDEX_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_PROJECTION_DIR = "docs/audits/card_visual_search_projection_v1_5/2026-07-21T17-23-42-102Z_projection_c3e708b1cd15";
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_search_evaluation_bootstrap_v1";
const EXPECTED_PROJECTION_VERSION = "CARD_VISUAL_SEARCH_PROJECTION_V1_5";
const STOP_WORDS = new Set(["a", "an", "and", "as", "at", "card", "cards", "for", "in", "is", "of", "on", "or", "the", "to", "with"]);

export const CARD_VISUAL_SEARCH_QUERY_FAMILY_TARGETS = Object.freeze({
  canonical_subject_visual_fact: 35,
  visual_only_discovery: 30,
  subject_roles: 12,
  multi_subject_scenes: 8,
  anatomy_features: 20,
  human_appearance: 15,
  pose_action_state: 15,
  environment: 20,
  objects_counts: 15,
  color_light: 15,
  composition_style: 10,
  effects: 10,
  representation_cameo: 10,
  alias_intent: 5,
  metadata_visual: 5,
  printing_expansion: 10,
  negative_zero_result: 15,
});

const FAMILY_PATTERNS = Object.freeze({
  anatomy_features: /\b(?:anatomy|physical feature|body region|eyes?|mouth|ears?|wings?|tail|horns?|claws?|markings?|limbs?|appendage|teeth|fangs?)\b/u,
  human_appearance: /\b(?:human appearance|clothing|garment|hair|headwear|footwear|accessory|tattoo|hands?|arms?|legs?|shoulders?|midriff|neckline|sleeves?)\b/u,
  pose_action_state: /\b(?:pose|orientation|action|state|standing|sitting|sleeping|floating|flying|leaping|running|walking|crouching|holding|eating|reaching|skating)\b/u,
  environment: /\b(?:environment|setting|terrain|sky|ground|forest|trees?|plants?|architecture|buildings?|water|weather|rain|snow|storm|indoor|outdoor|room|background)\b/u,
  objects_counts: /\b(?:objects?|props?|counts?|tools?|food|furniture|vehicle|book|sign|rocks?|flowers?|mechanical|device|parts?)\b/u,
  color_light: /\b(?:colors?|palette|lighting|shadows?|highlights?|contrast|glow|backlight|gradient)\b/u,
  composition_style: /\b(?:composition|camera|framing|crop|cropping|depth|motifs?|symmetry|diagonal|repeated shapes?|angle|perspective)\b/u,
  effects: /\b(?:effects?|lightning|flames?|smoke|vapor|sparks?|wisps?|reflections?|haze|glare)\b/u,
});

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/gu, "/");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseCardVisualSearchEvaluationBootstrapArgsV1(argv = []) {
  return {
    projectionDir: parseFlag(argv, "projection-dir") ?? DEFAULT_PROJECTION_DIR,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    topK: Number.parseInt(parseFlag(argv, "top-k") ?? "25", 10),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value = nowIso()) {
  return value.replace(/[:.]/gu, "-");
}

export function normalizeVisualSearchTextV1(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019\u02bc\uff07]/gu, "'")
    .replace(/[_]+/gu, " ")
    .replace(/[^\p{L}\p{N}'-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function tokenizeVisualSearchTextV1(value) {
  return normalizeVisualSearchTextV1(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))].sort();
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath, transform = (row) => row) {
  const rows = [];
  const stream = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of stream) if (line.trim()) rows.push(transform(JSON.parse(line)));
  return rows;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
}

function currentGitState() {
  const git = (args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  return {
    commit_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    tracked_status_short: git(["status", "--short", "--untracked-files=no"]),
  };
}

function conciseEntry(entry) {
  const term = normalizeVisualSearchTextV1(entry.term);
  if (term.length < 3 || term.length > 96) return false;
  if (/\b(?:observation|visible value|cannot determine|not applicable|none visible)\b/u.test(term)) return false;
  return true;
}

function entryScope(entry) {
  return normalizeVisualSearchTextV1([entry.module, entry.field_path, entry.category, entry.term].filter(Boolean).join(" "));
}

function entryPriority(entry) {
  const sourceOrder = { canonical_concept: 0, search_term: 1, semantic_fact: 2, observation: 3, typed_fact: 4, subject_role: 5, count: 6, relationship: 7 };
  const normalizedTerm = entry.normalized_term ?? normalizeVisualSearchTextV1(entry.term);
  return [sourceOrder[entry.source_type] ?? 9, normalizedTerm.length, normalizedTerm];
}

function compareEntry(left, right) {
  const a = entryPriority(left);
  const b = entryPriority(right);
  return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]);
}

function groupEntries(group, documentType = null, predicate = null) {
  if (!group.search_entries) {
    group.search_entries = Object.values(group.documents)
      .flatMap((document) => document.structured_concepts.map((entry) => {
        const normalizedTerm = normalizeVisualSearchTextV1(entry.term);
        return {
          ...entry,
          document_type: document.document_type,
          search_document_id: document.search_document_id,
          normalized_term: normalizedTerm,
          search_tokens: tokenizeVisualSearchTextV1(normalizedTerm),
        };
      }))
      .filter(conciseEntry);
  }
  if (!documentType && !predicate && group.search_entries_unique) return group.search_entries_unique;
  const rows = group.search_entries
    .filter((entry) => !documentType || entry.document_type === documentType)
    .filter((entry) => !predicate || predicate(entry));
  const byTerm = new Map();
  for (const row of rows.sort(compareEntry)) if (!byTerm.has(row.normalized_term)) byTerm.set(row.normalized_term, row);
  const result = [...byTerm.values()];
  if (!documentType && !predicate) group.search_entries_unique = result;
  return result;
}

export function visualSearchGroupEntriesV1(group, documentType = null, predicate = null) {
  return groupEntries(group, documentType, predicate);
}

function deterministicSort(rows, key) {
  return [...rows].sort((left, right) => sha256JsonV1({ key, row: left.sort_key }).localeCompare(sha256JsonV1({ key, row: right.sort_key })));
}

function baseIntent(overrides = {}) {
  return {
    canonical_filters: { subjects: [], set_codes: [], years: null, artist: [] },
    visual_concepts: [],
    subject_roles: [],
    count_constraints: [],
    printing_filters: [],
    query_aliases: [],
    negative_filters: [],
    unrecognized_terms: [],
    ...overrides,
  };
}

function candidate(group, family, queryText, intent, entries, extra = {}) {
  return {
    family,
    query_text: queryText,
    intent,
    required_evidence_categories: uniqueSorted(entries.map((entry) => entry.document_type)),
    expected_artwork_group_id: group?.artwork_group_id ?? null,
    expected_printing_count: group?.printings.length ?? 0,
    source_evidence: entries.map((entry) => ({
      search_document_id: entry.search_document_id,
      source_type: entry.source_type,
      source_id: entry.source_id,
      term: entry.term,
      document_type: entry.document_type,
      subject_role: entry.subject_role,
      supporting_observation_ids: entry.supporting_observation_ids,
    })),
    valid_zero_result: false,
    ...extra,
  };
}

function familyPool(groups, family) {
  const pattern = FAMILY_PATTERNS[family];
  return groups.flatMap((group) => {
    const entries = groupEntries(group, null, (entry) => pattern.test(entryScope(entry)));
    return entries.slice(0, 2).map((entry) => ({ group, entry, sort_key: `${group.artwork_group_id}:${entry.source_id}:${entry.term}` }));
  });
}

function selectFamily(rows, family, count, mapper) {
  const selected = [];
  const seenGroups = new Set();
  for (const row of deterministicSort(rows, family)) {
    if (seenGroups.has(row.group.artwork_group_id)) continue;
    selected.push(mapper(row));
    seenGroups.add(row.group.artwork_group_id);
    if (selected.length === count) break;
  }
  if (selected.length !== count) throw new Error(`insufficient ${family} candidates: expected ${count}, found ${selected.length}`);
  return selected;
}

function buildNegativeCandidates(groups) {
  const concepts = [
    "seventeen umbrellas in a volcano",
    "underwater library with nine clocks",
    "checkerboard moon with twelve ladders",
    "glass submarine inside a wheat field",
    "snowstorm with thirty red teapots",
    "floating courthouse made of bananas",
    "desert waterfall with eleven violins",
    "robotic lighthouse wearing six scarves",
    "purple tornado carrying twenty books",
    "subterranean beach with eight chandeliers",
    "frozen jungle with thirteen bicycles",
    "castle made of transparent sandwiches",
    "rainbow cave containing ninety seven moons",
    "wooden spaceship beneath a coral forest",
    "giant pocket watch surrounded by fourteen tents",
  ];
  return concepts.map((concept, index) => {
    const group = groups[index % groups.length];
    return candidate(null, "negative_zero_result", concept, baseIntent({ visual_concepts: [concept] }), [], { valid_zero_result: true, expected_artwork_group_id: null, expected_printing_count: 0 });
  });
}

export function assignEvaluationSplitsV1(rows) {
  if (rows.length !== 250) throw new Error(`evaluation suite must contain exactly 250 queries, found ${rows.length}`);
  return rows.map((row, index) => ({
    query_id: `vsq_${String(index + 1).padStart(4, "0")}`,
    query_suite_version: CARD_VISUAL_SEARCH_QUERY_SUITE_VERSION,
    split: index % 5 === 4 ? "holdout" : "calibration",
    judgment_set_version: CARD_VISUAL_SEARCH_JUDGMENT_VERSION,
    ...row,
  }));
}

export function buildEvaluationQuerySuiteV1(groups) {
  const rows = [];
  const add = (family, candidates) => {
    if (candidates.length !== CARD_VISUAL_SEARCH_QUERY_FAMILY_TARGETS[family]) throw new Error(`${family} target mismatch`);
    rows.push(...candidates);
  };

  const canonicalPool = groups.flatMap((group) => groupEntries(group).filter((entry) => normalizeVisualSearchTextV1(entry.term) !== normalizeVisualSearchTextV1(group.name)).slice(0, 2).map((entry) => ({ group, entry, sort_key: `${group.artwork_group_id}:${entry.source_id}` })));
  add("canonical_subject_visual_fact", selectFamily(canonicalPool, "canonical_subject_visual_fact", 35, ({ group, entry }) => candidate(group, "canonical_subject_visual_fact", `${group.name} ${entry.term}`, baseIntent({ canonical_filters: { subjects: [group.name], set_codes: [], years: null, artist: [] }, visual_concepts: [entry.term] }), [entry])));

  const visualPool = groups.flatMap((group) => {
    const entries = groupEntries(group).filter((entry) => !/scene subject/u.test(normalizeVisualSearchTextV1(entry.term)));
    if (entries.length < 2) return [];
    return [{ group, entries: [entries[0], entries.find((entry) => entry.document_type !== entries[0].document_type) ?? entries[1]], sort_key: group.artwork_group_id }];
  });
  add("visual_only_discovery", selectFamily(visualPool, "visual_only_discovery", 30, ({ group, entries }) => candidate(group, "visual_only_discovery", entries.map((entry) => entry.term).join(" "), baseIntent({ visual_concepts: entries.map((entry) => entry.term) }), entries)));

  const rolePool = groups.flatMap((group) => groupEntries(group, "subject", (entry) => entry.source_type === "subject_role").map((entry) => ({ group, entry, sort_key: `${group.artwork_group_id}:${entry.source_id}` })));
  add("subject_roles", selectFamily(rolePool, "subject_roles", 12, ({ group, entry }) => candidate(group, "subject_roles", `${group.name} ${entry.subject_role}`, baseIntent({ canonical_filters: { subjects: [group.name], set_codes: [], years: null, artist: [] }, subject_roles: [entry.subject_role] }), [entry])));

  const multiPool = groups.flatMap((group) => {
    const entries = groupEntries(group, "subject", (entry) => entry.source_type === "subject_role");
    return entries.length >= 2 ? [{ group, entries: entries.slice(0, 2), sort_key: group.artwork_group_id }] : [];
  });
  add("multi_subject_scenes", selectFamily(multiPool, "multi_subject_scenes", 8, ({ group, entries }) => candidate(group, "multi_subject_scenes", entries.map((entry) => entry.term).join(" and "), baseIntent({ visual_concepts: entries.map((entry) => entry.term), subject_roles: uniqueSorted(entries.map((entry) => entry.subject_role)) }), entries)));

  for (const family of ["anatomy_features", "human_appearance", "pose_action_state", "environment", "objects_counts", "color_light", "composition_style", "effects"]) {
    add(family, selectFamily(familyPool(groups, family), family, CARD_VISUAL_SEARCH_QUERY_FAMILY_TARGETS[family], ({ group, entry }) => candidate(group, family, entry.term, baseIntent({ visual_concepts: [entry.term] }), [entry])));
  }

  const representationPool = groups.flatMap((group) => groupEntries(group, "subject", (entry) => ["depicted_subject", "character_representation"].includes(entry.subject_role)).map((entry) => ({ group, entry, sort_key: `${group.artwork_group_id}:${entry.source_id}` })));
  add("representation_cameo", selectFamily(representationPool, "representation_cameo", 10, ({ group, entry }) => candidate(group, "representation_cameo", entry.term, baseIntent({ visual_concepts: [entry.term], subject_roles: [entry.subject_role] }), [entry])));

  const aliasPool = groups.flatMap((group) => groupEntries(group, null, (entry) => /\b(?:ghost|spectral|wisps?|pumpkins?|bats?|tombstones?|candles?|smoke|vapor|haze|red eyes|half closed eyes|drooping eyelids)\b/u.test(normalizeVisualSearchTextV1(entry.term))).map((entry) => ({ group, entry, sort_key: `${group.artwork_group_id}:${entry.source_id}` })));
  const aliasNames = ["ghostly", "Halloween", "ghostly", "Halloween", "ghostly"];
  let aliasIndex = 0;
  add("alias_intent", selectFamily(aliasPool, "alias_intent", 5, ({ group, entry }) => {
    const alias = aliasNames[aliasIndex];
    aliasIndex += 1;
    return candidate(group, "alias_intent", `${alias} ${entry.term}`, baseIntent({ visual_concepts: [entry.term], query_aliases: [alias] }), [entry]);
  }));

  const metadataPool = groups.flatMap((group) => {
    const setCode = group.printings.map((row) => row.set_code).find(Boolean);
    const entry = groupEntries(group)[0];
    return setCode && entry ? [{ group, entry, setCode, sort_key: `${group.artwork_group_id}:${setCode}` }] : [];
  });
  add("metadata_visual", selectFamily(metadataPool, "metadata_visual", 5, ({ group, entry, setCode }) => candidate(group, "metadata_visual", `${setCode} ${entry.term}`, baseIntent({ canonical_filters: { subjects: [], set_codes: [setCode], years: null, artist: [] }, visual_concepts: [entry.term] }), [entry])));

  const printingPool = groups.filter((group) => group.printings.length > 1).flatMap((group) => {
    const entry = groupEntries(group)[0];
    return entry ? [{ group, entry, sort_key: `${group.artwork_group_id}:${group.printings.length}` }] : [];
  });
  add("printing_expansion", selectFamily(printingPool, "printing_expansion", 10, ({ group, entry }) => candidate(group, "printing_expansion", `${group.name} ${entry.term}`, baseIntent({ canonical_filters: { subjects: [group.name], set_codes: [], years: null, artist: [] }, visual_concepts: [entry.term], printing_filters: ["all_group_members"] }), [entry])));

  add("negative_zero_result", buildNegativeCandidates(groups));
  return assignEvaluationSplitsV1(rows);
}

function entryMatchesConcept(entry, concept) {
  const normalizedEntry = entry.normalized_term ?? normalizeVisualSearchTextV1(entry.term);
  const normalizedConcept = normalizeVisualSearchTextV1(concept);
  if (normalizedEntry === normalizedConcept) return true;
  const entryTokens = new Set(entry.search_tokens ?? tokenizeVisualSearchTextV1(normalizedEntry));
  const conceptTokens = tokenizeVisualSearchTextV1(normalizedConcept);
  return conceptTokens.length > 0 && conceptTokens.every((token) => entryTokens.has(token));
}

function addPosting(postings, key, groupId) {
  if (!key) return;
  if (!postings.has(key)) postings.set(key, new Set());
  postings.get(key).add(groupId);
}

function unionPostings(postings, keys) {
  const result = new Set();
  for (const key of keys) for (const groupId of postings.get(key) ?? []) result.add(groupId);
  return result;
}

function intersectSets(left, right) {
  if (left === null) return new Set(right);
  const result = new Set();
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  for (const value of small) if (large.has(value)) result.add(value);
  return result;
}

export function buildVisualSearchCandidateIndexV1(groups) {
  const start = performance.now();
  const groupsById = new Map();
  const subjectPostings = new Map();
  const setPostings = new Map();
  const branchPostings = new Map();
  const rolePostings = new Map();
  const exactTermPostings = new Map();
  const tokenPostings = new Map();
  let indexedEntries = 0;

  for (const group of groups) {
    groupsById.set(group.artwork_group_id, group);
    addPosting(subjectPostings, normalizeVisualSearchTextV1(group.name), group.artwork_group_id);
    addPosting(branchPostings, normalizeVisualSearchTextV1(group.branch), group.artwork_group_id);
    for (const printing of group.printings) addPosting(setPostings, normalizeVisualSearchTextV1(printing.set_code), group.artwork_group_id);
    const roles = uniqueSorted(Object.values(group.documents).flatMap((document) => document.subject_role_keys ?? []));
    for (const role of roles) addPosting(rolePostings, role, group.artwork_group_id);
    for (const entry of groupEntries(group)) {
      indexedEntries += 1;
      addPosting(exactTermPostings, entry.normalized_term, group.artwork_group_id);
      for (const token of new Set(entry.search_tokens)) addPosting(tokenPostings, token, group.artwork_group_id);
    }
  }

  return {
    version: CARD_VISUAL_SEARCH_CANDIDATE_INDEX_VERSION,
    groups_by_id: groupsById,
    all_group_ids: [...groupsById.keys()].sort(),
    postings: { subject: subjectPostings, set: setPostings, branch: branchPostings, role: rolePostings, exact_term: exactTermPostings, token: tokenPostings },
    stats: {
      artwork_groups: groupsById.size,
      indexed_entries: indexedEntries,
      subject_keys: subjectPostings.size,
      set_keys: setPostings.size,
      branch_keys: branchPostings.size,
      role_keys: rolePostings.size,
      exact_term_keys: exactTermPostings.size,
      token_keys: tokenPostings.size,
      build_latency_ms: performance.now() - start,
    },
  };
}

function candidateGroupIds(query, candidateIndex) {
  const requestedSubjects = query.intent.canonical_filters?.subjects ?? [];
  const requestedSets = query.intent.canonical_filters?.set_codes ?? [];
  const requestedBranches = query.intent.canonical_filters?.branches ?? [];
  const requestedRoles = query.intent.subject_roles ?? [];
  const requestedConcepts = query.intent.visual_concepts ?? [];
  const allowedGroupIds = query.intent.artwork_group_ids ?? [];
  let candidates = null;

  if (allowedGroupIds.length) candidates = intersectSets(candidates, new Set(allowedGroupIds));

  if (requestedSubjects.length) {
    candidates = intersectSets(candidates, unionPostings(candidateIndex.postings.subject, requestedSubjects.map(normalizeVisualSearchTextV1)));
  }
  if (requestedSets.length) {
    candidates = intersectSets(candidates, unionPostings(candidateIndex.postings.set, requestedSets.map(normalizeVisualSearchTextV1)));
  }
  if (requestedBranches.length) {
    candidates = intersectSets(candidates, unionPostings(candidateIndex.postings.branch, requestedBranches.map(normalizeVisualSearchTextV1)));
  }
  for (const role of requestedRoles) candidates = intersectSets(candidates, candidateIndex.postings.role.get(role) ?? new Set());
  for (const concept of requestedConcepts) {
    const normalizedConcept = normalizeVisualSearchTextV1(concept);
    const exact = candidateIndex.postings.exact_term.get(normalizedConcept) ?? new Set();
    const tokens = tokenizeVisualSearchTextV1(normalizedConcept);
    let tokenCandidates = null;
    for (const token of tokens) tokenCandidates = intersectSets(tokenCandidates, candidateIndex.postings.token.get(token) ?? new Set());
    const conceptCandidates = new Set(exact);
    for (const groupId of tokenCandidates ?? []) conceptCandidates.add(groupId);
    candidates = intersectSets(candidates, conceptCandidates);
  }
  return [...(candidates ?? candidateIndex.all_group_ids)].sort();
}

function parsedCountEntry(entry) {
  if (entry.source_type !== "count") return null;
  const match = normalizeVisualSearchTextV1(entry.term).match(/^(.*?) count exact (\d+)$/u);
  if (!match) return null;
  return { label: match[1], exact_count: Number.parseInt(match[2], 10) };
}

function countConstraintMatches(entry, constraint) {
  const parsed = parsedCountEntry(entry);
  if (!parsed || parsed.exact_count !== constraint.exact_count) return false;
  const requestedTokens = tokenizeVisualSearchTextV1(constraint.label);
  const entryTokens = new Set(tokenizeVisualSearchTextV1(parsed.label));
  return requestedTokens.length > 0 && requestedTokens.every((token) => entryTokens.has(token) || entryTokens.has(token.replace(/s$/u, "")));
}

export function rankVisualSearchQueryV1(query, groups, { topK = 25, candidateIndex = null } = {}) {
  const start = performance.now();
  const results = [];
  const requestedSubjects = query.intent.canonical_filters?.subjects ?? [];
  const requestedSets = query.intent.canonical_filters?.set_codes ?? [];
  const requestedBranches = query.intent.canonical_filters?.branches ?? [];
  const requestedRoles = query.intent.subject_roles ?? [];
  const requestedConcepts = query.intent.visual_concepts ?? [];
  const requestedCounts = query.intent.count_constraints ?? [];

  const candidateGroups = candidateIndex
    ? candidateGroupIds(query, candidateIndex).map((groupId) => candidateIndex.groups_by_id.get(groupId))
    : groups;
  for (const group of candidateGroups) {
    if (requestedSubjects.length && !requestedSubjects.some((name) => normalizeVisualSearchTextV1(name) === normalizeVisualSearchTextV1(group.name))) continue;
    if (requestedSets.length && !requestedSets.some((setCode) => group.printings.some((printing) => normalizeVisualSearchTextV1(printing.set_code) === normalizeVisualSearchTextV1(setCode)))) continue;
    if (requestedBranches.length && !requestedBranches.some((branch) => normalizeVisualSearchTextV1(branch) === normalizeVisualSearchTextV1(group.branch))) continue;
    const roles = uniqueSorted(Object.values(group.documents).flatMap((document) => document.subject_role_keys ?? []));
    if (requestedRoles.length && !requestedRoles.every((role) => roles.includes(role))) continue;
    const entries = groupEntries(group);
    const matchedEvidence = [];
    let countsSatisfied = true;
    for (const constraint of requestedCounts) {
      const matches = entries.filter((entry) => countConstraintMatches(entry, constraint));
      if (!matches.length) {
        countsSatisfied = false;
        break;
      }
      matchedEvidence.push(...matches.slice(0, 3).map((entry) => ({
        query_concept: `${constraint.exact_count} ${constraint.label}`,
        search_document_id: entry.search_document_id,
        document_type: entry.document_type,
        source_type: entry.source_type,
        source_id: entry.source_id,
        term: entry.term,
        subject_role: entry.subject_role,
        supporting_observation_ids: entry.supporting_observation_ids,
        confidence: entry.confidence,
      })));
    }
    if (!countsSatisfied) continue;
    let conceptsSatisfied = true;
    for (const concept of requestedConcepts) {
      const matches = entries.filter((entry) => entryMatchesConcept(entry, concept));
      if (!matches.length) {
        conceptsSatisfied = false;
        break;
      }
      matchedEvidence.push(...matches.slice(0, 3).map((entry) => ({
        query_concept: concept,
        search_document_id: entry.search_document_id,
        document_type: entry.document_type,
        source_type: entry.source_type,
        source_id: entry.source_id,
        term: entry.term,
        subject_role: entry.subject_role,
        supporting_observation_ids: entry.supporting_observation_ids,
        confidence: entry.confidence,
      })));
    }
    if (!conceptsSatisfied) continue;

    const confidenceValues = matchedEvidence.map((entry) => entry.confidence).filter(Number.isFinite);
    const confidence = confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : 0.75;
    const scoreComponents = {
      canonical_filter: requestedSubjects.length ? 20 : 0,
      metadata_filter: requestedSets.length ? 8 : 0,
      branch_filter: requestedBranches.length ? 6 : 0,
      subject_role: requestedRoles.length ? 8 : 0,
      exact_count: requestedCounts.length * 10,
      structured_visual: requestedConcepts.length * 10,
      evidence_confidence: confidence * 2,
      tier_adjustment: group.tier === "A" ? 1 : 0.9,
    };
    const subtotal = scoreComponents.canonical_filter + scoreComponents.metadata_filter + scoreComponents.branch_filter + scoreComponents.subject_role + scoreComponents.exact_count + scoreComponents.structured_visual + scoreComponents.evidence_confidence;
    results.push({
      artwork_group_id: group.artwork_group_id,
      representative_card_print_id: group.representative_card_print_id,
      representative_name: group.name,
      prompt_branch: group.branch,
      eligibility_tier: group.tier,
      score: subtotal * scoreComponents.tier_adjustment,
      score_components: scoreComponents,
      matched_subject_roles: requestedRoles,
      matched_evidence: matchedEvidence,
      matching_printings: group.printings.map((printing) => ({ card_print_id: printing.card_print_id, gv_id: printing.gv_id, name: printing.name, set_code: printing.set_code, number: printing.number, artwork_fact_source: printing.artwork_fact_source, variant_image_status: printing.variant_image_status, print_marker_evidence_status: printing.print_marker_evidence_status })),
      unmatched_query_terms: [],
    });
  }
  results.sort((left, right) => right.score - left.score || left.artwork_group_id.localeCompare(right.artwork_group_id));
  return { results: results.slice(0, topK), total_matches: results.length, candidate_groups_scanned: candidateGroups.length, latency_ms: performance.now() - start };
}

function percentile(values, value) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)];
}

function evaluateCalibration(query, ranked) {
  const expected = query.expected_artwork_group_id;
  const rank = expected ? ranked.results.findIndex((row) => row.artwork_group_id === expected) + 1 : 0;
  const referenceFindings = ranked.results.flatMap((result) => result.matched_evidence.flatMap((evidence) => evidence.supporting_observation_ids?.length ? [] : [`missing_observation_reference:${result.artwork_group_id}:${evidence.source_id}`]));
  const printingResult = expected ? ranked.results.find((row) => row.artwork_group_id === expected) : null;
  const printingExpansionCorrect = expected ? printingResult?.matching_printings.length === query.expected_printing_count : true;
  const zeroCorrect = query.valid_zero_result ? ranked.total_matches === 0 : null;
  const failures = [];
  if (expected && !rank) failures.push({ failure_class: "correct_result_missing", repair_lane: "structured_filtering_or_lexical_retrieval" });
  if (query.valid_zero_result && !zeroCorrect) failures.push({ failure_class: "incorrect_result_included", repair_lane: "query_parser_or_structured_filtering" });
  if (!printingExpansionCorrect) failures.push({ failure_class: "correct_artwork_wrong_printing_expansion", repair_lane: "artwork_grouping_printing_mapping" });
  if (referenceFindings.length) failures.push({ failure_class: "evidence_explanation_mismatch", repair_lane: "deterministic_projection", findings: referenceFindings });
  return { rank, recall_at_10: rank > 0 && rank <= 10, recall_at_25: rank > 0 && rank <= 25, reciprocal_rank: rank ? 1 / rank : 0, zero_result_correct: zeroCorrect, printing_expansion_correct: printingExpansionCorrect, explanation_references_valid: referenceFindings.length === 0, failures };
}

function countBy(rows, selector) {
  const result = {};
  for (const row of rows) {
    const key = selector(row);
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

async function hashManifest(outputDir, files) {
  const entries = {};
  for (const file of files) entries[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  return { artifact_kind: "card_visual_search_evaluation_bootstrap_v1_hash_manifest", hash_algorithm: "sha256", generated_at: nowIso(), directory: posixRelative(outputDir), file_count: files.length, files: entries };
}

function markdownReport(report) {
  const m = report.metrics;
  return `# Card Visual Search Evaluation Bootstrap V1\n\nGenerated: ${report.created_at}\n\n## Result\n\n- Reconciled: \`${report.reconciliation.reconciled}\`\n- Official evaluation passed: \`false\`\n- Candidate queries: \`${report.query_suite.total_queries}\`\n- Calibration queries run: \`${m.calibration_queries}\`\n- Holdout queries run: \`0\`\n- Bootstrap Recall@10: \`${m.bootstrap_recall_at_10}\`\n- Bootstrap Recall@25: \`${m.bootstrap_recall_at_25}\`\n- Bootstrap MRR: \`${m.bootstrap_mrr}\`\n- Valid-zero accuracy: \`${m.valid_zero_result_accuracy}\`\n- Explanation reference validity: \`${m.explanation_reference_validity}\`\n- Failures: \`${m.failure_count}\`\n\n## Interpretation\n\nThis is a source-derived self-retrieval baseline, not human gold relevance evaluation. Precision@10, nDCG@10, unsupported-match rate, semantic false positives, and official release thresholds remain unmeasured.\n\n## Boundaries\n\nNo provider calls, database connections or writes, approvals, embeddings, index writes, holdout evaluation, or public reads occurred.\n\n## Exact Next Gate\n\nReview and freeze the candidate query suite, collect human artwork-first judgments, and lock baseline thresholds before executing the 50-query holdout.\n`;
}

export async function loadVisualSearchProjectionV1(projectionDir) {
  const report = await readJson(path.join(projectionDir, "PROJECTION_RECONCILIATION.json"));
  if (report.version !== EXPECTED_PROJECTION_VERSION || report.reconciliation?.reconciled !== true) throw new Error("projection input is not locked reconciled V1.5");
  const manifest = await readJson(path.join(projectionDir, "artifact_hashes.json"));
  const hashMismatches = [];
  for (const [file, expected] of Object.entries(manifest.files ?? {})) {
    const actual = sha256Buffer(await fs.readFile(path.join(projectionDir, file)));
    if (actual !== expected) hashMismatches.push({ file, expected, actual });
  }
  if (hashMismatches.length) throw new Error(`projection artifact hash mismatches: ${hashMismatches.length}`);
  const [artworks, printings, documents] = await Promise.all([
    readJsonl(path.join(projectionDir, "visual_search_artworks.jsonl")),
    readJsonl(path.join(projectionDir, "visual_search_printings.jsonl")),
    readJsonl(path.join(projectionDir, "visual_search_documents.jsonl"), (document) => ({
      search_document_id: document.search_document_id,
      artwork_group_id: document.artwork_group_id,
      document_type: document.document_type,
      projection_status: document.projection_status,
      canonical_context: document.canonical_context,
      subject_role_keys: document.subject_role_keys,
      structured_concepts: document.structured_concepts,
      document_hash: document.document_hash,
    })),
  ]);
  const groups = new Map(artworks.map((row) => [row.artwork_group_id, {
    artwork_group_id: row.artwork_group_id,
    representative_card_print_id: row.representative_card_print_id,
    name: null,
    branch: row.prompt_branch,
    tier: row.eligibility_tier,
    documents: {},
    printings: [],
  }]));
  for (const printing of printings) groups.get(printing.artwork_group_id)?.printings.push(printing);
  for (const document of documents) {
    const group = groups.get(document.artwork_group_id);
    if (!group) throw new Error(`document references unknown artwork group ${document.artwork_group_id}`);
    group.name = document.canonical_context.name;
    group.documents[document.document_type] = document;
  }
  for (const group of groups.values()) {
    group.printings.sort((left, right) => left.card_print_id.localeCompare(right.card_print_id));
    if (!group.name || Object.keys(group.documents).length !== 3 || !group.printings.length) throw new Error(`incomplete projection group ${group.artwork_group_id}`);
  }
  return { report, manifest, groups: [...groups.values()].sort((left, right) => left.artwork_group_id.localeCompare(right.artwork_group_id)), artworks, printings, documents };
}

export async function runCardVisualSearchEvaluationBootstrapV1(args = parseCardVisualSearchEvaluationBootstrapArgsV1([])) {
  const git = currentGitState();
  if (git.branch !== CARD_VISUAL_CORPUS_EXPECTED_BRANCH) throw new Error(`expected branch ${CARD_VISUAL_CORPUS_EXPECTED_BRANCH}, found ${git.branch}`);
  if (git.tracked_status_short) throw new Error(`tracked working tree must be clean: ${git.tracked_status_short}`);
  if (!Number.isInteger(args.topK) || args.topK < 25 || args.topK > 100) throw new Error("top-k must be an integer from 25 through 100");
  const projectionDir = repoPath(args.projectionDir);
  const projection = await loadVisualSearchProjectionV1(projectionDir);
  const candidateIndex = buildVisualSearchCandidateIndexV1(projection.groups);
  const inputHashes = {
    projection_reconciliation: sha256Buffer(await fs.readFile(path.join(projectionDir, "PROJECTION_RECONCILIATION.json"))),
    projection_artifact_manifest: sha256Buffer(await fs.readFile(path.join(projectionDir, "artifact_hashes.json"))),
    projection_documents: sha256Buffer(await fs.readFile(path.join(projectionDir, "visual_search_documents.jsonl"))),
  };
  const runKey = sha256JsonV1({ version: CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_VERSION, commit_sha: git.commit_sha, projection_version: projection.report.version, input_hashes: inputHashes, family_targets: CARD_VISUAL_SEARCH_QUERY_FAMILY_TARGETS, top_k: args.topK });
  const outputDir = args.outputDir ? repoPath(args.outputDir) : path.join(repoPath(args.outputRoot), `${safeTimestamp()}_bootstrap_${runKey.slice(0, 12)}`);
  const runPlan = {
    version: CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_VERSION,
    created_at: nowIso(),
    run_key: runKey,
    commit_sha: git.commit_sha,
    branch: git.branch,
    tracked_worktree_clean: true,
    projection_dir: posixRelative(projectionDir),
    projection_version: projection.report.version,
    query_suite_version: CARD_VISUAL_SEARCH_QUERY_SUITE_VERSION,
    judgment_set_version: CARD_VISUAL_SEARCH_JUDGMENT_VERSION,
    planned_queries: 250,
    planned_calibration_queries: 200,
    sealed_holdout_queries: 50,
    top_k: args.topK,
    candidate_index_version: candidateIndex.version,
    candidate_index_mode: "in_memory_read_only",
    family_targets: CARD_VISUAL_SEARCH_QUERY_FAMILY_TARGETS,
    input_hashes_sha256: inputHashes,
    boundaries: { provider_calls: false, database_connection: false, database_writes: false, approvals: false, embeddings: false, index_writes: false, holdout_execution: false, public_reads: false },
  };
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);
  await writeJson(path.join(outputDir, "candidate_index_summary.json"), { version: candidateIndex.version, mode: "in_memory_read_only", ...candidateIndex.stats });

  const suite = buildEvaluationQuerySuiteV1(projection.groups);
  const publicSuite = suite.map((query) => {
    const { expected_artwork_group_id, expected_printing_count, source_evidence, ...publicQuery } = query;
    return query.split === "holdout"
      ? { ...publicQuery, bootstrap_candidate_judgment: null, holdout_judgment_status: "sealed_not_executed" }
      : { ...publicQuery, bootstrap_candidate_judgment: { authority: "source_derived_candidate_not_human_gold", expected_artwork_group_id, expected_printing_count, source_evidence } };
  });
  const holdoutSeals = suite.filter((query) => query.split === "holdout").map((query) => ({ query_id: query.query_id, seal_algorithm: "sha256_json_v1", expected_judgment_seal: sha256JsonV1({ query_id: query.query_id, artwork_group_id: query.expected_artwork_group_id, printing_count: query.expected_printing_count, source_evidence: query.source_evidence }) }));
  const calibrationQueries = suite.filter((query) => query.split === "calibration");
  await writeJsonl(path.join(outputDir, "query_suite.jsonl"), publicSuite);
  await writeJsonl(path.join(outputDir, "holdout_judgment_seals.jsonl"), holdoutSeals);

  const rankedOutputs = [];
  const failures = [];
  const evaluations = [];
  for (const query of calibrationQueries) {
    const ranked = rankVisualSearchQueryV1(query, projection.groups, { topK: args.topK, candidateIndex });
    const evaluation = evaluateCalibration(query, ranked);
    rankedOutputs.push({ query_id: query.query_id, family: query.family, query_text: query.query_text, intent: query.intent, latency_ms: ranked.latency_ms, candidate_groups_scanned: ranked.candidate_groups_scanned, total_matches: ranked.total_matches, results: ranked.results, bootstrap_evaluation: evaluation });
    evaluations.push({ query, ranked, evaluation });
    failures.push(...evaluation.failures.map((failure) => ({ query_id: query.query_id, family: query.family, query_text: query.query_text, ...failure })));
  }

  const positive = evaluations.filter(({ query }) => !query.valid_zero_result);
  const negative = evaluations.filter(({ query }) => query.valid_zero_result);
  const latency = evaluations.map(({ ranked }) => ranked.latency_ms);
  const familyDistributions = countBy(suite, (row) => row.family);
  const splitDistributions = countBy(suite, (row) => row.split);
  const metrics = {
    calibration_queries: calibrationQueries.length,
    positive_calibration_queries: positive.length,
    negative_calibration_queries: negative.length,
    bootstrap_recall_at_10: positive.length ? positive.filter(({ evaluation }) => evaluation.recall_at_10).length / positive.length : null,
    bootstrap_recall_at_25: positive.length ? positive.filter(({ evaluation }) => evaluation.recall_at_25).length / positive.length : null,
    bootstrap_mrr: positive.length ? positive.reduce((sum, { evaluation }) => sum + evaluation.reciprocal_rank, 0) / positive.length : null,
    valid_zero_result_accuracy: negative.length ? negative.filter(({ evaluation }) => evaluation.zero_result_correct).length / negative.length : null,
    explanation_reference_validity: evaluations.length ? evaluations.filter(({ evaluation }) => evaluation.explanation_references_valid).length / evaluations.length : null,
    printing_expansion_accuracy: positive.length ? positive.filter(({ evaluation }) => evaluation.printing_expansion_correct).length / positive.length : null,
    failure_count: failures.length,
    candidate_index: candidateIndex.stats,
    candidate_groups_scanned: { p50: percentile(evaluations.map(({ ranked }) => ranked.candidate_groups_scanned), 0.5), p95: percentile(evaluations.map(({ ranked }) => ranked.candidate_groups_scanned), 0.95), max: Math.max(...evaluations.map(({ ranked }) => ranked.candidate_groups_scanned)) },
    latency_ms: { p50: percentile(latency, 0.5), p95: percentile(latency, 0.95), p99: percentile(latency, 0.99), max: latency.length ? Math.max(...latency) : null },
    unavailable_without_human_gold: ["precision_at_10", "ndcg_at_10", "unsupported_match_rate", "subject_role_confusion_rate", "alias_overreach_rate"],
  };
  const reconciliationFindings = [];
  if (suite.length !== 250) reconciliationFindings.push("query_count_mismatch");
  if (splitDistributions.calibration !== 200 || splitDistributions.holdout !== 50) reconciliationFindings.push("split_count_mismatch");
  for (const [family, expected] of Object.entries(CARD_VISUAL_SEARCH_QUERY_FAMILY_TARGETS)) if (familyDistributions[family] !== expected) reconciliationFindings.push(`family_count_mismatch:${family}`);
  if (rankedOutputs.length !== 200) reconciliationFindings.push("ranked_output_count_mismatch");
  if (holdoutSeals.length !== 50) reconciliationFindings.push("holdout_seal_count_mismatch");
  const report = {
    version: CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_VERSION,
    created_at: nowIso(),
    run_plan: runPlan,
    query_suite: { total_queries: suite.length, split_distribution: splitDistributions, family_distribution: familyDistributions, authority: "candidate_suite_source_derived_not_human_gold", holdout_executed: false },
    metrics,
    reconciliation: { reconciled: reconciliationFindings.length === 0, findings: reconciliationFindings },
    decision: { bootstrap_status: failures.length ? "candidate_baseline_has_failures" : "candidate_baseline_complete", official_evaluation_status: "not_run_missing_human_gold_judgments", threshold_status: "not_locked" },
  };

  const files = ["run_plan.json", "candidate_index_summary.json", "query_suite.jsonl", "holdout_judgment_seals.jsonl", "ranked_outputs.jsonl", "evaluation_failures.jsonl", "BOOTSTRAP_EVALUATION_REPORT.json", "BOOTSTRAP_EVALUATION_REPORT.md"];
  await writeJsonl(path.join(outputDir, "ranked_outputs.jsonl"), rankedOutputs);
  await writeJsonl(path.join(outputDir, "evaluation_failures.jsonl"), failures);
  await writeJson(path.join(outputDir, "BOOTSTRAP_EVALUATION_REPORT.json"), report);
  await fs.writeFile(path.join(outputDir, "BOOTSTRAP_EVALUATION_REPORT.md"), markdownReport(report));
  await writeJson(path.join(outputDir, "artifact_hashes.json"), await hashManifest(outputDir, files));
  return { outputDir, report };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runCardVisualSearchEvaluationBootstrapV1(parseCardVisualSearchEvaluationBootstrapArgsV1(argv));
  console.log(`[card-visual-search-evaluation-bootstrap] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-search-evaluation-bootstrap] queries=${result.report.query_suite.total_queries}`);
  console.log(`[card-visual-search-evaluation-bootstrap] calibration=${result.report.metrics.calibration_queries}`);
  console.log(`[card-visual-search-evaluation-bootstrap] failures=${result.report.metrics.failure_count}`);
  console.log(`[card-visual-search-evaluation-bootstrap] reconciled=${result.report.reconciliation.reconciled}`);
  if (!result.report.reconciliation.reconciled) process.exitCode = 1;
}
