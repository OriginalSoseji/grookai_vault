import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";
import {
  UNIFIED_COLLECTOR_SEARCH_INTENT_V2,
  UNIFIED_COLLECTOR_SEARCH_RESPONSE_V2,
  unavailableUnifiedCollectorSearchV2,
  type UnifiedCollectorSearchEvidenceV2,
  type UnifiedCollectorSearchIntentV2,
  type UnifiedCollectorSearchResponseV2,
  type UnifiedCollectorSearchResultV2,
  type VisualAppearanceRoleV2,
  type VisualEvidenceAuthorityV2,
} from "@/lib/search/unifiedCollectorSearchV2";

const SPECIES_PAGE_SIZE = 1_000;
const MAX_CANDIDATE_GROUPS = 500;
const INDEPENDENT_ROLES = new Set<VisualAppearanceRoleV2>([
  "scene_subject",
  "depicted_subject",
]);
const UNQUALIFIED_ROLES = new Set<VisualAppearanceRoleV2>([
  ...INDEPENDENT_ROLES,
  "character_representation",
]);
const SEARCHABLE_ROLES = new Set<VisualAppearanceRoleV2>([
  ...UNQUALIFIED_ROLES,
  "visual_resemblance_reference",
]);
const REPRESENTATION_FORMS = [
  "cookie",
  "food",
  "ice cream",
  "pillow",
  "plush",
  "statue",
  "toy",
  "pin",
  "badge",
  "costume",
  "logo",
  "sticker",
  "pattern",
] as const;
const DEPICTED_SURFACES = [
  "poster",
  "screen",
  "painting",
  "picture",
  "photograph",
  "sign",
  "book",
  "card",
] as const;
const SUPPORTED_QUERY_GRAMMAR = new Set([
  "a",
  "an",
  "and",
  "appearing",
  "appears",
  "artwork",
  "artworks",
  "as",
  "both",
  "by",
  "card",
  "cards",
  "cameo",
  "depicted",
  "every",
  "find",
  "in",
  "inspired",
  "like",
  "lookalike",
  "looks",
  "me",
  "of",
  "on",
  "or",
  "physically",
  "printed",
  "present",
  "resemblance",
  "resembles",
  "shaped",
  "show",
  "shown",
  "the",
  "together",
  "visible",
  "where",
  "with",
]);
const SUBJECT_ALIASES = new Map([
  ["pika", "pikachu"],
  ["ghastly", "gastly"],
]);
const GROUP_LABELS: Record<UnifiedCollectorSearchResultV2["groupKey"], string> = {
  exact_matches: "Exact artwork matches",
  cards_named: "Cards named for this character",
  artwork_appearances: "Character appearances in artwork",
  depicted_appearances: "Characters depicted on another surface",
  character_representations: "Character-shaped objects",
  visual_resemblances: "Visual resemblance references",
};

type SpeciesName = {
  canonical: string;
  normalized: string;
};

type CandidateRow = {
  artwork_group_id: string | null;
};

type StructuredConcept = {
  source_type?: string | null;
  source_id?: string | null;
  term?: string | null;
  subject_role?: string | null;
  supporting_observation_ids?: string[] | null;
  supporting_external_evidence_ids?: string[] | null;
  governance_status?: string | null;
  evidence_authority?: string | null;
  confidence?: number | null;
};

type HydratedDocument = {
  document_type?: string | null;
  canonical_context?: { name?: string | null } | null;
  structured_concepts?: StructuredConcept[] | null;
};

type HydratedPrinting = {
  card_print_id?: string | null;
  gv_id?: string | null;
  name?: string | null;
  set_code?: string | null;
  number?: string | null;
};

type HydratedEvidenceAssertion = {
  assertion_hash?: string | null;
  represented_identity_kind?: string | null;
  represented_identity?: string | null;
  appearance_role?: string | null;
  host_surface?: string | null;
  host_object?: string | null;
  representation_form?: string | null;
  evidence_authority?: string | null;
  supporting_observation_ids?: string[] | null;
  supporting_external_evidence_ids?: string[] | null;
  evidence_payload?: Record<string, unknown> | null;
};

type HydratedEvidenceSuppression = {
  suppression_id?: string | null;
  target_observation_ids?: string[] | null;
  target_source_ids?: string[] | null;
  authority?: string | null;
  decision?: string | null;
  rationale?: string | null;
  suppression_hash?: string | null;
};

type HydratedGroup = {
  artwork_group_id: string | null;
  representative_card_print_id: string | null;
  eligibility_tier: string | null;
  prompt_branch: string | null;
  documents: HydratedDocument[] | null;
  evidence_assertions: HydratedEvidenceAssertion[] | null;
  evidence_suppressions: HydratedEvidenceSuppression[] | null;
  printings: HydratedPrinting[] | null;
};

type ParsedRoleEvidence = {
  role: VisualAppearanceRoleV2;
  identity: string;
  qualifiers: string[];
  evidence: UnifiedCollectorSearchEvidenceV2;
};

let speciesNamesPromise: Promise<SpeciesName[]> | null = null;

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearch(value: unknown) {
  return normalize(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc\uff07]/gu, "'")
    .replace(/[_-]+/gu, " ")
    .replace(/[^a-z0-9.' ]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(" ");
}

async function loadSpeciesNames(): Promise<SpeciesName[]> {
  if (speciesNamesPromise) return speciesNamesPromise;
  speciesNamesPromise = (async () => {
    const admin = createServerAdminClient();
    const rows: Array<{ display_name: string | null; slug: string | null }> = [];
    for (let from = 0; ; from += SPECIES_PAGE_SIZE) {
      const { data, error } = await admin
        .from("pokemon_species")
        .select("display_name,slug")
        .eq("active", true)
        .order("display_name", { ascending: true })
        .range(from, from + SPECIES_PAGE_SIZE - 1);
      if (error) throw new Error(`[visual-search:species] ${error.message}`);
      const page = (data ?? []) as Array<{
        display_name: string | null;
        slug: string | null;
      }>;
      rows.push(...page);
      if (page.length < SPECIES_PAGE_SIZE) break;
    }
    return rows
      .map((row) => {
        const canonical = normalize(row.display_name) || titleCase(normalizeSearch(row.slug));
        return { canonical, normalized: normalizeSearch(canonical) };
      })
      .filter((row) => row.canonical && row.normalized)
      .sort((left, right) => right.normalized.length - left.normalized.length);
  })();
  return speciesNamesPromise;
}

function findIdentityMentions(
  normalizedQuery: string,
  speciesNames: SpeciesName[],
) {
  const matches: Array<{
    start: number;
    end: number;
    canonical: string;
    normalized: string;
    alias: string | null;
  }> = [];
  const padded = ` ${normalizedQuery} `;
  for (const species of speciesNames) {
    const needle = ` ${species.normalized} `;
    let offset = padded.indexOf(needle);
    while (offset >= 0) {
      matches.push({
        start: Math.max(0, offset - 1),
        end: Math.max(0, offset - 1) + species.normalized.length,
        canonical: species.canonical,
        normalized: species.normalized,
        alias: null,
      });
      offset = padded.indexOf(needle, offset + needle.length);
    }
  }
  for (const [alias, canonical] of SUBJECT_ALIASES) {
    const needle = ` ${alias} `;
    let offset = padded.indexOf(needle);
    while (offset >= 0) {
      matches.push({
        start: Math.max(0, offset - 1),
        end: Math.max(0, offset - 1) + alias.length,
        canonical: speciesNames.find((row) => row.normalized === canonical)?.canonical ?? titleCase(canonical),
        normalized: canonical,
        alias,
      });
      offset = padded.indexOf(needle, offset + needle.length);
    }
  }
  return matches
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .filter((row, index, all) =>
      !all.slice(0, index).some(
        (prior) => row.start < prior.end && row.end > prior.start,
      ),
    );
}

function parseRole(normalizedQuery: string) {
  const representationForm = REPRESENTATION_FORMS.find((form) =>
    ` ${normalizedQuery} `.includes(` ${form} `),
  ) ?? null;
  const depictedSurface = DEPICTED_SURFACES.find((surface) =>
    ` ${normalizedQuery} `.includes(` ${surface} `),
  ) ?? null;
  if (/\b(?:looks? like|resembl(?:es|ance)|lookalike|inspired by)\b/u.test(normalizedQuery)) {
    return {
      requestedRole: "visual_resemblance_reference" as const,
      representationForm,
      depictedSurface,
    };
  }
  if (representationForm) {
    return {
      requestedRole: "character_representation" as const,
      representationForm,
      depictedSurface,
    };
  }
  if (depictedSurface) {
    return {
      requestedRole: "depicted_subject" as const,
      representationForm,
      depictedSurface,
    };
  }
  return { requestedRole: null, representationForm, depictedSurface };
}

function hasUnsupportedQueryTerms(
  normalizedQuery: string,
  mentions: ReturnType<typeof findIdentityMentions>,
) {
  const characters = [...normalizedQuery];
  for (const mention of mentions) {
    for (
      let index = Math.max(0, mention.start);
      index < Math.min(characters.length, mention.end);
      index += 1
    ) {
      characters[index] = " ";
    }
  }
  const residualTokens = normalizeSearch(characters.join(""))
    .split(" ")
    .filter(Boolean)
    .filter((token) => !SUPPORTED_QUERY_GRAMMAR.has(token))
    .filter(
      (token) =>
        !REPRESENTATION_FORMS.some((form) => form.split(" ").includes(token)),
    )
    .filter(
      (token) =>
        !DEPICTED_SURFACES.includes(
          token as (typeof DEPICTED_SURFACES)[number],
        ),
    );
  return residualTokens.length > 0;
}

export async function parseUnifiedCollectorSearchIntentV2(
  query: string,
): Promise<UnifiedCollectorSearchIntentV2 | null> {
  const originalQuery = normalize(query);
  const normalizedQuery = normalizeSearch(originalQuery);
  if (normalizedQuery.length < 2) return null;
  const mentions = findIdentityMentions(normalizedQuery, await loadSpeciesNames());
  if (!mentions.length) return null;
  if (hasUnsupportedQueryTerms(normalizedQuery, mentions)) return null;

  const subjectGroups: string[][] = [];
  for (let index = 0; index < mentions.length; index += 1) {
    const mention = mentions[index];
    if (index === 0) {
      subjectGroups.push([mention.canonical]);
      continue;
    }
    const previous = mentions[index - 1];
    const connector = normalizedQuery.slice(previous.end, mention.start);
    if (/\bor\b/u.test(connector)) {
      subjectGroups[subjectGroups.length - 1].push(mention.canonical);
    } else {
      subjectGroups.push([mention.canonical]);
    }
  }
  const { requestedRole, representationForm, depictedSurface } =
    parseRole(normalizedQuery);
  const aliases = mentions
    .filter((mention) => mention.alias)
    .map((mention) => ({
      alias: mention.alias as string,
      canonical: mention.canonical,
    }));
  const chips: UnifiedCollectorSearchIntentV2["chips"] = subjectGroups.flat().map((subject) => ({
    key: `subject:${normalizeSearch(subject)}`,
    label: subject,
    kind: "character" as const,
    hard: true,
  }));
  if (subjectGroups.length > 1) {
    chips.push({
      key: "same_artwork",
      label: "Both in the same artwork",
      kind: "same_artwork",
      hard: true,
    });
  }
  if (requestedRole) {
    chips.push({
      key: `role:${requestedRole}`,
      label:
        requestedRole === "character_representation"
          ? "Character-shaped object"
          : requestedRole === "depicted_subject"
            ? "Depicted on another surface"
            : "Visual resemblance only",
      kind: "appearance_role",
      hard: true,
    });
  }
  return {
    version: UNIFIED_COLLECTOR_SEARCH_INTENT_V2,
    originalQuery,
    subjectGroups,
    requestedRole,
    representationForm,
    depictedSurface,
    chips,
    semanticConcepts: [],
    aliases,
  };
}

function evidenceAuthority(
  concept: StructuredConcept,
): VisualEvidenceAuthorityV2 | null {
  const governance = normalizeSearch(concept.governance_status);
  const authority = normalizeSearch(concept.evidence_authority);
  if (
    governance === "external exact candidate" ||
    governance === "review only" ||
    authority === "external exact candidate" ||
    authority === "approved role unresolved"
  ) {
    return null;
  }
  if (governance === "human image confirmed" || authority === "human image confirmed") {
    return "human_image_confirmed";
  }
  if (governance === "external role confirmed" || authority === "external role confirmed") {
    return "external_role_confirmed";
  }
  return concept.supporting_observation_ids?.length
    ? "observation_backed"
    : null;
}

function parseRoleEvidence(concept: StructuredConcept): ParsedRoleEvidence | null {
  const sourceType = normalizeSearch(concept.source_type);
  const role = normalize(concept.subject_role) as VisualAppearanceRoleV2;
  if (!["subject role", "curated cameo role"].includes(sourceType)) return null;
  if (!SEARCHABLE_ROLES.has(role)) return null;
  const rawParts = normalize(concept.term).split(/\s*:\s*/u);
  if (rawParts.length < 2 || normalizeSearch(rawParts[0]) !== normalizeSearch(role)) return null;
  const authority = evidenceAuthority(concept);
  if (!authority) return null;
  return {
    role,
    identity: normalizeSearch(rawParts[1]),
    qualifiers: rawParts.slice(2).map(normalizeSearch).filter(Boolean),
    evidence: {
      term: normalize(concept.term),
      appearanceRole: role,
      appearanceIdentity: rawParts[1],
      qualifiers: rawParts.slice(2),
      authority,
      confidence: Number.isFinite(concept.confidence)
        ? (concept.confidence as number)
        : null,
    },
  };
}

function parseAssertionEvidence(
  assertion: HydratedEvidenceAssertion,
): ParsedRoleEvidence | null {
  const role = normalize(assertion.appearance_role) as VisualAppearanceRoleV2;
  const identity = normalize(assertion.represented_identity);
  const authority = normalize(
    assertion.evidence_authority,
  ) as VisualEvidenceAuthorityV2;
  if (
    !SEARCHABLE_ROLES.has(role) ||
    !identity ||
    !["human_image_confirmed", "external_role_confirmed"].includes(authority)
  ) {
    return null;
  }
  const qualifiers = [
    assertion.representation_form,
    assertion.host_object,
    assertion.host_surface,
  ]
    .map(normalize)
    .filter(Boolean);
  const term = [role, identity, ...qualifiers].join(": ");
  return {
    role,
    identity: normalizeSearch(identity),
    qualifiers: qualifiers.map(normalizeSearch),
    evidence: {
      term,
      appearanceRole: role,
      appearanceIdentity: identity,
      qualifiers,
      authority,
      confidence: 1,
    },
  };
}

function roleIdentityMatches(identity: string, evidence: ParsedRoleEvidence) {
  const requested = normalizeSearch(identity);
  return evidence.identity === requested || evidence.identity.startsWith(`${requested} `);
}

function qualifiersMatch(
  intent: UnifiedCollectorSearchIntentV2,
  evidence: ParsedRoleEvidence,
) {
  const qualifierText = evidence.qualifiers.join(" ");
  if (intent.representationForm) {
    const requested = normalizeSearch(intent.representationForm);
    if (requested === "food") {
      if (!/\b(?:food|cookie|cake|candy|pastry|dessert|sweet|ice cream)\b/u.test(qualifierText)) return false;
    } else if (!qualifierText.includes(requested)) {
      return false;
    }
  }
  if (
    intent.depictedSurface &&
    !qualifierText.includes(normalizeSearch(intent.depictedSurface))
  ) {
    return false;
  }
  return true;
}

function allRoleEvidence(group: HydratedGroup) {
  const suppressions = group.evidence_suppressions ?? [];
  const conceptIsSuppressed = (concept: StructuredConcept) =>
    suppressions.some(
      (suppression) =>
        (suppression.target_source_ids ?? []).includes(
          normalize(concept.source_id),
        ) ||
        (suppression.target_observation_ids ?? []).some((observationId) =>
          (concept.supporting_observation_ids ?? []).includes(observationId),
        ),
    );
  return [
    ...(group.documents ?? [])
      .flatMap((document) => document.structured_concepts ?? [])
      .filter((concept) => !conceptIsSuppressed(concept))
      .map(parseRoleEvidence),
    ...(group.evidence_assertions ?? []).map(parseAssertionEvidence),
  ].filter((row): row is ParsedRoleEvidence => Boolean(row));
}

function canonicalName(group: HydratedGroup) {
  return normalize(
    group.printings?.[0]?.name ??
      group.documents?.find((document) => document.canonical_context?.name)
        ?.canonical_context?.name,
  );
}

function matchGroup(
  group: HydratedGroup,
  intent: UnifiedCollectorSearchIntentV2,
): UnifiedCollectorSearchResultV2 | null {
  const roleEvidence = allRoleEvidence(group);
  const evidence: ParsedRoleEvidence[] = [];
  const isMultiSubject = intent.subjectGroups.length > 1;

  for (const alternatives of intent.subjectGroups) {
    const allowedRoles = intent.requestedRole
      ? new Set([intent.requestedRole])
      : isMultiSubject
        ? INDEPENDENT_ROLES
        : UNQUALIFIED_ROLES;
    const match = roleEvidence.find(
      (row) =>
        allowedRoles.has(row.role) &&
        alternatives.some((identity) => roleIdentityMatches(identity, row)) &&
        qualifiersMatch(intent, row),
    );
    if (match) {
      evidence.push(match);
      continue;
    }
    const canonicalMatch =
      !isMultiSubject &&
      !intent.requestedRole &&
      alternatives.some(
        (identity) => normalizeSearch(identity) === normalizeSearch(canonicalName(group)),
      );
    if (!canonicalMatch) return null;
  }

  const namedMatch =
    !isMultiSubject &&
    !intent.requestedRole &&
    intent.subjectGroups[0]?.some(
      (identity) => normalizeSearch(identity) === normalizeSearch(canonicalName(group)),
    );
  const roles = new Set(evidence.map((row) => row.role));
  const groupKey: UnifiedCollectorSearchResultV2["groupKey"] = isMultiSubject
    ? "exact_matches"
    : namedMatch
      ? "cards_named"
      : roles.has("scene_subject")
        ? "artwork_appearances"
        : roles.has("depicted_subject")
          ? "depicted_appearances"
          : roles.has("character_representation")
            ? "character_representations"
            : "visual_resemblances";
  const subjects = intent.subjectGroups.map((row) => row.join(" or "));
  const reason = isMultiSubject
    ? `${subjects.join(" and ")} are independently visible in the same artwork.`
    : groupKey === "cards_named"
      ? `The card's canonical identity is ${subjects[0]}.`
      : groupKey === "artwork_appearances"
        ? `${subjects[0]} appears as an independent character in the artwork.`
        : groupKey === "depicted_appearances"
          ? `${subjects[0]} is depicted on another visible surface.`
          : groupKey === "character_representations"
            ? `A ${subjects[0]}-shaped object is visible in the artwork.`
            : `The artwork contains a visual resemblance reference to ${subjects[0]}.`;
  return {
    artworkGroupId: normalize(group.artwork_group_id),
    representativeCardPrintId: normalize(group.representative_card_print_id),
    representativeName: canonicalName(group),
    eligibilityTier: normalize(group.eligibility_tier),
    promptBranch: normalize(group.prompt_branch),
    groupKey,
    reason,
    evidence: evidence.map((row) => row.evidence),
    printings: (group.printings ?? []).map((printing) => ({
      cardPrintId: normalize(printing.card_print_id),
      gvId: normalize(printing.gv_id) || null,
      name: normalize(printing.name),
      setCode: normalize(printing.set_code) || null,
      number: normalize(printing.number) || null,
    })),
  };
}

function zeroState(
  intent: UnifiedCollectorSearchIntentV2,
  groups: HydratedGroup[] = [],
): UnifiedCollectorSearchResponseV2["zeroState"] {
  const labels = intent.subjectGroups.map((group) => group.join(" or "));
  const constraintCoverage = intent.subjectGroups.map((alternatives) => ({
    label: alternatives.join(" or "),
    artworkMatches: groups.filter((group) =>
      allRoleEvidence(group).some(
        (row) =>
          INDEPENDENT_ROLES.has(row.role) &&
          alternatives.some((identity) => roleIdentityMatches(identity, row)),
      ),
    ).length,
  }));
  const message =
    labels.length === 2
      ? `We found ${labels[0]} cards and ${labels[1]} cards, but none where both are independently visible in the same artwork.`
      : "No artwork in the active visual index proves every requested constraint.";
  return {
    message,
    constraintCoverage,
    relaxations: constraintCoverage.map((row) => ({
      label: `Show ${row.label}`,
      query: row.label,
      resultCount: row.artworkMatches,
    })),
  };
}

export function isUnifiedCollectorSearchV2Enabled() {
  return process.env.GROOKAI_UNIFIED_COLLECTOR_SEARCH_V2_ENABLED === "true";
}

export async function getUnifiedCollectorVisualSearchV2(
  query: string,
  { limit = 24 }: { limit?: number } = {},
): Promise<UnifiedCollectorSearchResponseV2> {
  if (!isUnifiedCollectorSearchV2Enabled()) {
    return unavailableUnifiedCollectorSearchV2("feature_disabled");
  }

  let intent: UnifiedCollectorSearchIntentV2 | null = null;
  try {
    intent = await parseUnifiedCollectorSearchIntentV2(query);
    if (!intent) {
      return unavailableUnifiedCollectorSearchV2("unsupported_visual_intent");
    }
    const activeIntent = intent;
    const requestedIdentities = Array.from(
      new Set(activeIntent.subjectGroups.flat().map(normalizeSearch)),
    );
    const indexKinds = requestedIdentities.map(() => "token");
    const admin = createServerAdminClient();
    const { data: candidateData, error: candidateError } = await admin.rpc(
      "get_card_visual_search_candidates_service_v1",
      {
        index_kinds_in: indexKinds,
        index_keys_in: requestedIdentities,
        limit_in: MAX_CANDIDATE_GROUPS,
      },
    );
    if (candidateError) {
      const source: "no_active_release" | "visual_search_unavailable" =
        /does not exist|could not find the function/iu.test(candidateError.message)
        ? "no_active_release"
        : "visual_search_unavailable";
      return unavailableUnifiedCollectorSearchV2(source, intent);
    }
    const artworkGroupIds = ((candidateData ?? []) as CandidateRow[])
      .map((row) => normalize(row.artwork_group_id))
      .filter(Boolean);
    if (!artworkGroupIds.length) {
      return {
        version: UNIFIED_COLLECTOR_SEARCH_RESPONSE_V2,
        available: true,
        source: "active_visual_search_release",
        intent: activeIntent,
        groups: [],
        totalMatches: 0,
        zeroState: zeroState(activeIntent),
      };
    }
    const { data: hydratedData, error: hydratedError } = await admin.rpc(
      "get_card_visual_search_groups_service_v1",
      { artwork_group_ids_in: artworkGroupIds },
    );
    if (hydratedError) {
      return unavailableUnifiedCollectorSearchV2("visual_search_unavailable", activeIntent);
    }
    const matched = ((hydratedData ?? []) as HydratedGroup[])
      .map((group) => matchGroup(group, activeIntent))
      .filter((row): row is UnifiedCollectorSearchResultV2 => Boolean(row))
      .slice(0, Math.min(Math.max(limit, 1), 64));
    const grouped = new Map<
      UnifiedCollectorSearchResultV2["groupKey"],
      UnifiedCollectorSearchResultV2[]
    >();
    for (const result of matched) {
      const rows = grouped.get(result.groupKey) ?? [];
      rows.push(result);
      grouped.set(result.groupKey, rows);
    }
    return {
      version: UNIFIED_COLLECTOR_SEARCH_RESPONSE_V2,
      available: true,
      source: "active_visual_search_release",
      intent: activeIntent,
      groups: Array.from(grouped.entries()).map(([key, results]) => ({
        key,
        label: GROUP_LABELS[key],
        results,
      })),
      totalMatches: matched.length,
      zeroState: matched.length
        ? null
        : zeroState(activeIntent, (hydratedData ?? []) as HydratedGroup[]),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[visual-search:v2] failed closed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
    return unavailableUnifiedCollectorSearchV2(
      "visual_search_unavailable",
      intent,
    );
  }
}
