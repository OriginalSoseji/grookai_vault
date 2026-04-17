import type { SupabaseClient } from "@supabase/supabase-js";
import TrackPageEvent from "@/components/telemetry/TrackPageEvent";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import {
  VaultCollectionView,
  type RecentCardData,
} from "@/components/vault/VaultCollectionView";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import {
  buildVaultValueSummary,
  getOwnerVaultItems,
} from "@/lib/vault/getOwnerVaultItems";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type RecentIdentityRow = {
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  sets?:
    | {
        name: string | null;
        identity_model: string | null;
      }
    | {
        name: string | null;
        identity_model: string | null;
      }[]
    | null;
};

async function getRecentIdentityByGvId(
  supabase: SupabaseClient,
  gvIds: string[],
) {
  const normalizedIds = Array.from(new Set(gvIds.map((value) => value.trim()).filter(Boolean)));
  if (normalizedIds.length === 0) {
    return new Map<string, RecentIdentityRow>();
  }

  const { data, error } = await supabase
    .from("card_prints")
    .select(
      "gv_id,name,set_code,number,variant_key,printed_identity_modifier,sets(name,identity_model)",
    )
    .in("gv_id", normalizedIds);

  if (error || !data) {
    return new Map<string, RecentIdentityRow>();
  }

  return new Map(
    (data as RecentIdentityRow[])
      .filter((row): row is RecentIdentityRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
      .map((row) => [row.gv_id, row]),
  );
}

function normalizeRecentItems(
  rows: RecentItemRow[] | null | undefined,
  identityByGvId: Map<string, RecentIdentityRow>,
): RecentCardData[] {
  return (rows ?? [])
    .filter((row): row is RecentItemRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map((row) => {
      const identityRow = identityByGvId.get(row.gv_id);
      const setRecord = Array.isArray(identityRow?.sets) ? identityRow?.sets[0] : identityRow?.sets;
      const name = identityRow?.name?.trim() || row.name?.trim() || "Unknown card";
      const setCode = identityRow?.set_code?.trim() || row.set_code?.trim() || "Unknown set";
      const number = identityRow?.number?.trim() || row.number?.trim() || "—";
      const displayIdentity = resolveDisplayIdentity({
        name,
        variant_key: identityRow?.variant_key ?? null,
        printed_identity_modifier: identityRow?.printed_identity_modifier ?? null,
        set_identity_model: setRecord?.identity_model ?? null,
        set_code: setCode,
        number,
      });

      return {
        id: row.id,
        gv_id: row.gv_id,
        name,
        display_name: displayIdentity.display_name,
        set_code: setCode,
        set_name: setRecord?.name?.trim() || row.set_name?.trim() || row.set_code?.trim() || "Unknown set",
        number,
        created_at: row.created_at,
        image_url: getBestPublicCardImageUrl(row.image_url, row.image_best ?? row.image_alt_url),
      };
    });
}

export default async function VaultPage() {
  const { supabase, user } = await requireServerUser("/vault");

  const [
    { data: recentData, error: recentError },
    { items, canonicalRows, itemsError, publicProfileHref, publicCollectionHref },
  ] = await Promise.all([
    supabase
      .from("v_recently_added")
      .select("id,gv_id,name,set_code,set_name,number,created_at,image_url,image_best,image_alt_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    getOwnerVaultItems(user.id),
  ]);

  const recentIdentityByGvId = await getRecentIdentityByGvId(
    supabase,
    ((recentData ?? []) as RecentItemRow[])
      .map((row) => row.gv_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const recent = normalizeRecentItems((recentData ?? null) as RecentItemRow[] | null, recentIdentityByGvId);
  const setLogoPathByCode = Object.fromEntries(
    (await getSetLogoAssetPathMap(items.map((item) => item.set_code))).entries(),
  );
  const valueSummary = buildVaultValueSummary(canonicalRows);

  return (
    <>
      <TrackPageEvent eventName="vault_opened" path="/vault" />
      <VaultCollectionView
        initialItems={items}
        recent={recent}
        itemsError={itemsError}
        recentError={recentError?.message}
        valueSummary={valueSummary}
        publicProfileHref={publicProfileHref}
        publicCollectionHref={publicCollectionHref}
        setLogoPathByCode={setLogoPathByCode}
      />
    </>
  );
}
