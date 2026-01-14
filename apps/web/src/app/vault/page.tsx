"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type VaultRow = {
  id: string;
  card_name?: string | null;
  set_code?: string | null;
  number?: string | null;
  image_url?: string | null;
  condition_label?: string | null;
};

export default function VaultPage() {
  const router = useRouter();
  const [rows, setRows] = useState<VaultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: selectError } = await supabase
        .from("v_vault_items_ext")
        .select("id,card_name,set_code,number,image_url,condition_label")
        .limit(50);
      if (selectError) {
        setError(
          `Vault view blocked or RLS denied: ${selectError.message}. If RLS remains, keep this page as read-only placeholder.`,
        );
        setRows([]);
      } else {
        setRows((data ?? []) as VaultRow[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Vault (read-only)</h1>
      {loading && <p className="text-sm text-slate-600">Loading…</p>}
      <ul className="divide-y rounded border bg-white">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 px-4 py-3">
            {row.image_url ? (
              <img src={row.image_url} alt={row.card_name ?? "card"} className="h-12 w-9 rounded border object-contain" />
            ) : (
              <div className="h-12 w-9 rounded border bg-slate-100" />
            )}
            <div className="flex flex-1 flex-col">
              <div className="font-medium">{row.card_name ?? "Unknown"}</div>
              <p className="text-sm text-slate-600">
                {row.set_code ?? "?"} · {row.number ?? "?"} · {row.condition_label ?? "—"}
              </p>
            </div>
          </li>
        ))}
        {rows.length === 0 && !loading && (
          <li className="px-4 py-3 text-sm text-slate-600">No vault items visible.</li>
        )}
      </ul>
    </div>
  );
}
