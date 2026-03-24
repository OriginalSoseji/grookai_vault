"use client";

import {
  SearchToolbar,
  SearchToolbarButton,
  SearchToolbarInput,
} from "@/components/common/SearchToolbar";
import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCompareCardsParam, normalizeCompareCardsParam } from "@/lib/compareCards";
import { normalizeExploreViewMode } from "@/lib/exploreViewModes";
import { buildPublicSearchDestination } from "@/lib/publicSearchRouting";
import { sendTelemetryEvent } from "@/lib/telemetry/client";

type PublicSearchFormProps = {
  variant: "header" | "hero" | "mobile-compact";
};

export default function PublicSearchForm({ variant }: PublicSearchFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const currentView = searchParams.get("view");
  const currentSort = searchParams.get("sort");
  const normalizedCurrentView = pathname === "/explore" && currentView ? normalizeExploreViewMode(currentView) : null;
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const compareCardsParam = buildCompareCardsParam(compareCards);
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery, pathname]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const destination = buildPublicSearchDestination(query);
    const nextParams = new URLSearchParams();

    if (destination.q) {
      nextParams.set("q", destination.q);
    }

    if (compareCardsParam) {
      nextParams.set("cards", compareCardsParam);
    }

    if (normalizedCurrentView) {
      nextParams.set("view", normalizedCurrentView);
    }

    if (pathname === "/explore" && currentSort) {
      nextParams.set("sort", currentSort);
    }

    const nextUrl = nextParams.toString()
      ? `${destination.pathname}?${nextParams.toString()}`
      : destination.pathname;

    if (destination.q && destination.pathname === "/explore") {
      sendTelemetryEvent({
        eventName: "search_performed",
        path: destination.pathname,
        searchQuery: destination.q,
      });
    }

    router.push(nextUrl);
  };

  if (variant === "hero") {
    return (
      <form action="/search" method="get" onSubmit={handleSubmit} className="max-w-2xl">
        {compareCardsParam ? <input type="hidden" name="cards" value={compareCardsParam} /> : null}
        {normalizedCurrentView ? <input type="hidden" name="view" value={normalizedCurrentView} /> : null}
        {pathname === "/explore" && currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
        <SearchToolbar surface="pill" className="flex items-center gap-3">
          <SearchToolbarInput
            tone="bare"
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards, sets, or Grookai IDs to find collectors"
            shellClassName="min-w-0 flex-1"
            inputClassName="px-3 text-base"
            aria-label="Search cards"
          />
          <SearchToolbarButton type="submit" tone="primary" size="hero">
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
            placeholder="Search cards, sets, numbers, or Grookai ID"
            enterKeyHint="search"
            shellClassName="gap-2"
            inputClassName="text-sm"
            aria-label="Search cards, sets, numbers, or Grookai ID"
          />
        </SearchToolbar>
      </form>
    );
  }

  return (
    <form
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      className="w-full"
    >
      {compareCardsParam ? <input type="hidden" name="cards" value={compareCardsParam} /> : null}
      {normalizedCurrentView ? <input type="hidden" name="view" value={normalizedCurrentView} /> : null}
      {pathname === "/explore" && currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
      <SearchToolbar surface="none" className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <SearchToolbarInput
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cards, sets, numbers, or Grookai ID"
          tone="soft"
          shellClassName="w-full sm:max-w-[420px]"
          aria-label="Search cards"
        />
        <SearchToolbarButton type="submit" tone="primary">
          Search
        </SearchToolbarButton>
      </SearchToolbar>
    </form>
  );
}
