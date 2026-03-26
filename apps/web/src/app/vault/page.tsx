import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import TrackPageEvent from "@/components/telemetry/TrackPageEvent";
import {
  VaultCollectionView,
  type RecentCardData,
} from "@/components/vault/VaultCollectionView";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import { normalizeVaultIntent } from "@/lib/network/intent";
import {
  buildOwnedCardMessagesHref,
  getOwnedCardMessageSummaries,
} from "@/lib/network/getOwnedCardMessageSummaries";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import {
  normalizeWallCategory,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  getCanonicalVaultCollectorRows,
  type CanonicalVaultCollectorRow,
} from "@/lib/vault/getCanonicalVaultCollectorRows";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SharedCardRow = {
  card_id: string | null;
  gv_id: string | null;
  is_shared: boolean | null;
  wall_category: string | null;
  public_note: string | null;
  show_personal_front: boolean | null;
  show_personal_back: boolean | null;
};

type UserCardImageRow = {
  vault_item_id: string | null;
  side: string | null;
};

type PublicProfileRow = {
  slug: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
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

type VaultValueSummary = {
  totalEstimatedValue: number | null;
  pricedGroupedCount: number;
  totalGroupedCount: number;
  latestPricingUpdateAt: string | null;
};

function pickLatestIsoTimestamp(left: string | null, right: string | null) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function buildVaultValueSummary(rows: CanonicalVaultCollectorRow[]): VaultValueSummary {
  let totalEstimatedValue = 0;
  let pricedGroupedCount = 0;
  let latestPricingUpdateAt: string | null = null;

  for (const row of rows) {
    if (typeof row.effective_price !== "number" || Number.isNaN(row.effective_price)) {
      continue;
    }

    pricedGroupedCount += 1;
    totalEstimatedValue += row.effective_price;
    latestPricingUpdateAt = pickLatestIsoTimestamp(latestPricingUpdateAt, row.pricing_updated_at ?? null);
  }

  return {
    totalEstimatedValue: pricedGroupedCount > 0 ? Number(totalEstimatedValue.toFixed(2)) : null,
    pricedGroupedCount,
    totalGroupedCount: rows.length,
    latestPricingUpdateAt,
  };
}

function normalizeVaultItems(
  rows: CanonicalVaultCollectorRow[] | null | undefined,
  sharedCardIds: Set<string>,
  sharedGvIds: Set<string>,
  sharedWallCategoryByCardId: Map<string, WallCategory | null>,
  sharedWallCategoryByGvId: Map<string, WallCategory | null>,
  sharedNotesByCardId: Map<string, string | null>,
  sharedNotesByGvId: Map<string, string | null>,
  sharedFrontImageCardIds: Set<string>,
  sharedFrontImageGvIds: Set<string>,
  sharedBackImageCardIds: Set<string>,
  sharedBackImageGvIds: Set<string>,
  vaultFrontPhotoIds: Set<string>,
  vaultBackPhotoIds: Set<string>,
  messageSummaryByCardPrintId: Map<string, { activeCount: number; unreadCount: number }>,
): VaultCardData[] {
  return (rows ?? [])
    .filter((row): row is CanonicalVaultCollectorRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map((row) => {
      const noteFromCardId = sharedNotesByCardId.get(row.card_id) ?? null;
      const vaultItemId = row.vault_item_id;

      return {
        id: row.id,
        vault_item_id: vaultItemId,
        gv_vi_id: row.gv_vi_id,
        card_id: row.card_id,
        gv_id: row.gv_id,
        name: row.name.trim() || "Unknown card",
        set_code: row.set_code.trim() || "Unknown set",
        set_name: row.set_name.trim() || row.set_code.trim() || "Unknown set",
        number: row.number.trim() || "—",
        condition_label: row.condition_label.trim() || "Unknown",
        intent: normalizeVaultIntent(row.intent) ?? "hold",
        primary_intent: normalizeVaultIntent(row.primary_intent) ?? null,
        hold_count: row.hold_count,
        trade_count: row.trade_count,
        sell_count: row.sell_count,
        showcase_count: row.showcase_count,
        in_play_count: row.in_play_count,
        quantity: row.owned_count,
        owned_count: row.owned_count,
        raw_count: row.raw_count,
        slab_count: row.slab_count,
        removable_raw_instance_id: row.removable_raw_instance_id,
        slab_items: row.slab_items.map((slabItem) => ({
          instance_id: slabItem.instance_id,
          grader: slabItem.grader,
          grade: slabItem.grade,
          cert_number: slabItem.cert_number,
        })),
        copy_items: row.copy_items.map((copyItem) => ({
          instance_id: copyItem.instance_id,
          gv_vi_id: copyItem.gv_vi_id,
          intent: normalizeVaultIntent(copyItem.intent) ?? "hold",
          condition_label: copyItem.condition_label,
          is_graded: copyItem.is_graded,
          grader: copyItem.grader,
          grade: copyItem.grade,
          cert_number: copyItem.cert_number,
          notes: copyItem.notes,
          created_at: copyItem.created_at,
        })),
        effective_price: typeof row.effective_price === "number" ? row.effective_price : null,
        image_url: getBestPublicCardImageUrl(row.image_url, row.canonical_image_url),
        canonical_image_url: getBestPublicCardImageUrl(row.canonical_image_url),
        created_at: row.created_at,
        is_slab: row.is_slab,
        grader: row.grader,
        grade: row.grade,
        cert_number: row.cert_number,
        is_shared: sharedCardIds.has(row.card_id) || sharedGvIds.has(row.gv_id),
        wall_category:
          normalizeWallCategory(sharedWallCategoryByCardId.get(row.card_id) ?? null) ??
          normalizeWallCategory(sharedWallCategoryByGvId.get(row.gv_id) ?? null),
        public_note: noteFromCardId ?? sharedNotesByGvId.get(row.gv_id) ?? null,
        show_personal_front: sharedFrontImageCardIds.has(row.card_id) || sharedFrontImageGvIds.has(row.gv_id),
        show_personal_back: sharedBackImageCardIds.has(row.card_id) || sharedBackImageGvIds.has(row.gv_id),
        has_front_photo: vaultFrontPhotoIds.has(vaultItemId),
        has_back_photo: vaultBackPhotoIds.has(vaultItemId),
        active_message_count: messageSummaryByCardPrintId.get(row.card_id)?.activeCount ?? 0,
        unread_message_count: messageSummaryByCardPrintId.get(row.card_id)?.unreadCount ?? 0,
        messages_href: messageSummaryByCardPrintId.has(row.card_id)
          ? buildOwnedCardMessagesHref({
              cardPrintId: row.card_id,
              unreadCount: messageSummaryByCardPrintId.get(row.card_id)?.unreadCount ?? 0,
            })
          : null,
      };
    });
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

  let itemRows: CanonicalVaultCollectorRow[] = [];
  let canonicalItemsError: string | null = null;
  try {
    // Vault authority note:
    // Canonical ownership truth = vault_item_instances
    // Canonical web read entry = getCanonicalVaultCollectorRows
    // Compatibility projections may still feed app-facing metadata during stabilization.
    itemRows = await getCanonicalVaultCollectorRows(user.id);
  } catch (error) {
    canonicalItemsError = error instanceof Error ? error.message : "Unknown canonical vault read error";
  }

  let messageSummaryByCardPrintId = new Map<string, { activeCount: number; unreadCount: number }>();
  try {
    const messageSummaries = await getOwnedCardMessageSummaries(
      user.id,
      itemRows.map((row) => row.card_id),
    );
    messageSummaryByCardPrintId = new Map(
      messageSummaries.map((summary) => [
        summary.cardPrintId,
        {
          activeCount: summary.activeCount,
          unreadCount: summary.unreadCount,
        },
      ]),
    );
  } catch (error) {
    console.error("[vault] owned card message summary lookup failed", {
      userId: user.id,
      error,
    });
  }

  const [
    { data: recentData, error: recentError },
    { data: sharedData, error: sharedError },
    { data: profileData, error: profileError },
    { data: imageData, error: imageError },
  ] = await Promise.all([
    supabase
      .from("v_recently_added")
      .select("id,gv_id,name,set_code,set_name,number,created_at,image_url,image_best,image_alt_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("shared_cards")
      .select("card_id,gv_id,is_shared,wall_category,public_note,show_personal_front,show_personal_back")
      .eq("user_id", user.id),
    supabase.from("public_profiles").select("slug,public_profile_enabled,vault_sharing_enabled").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_card_images").select("vault_item_id,side").eq("user_id", user.id),
  ]);

  const sharedRows = (sharedData ?? []) as SharedCardRow[];
  const sharedCardIds = new Set(
    sharedRows
      .filter((row) => row.is_shared !== false)
      .map((row) => row.card_id ?? "")
      .filter(Boolean),
  );
  const sharedGvIds = new Set(
    sharedRows
      .filter((row) => row.is_shared !== false)
      .map((row) => row.gv_id ?? "")
      .filter(Boolean),
  );
  const sharedNotesByCardId = new Map(
    sharedRows
      .filter((row) => row.is_shared !== false)
      .map((row) => [row.card_id ?? "", row.public_note ?? null] as const)
      .filter(([cardId]) => Boolean(cardId)),
  );
  const sharedNotesByGvId = new Map(
    sharedRows
      .filter((row) => row.is_shared !== false)
      .map((row) => [row.gv_id ?? "", row.public_note ?? null] as const)
      .filter(([gvId]) => Boolean(gvId)),
  );
  const sharedFrontImageCardIds = new Set(
    sharedRows
      .filter((row) => row.is_shared !== false && row.show_personal_front === true)
      .map((row) => row.card_id ?? "")
      .filter(Boolean),
  );
  const sharedFrontImageGvIds = new Set(
    sharedRows
      .filter((row) => row.is_shared !== false && row.show_personal_front === true)
      .map((row) => row.gv_id ?? "")
      .filter(Boolean),
  );
  const sharedBackImageCardIds = new Set(
    sharedRows
      .filter((row) => row.is_shared !== false && row.show_personal_back === true)
      .map((row) => row.card_id ?? "")
      .filter(Boolean),
  );
  const sharedBackImageGvIds = new Set(
    sharedRows
      .filter((row) => row.is_shared !== false && row.show_personal_back === true)
      .map((row) => row.gv_id ?? "")
      .filter(Boolean),
  );
  const sharedWallCategoryByCardId = new Map(
    sharedRows
      .filter((row) => row.is_shared !== false)
      .map((row) => [row.card_id ?? "", normalizeWallCategory(row.wall_category)] as const)
      .filter(([cardId]) => Boolean(cardId)),
  );
  const sharedWallCategoryByGvId = new Map(
    sharedRows
      .filter((row) => row.is_shared !== false)
      .map((row) => [row.gv_id ?? "", normalizeWallCategory(row.wall_category)] as const)
      .filter(([gvId]) => Boolean(gvId)),
  );
  const userCardImageRows = (imageData ?? []) as UserCardImageRow[];
  const vaultFrontPhotoIds = new Set(
    userCardImageRows
      .filter((row) => row.side === "front")
      .map((row) => row.vault_item_id ?? "")
      .filter(Boolean),
  );
  const vaultBackPhotoIds = new Set(
    userCardImageRows
      .filter((row) => row.side === "back")
      .map((row) => row.vault_item_id ?? "")
      .filter(Boolean),
  );

  const items = normalizeVaultItems(
    itemRows,
    sharedCardIds,
    sharedGvIds,
    sharedWallCategoryByCardId,
    sharedWallCategoryByGvId,
    sharedNotesByCardId,
    sharedNotesByGvId,
    sharedFrontImageCardIds,
    sharedFrontImageGvIds,
    sharedBackImageCardIds,
    sharedBackImageGvIds,
    vaultFrontPhotoIds,
    vaultBackPhotoIds,
    messageSummaryByCardPrintId,
  );
  const recent = normalizeRecentItems((recentData ?? null) as RecentItemRow[] | null);
  const setLogoPathByCode = Object.fromEntries(
    (await getSetLogoAssetPathMap(items.map((item) => item.set_code))).entries(),
  );
  const valueSummary = buildVaultValueSummary(itemRows);
  const profile = (profileData ?? null) as PublicProfileRow | null;
  const publicProfileHref =
    profile?.slug && profile.public_profile_enabled && profile.vault_sharing_enabled ? `/u/${profile.slug}` : null;
  const publicCollectionHref =
    profile?.slug && profile.public_profile_enabled && profile.vault_sharing_enabled ? `/u/${profile.slug}/collection` : null;

  return (
    <>
      <TrackPageEvent eventName="vault_opened" path="/vault" />
      <VaultCollectionView
        initialItems={items}
        recent={recent}
        itemsError={canonicalItemsError ?? sharedError?.message ?? profileError?.message ?? imageError?.message}
        recentError={recentError?.message}
        valueSummary={valueSummary}
        publicProfileHref={publicProfileHref}
        publicCollectionHref={publicCollectionHref}
        setLogoPathByCode={setLogoPathByCode}
      />
    </>
  );
}
