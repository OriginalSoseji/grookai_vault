import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CARD_VISUAL_CORPUS_EXPECTED_BRANCH,
  sha256JsonV1,
} from "./card_visual_corpus_v1_inventory.mjs";

export const CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION = "CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_INVENTORY_DIR = "docs/audits/card_visual_corpus_v1/2026-07-21T15-51-01-795Z_inventory_3f72560c3b04";
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_search_eligibility_v1_4";
const POKEMON_IDENTITY_MAP_PATH = "lib/services/identity/pokemon_japanese_name_map.dart";
const EXPECTED_PROMPT_VERSION = "CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2";
const EXPECTED_SCHEMA_VERSION = "CARD_VISUAL_FACT_GRAPH_SCHEMA_V2";
const EXPECTED_AGENT_VERSION = "CARD_VISUAL_DESCRIPTION_AGENT_V1";
const ALLOWED_REVIEW_STATUSES = new Set(["pending", "needs_review"]);
const SEARCH_PROJECTION_TYPES = Object.freeze(["subject", "scene", "style_composition"]);

const CRITICAL_FLAGS = new Set([
  "potential_primary_subject_mismatch",
  "potential_canonical_name_visual_conflict",
  "potential_subject_kind_classification_confusion",
  "potential_unavailable_metadata_prompt_branch_mismatch",
]);

const FLAG_GUARDS = new Map([
  ["potential_module_incomplete_or_low_evidence", "module_completeness"],
  ["potential_module_review_conflicts_with_entries", "module_completeness"],
  ["potential_empty_module_marked_complete", "module_completeness"],
  ["potential_count_reference_inconsistent", "counts"],
  ["potential_salient_object_missing_count_reference", "counts"],
  ["potential_subject_count_mismatch", "counts"],
  ["potential_speculative_setting_language", "environment_setting"],
  ["potential_overconfident_ambiguous_setting", "environment_setting"],
  ["potential_weather_field_alignment_missing", "weather_time"],
  ["potential_pose_or_action_without_visible_support", "pose_action_state"],
  ["potential_dramatic_inferred_action_language", "pose_action_state"],
  ["potential_primary_subject_anatomy_overclaim", "anatomy"],
  ["potential_creature_language_on_non_pokemon_branch", "subject_semantics"],
  ["potential_generic_franchise_language_on_non_pokemon_branch", "subject_semantics"],
  ["potential_canonical_metadata_in_visual_output", "metadata_terms"],
  ["potential_metadata_or_identity_language", "metadata_terms"],
  ["potential_canonical_metadata_in_fact_grounded_search_terms", "metadata_terms"],
  ["potential_semantic_tag_nonvisual_concept", "metadata_terms"],
  ["semantic_tags_metadata_or_generic_removed", "metadata_terms"],
  ["potential_object_material_or_card_surface_confusion", "material_surface"],
  ["potential_visual_material_vs_surface_confusion", "material_surface"],
  ["potential_surface_cue_without_observation_support", "material_surface"],
  ["potential_surface_overclaim", "material_surface"],
  ["potential_border_color_certainty_issue", "material_surface"],
  ["variant_specific_print_marker_not_confirmed_by_image", "print_markers"],
  ["potential_unsupported_personality_or_species_interpretation", "expression_personality_mood"],
  ["potential_cross_field_expression_contradiction", "expression_personality_mood"],
  ["potential_unsupported_emotion_or_personality_claim", "expression_personality_mood"],
  ["potential_interpretive_mood_language", "expression_personality_mood"],
  ["potential_interpretive_claim", "expression_personality_mood"],
  ["potential_card_ui_text_in_artwork_search_terms", "card_ui_terms"],
  ["semantic_tags_missing_after_sanitization", "search_term_fallback"],
  ["potential_generic_filler", "search_term_fallback"],
]);

const POLICY_RULE_GUARDS = new Map([
  ["shared_artwork_image_does_not_confirm_variant_print_markers", "print_markers"],
  ["type_like_visual_claim_requires_visible_support", "metadata_terms"],
  ["pokemon_personality_or_expression_requires_review", "expression_personality_mood"],
  ["trainer_personality_or_expression_requires_visible_support", "expression_personality_mood"],
  ["surface_claim_requires_physical_evidence", "material_surface"],
  ["border_color_claim_requires_deterministic_visual_evidence", "material_surface"],
]);

const IMAGE_LIMITATION_PATTERN = /^(low_resolution|cropped_subject|blurred_image|visible_text_uncertain|partial_|partially_|blurred_|small_|text_uncertain|hp_text_|name_text_)/;
const IDENTITY_STOP_TOKENS = new Set([
  "adult",
  "card",
  "character",
  "creature",
  "delta",
  "female",
  "human",
  "male",
  "pokemon",
  "pokémon",
  "scene",
  "species",
  "subject",
  "unknown",
  "with",
]);
const HUMAN_IDENTITY_PATTERN = /\b(adult|boy|child|female|girl|human|male|man|person|trainer|woman)\b/i;
const ENERGY_NAME_SUFFIX_PATTERN = /(?:^|[\s_-])(energy|energie|énergie|energia|energía)$/iu;
const CJK_ENERGY_NAME_SUFFIX_PATTERN = /(?:エネルギー|에너지|能量)$/u;
const KANA_ROMAJI = new Map(Object.entries({
  ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o",
  カ: "ka", キ: "ki", ク: "ku", ケ: "ke", コ: "ko", ガ: "ga", ギ: "gi", グ: "gu", ゲ: "ge", ゴ: "go",
  サ: "sa", シ: "shi", ス: "su", セ: "se", ソ: "so", ザ: "za", ジ: "ji", ズ: "zu", ゼ: "ze", ゾ: "zo",
  タ: "ta", チ: "chi", ツ: "tsu", テ: "te", ト: "to", ダ: "da", ヂ: "ji", ヅ: "zu", デ: "de", ド: "do",
  ナ: "na", ニ: "ni", ヌ: "nu", ネ: "ne", ノ: "no",
  ハ: "ha", ヒ: "hi", フ: "fu", ヘ: "he", ホ: "ho", バ: "ba", ビ: "bi", ブ: "bu", ベ: "be", ボ: "bo", パ: "pa", ピ: "pi", プ: "pu", ペ: "pe", ポ: "po",
  マ: "ma", ミ: "mi", ム: "mu", メ: "me", モ: "mo", ヤ: "ya", ユ: "yu", ヨ: "yo",
  ラ: "ra", リ: "ri", ル: "ru", レ: "re", ロ: "ro", ワ: "wa", ヰ: "i", ヱ: "e", ヲ: "o", ン: "n", ヴ: "vu",
  キャ: "kya", キュ: "kyu", キョ: "kyo", ギャ: "gya", ギュ: "gyu", ギョ: "gyo",
  シャ: "sha", シュ: "shu", ショ: "sho", ジャ: "ja", ジュ: "ju", ジョ: "jo",
  チャ: "cha", チュ: "chu", チョ: "cho", ニャ: "nya", ニュ: "nyu", ニョ: "nyo",
  ヒャ: "hya", ヒュ: "hyu", ヒョ: "hyo", ビャ: "bya", ビュ: "byu", ビョ: "byo", ピャ: "pya", ピュ: "pyu", ピョ: "pyo",
  ミャ: "mya", ミュ: "myu", ミョ: "myo", リャ: "rya", リュ: "ryu", リョ: "ryo",
  ファ: "fa", フィ: "fi", フェ: "fe", フォ: "fo", ティ: "ti", ディ: "di", ウィ: "wi", ウェ: "we", ウォ: "wo",
}));

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/g, "/");
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value = nowIso()) {
  return value.replace(/[:.]/g, "-");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseEligibilityArgsV1(argv = []) {
  return {
    inventoryDir: parseFlag(argv, "inventory-dir") ?? DEFAULT_INVENTORY_DIR,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    concurrency: Number.parseInt(parseFlag(argv, "concurrency") ?? "32", 10),
  };
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function gitValue(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function currentGitState() {
  return {
    commit_sha: gitValue(["rev-parse", "HEAD"]),
    branch: gitValue(["branch", "--show-current"]),
    tracked_status_short: gitValue(["status", "--short", "--untracked-files=no"]),
  };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row) ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function moduleLimitations(graph) {
  const limitations = [];
  for (const review of graph?.module_reviews ?? []) {
    const reasons = [];
    if (["high", "unknown"].includes(review.omission_risk)) reasons.push(`omission_risk:${review.omission_risk}`);
    if (["low", "unknown"].includes(review.evidence_quality)) reasons.push(`evidence_quality:${review.evidence_quality}`);
    if (review.review_status === "uncertain") reasons.push("review_status:uncertain");
    if (reasons.length) limitations.push({ module: review.module, reasons });
  }
  return limitations;
}

function guardForFlag(flag) {
  if (FLAG_GUARDS.has(flag)) return FLAG_GUARDS.get(flag);
  if (IMAGE_LIMITATION_PATTERN.test(flag)) return "image_or_text_visibility";
  return null;
}

function identityTokens(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/の/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length >= 3 && !IDENTITY_STOP_TOKENS.has(token));
}

function normalizedIdentityName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function isEnergyCardEvidenceV1(generatedRow, inventoryRow = {}) {
  if (generatedRow?.prompt_branch === "energy" || inventoryRow?.prompt_branch === "energy") return true;
  if ([generatedRow?.card_supertype, generatedRow?.card_subtype, generatedRow?.card_category]
    .some((value) => normalizedIdentityName(value) === "energy")) return true;
  const name = String(generatedRow?.name ?? inventoryRow?.name ?? "").normalize("NFKC").trim();
  return ENERGY_NAME_SUFFIX_PATTERN.test(name) || CJK_ENERGY_NAME_SUFFIX_PATTERN.test(name);
}

function pokemonNamedCard(name, pokemonIdentityNames) {
  if (!pokemonIdentityNames?.length) return false;
  const normalized = normalizedIdentityName(name);
  if (!normalized) return false;
  return pokemonIdentityNames.some((identity) => normalized === identity || normalized.startsWith(`${identity} `));
}

function normalizedNameContainsIdentity(normalizedName, normalizedIdentity) {
  if (!normalizedName || !normalizedIdentity) return false;
  if (/[^\u0000-\u024f]/u.test(normalizedIdentity)) return normalizedName.includes(normalizedIdentity);
  return ` ${normalizedName} `.includes(` ${normalizedIdentity} `);
}

function katakana(value) {
  return [...String(value ?? "")].map((character) => {
    const code = character.codePointAt(0);
    return code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : character;
  }).join("");
}

function kanaToRomaji(value) {
  const source = [...katakana(value)];
  let result = "";
  let geminate = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "ッ") {
      geminate = true;
      continue;
    }
    if (character === "ー") {
      const vowel = result.match(/[aeiou](?!.*[aeiou])/u)?.[0];
      if (vowel) result += vowel;
      continue;
    }
    const pair = `${character}${source[index + 1] ?? ""}`;
    let syllable = KANA_ROMAJI.get(pair);
    if (syllable) index += 1;
    else syllable = KANA_ROMAJI.get(character) ?? "";
    if (!syllable) continue;
    if (geminate && /^[bcdfghjklmnpqrstvwxyz]/u.test(syllable)) syllable = `${syllable[0]}${syllable}`;
    geminate = false;
    result += syllable;
  }
  return result;
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function subjectIdentityMatchesAlias(normalizedSubject, alias) {
  if (normalizedNameContainsIdentity(normalizedSubject, alias)) return true;
  if (!/^[a-z0-9 ]+$/u.test(alias) || alias.length < 5) return false;
  const candidates = normalizedSubject.split(/\s+/u).filter((token) => /^[a-z0-9]+$/u.test(token) && token.length >= 4);
  return candidates.some((candidate) => {
    const maximumDistance = Math.max(1, Math.floor(Math.max(candidate.length, alias.length) * 0.12));
    return editDistance(candidate, alias) <= maximumDistance;
  });
}

function pokemonAliasesForCanonicalName(name, context = {}) {
  const normalized = normalizedIdentityName(name);
  if (!normalized || !Array.isArray(context.pokemonIdentityPairs)) return [];
  return uniqueSorted(context.pokemonIdentityPairs
    .filter((pair) => pair.aliases.some((alias) => normalizedNameContainsIdentity(normalized, alias)))
    .flatMap((pair) => pair.aliases));
}

function primarySubjectIdentityMatches(generatedRow, graph, context = {}) {
  const expectedValues = [generatedRow?.pokemon_name, generatedRow?.name]
    .filter((value) => value && value !== "not_applicable");
  const expectedTokens = uniqueSorted(expectedValues.flatMap(identityTokens));
  const canonicalAliases = pokemonAliasesForCanonicalName(generatedRow?.name, context);
  if (!expectedTokens.length && !canonicalAliases.length) return false;
  return (graph?.subjects ?? []).some((subject) => {
    if (subject?.subject_kind !== "scene_subject") return false;
    const subjectTokens = identityTokens(subject.identity);
    const tokenMatch = subjectTokens.some((subjectToken) => expectedTokens.some((expectedToken) => (
      subjectToken === expectedToken
      || (subjectToken.length >= 5 && expectedToken.includes(subjectToken))
      || (expectedToken.length >= 5 && subjectToken.includes(expectedToken))
    )));
    if (tokenMatch) return true;
    const normalizedSubject = normalizedIdentityName(subject.identity);
    return canonicalAliases.some((alias) => subjectIdentityMatchesAlias(normalizedSubject, alias));
  });
}

function subjectRolesAreStructurallySeparated(graph) {
  const subjects = Array.isArray(graph?.subjects) ? graph.subjects : [];
  const depicted = Array.isArray(graph?.depicted_subjects) ? graph.depicted_subjects : [];
  const representations = Array.isArray(graph?.character_representations) ? graph.character_representations : [];
  if (!subjects.length) return false;
  if (subjects.some((subject) => subject?.subject_kind !== "scene_subject" || !subject?.observation_id)) return false;

  const categoryIds = [subjects, depicted, representations].map((entries) => new Set(entries.map((entry) => entry?.observation_id).filter(Boolean)));
  for (let left = 0; left < categoryIds.length; left += 1) {
    for (let right = left + 1; right < categoryIds.length; right += 1) {
      if ([...categoryIds[left]].some((id) => categoryIds[right].has(id))) return false;
    }
  }
  return true;
}

function hasHumanAppearanceEvidence(graph) {
  const module = graph?.modules?.human_appearance;
  if (module && [
    "fact_ids",
    "visible_body_regions",
    "facial_evidence",
    "hair",
    "gestures",
    "accessories",
  ].some((key) => Array.isArray(module[key]) && module[key].length > 0)) return true;
  if ((graph?.typed_facts ?? []).some((fact) => fact?.module === "human_appearance")) return true;
  return (graph?.subjects ?? []).some((subject) => HUMAN_IDENTITY_PATTERN.test(String(subject?.identity ?? "")));
}

function branchProfileCriticalReasons(generatedRow, graph, context = {}) {
  const reasons = [];
  const branch = generatedRow?.prompt_branch;
  const hasHuman = hasHumanAppearanceEvidence(graph);
  const hasSceneSubject = (graph?.subjects ?? []).some((subject) => subject?.subject_kind === "scene_subject");
  if (branch === "pokemon" && !hasSceneSubject) reasons.push("prompt_branch_profile_conflict:pokemon_without_scene_subject");
  if (branch === "pokemon" && Array.isArray(context.pokemonIdentityPairs)) {
    const canonicalAliases = pokemonAliasesForCanonicalName(generatedRow?.name, context);
    if (!canonicalAliases.length) reasons.push("prompt_branch_profile_conflict:pokemon_branch_without_known_pokemon_identity");
    else if (hasSceneSubject && !primarySubjectIdentityMatches(generatedRow, graph, context)) {
      reasons.push("prompt_branch_profile_conflict:pokemon_without_matching_canonical_subject");
    }
  }
  if (branch === "trainer" && !hasHuman) reasons.push("prompt_branch_profile_conflict:trainer_without_human_evidence");
  if (branch === "stadium" && hasHuman) reasons.push("prompt_branch_profile_conflict:stadium_with_human_evidence");
  if (branch === "stadium" && /\btrainer\b/i.test(String(generatedRow?.name ?? ""))) {
    reasons.push("prompt_branch_profile_conflict:stadium_with_trainer_named_card");
  }
  if (["stadium", "trainer"].includes(branch) && pokemonNamedCard(generatedRow?.name, context.pokemonIdentityNames)) {
    reasons.push("prompt_branch_profile_conflict:non_pokemon_branch_with_pokemon_named_card");
  }
  return reasons;
}

function reviewedCriticalFlagDisposition(flag, generatedRow, graph, context = {}) {
  if (flag === "potential_primary_subject_mismatch" && primarySubjectIdentityMatches(generatedRow, graph, context)) {
    return {
      disposition: "downgraded_to_guarded_review",
      reason: "base_subject_identity_matches_canonical_name",
      guard_key: "subject_semantics",
    };
  }
  if (flag === "potential_subject_kind_classification_confusion" && subjectRolesAreStructurallySeparated(graph)) {
    return {
      disposition: "downgraded_to_guarded_review",
      reason: "subject_role_collections_are_structurally_separated",
      guard_key: "subject_semantics",
    };
  }
  if (flag === "potential_unavailable_metadata_prompt_branch_mismatch" && primarySubjectIdentityMatches(generatedRow, graph, context)) {
    return {
      disposition: "downgraded_to_guarded_review",
      reason: "canonical_subject_is_visibly_present_despite_secondary_non_pokemon_evidence",
      guard_key: "subject_semantics",
    };
  }
  return null;
}

function decisionBase(inventoryRow) {
  return {
    policy_version: CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION,
    card_print_id: inventoryRow.card_print_id,
    gv_id: inventoryRow.gv_id ?? null,
    name: inventoryRow.name ?? null,
    source: inventoryRow.source,
    source_outcome: inventoryRow.outcome_class,
    source_generated_row_sha256: inventoryRow.generated_row_sha256 ?? null,
    source_fact_graph_sha256: inventoryRow.fact_graph_sha256 ?? null,
    prompt_branch: inventoryRow.prompt_branch ?? null,
    review_status: inventoryRow.review_status ?? null,
    artwork_group_id: null,
    artwork_group_status: inventoryRow.outcome_class === "valid" ? "pending_grouping" : "not_available",
  };
}

export function classifyEligibilityV1(generatedRow, inventoryRow, context = {}) {
  const qualityFlags = uniqueSorted(generatedRow?.quality_flags ?? []);
  const policyResults = Array.isArray(generatedRow?.policy_results) ? generatedRow.policy_results : [];
  const qualityDetails = Array.isArray(generatedRow?.quality_flag_details) ? generatedRow.quality_flag_details : [];
  const graph = generatedRow?.visual_attributes?.fact_graph;
  const criticalReasons = [];
  const reviewReasons = [];
  const guardKeys = [];
  const unknownFlags = [];
  const unknownPolicyRules = [];
  const reviewedFlagReclassifications = [];

  if (!graph || !Array.isArray(graph.observations)) criticalReasons.push("missing_fact_graph_or_observations");
  if (!inventoryRow.generated_row_sha256 || sha256JsonV1(generatedRow) !== inventoryRow.generated_row_sha256) criticalReasons.push("generated_row_hash_mismatch");
  if (!inventoryRow.fact_graph_sha256 || (graph && sha256JsonV1(graph) !== inventoryRow.fact_graph_sha256)) criticalReasons.push("fact_graph_hash_mismatch");
  if (generatedRow?.prompt_version !== EXPECTED_PROMPT_VERSION) criticalReasons.push("unexpected_prompt_version");
  if (generatedRow?.output_schema_version !== EXPECTED_SCHEMA_VERSION) criticalReasons.push("unexpected_schema_version");
  if (generatedRow?.agent_version !== EXPECTED_AGENT_VERSION) criticalReasons.push("unexpected_agent_version");
  const energyCardDetected = isEnergyCardEvidenceV1(generatedRow, inventoryRow);
  if (energyCardDetected) criticalReasons.push("energy_card_excluded");
  if (!ALLOWED_REVIEW_STATUSES.has(generatedRow?.review_status)) criticalReasons.push("unsupported_review_status");
  if ((generatedRow?.identity_input_confidence ?? 0) < 0.8) criticalReasons.push("identity_confidence_below_0_80");
  if ((generatedRow?.attribute_confidence ?? 0) < 0.8) criticalReasons.push("attribute_confidence_below_0_80");
  criticalReasons.push(...branchProfileCriticalReasons(generatedRow, graph, context));

  for (const flag of qualityFlags) {
    if (CRITICAL_FLAGS.has(flag)) {
      const reviewedDisposition = reviewedCriticalFlagDisposition(flag, generatedRow, graph, context);
      if (reviewedDisposition) {
        reviewedFlagReclassifications.push({ flag, ...reviewedDisposition });
        guardKeys.push(reviewedDisposition.guard_key);
        reviewReasons.push(`reviewed_critical_flag:${flag}:${reviewedDisposition.reason}`);
        continue;
      }
      criticalReasons.push(`critical_flag:${flag}`);
      continue;
    }
    const guard = guardForFlag(flag);
    if (!guard) {
      unknownFlags.push(flag);
      criticalReasons.push(`unknown_quality_flag:${flag}`);
      continue;
    }
    guardKeys.push(guard);
    reviewReasons.push(`quality_flag:${flag}`);
  }

  for (const result of policyResults) {
    const rule = result.policy_rule ?? result.rule;
    const guard = POLICY_RULE_GUARDS.get(rule);
    if (!guard) {
      unknownPolicyRules.push(rule ?? "missing_rule");
      criticalReasons.push(`unknown_policy_rule:${rule ?? "missing_rule"}`);
      continue;
    }
    guardKeys.push(guard);
    reviewReasons.push(`policy_rule:${rule}`);
  }

  const limitations = moduleLimitations(graph);
  if (limitations.length) {
    guardKeys.push("module_completeness");
    reviewReasons.push("module_review_limitation");
  }
  if ((generatedRow?.image_quality_score ?? 0) < 0.75) {
    guardKeys.push("image_or_text_visibility");
    reviewReasons.push("image_quality_below_0_75");
  }
  if (generatedRow?.image_source === "representative_image_url") {
    guardKeys.push("print_markers");
    reviewReasons.push("representative_image_source");
  }
  if (generatedRow?.review_status === "needs_review" && !reviewReasons.length && !criticalReasons.length) {
    reviewReasons.push("source_review_status_needs_review");
  }

  let tier = "A";
  if (criticalReasons.length) tier = "C";
  else if (qualityFlags.length || policyResults.length || reviewReasons.length || limitations.length || generatedRow?.review_status !== "pending") tier = "B";

  const decision = {
    ...decisionBase(inventoryRow),
    tier,
    search_eligible: tier !== "C",
    rank_adjustment_key: tier === "A" ? "tier_a" : tier === "B" ? "tier_b" : "excluded",
    allowed_projection_types: tier === "C" ? [] : [...SEARCH_PROJECTION_TYPES],
    projection_guard_keys: uniqueSorted(guardKeys),
    critical_reasons: uniqueSorted(criticalReasons),
    review_reasons: uniqueSorted(reviewReasons),
    quality_flags: qualityFlags,
    unknown_quality_flags: uniqueSorted(unknownFlags),
    unknown_policy_rules: uniqueSorted(unknownPolicyRules),
    reviewed_flag_reclassifications: reviewedFlagReclassifications,
    flagged_evidence: qualityDetails.map((detail) => ({
      flag: detail.flag ?? null,
      field: detail.field ?? null,
      matched_text: detail.matched_text ?? null,
      guard_key: guardForFlag(detail.flag),
    })),
    module_limitations: limitations,
    confidence: {
      identity_input: generatedRow?.identity_input_confidence ?? null,
      description: generatedRow?.description_confidence ?? null,
      attributes: generatedRow?.attribute_confidence ?? null,
      image_quality: generatedRow?.image_quality_score ?? null,
    },
    image_source: generatedRow?.image_source ?? null,
    energy_card_detected: energyCardDetected,
  };
  decision.decision_sha256 = sha256JsonV1(decision);
  return decision;
}

export function classifySourceGapV1(inventoryRow) {
  const energyCardDetected = isEnergyCardEvidenceV1(null, inventoryRow);
  const decision = {
    ...decisionBase(inventoryRow),
    tier: "C",
    search_eligible: false,
    rank_adjustment_key: "excluded",
    allowed_projection_types: [],
    projection_guard_keys: [],
    critical_reasons: [`source_gap:${inventoryRow.outcome_class}`],
    review_reasons: [],
    quality_flags: [],
    unknown_quality_flags: [],
    unknown_policy_rules: [],
    flagged_evidence: [],
    module_limitations: [],
    confidence: null,
    image_source: null,
    energy_card_detected: energyCardDetected,
  };
  decision.decision_sha256 = sha256JsonV1(decision);
  return decision;
}

async function mapConcurrent(items, concurrency, mapper) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 128) throw new Error("concurrency must be between 1 and 128");
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function loadGeneratedRows(validRows, inventoryPlan, concurrency) {
  const dbExportPath = repoPath(inventoryPlan.sources.database_saved_export);
  const dbExport = await readJson(dbExportPath);
  const databaseRows = new Map((dbExport.records ?? []).map((record) => [record.card_print_id, record.generated_row]));
  return mapConcurrent(validRows, concurrency, async (inventoryRow) => {
    if (inventoryRow.source === "private_database_apply_1000") {
      return databaseRows.get(inventoryRow.card_print_id) ?? null;
    }
    const artifact = await readJson(repoPath(inventoryRow.source_artifact_path));
    return artifact.generated_row ?? null;
  });
}

async function loadPokemonIdentityContext() {
  const source = await fs.readFile(repoPath(POKEMON_IDENTITY_MAP_PATH), "utf8");
  const names = new Set();
  const pairs = [];
  const entryPattern = /^\s*'([^']+)'\s*:\s*'([^']+)'\s*,?\s*$/gmu;
  for (const match of source.matchAll(entryPattern)) {
    const romanized = kanaToRomaji(match[1]);
    const aliases = uniqueSorted([match[1], match[2], romanized].map(normalizedIdentityName));
    if (aliases.length) pairs.push({ aliases });
    for (const value of [match[1], match[2]]) {
      const normalized = normalizedIdentityName(value);
      if (normalized) names.add(normalized);
    }
  }
  if (names.size < 1000) throw new Error(`Pokemon identity map unexpectedly small: ${names.size}`);
  return {
    pokemonIdentityNames: [...names].sort((left, right) => right.length - left.length || left.localeCompare(right)),
    pokemonIdentityPairs: pairs,
  };
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function markdownReport(report) {
  const c = report.counts;
  const tierRows = Object.entries(report.distributions.tiers).map(([tier, count]) => `| ${tier} | ${count} |`).join("\n");
  const guardRows = Object.entries(report.distributions.projection_guards).map(([key, count]) => `| ${key} | ${count} |`).join("\n");
  const criticalRows = Object.entries(report.distributions.critical_reasons).map(([key, count]) => `| ${key} | ${count} |`).join("\n");
  return `# Card Visual Search Eligibility V1\n\nGenerated: ${report.created_at}\n\n## Result\n\n- Reconciled: \`${report.reconciled}\`\n- Producing commit: \`${report.run_plan.commit_sha}\`\n- Source IDs: \`${c.source_ids}\`\n- Tier A: \`${c.tier_a}\`\n- Tier B: \`${c.tier_b}\`\n- Tier C: \`${c.tier_c}\`\n- Search eligible: \`${c.search_eligible}\`\n- Source-gap Tier C: \`${c.source_gap_tier_c}\`\n- Critical valid-row Tier C: \`${c.valid_row_tier_c}\`\n- Unknown quality flags: \`${c.unknown_quality_flags}\`\n- Unknown policy rules: \`${c.unknown_policy_rules}\`\n- Energy rows eligible: \`${c.energy_rows_eligible}\`\n- Reconciliation findings: \`${report.findings.length}\`\n\n## Tiers\n\n| Tier | Count |\n| --- | ---: |\n${tierRows}\n\n## Projection Guards\n\n| Guard | Decisions |\n| --- | ---: |\n${guardRows || "| none | 0 |"}\n\n## Critical Reasons\n\n| Reason | Decisions |\n| --- | ---: |\n${criticalRows || "| none | 0 |"}\n\n## Boundaries\n\nNo provider calls, database connections or writes, approvals, embeddings, artwork grouping, projections, index writes, or public reads occurred. Decisions are offline policy artifacts only.\n\n## Exact Next Gate\n\nReview a deterministic stratified sample across Tier A, each Tier B guard class, and each valid-row Tier C reason. If the policy audit passes, freeze eligibility and begin fail-closed artwork grouping.\n`;
}

async function createHashManifest(outputDir, files) {
  const entries = {};
  for (const file of files) entries[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  return {
    artifact_kind: "card_visual_search_eligibility_v1_hash_manifest",
    hash_algorithm: "sha256",
    generated_at: nowIso(),
    directory: posixRelative(outputDir),
    file_count: files.length,
    files: entries,
  };
}

export async function runEligibilityV1(args = parseEligibilityArgsV1([])) {
  const git = currentGitState();
  if (git.branch !== CARD_VISUAL_CORPUS_EXPECTED_BRANCH) throw new Error(`expected branch ${CARD_VISUAL_CORPUS_EXPECTED_BRANCH}, found ${git.branch}`);
  if (git.tracked_status_short) throw new Error(`tracked working tree must be clean: ${git.tracked_status_short}`);

  const inventoryDir = repoPath(args.inventoryDir);
  const inventoryReportPath = path.join(inventoryDir, "CORPUS_SOURCE_RECONCILIATION.json");
  const validPath = path.join(inventoryDir, "corpus_valid_candidates.jsonl");
  const gapsPath = path.join(inventoryDir, "corpus_coverage_gaps.jsonl");
  const [inventoryReport, validRows, gapRows] = await Promise.all([readJson(inventoryReportPath), readJsonl(validPath), readJsonl(gapsPath)]);
  if (!inventoryReport.reconciliation?.reconciled) throw new Error("source inventory is not reconciled");

  const inputHashes = {
    inventory_report: sha256Buffer(await fs.readFile(inventoryReportPath)),
    valid_candidates: sha256Buffer(await fs.readFile(validPath)),
    coverage_gaps: sha256Buffer(await fs.readFile(gapsPath)),
  };
  const runKey = sha256JsonV1({ version: CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION, commit_sha: git.commit_sha, input_hashes: inputHashes });
  const outputDir = args.outputDir ? repoPath(args.outputDir) : path.join(repoPath(args.outputRoot), `${safeTimestamp()}_eligibility_${runKey.slice(0, 12)}`);
  const runPlan = {
    version: CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION,
    created_at: nowIso(),
    run_key: runKey,
    commit_sha: git.commit_sha,
    branch: git.branch,
    tracked_worktree_clean: true,
    inventory_dir: posixRelative(inventoryDir),
    inventory_run_key: inventoryReport.run_plan.run_key,
    input_hashes_sha256: inputHashes,
    expected_source_ids: inventoryReport.reconciliation.counts.source_rows_total,
    expected_valid_candidates: inventoryReport.reconciliation.counts.valid_rows_total,
    expected_coverage_gaps: inventoryReport.reconciliation.counts.coverage_gaps_total,
    concurrency: args.concurrency,
    boundaries: {
      provider_calls: false,
      database_connection: false,
      database_writes: false,
      approvals: false,
      embeddings: false,
      artwork_grouping: false,
      search_projections: false,
      index_writes: false,
      public_reads: false,
    },
  };
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);

  const [generatedRows, pokemonIdentityContext] = await Promise.all([
    loadGeneratedRows(validRows, inventoryReport.run_plan, args.concurrency),
    loadPokemonIdentityContext(),
  ]);
  const validDecisions = validRows.map((row, index) => classifyEligibilityV1(generatedRows[index], row, pokemonIdentityContext));
  const gapDecisions = gapRows.map((row) => classifySourceGapV1(row));
  const decisions = [...validDecisions, ...gapDecisions];
  const findings = [];
  const duplicateIds = duplicates(decisions.map((row) => row.card_print_id));
  if (duplicateIds.length) findings.push(`duplicate_decision_ids:${duplicateIds.length}`);
  if (decisions.length !== runPlan.expected_source_ids) findings.push(`source_decision_count_mismatch:${decisions.length}`);
  if (validDecisions.length !== runPlan.expected_valid_candidates) findings.push(`valid_decision_count_mismatch:${validDecisions.length}`);
  if (gapDecisions.length !== runPlan.expected_coverage_gaps) findings.push(`gap_decision_count_mismatch:${gapDecisions.length}`);
  const unknownQualityFlags = validDecisions.flatMap((row) => row.unknown_quality_flags);
  const unknownPolicyRules = validDecisions.flatMap((row) => row.unknown_policy_rules);
  if (unknownQualityFlags.length) findings.push(`unknown_quality_flags:${uniqueSorted(unknownQualityFlags).join(",")}`);
  if (unknownPolicyRules.length) findings.push(`unknown_policy_rules:${uniqueSorted(unknownPolicyRules).join(",")}`);
  const invalidTierA = validDecisions.filter((row) => row.tier === "A" && (row.quality_flags.length || row.review_reasons.length || row.critical_reasons.length || row.module_limitations.length));
  if (invalidTierA.length) findings.push(`tier_a_contains_limitations:${invalidTierA.length}`);
  const energyEligible = decisions.filter((row) => row.energy_card_detected && row.search_eligible);
  if (energyEligible.length) findings.push(`energy_rows_eligible:${energyEligible.length}`);

  const tierA = decisions.filter((row) => row.tier === "A");
  const tierB = decisions.filter((row) => row.tier === "B");
  const tierC = decisions.filter((row) => row.tier === "C");
  const report = {
    version: CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION,
    created_at: nowIso(),
    run_plan: runPlan,
    reconciled: findings.length === 0,
    findings,
    counts: {
      source_ids: decisions.length,
      tier_a: tierA.length,
      tier_b: tierB.length,
      tier_c: tierC.length,
      search_eligible: tierA.length + tierB.length,
      source_gap_tier_c: gapDecisions.length,
      valid_row_tier_c: validDecisions.filter((row) => row.tier === "C").length,
      unknown_quality_flags: uniqueSorted(unknownQualityFlags).length,
      unknown_policy_rules: uniqueSorted(unknownPolicyRules).length,
      energy_rows_eligible: energyEligible.length,
      duplicate_decision_ids: duplicateIds.length,
    },
    distributions: {
      tiers: countBy(decisions, (row) => row.tier),
      tier_by_source: countBy(decisions, (row) => `${row.source}:${row.tier}`),
      tier_by_branch: countBy(decisions, (row) => `${row.prompt_branch ?? "unknown"}:${row.tier}`),
      projection_guards: countBy(tierB.flatMap((row) => row.projection_guard_keys.map((guard) => ({ guard }))), (row) => row.guard),
      critical_reasons: countBy(tierC.flatMap((row) => row.critical_reasons.map((reason) => ({ reason }))), (row) => row.reason),
      quality_flags: countBy(validDecisions.flatMap((row) => row.quality_flags.map((flag) => ({ flag }))), (row) => row.flag),
    },
  };

  const files = [
    "run_plan.json",
    "eligibility_decisions.jsonl",
    "tier_a_decisions.jsonl",
    "tier_b_decisions.jsonl",
    "tier_c_decisions.jsonl",
    "ELIGIBILITY_RECONCILIATION.json",
    "ELIGIBILITY_RECONCILIATION.md",
  ];
  await writeJsonl(path.join(outputDir, "eligibility_decisions.jsonl"), decisions);
  await writeJsonl(path.join(outputDir, "tier_a_decisions.jsonl"), tierA);
  await writeJsonl(path.join(outputDir, "tier_b_decisions.jsonl"), tierB);
  await writeJsonl(path.join(outputDir, "tier_c_decisions.jsonl"), tierC);
  await writeJson(path.join(outputDir, "ELIGIBILITY_RECONCILIATION.json"), report);
  await writeText(path.join(outputDir, "ELIGIBILITY_RECONCILIATION.md"), markdownReport(report));
  await writeJson(path.join(outputDir, "artifact_hashes.json"), await createHashManifest(outputDir, files));
  return { outputDir, report };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runEligibilityV1(parseEligibilityArgsV1(argv));
  console.log(`[card-visual-search-eligibility] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-search-eligibility] tier_a=${result.report.counts.tier_a}`);
  console.log(`[card-visual-search-eligibility] tier_b=${result.report.counts.tier_b}`);
  console.log(`[card-visual-search-eligibility] tier_c=${result.report.counts.tier_c}`);
  console.log(`[card-visual-search-eligibility] reconciled=${result.report.reconciled}`);
  if (!result.report.reconciled) process.exitCode = 1;
}
