import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import http from "node:http";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import {
  buildVisualSearchCandidateIndexV1,
  loadVisualSearchProjectionV1,
  normalizeVisualSearchTextV1,
  rankVisualSearchQueryV1,
  tokenizeVisualSearchTextV1,
  visualSearchGroupEntriesV1,
} from "./card_visual_search_evaluation_bootstrap_v1.mjs";
import { grookaiImageUrlV1 } from "./card_visual_search_judgment_packet_v1.mjs";
import {
  loadPokemonVisualIdentityLexiconV1,
  pokemonIdentityMatchesTextV1,
} from "./card_visual_search_pokemon_identity_v1.mjs";
import {
  attachCuratedCameoEvidenceV1,
  loadCuratedCameoReferenceRowsV1,
  loadReviewedVisualEvidenceV1,
} from "./card_visual_search_curated_cameo_v1.mjs";
import {
  applyCardVisualSearchEvidenceSuppressionsV1,
  loadCardVisualSearchEvidenceSuppressionsV1,
} from "./card_visual_search_evidence_suppression_v1.mjs";
import {
  detectCollectorSubjectGroupsV1,
  normalizeCollectorQueryAliasesV1,
  parseHoldingRelationshipV1,
  parseMinimumPokemonCountV1,
} from "./card_visual_search_collector_query_v1.mjs";

export const CARD_VISUAL_SEARCH_LAB_VERSION = "CARD_VISUAL_SEARCH_LAB_V2";
export const CARD_VISUAL_SEARCH_QUERY_PARSER_VERSION = "CARD_VISUAL_SEARCH_QUERY_PARSER_V2";
export const CARD_VISUAL_SEARCH_UNIFIED_EVIDENCE_VERSION =
  "CARD_VISUAL_SEARCH_UNIFIED_EVIDENCE_V2";
export const UNIFIED_COLLECTOR_SEARCH_INTENT_VERSION =
  "UNIFIED_COLLECTOR_SEARCH_INTENT_V2";
export const UNIFIED_COLLECTOR_SEARCH_RESPONSE_VERSION =
  "UNIFIED_COLLECTOR_SEARCH_RESPONSE_V2";

const INDEPENDENT_APPEARANCE_ROLES = new Set([
  "scene_subject",
  "depicted_subject",
]);
const UNQUALIFIED_IDENTITY_ROLES = new Set([
  ...INDEPENDENT_APPEARANCE_ROLES,
  "character_representation",
]);

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_PROJECTION_DIR = "docs/audits/card_visual_search_projection_v1_5/2026-07-21T17-23-42-102Z_projection_c3e708b1cd15";
const DEFAULT_CORPUS_INVENTORY = "docs/audits/card_visual_corpus_v1/2026-07-21T15-51-01-795Z_inventory_3f72560c3b04/corpus_valid_candidates.jsonl";
const DEFAULT_UI_PATH = "backend/card_descriptions/card_visual_search_lab_v1.html";
const DEFAULT_REVIEWED_EVIDENCE =
  "docs/evidence/card_visual_search_founder_reviews_v1.json";
const DEFAULT_EVIDENCE_SUPPRESSIONS =
  "docs/evidence/card_visual_search_founder_suppressions_v1.json";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const QUERY_GRAMMAR = new Set([
  "a", "all", "an", "art", "artwork", "artworks", "as", "card", "cards", "depicting", "every", "featuring", "find", "for",
  "image", "images", "is", "looking", "me", "of", "or", "please", "show", "shown", "that", "the", "to", "visible", "where",
  "with", "wearing", "shaped", "together",
]);
const CONNECTORS = new Set(["and", "at", "behind", "beside", "by", "from", "in", "inside", "near", "on", "over", "under", "with"]);
const NUMBER_WORDS = new Map([
  ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5], ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10],
  ["eleven", 11], ["twelve", 12], ["thirteen", 13], ["fourteen", 14], ["fifteen", 15], ["sixteen", 16], ["seventeen", 17],
  ["eighteen", 18], ["nineteen", 19], ["twenty", 20],
]);

const ALIAS_DEFINITIONS = Object.freeze({
  ghostly: {
    phrases: ["ghostly"],
    decision: "one strong ghost-form cue or two distinct weak spectral cues",
  },
  halloween: {
    phrases: ["halloween", "halloween themed", "halloween theme"],
    decision: "two distinct visible Halloween cue families",
  },
  altered_state_visual_cues: {
    phrases: ["stoner", "stoner looking", "smoked out", "under the influence", "stoned", "high"],
    decision: "smoke or vapor plus red-eye or eyelid cues, or an explicit smoking-object cue",
  },
});

const SUBJECT_ROLE_RULES = Object.freeze([
  { role: "character_representation", filter: "representation_form", value: "cookie", pattern: /\bshaped cookies?\b/u },
  { role: "character_representation", filter: "representation_form", value: "food shape", pattern: /\bshaped (?:cookies?|cakes?|cand(?:y|ies)|pastr(?:y|ies)|desserts?|sweets?|ice creams?)\b/u },
  { role: "character_representation", filter: "representation_form", value: "food shape", pattern: /\bas (?:a |an )?food(?: item)?\b/u },
  { role: "character_representation", filter: "representation_form", value: "food shape", pattern: /\bfood shapes?\b/u },
  { role: "character_representation", filter: "representation_form", value: "ice cream", pattern: /\bice creams?\b/u },
  { role: "character_representation", filter: "representation_form", value: "plush", pattern: /\bplush(?: toys?)?\b/u },
  { role: "character_representation", filter: "representation_form", value: "pillow", pattern: /\bpillows?\b/u },
  { role: "character_representation", filter: "representation_form", value: "statue", pattern: /\bstatues?\b/u },
  { role: "character_representation", filter: "representation_form", value: "toy", pattern: /\btoys?\b/u },
  { role: "character_representation", filter: "representation_form", value: "pin", pattern: /\b(?:pins?|badges?|hair clips?)\b/u },
  { role: "character_representation", filter: "representation_form", value: "costume", pattern: /\bcostumes?\b/u },
  { role: "character_representation", filter: "representation_form", value: "logo", pattern: /\blogos?\b/u },
  { role: "character_representation", filter: "representation_form", value: "sticker", pattern: /\bstickers?\b/u },
  { role: "character_representation", filter: "representation_form", value: "pattern", pattern: /\bpatterns?\b/u },
  { role: "character_representation", filter: null, value: null, pattern: /\bshaped like\b/u },
  { role: "depicted_subject", filter: "depicted_surface", value: "card", pattern: /\bcard within card\b/u },
  { role: "depicted_subject", filter: "depicted_surface", value: "photograph", pattern: /\b(?:photographs?|photos?)\b/u },
  { role: "depicted_subject", filter: "depicted_surface", value: "poster", pattern: /\bposters?\b/u },
  { role: "depicted_subject", filter: "depicted_surface", value: "screen", pattern: /\bscreens?\b/u },
  { role: "depicted_subject", filter: "depicted_surface", value: "painting", pattern: /\bpaintings?\b/u },
  { role: "depicted_subject", filter: "depicted_surface", value: "sign", pattern: /\bsigns?\b/u },
  { role: "depicted_subject", filter: "depicted_surface", value: "book", pattern: /\bbooks?\b/u },
  { role: "depicted_subject", filter: null, value: null, pattern: /\bdepicted\b/u },
  { role: "scene_subject", filter: null, value: null, pattern: /\b(?:scene subject|physically present)\b/u },
  { role: "visual_resemblance_reference", filter: null, value: null, pattern: /\b(?:lookalikes?|resemblances?|looks? like|inspired by)\b/u },
]);

const ROLE_FILTER_PATTERNS = Object.freeze({
  "food shape": /\bfood shapes?\b/u,
  cookie: /\bcookies?\b/u,
  "ice cream": /\bice creams?\b/u,
  plush: /\bplush(?: toys?)?\b/u,
  pillow: /\bpillows?\b/u,
  statue: /\bstatues?\b/u,
  toy: /\btoys?\b/u,
  pin: /\b(?:pins?|badges?|hair clips?)\b/u,
  costume: /\bcostumes?\b/u,
  logo: /\blogos?\b/u,
  sticker: /\bstickers?\b/u,
  pattern: /\bpatterns?\b/u,
  card: /\bcards?\b/u,
  photograph: /\b(?:photographs?|photos?)\b/u,
  poster: /\bposters?\b/u,
  screen: /\bscreens?\b/u,
  painting: /\bpaintings?\b/u,
  sign: /\bsigns?\b/u,
  book: /\bbooks?\b/u,
});
const CARD_UI_EVIDENCE_PATTERN = /\b(?:card ui|card interface|set symbol|edition stamp|rarity symbol|hp text|attack text|copyright|weakness|resistance|retreat|collector number)\b/u;
const FOOD_APPEARANCE_PATTERN = /\b(?:food|ice cream|dessert|cake|cookie|pastry|bread|candy|chocolate|rice ball|sushi)\b/u;
const POKEMON_IDENTITY_LEXICON = loadPokemonVisualIdentityLexiconV1();
const POKEMON_IDENTITY_SET = new Set(POKEMON_IDENTITY_LEXICON.names);
const POKEMON_IDENTITY_MAX_TOKENS = Math.max(
  ...POKEMON_IDENTITY_LEXICON.names.map((name) => name.split(" ").length),
);

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseCardVisualSearchLabArgsV1(argv = []) {
  return {
    projectionDir: parseFlag(argv, "projection-dir") ?? DEFAULT_PROJECTION_DIR,
    corpusInventory: parseFlag(argv, "corpus-inventory") ?? DEFAULT_CORPUS_INVENTORY,
    artifactRoot: parseFlag(argv, "artifact-root"),
    cameoReference:
      parseFlag(argv, "cameo-reference") ??
      process.env.CARD_VISUAL_SEARCH_CAMEO_REFERENCE ??
      null,
    reviewedEvidence:
      parseFlag(argv, "reviewed-evidence") ??
      process.env.CARD_VISUAL_SEARCH_REVIEWED_EVIDENCE ??
      DEFAULT_REVIEWED_EVIDENCE,
    evidenceSuppressions:
      parseFlag(argv, "evidence-suppressions") ??
      process.env.CARD_VISUAL_SEARCH_EVIDENCE_SUPPRESSIONS ??
      DEFAULT_EVIDENCE_SUPPRESSIONS,
    uiPath: parseFlag(argv, "ui-path") ?? DEFAULT_UI_PATH,
    host: parseFlag(argv, "host") ?? "127.0.0.1",
    port: Number.parseInt(parseFlag(argv, "port") ?? "4177", 10),
  };
}

function queryNormalize(value) {
  return normalizeVisualSearchTextV1(value).replace(/(?<=\p{L})-(?=\p{L})/gu, " ");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function removePhrase(value, phrase) {
  return ` ${value} `.replace(new RegExp(` ${escapeRegex(phrase)} `, "gu"), " ").replace(/\s+/gu, " ").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function tokenVariants(token) {
  const variants = [token];
  if (token.endsWith("ies") && token.length > 4) variants.push(`${token.slice(0, -3)}y`);
  if (token.endsWith("es") && token.length > 4) variants.push(token.slice(0, -2));
  if (token.endsWith("s") && token.length > 3) variants.push(token.slice(0, -1));
  return unique(variants);
}

function numberValue(token) {
  if (NUMBER_WORDS.has(token)) return NUMBER_WORDS.get(token);
  if (/^\d{1,3}$/u.test(token)) return Number.parseInt(token, 10);
  return null;
}

function aliasPhraseInQuery(normalizedQuery, phrase) {
  if (phrase !== "high") return ` ${normalizedQuery} `.includes(` ${phrase} `);
  if (!` ${normalizedQuery} `.includes(" high ")) return false;
  return !/\bhigh (?:angle|contrast|lights?|saturation|value)\b/u.test(normalizedQuery);
}

export function buildVisualSearchParserIndexV1(groups, candidateIndex = buildVisualSearchCandidateIndexV1(groups)) {
  const canonicalNameByNormalized = new Map();
  for (const group of groups) {
    for (const entry of visualSearchGroupEntriesV1(group)) {
      if (entry.cameo_identity) {
        canonicalNameByNormalized.set(
          normalizeVisualSearchTextV1(entry.cameo_identity),
          entry.cameo_identity,
        );
      }
    }
  }
  for (const group of groups) {
    canonicalNameByNormalized.set(
      normalizeVisualSearchTextV1(group.name),
      group.name,
    );
  }
  const subjects = [...candidateIndex.postings.subject.keys()]
    .filter(Boolean)
    .map((normalized) => ({ normalized, canonical: canonicalNameByNormalized.get(normalized) ?? normalized }))
    .sort((left, right) => right.normalized.split(" ").length - left.normalized.split(" ").length || right.normalized.length - left.normalized.length || left.normalized.localeCompare(right.normalized));
  return {
    candidate_index: candidateIndex,
    subjects,
    exact_terms: new Set(candidateIndex.postings.exact_term.keys()),
    term_tokens: new Set(candidateIndex.postings.token.keys()),
    set_codes: new Set(candidateIndex.postings.set.keys()),
  };
}

function parseCountConstraints(tokens, consumed) {
  const constraints = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (consumed.has(index)) continue;
    const exactCount = numberValue(tokens[index]);
    if (exactCount === null) continue;
    const labelTokens = [];
    let cursor = index + 1;
    while (cursor < tokens.length && ["visible", "of"].includes(tokens[cursor])) cursor += 1;
    while (cursor < tokens.length && labelTokens.length < 4 && !CONNECTORS.has(tokens[cursor]) && numberValue(tokens[cursor]) === null) {
      if (!QUERY_GRAMMAR.has(tokens[cursor])) labelTokens.push(tokens[cursor]);
      cursor += 1;
    }
    if (!labelTokens.length) continue;
    constraints.push({ label: labelTokens.join(" "), exact_count: exactCount });
    for (let used = index; used < cursor; used += 1) consumed.add(used);
  }
  return constraints;
}

function parseVisualConcepts(tokens, consumed, parserIndex) {
  const concepts = [];
  const unrecognized = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (consumed.has(index) || QUERY_GRAMMAR.has(tokens[index]) || CONNECTORS.has(tokens[index])) continue;
    let matched = null;
    let matchedLength = 0;
    for (let length = Math.min(5, tokens.length - index); length >= 2; length -= 1) {
      const positions = Array.from({ length }, (_, offset) => index + offset);
      if (positions.some((position) => consumed.has(position) || QUERY_GRAMMAR.has(tokens[position]) || CONNECTORS.has(tokens[position]))) continue;
      const phrase = tokens.slice(index, index + length).join(" ");
      if (parserIndex.exact_terms.has(phrase)) {
        matched = phrase;
        matchedLength = length;
        break;
      }
    }
    if (matched) {
      concepts.push(matched);
      for (let offset = 0; offset < matchedLength; offset += 1) consumed.add(index + offset);
      continue;
    }
    const resolved = tokenVariants(tokens[index]).find((variant) => parserIndex.term_tokens.has(variant));
    if (resolved) concepts.push(resolved);
    else unrecognized.push(tokens[index]);
    consumed.add(index);
  }
  return { concepts: unique(concepts), unrecognized_terms: unique(unrecognized) };
}

function splitContrastiveClarificationV1(value) {
  const match = String(value ?? "").match(/^(.+?)\s+not\s+(.+)$/u);
  if (!match) {
    return {
      positive_text: value,
      negative_text: null,
    };
  }
  return {
    positive_text: match[1].trim(),
    negative_text: match[2].trim(),
  };
}

export function parseVisualSearchQueryV1(queryText, parserIndex) {
  const originalQuery = String(queryText ?? "").trim();
  if (originalQuery.length < 2 || originalQuery.length > 180) throw new Error("query must contain 2 through 180 characters");
  const collectorAliases = normalizeCollectorQueryAliasesV1(originalQuery);
  const contrastive = splitContrastiveClarificationV1(
    collectorAliases.normalized,
  );
  let working = contrastive.positive_text;
  const rawSetMatch = originalQuery.match(/\bset\s*:\s*([\p{L}\p{N}._-]+)\b/iu);
  const setCodes = [];
  if (rawSetMatch) {
    const normalizedSet = normalizeVisualSearchTextV1(rawSetMatch[1]);
    if (parserIndex.set_codes.has(normalizedSet)) setCodes.push(rawSetMatch[1]);
    working = working.replace(/\bset\s+[\p{L}\p{N}._-]+\b/iu, " ").replace(/\s+/gu, " ").trim();
  }

  const queryAliases = [];
  for (const [alias, definition] of Object.entries(ALIAS_DEFINITIONS)) {
    const matchedPhrase = definition.phrases.sort((left, right) => right.length - left.length).find((phrase) => aliasPhraseInQuery(working, phrase));
    if (!matchedPhrase) continue;
    queryAliases.push(alias);
    working = removePhrase(working, matchedPhrase);
  }

  const explicitCameo = /\bcameos?\b/iu.test(working);
  if (explicitCameo) {
    working = working.replace(/\bcameos?\b/iu, " ").replace(/\s+/gu, " ").trim();
  }

  const minimumPokemonCount = parseMinimumPokemonCountV1(working);
  working = minimumPokemonCount.remaining_text;

  let subjectRole = null;
  let representationForm = null;
  let depictedSurface = null;
  for (const rule of SUBJECT_ROLE_RULES) {
    if (!rule.pattern.test(working)) continue;
    subjectRole = rule.role;
    if (rule.filter === "representation_form") representationForm = rule.value;
    if (rule.filter === "depicted_surface") depictedSurface = rule.value;
    working = working.replace(rule.pattern, " ").replace(/\s+/gu, " ").trim();
    break;
  }

  const branches = [];
  const subjectClasses = minimumPokemonCount.constraint ? ["pokemon"] : [];
  const explicitPokemonCardPattern = /\bpok[eé]mon cards?\b/iu;
  if (explicitPokemonCardPattern.test(working)) {
    branches.push("pokemon");
    working = working.replace(explicitPokemonCardPattern, " ").replace(/\s+/gu, " ").trim();
  } else if (/\bpok[eé]mon\b/iu.test(working)) {
    subjectClasses.push("pokemon");
    working = working.replace(/\bpok[eé]mon\b/iu, " ").replace(/\s+/gu, " ").trim();
  }
  const branchRules = [
    { branch: "trainer", pattern: /\btrainers?\b/iu },
    { branch: "stadium", pattern: /\bstadiums?\b/iu },
    { branch: "item_tool_supporter", pattern: /\b(?:items?|tools?|supporters?)\b/iu },
  ];
  for (const rule of branchRules) {
    if (!rule.pattern.test(working)) continue;
    branches.push(rule.branch);
    working = working.replace(rule.pattern, " ").replace(/\s+/gu, " ").trim();
  }
  const holdingRelationship = parseHoldingRelationshipV1(working);
  working = holdingRelationship.remaining_text;
  if (
    subjectClasses.length &&
    !subjectRole &&
    (!minimumPokemonCount.constraint || holdingRelationship.constraint)
  ) {
    subjectRole = "scene_subject";
  }

  const detected = detectCollectorSubjectGroupsV1(
    working,
    parserIndex.subjects,
  );
  working = detected.remaining_text;
  const detectedSubjects = detected.mentions.map((mention) => ({
    canonical_name: mention.canonical_name,
    normalized_name: mention.normalized_name,
  }));
  const subject = detectedSubjects[0] ?? null;

  const tokens = working.split(" ").filter(Boolean);
  const consumed = new Set();
  const countConstraints = parseCountConstraints(tokens, consumed);
  const parsedConcepts = parseVisualConcepts(tokens, consumed, parserIndex);
  const unrecognizedTerms = [...parsedConcepts.unrecognized_terms];
  if (rawSetMatch && !setCodes.length) unrecognizedTerms.push(`set:${rawSetMatch[1]}`);
  const hasHardPositiveDisambiguation =
    Boolean(subjectRole) ||
    Boolean(minimumPokemonCount.constraint) ||
    countConstraints.length > 0;
  if (contrastive.negative_text && !hasHardPositiveDisambiguation) {
    unrecognizedTerms.push(`not ${contrastive.negative_text}`);
  }

  return {
    parser_version: CARD_VISUAL_SEARCH_QUERY_PARSER_VERSION,
    original_query: originalQuery,
    normalized_query: collectorAliases.normalized,
    query_subject_aliases: collectorAliases.applied_aliases,
    detected_subject: subject,
    detected_subjects: detectedSubjects,
    intent: {
      canonical_filters: { subjects: detectedSubjects.length === 1 && !subjectRole && !explicitCameo ? [subject.canonical_name] : [], set_codes: setCodes, branches, years: null, artist: [] },
      visual_filters: {
        subject_roles: subjectRole ? [subjectRole] : [],
        subject_classes: subjectClasses,
        subject_groups: detected.subject_groups,
        subject_count_constraints: minimumPokemonCount.constraint
          ? [minimumPokemonCount.constraint]
          : [],
        representation_forms: representationForm ? [representationForm] : [],
        depicted_surfaces: depictedSurface ? [depictedSurface] : [],
        concepts: parsedConcepts.concepts,
        colors: [],
        counts: countConstraints,
        relationships: holdingRelationship.constraint
          ? [holdingRelationship.constraint]
          : [],
        evidence_sources: explicitCameo ? ["curated_cameo"] : [],
      },
      query_aliases: queryAliases,
      negative_filters:
        contrastive.negative_text && hasHardPositiveDisambiguation
          ? [
              {
                kind: "contrastive_clarification",
                phrase: contrastive.negative_text,
                enforcement: "positive_hard_constraint",
              },
            ]
          : [],
      unrecognized_terms: unique(unrecognizedTerms),
    },
  };
}

function parsedSubjectRoleEntry(entry) {
  if (
    !["subject_role", "curated_cameo_role"].includes(entry.source_type) ||
    !entry.subject_role
  ) {
    return null;
  }
  const normalizedRole = normalizeVisualSearchTextV1(entry.subject_role).replaceAll("_", " ");
  const rawParts = String(entry.term ?? "").split(/\s*:\s*/u);
  const parts = rawParts.map(normalizeVisualSearchTextV1);
  if (parts.length < 2 || parts[0] !== normalizedRole) return null;
  return {
    role: entry.subject_role,
    identity: parts[1],
    identity_has_parenthetical: /\(/u.test(rawParts[1]),
    qualifiers: parts.slice(2),
  };
}

function roleFilterMatches(value, qualifiers) {
  const pattern = ROLE_FILTER_PATTERNS[value];
  return pattern ? pattern.test(qualifiers.join(" ")) : false;
}

function roleIdentityMatches(requestedIdentity, roleEntry) {
  if (roleEntry.identity_has_parenthetical) return false;
  if (roleEntry.identity === requestedIdentity) return true;
  return roleEntry.identity.startsWith(`${requestedIdentity} `);
}

function subjectRoleEntries(group) {
  return Object.values(group.documents).flatMap((document) =>
    document.structured_concepts
      .filter(
        (entry) =>
          ["subject_role", "curated_cameo_role"].includes(entry.source_type) &&
          entry.subject_role,
      )
      .map((entry) => ({
        ...entry,
        document_type: document.document_type,
        search_document_id: document.search_document_id,
        normalized_term: normalizeVisualSearchTextV1(entry.term),
      })),
  );
}

function allStructuredEvidenceEntries(group) {
  return Object.values(group.documents).flatMap((document) => document.structured_concepts.map((entry) => ({
    ...entry,
    document_type: document.document_type,
    search_document_id: document.search_document_id,
    normalized_term: normalizeVisualSearchTextV1(entry.term),
  })));
}

function hasEvidenceReference(entry) {
  return Boolean(
    entry.supporting_observation_ids?.length ||
      entry.supporting_external_evidence_ids?.length,
  );
}

function explicitRoleCueScopeAllows(requestedRole, entry) {
  if (!["observation", "typed_fact", "relationship"].includes(entry.source_type)) return false;
  const scope = normalizeVisualSearchTextV1([
    entry.module,
    entry.field_path,
    entry.category,
    entry.document_type,
  ].filter(Boolean).join(" "));
  const context = `${scope} ${entry.normalized_term}`;
  if (CARD_UI_EVIDENCE_PATTERN.test(context)) return false;
  if (/\b(?:creature anatomy|human appearance|visible body|facial evidence|pose|action|scene subject|subject identity)\b/u.test(scope)) return false;
  if (requestedRole === "character_representation") {
    return /\b(?:character representations?|depicted subjects?|objects?|props?|food|desserts?|decorations?|accessories|accessory|logos?|stickers?|surfaces?|environment|relationships?)\b/u.test(scope);
  }
  return /\b(?:depicted subjects?|objects?|props?|surfaces?|posters?|screens?|signs?|books?|paintings?|photographs?|environment|relationships?)\b/u.test(scope);
}

function representationRelationshipSupportsIdentity(normalizedTerm, requestedIdentity, subjectClasses) {
  const term = normalizedTerm.replace(/(?<=\p{L})-(?=\p{L})/gu, " ");
  const identities = requestedIdentity
    ? [requestedIdentity]
    : subjectClasses.includes("pokemon")
      ? POKEMON_IDENTITY_LEXICON.names.filter((name) => ` ${term} `.includes(` ${name} `))
      : [];
  if (/\bpok[eé]mon\s+shaped\b/u.test(term) || /\b(?:shaped like|resembling)\s+(?:a\s+)?pok[eé]mon\b/u.test(term)) return true;
  return identities.some((identity) => {
    const escaped = escapeRegex(identity);
    return new RegExp(`\\b${escaped}\\s+shaped\\b|\\b(?:shaped like|shaped as|in the shape of|resembl(?:e|es|ing)|made to (?:look like|resemble)|modeled after|formed as|designed as)\\s+(?:a\\s+|an\\s+)?${escaped}\\b`, "u").test(term);
  });
}

function explicitRoleQualifierMatches(value, normalizedTerm, requestedIdentity, subjectClasses) {
  if (value === "food shape") {
    return FOOD_APPEARANCE_PATTERN.test(normalizedTerm)
      && representationRelationshipSupportsIdentity(normalizedTerm, requestedIdentity, subjectClasses);
  }
  if (["cookie", "ice cream"].includes(value)) {
    return ROLE_FILTER_PATTERNS[value].test(normalizedTerm)
      && representationRelationshipSupportsIdentity(normalizedTerm, requestedIdentity, subjectClasses);
  }
  return roleFilterMatches(value, [normalizedTerm]);
}

function explicitRoleCueEvidence(parsed, group) {
  const requestedRole = parsed.intent.visual_filters.subject_roles[0] ?? null;
  const requestedIdentity = parsed.detected_subject?.normalized_name ?? null;
  const subjectClasses = parsed.intent.visual_filters.subject_classes;
  const representationForms = parsed.intent.visual_filters.representation_forms;
  const depictedSurfaces = parsed.intent.visual_filters.depicted_surfaces;
  if (!requestedRole || (!requestedIdentity && !subjectClasses.length)) return [];
  const requestedQualifiers = requestedRole === "character_representation" ? representationForms : depictedSurfaces;
  if (!requestedQualifiers.length) return [];
  return allStructuredEvidenceEntries(group)
    .filter(
      (entry) => entry.source_type !== "subject_role" && hasEvidenceReference(entry),
    )
    .filter((entry) => explicitRoleCueScopeAllows(requestedRole, entry))
    .filter((entry) => requestedQualifiers.every((value) => explicitRoleQualifierMatches(value, entry.normalized_term, requestedIdentity, subjectClasses)))
    .filter((entry) => {
      if (requestedIdentity) {
        const padded = ` ${queryNormalize(entry.term)} `;
        if (!padded.includes(` ${requestedIdentity} `)) return false;
        if (new RegExp(`\\b${escapeRegex(requestedIdentity)}\\s*\\(`, "u").test(String(entry.term))) return false;
      }
      if (subjectClasses.includes("pokemon") && !pokemonIdentityMatchesTextV1(entry.normalized_term, POKEMON_IDENTITY_LEXICON) && !/\bpok[eé]mon\b/iu.test(entry.term)) return false;
      return true;
    })
    .map((entry) => ({
      query_concept: [
        parsed.detected_subject?.canonical_name,
        ...subjectClasses,
        ...representationForms,
        ...depictedSurfaces,
      ].filter(Boolean).join(" "),
      search_document_id: entry.search_document_id,
      document_type: entry.document_type,
      source_type: entry.source_type,
      source_id: entry.source_id,
      term: entry.term,
      subject_role: requestedRole,
      supporting_observation_ids: entry.supporting_observation_ids,
      supporting_external_evidence_ids: entry.supporting_external_evidence_ids,
      confidence: entry.confidence,
      match_authority: "explicit_role_cue_recovery",
    }));
}

function roleConstraintEvidence(parsed, group) {
  const requestedRole = parsed.intent.visual_filters.subject_roles[0] ?? null;
  if (!requestedRole) return [];
  const requestedIdentity = parsed.detected_subject?.normalized_name ?? null;
  const subjectClasses = parsed.intent.visual_filters.subject_classes;
  const representationForms = parsed.intent.visual_filters.representation_forms;
  const depictedSurfaces = parsed.intent.visual_filters.depicted_surfaces;
  const structured = subjectRoleEntries(group)
    .filter(hasEvidenceReference)
    .filter((entry) => {
      const roleEntry = parsedSubjectRoleEntry(entry);
      if (!roleEntry || roleEntry.role !== requestedRole) return false;
      if (requestedIdentity && !roleIdentityMatches(requestedIdentity, roleEntry)) return false;
      if (subjectClasses.includes("pokemon") && (roleEntry.identity_has_parenthetical || !pokemonIdentityMatchesTextV1(roleEntry.identity, POKEMON_IDENTITY_LEXICON))) return false;
      if (representationForms.length && !representationForms.every((value) => roleFilterMatches(value, roleEntry.qualifiers))) return false;
      if (depictedSurfaces.length && !depictedSurfaces.every((value) => roleFilterMatches(value, roleEntry.qualifiers))) return false;
      return true;
    })
    .map((entry) => ({
      query_concept: [
        parsed.detected_subject?.canonical_name,
        ...subjectClasses,
        ...representationForms,
        ...depictedSurfaces,
      ].filter(Boolean).join(" "),
      search_document_id: entry.search_document_id,
      document_type: entry.document_type,
      source_type: entry.source_type,
      source_id: entry.source_id,
      term: entry.term,
      subject_role: entry.subject_role,
      supporting_observation_ids: entry.supporting_observation_ids,
      supporting_external_evidence_ids: entry.supporting_external_evidence_ids,
      authority: entry.authority,
      governance_status: entry.governance_status,
      confidence: entry.confidence,
      match_authority:
        entry.source_type === "curated_cameo_role"
          ? "curated_cameo_display_mode_evidence"
          : "bound_subject_role_evidence",
    }));
  return structured.length ? structured : explicitRoleCueEvidence(parsed, group);
}

function curatedCameoConstraintEvidence(parsed, group) {
  if (
    !parsed.intent.visual_filters.evidence_sources.includes("curated_cameo")
  ) {
    return [];
  }
  const requestedIdentities = new Set(
    (parsed.detected_subjects ?? [])
      .map((subject) => subject.normalized_name)
      .filter(Boolean),
  );
  const subjectClasses = parsed.intent.visual_filters.subject_classes;
  return allStructuredEvidenceEntries(group)
    .filter(
      (entry) =>
        entry.source_type === "curated_cameo" && hasEvidenceReference(entry),
    )
    .filter((entry) => {
      const identity = normalizeVisualSearchTextV1(entry.cameo_identity);
      if (requestedIdentities.size && !requestedIdentities.has(identity)) {
        return false;
      }
      if (
        subjectClasses.includes("pokemon") &&
        !pokemonIdentityMatchesTextV1(identity, POKEMON_IDENTITY_LEXICON)
      ) {
        return false;
      }
      return true;
    })
    .map((entry) => ({
      query_concept: [
        parsed.detected_subject?.canonical_name,
        ...subjectClasses,
        "cameo",
      ]
        .filter(Boolean)
        .join(" "),
      search_document_id: entry.search_document_id,
      document_type: entry.document_type,
      source_type: entry.source_type,
      source_id: entry.source_id,
      term: entry.term,
      subject_role: "curated_cameo",
      supporting_observation_ids: [],
      supporting_external_evidence_ids:
        entry.supporting_external_evidence_ids,
      authority: entry.authority,
      governance_status: entry.governance_status,
      confidence: entry.confidence,
      match_authority: "curated_cameo_association",
    }));
}

function exactIdentityInText(value, identity) {
  return ` ${queryNormalize(value)} `.includes(` ${identity} `);
}

function identityConstraintEvidence(
  group,
  identity,
  allowedRoles = INDEPENDENT_APPEARANCE_ROLES,
) {
  return subjectRoleEntries(group)
    .filter(hasEvidenceReference)
    .filter((entry) => {
      const roleEntry = parsedSubjectRoleEntry(entry);
      return (
        roleEntry &&
        allowedRoles.has(roleEntry.role) &&
        roleIdentityMatches(identity, roleEntry)
      );
    })
    .sort((left, right) => {
      const priority = {
        subject_role: 0,
        curated_cameo_role: 1,
      };
      return (
        (priority[left.source_type] ?? 9) -
          (priority[right.source_type] ?? 9) ||
        left.term.length - right.term.length
      );
    })
    .slice(0, 2)
    .map((entry) => ({
      query_concept: identity,
      search_document_id: entry.search_document_id,
      document_type: entry.document_type,
      source_type: entry.source_type,
      source_id: entry.source_id,
      term: entry.term,
      subject_role: entry.subject_role,
      supporting_observation_ids: entry.supporting_observation_ids ?? [],
      supporting_external_evidence_ids:
        entry.supporting_external_evidence_ids ?? [],
      authority: entry.authority,
      governance_status: entry.governance_status,
      confidence: entry.confidence,
      match_authority: entry.source_type === "curated_cameo_role"
        ? "curated_subject_cooccurrence"
        : "observed_subject_cooccurrence",
    }));
}

function multiSubjectConstraintEvidence(parsed, group) {
  const groups = parsed.intent.visual_filters.subject_groups ?? [];
  if (groups.length < 2) return [];
  const evidence = [];
  for (const alternatives of groups) {
    const matches = alternatives.flatMap((identity) =>
      identityConstraintEvidence(
        group,
        normalizeVisualSearchTextV1(identity),
      ),
    );
    if (!matches.length) return [];
    evidence.push(...matches);
  }
  return evidence;
}

function pokemonIdentitiesInText(value) {
  const tokens = queryNormalize(value)
    .split(" ")
    .map((token) => token.replace(/'s$/u, ""))
    .filter(Boolean);
  const identities = [];
  for (let start = 0; start < tokens.length; start += 1) {
    for (
      let length = Math.min(POKEMON_IDENTITY_MAX_TOKENS, tokens.length - start);
      length >= 1;
      length -= 1
    ) {
      const candidate = tokens.slice(start, start + length).join(" ");
      if (!POKEMON_IDENTITY_SET.has(candidate)) continue;
      identities.push(candidate);
      start += length - 1;
      break;
    }
  }
  return unique(identities);
}

function visiblePokemonIdentityEvidence(group) {
  const byIdentity = new Map();
  for (const entry of subjectRoleEntries(group).filter(
    hasEvidenceReference,
  )) {
    const roleEntry = parsedSubjectRoleEntry(entry);
    if (
      !roleEntry ||
      !INDEPENDENT_APPEARANCE_ROLES.has(roleEntry.role) ||
      roleEntry.identity_has_parenthetical
    ) {
      continue;
    }
    const identities = pokemonIdentitiesInText(roleEntry.identity);
    for (const identity of identities) {
      if (!POKEMON_IDENTITY_SET.has(identity)) continue;
      if (!byIdentity.has(identity)) byIdentity.set(identity, []);
      byIdentity.get(identity).push(entry);
    }
  }
  return byIdentity;
}

function exactIdentityCount(group, identity) {
  let count = 1;
  for (const entry of allStructuredEvidenceEntries(group)) {
    if (entry.source_type !== "count") continue;
    const match = queryNormalize(entry.term).match(
      /^(.*?) count exact (\d+)$/u,
    );
    if (
      match &&
      normalizeVisualSearchTextV1(match[1]) === identity
    ) {
      count = Math.max(count, Number.parseInt(match[2], 10));
    }
  }
  return count;
}

function pokemonCountConstraintEvidence(parsed, group) {
  const constraints =
    parsed.intent.visual_filters.subject_count_constraints ?? [];
  if (!constraints.length) return [];
  const identities = visiblePokemonIdentityEvidence(group);
  const visibleCount = [...identities.keys()].reduce(
    (sum, identity) => sum + exactIdentityCount(group, identity),
    0,
  );
  if (
    constraints.some(
      (constraint) =>
        constraint.subject_class !== "pokemon" ||
        constraint.operator !== "gte" ||
        visibleCount < constraint.minimum_count,
    )
  ) {
    return [];
  }
  return [...identities.entries()].flatMap(([identity, entries]) =>
    entries.slice(0, 1).map((entry) => ({
      query_concept: `${visibleCount} visible Pokemon`,
      search_document_id: entry.search_document_id,
      document_type: entry.document_type,
      source_type: entry.source_type,
      source_id: entry.source_id,
      term: entry.term,
      subject_role: entry.subject_role,
      supporting_observation_ids: entry.supporting_observation_ids ?? [],
      supporting_external_evidence_ids:
        entry.supporting_external_evidence_ids ?? [],
      authority: entry.authority,
      governance_status: entry.governance_status,
      confidence: entry.confidence,
      match_authority: "derived_visible_pokemon_count",
      derived_visible_pokemon_count: visibleCount,
      matched_identity: identity,
    })),
  );
}

function entriesShareEvidence(left, right) {
  const rightIds = new Set(evidenceIds(right));
  return evidenceIds(left).some((id) => rightIds.has(id));
}

function holdingPattern() {
  return /\b(?:holding|holds?|held|carrying|carries)\b/u;
}

function relationshipObjectMatches(entry, object) {
  const normalized = queryNormalize(entry.term);
  if (object === "poke ball") {
    return /\b(?:poke|poké)\s*ball\b|\bpokeball\b/u.test(normalized);
  }
  const tokens = tokenizeVisualSearchTextV1(object);
  const entryTokens = new Set(tokenizeVisualSearchTextV1(normalized));
  return (
    tokens.length > 0 && tokens.every((token) => entryTokens.has(token))
  );
}

function relationshipConstraintEvidence(parsed, group, boundRoleEvidence) {
  const constraints = parsed.intent.visual_filters.relationships ?? [];
  if (!constraints.length) return [];
  const entries = allStructuredEvidenceEntries(group).filter(
    hasEvidenceReference,
  );
  const matched = [];
  for (const constraint of constraints) {
    if (constraint.predicate !== "holding") return [];
    const actionEntries = entries.filter((entry) =>
      holdingPattern().test(entry.normalized_term),
    );
    const objectEntries = entries.filter((entry) =>
      relationshipObjectMatches(entry, constraint.object),
    );
    const connected = uniqueEvidence([
      ...actionEntries.filter((action) =>
        objectEntries.some(
          (object) =>
            action.source_id === object.source_id ||
            entriesShareEvidence(action, object),
        ),
      ),
      ...objectEntries.filter((object) =>
        actionEntries.some(
          (action) =>
            action.source_id === object.source_id ||
            entriesShareEvidence(action, object),
        ),
      ),
    ]);
    if (!connected.length) return [];

    const subjectIds = new Set(boundRoleEvidence.flatMap(evidenceIds));
    const requestedIdentities = (parsed.detected_subjects ?? []).map(
      (subject) => subject.normalized_name,
    );
    const subjectBound = connected.some((entry) => {
      if (evidenceIds(entry).some((id) => subjectIds.has(id))) return true;
      if (
        requestedIdentities.some((identity) =>
          exactIdentityInText(entry.term, identity),
        )
      ) {
        return true;
      }
      return (
        parsed.intent.visual_filters.subject_classes.includes("pokemon") &&
        pokemonIdentitiesInText(entry.term).length > 0
      );
    });
    if (!subjectBound) return [];
    matched.push(
      ...connected.map((entry) => ({
        query_concept: `${constraint.predicate} ${constraint.object}`,
        search_document_id: entry.search_document_id,
        document_type: entry.document_type,
        source_type: entry.source_type,
        source_id: entry.source_id,
        term: entry.term,
        subject_role: entry.subject_role,
        supporting_observation_ids: entry.supporting_observation_ids ?? [],
        supporting_external_evidence_ids:
          entry.supporting_external_evidence_ids ?? [],
        confidence: entry.confidence,
        match_authority: "bound_subject_object_relationship",
      })),
    );
  }
  return matched;
}

function uniqueEvidence(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    const key = `${entry.source_type}|${entry.source_id}`;
    if (!byKey.has(key)) byKey.set(key, entry);
  }
  return [...byKey.values()];
}

function evidenceRows(group, pattern) {
  return visualSearchGroupEntriesV1(group)
    .filter((entry) => entry.supporting_observation_ids?.length && pattern.test(entry.normalized_term))
    .filter((entry) => !/\b(?:ghostly|halloween|stoner|stoned|high|intoxicated|under the influence)\b/u.test(entry.normalized_term));
}

function cueFamilies(group, definitions) {
  const matches = [];
  for (const [family, pattern] of Object.entries(definitions)) {
    const entries = evidenceRows(group, pattern);
    if (entries.length) matches.push({ family, entries: entries.slice(0, 3) });
  }
  return matches;
}

export function matchVisualSearchAliasV1(alias, group) {
  let families = [];
  let matched = false;
  if (alias === "ghostly") {
    families = cueFamilies(group, {
      ghost_form: /\b(?:ghost form|ghost flame|ghost flames|spectral form|spectral figure|spectral body)\b/u,
      wisp: /\bwisps?\b/u,
      translucent_form: /\btranslucent (?:form|figure|body|shape)\b/u,
      haze_or_vapor: /\b(?:haze|vapor|smoke)\b/u,
    });
    matched = families.some((row) => ["ghost_form", "translucent_form"].includes(row.family)) || families.length >= 2;
  } else if (alias === "halloween") {
    families = cueFamilies(group, {
      pumpkin: /\bpumpkins?\b/u,
      bat: /\bbats?\b/u,
      tombstone: /\b(?:tombstones?|gravestones?)\b/u,
      candle: /\bcandles?\b/u,
      ghost_form: /\b(?:ghost form|ghost flame|ghost flames|spectral form|spectral figure)\b/u,
      wisp: /\bwisps?\b/u,
    });
    matched = families.length >= 2;
  } else if (alias === "altered_state_visual_cues") {
    families = cueFamilies(group, {
      smoke_or_vapor: /\b(?:smoke|smoke cloud|smoke plume|vapor|haze)\b/u,
      red_eye: /\b(?:red eyes|bloodshot eyes|bloodshot looking eyes)\b/u,
      eyelid: /\b(?:half closed eyes|drooping eyelids|lowered eyelids)\b/u,
      smoking_object: /\b(?:pipe shaped object|cigarette like object|smoking object|smoke near mouth)\b/u,
    });
    const familyNames = new Set(families.map((row) => row.family));
    matched = familyNames.has("smoking_object") || (familyNames.has("smoke_or_vapor") && (familyNames.has("red_eye") || familyNames.has("eyelid")));
  }
  return {
    alias,
    matched,
    decision_rule: ALIAS_DEFINITIONS[alias]?.decision ?? "unsupported alias",
    evidence: matched ? families.flatMap((row) => row.entries.map((entry) => ({
      cue_family: row.family,
      search_document_id: entry.search_document_id,
      document_type: entry.document_type,
      source_type: entry.source_type,
      source_id: entry.source_id,
      term: entry.term,
      supporting_observation_ids: entry.supporting_observation_ids,
      confidence: entry.confidence,
    }))) : [],
  };
}

function baseRankIntent(parsed, artworkGroupIds = []) {
  return {
    canonical_filters: parsed.intent.canonical_filters,
    visual_concepts: parsed.intent.visual_filters.concepts,
    subject_roles: parsed.intent.visual_filters.subject_roles,
    count_constraints: parsed.intent.visual_filters.counts,
    printing_filters: [],
    query_aliases: parsed.intent.query_aliases,
    negative_filters: parsed.intent.negative_filters,
    unrecognized_terms: parsed.intent.unrecognized_terms,
    artwork_group_ids: artworkGroupIds,
  };
}

function subjectClassConceptsAreBound(parsed, result, group, boundRoleEvidence) {
  if (!parsed.intent.visual_filters.subject_classes.length || !parsed.intent.visual_filters.concepts.length) return true;
  const requestedRole = parsed.intent.visual_filters.subject_roles[0] ?? null;
  if (!requestedRole) return true;
  const roleRows = subjectRoleEntries(group)
    .map((entry) => ({ entry, parsed: parsedSubjectRoleEntry(entry) }))
    .filter((row) => row.parsed?.role === requestedRole && !row.parsed.identity_has_parenthetical);
  const classRoleRows = roleRows.filter((row) => pokemonIdentityMatchesTextV1(row.parsed.identity, POKEMON_IDENTITY_LEXICON));
  if (!classRoleRows.length) return false;
  const everyRoleSubjectMatchesClass = roleRows.length === classRoleRows.length;
  const subjectObservationIds = new Set(
    boundRoleEvidence.flatMap(
      (entry) => entry.supporting_observation_ids ?? [],
    ),
  );
  for (const concept of parsed.intent.visual_filters.concepts) {
    const conceptEvidence = result.matched_evidence.filter((entry) => entry.query_concept === concept);
    if (!conceptEvidence.length) return false;
    if (conceptEvidence.some((entry) => entry.document_type !== "subject")) continue;
    const directlyBound = conceptEvidence.some((entry) =>
      (entry.supporting_observation_ids ?? []).some((id) =>
        subjectObservationIds.has(id),
      ),
    );
    if (!directlyBound && !everyRoleSubjectMatchesClass) return false;
  }
  return true;
}

function rankedIntentAlternatives(parsed, artworkGroupIds) {
  const primary = baseRankIntent(parsed, artworkGroupIds);
  if ((parsed.detected_subjects ?? []).length > 1) {
    primary.canonical_filters = {
      ...primary.canonical_filters,
      subjects: [],
    };
    return [{ intent: primary, retrieval_mode: "multi_subject" }];
  }
  if (!parsed.detected_subject) {
    return [{ intent: primary, retrieval_mode: "structured_constraints" }];
  }
  if (parsed.intent.visual_filters.subject_roles.length) {
    primary.canonical_filters = { ...primary.canonical_filters, subjects: [] };
    primary.subject_roles = [];
    return [{ intent: primary, retrieval_mode: "bound_subject_role" }];
  }
  const visualIdentity = {
    ...primary,
    canonical_filters: { ...primary.canonical_filters, subjects: [] },
    visual_concepts: unique([parsed.detected_subject.canonical_name, ...primary.visual_concepts]),
  };
  return [
    { intent: primary, retrieval_mode: "canonical_identity" },
    { intent: visualIdentity, retrieval_mode: "visual_identity" },
  ];
}

function representativePrinting(result) {
  return result.matching_printings.find((printing) => printing.card_print_id === result.representative_card_print_id) ?? result.matching_printings[0] ?? null;
}

function evidenceIds(entry) {
  return unique([
    ...(entry.supporting_observation_ids ?? []),
    ...(entry.supporting_external_evidence_ids ?? []),
  ]);
}

function namedVisualIdentityConceptsAreBound(parsed, result, retrievalMode) {
  if (
    retrievalMode !== "visual_identity" ||
    !parsed.detected_subject ||
    !parsed.intent.visual_filters.concepts.length
  ) {
    return true;
  }
  const identityConcept = parsed.detected_subject.canonical_name;
  const identityEvidence = result.matched_evidence.filter(
    (entry) => entry.query_concept === identityConcept,
  );
  if (!identityEvidence.length) return false;
  const identityIds = new Set(identityEvidence.flatMap(evidenceIds));

  for (const concept of parsed.intent.visual_filters.concepts) {
    const conceptEvidence = result.matched_evidence.filter(
      (entry) => entry.query_concept === concept,
    );
    if (!conceptEvidence.length) return false;
    const subjectScoped = conceptEvidence.every(
      (entry) => entry.document_type === "subject",
    );
    if (!subjectScoped) continue;
    const bound = conceptEvidence.some((entry) =>
      evidenceIds(entry).some((id) => identityIds.has(id)),
    );
    if (!bound) return false;
  }
  return true;
}

function resultMatchSources(parsed, result, retrievalMode) {
  const sources = [];
  if (
    retrievalMode === "canonical_identity" &&
    parsed.intent.canonical_filters.subjects.length
  ) {
    sources.push("canonical_identity");
  }
  if (
    parsed.intent.canonical_filters.set_codes.length ||
    parsed.intent.canonical_filters.branches.length
  ) {
    sources.push("canonical_metadata");
  }
  if (
    result.matched_evidence.some((entry) =>
      ["curated_cameo", "curated_cameo_role"].includes(entry.source_type),
    )
  ) {
    sources.push("curated_cameo");
  }
  if (
    result.matched_evidence.some(
      (entry) =>
        !["curated_cameo", "curated_cameo_role"].includes(entry.source_type),
    )
  ) {
    sources.push("visual_fact_graph");
  }
  return unique(sources);
}

function evidenceKey(entry) {
  return [
    entry.source_type,
    entry.source_id,
    entry.query_concept,
    entry.match_authority,
  ].join("|");
}

function mergeResultCandidates(existing, candidate) {
  if (!existing) return candidate;
  const best = candidate.score > existing.score ? candidate : existing;
  const evidence = new Map();
  for (const entry of [
    ...existing.matched_evidence,
    ...candidate.matched_evidence,
  ]) {
    evidence.set(evidenceKey(entry), entry);
  }
  const matchedSources = unique([
    ...existing.matched_sources,
    ...candidate.matched_sources,
  ]);
  const multiSourceBoost = Math.max(0, matchedSources.length - 1);
  return {
    ...best,
    score: Math.max(existing.score, candidate.score) + multiSourceBoost,
    matched_evidence: [...evidence.values()],
    matched_sources: matchedSources,
    retrieval_modes: unique([
      ...existing.retrieval_modes,
      ...candidate.retrieval_modes,
    ]),
    why_matched: matchedSources.map((source) => {
      if (source === "canonical_identity") return "Direct canonical identity match";
      if (source === "canonical_metadata") return "Canonical metadata match";
      if (source === "curated_cameo") return "Curated cameo relationship";
      return "Observable visual fact match";
    }),
  };
}

function collectorAuthorityLabel(entry) {
  if (entry.governance_status === "human_image_confirmed") {
    return "Image confirmed";
  }
  if (entry.governance_status === "external_role_confirmed") {
    return "Role-confirmed reference";
  }
  if (entry.source_type === "curated_cameo_role") {
    return "Approved curated evidence";
  }
  return "Observed artwork evidence";
}

function publicEvidenceSummary(entry) {
  const roleEntry = parsedSubjectRoleEntry(entry);
  return {
    query_concept: entry.query_concept ?? null,
    term: entry.term,
    appearance_role: roleEntry?.role ?? entry.subject_role ?? null,
    appearance_identity: roleEntry?.identity ?? null,
    qualifiers: roleEntry?.qualifiers ?? [],
    authority: collectorAuthorityLabel(entry),
    confidence: Number.isFinite(entry.confidence) ? entry.confidence : null,
    evidence_kind: entry.supporting_observation_ids?.length
      ? "image_observation"
      : "confirmed_external_evidence",
  };
}

function resultAppearanceRoles(result) {
  return unique(
    result.matched_evidence
      .map((entry) => parsedSubjectRoleEntry(entry)?.role ?? entry.subject_role)
      .filter((role) => UNQUALIFIED_IDENTITY_ROLES.has(role)),
  );
}

function resultGroupKey(parsed, result) {
  if (parsed.intent.visual_filters.subject_groups.length > 1) {
    return "exact_matches";
  }
  if (result.matched_sources.includes("canonical_identity")) {
    return "cards_named";
  }
  const roles = resultAppearanceRoles(result);
  if (roles.includes("scene_subject")) return "artwork_appearances";
  if (roles.includes("depicted_subject")) return "depicted_appearances";
  if (roles.includes("character_representation")) {
    return "character_representations";
  }
  return "visual_matches";
}

function collectorReason(parsed, result) {
  const subjects = parsed.detected_subjects.map(
    (subject) => subject.canonical_name,
  );
  if (parsed.intent.visual_filters.subject_groups.length > 1) {
    return `${subjects.join(" and ")} are independently visible in the same artwork.`;
  }
  if (result.matched_sources.includes("canonical_identity")) {
    return `The card's canonical identity is ${subjects[0] ?? result.representative_name}.`;
  }
  const roleEvidence = result.matched_evidence
    .map((entry) => ({ entry, role: parsedSubjectRoleEntry(entry) }))
    .find((row) => row.role && UNQUALIFIED_IDENTITY_ROLES.has(row.role.role));
  const identity =
    subjects[0] ??
    roleEvidence?.role?.identity ??
    result.representative_name;
  if (roleEvidence?.role?.role === "scene_subject") {
    return `${identity} appears as an independent character in the artwork.`;
  }
  if (roleEvidence?.role?.role === "depicted_subject") {
    const surface = roleEvidence.role.qualifiers[0] ?? "another visible surface";
    return `${identity} is depicted on ${surface}.`;
  }
  if (roleEvidence?.role?.role === "character_representation") {
    const form = roleEvidence.role.qualifiers[0] ?? "object";
    return `A ${identity}-shaped ${form} is visible in the artwork.`;
  }
  return "The artwork contains evidence matching the requested visual facts.";
}

const RESULT_GROUP_LABELS = Object.freeze({
  exact_matches: "Exact artwork matches",
  cards_named: "Cards named for this character",
  artwork_appearances: "Character appearances in artwork",
  depicted_appearances: "Characters depicted on another surface",
  character_representations: "Character-shaped objects",
  visual_matches: "Other verified visual matches",
});

function collectorInterpretation(parsed) {
  const subjectLabels = parsed.detected_subjects.map(
    (subject) => subject.canonical_name,
  );
  const chips = subjectLabels.map((label) => ({
    key: `subject:${normalizeVisualSearchTextV1(label)}`,
    label,
    kind: "character",
    hard: true,
  }));
  if (parsed.intent.visual_filters.subject_groups.length > 1) {
    chips.push({
      key: "same_artwork",
      label: "Both in the same artwork",
      kind: "same_artwork",
      hard: true,
    });
  }
  for (const role of parsed.intent.visual_filters.subject_roles) {
    chips.push({
      key: `role:${role}`,
      label:
        role === "character_representation"
          ? "Character-shaped object"
          : role === "depicted_subject"
            ? "Depicted on another surface"
            : role === "visual_resemblance_reference"
              ? "Visual resemblance only"
              : "Independent character",
      kind: "appearance_role",
      hard: true,
    });
  }
  return {
    version: UNIFIED_COLLECTOR_SEARCH_INTENT_VERSION,
    original_query: parsed.original_query,
    aliases: parsed.query_subject_aliases,
    chips,
    hard_constraints: chips.filter((chip) => chip.hard),
    optional_semantic_concepts: parsed.intent.visual_filters.concepts,
    unrecognized_terms: parsed.intent.unrecognized_terms,
  };
}

function independentSubjectCoverage(groups, parsed) {
  return parsed.intent.visual_filters.subject_groups.map((alternatives) => {
    const normalizedAlternatives = alternatives.map(normalizeVisualSearchTextV1);
    let matches = 0;
    for (const group of groups) {
      if (
        normalizedAlternatives.some(
          (identity) =>
            identityConstraintEvidence(
              group,
              identity,
              INDEPENDENT_APPEARANCE_ROLES,
            ).length > 0,
        )
      ) {
        matches += 1;
      }
    }
    return {
      label: alternatives.join(" or "),
      artwork_matches: matches,
    };
  });
}

function collectorZeroState(groups, parsed, reason) {
  const coverage = independentSubjectCoverage(groups, parsed);
  const labels = coverage.map((row) => row.label);
  let message = "No artwork in the current visual index proves every requested constraint.";
  if (labels.length === 2) {
    message = `We found artwork evidence for ${labels[0]} and for ${labels[1]}, but none where both are independently visible in the same artwork.`;
  } else if (reason === "unrecognized_terms") {
    message = "We understood part of the search, but one or more terms are not supported yet.";
  }
  return {
    reason,
    message,
    constraint_coverage: coverage,
    relaxations: coverage.map((row) => ({
      label: `Show ${row.label}`,
      query: row.label,
      result_count: row.artwork_matches,
    })),
  };
}

function finalizeCollectorSearchResponse(groups, parsed, payload) {
  const enrichedResults = payload.results.map((result) => {
    const matchGroup = resultGroupKey(parsed, result);
    return {
      ...result,
      match_group: matchGroup,
      collector_reason: collectorReason(parsed, result),
      public_evidence: result.matched_evidence.map(publicEvidenceSummary),
    };
  });
  const grouped = new Map();
  for (const result of enrichedResults) {
    const rows = grouped.get(result.match_group) ?? [];
    rows.push(result);
    grouped.set(result.match_group, rows);
  }
  return {
    ...payload,
    version: CARD_VISUAL_SEARCH_LAB_VERSION,
    response_version: UNIFIED_COLLECTOR_SEARCH_RESPONSE_VERSION,
    interpretation: collectorInterpretation(parsed),
    results: enrichedResults,
    result_groups: [...grouped.entries()].map(([key, results]) => ({
      key,
      label: RESULT_GROUP_LABELS[key],
      results,
    })),
    zero_state: enrichedResults.length
      ? null
      : collectorZeroState(groups, parsed, payload.strict_zero_reason),
  };
}

export function createVisualSearchLabEngineV1(
  groups,
  {
    imageResolver = null,
    curatedCameoStats = null,
    evidenceSuppressionStats = null,
  } = {},
) {
  const candidateIndex = buildVisualSearchCandidateIndexV1(groups);
  const parserIndex = buildVisualSearchParserIndexV1(groups, candidateIndex);
  return {
    version: CARD_VISUAL_SEARCH_LAB_VERSION,
    unified_evidence_version: CARD_VISUAL_SEARCH_UNIFIED_EVIDENCE_VERSION,
    candidate_index: candidateIndex,
    parser_index: parserIndex,
    curated_cameo_stats: curatedCameoStats,
    evidence_suppression_stats: evidenceSuppressionStats,
    async search(queryText, { limit = 24 } = {}) {
      const started = performance.now();
      const parsed = parseVisualSearchQueryV1(queryText, parserIndex);
      const zero = (reason) =>
        finalizeCollectorSearchResponse(groups, parsed, {
          index_version: candidateIndex.version,
          parsed_query: parsed,
          strict_zero_reason: reason,
          total_matches: 0,
          results: [],
          latency_ms: performance.now() - started,
        });
      if (parsed.intent.unrecognized_terms.length) {
        return zero("unrecognized_terms");
      }
      const hasConstraint = parsed.detected_subject || parsed.intent.canonical_filters.set_codes.length || parsed.intent.canonical_filters.branches.length || parsed.intent.visual_filters.subject_roles.length || parsed.intent.visual_filters.subject_classes.length || parsed.intent.visual_filters.subject_groups.length || parsed.intent.visual_filters.subject_count_constraints.length || parsed.intent.visual_filters.relationships.length || parsed.intent.visual_filters.concepts.length || parsed.intent.visual_filters.counts.length || parsed.intent.visual_filters.evidence_sources.length || parsed.intent.query_aliases.length;
      if (!hasConstraint) {
        return zero("no_supported_constraints");
      }

      const aliasMatches = new Map();
      if (parsed.intent.query_aliases.length) {
        for (const group of groups) {
          const decisions = parsed.intent.query_aliases.map((alias) => matchVisualSearchAliasV1(alias, group));
          if (decisions.every((decision) => decision.matched)) aliasMatches.set(group.artwork_group_id, decisions);
        }
      }
      let allowedGroupIds = parsed.intent.query_aliases.length ? new Set(aliasMatches.keys()) : null;
      if (parsed.intent.query_aliases.length && !allowedGroupIds.size) {
        return zero("alias_evidence_not_found");
      }

      const sourceMatches = new Map();
      if (parsed.intent.visual_filters.evidence_sources.length) {
        for (const group of groups) {
          const evidence = curatedCameoConstraintEvidence(parsed, group);
          if (evidence.length) {
            sourceMatches.set(group.artwork_group_id, evidence);
          }
        }
        if (!sourceMatches.size) {
          return zero("curated_cameo_evidence_not_found");
        }
        const sourceGroupIds = new Set(sourceMatches.keys());
        allowedGroupIds = allowedGroupIds
          ? new Set([...allowedGroupIds].filter((groupId) => sourceGroupIds.has(groupId)))
          : sourceGroupIds;
        if (!allowedGroupIds.size) {
          return zero("no_evidence_satisfies_all_constraints");
        }
      }

      const multiSubjectMatches = new Map();
      if (parsed.intent.visual_filters.subject_groups.length > 1) {
        for (const group of groups) {
          const evidence = multiSubjectConstraintEvidence(parsed, group);
          if (evidence.length) {
            multiSubjectMatches.set(group.artwork_group_id, evidence);
          }
        }
        if (!multiSubjectMatches.size) {
          return zero("multi_subject_evidence_not_found");
        }
        const multiSubjectGroupIds = new Set(multiSubjectMatches.keys());
        allowedGroupIds = allowedGroupIds
          ? new Set([...allowedGroupIds].filter((groupId) => multiSubjectGroupIds.has(groupId)))
          : multiSubjectGroupIds;
        if (!allowedGroupIds.size) {
          return zero("no_evidence_satisfies_all_constraints");
        }
      }

      const singleIdentityMatches = new Map();
      if (
        parsed.detected_subjects.length === 1 &&
        !parsed.intent.visual_filters.subject_roles.length &&
        !parsed.intent.visual_filters.evidence_sources.length
      ) {
        const identity = parsed.detected_subjects[0].normalized_name;
        for (const group of groups) {
          const evidence = identityConstraintEvidence(
            group,
            identity,
            UNQUALIFIED_IDENTITY_ROLES,
          );
          if (evidence.length) {
            singleIdentityMatches.set(group.artwork_group_id, evidence);
          }
        }
      }

      const subjectCountMatches = new Map();
      if (parsed.intent.visual_filters.subject_count_constraints.length) {
        for (const group of groups) {
          const evidence = pokemonCountConstraintEvidence(parsed, group);
          if (evidence.length) {
            subjectCountMatches.set(group.artwork_group_id, evidence);
          }
        }
        if (!subjectCountMatches.size) {
          return zero("subject_count_evidence_not_found");
        }
        const subjectCountGroupIds = new Set(subjectCountMatches.keys());
        allowedGroupIds = allowedGroupIds
          ? new Set([...allowedGroupIds].filter((groupId) => subjectCountGroupIds.has(groupId)))
          : subjectCountGroupIds;
        if (!allowedGroupIds.size) {
          return zero("no_evidence_satisfies_all_constraints");
        }
      }

      const roleMatches = new Map();
      if (parsed.intent.visual_filters.subject_roles.length) {
        for (const group of groups) {
          const evidence = roleConstraintEvidence(parsed, group);
          if (evidence.length) roleMatches.set(group.artwork_group_id, evidence);
        }
        if (!roleMatches.size) {
          return zero("subject_role_evidence_not_found");
        }
        const roleGroupIds = new Set(roleMatches.keys());
        allowedGroupIds = allowedGroupIds
          ? new Set([...allowedGroupIds].filter((groupId) => roleGroupIds.has(groupId)))
          : roleGroupIds;
        if (!allowedGroupIds.size) {
          return zero("no_evidence_satisfies_all_constraints");
        }
      }

      const relationshipMatches = new Map();
      if (parsed.intent.visual_filters.relationships.length) {
        for (const group of groups) {
          const namedSubjectEvidence = (parsed.detected_subjects ?? []).flatMap(
            (subject) =>
              identityConstraintEvidence(
                group,
                subject.normalized_name,
                new Set(["scene_subject"]),
              ),
          );
          const bindingEvidence = [
            ...(roleMatches.get(group.artwork_group_id) ?? []),
            ...namedSubjectEvidence,
          ];
          const evidence = relationshipConstraintEvidence(
            parsed,
            group,
            bindingEvidence,
          );
          if (evidence.length) {
            relationshipMatches.set(group.artwork_group_id, evidence);
          }
        }
        if (!relationshipMatches.size) {
          return zero("relationship_evidence_not_found");
        }
        const relationshipGroupIds = new Set(relationshipMatches.keys());
        allowedGroupIds = allowedGroupIds
          ? new Set([...allowedGroupIds].filter((groupId) => relationshipGroupIds.has(groupId)))
          : relationshipGroupIds;
        if (!allowedGroupIds.size) {
          return zero("no_evidence_satisfies_all_constraints");
        }
      }

      const merged = new Map();
      for (const alternative of rankedIntentAlternatives(parsed, allowedGroupIds ? [...allowedGroupIds] : [])) {
        const { intent, retrieval_mode: retrievalMode } = alternative;
        if (parsed.intent.visual_filters.subject_roles.length) intent.subject_roles = [];
        const ranked = rankVisualSearchQueryV1({ intent }, groups, { topK: groups.length, candidateIndex });
        for (const result of ranked.results) {
          const singleIdentityEvidence =
            singleIdentityMatches.get(result.artwork_group_id) ?? [];
          if (
            retrievalMode === "visual_identity" &&
            parsed.detected_subject &&
            !singleIdentityEvidence.length
          ) {
            continue;
          }
          const aliases = aliasMatches.get(result.artwork_group_id) ?? [];
          const aliasEvidence = aliases.flatMap((decision) => decision.evidence.map((entry) => ({ ...entry, query_concept: decision.alias, match_authority: "query_alias_evidence" })));
          const boundRoleEvidence = roleMatches.get(result.artwork_group_id) ?? [];
          const curatedSourceEvidence = sourceMatches.get(result.artwork_group_id) ?? [];
          const multiSubjectEvidence = multiSubjectMatches.get(result.artwork_group_id) ?? [];
          const subjectCountEvidence = subjectCountMatches.get(result.artwork_group_id) ?? [];
          const relationshipEvidence = relationshipMatches.get(result.artwork_group_id) ?? [];
          const resultGroup = candidateIndex.groups_by_id.get(result.artwork_group_id);
          if (!subjectClassConceptsAreBound(parsed, result, resultGroup, boundRoleEvidence)) continue;
          if (!namedVisualIdentityConceptsAreBound(parsed, result, retrievalMode)) continue;
          const matchedEvidence = [
            ...result.matched_evidence,
            ...boundRoleEvidence,
            ...aliasEvidence,
            ...curatedSourceEvidence,
            ...multiSubjectEvidence,
            ...singleIdentityEvidence,
            ...subjectCountEvidence,
            ...relationshipEvidence,
          ];
          const authorityAdjustment = matchedEvidence.some(
            (entry) =>
              ["existing_approved", "human_image_confirmed"].includes(
                entry.governance_status,
              ) &&
              ["curated_cameo", "curated_cameo_role"].includes(
                entry.source_type,
              ),
          )
            ? 2
            : 0;
          const derivedVisiblePokemonCount = Math.max(
            0,
            ...subjectCountEvidence
              .map((entry) => entry.derived_visible_pokemon_count)
              .filter(Number.isFinite),
          );
          const requestedMinimumPokemonCount =
            parsed.intent.visual_filters.subject_count_constraints[0]
              ?.minimum_count ?? 0;
          const visiblePokemonCountBonus = Math.min(
            6,
            Math.max(
              0,
              derivedVisiblePokemonCount - requestedMinimumPokemonCount,
            ),
          );
          const resultWithEvidence = {
            ...result,
            matched_evidence: matchedEvidence,
          };
          const matchedSources = resultMatchSources(
            parsed,
            resultWithEvidence,
            retrievalMode,
          );
          const candidate = {
            ...resultWithEvidence,
            score: result.score + aliases.length * 12 + (parsed.intent.visual_filters.subject_roles.length ? 8 : 0) + (parsed.intent.visual_filters.evidence_sources.length ? 8 : 0) + (parsed.intent.visual_filters.subject_groups.length > 1 ? parsed.intent.visual_filters.subject_groups.length * 6 : 0) + parsed.intent.visual_filters.subject_count_constraints.length * 10 + visiblePokemonCountBonus + parsed.intent.visual_filters.relationships.length * 10 + authorityAdjustment,
            score_components: {
              ...result.score_components,
              subject_role: parsed.intent.visual_filters.subject_roles.length ? 8 : 0,
              alias_evidence: aliases.length * 12,
              curated_cameo_filter: parsed.intent.visual_filters.evidence_sources.length ? 8 : 0,
              multi_subject: parsed.intent.visual_filters.subject_groups.length > 1 ? parsed.intent.visual_filters.subject_groups.length * 6 : 0,
              minimum_subject_count: parsed.intent.visual_filters.subject_count_constraints.length * 10,
              visible_subject_count_bonus: visiblePokemonCountBonus,
              relationship: parsed.intent.visual_filters.relationships.length * 10,
              curated_cameo_authority: authorityAdjustment,
            },
            matched_subject_roles: parsed.intent.visual_filters.subject_roles,
            matched_aliases: aliases.map((decision) => ({ alias: decision.alias, decision_rule: decision.decision_rule })),
            matched_sources: matchedSources,
            retrieval_modes: [retrievalMode],
            why_matched: matchedSources.map((source) => {
              if (source === "canonical_identity") return "Direct canonical identity match";
              if (source === "canonical_metadata") return "Canonical metadata match";
              if (source === "curated_cameo") return "Curated cameo relationship";
              return "Observable visual fact match";
            }),
          };
          merged.set(
            result.artwork_group_id,
            mergeResultCandidates(
              merged.get(result.artwork_group_id),
              candidate,
            ),
          );
        }
      }

      const rankedResults = [...merged.values()].sort((left, right) => right.score - left.score || left.artwork_group_id.localeCompare(right.artwork_group_id));
      const page = rankedResults.slice(0, Math.max(1, Math.min(48, limit)));
      const imageByCardId = imageResolver ? await imageResolver.resolve(page.map((row) => row.representative_card_print_id)) : new Map();
      const results = page.map((row) => {
        const printing = representativePrinting(row);
        const image = imageByCardId.get(row.representative_card_print_id) ?? null;
        return {
          ...row,
          representative_card: printing ? {
            ...printing,
            image_url: image?.image_url ?? null,
            image_source_key: image?.image_source_key ?? null,
            image_sha256: image?.image_sha256 ?? null,
          } : null,
        };
      });
      return finalizeCollectorSearchResponse(groups, parsed, {
        index_version: candidateIndex.version,
        parsed_query: parsed,
        strict_zero_reason: results.length ? null : "no_evidence_satisfies_all_constraints",
        total_matches: rankedResults.length,
        results,
        latency_ms: performance.now() - started,
      });
    },
  };
}

function sourceRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.generated_outputs)) return payload.generated_outputs;
  return [payload];
}

function sourceRecordId(record) {
  return record?.card_print_id ?? record?.card?.card_print_id ?? record?.generated_row?.card_print_id ?? null;
}

function sourceImageMetadata(record) {
  const generated = record?.generated_row ?? record;
  const imageSourceKey = generated?.image_source_key ?? generated?.image_storage_path ?? record?.image_source_key ?? null;
  return {
    image_source_key: imageSourceKey,
    image_url: grookaiImageUrlV1(imageSourceKey),
    image_sha256: generated?.image_sha256 ?? record?.image_sha256 ?? null,
  };
}

async function readJsonl(filePath) {
  const rows = [];
  const stream = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of stream) if (line.trim()) rows.push(JSON.parse(line));
  return rows;
}

export function resolveVisualSearchSourceArtifactPathV1(sourcePath, artifactRoot = null) {
  const normalizedSourcePath = String(sourcePath ?? "").trim();
  if (!normalizedSourcePath) throw new Error("source artifact path is required");

  const root = artifactRoot ? repoPath(artifactRoot) : REPO_ROOT;
  const resolved = path.isAbsolute(normalizedSourcePath)
    ? path.normalize(normalizedSourcePath)
    : path.resolve(root, normalizedSourcePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("source artifact path escapes the configured artifact root");
  }
  return resolved;
}

export async function createVisualSearchImageResolverV1(
  corpusInventoryPath,
  { artifactRoot = null } = {},
) {
  const inventory = await readJsonl(repoPath(corpusInventoryPath));
  const sourceByCard = new Map(inventory.map((row) => [row.card_print_id, row.source_artifact_path]));
  const imageByCard = new Map();
  const sourcePromises = new Map();

  async function loadSource(sourcePath) {
    if (!sourcePromises.has(sourcePath)) {
      const resolvedSourcePath = resolveVisualSearchSourceArtifactPathV1(sourcePath, artifactRoot);
      sourcePromises.set(sourcePath, fs.readFile(resolvedSourcePath, "utf8").then((text) => {
        for (const record of sourceRecords(JSON.parse(text))) {
          const cardId = sourceRecordId(record);
          if (cardId) imageByCard.set(cardId, sourceImageMetadata(record));
        }
      }));
    }
    await sourcePromises.get(sourcePath);
  }

  return {
    inventory_count: inventory.length,
    async resolve(cardIds) {
      const sources = unique(cardIds.filter((cardId) => !imageByCard.has(cardId)).map((cardId) => sourceByCard.get(cardId)));
      await Promise.all(sources.map(loadSource));
      return new Map(cardIds.map((cardId) => [cardId, imageByCard.get(cardId) ?? null]));
    },
  };
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(body) });
  response.end(body);
}

export function createVisualSearchLabServerV1({ engine, uiHtml, imageFetch = fetch }) {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed" });
      if (url.pathname === "/api/health") {
        return sendJson(response, 200, {
          status: "ready",
          version: CARD_VISUAL_SEARCH_LAB_VERSION,
          parser_version: CARD_VISUAL_SEARCH_QUERY_PARSER_VERSION,
          unified_evidence_version:
            CARD_VISUAL_SEARCH_UNIFIED_EVIDENCE_VERSION,
          index_version: engine.candidate_index.version,
          artwork_groups: engine.candidate_index.stats.artwork_groups,
          indexed_entries: engine.candidate_index.stats.indexed_entries,
          curated_cameos: engine.curated_cameo_stats,
          evidence_suppressions: engine.evidence_suppression_stats,
          boundaries: { local_only: true, provider_calls: false, database_connections: false, database_writes: false, approvals: false, embeddings: false, holdout_execution: false, public_release: false },
        });
      }
      if (url.pathname === "/api/search") {
        const query = url.searchParams.get("q") ?? "";
        const limit = Number.parseInt(url.searchParams.get("limit") ?? "24", 10);
        if (!Number.isInteger(limit) || limit < 1 || limit > 48) return sendJson(response, 400, { error: "limit_must_be_1_through_48" });
        return sendJson(response, 200, await engine.search(query, { limit }));
      }
      if (url.pathname === "/api/image") {
        const source = url.searchParams.get("source") ?? "";
        if (!source || source.length > 2048) return sendJson(response, 400, { error: "invalid_image_source" });
        const governedUrl = grookaiImageUrlV1(source);
        if (!governedUrl) return sendJson(response, 400, { error: "unsupported_image_source" });
        const upstream = await imageFetch(governedUrl, { signal: AbortSignal.timeout(20_000) });
        if (!upstream.ok) return sendJson(response, 502, { error: "image_upstream_failed" });
        const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim().toLocaleLowerCase("en-US") ?? "";
        if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(contentType)) return sendJson(response, 502, { error: "image_upstream_type_rejected" });
        const bytes = Buffer.from(await upstream.arrayBuffer());
        if (!bytes.length || bytes.length > 10 * 1024 * 1024) return sendJson(response, 502, { error: "image_upstream_size_rejected" });
        response.writeHead(200, { "Content-Type": contentType, "Cache-Control": "private, max-age=3600", "Content-Length": bytes.length, "X-Content-Type-Options": "nosniff" });
        return response.end(bytes);
      }
      if (url.pathname === "/favicon.ico") {
        response.writeHead(204);
        return response.end();
      }
      if (url.pathname !== "/") return sendJson(response, 404, { error: "not_found" });
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      });
      response.end(uiHtml);
    } catch (error) {
      sendJson(response, error.message.startsWith("query must") ? 400 : 500, { error: error.message.startsWith("query must") ? error.message : "search_lab_error" });
    }
  });
}

export async function startCardVisualSearchLabV1(args = parseCardVisualSearchLabArgsV1(process.argv.slice(2))) {
  if (!LOOPBACK_HOSTS.has(args.host)) throw new Error("search lab must bind to a loopback host");
  if (!Number.isInteger(args.port) || args.port < 1024 || args.port > 65535) throw new Error("port must be an integer from 1024 through 65535");
  const projection = await loadVisualSearchProjectionV1(repoPath(args.projectionDir));
  const [
    imageResolver,
    uiHtml,
    curatedCameoRows,
    reviewedEvidenceRows,
    evidenceSuppressionRows,
  ] = await Promise.all([
    createVisualSearchImageResolverV1(args.corpusInventory, {
      artifactRoot: args.artifactRoot,
    }),
    fs.readFile(repoPath(args.uiPath), "utf8"),
    args.cameoReference
      ? loadCuratedCameoReferenceRowsV1(repoPath(args.cameoReference))
      : Promise.resolve([]),
    args.reviewedEvidence
      ? loadReviewedVisualEvidenceV1(repoPath(args.reviewedEvidence))
      : Promise.resolve([]),
    args.evidenceSuppressions
      ? loadCardVisualSearchEvidenceSuppressionsV1(
        repoPath(args.evidenceSuppressions),
      )
      : Promise.resolve([]),
  ]);
  const effectiveProjection = applyCardVisualSearchEvidenceSuppressionsV1(
    projection.groups,
    evidenceSuppressionRows,
  );
  const combinedCuratedEvidence = [
    ...curatedCameoRows,
    ...reviewedEvidenceRows,
  ];
  const curatedCameos = combinedCuratedEvidence.length
    ? attachCuratedCameoEvidenceV1(
      effectiveProjection.groups,
      combinedCuratedEvidence,
    )
    : {
        groups: effectiveProjection.groups,
        stats: null,
      };
  const engine = createVisualSearchLabEngineV1(curatedCameos.groups, {
    imageResolver,
    curatedCameoStats: curatedCameos.stats,
    evidenceSuppressionStats: effectiveProjection.stats,
  });
  const server = createVisualSearchLabServerV1({ engine, uiHtml });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(args.port, args.host, resolve);
  });
  return {
    server,
    engine,
    url: `http://${args.host}:${args.port}`,
    projection,
    curatedCameos,
    evidenceSuppressions: effectiveProjection,
    imageResolver,
  };
}

export async function main() {
  const started = await startCardVisualSearchLabV1();
  console.log(`[card-visual-search-lab] ready=${started.url}`);
  console.log(`[card-visual-search-lab] artwork_groups=${started.engine.candidate_index.stats.artwork_groups}`);
  console.log(
    `[card-visual-search-lab] curated_cameo_relationships=${started.engine.curated_cameo_stats?.accepted_rows ?? 0}`,
  );
  console.log("[card-visual-search-lab] boundaries=local-only,no-provider,no-db,no-embeddings,no-holdout");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
