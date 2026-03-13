import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  VaultCollectionView,
  type RecentCardData,
} from "@/components/vault/VaultCollectionView";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type VaultItemRow = {
  id: string;
  vault_item_id: string | null;
  card_id: string | null;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  condition_label: string | null;
  quantity: number | null;
  effective_price: number | null;
  image_url: string | null;
  created_at: string | null;
};

type RecentItemRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  created_at: string | null;
  image_url: string | null;
  image_best: string | null;
  image_alt_url: string | null;
};

function normalizeVaultItems(rows: VaultItemRow[] | null | undefined): VaultCardData[] {
  return (rows ?? [])
    .filter((row): row is VaultItemRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map((row) => ({
      id: row.id,
      vault_item_id: row.vault_item_id ?? row.id,
      card_id: row.card_id ?? "",
      gv_id: row.gv_id,
      name: row.name?.trim() || "Unknown card",
      set_code: row.set_code?.trim() || "Unknown set",
      set_name: row.set_name?.trim() || row.set_code?.trim() || "Unknown set",
      number: row.number?.trim() || "—",
      condition_label: row.condition_label?.trim() || "Unknown",
      quantity: typeof row.quantity === "number" ? row.quantity : 0,
      effective_price: typeof row.effective_price === "number" ? row.effective_price : null,
      image_url: getBestPublicCardImageUrl(row.image_url),
      created_at: row.created_at,
    }));
}

function normalizeRecentItems(rows: RecentItemRow[] | null | undefined): RecentCardData[] {
  return (rows ?? [])
    .filter((row): row is RecentItemRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map((row) => ({
      id: row.id,
      gv_id: row.gv_id,
      name: row.name?.trim() || "Unknown card",
      set_code: row.set_code?.trim() || "Unknown set",
      set_name: row.set_name?.trim() || row.set_code?.trim() || "Unknown set",
      number: row.number?.trim() || "—",
      created_at: row.created_at,
      image_url: getBestPublicCardImageUrl(row.image_url, row.image_best ?? row.image_alt_url),
    }));
}

export default async function VaultPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center py-10">
        <section className="w-full max-w-2xl space-y-10 text-center">
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your vault. Ready when you are.</h1>
            <p className="text-base leading-7 text-slate-600">Sign in to see the cards you own in one clear place.</p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white px-8 py-8 shadow-sm">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Vault Access</p>
              <p className="text-sm leading-7 text-slate-600">Sign in to view and manage your personal collection.</p>
              <div className="flex justify-center pt-2">
                <GoogleSignInButton
                  label="Sign in with Google"
                  nextPath="/vault"
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const [{ data: itemsData, error: itemsError }, { data: recentData, error: recentError }] = await Promise.all([
    supabase
      .from("v_vault_items_web")
      .select("id,vault_item_id,card_id,gv_id,name,set_code,set_name,number,condition_label,quantity,effective_price,image_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("v_recently_added")
      .select("id,gv_id,name,set_code,set_name,number,created_at,image_url,image_best,image_alt_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items = normalizeVaultItems((itemsData ?? null) as VaultItemRow[] | null);
  const recent = normalizeRecentItems((recentData ?? null) as RecentItemRow[] | null);

  return <VaultCollectionView initialItems={items} recent={recent} itemsError={itemsError?.message} recentError={recentError?.message} />;
}
