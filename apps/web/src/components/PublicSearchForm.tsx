"use client";

import { useClientReady } from "@/components/layout/useClientReady";

import PublicCardImage from "@/components/PublicCardImage";
import {
  SearchToolbar,
  SearchToolbarButton,
  SearchToolbarInput,
} from "@/components/common/SearchToolbar";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import { getCardImageAltText } from "@/lib/cards/resolveCardImagePresentation";
import {
  buildCompareCardsParam,
  buildPathWithCompareCards,
  normalizeCompareCardsParam,
} from "@/lib/compareCards";
import { normalizeExploreViewMode } from "@/lib/exploreViewModes";
import {
  getPublicGameScopeLabel,
  normalizePublicGameScope,
  PUBLIC_GAME_SCOPE_OPTIONS,
  type PublicGameScope,
} from "@/lib/publicGameScope";
import { normalizePublicLanguageScope } from "@/lib/publicLanguageScope";
import { buildPublicSearchDestination } from "@/lib/publicSearchRouting";
import {
  buildSearchSuggestionHref,
  getSearchSuggestionRequest,
  getSearchSuggestionKey,
  getSearchSuggestionPresentation,
  normalizeSearchSuggestions,
  SEARCH_SUGGESTION_LIMIT,
  SEARCH_SUGGESTION_MIN_QUERY_LENGTH,
  type SearchSuggestion,
} from "@/lib/search/searchSuggestions";
import { sendTelemetryEvent } from "@/lib/telemetry/client";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type PublicSearchFormProps = {
  variant: "header" | "hero" | "mobile-compact" | "command" | "collector";
};

type SuggestionResponse = {
  ok: boolean;
  rows?: ExploreResultCard[];
  canonical?: ExploreResultCard[];
};

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8.5" cy="8.5" r="4.75" />
      <path d="m12 12 4.25 4.25" />
    </svg>
  );
}

function suggestionCardHref(
  card: SearchSuggestion,
  compareCards: string[],
) {
  const suggestionHref = buildSearchSuggestionHref(card);
  const queryStart = suggestionHref.indexOf("?");
  const path = queryStart >= 0 ? suggestionHref.slice(0, queryStart) : suggestionHref;
  const query = queryStart >= 0 ? suggestionHref.slice(queryStart + 1) : "";
  return buildPathWithCompareCards(path, query, compareCards);
}

export default function PublicSearchForm({ variant }: PublicSearchFormProps) {
  const ready = useClientReady();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const currentView = searchParams.get("view");
  const currentSort = searchParams.get("sort");
  const currentLanguageScope = normalizePublicLanguageScope(searchParams.get("lang"));
  const currentGameScope = normalizePublicGameScope(searchParams.get("game"));
  const normalizedCurrentView = pathname === "/explore" && currentView ? normalizeExploreViewMode(currentView) : null;
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const compareCardsParam = buildCompareCardsParam(compareCards);
  const [query, setQuery] = useState(currentQuery);
  const [gameScope, setGameScope] = useState<PublicGameScope>(currentGameScope);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const formRef = useRef<HTMLFormElement>(null);
  const suggestionsDismissed = useRef(false);
  const listboxId = useId();
  const listboxOpen = suggestionsOpen && suggestions.length > 0;

  const dismissSuggestions = () => {
    suggestionsDismissed.current = true;
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  };

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery, pathname]);

  useEffect(() => {
    setGameScope(currentGameScope);
  }, [currentGameScope, pathname]);

  useEffect(() => {
    const normalizedQuery = query.trim().replace(/\s+/g, " ");
    if (normalizedQuery.length < SEARCH_SUGGESTION_MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const suggestionRequest = getSearchSuggestionRequest(normalizedQuery);
        const params = new URLSearchParams({
          q: suggestionRequest.resolverQuery,
          limit: String(
            gameScope === "pokemon"
              ? SEARCH_SUGGESTION_LIMIT
              : suggestionRequest.fetchLimit,
          ),
        });
        if (suggestionRequest.requestedNumber) {
          params.set("number", suggestionRequest.requestedNumber);
        }
        if (gameScope !== "pokemon") params.set("game", gameScope);
        if (currentLanguageScope !== "all") params.set("lang", currentLanguageScope);

        const endpoint =
          gameScope === "pokemon"
            ? "/api/search/suggestions"
            : "/api/resolver/search";
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as SuggestionResponse;
        if (controller.signal.aborted) return;
        if (!response.ok || !payload.ok) {
          setSuggestions([]);
          return;
        }

        setSuggestions(
          normalizeSearchSuggestions(
            payload.canonical ?? payload.rows ?? [],
            SEARCH_SUGGESTION_LIMIT,
            normalizedQuery,
          ),
        );
        // A delayed response must not reopen the menu over another control.
        setSuggestionsOpen(!suggestionsDismissed.current && document.activeElement === formRef.current?.querySelector('input[type="search"]'));
        setActiveSuggestionIndex(-1);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentLanguageScope, gameScope, query]);

  useEffect(() => {
    const closeSuggestions = (event: PointerEvent) => {
      if (!formRef.current?.contains(event.target as Node)) {
        suggestionsDismissed.current = true;
        setSuggestionsOpen(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener("pointerdown", closeSuggestions);
    return () => document.removeEventListener("pointerdown", closeSuggestions);
  }, []);

  const buildSearchUrl = () => {
    const destination = buildPublicSearchDestination(query);
    const nextParams = new URLSearchParams();

    if (destination.q) nextParams.set("q", destination.q);
    if (compareCardsParam) nextParams.set("cards", compareCardsParam);
    if (currentLanguageScope !== "all") nextParams.set("lang", currentLanguageScope);
    if (gameScope !== "pokemon") nextParams.set("game", gameScope);
    if (normalizedCurrentView) nextParams.set("view", normalizedCurrentView);
    if (pathname === "/explore" && currentSort) nextParams.set("sort", currentSort);

    return {
      destination,
      url: nextParams.toString()
        ? `${destination.pathname}?${nextParams.toString()}`
        : destination.pathname,
    };
  };

  const runSearch = () => {
    const { destination, url } = buildSearchUrl();
    dismissSuggestions();

    if (destination.q && destination.pathname === "/explore") {
      sendTelemetryEvent({
        eventName: "search_performed",
        path: destination.pathname,
        searchQuery: destination.q,
      });
    }

    router.push(url);
  };

  if (variant === "hero") {
    return (
      <form action="/search" method="get" onSubmit={handleSubmit} className="w-full max-w-2xl">
        {compareCardsParam ? <input type="hidden" name="cards" value={compareCardsParam} /> : null}
        {currentLanguageScope !== "all" ? <input type="hidden" name="lang" value={currentLanguageScope} /> : null}
        {normalizedCurrentView ? <input type="hidden" name="view" value={normalizedCurrentView} /> : null}
        {pathname === "/explore" && currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
        <SearchToolbar surface="pill" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchToolbarInput
            tone="bare"
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards, sets, or Grookai IDs…"
            autoComplete="off"
            shellClassName="min-w-0 flex-1"
            inputClassName="px-3 text-base"
            aria-label="Search cards"
          />
          <SearchToolbarButton type="submit" tone="primary" size="hero" className="w-full sm:w-auto">
            Search
          </SearchToolbarButton>
        </SearchToolbar>
      </form>
    );
  }

  if (variant === "mobile-compact") {
    return (
      <form action="/search" method="get" onSubmit={handleSubmit} className="w-full">
        {compareCardsParam ? <input type="hidden" name="cards" value={compareCardsParam} /> : null}
        {currentLanguageScope !== "all" ? <input type="hidden" name="lang" value={currentLanguageScope} /> : null}
        {normalizedCurrentView ? <input type="hidden" name="view" value={normalizedCurrentView} /> : null}
        {pathname === "/explore" && currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
        <SearchToolbar surface="soft-pill">
          <SearchToolbarInput
            tone="bare"
            icon={(
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8.5" cy="8.5" r="4.75" />
                <path d="m12 12 4.25 4.25" />
              </svg>
            )}
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards, sets, numbers, or Grookai ID…"
            autoComplete="off"
            enterKeyHint="search"
            shellClassName="gap-2"
            inputClassName="text-sm"
            aria-label="Search cards, sets, numbers, or Grookai ID"
          />
        </SearchToolbar>
      </form>
    );
  }

  if (variant === "command") {
    return (
      <form action="/search" method="get" onSubmit={handleSubmit} className="w-full">
        {compareCardsParam ? <input type="hidden" name="cards" value={compareCardsParam} /> : null}
        {currentLanguageScope !== "all" ? <input type="hidden" name="lang" value={currentLanguageScope} /> : null}
        {normalizedCurrentView ? <input type="hidden" name="view" value={normalizedCurrentView} /> : null}
        {pathname === "/explore" && currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
        <SearchToolbar surface="none" className="flex w-full items-center gap-2">
          <SearchToolbarInput
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards, sets, numbers, or Grookai ID…"
            autoComplete="off"
            tone="soft"
            shellClassName="min-w-0 flex-1"
            aria-label="Search cards"
          />
          <SearchToolbarButton type="submit" tone="primary" className="shrink-0 px-4 sm:px-5">
            Search
          </SearchToolbarButton>
        </SearchToolbar>
      </form>
    );
  }

  return (
    <form
      ref={formRef}
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dismissSuggestions();
      }}
      className={formClassName}
      aria-busy={!ready}
    >
      <fieldset disabled={!ready} className="min-w-0">
      {compareCardsParam ? <input type="hidden" name="cards" value={compareCardsParam} /> : null}
      {currentLanguageScope !== "all" ? <input type="hidden" name="lang" value={currentLanguageScope} /> : null}
      {normalizedCurrentView ? <input type="hidden" name="view" value={normalizedCurrentView} /> : null}
      {pathname === "/explore" && currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
      <SearchToolbar surface="none" className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <SearchToolbarInput
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cards, sets, numbers, or Grookai ID…"
          autoComplete="off"
          tone="soft"
          shellClassName="w-full sm:max-w-[420px]"
          aria-label="Search cards"
        />
        <SearchToolbarButton type="submit" tone="primary">
          Search
        </SearchToolbarButton>
      </SearchToolbar>
      </fieldset>
    </form>
  );
}
