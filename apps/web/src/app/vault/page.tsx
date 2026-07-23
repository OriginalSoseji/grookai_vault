import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import TrackPageEvent from "@/components/telemetry/TrackPageEvent";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import {
  VaultCollectionView,
  type RecentCardData,
} from "@/components/vault/VaultCollectionView";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import {
  applyChildDisplayImageFallback,
  getChildDisplayImageFallbacks,
} from "@/lib/cards/childDisplayImageFallbacks";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { resolveDisplayImageUrl } from "@/lib/publicCardImage";
import { getGrookaiDexSpeciesVaultFilter } from "@/lib/grookaiDex/getGrookaiDexSpeciesVaultFilter";
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
  id: string | null;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
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
      "id,gv_id,name,set_code,number,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,identity_model)",
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

async function normalizeRecentItems(
  rows: RecentItemRow[] | null | undefined,
  identityByGvId: Map<string, RecentIdentityRow>,
  supabase: SupabaseClient,
): Promise<RecentCardData[]> {
  const childDisplayImageFallbacks = await getChildDisplayImageFallbacks(
    supabase,
    Array.from(identityByGvId.values()),
  );
  const resolvedRows = await Promise.all((rows ?? [])
    .filter((row): row is RecentItemRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map(async (row) => {
      const identityRow = identityByGvId.get(row.gv_id);
      const rawImageFields = await resolveCardImageFieldsV1(identityRow);
      const imageFields = applyChildDisplayImageFallback(
        rawImageFields,
        identityRow?.id ? childDisplayImageFallbacks.get(identityRow.id) : null,
      );
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
        image_url:
          resolveDisplayImageUrl({
            display_image_url: imageFields.display_image_url,
            image_url: row.image_url,
            image_alt_url: row.image_best ?? row.image_alt_url,
            representative_image_url: imageFields.representative_image_url,
          }) ?? undefined,
      };
    }));

  return resolvedRows;
}

function parseSpeciesFilter(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().toLowerCase().slice(0, 80);
}

export default async function VaultPage({
  searchParams,
}: {
  searchParams?: { species?: string | string[] };
}) {
  const { supabase, user } = await requireServerUser("/vault");
  const requestedSpeciesSlug = parseSpeciesFilter(searchParams?.species);
  const speciesFilter = requestedSpeciesSlug
    ? await getGrookaiDexSpeciesVaultFilter(requestedSpeciesSlug)
    : null;
  const exactCardPrintIds = requestedSpeciesSlug
    ? speciesFilter?.cardPrintIds ?? []
    : undefined;

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
    getOwnerVaultItems(user.id, { cardPrintIds: exactCardPrintIds }),
  ]);

  const recentIdentityByGvId = await getRecentIdentityByGvId(
    supabase,
    ((recentData ?? []) as RecentItemRow[])
      .map((row) => row.gv_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const recent = await normalizeRecentItems((recentData ?? null) as RecentItemRow[] | null, recentIdentityByGvId, supabase);
  const filteredGvIds = new Set(items.map((item) => item.gv_id));
  const visibleRecent = requestedSpeciesSlug
    ? recent.filter((item) => filteredGvIds.has(item.gv_id))
    : recent;
  const setLogoPathByCode = Object.fromEntries(
    (await getSetLogoAssetPathMap(items.map((item) => item.set_code))).entries(),
  );
  const valueSummary = buildVaultValueSummary(canonicalRows);

  return (
    <>
      <TrackPageEvent eventName="vault_opened" path="/vault" />
      {requestedSpeciesSlug ? (
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-950 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em]">
              Exact Dex species filter
            </p>
            <p className="mt-1 text-sm font-semibold">
              {speciesFilter
                ? `${speciesFilter.displayName} · canonical mappings only`
                : `No active Dex species matches “${requestedSpeciesSlug}”.`}
            </p>
          </div>
          <div className="flex gap-2">
            {speciesFilter ? (
              <Link
                href={`/dex/${encodeURIComponent(speciesFilter.slug)}`}
                className="gv-secondary-button min-h-0 px-4 py-2 text-sm"
              >
                Back to Dex
              </Link>
            ) : null}
            <Link
              href="/vault"
              className="gv-secondary-button min-h-0 px-4 py-2 text-sm"
            >
              Clear filter
            </Link>
          </div>
        </section>
      ) : null}
      <VaultCollectionView
        initialItems={items}
        recent={visibleRecent}
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
