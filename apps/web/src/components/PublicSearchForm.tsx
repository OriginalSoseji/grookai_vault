"use client";

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
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/60">
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Pokémon cards, sets, or Grookai IDs"
            className="min-w-0 flex-1 bg-transparent px-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
            aria-label="Search cards"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </div>
      </form>
    );
  }

  if (variant === "mobile-compact") {
    return (
      <form action="/search" method="get" onSubmit={handleSubmit} className="w-full">
        {compareCardsParam ? <input type="hidden" name="cards" value={compareCardsParam} /> : null}
        {normalizedCurrentView ? <input type="hidden" name="view" value={normalizedCurrentView} /> : null}
        {pathname === "/explore" && currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-sm shadow-slate-200/20">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-3.5 w-3.5 shrink-0 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8.5" cy="8.5" r="4.75" />
            <path d="m12 12 4.25 4.25" />
          </svg>
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards, sets, numbers, or Grookai ID"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            aria-label="Search cards, sets, numbers, or Grookai ID"
          />
        </div>
      </form>
    );
  }

  return (
    <form
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
    >
      {compareCardsParam ? <input type="hidden" name="cards" value={compareCardsParam} /> : null}
      {normalizedCurrentView ? <input type="hidden" name="view" value={normalizedCurrentView} /> : null}
      {pathname === "/explore" && currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
      <input
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search cards, sets, numbers, or Grookai ID"
        className="h-11 w-full rounded-full bg-slate-100 px-4 text-sm text-slate-900 outline-none transition-all duration-100 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200 sm:max-w-[420px]"
        aria-label="Search cards"
      />
      <button
        type="submit"
        className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-all duration-100 hover:bg-slate-700"
      >
        Search
      </button>
    </form>
  );
}
