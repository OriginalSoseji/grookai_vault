"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { CardSummary } from "@/types/cards";

const SEARCH_LIMIT = 80;

type ExploreRow = CardSummary & {
  id: string;
};

type SearchRpcRow = {
  id: string;
  name: string | null;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
};

type GvLookupRow = {
  id: string;
  gv_id: string | null;
  name?: string | null;
  number?: string | null;
  rarity?: string | null;
  image_url?: string | null;
  sets?: { name: string | null } | { name: string | null }[] | null;
};

type ViewMode = "list" | "grid";

function normalizeFreeTextQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTextForMatch(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeGvIdInput(value: string) {
  const tokens = value.trim().toUpperCase().match(/[A-Z0-9]+/g);
  if (!tokens || tokens.length < 3) return null;

  const expandedTokens = tokens[0] === "GVPK" ? ["GV", "PK", ...tokens.slice(1)] : tokens;
  if (expandedTokens[0] !== "GV" || expandedTokens[1] !== "PK" || expandedTokens.length < 4) {
    return null;
  }

  return `GV-PK-${expandedTokens.slice(2).join("-")}`;
}

function toSetName(sets: GvLookupRow["sets"]) {
  const setRecord = Array.isArray(sets) ? sets[0] : sets;
  return setRecord?.name ?? undefined;
}

function buildExploreRows(searchRows: SearchRpcRow[], lookupRows: GvLookupRow[]) {
  const lookupById = new Map(lookupRows.map((row) => [row.id, row]));
  const normalizedRows: ExploreRow[] = [];

  for (const row of searchRows) {
    const lookupRow = lookupById.get(row.id);
    if (!lookupRow?.gv_id) continue;

    normalizedRows.push({
      id: row.id,
      gv_id: lookupRow.gv_id,
      name: row.name ?? lookupRow.name ?? "Unknown",
      number: row.number ?? lookupRow.number ?? "",
      set_name: toSetName(lookupRow.sets),
      rarity: row.rarity ?? lookupRow.rarity ?? undefined,
      image_url: row.image_url ?? lookupRow.image_url ?? undefined,
    });
  }

  return normalizedRows;
}

function rankRows(rows: ExploreRow[], query: string, directGvId: string | null) {
  const normalizedQuery = normalizeTextForMatch(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  return [...rows].sort((a, b) => {
    const scoreFor = (row: ExploreRow) => {
      const name = normalizeTextForMatch(row.name);
      const setName = normalizeTextForMatch(row.set_name);
      const gvId = row.gv_id.toUpperCase();
      const number = normalizeTextForMatch(row.number);
      let score = 0;

      if (directGvId && gvId === directGvId) score += 1000;
      if (normalizedQuery && name === normalizedQuery) score += 400;
      else if (normalizedQuery && name.startsWith(normalizedQuery)) score += 300;
      else if (normalizedQuery && name.includes(normalizedQuery)) score += 200;

      if (normalizedQuery && setName.includes(normalizedQuery)) score += 120;
      if (normalizedQuery && gvId === normalizedQuery.toUpperCase()) score += 900;
      if (normalizedQuery && gvId.includes(normalizedQuery.toUpperCase())) score += 150;
      if (normalizedQuery && number === normalizedQuery) score += 150;

      for (const token of queryTokens) {
        if (name.includes(token)) score += 35;
        if (setName.includes(token)) score += 20;
        if (gvId.includes(token.toUpperCase())) score += 20;
        if (number === token) score += 20;
      }

      return score;
    };

    const scoreA = scoreFor(a);
    const scoreB = scoreFor(b);
    if (scoreA !== scoreB) return scoreB - scoreA;

    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) return nameCompare;

    const setCompare = (a.set_name ?? "").localeCompare(b.set_name ?? "");
    if (setCompare !== 0) return setCompare;

    const numberCompare = a.number.localeCompare(b.number, undefined, { numeric: true });
    if (numberCompare !== 0) return numberCompare;

    return a.gv_id.localeCompare(b.gv_id);
  });
}

async function fetchExploreRows(query: string): Promise<ExploreRow[]> {
  const normalizedQuery = normalizeFreeTextQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const directGvId = normalizeGvIdInput(normalizedQuery);

  const [{ data: rpcData, error: rpcError }, directLookupResult] = await Promise.all([
    supabase.rpc("search_card_prints_v1", {
      q: normalizedQuery,
      limit_in: SEARCH_LIMIT,
    }),
    directGvId
      ? supabase.from("card_prints").select("id,gv_id,name,number,rarity,image_url").eq("gv_id", directGvId).limit(1)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const searchRows = (rpcData ?? []) as SearchRpcRow[];
  const ids = searchRows.map((row) => row.id);
  const directLookupRows = ((directLookupResult.data ?? []) as GvLookupRow[]).filter((row) => Boolean(row.id && row.gv_id));
  const lookupIds = Array.from(new Set([...ids, ...directLookupRows.map((row) => row.id)]));

  if (lookupIds.length === 0) {
    return [];
  }

  const { data: lookupDataWithSet, error: lookupErrorWithSet } = await supabase
    .from("card_prints")
    .select("id,gv_id,name,number,rarity,image_url,sets(name)")
    .in("id", lookupIds);
  const { data: lookupData, error: lookupError } = lookupErrorWithSet
    ? await supabase.from("card_prints").select("id,gv_id,name,number,rarity,image_url").in("id", lookupIds)
    : { data: lookupDataWithSet, error: null };

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const mergedSearchRows: SearchRpcRow[] = [...searchRows];
  for (const row of directLookupRows) {
    if (mergedSearchRows.some((existing) => existing.id === row.id)) continue;
    mergedSearchRows.unshift({
      id: row.id,
      name: row.name ?? "Unknown",
      number: row.number ?? "",
      rarity: row.rarity ?? null,
      image_url: row.image_url ?? null,
    });
  }

  const rows = buildExploreRows(mergedSearchRows, (lookupData ?? []) as GvLookupRow[]);
  return rankRows(rows, normalizedQuery, directGvId);
}

function ExplorePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [draftQuery, setDraftQuery] = useState(q);
  const [rows, setRows] = useState<ExploreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    setDraftQuery(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const normalizedQuery = normalizeFreeTextQuery(q);

      if (!normalizedQuery) {
        setRows([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextRows = await fetchExploreRows(normalizedQuery);
        if (cancelled) return;
        setRows(nextRows);
      } catch (searchError) {
        if (cancelled) return;
        setError(searchError instanceof Error ? searchError.message : "Search failed.");
        setRows([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [q]);

  const commitQuery = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedQuery = normalizeFreeTextQuery(nextQuery);

    if (normalizedQuery) {
      params.set("q", normalizedQuery);
    } else {
      params.delete("q");
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Public Explorer</p>
        <h1 className="text-3xl font-semibold text-slate-950">Explore cards</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Search the Grookai Vault identity catalog by name or printed number.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-slate-300 bg-white px-3 py-2"
          placeholder="Search by name or number"
          value={draftQuery}
          onChange={(e) => setDraftQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitQuery(draftQuery);
            }
          }}
        />
        <button
          className="rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => commitQuery(draftQuery)}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {rows.length > 0 ? `${rows.length} result${rows.length === 1 ? "" : "s"}` : "Results"}
          </p>
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          <ul className="divide-y rounded border border-slate-200 bg-white">
            {rows.map((row) => (
              <li key={row.id} className="flex items-start gap-4 px-4 py-4">
                {row.image_url ? (
                  <img
                    src={row.image_url}
                    alt={row.name}
                    className="h-24 w-16 rounded-lg border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="h-24 w-16 rounded-lg border border-slate-200 bg-slate-100" />
                )}
                <div className="flex flex-1 flex-col gap-1 pt-1">
                  <Link href={`/card/${row.gv_id}`} className="text-base font-medium text-slate-950 hover:underline">
                    {row.name}
                  </Link>
                  {([row.set_name, row.number, row.rarity].filter(Boolean).length > 0) && (
                    <p className="text-sm text-slate-600">
                      {[row.set_name, row.number ? `#${row.number}` : undefined, row.rarity].filter(Boolean).join(" • ")}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">{row.gv_id}</p>
                </div>
              </li>
            ))}
            {rows.length === 0 && !loading && <li className="px-4 py-3 text-sm text-slate-600">No results yet.</li>}
          </ul>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/card/${row.gv_id}`}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {row.image_url ? (
                  <img
                    src={row.image_url}
                    alt={row.name}
                    className="aspect-[3/4] w-full bg-slate-50 object-contain p-5"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center bg-slate-100 text-sm text-slate-500">
                    No image
                  </div>
                )}
                <div className="space-y-2 border-t border-slate-200 px-4 py-4">
                  <p className="line-clamp-2 text-base font-medium text-slate-950">{row.name}</p>
                  {([row.set_name, row.number, row.rarity].filter(Boolean).length > 0) && (
                    <p className="text-sm text-slate-600">
                      {[row.set_name, row.number ? `#${row.number}` : undefined, row.rarity].filter(Boolean).join(" • ")}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">{row.gv_id}</p>
                </div>
              </Link>
            ))}
            {rows.length === 0 && !loading && (
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 sm:col-span-2 xl:col-span-3">
                No results yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="py-8 text-sm text-slate-600">Loading explorer...</div>}>
      <ExplorePageContent />
    </Suspense>
  );
}
