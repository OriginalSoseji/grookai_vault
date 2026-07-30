import {
  normalizeVisualSearchTextV1,
} from "./card_visual_search_evaluation_bootstrap_v1.mjs";

export const CARD_VISUAL_SEARCH_COLLECTOR_QUERY_VERSION =
  "CARD_VISUAL_SEARCH_COLLECTOR_QUERY_V1";

const SUBJECT_ALIASES = Object.freeze({
  ghastly: "gastly",
  pika: "pikachu",
});

const NUMBER_WORDS = new Map([
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
  ["thirteen", 13],
  ["fourteen", 14],
  ["fifteen", 15],
  ["sixteen", 16],
  ["seventeen", 17],
  ["eighteen", 18],
  ["nineteen", 19],
  ["twenty", 20],
]);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function numberValue(value) {
  if (NUMBER_WORDS.has(value)) return NUMBER_WORDS.get(value);
  if (/^\d{1,3}$/u.test(value)) return Number.parseInt(value, 10);
  return null;
}

export function normalizeCollectorQueryAliasesV1(value) {
  let normalized = normalizeVisualSearchTextV1(value).replace(
    /(?<=\p{L})-(?=\p{L})/gu,
    " ",
  );
  const appliedAliases = [];
  for (const [alias, canonical] of Object.entries(SUBJECT_ALIASES)) {
    const pattern = new RegExp(`\\b${escapeRegex(alias)}\\b`, "gu");
    if (!pattern.test(normalized)) continue;
    normalized = normalized.replace(pattern, canonical);
    appliedAliases.push({ alias, canonical });
  }
  normalized = normalized
    .replace(/\bpok[ée]\s*balls?\b/gu, "poke ball")
    .replace(/\bpokeballs?\b/gu, "poke ball")
    .replace(/\s+/gu, " ")
    .trim();
  return { normalized, applied_aliases: appliedAliases };
}

function overlaps(left, right) {
  return left.start < right.end && right.start < left.end;
}

export function detectCollectorSubjectGroupsV1(value, subjects) {
  const mentions = [];
  for (const subject of subjects) {
    const pattern = new RegExp(
      `(?:^| )${escapeRegex(subject.normalized)}(?= |$)`,
      "gu",
    );
    for (const match of value.matchAll(pattern)) {
      const leadingSpace = match[0].startsWith(" ") ? 1 : 0;
      const candidate = {
        start: match.index + leadingSpace,
        end: match.index + leadingSpace + subject.normalized.length,
        normalized_name: subject.normalized,
        canonical_name: subject.canonical,
      };
      if (mentions.some((existing) => overlaps(existing, candidate))) continue;
      mentions.push(candidate);
    }
  }
  mentions.sort((left, right) => left.start - right.start);

  const groups = [];
  for (let index = 0; index < mentions.length; index += 1) {
    const mention = mentions[index];
    if (!groups.length) {
      groups.push([mention]);
      continue;
    }
    const previous = mentions[index - 1];
    const connector = value.slice(previous.end, mention.start);
    if (/\bor\b/u.test(connector)) groups.at(-1).push(mention);
    else groups.push([mention]);
  }

  const characters = [...value];
  for (const mention of mentions) {
    for (let index = mention.start; index < mention.end; index += 1) {
      characters[index] = " ";
    }
  }
  return {
    remaining_text: characters.join("").replace(/\s+/gu, " ").trim(),
    mentions: mentions.map(({ start, end, ...mention }) => mention),
    subject_groups: groups.map((group) =>
      unique(group.map((mention) => mention.canonical_name)),
    ),
  };
}

export function parseMinimumPokemonCountV1(value) {
  const pattern =
    /\b(?:at least\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d{1,3})\s+pok[eé]mon|(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d{1,3})\s+or more\s+pok[eé]mon)\b/u;
  const match = value.match(pattern);
  if (!match) return { remaining_text: value, constraint: null };
  const minimum = numberValue(match[1] ?? match[2]);
  if (!minimum) return { remaining_text: value, constraint: null };
  return {
    remaining_text: value
      .replace(pattern, " ")
      .replace(/\s+/gu, " ")
      .trim(),
    constraint: {
      subject_class: "pokemon",
      operator: "gte",
      minimum_count: minimum,
      scope: "all_visible_pokemon_appearances",
    },
  };
}

export function parseHoldingRelationshipV1(value) {
  const pattern =
    /\b(?:holding|holds?|carrying|carries)\s+(?:a |an |the )?([\p{L}\p{N}'-]+(?:\s+[\p{L}\p{N}'-]+){0,3})\b/u;
  const match = value.match(pattern);
  if (!match) return { remaining_text: value, constraint: null };
  const object = match[1]
    .replace(/\b(?:and|or|with|in|on|near|beside|together)\b[\s\S]*$/u, "")
    .trim();
  if (!object) return { remaining_text: value, constraint: null };
  return {
    remaining_text: value
      .replace(match[0], " ")
      .replace(/\s+/gu, " ")
      .trim(),
    constraint: {
      predicate: "holding",
      object,
      subject_binding: "required",
    },
  };
}
