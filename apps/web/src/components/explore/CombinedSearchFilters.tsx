import Link from "next/link";
import type { SmartSearchIntent } from "@/lib/search/smartSearchIntent";

function replacePhrase(query: string, phrase: string, replacement = "") {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return query.replace(new RegExp(`(?<![\\p{L}\\p{N}_/])${escaped}(?![\\p{L}\\p{N}_/])`, "iu"), replacement).replace(/[,\s]+/g, " ").trim();
}

export default function CombinedSearchFilters({ intent, search, empty }: {
  intent: SmartSearchIntent;
  search: string;
  empty: boolean;
}) {
  const params = new URLSearchParams(search);
  const query = intent.originalQuery;
  const filters = (intent.queryFilters ?? []).filter((filter) => !filter.removeParameter);
  const artistFilter = filters.find((filter) => filter.kind === "artist");
  const href = (q: string, remove: string[] = [], artist?: string) => {
    const next = new URLSearchParams(params);
    next.delete("offset");
    for (const key of remove) next.delete(key);
    if (q) next.set("q", q); else next.delete("q");
    if (artist) next.set("illustrator", artist);
    return `/explore?${next.toString()}`;
  };
  const chipClass = "inline-flex min-h-11 items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100";
  const explicit = [
    ["illustrator", "Artist"], ["set", "Set"], ["year", "Year"], ["year_min", "From year"],
    ["year_max", "Through year"], ["finish", "Finish"], ["stamp", "Stamp"], ["owned", "Ownership"],
    ["image_state", "Image"],
  ].filter(([key]) => params.has(key));
  if (!filters.length && !explicit.length) return null;
  return (
    <section aria-label="Active search filters" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter, index) => (
          <Link key={`${filter.kind}-${index}`} className={chipClass}
            aria-label={`Remove ${filter.label}`}
            href={href(filter.queryWithout ?? replacePhrase(query, filter.sourceText))}>
            {filter.label}<span aria-hidden="true">×</span>
          </Link>
        ))}
        {explicit.map(([key, label]) => (
          <Link key={key} className={chipClass} href={href(query, [key])}
            aria-label={`Remove ${label}: ${params.get(key)}`}>
            {label}: {params.get(key)}<span aria-hidden="true">×</span>
          </Link>
        ))}
      </div>
      {intent.artistCorrection && artistFilter ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Interpreted “{intent.artistCorrection.original}” as {intent.artistCorrection.corrected}.{" "}
          <Link className="underline" href={href(intent.originalSpellingQuery ?? replacePhrase(query, artistFilter.sourceText, `"${intent.artistCorrection.original}"`))}>
            Use original spelling
          </Link>
        </p>
      ) : null}
      {(intent.artistNames?.length ?? 0) > 1 && artistFilter && !params.has("illustrator") ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">Matching any of these artists. Choose one to narrow your search:</p>
          <div className="flex flex-wrap gap-2">
            {intent.artistNames?.map((name) => (
              <Link key={name} className={chipClass} href={href(replacePhrase(query, artistFilter.sourceText), [], name)}>{name}</Link>
            ))}
          </div>
        </div>
      ) : null}
      {empty ? <p className="text-sm text-slate-600 dark:text-slate-300">
        No recorded matches for all these filters. Remove a filter above to broaden your search.
        Finish searches include only cataloged printings; missing finish data does not prove a printing never existed.
      </p> : null}
      {intent.ownedState && intent.ownedState !== "any" ? <p className="text-sm text-slate-600 dark:text-slate-300">
        Ownership is checked for the card across all printings.
      </p> : null}
    </section>
  );
}
