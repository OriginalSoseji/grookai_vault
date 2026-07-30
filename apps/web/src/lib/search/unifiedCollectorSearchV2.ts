export const UNIFIED_COLLECTOR_SEARCH_INTENT_V2 =
  "UnifiedCollectorSearchIntentV2" as const;
export const VISUAL_EVIDENCE_AUTHORITY_V2 =
  "VisualEvidenceAuthorityV2" as const;
export const UNIFIED_COLLECTOR_SEARCH_RESPONSE_V2 =
  "UnifiedCollectorSearchResponseV2" as const;

export type VisualAppearanceRoleV2 =
  | "scene_subject"
  | "depicted_subject"
  | "character_representation"
  | "curated_association_unresolved"
  | "visual_resemblance_reference";

export type VisualEvidenceAuthorityV2 =
  | "observation_backed"
  | "human_image_confirmed"
  | "external_role_confirmed";

export type UnifiedCollectorSearchChipV2 = {
  key: string;
  label: string;
  kind: "character" | "same_artwork" | "appearance_role" | "visual_fact";
  hard: boolean;
};

export type UnifiedCollectorSearchIntentV2 = {
  version: typeof UNIFIED_COLLECTOR_SEARCH_INTENT_V2;
  originalQuery: string;
  subjectGroups: string[][];
  requestedRole: VisualAppearanceRoleV2 | null;
  representationForm: string | null;
  depictedSurface: string | null;
  chips: UnifiedCollectorSearchChipV2[];
  semanticConcepts: string[];
  aliases: Array<{ alias: string; canonical: string }>;
};

export type UnifiedCollectorSearchEvidenceV2 = {
  term: string;
  appearanceRole: VisualAppearanceRoleV2 | null;
  appearanceIdentity: string | null;
  qualifiers: string[];
  authority: VisualEvidenceAuthorityV2;
  confidence: number | null;
};

export type UnifiedCollectorSearchResultV2 = {
  artworkGroupId: string;
  representativeCardPrintId: string;
  representativeName: string;
  eligibilityTier: string;
  promptBranch: string;
  groupKey:
    | "exact_matches"
    | "cards_named"
    | "artwork_appearances"
    | "depicted_appearances"
    | "character_representations"
    | "visual_resemblances";
  reason: string;
  evidence: UnifiedCollectorSearchEvidenceV2[];
  printings: Array<{
    cardPrintId: string;
    gvId: string | null;
    name: string;
    setCode: string | null;
    number: string | null;
  }>;
};

export type UnifiedCollectorSearchResponseV2 = {
  version: typeof UNIFIED_COLLECTOR_SEARCH_RESPONSE_V2;
  available: boolean;
  source:
    | "active_visual_search_release"
    | "feature_disabled"
    | "no_active_release"
    | "unsupported_visual_intent"
    | "visual_search_unavailable";
  intent: UnifiedCollectorSearchIntentV2 | null;
  groups: Array<{
    key: UnifiedCollectorSearchResultV2["groupKey"];
    label: string;
    results: UnifiedCollectorSearchResultV2[];
  }>;
  totalMatches: number;
  zeroState: null | {
    message: string;
    constraintCoverage: Array<{ label: string; artworkMatches: number }>;
    relaxations: Array<{ label: string; query: string; resultCount: number }>;
  };
};

export function unavailableUnifiedCollectorSearchV2(
  source: Exclude<
    UnifiedCollectorSearchResponseV2["source"],
    "active_visual_search_release"
  >,
  intent: UnifiedCollectorSearchIntentV2 | null = null,
): UnifiedCollectorSearchResponseV2 {
  return {
    version: UNIFIED_COLLECTOR_SEARCH_RESPONSE_V2,
    available: false,
    source,
    intent,
    groups: [],
    totalMatches: 0,
    zeroState: null,
  };
}
