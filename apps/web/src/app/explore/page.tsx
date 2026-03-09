"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CardSummary } from "@/types/cards";

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
  sets?: { name: string | null } | { name: string | null }[] | null;
};

export default function ExplorePage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ExploreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("search_card_prints_v1", {
      q,
      limit_in: 30,
    });

    if (rpcError) {
      setError(rpcError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const searchRows = (data ?? []) as SearchRpcRow[];
    if (searchRows.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const ids = searchRows.map((row) => row.id);
    const { data: lookupDataWithSet, error: lookupErrorWithSet } = await supabase
      .from("card_prints")
      .select("id,gv_id,sets(name)")
      .in("id", ids);
    const { data: lookupData, error: lookupError } = lookupErrorWithSet
      ? await supabase.from("card_prints").select("id,gv_id").in("id", ids)
      : { data: lookupDataWithSet, error: null };

    if (lookupError) {
      setError(lookupError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const gvIdById = new Map(
      ((lookupData ?? []) as GvLookupRow[]).flatMap((row) => (row.gv_id ? [[row.id, row.gv_id] as const] : [])),
    );
    const setNameById = new Map(
      ((lookupData ?? []) as GvLookupRow[]).flatMap((row) => {
        const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
        return setRecord?.name ? [[row.id, setRecord.name] as const] : [];
      }),
    );

    const normalizedRows: ExploreRow[] = [];
    for (const row of searchRows) {
      const gv_id = gvIdById.get(row.id);
      if (!gv_id) continue;

      normalizedRows.push({
        id: row.id,
        gv_id,
        name: row.name ?? "Unknown",
        number: row.number ?? "",
        set_name: setNameById.get(row.id),
        rarity: row.rarity ?? undefined,
        image_url: row.image_url ?? undefined,
      });
    }

    setRows(normalizedRows);
    setLoading(false);
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
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
        <button
          className="rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={runSearch}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="divide-y rounded border border-slate-200 bg-white">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 px-4 py-3">
            {row.image_url ? (
              <img
                src={row.image_url}
                alt={row.name}
                className="h-14 w-10 rounded border border-slate-200 object-contain"
              />
            ) : (
              <div className="h-14 w-10 rounded border border-slate-200 bg-slate-100" />
            )}
            <div className="flex flex-1 flex-col">
              <Link href={`/card/${row.gv_id}`} className="font-medium hover:underline">
                {row.name}
              </Link>
              {([row.set_name, row.number, row.rarity].filter(Boolean).length > 0) && (
                <p className="text-sm text-slate-600">
                  {[row.set_name, row.number, row.rarity].filter(Boolean).join(" • ")}
                </p>
              )}
              <p className="text-xs text-slate-500">{row.gv_id}</p>
            </div>
          </li>
        ))}
        {rows.length === 0 && !loading && <li className="px-4 py-3 text-sm text-slate-600">No results yet.</li>}
      </ul>
    </div>
  );
}
