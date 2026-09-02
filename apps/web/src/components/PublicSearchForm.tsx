"use client";

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
  variant: "header" | "hero" | "mobile-compact" | "command";
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
  const listboxId = useId();

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
        setSuggestionsOpen(true);
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
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);

    if (destination.q && destination.pathname === "/explore") {
      sendTelemetryEvent({
        eventName: "search_performed",
        path: destination.pathname,
        searchQuery: destination.q,
      });
    }

    router.push(url);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch();
  };

  const openSuggestion = (card: SearchSuggestion) => {
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    router.push(suggestionCardHref(card, compareCards));
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionsOpen || suggestions.length === 0) {
      if (event.key === "Escape") setSuggestionsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      openSuggestion(suggestions[activeSuggestionIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const isMobileCompact = variant === "mobile-compact";
  const isHero = variant === "hero";
  const isCommand = variant === "command";
  const formClassName = isHero ? "w-full max-w-3xl" : "w-full";
  const toolbarSurface = isHero ? "pill" : isMobileCompact ? "soft-pill" : "none";
  const toolbarClassName = isHero
    ? "flex flex-col gap-2 sm:flex-row sm:items-center"
    : "flex w-full items-center gap-2";
  const inputTone = isHero || isMobileCompact ? "bare" : "soft";
  const inputShellClassName = isHero
    ? "h-11 min-w-0 flex-1"
    : isMobileCompact
      ? "h-9 min-w-0 gap-2"
      : "min-w-0 flex-1";
  const gameSelectClassName = isMobileCompact
    ? "h-9 max-w-[7.25rem] shrink-0 rounded-[12px] border border-slate-200/80 bg-white/70 px-2 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
    : "h-11 max-w-[12rem] shrink-0 rounded-[14px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  return (
    <form
      ref={formRef}
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      className={formClassName}
    >
      {compareCardsParam ? <input type="hidden" name="cards" value={compareCardsParam} /> : null}
      {currentLanguageScope !== "all" ? <input type="hidden" name="lang" value={currentLanguageScope} /> : null}
      {normalizedCurrentView ? <input type="hidden" name="view" value={normalizedCurrentView} /> : null}
      {pathname === "/explore" && currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}

      <SearchToolbar surface={toolbarSurface} className={toolbarClassName}>
        <div className="relative min-w-0 flex-1">
          <SearchToolbarInput
            tone={inputTone}
            icon={<SearchIcon />}
            type="search"
            name="q"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSuggestionsOpen(true);
              setActiveSuggestionIndex(-1);
            }}
            onFocus={() => {
              if (suggestions.length > 0 || suggestionsLoading) setSuggestionsOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search cards, sets, numbers, or Grookai ID"
            enterKeyHint="search"
            shellClassName={inputShellClassName}
            inputClassName={isHero ? "text-base" : "text-sm"}
            aria-label="Search cards, sets, numbers, or Grookai ID"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={suggestionsOpen}
            aria-activedescendant={
              activeSuggestionIndex >= 0
                ? `${listboxId}-${activeSuggestionIndex}`
                : undefined
            }
          />

          {suggestionsOpen && (suggestionsLoading || suggestions.length > 0) ? (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Card suggestions"
              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[80] max-h-[min(70vh,32rem)] overflow-y-auto rounded-[8px] border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-950"
            >
              {suggestionsLoading && suggestions.length === 0 ? (
                <div className="flex min-h-16 items-center gap-3 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-slate-200" />
                  Searching {getPublicGameScopeLabel(gameScope)}
                </div>
              ) : null}

              {suggestions.map((card, index) => {
                const presentation = getSearchSuggestionPresentation(card);
                const selected = activeSuggestionIndex === index;
                return (
                  <button
                    key={getSearchSuggestionKey(card)}
                    id={`${listboxId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    onClick={() => openSuggestion(card)}
                    className={`flex w-full items-center gap-3 rounded-[6px] px-2 py-2 text-left transition ${
                      selected
                        ? "bg-slate-100 dark:bg-slate-800"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="h-[58px] w-[42px] shrink-0 overflow-hidden rounded-[4px] bg-slate-100 dark:bg-slate-900">
                      <PublicCardImage
                        src={card.display_image_url ?? card.image_url}
                        fallbackSrc={card.display_image_fallback_url}
                        fallbackSources={[card.external_image_fallback_url]}
                        alt={getCardImageAltText(presentation.title, card)}
                        imageClassName="h-full w-full object-contain"
                        fallbackClassName="flex h-full w-full items-center justify-center px-1 text-center text-[9px] text-slate-400"
                        fallbackLabel="No image"
                        loading="lazy"
                        sizes="42px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {presentation.title}
                      </p>
                      {presentation.printedName ? (
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {presentation.printedName}
                        </p>
                      ) : null}
                      <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                        {presentation.metadata || getPublicGameScopeLabel(gameScope)}
                      </p>
                    </div>
                    {presentation.discriminator ? (
                      <span className="max-w-28 shrink-0 truncate rounded-[4px] border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {presentation.discriminator}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              {suggestions.length > 0 ? (
                <button
                  type="submit"
                  className="mt-1 flex min-h-10 w-full items-center justify-between rounded-[6px] border-t border-slate-200 px-3 pt-2 text-left text-xs font-semibold text-slate-700 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
                >
                  <span className="truncate">View all results for &quot;{query.trim()}&quot;</span>
                  <span aria-hidden="true">→</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <select
          aria-label="Trading card game"
          value={gameScope}
          onChange={(event) => {
            const nextGameScope = event.target.value as PublicGameScope;
            setGameScope(nextGameScope);
            setSuggestionsOpen(true);
            setActiveSuggestionIndex(-1);

            if (pathname === "/explore") {
              const params = new URLSearchParams(searchParams.toString());
              if (nextGameScope === "pokemon") {
                params.delete("game");
              } else {
                params.set("game", nextGameScope);
              }
              router.replace(
                params.toString() ? `/explore?${params.toString()}` : "/explore",
                { scroll: false },
              );
            }
          }}
          className={gameSelectClassName}
        >
          {PUBLIC_GAME_SCOPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {isMobileCompact && option.value === "mtg" ? "MTG" : option.label}
            </option>
          ))}
        </select>

        {!isMobileCompact ? (
          <SearchToolbarButton
            type="submit"
            tone="primary"
            size={isHero ? "hero" : "default"}
            className={isHero ? "w-full sm:w-auto" : isCommand ? "shrink-0 px-4 sm:px-5" : "shrink-0"}
          >
            Search
          </SearchToolbarButton>
        ) : null}
      </SearchToolbar>
    </form>
  );
}
