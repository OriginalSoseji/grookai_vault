"use client";

import PublicSearchForm from "@/components/PublicSearchForm";

export default function PersistentSearchBar() {
  return <PublicSearchForm variant="header" />;
}

export function PersistentSearchBarFallback() {
  return (
    <form action="/search" className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="search"
        name="q"
        placeholder="Search cards, sets, numbers, or Grookai ID"
        className="h-11 w-full rounded-full bg-slate-100 px-4 text-sm text-slate-900 outline-none transition-all duration-100 placeholder:text-slate-400 sm:max-w-[420px]"
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
