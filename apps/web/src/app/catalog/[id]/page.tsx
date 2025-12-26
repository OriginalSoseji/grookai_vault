"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DetailRow = {
  id: string;
  name: string | null;
  number: string | null;
  number_plain: string | null;
  rarity: string | null;
  set_code: string | null;
  image_url: string | null;
  sets?: { name: string | null; code: string | null } | null;
};

export default function CardDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [row, setRow] = useState<DetailRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    const load = async () => {
      const { data, error: selectError } = await supabase
        .from("card_prints")
        .select(
          "id,name,number,number_plain,rarity,set_code,image_url,sets(name,code)",
        )
        .eq("id", params.id)
        .limit(1)
        .single();
      if (selectError) setError(selectError.message);
      else setRow(data as DetailRow);
    };
    load();
  }, [params.id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!row) return <p className="text-sm text-slate-600">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {row.image_url ? (
          <img src={row.image_url} alt={row.name ?? "card"} className="h-64 w-48 rounded border object-contain" />
        ) : (
          <div className="h-64 w-48 rounded border bg-slate-100" />
        )}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{row.name ?? "Unknown"}</h1>
          <p className="text-sm text-slate-700">
            Set: {row.sets?.name ?? row.set_code ?? "Unknown"} ({row.sets?.code ?? row.set_code ?? "?"})
          </p>
          <p className="text-sm text-slate-700">Number: {row.number ?? "?"}</p>
          <p className="text-sm text-slate-700">Rarity: {row.rarity ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
