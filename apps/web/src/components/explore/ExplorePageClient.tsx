"use client";

import { Fragment, type ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildIdentityFilterCounts,
  getIdentityFilterLabel,
  IDENTITY_FILTER_OPTIONS,
  isIdentityFilterActive,
  matchesIdentityFilter,
  normalizeIdentityFilterKey,
  type IdentityFilterKey,
} from "@/lib/cards/identitySearch";
import CompareTray from "@/components/compare/CompareTray";
import {
  POKEMON_CARD_BROWSE_GRID_CLASSNAME,
  POKEMON_CARD_BROWSE_LARGE_GRID_CLASSNAME,
} from "@/components/cards/pokemonCardGridLayout";
import ExploreCardDetailsRow from "@/components/explore/ExploreCardDetailsRow";
import ExploreCardGridItem from "@/components/explore/ExploreCardGridItem";
import ExploreCardListItem from "@/components/explore/ExploreCardListItem";
import PublicProvisionalSearchSection from "@/components/provisional/PublicProvisionalSearchSection";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import { getSearchContextLabel } from "@/components/explore/searchContextLabel";
import ExploreViewModeToggle from "@/components/explore/ExploreViewModeToggle";
import {
  buildPathWithCompareCards,
  normalizeCompareCardsParam,
} from "@/lib/compareCards";
import {
  normalizeExploreViewMode,
  type ExploreViewMode,
} from "@/lib/exploreViewModes";
import { useClientViewer } from "@/lib/auth/useClientViewer";
import type { ResolverMeta } from "@/lib/resolver/resolveQuery";
import type { PublicProvisionalCard } from "@/lib/provisional/publicProvisionalTypes";
import type { SmartSearchIntent } from "@/lib/search/smartSearchIntent";
import {
  VARIANT_FAMILY_DISCOVERY_COPY,
  type VariantOriginFamilyCopy,
} from "@/lib/cards/variantFamilyDiscoveryCopy";

type ExploreRow = ExploreResultCard;
type SortMode =
  | "relevance"
  | "newest"
  | "oldest"
  | "set_order"
  | "number"
  | "value_high"
  | "value_low";
type ImageConfidenceFilter =
  | "all"
  | "exact"
  | "representative"
  | "missing_variant_visual";
type SearchResultIntent = "exact_version" | "identity" | "cameo" | "related";
type AssistantBoundaryPreview = {
  ok: boolean;
  assistant_available?: boolean;
  entitlement?: {
    allowed: boolean;
    reason: string;
    tier: string;
    dailyLimit: number;
  };
  safety?: {
    model_call_performed: boolean;
    db_writes_allowed: false;
  };
  notes?: string[];
  error?: string;
  message?: string;
};

const INITIAL_VISIBLE_RESULT_COUNT = 48;

const SEARCH_RESULT_INTENT_COPY: Record<
  SearchResultIntent,
  { label: string; description: string }
> = {
  exact_version: {
    label: "Exact version matches",
    description: "Specific finishes, variants, stamps, and printing IDs.",
  },
  identity: {
    label: "Card identity matches",
    description: "Primary card matches ranked by the resolver.",
  },
  cameo: {
    label: "Cameo matches",
    description: "Supplemental appearance context, kept secondary to identity.",
  },
  related: {
    label: "Related results",
    description: "Additional ranked results that may still match the query.",
  },
};

const COLLECTOR_SEARCH_PRESETS = [
  {
    key: "reverse-pikachu-modern",
    title: "Modern Pikachu reverse holos",
    description: "Pikachu reverse holos from 2014 through today.",
    query: "q=Pikachu&year_min=2014&year_max=2026&finish=reverse",
  },
  {
    key: "missing-images",
    title: "Missing image worklist",
    description: "Cards that still need exact image attention.",
    query: "image_state=missing",
  },
  {
    key: "stamped-specials",
    title: "Stamped special cards",
    description: "Special stamped lanes for collector review.",
    query: "identity=stamped",
  },
  {
    key: "owned-reverse",
    title: "My reverse holos",
    description: "Reverse holo cards currently in your vault.",
    query: "finish=reverse&owned=owned",
  },
  {
    key: "vault-gaps-reverse",
    title: "Reverse holo vault gaps",
    description: "Reverse holo cards missing from your vault.",
    query: "finish=reverse&owned=missing",
  },
  {
    key: "exact-images",
    title: "Exact image catalog",
    description: "Cards with exact image confidence.",
    query: "image_state=exact",
  },
];

const FAMILY_QUERY_PATTERNS: Array<{
  key: string;
  labels: string[];
  patterns: RegExp[];
}> = [
  {
    key: "wb_kids_stamp",
    labels: ["WB Kids Stamp", "Inverted WB Kids Stamp", "Missing WB Kids Stamp"],
    patterns: [/\bwb\s+kids\b/i],
  },
  {
    key: "pokemon_center_stamp",
    labels: ["Pokemon Center Stamp"],
    patterns: [/\bpokemon\s+center\b/i],
  },
  {
    key: "build_a_bear_workshop_stamp",
    labels: ["Build-A-Bear Workshop Stamp"],
    patterns: [/\bbuild[-\s]?a[-\s]?bear\b/i],
  },
  {
    key: "toys_r_us_stamp",
    labels: ["Toys R Us Stamp"],
    patterns: [/\btoys\s*r\s*us\b/i],
  },
  {
    key: "burger_king_stamped_promo",
    labels: ["Burger King Stamp"],
    patterns: [/\bburger\s+king\b/i],
  },
  {
    key: "pokemon_together_stamp",
    labels: ["Pokemon Together Stamp"],
    patterns: [/\bpokemon\s+together\b/i],
  },
  {
    key: "first_edition",
    labels: ["First Edition"],
    patterns: [/\bfirst\s+edition\b/i, /\b1st\s+edition\b/i],
  },
  {
    key: "jungle_no_symbol_error",
    labels: ["Jungle No Symbol Error"],
    patterns: [/\bno\s+symbol\b/i, /\bjungle\s+no\s+symbol\b/i],
  },
  {
    key: "base_pikachu_print_run",
    labels: ["Base Pikachu Cheek / Shadowless Print Run"],
    patterns: [/\bshadowless\b/i, /\bred\s+cheeks?\b/i, /\byellow\s+cheeks?\b/i, /\bgray\s+stamp\b/i, /\bgrey\s+stamp\b/i],
  },
  {
    key: "winner_stamp",
    labels: ["Winner Stamp"],
    patterns: [/\bwinner\s+stamp\b/i],
  },
  {
    key: "pokemon_league_or_placement_stamp",
    labels: ["League Stamp"],
    patterns: [/\bleague\s+stamp\b/i, /\bplacement\s+stamp\b/i],
  },
];

function getVariantFamilyFromIntent(
  intent: SmartSearchIntent | null,
  rawQuery: string,
  activeStamp: string,
) {
  const stampLabels = new Set([
    ...(intent?.stampLabels ?? []),
    ...(activeStamp ? [activeStamp] : []),
  ]);
  const haystack = [intent?.originalQuery, rawQuery, activeStamp]
    .filter(Boolean)
    .join(" ");

  for (const family of FAMILY_QUERY_PATTERNS) {
    if (
      family.labels.some((label) => stampLabels.has(label)) ||
      family.patterns.some((pattern) => pattern.test(haystack))
    ) {
      return VARIANT_FAMILY_DISCOVERY_COPY[family.key] ?? null;
    }
  }

  return null;
}

function getDiscoveryTitle(payload: {
  familyCopy: VariantOriginFamilyCopy | null;
  normalizedQuery: string;
  smartSearchIntent: SmartSearchIntent | null;
  fallback: string;
}) {
  if (payload.familyCopy) {
    return payload.familyCopy.family_label;
  }

  const labels = payload.smartSearchIntent?.interpretedLabels ?? [];
  const residual = payload.smartSearchIntent?.residualQuery || payload.normalizedQuery;
  const collectorLabels = labels.filter((label) => !/^\d{4}-\d{4}$/.test(label));

  if (residual && collectorLabels.length > 0) {
    return `${residual} ${collectorLabels[0]}`;
  }

  return residual || collectorLabels[0] || payload.fallback;
}

function getCollectorObjectNoun(familyCopy: VariantOriginFamilyCopy | null) {
  if (!familyCopy) {
    return "collector results";
  }

  if (familyCopy.variant_category.includes("stamp")) {
    return "stamped identities";
  }

  if (familyCopy.variant_category.includes("error")) {
    return "recognized variants";
  }

  if (familyCopy.variant_category.includes("subset")) {
    return "subset identities";
  }

  return "collector identities";
}

function getSingularCollectorObjectNoun(familyCopy: VariantOriginFamilyCopy | null) {
  if (!familyCopy) {
    return "collector result";
  }

  if (familyCopy.variant_category.includes("stamp")) {
    return "stamped identity";
  }

  if (familyCopy.variant_category.includes("error")) {
    return "recognized variant";
  }

  if (familyCopy.variant_category.includes("subset")) {
    return "subset identity";
  }

  return "collector identity";
}

function isCameoLabel(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (
    normalized.startsWith("cameo:") ||
    normalized.startsWith("cameo trainer:")
  );
}

function classifySearchResultIntent(row: ExploreRow): SearchResultIntent {
  const searchContext = getSearchContextLabel(row);

  if (isCameoLabel(searchContext)) {
    return "cameo";
  }

  if (
    row.search_object_type === "child_printing" ||
    row.printing_gv_id ||
    row.selected_printing_gv_id
  ) {
    return "exact_version";
  }

  if (row.gv_id || row.name) {
    return "identity";
  }

  return "related";
}

function buildContiguousSearchResultGroups(rows: ExploreRow[]) {
  const groups: Array<{ intent: SearchResultIntent; rows: ExploreRow[] }> = [];

  for (const row of rows) {
    const intent = classifySearchResultIntent(row);
    const currentGroup = groups[groups.length - 1];

    if (currentGroup?.intent === intent) {
      currentGroup.rows.push(row);
    } else {
      groups.push({ intent, rows: [row] });
    }
  }

  return groups;
}

function getSearchResultMatchReason(row: ExploreRow) {
  const searchContext = getSearchContextLabel(row);

  if (isCameoLabel(searchContext)) {
    return `Matched ${searchContext}`;
  }

  if (row.search_object_type === "child_printing") {
    return `Matched selected version: ${searchContext ?? row.finish_label ?? "variant"}`;
  }

  if (row.display_discriminator) {
    return `Matched ${row.display_discriminator}`;
  }

  if (row.set_name && row.number) {
    return `Matched identity in ${row.set_name} #${row.number}`;
  }

  if (row.set_name) {
    return `Matched identity in ${row.set_name}`;
  }

  return "Matched card identity";
}

function parseViewMode(value: string | null): ExploreViewMode {
  return normalizeExploreViewMode(value);
}

function parseSortMode(value: string | null): SortMode {
  if (
    value === "newest" ||
    value === "oldest" ||
    value === "set_order" ||
    value === "number" ||
    value === "value_high" ||
    value === "value_low"
  ) {
    return value;
  }

  return "relevance";
}

function parseImageConfidenceFilter(value: string | null): ImageConfidenceFilter {
  if (
    value === "exact" ||
    value === "representative" ||
    value === "missing_variant_visual"
  ) {
    return value;
  }

  return "all";
}

function getImageConfidenceLabel(value: ImageConfidenceFilter) {
  if (value === "exact") return "Exact images";
  if (value === "representative") return "Representative images";
  if (value === "missing_variant_visual") return "Variant image pending";
  return "All images";
}

function getImageConfidenceResultNoun(value: ImageConfidenceFilter) {
  return value === "all"
    ? "result"
    : `${getImageConfidenceLabel(value).toLowerCase()} result`;
}

function formatFilterValue(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function activeFilterSummary(params: { get(name: string): string | null }) {
  const parts = [
    params.get("q") ? `query ${params.get("q")}` : "",
    params.get("set") ? `set ${params.get("set")}` : "",
    params.get("year") ? `year ${params.get("year")}` : "",
    params.get("year_min") || params.get("year_max")
      ? `years ${params.get("year_min") ?? "any"} to ${params.get("year_max") ?? "now"}`
      : "",
    params.get("finish") ? `finish ${params.get("finish")}` : "",
    params.get("stamp") ? `stamp ${params.get("stamp")}` : "",
    params.get("owned") ? `ownership ${params.get("owned")}` : "",
    params.get("image_state") ? `image ${params.get("image_state")}` : "",
    params.get("illustrator") ? `artist ${params.get("illustrator")}` : "",
  ].filter(Boolean);

  return parts.join(", ");
}

function matchesImageConfidenceFilter(
  row: ExploreRow,
  filter: ImageConfidenceFilter,
) {
  if (filter === "all") {
    return true;
  }

  return row.display_image_kind === filter;
}

function normalizeSetCode(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || "";
}

function parseReleaseYear(value?: string | null) {
  const normalized = (value ?? "").trim();
  if (!/^\d{4}$/.test(normalized)) {
    return undefined;
  }

  const parsedYear = Number(normalized);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function normalizeFreeTextQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseIdentityFilter(value: string | null): IdentityFilterKey {
  return normalizeIdentityFilterKey(value);
}

function getResolverSummary(meta: ResolverMeta | null) {
  if (!meta) {
    return null;
  }

  const hasStrongIntent =
    meta.intentSummary.expectedSetCodes.length > 0 ||
    meta.intentSummary.nameTokens.length > 0;
  const refinedMatchSummary = {
    tone: "border-sky-200 bg-sky-50/70",
    title: "Refined match",
    body: "Structured query intent narrowed the pool, but the resolver is still preserving ambiguity instead of forcing a single identity.",
  };

  switch (meta.resolverState) {
    case "DIRECT_MATCH":
      return null;
    case "AMBIGUOUS_MATCH":
      if (hasStrongIntent) {
        return refinedMatchSummary;
      }

      return {
        tone: "border-amber-200 bg-amber-50/70",
        title: "Multiple plausible matches",
        body: "The query is still ambiguous. Review the ranked candidates instead of treating the top result as certain.",
      };
    case "WEAK_MATCH":
      if (hasStrongIntent) {
        return refinedMatchSummary;
      }

      return {
        tone: "border-slate-200 bg-slate-50",
        title: "Weak match",
        body: "These results are approximate. Add a set code, collector number, or promo code to strengthen the match.",
      };
    case "NO_MATCH":
      return {
        tone: "border-slate-200 bg-slate-50",
        title: "No matching cards",
        body: "No viable deterministic match was found for this query.",
      };
  }
}

type ExplorePageClientProps = {
  discoveryContent?: ReactNode;
  canViewPricing: boolean;
};

export default function ExplorePageClient({
  discoveryContent = null,
  canViewPricing,
}: ExplorePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewer = useClientViewer(null);
  const q = searchParams.get("q") ?? "";
  const exactSetCode = normalizeSetCode(searchParams.get("set"));
  const exactReleaseYear = parseReleaseYear(searchParams.get("year"));
  const exactIllustrator = (searchParams.get("illustrator") ?? "").trim() || "";
  const identityFilter = parseIdentityFilter(searchParams.get("identity"));
  const viewMode = parseViewMode(searchParams.get("view"));
  const sortMode = parseSortMode(searchParams.get("sort"));
  const imageConfidenceFilter = parseImageConfidenceFilter(searchParams.get("image"));
  const smartYearMin = (searchParams.get("year_min") ?? "").trim();
  const smartYearMax = (searchParams.get("year_max") ?? "").trim();
  const smartFinish = (searchParams.get("finish") ?? "").trim();
  const smartStamp = (searchParams.get("stamp") ?? "").trim();
  const smartOwned = (searchParams.get("owned") ?? "").trim();
  const smartImageState = (searchParams.get("image_state") ?? "").trim();
  const smartIllustrator = (searchParams.get("illustrator") ?? "").trim();
  const hasExplicitSmartFilters = Boolean(
    smartYearMin ||
      smartYearMax ||
      smartFinish ||
      smartStamp ||
      smartOwned ||
      smartImageState ||
      smartIllustrator,
  );
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const normalizedQuery = normalizeFreeTextQuery(q);
  const shouldServerFilterByIdentity =
    isIdentityFilterActive(identityFilter) &&
    !normalizedQuery &&
    !exactSetCode &&
    !exactReleaseYear &&
    !exactIllustrator;
  const isDiscoveryMode =
    !normalizedQuery &&
    !exactSetCode &&
    !exactReleaseYear &&
    !exactIllustrator &&
    !isIdentityFilterActive(identityFilter) &&
    !hasExplicitSmartFilters;
  const [rows, setRows] = useState<ExploreRow[]>([]);
  const [provisionalRows, setProvisionalRows] = useState<PublicProvisionalCard[]>([]);
  const [resolverMeta, setResolverMeta] = useState<ResolverMeta | null>(null);
  const [smartSearchIntent, setSmartSearchIntent] = useState<SmartSearchIntent | null>(null);
  const [assistantPreview, setAssistantPreview] =
    useState<AssistantBoundaryPreview | null>(null);
  const [assistantPreviewLoading, setAssistantPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleResultCount, setVisibleResultCount] = useState(
    INITIAL_VISIBLE_RESULT_COUNT,
  );
  const effectiveCanViewPricing = canViewPricing || viewer.isAuthenticated;

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (
        !normalizedQuery &&
        !exactSetCode &&
        !exactReleaseYear &&
        !exactIllustrator &&
        !isIdentityFilterActive(identityFilter) &&
        !hasExplicitSmartFilters
      ) {
        setRows([]);
        setProvisionalRows([]);
        setResolverMeta(null);
        setSmartSearchIntent(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (q) {
          params.set("q", q);
        }

        if (sortMode !== "relevance") {
          params.set("sort", sortMode);
        }

        if (exactSetCode) {
          params.set("set", exactSetCode);
        }

        if (typeof exactReleaseYear === "number") {
          params.set("year", String(exactReleaseYear));
        }

        if (exactIllustrator) {
          params.set("illustrator", exactIllustrator);
        }

        if (smartYearMin) {
          params.set("year_min", smartYearMin);
        }

        if (smartYearMax) {
          params.set("year_max", smartYearMax);
        }

        if (smartFinish) {
          params.set("finish", smartFinish);
        }

        if (smartStamp) {
          params.set("stamp", smartStamp);
        }

        if (smartOwned) {
          params.set("owned", smartOwned);
        }

        if (smartImageState) {
          params.set("image_state", smartImageState);
        }

        if (shouldServerFilterByIdentity) {
          params.set("identity", identityFilter);
        }

        const response = await fetch(
          `/api/resolver/search?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          rows?: ExploreRow[];
          canonical?: ExploreRow[];
          provisional?: PublicProvisionalCard[];
          meta?: ResolverMeta;
          smart_search?: SmartSearchIntent;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "Search failed.");
        }

        setRows(payload.canonical ?? payload.rows ?? []);
        setProvisionalRows(payload.provisional ?? []);
        setResolverMeta(payload.meta ?? null);
        setSmartSearchIntent(payload.smart_search ?? null);
        setAssistantPreview(null);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        setError(
          searchError instanceof Error ? searchError.message : "Search failed.",
        );
        setRows([]);
        setProvisionalRows([]);
        setResolverMeta(null);
        setSmartSearchIntent(null);
        setAssistantPreview(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [
    q,
    normalizedQuery,
    sortMode,
    exactSetCode,
    exactReleaseYear,
    exactIllustrator,
    smartYearMin,
    smartYearMax,
    smartFinish,
    smartStamp,
    smartOwned,
    smartImageState,
    hasExplicitSmartFilters,
    identityFilter,
    shouldServerFilterByIdentity,
  ]);

  useEffect(() => {
    setVisibleResultCount(INITIAL_VISIBLE_RESULT_COUNT);
  }, [
    normalizedQuery,
    sortMode,
    exactSetCode,
    exactReleaseYear,
    exactIllustrator,
    smartYearMin,
    smartYearMax,
    smartFinish,
    smartStamp,
    smartOwned,
    smartImageState,
    identityFilter,
    imageConfidenceFilter,
  ]);

  const commitViewMode = (nextViewMode: ExploreViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextViewMode);
    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const commitSortMode = (nextSortMode: SortMode) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSortMode === "relevance") {
      params.delete("sort");
    } else {
      params.set("sort", nextSortMode);
    }

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const commitIdentityFilter = (nextFilter: IdentityFilterKey) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextFilter === "all") {
      params.delete("identity");
    } else {
      params.set("identity", nextFilter);
    }

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const commitImageConfidenceFilter = (nextFilter: ImageConfidenceFilter) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextFilter === "all") {
      params.delete("image");
    } else {
      params.set("image", nextFilter);
    }

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const buildCardHref = (row: Pick<ExploreRow, "gv_id" | "selected_printing_gv_id" | "printing_gv_id" | "route_query">) => {
    const selectedPrintingGvId = row.selected_printing_gv_id ?? row.printing_gv_id;
    const params = new URLSearchParams();
    if (selectedPrintingGvId) {
      params.set("printing", selectedPrintingGvId);
    } else if (row.route_query) {
      const routeParams = new URLSearchParams(row.route_query);
      const printing = routeParams.get("printing");
      if (printing) {
        params.set("printing", printing);
      }
    }

    return buildPathWithCompareCards(`/card/${row.gv_id}`, params.toString(), compareCards);
  };
  const currentPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const pricingSignInHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const displayRows =
    shouldServerFilterByIdentity || !isIdentityFilterActive(identityFilter)
      ? rows.filter((row) =>
          matchesImageConfidenceFilter(row, imageConfidenceFilter),
        )
      : rows
          .filter((row) => matchesIdentityFilter(row, identityFilter))
          .filter((row) =>
            matchesImageConfidenceFilter(row, imageConfidenceFilter),
          );
  const visibleRows = displayRows.slice(0, visibleResultCount);
  const visibleResultGroups = buildContiguousSearchResultGroups(visibleRows);
  const hasMoreResults = visibleRows.length < displayRows.length;
  const getResultKey = (row: ExploreRow) =>
    row.search_card_printing_id ?? row.printing_gv_id ?? row.id;
  const identityFilterCounts = buildIdentityFilterCounts(rows);
  const visibleIdentityFilters = IDENTITY_FILTER_OPTIONS.filter(
    (option) =>
      option.key === "all" ||
      identityFilterCounts[option.key] > 0 ||
      option.key === identityFilter,
  );
  const resolverSummary = normalizedQuery
    ? getResolverSummary(resolverMeta)
    : null;
  const interpretedLabels = smartSearchIntent?.interpretedLabels ?? [];
  const unappliedLabels = smartSearchIntent?.unappliedLabels ?? [];
  const residualQuery =
    smartSearchIntent && smartSearchIntent.residualQuery && smartSearchIntent.residualQuery !== smartSearchIntent.originalQuery
      ? smartSearchIntent.residualQuery
      : "";
  const assistantPrompt =
    smartSearchIntent?.originalQuery ||
    normalizedQuery ||
    activeFilterSummary(searchParams);
  const assistantPreviewMessage = assistantPreview
    ? assistantPreview.ok
      ? assistantPreview.assistant_available
        ? "Assistant is available for this account. This preview still performed no model call."
        : "Assistant is gated right now. Grookai Search still handled this deterministically."
      : assistantPreview.message ?? "Assistant preview is unavailable."
    : "";
  const handleAssistantPreview = async () => {
    const prompt = assistantPrompt.trim();
    if (!prompt || assistantPreviewLoading) {
      return;
    }

    setAssistantPreviewLoading(true);
    setAssistantPreview(null);

    try {
      const response = await fetch("/api/assistant/search-interpretation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          mode: "search_interpretation",
        }),
      });
      const payload = (await response.json()) as AssistantBoundaryPreview;
      setAssistantPreview(payload);
    } catch {
      setAssistantPreview({
        ok: false,
        message: "Assistant preview could not be reached.",
      });
    } finally {
      setAssistantPreviewLoading(false);
    }
  };
  const buildSmartSearchRefinementHref = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };
  const residualOnlyHref = residualQuery
    ? buildSmartSearchRefinementHref((params) => {
        params.set("q", residualQuery);
        params.delete("year");
      })
    : null;
  const pinnedArtistHref = smartSearchIntent?.artist
    ? buildSmartSearchRefinementHref((params) => {
        if (residualQuery) {
          params.set("q", residualQuery);
        }
        params.set("illustrator", smartSearchIntent.artist ?? "");
      })
    : null;
  const pinnedImageHref =
    smartSearchIntent?.imageState === "exact" ||
    smartSearchIntent?.imageState === "representative" ||
    smartSearchIntent?.imageState === "missing"
      ? buildSmartSearchRefinementHref((params) => {
          if (residualQuery) {
            params.set("q", residualQuery);
          }
          params.set("image_state", smartSearchIntent.imageState ?? "");
          if (smartSearchIntent.imageState === "exact") {
            params.set("image", "exact");
          } else if (smartSearchIntent.imageState === "representative") {
            params.set("image", "representative");
          } else if (smartSearchIntent.imageState === "missing") {
            params.set("image", "missing_variant_visual");
          }
        })
      : null;
  const pinnedSmartFiltersHref =
    smartSearchIntent && interpretedLabels.length > 0
      ? buildSmartSearchRefinementHref((params) => {
          if (residualQuery) {
            params.set("q", residualQuery);
          }
          params.delete("year_min");
          params.delete("year_max");
          params.delete("finish");
          params.delete("stamp");
          params.delete("owned");
          params.delete("image_state");

          if (typeof smartSearchIntent.releaseYearMin === "number") {
            params.set("year_min", String(smartSearchIntent.releaseYearMin));
          }
          if (typeof smartSearchIntent.releaseYearMax === "number") {
            params.set("year_max", String(smartSearchIntent.releaseYearMax));
          }
          for (const finishKey of smartSearchIntent.finishKeys) {
            params.append("finish", finishKey);
          }
          for (const stampLabel of smartSearchIntent.stampLabels) {
            params.append("stamp", stampLabel);
          }
          if (smartSearchIntent.ownedState && smartSearchIntent.ownedState !== "any") {
            params.set("owned", smartSearchIntent.ownedState);
          }
          if (smartSearchIntent.imageState && smartSearchIntent.imageState !== "any") {
            params.set("image_state", smartSearchIntent.imageState);
            if (smartSearchIntent.imageState === "exact") {
              params.set("image", "exact");
            } else if (smartSearchIntent.imageState === "representative") {
              params.set("image", "representative");
            } else if (smartSearchIntent.imageState === "missing") {
              params.set("image", "missing_variant_visual");
            }
          }
          if (smartSearchIntent.artist) {
            params.set("illustrator", smartSearchIntent.artist);
          }
        })
      : null;
  const clearSmartFiltersHref = hasExplicitSmartFilters
    ? buildSmartSearchRefinementHref((params) => {
        params.delete("year_min");
        params.delete("year_max");
        params.delete("finish");
        params.delete("stamp");
        params.delete("owned");
        params.delete("image_state");
        params.delete("illustrator");
      })
    : null;
  const buildRemoveFilterHref = (keys: string[]) =>
    buildSmartSearchRefinementHref((params) => {
      for (const key of keys) {
        params.delete(key);
      }
    });
  const activeFilterChips = [
    normalizedQuery
      ? {
          key: "query",
          label: "Search",
          value: normalizedQuery,
          href: buildRemoveFilterHref(["q"]),
        }
      : null,
    exactSetCode
      ? {
          key: "set",
          label: "Set",
          value: exactSetCode.toUpperCase(),
          href: buildRemoveFilterHref(["set"]),
        }
      : null,
    typeof exactReleaseYear === "number"
      ? {
          key: "year",
          label: "Year",
          value: String(exactReleaseYear),
          href: buildRemoveFilterHref(["year"]),
        }
      : null,
    smartYearMin || smartYearMax
      ? {
          key: "year-range",
          label: "Years",
          value: `${smartYearMin || "Any"}-${smartYearMax || "Now"}`,
          href: buildRemoveFilterHref(["year_min", "year_max"]),
        }
      : null,
    smartFinish
      ? {
          key: "finish",
          label: "Finish",
          value: formatFilterValue(smartFinish),
          href: buildRemoveFilterHref(["finish"]),
        }
      : null,
    smartStamp
      ? {
          key: "stamp",
          label: "Stamp",
          value: smartStamp,
          href: buildRemoveFilterHref(["stamp"]),
        }
      : null,
    smartImageState
      ? {
          key: "image-state",
          label: "Image truth",
          value:
            smartImageState === "missing"
              ? "Missing or pending"
              : formatFilterValue(smartImageState),
          href: buildRemoveFilterHref(["image_state", "image"]),
        }
      : imageConfidenceFilter !== "all"
        ? {
            key: "image-confidence",
            label: "Image",
            value: getImageConfidenceLabel(imageConfidenceFilter),
            href: buildRemoveFilterHref(["image"]),
          }
        : null,
    smartOwned
      ? {
          key: "owned",
          label: "Vault",
          value: smartOwned === "owned" ? "In my vault" : "Missing from vault",
          href: buildRemoveFilterHref(["owned"]),
        }
      : null,
    smartIllustrator
      ? {
          key: "illustrator",
          label: "Artist",
          value: smartIllustrator,
          href: buildRemoveFilterHref(["illustrator"]),
        }
      : null,
    isIdentityFilterActive(identityFilter)
      ? {
          key: "identity",
          label: "Identity",
          value: getIdentityFilterLabel(identityFilter),
          href: buildRemoveFilterHref(["identity"]),
        }
      : null,
  ].filter(
    (
      chip,
    ): chip is {
      key: string;
      label: string;
      value: string;
      href: string;
    } => Boolean(chip),
  );
  const ownershipState =
    smartSearchIntent?.ownedState && smartSearchIntent.ownedState !== "any"
      ? smartSearchIntent.ownedState
      : null;
  const ownershipRequiresSignIn = unappliedLabels.includes(
    "Vault ownership requires sign in",
  );
  const ownershipScopeCopy = ownershipRequiresSignIn
    ? {
        tone: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-300/20 dark:bg-amber-400/[0.12] dark:text-amber-100",
        label: "Vault filter paused",
        title: "Sign in to search your vault",
        body: "Ownership filters need your active vault inventory. The catalog filter is still safe, but owned and missing-from-vault matching cannot apply while signed out.",
      }
    : ownershipState === "owned"
      ? {
          tone: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-400/[0.12] dark:text-emerald-100",
          label: "Vault scope",
          title: "Searching cards in your vault",
          body: "Results are anchored to active raw and slab-backed cards in your Grookai Vault.",
        }
      : ownershipState === "missing"
        ? {
            tone: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-300/20 dark:bg-sky-400/[0.12] dark:text-sky-100",
            label: "Vault gap scope",
            title: "Searching cards missing from your vault",
            body: "Grookai is comparing this scoped catalog search against your active vault inventory.",
          }
        : null;
  const resultCountLabel =
    displayRows.length > 0
      ? visibleRows.length < displayRows.length
        ? `Showing ${visibleRows.length} of ${displayRows.length} ${getImageConfidenceResultNoun(imageConfidenceFilter)}s`
        : `${displayRows.length} ${getImageConfidenceResultNoun(imageConfidenceFilter)}${displayRows.length === 1 ? "" : "s"}`
      : "Results";
  const variantFamilyCopy = getVariantFamilyFromIntent(
    smartSearchIntent,
    normalizedQuery,
    smartStamp,
  );
  const discoveryTitle = getDiscoveryTitle({
    familyCopy: variantFamilyCopy,
    normalizedQuery,
    smartSearchIntent,
    fallback: "Collector discovery",
  });
  const discoveryNoun = getCollectorObjectNoun(variantFamilyCopy);
  const discoveryCountLabel =
    displayRows.length === 1
      ? `1 ${getSingularCollectorObjectNoun(variantFamilyCopy)}`
      : `${displayRows.length} ${discoveryNoun}`;
  const discoveryEyebrow = variantFamilyCopy
    ? "Family identified"
    : interpretedLabels.length > 0
      ? "Search understood"
      : "Collector discovery";
  const discoveryDescription = variantFamilyCopy?.why_it_exists
    ?? (normalizedQuery
      ? "Grookai is using deterministic card identity, finish, set, ownership, image, and variant signals to narrow the catalog."
      : "Search the catalog by collector language, variants, finishes, stamps, artists, ownership, and years.");
  const discoverySupportingCopy = variantFamilyCopy?.why_collectors_care
    ?? (interpretedLabels.length > 0
      ? "The cards below are grouped as collector objects first, with database identifiers kept secondary."
      : "Results are presented as collectible identities, not just rows.");
  const emptyStateTitle = ownershipRequiresSignIn
    ? "Sign in to search your vault"
    : ownershipState === "owned" && viewer.isAuthenticated
      ? "No owned cards match this search"
      : ownershipState === "missing" && viewer.isAuthenticated
        ? "No missing cards found for this scope"
        : imageConfidenceFilter !== "all" && rows.length > 0
          ? `No ${getImageConfidenceLabel(imageConfidenceFilter).toLowerCase()} in these results`
          : resolverMeta?.resolverState === "NO_MATCH" && normalizedQuery
            ? "No card match yet"
            : isIdentityFilterActive(identityFilter)
              ? `No ${getIdentityFilterLabel(identityFilter).toLowerCase()} cards found`
              : "No results yet";
  const emptyStateBody = ownershipRequiresSignIn
    ? "Sign in and run the same search again. Grookai will use your active vault inventory instead of guessing ownership."
    : ownershipState === "owned" && viewer.isAuthenticated
      ? "These filters are valid, but none of your active vault cards match them yet."
      : ownershipState === "missing" && viewer.isAuthenticated
        ? "Your vault already covers this scoped search, or the scoped catalog filter returned no eligible cards."
        : imageConfidenceFilter !== "all" && rows.length > 0
          ? "The canonical cards still exist. This filter is only narrowing by current image confidence."
          : resolverMeta?.resolverState === "NO_MATCH" && normalizedQuery
            ? `Nothing matched "${normalizedQuery}". Try a card name plus set code, collector number, finish, or cameo subject.`
            : "Try a card name, set code, collector number, finish, trainer, or cameo subject.";
  const emptyState = (
    <div className="rounded-[20px] border border-slate-200 bg-white px-5 py-7 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <p className="gv-hi-card-identity text-base font-semibold text-slate-950 dark:text-slate-50">
        {emptyStateTitle}
      </p>
      <p className="mt-2 max-w-xl leading-6">
        {emptyStateBody}
      </p>
      {ownershipRequiresSignIn ? (
        <Link
          href={pricingSignInHref}
          className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
        >
          Sign in to apply vault filters
        </Link>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {["pikachu masterball", "sv8pt5 exeggutor pokeball", "GV-PK-ME03-033-RH", "cameo charizard"].map((suggestion) => (
          <Link
            key={suggestion}
            href={buildPathWithCompareCards(
              "/explore",
              `q=${encodeURIComponent(suggestion)}`,
              compareCards,
            )}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            {suggestion}
          </Link>
        ))}
      </div>
    </div>
  );
  const loadingState = (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Searching cards</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Ranking identity, finish, ownership context, and cameo signals.
          </p>
        </div>
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-900 dark:bg-slate-100" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-[16px] border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="h-28 rounded-xl bg-slate-200/70 dark:bg-slate-800" />
            <div className="mt-3 h-3 w-2/3 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="mt-2 h-2.5 w-1/2 rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
          </div>
        ))}
      </div>
    </div>
  );
  const renderGroupHeader = (
    group: { intent: SearchResultIntent; rows: ExploreRow[] },
    options: { table?: boolean } = {},
  ) => {
    const copy = SEARCH_RESULT_INTENT_COPY[group.intent];
    const content = (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {copy.label}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.description}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {group.rows.length}
        </span>
      </div>
    );

    if (options.table) {
      return (
        <tr>
          <td colSpan={7} className="bg-white px-4 pb-2 pt-5 dark:bg-slate-950">
            {content}
          </td>
        </tr>
      );
    }

    return content;
  };
  const showMoreControl = hasMoreResults ? (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={() =>
          setVisibleResultCount((current) => current + INITIAL_VISIBLE_RESULT_COUNT)
        }
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      >
        Show more results
      </button>
    </div>
  ) : null;
  const presetSearchStrip = (
    <section className="gv-collector-panel gv-search-showcase px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Collector presets
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Natural-language entry points for identity, finish, ownership, image truth, and variant families.
          </p>
        </div>
        <Link
          href={buildPathWithCompareCards(
            "/explore",
            "q=Build-A-Bear stamped cards",
            compareCards,
          )}
          className="inline-flex shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
        >
          Try sentence search
        </Link>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {COLLECTOR_SEARCH_PRESETS.map((preset) => (
          <Link
            key={preset.key}
            href={buildPathWithCompareCards("/explore", preset.query, compareCards)}
            className="gv-search-preset-card group p-4 text-left"
          >
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
              {preset.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {preset.description}
            </p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 transition group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200">
              Open preset
            </p>
          </Link>
        ))}
      </div>
    </section>
  );

  return (
    <div
      className={`space-y-4 md:space-y-5 ${compareCards.length > 0 ? "pb-28 md:pb-36" : ""}`}
    >
      <div className="gv-collector-panel px-5 py-6 md:px-8 md:py-8">
        <div className="space-y-1 md:hidden">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Discover
          </p>
          <h1 className="text-[1.9rem] font-black tracking-tight text-slate-950 dark:text-slate-50">
            Discover cards
          </h1>
          <p className="max-w-xl text-[13px] leading-5 text-slate-600 dark:text-slate-300">
            Search the canonical catalog by card, finish, stamp, year, artist, ownership, and image truth.
          </p>
          <div className="flex flex-wrap gap-2 pt-px">
            <Link
              href={buildPathWithCompareCards("/sets", "", compareCards)}
              className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
            >
              Browse Sets
            </Link>
            <Link
              href={buildPathWithCompareCards(
                "/explore",
                "q=Pikachu",
                compareCards,
              )}
              className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
            >
              Browse Pokémon
            </Link>
          </div>
        </div>

        <div className="hidden space-y-3 md:block">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Grookai Search
          </p>
          <h1 className="max-w-4xl text-[clamp(3.5rem,7vw,6.75rem)] font-black leading-[0.92] tracking-tight text-slate-950 dark:text-slate-50">
            Search collector reality.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Ask for cards the way collectors think: reverse holo Pikachu from 2014-2026, Pokemon Center stamped promos, Komiya art, or cards missing from your vault.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isDiscoveryMode ? (
        <>
          {presetSearchStrip}
          {discoveryContent}
          <CompareTray
            cards={compareCards}
            addHref={buildPathWithCompareCards(
              pathname,
              searchParams.toString(),
              compareCards,
            )}
          />
        </>
      ) : (
        <div className="gv-collector-search-results space-y-6">
          <section className="gv-discovery-hero px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-12">
            <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-end">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="gv-discovery-eyebrow">{discoveryEyebrow}</span>
                  {variantFamilyCopy?.confidence ? (
                    <span className="gv-discovery-pill">
                      {formatFilterValue(variantFamilyCopy.confidence)} confidence
                    </span>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <h2 className="max-w-4xl text-[2.75rem] font-semibold leading-[0.96] tracking-normal text-slate-950 dark:text-white sm:text-[4rem] lg:text-[5.2rem]">
                    {discoveryTitle}
                  </h2>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {discoveryDescription}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {interpretedLabels.slice(0, 5).map((label) => (
                    <span key={label} className="gv-discovery-chip">
                      {label}
                    </span>
                  ))}
                  {residualQuery ? (
                    <span className="gv-discovery-chip gv-discovery-chip-muted">
                      Text: {residualQuery}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="gv-discovery-proof-card p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Discovery result
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 dark:text-white">
                  {discoveryCountLabel}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {discoverySupportingCopy}
                </p>
                {variantFamilyCopy?.how_to_identify ? (
                  <div className="mt-4 rounded-2xl bg-white/70 p-3 text-sm leading-6 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                    <span className="font-semibold text-slate-950 dark:text-white">How to identify: </span>
                    {variantFamilyCopy.how_to_identify}
                  </div>
                ) : null}
                {loading && displayRows.length > 0 ? (
                  <span className="mt-4 inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white dark:bg-white dark:text-slate-950">
                    Refreshing
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          <div className="gv-command-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {resultCountLabel}
              {variantFamilyCopy ? (
                <span className="ml-2 hidden text-slate-400 dark:text-slate-500 sm:inline">
                  Source-backed family copy
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span>Sort</span>
                <select
                  value={sortMode}
                  onChange={(event) =>
                    commitSortMode(event.target.value as SortMode)
                  }
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="set_order">Set order</option>
                  <option value="number">Collector number</option>
                  <option value="value_high">Value high to low</option>
                  <option value="value_low">Value low to high</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span>Image</span>
                <select
                  value={imageConfidenceFilter}
                  onChange={(event) =>
                    commitImageConfidenceFilter(
                      event.target.value as ImageConfidenceFilter,
                    )
                  }
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  aria-label="Image confidence filter"
                >
                  <option value="all">All images</option>
                  <option value="exact">Exact images</option>
                  <option value="representative">Representative</option>
                  <option value="missing_variant_visual">Variant pending</option>
                </select>
              </label>
              <ExploreViewModeToggle
                value={viewMode}
                onChange={commitViewMode}
              />
            </div>
          </div>

          {activeFilterChips.length > 0 ? (
            <div className="gv-command-surface px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Active filters
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {activeFilterChips.length} active filter{activeFilterChips.length === 1 ? "" : "s"} narrowing {displayRows.length} result{displayRows.length === 1 ? "" : "s"}.
                  </p>
                </div>
                {activeFilterChips.length > 1 ? (
                  <Link
                    href={buildSmartSearchRefinementHref((params) => {
                      params.delete("q");
                      params.delete("set");
                      params.delete("year");
                      params.delete("year_min");
                      params.delete("year_max");
                      params.delete("finish");
                      params.delete("stamp");
                      params.delete("owned");
                      params.delete("image_state");
                      params.delete("image");
                      params.delete("illustrator");
                      params.delete("identity");
                    })}
                    className="inline-flex shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
                  >
                    Clear all
                  </Link>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFilterChips.map((chip) => (
                  <Link
                    key={chip.key}
                    href={chip.href}
                    className="group inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-slate-50"
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      {chip.label}
                    </span>
                    <span className="truncate font-semibold">{chip.value}</span>
                    <span
                      aria-hidden="true"
                      className="rounded-full bg-slate-100 px-1.5 text-xs font-bold text-slate-500 transition group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-100 dark:group-hover:text-slate-950"
                    >
                      x
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {presetSearchStrip}

          {visibleIdentityFilters.length > 1 ? (
            <div className="gv-command-surface flex flex-wrap gap-2 px-4 py-3">
              {visibleIdentityFilters.map((option) => {
                const selected = identityFilter === option.key;
                const count = identityFilterCounts[option.key];

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => commitIdentityFilter(option.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      selected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span>{option.label}</span>
                    {count > 0 ? (
                      <span
                        className={`text-[11px] ${selected ? "text-white/80" : "text-slate-500"}`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {resolverSummary ? (
            <div
              className={`rounded-[16px] border px-4 py-3 text-sm shadow-sm ${resolverSummary.tone}`}
            >
              <p className="font-medium text-slate-900">
                {resolverSummary.title}
              </p>
              <p className="mt-1 text-slate-600">{resolverSummary.body}</p>
            </div>
          ) : null}

          {interpretedLabels.length > 0 || residualQuery || unappliedLabels.length > 0 ? (
            <div className="gv-soft-surface px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Smart search interpretation
                  </p>
                  {residualQuery ? (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Searching trusted catalog for <span className="text-slate-950 dark:text-slate-50">&quot;{residualQuery}&quot;</span>
                    </p>
                  ) : null}
                </div>
                {interpretedLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {interpretedLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-sky-800 dark:border-sky-300/20 dark:bg-sky-400/[0.13] dark:text-sky-200"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {unappliedLabels.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-700/70">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Not applied
                  </span>
                  {unappliedLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/[0.13] dark:text-amber-200"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
              {residualOnlyHref || pinnedArtistHref || pinnedImageHref || pinnedSmartFiltersHref ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-700/70">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Refine
                  </span>
                  {pinnedSmartFiltersHref ? (
                    <Link
                      href={pinnedSmartFiltersHref}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800 transition hover:border-emerald-300 hover:text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-400/[0.13] dark:text-emerald-200"
                    >
                      Pin smart filters
                    </Link>
                  ) : null}
                  {residualOnlyHref ? (
                    <Link
                      href={residualOnlyHref}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-slate-50"
                    >
                      Search text only
                    </Link>
                  ) : null}
                  {pinnedArtistHref ? (
                    <Link
                      href={pinnedArtistHref}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-slate-50"
                    >
                      Pin artist filter
                    </Link>
                  ) : null}
                  {pinnedImageHref ? (
                    <Link
                      href={pinnedImageHref}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-slate-50"
                    >
                      Pin image filter
                    </Link>
                  ) : null}
                </div>
              ) : null}
              {assistantPrompt ? (
                <div className="mt-3 rounded-[16px] border border-violet-200/70 bg-violet-50/70 p-3 dark:border-violet-300/20 dark:bg-violet-400/[0.10]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                        Grookai Assistant
                      </p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        Premium AI will explain variants, gaps, and collection strategy from Grookai data. Search results stay deterministic.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAssistantPreview}
                      disabled={assistantPreviewLoading}
                      className="rounded-full border border-violet-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-800 shadow-sm transition hover:border-violet-400 hover:text-violet-950 disabled:cursor-wait disabled:opacity-60 dark:border-violet-300/30 dark:bg-slate-950/60 dark:text-violet-100 dark:hover:text-white"
                    >
                      {assistantPreviewLoading ? "Checking..." : "Check access"}
                    </button>
                  </div>
                  {assistantPreview ? (
                    <div className="mt-3 border-t border-violet-200/70 pt-3 text-sm text-slate-700 dark:border-violet-300/20 dark:text-slate-300">
                      <p className="font-medium text-slate-900 dark:text-slate-50">
                        {assistantPreviewMessage}
                      </p>
                      {assistantPreview.entitlement ? (
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Tier: {formatFilterValue(assistantPreview.entitlement.tier)} / Reason:{" "}
                          {formatFilterValue(assistantPreview.entitlement.reason)}
                        </p>
                      ) : null}
                      {assistantPreview.safety ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Model call: {assistantPreview.safety.model_call_performed ? "yes" : "no"} / DB writes:{" "}
                          {assistantPreview.safety.db_writes_allowed ? "yes" : "no"}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {ownershipScopeCopy ? (
            <div className={`rounded-[18px] border px-4 py-3 text-sm shadow-sm ${ownershipScopeCopy.tone}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">
                    {ownershipScopeCopy.label}
                  </p>
                  <p className="mt-1 font-semibold">{ownershipScopeCopy.title}</p>
                  <p className="mt-1 max-w-3xl leading-6 opacity-80">
                    {ownershipScopeCopy.body}
                  </p>
                </div>
                {ownershipRequiresSignIn ? (
                  <Link
                    href={pricingSignInHref}
                    className="inline-flex shrink-0 justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                  >
                    Sign in
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          <details
            open={hasExplicitSmartFilters}
            className="gv-soft-surface group px-4 py-3"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Smart filters
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Pin exact filters for year, finish, stamp, image confidence, ownership, and artist.
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 transition group-open:bg-slate-950 group-open:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:group-open:bg-slate-100 dark:group-open:text-slate-950">
                {hasExplicitSmartFilters ? "Editing" : "Open"}
              </span>
            </summary>
            <form action={pathname} method="get" className="mt-4 space-y-4 border-t border-slate-200/70 pt-4 dark:border-slate-700/70">
              {q ? <input type="hidden" name="q" value={q} /> : null}
              {sortMode !== "relevance" ? <input type="hidden" name="sort" value={sortMode} /> : null}
              {viewMode !== "thumb" ? <input type="hidden" name="view" value={viewMode} /> : null}
              {compareCards.length > 0 ? (
                <input type="hidden" name="cards" value={compareCards.join(",")} />
              ) : null}
              {exactSetCode ? <input type="hidden" name="set" value={exactSetCode} /> : null}
              {typeof exactReleaseYear === "number" ? (
                <input type="hidden" name="year" value={String(exactReleaseYear)} />
              ) : null}
              {isIdentityFilterActive(identityFilter) ? (
                <input type="hidden" name="identity" value={identityFilter} />
              ) : null}
              {imageConfidenceFilter !== "all" ? (
                <input type="hidden" name="image" value={imageConfidenceFilter} />
              ) : null}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    From year
                  </span>
                  <input
                    name="year_min"
                    defaultValue={smartYearMin}
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    placeholder="2014"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    To year
                  </span>
                  <input
                    name="year_max"
                    defaultValue={smartYearMax}
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    placeholder="2026"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Finish
                  </span>
                  <select
                    name="finish"
                    defaultValue={smartFinish}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  >
                    <option value="">Any finish</option>
                    <option value="normal">Normal</option>
                    <option value="holo">Holo</option>
                    <option value="reverse">Reverse holo</option>
                    <option value="cosmos">Cosmos holo</option>
                    <option value="cracked_ice">Cracked ice</option>
                    <option value="rocket_reverse">Rocket reverse</option>
                    <option value="poke_ball_reverse">Poke Ball reverse</option>
                    <option value="master_ball_reverse">Master Ball reverse</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Image truth
                  </span>
                  <select
                    name="image_state"
                    defaultValue={smartImageState}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  >
                    <option value="">Any image</option>
                    <option value="exact">Exact image</option>
                    <option value="representative">Representative image</option>
                    <option value="missing">Missing or pending image</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Vault
                  </span>
                  <select
                    name="owned"
                    defaultValue={smartOwned}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  >
                    <option value="">Any ownership</option>
                    <option value="owned">In my vault</option>
                    <option value="missing">Missing from my vault</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Artist
                  </span>
                  <input
                    name="illustrator"
                    defaultValue={smartIllustrator}
                    placeholder="Atsuko Nishida"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  />
                </label>
                <label className="space-y-1.5 md:col-span-2 xl:col-span-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Stamp or special label
                  </span>
                  <input
                    name="stamp"
                    defaultValue={smartStamp}
                    placeholder="Build-A-Bear Workshop Stamp"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  Apply smart filters
                </button>
                {clearSmartFiltersHref ? (
                  <Link
                    href={clearSmartFiltersHref}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
                  >
                    Clear smart filters
                  </Link>
                ) : null}
              </div>
            </form>
          </details>

          {loading && displayRows.length === 0 ? (
            loadingState
          ) : viewMode === "list" ? (
            <div className="space-y-5">
              {visibleResultGroups.map((group, groupIndex) => (
                <section key={`${group.intent}-${groupIndex}`} className="space-y-3">
                  {renderGroupHeader(group)}
                  <ul className="space-y-3">
                    {group.rows.map((row) => (
                      <ExploreCardListItem
                        key={getResultKey(row)}
                        card={row}
                        href={buildCardHref(row)}
                        canViewPricing={effectiveCanViewPricing}
                        signInHref={pricingSignInHref}
                        matchReason={getSearchResultMatchReason(row)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
              {displayRows.length === 0 && !loading ? emptyState : null}
              {showMoreControl}
            </div>
          ) : viewMode === "details" ? (
            <div className="space-y-3">
              <div className="md:hidden">
                <div className="space-y-5">
                  {visibleResultGroups.map((group, groupIndex) => (
                    <section key={`${group.intent}-${groupIndex}`} className="space-y-3">
                      {renderGroupHeader(group)}
                      <ul className="space-y-3">
                        {group.rows.map((row) => (
                          <ExploreCardListItem
                            key={getResultKey(row)}
                            card={row}
                            href={buildCardHref(row)}
                            canViewPricing={effectiveCanViewPricing}
                            signInHref={pricingSignInHref}
                            matchReason={getSearchResultMatchReason(row)}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                  {displayRows.length === 0 && !loading ? emptyState : null}
                  {showMoreControl}
                </div>
              </div>
              <div className="hidden overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Card
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Set
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Number
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Rarity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Variant
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Grookai Value
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Compare
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleResultGroups.map((group, groupIndex) => (
                        <Fragment key={`${group.intent}-${groupIndex}`}>
                          {renderGroupHeader(group, { table: true })}
                          {group.rows.map((row) => (
                            <ExploreCardDetailsRow
                              key={getResultKey(row)}
                              card={row}
                              href={buildCardHref(row)}
                              canViewPricing={effectiveCanViewPricing}
                              signInHref={pricingSignInHref}
                              matchReason={getSearchResultMatchReason(row)}
                            />
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {displayRows.length === 0 && !loading ? (
                  <div className="p-4">{emptyState}</div>
                ) : null}
              </div>
              <div className="hidden md:block">{showMoreControl}</div>
            </div>
          ) : viewMode === "thumb-lg" ? (
            <div className="space-y-5">
              {visibleResultGroups.map((group, groupIndex) => (
                <section key={`${group.intent}-${groupIndex}`} className="space-y-3">
                  {renderGroupHeader(group)}
                  <div className={POKEMON_CARD_BROWSE_LARGE_GRID_CLASSNAME}>
                    {group.rows.map((row) => (
                      <ExploreCardGridItem
                        key={getResultKey(row)}
                        card={row}
                        href={buildCardHref(row)}
                        mode="thumb-lg"
                        canViewPricing={effectiveCanViewPricing}
                        matchReason={getSearchResultMatchReason(row)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {displayRows.length === 0 && !loading ? emptyState : null}
              {showMoreControl}
            </div>
          ) : (
            <div className="space-y-5">
              {visibleResultGroups.map((group, groupIndex) => (
                <section key={`${group.intent}-${groupIndex}`} className="space-y-3">
                  {renderGroupHeader(group)}
                  <div className={POKEMON_CARD_BROWSE_GRID_CLASSNAME}>
                    {group.rows.map((row) => (
                      <ExploreCardGridItem
                        key={getResultKey(row)}
                        card={row}
                        href={buildCardHref(row)}
                        mode="thumb"
                        canViewPricing={effectiveCanViewPricing}
                        matchReason={getSearchResultMatchReason(row)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {displayRows.length === 0 && !loading ? emptyState : null}
              {showMoreControl}
            </div>
          )}

          <PublicProvisionalSearchSection cards={provisionalRows} />
        </div>
      )}

      {!isDiscoveryMode &&
      displayRows.length > 0 &&
      effectiveCanViewPricing &&
      viewMode === "details" ? (
        <div className="text-xs text-slate-500 md:hidden">
          Beta market estimate.
        </div>
      ) : null}

      {!isDiscoveryMode &&
      displayRows.length > 0 &&
      effectiveCanViewPricing &&
      (viewMode === "thumb" ||
        viewMode === "thumb-lg" ||
        viewMode === "list") ? (
        <div className="hidden text-xs text-slate-500 sm:block">
          Beta market estimate. Derived from active listings and market data.
        </div>
      ) : null}

      {!isDiscoveryMode ? (
        <CompareTray
          cards={compareCards}
          addHref={buildPathWithCompareCards(
            pathname,
            searchParams.toString(),
            compareCards,
          )}
        />
      ) : null}
    </div>
  );
}
