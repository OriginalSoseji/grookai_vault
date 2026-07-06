import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerComponentClient } from "@/lib/supabase/server";

type LocalDiscoverySettingRow = {
  local_discovery_enabled: boolean | null;
  area_label: string | null;
  region_code: string | null;
  country_code: string | null;
};

type LocalCommunityFeedRpcRow = {
  feed_item_id: string | null;
  source_type: string | null;
  owner_slug: string | null;
  owner_display_name: string | null;
  owner_avatar_path: string | null;
  gv_id: string | null;
  card_name: string | null;
  set_code: string | null;
  set_name: string | null;
  card_number: string | null;
  intent: string | null;
  image_url: string | null;
  display_image_kind: string | null;
  locality_label: string | null;
  distance_bucket: string | null;
  relationship_context: string | null;
  viewer_wishlist_match: boolean | null;
  match_reason: string | null;
  created_at: string | null;
  route_target: string | null;
};

export type LocalCommunityFeedRow = {
  feedItemId: string;
  sourceType: "wall_card" | "trade" | "sell" | "showcase" | "network_card";
  ownerSlug: string;
  ownerDisplayName: string;
  ownerAvatarPath: string | null;
  gvId: string;
  cardName: string;
  setCode: string;
  setName: string;
  cardNumber: string;
  intent: string | null;
  imageUrl: string | null;
  displayImageKind: string;
  localityLabel: string;
  distanceBucket: "nearby" | "same_region";
  relationshipContext: "following" | "not_following";
  viewerWishlistMatch: boolean;
  matchReason: "viewer_wishlist" | null;
  createdAt: string | null;
  routeTarget: string;
};

export type LocalCommunityFeedState =
  | {
      status: "disabled";
      rows: [];
      setting: null;
    }
  | {
      status: "local_discovery_off";
      rows: [];
      setting: LocalDiscoverySettingRow | null;
    }
  | {
      status: "ready";
      rows: LocalCommunityFeedRow[];
      setting: LocalDiscoverySettingRow;
    }
  | {
      status: "error";
      rows: [];
      setting: LocalDiscoverySettingRow | null;
      message: string;
    };

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSourceType(value: string | null | undefined): LocalCommunityFeedRow["sourceType"] {
  switch (normalizeText(value)) {
    case "wall_card":
    case "trade":
    case "sell":
    case "showcase":
      return value as LocalCommunityFeedRow["sourceType"];
    default:
      return "network_card";
  }
}

function normalizeDistanceBucket(value: string | null | undefined): LocalCommunityFeedRow["distanceBucket"] | null {
  switch (normalizeText(value)) {
    case "nearby":
      return "nearby";
    case "same_region":
      return "same_region";
    default:
      return null;
  }
}

function normalizeRelationshipContext(value: string | null | undefined): LocalCommunityFeedRow["relationshipContext"] {
  return normalizeText(value) === "following" ? "following" : "not_following";
}

function normalizeMatchReason(value: string | null | undefined): LocalCommunityFeedRow["matchReason"] {
  return normalizeText(value) === "viewer_wishlist" ? "viewer_wishlist" : null;
}

function normalizeRow(row: LocalCommunityFeedRpcRow): LocalCommunityFeedRow | null {
  const feedItemId = normalizeText(row.feed_item_id);
  const ownerSlug = normalizeText(row.owner_slug);
  const ownerDisplayName = normalizeText(row.owner_display_name);
  const gvId = normalizeText(row.gv_id);
  const routeTarget = normalizeText(row.route_target);
  const distanceBucket = normalizeDistanceBucket(row.distance_bucket);

  if (!feedItemId || !ownerSlug || !ownerDisplayName || !gvId || !routeTarget || !distanceBucket) {
    return null;
  }

  return {
    feedItemId,
    sourceType: normalizeSourceType(row.source_type),
    ownerSlug,
    ownerDisplayName,
    ownerAvatarPath: normalizeText(row.owner_avatar_path),
    gvId,
    cardName: normalizeText(row.card_name) ?? "Unknown card",
    setCode: normalizeText(row.set_code) ?? "Unknown set",
    setName: normalizeText(row.set_name) ?? normalizeText(row.set_code) ?? "Unknown set",
    cardNumber: normalizeText(row.card_number) ?? "—",
    intent: normalizeText(row.intent),
    imageUrl: normalizeText(row.image_url),
    displayImageKind: normalizeText(row.display_image_kind) ?? "missing",
    localityLabel: normalizeText(row.locality_label) ?? (distanceBucket === "nearby" ? "Nearby" : "Same region"),
    distanceBucket,
    relationshipContext: normalizeRelationshipContext(row.relationship_context),
    viewerWishlistMatch: row.viewer_wishlist_match === true,
    matchReason: normalizeMatchReason(row.match_reason),
    createdAt: row.created_at ?? null,
    routeTarget,
  };
}

async function getViewerLocalDiscoverySetting(supabase: SupabaseClient): Promise<LocalDiscoverySettingRow | null> {
  const { data, error } = await supabase
    .from("collector_local_discovery_settings")
    .select("local_discovery_enabled,area_label,region_code,country_code")
    .maybeSingle();

  if (error) {
    throw new Error(`[local-community] setting query failed: ${error.message}`);
  }

  return (data ?? null) as LocalDiscoverySettingRow | null;
}

export async function getLocalCommunityFeedRows({
  enabled,
  limit = 40,
}: {
  enabled: boolean;
  limit?: number;
}): Promise<LocalCommunityFeedState> {
  if (!enabled) {
    return { status: "disabled", rows: [], setting: null };
  }

  const supabase = createServerComponentClient();

  try {
    const setting = await getViewerLocalDiscoverySetting(supabase);
    if (setting?.local_discovery_enabled !== true) {
      return { status: "local_discovery_off", rows: [], setting };
    }

    const { data, error } = await supabase.rpc("local_community_feed_v2", {
      p_limit: Math.max(1, Math.min(limit, 80)),
    });

    if (error) {
      throw new Error(error.message);
    }

    const rows = ((data ?? []) as LocalCommunityFeedRpcRow[])
      .map(normalizeRow)
      .filter((row): row is LocalCommunityFeedRow => row !== null);

    return { status: "ready", rows, setting };
  } catch (error) {
    return {
      status: "error",
      rows: [],
      setting: null,
      message: error instanceof Error ? error.message : "Local community feed is unavailable.",
    };
  }
}
