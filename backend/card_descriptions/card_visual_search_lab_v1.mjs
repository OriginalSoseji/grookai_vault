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

export const CARD_VISUAL_SEARCH_LAB_VERSION = "CARD_VISUAL_SEARCH_LAB_V1";
export const CARD_VISUAL_SEARCH_QUERY_PARSER_VERSION = "CARD_VISUAL_SEARCH_QUERY_PARSER_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_PROJECTION_DIR = "docs/audits/card_visual_search_projection_v1_5/2026-07-21T17-23-42-102Z_projection_c3e708b1cd15";
const DEFAULT_CORPUS_INVENTORY = "docs/audits/card_visual_corpus_v1/2026-07-21T15-51-01-795Z_inventory_3f72560c3b04/corpus_valid_candidates.jsonl";
const DEFAULT_UI_PATH = "backend/card_descriptions/card_visual_search_lab_v1.html";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const QUERY_GRAMMAR = new Set([
  "a", "all", "an", "art", "artwork", "artworks", "as", "card", "cards", "depicting", "every", "featuring", "find", "for",
  "image", "images", "is", "looking", "me", "of", "or", "please", "show", "shown", "that", "the", "to", "visible", "where",
  "with", "wearing", "shaped",
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
  const canonicalNameByNormalized = new Map(groups.map((group) => [normalizeVisualSearchTextV1(group.name), group.name]));
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

export function parseVisualSearchQueryV1(queryText, parserIndex) {
  const originalQuery = String(queryText ?? "").trim();
  if (originalQuery.length < 2 || originalQuery.length > 180) throw new Error("query must contain 2 through 180 characters");
  let working = queryNormalize(originalQuery);
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

  let subjectRole = null;
  const roleRules = [
    { role: "character_representation", pattern: /\b(?:shaped like|plush|pillow|statue|toy|logo|sticker|pattern|food shape|ice cream)\b/u },
    { role: "depicted_subject", pattern: /\b(?:depicted|poster|photograph|photo|screen|painting|sign|book|card within card)\b/u },
    { role: "scene_subject", pattern: /\b(?:scene subject|physically present)\b/u },
  ];
  for (const rule of roleRules) {
    if (!rule.pattern.test(working)) continue;
    subjectRole = rule.role;
    working = working.replace(rule.pattern, " ").replace(/\s+/gu, " ").trim();
    break;
  }

  const branches = [];
  const branchRules = [
    { branch: "pokemon", pattern: /\bpok[eé]mon\b/iu },
    { branch: "trainer", pattern: /\btrainers?\b/iu },
    { branch: "stadium", pattern: /\bstadiums?\b/iu },
    { branch: "item_tool_supporter", pattern: /\b(?:items?|tools?|supporters?)\b/iu },
  ];
  for (const rule of branchRules) {
    if (!rule.pattern.test(working)) continue;
    branches.push(rule.branch);
    working = working.replace(rule.pattern, " ").replace(/\s+/gu, " ").trim();
  }

  const paddedWorking = ` ${working} `;
  const subject = parserIndex.subjects.find((candidate) => paddedWorking.includes(` ${candidate.normalized} `)) ?? null;
  if (subject) working = removePhrase(working, subject.normalized);

  const tokens = working.split(" ").filter(Boolean);
  const consumed = new Set();
  const countConstraints = parseCountConstraints(tokens, consumed);
  const parsedConcepts = parseVisualConcepts(tokens, consumed, parserIndex);
  const unrecognizedTerms = [...parsedConcepts.unrecognized_terms];
  if (rawSetMatch && !setCodes.length) unrecognizedTerms.push(`set:${rawSetMatch[1]}`);

  return {
    parser_version: CARD_VISUAL_SEARCH_QUERY_PARSER_VERSION,
    original_query: originalQuery,
    normalized_query: queryNormalize(originalQuery),
    detected_subject: subject ? { canonical_name: subject.canonical, normalized_name: subject.normalized } : null,
    intent: {
      canonical_filters: { subjects: subject && !subjectRole ? [subject.canonical] : [], set_codes: setCodes, branches, years: null, artist: [] },
      visual_filters: {
        subject_roles: subjectRole ? [subjectRole] : [],
        concepts: parsedConcepts.concepts,
        colors: [],
        counts: countConstraints,
        relationships: [],
      },
      query_aliases: queryAliases,
      negative_filters: [],
      unrecognized_terms: unique(unrecognizedTerms),
    },
  };
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

function rankedIntentAlternatives(parsed, artworkGroupIds) {
  const primary = baseRankIntent(parsed, artworkGroupIds);
  if (!parsed.detected_subject) return [primary];
  if (parsed.intent.visual_filters.subject_roles.length) {
    primary.canonical_filters = { ...primary.canonical_filters, subjects: [] };
    primary.visual_concepts = unique([parsed.detected_subject.canonical_name, ...primary.visual_concepts]);
    return [primary];
  }
  const visualIdentity = {
    ...primary,
    canonical_filters: { ...primary.canonical_filters, subjects: [] },
    visual_concepts: unique([parsed.detected_subject.canonical_name, ...primary.visual_concepts]),
  };
  return [primary, visualIdentity];
}

function representativePrinting(result) {
  return result.matching_printings.find((printing) => printing.card_print_id === result.representative_card_print_id) ?? result.matching_printings[0] ?? null;
}

export function createVisualSearchLabEngineV1(groups, { imageResolver = null } = {}) {
  const candidateIndex = buildVisualSearchCandidateIndexV1(groups);
  const parserIndex = buildVisualSearchParserIndexV1(groups, candidateIndex);
  return {
    version: CARD_VISUAL_SEARCH_LAB_VERSION,
    candidate_index: candidateIndex,
    parser_index: parserIndex,
    async search(queryText, { limit = 24 } = {}) {
      const started = performance.now();
      const parsed = parseVisualSearchQueryV1(queryText, parserIndex);
      if (parsed.intent.unrecognized_terms.length) {
        return { version: CARD_VISUAL_SEARCH_LAB_VERSION, parsed_query: parsed, strict_zero_reason: "unrecognized_terms", total_matches: 0, results: [], latency_ms: performance.now() - started };
      }
      const hasConstraint = parsed.detected_subject || parsed.intent.canonical_filters.set_codes.length || parsed.intent.canonical_filters.branches.length || parsed.intent.visual_filters.concepts.length || parsed.intent.visual_filters.counts.length || parsed.intent.query_aliases.length;
      if (!hasConstraint) {
        return { version: CARD_VISUAL_SEARCH_LAB_VERSION, parsed_query: parsed, strict_zero_reason: "no_supported_constraints", total_matches: 0, results: [], latency_ms: performance.now() - started };
      }

      const aliasMatches = new Map();
      if (parsed.intent.query_aliases.length) {
        for (const group of groups) {
          const decisions = parsed.intent.query_aliases.map((alias) => matchVisualSearchAliasV1(alias, group));
          if (decisions.every((decision) => decision.matched)) aliasMatches.set(group.artwork_group_id, decisions);
        }
      }
      const allowedGroupIds = parsed.intent.query_aliases.length ? [...aliasMatches.keys()] : [];
      if (parsed.intent.query_aliases.length && !allowedGroupIds.length) {
        return { version: CARD_VISUAL_SEARCH_LAB_VERSION, parsed_query: parsed, strict_zero_reason: "alias_evidence_not_found", total_matches: 0, results: [], latency_ms: performance.now() - started };
      }

      const merged = new Map();
      for (const intent of rankedIntentAlternatives(parsed, allowedGroupIds)) {
        const ranked = rankVisualSearchQueryV1({ intent }, groups, { topK: groups.length, candidateIndex });
        for (const result of ranked.results) {
          const aliases = aliasMatches.get(result.artwork_group_id) ?? [];
          const aliasEvidence = aliases.flatMap((decision) => decision.evidence.map((entry) => ({ ...entry, query_concept: decision.alias, match_authority: "query_alias_evidence" })));
          const existing = merged.get(result.artwork_group_id);
          const candidate = {
            ...result,
            score: result.score + aliases.length * 12,
            score_components: { ...result.score_components, alias_evidence: aliases.length * 12 },
            matched_evidence: [...result.matched_evidence, ...aliasEvidence],
            matched_aliases: aliases.map((decision) => ({ alias: decision.alias, decision_rule: decision.decision_rule })),
          };
          if (!existing || candidate.score > existing.score) merged.set(result.artwork_group_id, candidate);
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
      return {
        version: CARD_VISUAL_SEARCH_LAB_VERSION,
        index_version: candidateIndex.version,
        parsed_query: parsed,
        strict_zero_reason: results.length ? null : "no_evidence_satisfies_all_constraints",
        total_matches: rankedResults.length,
        results,
        latency_ms: performance.now() - started,
      };
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

export async function createVisualSearchImageResolverV1(corpusInventoryPath) {
  const inventory = await readJsonl(repoPath(corpusInventoryPath));
  const sourceByCard = new Map(inventory.map((row) => [row.card_print_id, row.source_artifact_path]));
  const imageByCard = new Map();
  const sourcePromises = new Map();

  async function loadSource(sourcePath) {
    if (!sourcePromises.has(sourcePath)) {
      sourcePromises.set(sourcePath, fs.readFile(repoPath(sourcePath), "utf8").then((text) => {
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
          index_version: engine.candidate_index.version,
          artwork_groups: engine.candidate_index.stats.artwork_groups,
          indexed_entries: engine.candidate_index.stats.indexed_entries,
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
  const [imageResolver, uiHtml] = await Promise.all([
    createVisualSearchImageResolverV1(args.corpusInventory),
    fs.readFile(repoPath(args.uiPath), "utf8"),
  ]);
  const engine = createVisualSearchLabEngineV1(projection.groups, { imageResolver });
  const server = createVisualSearchLabServerV1({ engine, uiHtml });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(args.port, args.host, resolve);
  });
  return { server, engine, url: `http://${args.host}:${args.port}`, projection, imageResolver };
}

export async function main() {
  const started = await startCardVisualSearchLabV1();
  console.log(`[card-visual-search-lab] ready=${started.url}`);
  console.log(`[card-visual-search-lab] artwork_groups=${started.engine.candidate_index.stats.artwork_groups}`);
  console.log("[card-visual-search-lab] boundaries=local-only,no-provider,no-db,no-embeddings,no-holdout");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
