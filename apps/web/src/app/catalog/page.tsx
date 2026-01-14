"use client";

import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SearchRow = {
  card_print_id: string;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  name: string | null;
  rarity: string | null;
  image_url: string | null;
};

export default function CatalogPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("search_card_prints_v1", {
      q,
      limit_n: 30,
    });
    if (rpcError) {
      setError(rpcError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as SearchRow[]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Catalog</h1>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Search by name or number (uses search_card_prints_v1)"
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
      <ul className="divide-y rounded border bg-white">
        {rows.map((row) => (
          <li key={row.card_print_id} className="flex items-center gap-3 px-4 py-3">
            {row.image_url ? (
              <img
                src={row.image_url}
                alt={row.name ?? "card"}
                className="h-12 w-9 rounded border object-contain"
              />
            ) : (
              <div className="h-12 w-9 rounded border bg-slate-100" />
            )}
            <div className="flex flex-1 flex-col">
              <Link href={`/catalog/${row.card_print_id}`} className="font-medium hover:underline">
                {row.name ?? "Unknown"}
              </Link>
              <p className="text-sm text-slate-600">
                {row.set_name ?? row.set_code ?? "Unknown set"} · {row.number ?? "?"} ·{" "}
                {row.rarity ?? "—"}
              </p>
            </div>
          </li>
        ))}
        {rows.length === 0 && !loading && <li className="px-4 py-3 text-sm text-slate-600">No results yet.</li>}
      </ul>
    </div>
  );
}
