import "server-only";

import type { VaultCardData } from "@/components/vault/VaultCardTile";
import { normalizeVaultIntent } from "@/lib/network/intent";
import {
  buildOwnedCardMessagesHref,
  getOwnedCardMessageSummaries,
} from "@/lib/network/getOwnedCardMessageSummaries";
import { resolveDisplayImageUrl } from "@/lib/publicCardImage";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  getCanonicalVaultCollectorRows,
  type CanonicalVaultCollectorRow,
} from "@/lib/vault/getCanonicalVaultCollectorRows";

type PublicProfileRow = {
  slug: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
};

export type VaultValueSummary = {
  totalEstimatedValue: number | null;
  pricedGroupedCount: number;
  totalGroupedCount: number;
  latestPricingUpdateAt: string | null;
};

export type OwnerVaultItemsResult = {
  items: VaultCardData[];
  canonicalRows: CanonicalVaultCollectorRow[];
  itemsError: string | null;
  publicProfileHref: string | null;
  publicCollectionHref: string | null;
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

export function buildVaultValueSummary(rows: CanonicalVaultCollectorRow[]): VaultValueSummary {
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
  messageSummaryByCardPrintId: Map<string, { activeCount: number; unreadCount: number }>,
): VaultCardData[] {
  return (rows ?? [])
    .filter((row): row is CanonicalVaultCollectorRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map((row) => {
      return {
        id: row.id,
        vault_item_id: row.vault_item_id,
        gv_vi_id: row.gv_vi_id,
        card_id: row.card_id,
        gv_id: row.gv_id,
        name: row.name.trim() || "Unknown card",
        variant_key: row.variant_key ?? undefined,
        printed_identity_modifier: row.printed_identity_modifier ?? undefined,
        set_identity_model: row.set_identity_model ?? undefined,
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
        image_url:
          resolveDisplayImageUrl({
            display_image_url: row.image_url,
            image_url: row.canonical_image_url,
          }) ?? undefined,
        canonical_image_url:
          resolveDisplayImageUrl({
            display_image_url: row.canonical_display_image_url,
            image_url: row.canonical_image_url,
            representative_image_url: row.canonical_representative_image_url,
          }) ?? undefined,
        created_at: row.created_at,
        is_slab: row.is_slab,
        grader: row.grader,
        grade: row.grade,
        cert_number: row.cert_number,
        // LOCK: Owner Wall status is derived from exact-copy intent, not grouped shared_cards.
        is_shared: row.in_play_count > 0,
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

export async function getOwnerVaultItems(userId: string): Promise<OwnerVaultItemsResult> {
  const supabase = createServerComponentClient();

  let canonicalRows: CanonicalVaultCollectorRow[] = [];
  let itemsError: string | null = null;

  try {
    canonicalRows = await getCanonicalVaultCollectorRows(userId);
  } catch (error) {
    itemsError = error instanceof Error ? error.message : "Unknown canonical vault read error";
  }

  let messageSummaryByCardPrintId = new Map<string, { activeCount: number; unreadCount: number }>();
  try {
    const messageSummaries = await getOwnedCardMessageSummaries(
      userId,
      canonicalRows.map((row) => row.card_id),
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
      userId,
      error,
    });
  }

  const { data: profileData, error: profileError } = await supabase
    .from("public_profiles")
    .select("slug,public_profile_enabled,vault_sharing_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  const items = normalizeVaultItems(
    canonicalRows,
    messageSummaryByCardPrintId,
  );

  const profile = (profileData ?? null) as PublicProfileRow | null;
  const publicProfileHref =
    profile?.slug && profile.public_profile_enabled && profile.vault_sharing_enabled ? `/u/${profile.slug}` : null;
  const publicCollectionHref =
    profile?.slug && profile.public_profile_enabled && profile.vault_sharing_enabled ? `/u/${profile.slug}/collection` : null;

  return {
    items,
    canonicalRows,
    itemsError: itemsError ?? profileError?.message ?? null,
    publicProfileHref,
    publicCollectionHref,
  };
}
