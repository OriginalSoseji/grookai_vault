"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildPublicSearchDestination } from "@/lib/publicSearchRouting";

type PublicSearchFormProps = {
  variant: "header" | "hero";
};

export default function PublicSearchForm({ variant }: PublicSearchFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const currentView = searchParams.get("view");
  const currentSort = searchParams.get("sort");
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

    if (pathname === "/explore" && currentView) {
      nextParams.set("view", currentView);
    }

    if (pathname === "/explore" && currentSort) {
      nextParams.set("sort", currentSort);
    }

    const nextUrl = nextParams.toString()
      ? `${destination.pathname}?${nextParams.toString()}`
      : destination.pathname;

    router.push(nextUrl);
  };

  if (variant === "hero") {
    return (
      <form action="/search" method="get" onSubmit={handleSubmit} className="max-w-2xl">
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

  return (
    <form
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
    >
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
