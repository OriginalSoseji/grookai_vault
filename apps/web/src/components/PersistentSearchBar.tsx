"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function normalizeSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function PersistentSearchBar() {
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

    const normalized = normalizeSearchQuery(query);
    const nextParams = new URLSearchParams();

    if (normalized) {
      nextParams.set("q", normalized);
    }

    if (pathname === "/explore" && currentView) {
      nextParams.set("view", currentView);
    }

    if (pathname === "/explore" && currentSort) {
      nextParams.set("sort", currentSort);
    }

    router.push(nextParams.toString() ? `/search?${nextParams.toString()}` : "/search");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search cards, sets, numbers, or Grookai ID"
        className="h-11 flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-200"
        aria-label="Search cards"
      />
      <button
        type="submit"
        className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Search
      </button>
    </form>
  );
}

export function PersistentSearchBarFallback() {
  return (
    <form action="/search" className="flex items-center gap-2">
      <input
        type="search"
        name="q"
        placeholder="Search cards, sets, numbers, or Grookai ID"
        className="h-11 flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400"
        aria-label="Search cards"
      />
      <button
        type="submit"
        className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Search
      </button>
    </form>
  );
}
