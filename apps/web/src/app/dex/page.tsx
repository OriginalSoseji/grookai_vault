import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isGrookaiDexEnabled } from "@/lib/grookaiDex/featureFlag";
import { getGrookaiDexSpeciesPage } from "@/lib/grookaiDex/getGrookaiDexSpecies";
import { getPokemonSpriteUrl } from "@/lib/grookaiDex/pokemonSprite";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Grookai Dex | Grookai Vault",
  description:
    "Track Pokemon character completion across every mapped card print in Grookai Vault.",
  alternates: { canonical: "/dex" },
  openGraph: {
    title: "Grookai Dex | Grookai Vault",
    description:
      "Track Pokemon character completion across every mapped card print in Grookai Vault.",
    url: "/dex",
  },
};

const PAGE_SIZE = 100;

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseSearchQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, 64);
}

function dexPageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (query) {
    params.set("q", query);
  }
  const queryString = params.toString();
  return queryString ? `/dex?${queryString}` : "/dex";
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function completionLabel(percent: number, owned: number, total: number) {
  if (total <= 0) {
    return "No mapped prints";
  }

  if (percent >= 100) {
    return "Complete";
  }

  if (owned > 0) {
    return "Started";
  }

  return "Open";
}

function completionClassName(status: string) {
  if (status === "Complete") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/14 dark:text-emerald-200";
  }

  if (status === "Started") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-400/14 dark:text-sky-200";
  }

  return "bg-slate-100 text-slate-600 dark:bg-white/[0.07] dark:text-slate-300";
}

function PokemonSprite({
  dexNumber,
  name,
  size = "default",
}: {
  dexNumber: number;
  name: string;
  size?: "default" | "hero" | "card";
}) {
  const spriteUrl = getPokemonSpriteUrl(dexNumber);
  const frameClassName = [
    "gv-dex-sprite-frame",
    size === "hero" ? "gv-dex-sprite-frame-hero" : "",
    size === "card" ? "gv-dex-sprite-frame-card" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const imageSize = size === "hero" ? 96 : size === "card" ? 124 : 72;

  return (
    <div className={frameClassName} aria-hidden={!spriteUrl}>
      {spriteUrl ? (
        <Image
          src={spriteUrl}
          alt={`${name} Pokedex sprite`}
          width={imageSize}
          height={imageSize}
          className="gv-dex-sprite-image"
          unoptimized
        />
      ) : (
        <span className="gv-dex-sprite-fallback">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

export default async function GrookaiDexPage({
  searchParams,
}: {
  searchParams?: { page?: string | string[]; q?: string | string[] };
}) {
  if (!isGrookaiDexEnabled()) {
    notFound();
  }

  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const searchQuery = parseSearchQuery(searchParams?.q);
  const currentPage = parsePage(searchParams?.page);
  const speciesPage = await getGrookaiDexSpeciesPage(user?.id ?? null, {
    page: currentPage,
    pageSize: PAGE_SIZE,
    searchQuery,
  });
  const species = speciesPage.species;
  const overview = speciesPage.overview;
  const startRow = species.length === 0 ? 0 : (speciesPage.page - 1) * speciesPage.pageSize + 1;
  const endRow = Math.min(speciesPage.totalSpeciesCount, startRow + species.length - 1);

  return (
    <div className="gv-page-rhythm">
        <header className="gv-dex-hero px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="relative z-[1] grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,430px)] lg:items-end">
            <div className="min-w-0 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="gv-discovery-eyebrow">Grookai Dex</span>
                <span className="gv-discovery-pill">Vault-aware</span>
              </div>
              <div className="space-y-2">
                <h1 className="gv-display-title max-w-full text-[clamp(2.3rem,10vw,6.5rem)] sm:max-w-3xl sm:text-[clamp(3rem,8vw,6.5rem)]">
                  <span className="sm:hidden">
                    Character
                    <br />
                    completion,
                    <br />
                    not just
                    <br />a checklist.
                  </span>
                  <span className="hidden sm:inline">Character completion, not just a checklist.</span>
                </h1>
                <p className="gv-body-copy max-w-full text-[1.08rem] sm:max-w-2xl">
                  Search a Pokemon and see every mapped card print, what your vault already owns, and the exact gaps still left for that character.
                </p>
              </div>
              <form action="/dex" className="gv-dex-search flex max-w-full flex-col gap-2 rounded-[26px] p-2 sm:max-w-2xl sm:flex-row">
                <label htmlFor="dex-character-search" className="sr-only">
                  Search Pokemon character
                </label>
                <input
                  id="dex-character-search"
                  name="q"
                  type="search"
                  defaultValue={searchQuery}
                  placeholder="Search Pikachu, Gengar, #025..."
                  className="min-h-12 min-w-0 flex-1 rounded-full border border-transparent bg-white/78 px-5 text-[0.95rem] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white dark:bg-black/48 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <div className="flex gap-2">
                  <button type="submit" className="gv-primary-button min-h-12 flex-1 px-6 py-2 text-sm sm:flex-none">
                    Search
                  </button>
                  {searchQuery ? (
                    <Link href="/dex" className="gv-secondary-button min-h-12 flex-1 px-5 py-2 text-sm sm:flex-none">
                      Reset
                    </Link>
                  ) : null}
                </div>
              </form>
              <div className="flex flex-wrap gap-2">
                {["Pikachu", "Gengar", "Eevee", "#006"].map((example) => (
                  <Link key={example} href={`/dex?q=${encodeURIComponent(example)}`} className="gv-discovery-chip">
                    {example}
                  </Link>
                ))}
              </div>
            </div>

            <div className="gv-dex-progress-panel min-w-0 p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                {species.slice(0, 3).map((row) => (
                  <PokemonSprite
                    key={`hero-${row.speciesId}`}
                    dexNumber={row.nationalDexNumber}
                    name={row.displayName}
                    size="hero"
                  />
                ))}
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="gv-eyebrow">Full Dex</p>
                  <p className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-slate-50">{overview.completionPercent}%</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800 dark:bg-emerald-400/14 dark:text-emerald-200">
                  {overview.ownedPrintCount}/{overview.totalPrintCount}
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/[0.08]">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${overview.completionPercent}%` }} />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                Full-Dex completion across {overview.totalSpeciesCount} species. Showing {startRow}-{endRow} of{" "}
                {speciesPage.totalSpeciesCount}{searchQuery ? " matching" : ""}.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="gv-dex-mini-stat">
                  <p>{overview.totalSpeciesCount}</p>
                  <span>Species</span>
                </div>
                <div className="gv-dex-mini-stat">
                  <p>{overview.startedSpeciesCount}</p>
                  <span>Started</span>
                </div>
                <div className="gv-dex-mini-stat">
                  <p>{overview.completeSpeciesCount}</p>
                  <span>Complete</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-4" aria-label="Pokemon species progress">
          {searchQuery ? (
            <div className="gv-results-command-bar flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Character search</p>
                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Results for <span className="text-slate-950 dark:text-slate-50">&quot;{searchQuery}&quot;</span>
                </p>
              </div>
              <Link href="/dex" className="gv-secondary-button min-h-0 px-4 py-2 text-sm">
                Clear search
              </Link>
            </div>
          ) : null}
          {species.length === 0 ? (
            <div className="gv-premium-surface px-5 py-10 text-center">
              <p className="text-lg font-bold text-slate-950 dark:text-slate-50">No Pokemon found</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Try a species name like Pikachu, a slug like mr-mime, or a Dex number like #025.
              </p>
            </div>
          ) : null}
          {species.map((row) => {
            const percent = clampPercent(row.completionPercent);
            const status = completionLabel(percent, row.ownedPrintCount, row.totalPrintCount);
            const typeLabel = row.types.length > 0 ? row.types.slice(0, 2).join(" / ") : "Pokemon";
            const missingPrintCount = Math.max(row.totalPrintCount - row.ownedPrintCount, 0);
            return (
              <Link
                key={row.speciesId}
                href={`/dex/${row.slug}`}
                className="gv-dex-species-card group block px-5 py-5 sm:px-6 sm:py-6"
              >
                <div className="flex min-w-0 items-start gap-4 sm:gap-5 lg:items-center">
                  <PokemonSprite dexNumber={row.nationalDexNumber} name={row.displayName} size="card" />

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="gv-dex-number">
                        #{row.nationalDexNumber.toString().padStart(4, "0")}
                      </span>
                      <span className="gv-metadata-pill">{typeLabel}</span>
                      {row.generation ? <span className="gv-metadata-pill">Gen {row.generation}</span> : null}
                    </div>
                    <h2 className="break-words text-[clamp(2.1rem,9vw,3.6rem)] font-black leading-[0.96] tracking-tight text-slate-950 dark:text-slate-50">
                      {row.displayName}
                    </h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] lg:items-end">
                  <div className="gv-dex-completion-metric">
                    <p className="gv-eyebrow">Printings collected</p>
                    <p className="mt-2 text-[clamp(1.9rem,8vw,3rem)] font-black leading-none tracking-tight text-slate-950 dark:text-slate-50">
                      {row.ownedPrintCount} / {row.totalPrintCount}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Every known mapped printing for this Pokemon.
                      {row.ownedCopyCount > row.ownedPrintCount
                        ? ` ${row.ownedCopyCount} total copies in Vault.`
                        : ""}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="gv-dex-stat-card">
                      <p>{row.totalPrintCount}</p>
                      <span>Known</span>
                    </div>
                    <div className="gv-dex-stat-card">
                      <p>{row.ownedPrintCount}</p>
                      <span>Owned</span>
                    </div>
                    <div className="gv-dex-stat-card">
                      <p>{missingPrintCount}</p>
                      <span>Missing</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Completion</span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${completionClassName(status)}`}>
                        {status}
                      </span>
                    </div>
                    <span className="text-base font-black text-slate-800 dark:text-slate-100">{percent}%</span>
                  </div>
                  <div className="gv-dex-progress-track">
                    <div className="gv-dex-progress-fill transition-all group-hover:bg-emerald-400" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <nav className="flex items-center justify-between gap-3 text-sm">
        <Link
          href={dexPageHref(Math.max(1, speciesPage.page - 1), searchQuery)}
          aria-disabled={speciesPage.page <= 1}
          className={`gv-secondary-button min-h-0 px-4 py-2 ${
            speciesPage.page <= 1
              ? "pointer-events-none opacity-45"
              : ""
          }`}
        >
          Previous
        </Link>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Page {speciesPage.page} of {speciesPage.totalPages}
        </span>
        <Link
          href={dexPageHref(Math.min(speciesPage.totalPages, speciesPage.page + 1), searchQuery)}
          aria-disabled={speciesPage.page >= speciesPage.totalPages}
          className={`gv-secondary-button min-h-0 px-4 py-2 ${
            speciesPage.page >= speciesPage.totalPages
              ? "pointer-events-none opacity-45"
              : ""
          }`}
        >
          Next
        </Link>
        </nav>
    </div>
  );
}
