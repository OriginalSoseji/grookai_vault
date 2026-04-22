/**
 * STABILIZATION RULE:
 *
 * Current active vault authority:
 * - Canonical ownership truth: vault_item_instances
 * - Web canonical read entry: getCanonicalVaultCollectorRows
 * - Compatibility projection: v_vault_items_web
 *
 * Any usage of v_vault_items_web, v_vault_items, v_vault_items_ext, or
 * bucket-era vault surfaces is compatibility-only during stabilization.
 *
 * Do not introduce new ownership semantics derived from vault_items.
 * Do not treat compatibility projections as canonical ownership truth.
 *
 * See: STABILIZATION_CONTRACT_V1.md
 */
import "server-only";

import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { normalizeVaultIntent, type VaultIntent } from "@/lib/network/intent";
import {
  countVaultIntents,
  getInPlayCount,
  getSingleDiscoverableIntent,
} from "@/lib/network/intentSummary";
import { resolveDisplayImageUrl } from "@/lib/publicCardImage";
import { resolveVaultInstanceMediaUrl } from "@/lib/vault/resolveVaultInstanceMediaUrl";
import { prefersUploadedVaultInstanceImage } from "@/lib/vaultInstanceImageDisplay";

export type CanonicalVaultCollectorSlabItem = {
  instance_id: string;
  gv_vi_id: string | null;
  slab_cert_id: string;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
  created_at: string | null;
};

export type CanonicalVaultCollectorCopyItem = {
  instance_id: string;
  gv_vi_id: string | null;
  intent: VaultIntent;
  condition_label: string | null;
  is_graded: boolean;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
  notes: string | null;
  created_at: string | null;
};

export type CanonicalVaultCollectorRow = {
  id: string;
  vault_item_id: string;
  representative_vault_item_id: string;
  gv_vi_id: string | null;
  card_id: string;
  gv_id: string;
  name: string;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  set_identity_model: string | null;
  set_code: string;
  set_name: string;
  number: string;
  condition_label: string;
  intent: VaultIntent;
  primary_intent: VaultIntent | null;
  hold_count: number;
  trade_count: number;
  sell_count: number;
  showcase_count: number;
  in_play_count: number;
  owned_count: number;
  total_count: number;
  raw_count: number;
  slab_count: number;
  removable_raw_instance_id: string | null;
  slab_items: CanonicalVaultCollectorSlabItem[];
  copy_items: CanonicalVaultCollectorCopyItem[];
  effective_price: number | null;
  pricing_updated_at: string | null;
  image_url: string | null;
  canonical_image_url: string | null;
  canonical_representative_image_url: string | null;
  canonical_image_status: string | null;
  canonical_image_note: string | null;
  canonical_image_source: string | null;
  canonical_display_image_url: string | null;
  canonical_display_image_kind: "exact" | "representative" | "missing";
  created_at: string | null;
  is_slab: boolean;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
};

type ActiveInstanceRow = {
  id: string;
  card_print_id: string | null;
  slab_cert_id: string | null;
  gv_vi_id: string | null;
  created_at: string | null;
  legacy_vault_item_id: string | null;
  condition_label: string | null;
  photo_url: string | null;
  image_url: string | null;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  intent: string | null;
  notes: string | null;
  image_display_mode: string | null;
};

type BucketMetadataRow = {
  id: string;
  card_id: string | null;
  gv_id: string | null;
  condition_label: string | null;
  name: string | null;
  set_name: string | null;
  photo_url: string | null;
  created_at: string | null;
};

type PriceMetadataRow = {
  card_id: string | null;
  effective_price: number | null;
  image_url: string | null;
  price_ts: string | null;
};

type RawFallbackPriceRow = {
  card_print_id: string | null;
  primary_price: number | null;
  grookai_value: number | null;
};

type PriceFreshnessRow = {
  card_print_id: string | null;
  updated_at: string | null;
  last_snapshot_at: string | null;
};

type SlabCertMetadataRow = {
  id: string;
  card_print_id: string | null;
  grader: string | null;
  cert_number: string | null;
  grade: number | string | null;
};

type CardPrintMetadataRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  set_code: string | null;
  number: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  sets:
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

type CardAggregate = {
  cardPrintId: string;
  totalCount: number;
  rawCount: number;
  slabCount: number;
  holdCount: number;
  tradeCount: number;
  sellCount: number;
  showcaseCount: number;
  removableRawInstanceId: string | null;
  latestCreatedAt: string | null;
  singleGvviId: string | null;
  conditionLabel: string | null;
  photoUrl: string | null;
  imageUrl: string | null;
  anchorInstanceCounts: Map<string, number>;
  slabItems: CanonicalVaultCollectorSlabItem[];
  copyItems: CanonicalVaultCollectorCopyItem[];
  primarySlab: CanonicalVaultCollectorSlabItem | null;
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeIds(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeGradeValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : null;
  }

  return normalizeOptionalText(value);
}

function compareIsoDesc(left: string | null, right: string | null) {
  const leftTs = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightTs = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;
  return rightTs - leftTs;
}

function compareBuckets(left: BucketMetadataRow, right: BucketMetadataRow) {
  const createdComparison = compareIsoDesc(left.created_at ?? null, right.created_at ?? null);
  if (createdComparison !== 0) {
    return createdComparison;
  }

  return left.id.localeCompare(right.id);
}

function buildCopyItem(
  row: ActiveInstanceRow,
  slabCert: SlabCertMetadataRow | null,
): CanonicalVaultCollectorCopyItem {
  return {
    instance_id: row.id,
    gv_vi_id: normalizeOptionalText(row.gv_vi_id),
    intent: normalizeVaultIntent(row.intent) ?? "hold",
    condition_label: normalizeOptionalText(row.condition_label),
    is_graded: Boolean(row.slab_cert_id),
    grader: normalizeOptionalText(slabCert?.grader) ?? normalizeOptionalText(row.grade_company),
    grade:
      normalizeGradeValue(slabCert?.grade) ??
      normalizeOptionalText(row.grade_label) ??
      normalizeOptionalText(row.grade_value),
    cert_number: normalizeOptionalText(slabCert?.cert_number),
    notes: normalizeOptionalText(row.notes),
    created_at: row.created_at ?? null,
  };
}

async function fetchActiveInstances(userId: string) {
  const adminClient = createServerAdminClient();
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select(
      "id,card_print_id,slab_cert_id,gv_vi_id,created_at,legacy_vault_item_id,condition_label,photo_url,image_url,grade_company,grade_value,grade_label,intent,notes,image_display_mode",
    )
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(
      `[vault:read-model] active instance query failed: ${error.message}${error.code ? ` | code=${error.code}` : ""}`,
    );
  }

  return (data ?? []) as ActiveInstanceRow[];
}

async function fetchSlabCertMetadataById(slabCertIds: string[]) {
  const adminClient = createServerAdminClient();
  const rowsById = new Map<string, SlabCertMetadataRow>();

  for (const ids of chunkArray(slabCertIds, 200)) {
    const { data, error } = await adminClient
      .from("slab_certs")
      .select("id,card_print_id,grader,cert_number,grade")
      .in("id", ids);

    if (error) {
      throw new Error(
        `[vault:read-model] slab cert metadata query failed: ${error.message}${error.code ? ` | code=${error.code}` : ""}`,
      );
    }

    for (const row of (data ?? []) as SlabCertMetadataRow[]) {
      const id = normalizeOptionalText(row.id);
      if (id) {
        rowsById.set(id, row);
      }
    }
  }

  return rowsById;
}

function aggregateInstances(
  rows: ActiveInstanceRow[],
  slabCertMetadataById: Map<string, SlabCertMetadataRow>,
) {
  const aggregates = new Map<string, CardAggregate>();

  for (const row of rows) {
    const slabCertId = normalizeOptionalText(row.slab_cert_id);
    const slabCert = slabCertId ? slabCertMetadataById.get(slabCertId) ?? null : null;
    const cardPrintId = normalizeOptionalText(row.card_print_id) ?? normalizeOptionalText(slabCert?.card_print_id);
    if (!cardPrintId) {
      continue;
    }

    const current = aggregates.get(cardPrintId) ?? {
      cardPrintId,
      totalCount: 0,
      rawCount: 0,
      slabCount: 0,
      holdCount: 0,
      tradeCount: 0,
      sellCount: 0,
      showcaseCount: 0,
      removableRawInstanceId: null,
      latestCreatedAt: null,
      singleGvviId: null,
      conditionLabel: null,
      photoUrl: null,
      imageUrl: null,
      anchorInstanceCounts: new Map<string, number>(),
      slabItems: [],
      copyItems: [],
      primarySlab: null,
    } satisfies CardAggregate;

    current.totalCount += 1;

    if (!current.latestCreatedAt && row.created_at) {
      current.latestCreatedAt = row.created_at;
    }

    if (current.totalCount === 1) {
      current.singleGvviId = normalizeOptionalText(row.gv_vi_id);
    } else {
      current.singleGvviId = null;
    }

    if (!current.conditionLabel) {
      current.conditionLabel = normalizeOptionalText(row.condition_label);
    }

    if (prefersUploadedVaultInstanceImage(row.image_display_mode)) {
      if (!current.photoUrl) {
        current.photoUrl = normalizeOptionalText(row.photo_url);
      }

      if (!current.imageUrl) {
        current.imageUrl = normalizeOptionalText(row.image_url);
      }
    }

    const normalizedIntent = normalizeVaultIntent(row.intent) ?? "hold";
    switch (normalizedIntent) {
      case "trade":
        current.tradeCount += 1;
        break;
      case "sell":
        current.sellCount += 1;
        break;
      case "showcase":
        current.showcaseCount += 1;
        break;
      case "hold":
      default:
        current.holdCount += 1;
        break;
    }

    const legacyVaultItemId = normalizeOptionalText(row.legacy_vault_item_id);
    if (legacyVaultItemId) {
      current.anchorInstanceCounts.set(
        legacyVaultItemId,
        (current.anchorInstanceCounts.get(legacyVaultItemId) ?? 0) + 1,
      );
    }

    const copyItem = buildCopyItem(row, slabCert);
    current.copyItems.push(copyItem);

    if (slabCertId) {
      current.slabCount += 1;

      const slabItem: CanonicalVaultCollectorSlabItem = {
        instance_id: row.id,
        gv_vi_id: normalizeOptionalText(row.gv_vi_id),
        slab_cert_id: slabCertId,
        grader: copyItem.grader,
        grade: copyItem.grade,
        cert_number: copyItem.cert_number,
        created_at: row.created_at ?? null,
      };

      current.slabItems.push(slabItem);
      if (!current.primarySlab) {
        current.primarySlab = slabItem;
      }
    } else {
      current.rawCount += 1;
      current.removableRawInstanceId = current.removableRawInstanceId ?? normalizeOptionalText(row.id);
    }

    aggregates.set(cardPrintId, current);
  }

  for (const aggregate of aggregates.values()) {
    aggregate.copyItems.sort((left, right) => compareIsoDesc(left.created_at, right.created_at));
    aggregate.slabItems.sort((left, right) => compareIsoDesc(left.created_at, right.created_at));
  }

  return aggregates;
}

async function fetchBucketMetadataByCardId(userId: string, cardPrintIds: string[]) {
  const adminClient = createServerAdminClient();
  const bucketsByCardId = new Map<string, BucketMetadataRow[]>();

  for (const ids of chunkArray(cardPrintIds, 200)) {
    const { data, error } = await adminClient
      .from("vault_items")
      .select("id,card_id,gv_id,condition_label,name,set_name,photo_url,created_at")
      .eq("user_id", userId)
      .is("archived_at", null)
      .in("card_id", ids)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      throw new Error(
        `[vault:read-model] bucket metadata query failed: ${error.message}${error.code ? ` | code=${error.code}` : ""}`,
      );
    }

    for (const row of (data ?? []) as BucketMetadataRow[]) {
      const cardId = normalizeOptionalText(row.card_id);
      if (!cardId) {
        continue;
      }

      const current = bucketsByCardId.get(cardId) ?? [];
      current.push(row);
      bucketsByCardId.set(cardId, current);
    }
  }

  for (const [cardId, rows] of bucketsByCardId.entries()) {
    bucketsByCardId.set(cardId, [...rows].sort(compareBuckets));
  }

  return bucketsByCardId;
}

async function fetchCardMetadataById(cardPrintIds: string[]) {
  const adminClient = createServerAdminClient();
  const rowsById = new Map<string, CardPrintMetadataRow>();

  for (const ids of chunkArray(cardPrintIds, 200)) {
    const { data, error } = await adminClient
      .from("card_prints")
      .select("id,gv_id,name,variant_key,printed_identity_modifier,set_code,number,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,identity_model)")
      .in("id", ids);

    if (error) {
      throw new Error(
        `[vault:read-model] card metadata query failed: ${error.message}${error.code ? ` | code=${error.code}` : ""}`,
      );
    }

    for (const row of (data ?? []) as CardPrintMetadataRow[]) {
      const id = row.id?.trim() ?? "";
      if (id) {
        rowsById.set(id, row);
      }
    }
  }

  return rowsById;
}

async function fetchPriceMetadataByCardId(userId: string, cardPrintIds: string[]) {
  const adminClient = createServerAdminClient();
  const rowsByCardId = new Map<string, PriceMetadataRow>();

  for (const ids of chunkArray(cardPrintIds, 200)) {
    const { data, error } = await adminClient
      .from("v_vault_items_web")
      .select("card_id,effective_price,image_url,price_ts")
      .eq("user_id", userId)
      .in("card_id", ids);

    if (error) {
      console.error("[vault:read-model] price metadata query failed", {
        userId,
        cardPrintIds: ids,
        error,
      });
      continue;
    }

    for (const row of (data ?? []) as PriceMetadataRow[]) {
      const cardId = row.card_id?.trim() ?? "";
      if (cardId) {
        rowsByCardId.set(cardId, row);
      }
    }
  }

  return rowsByCardId;
}

async function fetchRawFallbackPriceMetadataByCardId(cardPrintIds: string[]) {
  const adminClient = createServerAdminClient();
  const rowsByCardId = new Map<string, RawFallbackPriceRow>();

  for (const ids of chunkArray(cardPrintIds, 200)) {
    const { data, error } = await adminClient
      .from("v_card_pricing_ui_v1")
      .select("card_print_id,primary_price,grookai_value")
      .in("card_print_id", ids);

    if (error) {
      console.error("[vault:read-model] raw fallback price metadata query failed", {
        cardPrintIds: ids,
        error,
      });
      continue;
    }

    for (const row of (data ?? []) as RawFallbackPriceRow[]) {
      const cardId = row.card_print_id?.trim() ?? "";
      if (cardId) {
        rowsByCardId.set(cardId, row);
      }
    }
  }

  return rowsByCardId;
}

async function fetchPriceFreshnessMetadataByCardId(cardPrintIds: string[]) {
  const adminClient = createServerAdminClient();
  const rowsByCardId = new Map<string, PriceFreshnessRow>();

  for (const ids of chunkArray(cardPrintIds, 200)) {
    const { data, error } = await adminClient
      .from("card_print_active_prices")
      .select("card_print_id,updated_at,last_snapshot_at")
      .in("card_print_id", ids);

    if (error) {
      console.error("[vault:read-model] price freshness metadata query failed", {
        cardPrintIds: ids,
        error,
      });
      continue;
    }

    for (const row of (data ?? []) as PriceFreshnessRow[]) {
      const cardId = row.card_print_id?.trim() ?? "";
      if (cardId) {
        rowsByCardId.set(cardId, row);
      }
    }
  }

  return rowsByCardId;
}

function selectVaultEffectivePrice({
  aggregate,
  compatibilityPrice,
  rawFallbackPrice,
}: {
  aggregate: CardAggregate;
  compatibilityPrice: PriceMetadataRow | null;
  rawFallbackPrice: RawFallbackPriceRow | null;
}) {
  if (typeof compatibilityPrice?.effective_price === "number") {
    return compatibilityPrice.effective_price;
  }

  const isRawOnlyGroup = aggregate.rawCount > 0 && aggregate.slabCount === 0;
  if (!isRawOnlyGroup) {
    return null;
  }

  if (typeof rawFallbackPrice?.primary_price === "number") {
    return rawFallbackPrice.primary_price;
  }

  if (typeof rawFallbackPrice?.grookai_value === "number") {
    return rawFallbackPrice.grookai_value;
  }

  return null;
}

function selectVaultPricingUpdatedAt({
  aggregate,
  compatibilityPrice,
  rawFallbackPrice,
  priceFreshness,
}: {
  aggregate: CardAggregate;
  compatibilityPrice: PriceMetadataRow | null;
  rawFallbackPrice: RawFallbackPriceRow | null;
  priceFreshness: PriceFreshnessRow | null;
}) {
  if (typeof compatibilityPrice?.effective_price === "number") {
    return compatibilityPrice.price_ts ?? null;
  }

  const isRawOnlyGroup = aggregate.rawCount > 0 && aggregate.slabCount === 0;
  if (!isRawOnlyGroup) {
    return null;
  }

  if (
    typeof rawFallbackPrice?.primary_price === "number" ||
    typeof rawFallbackPrice?.grookai_value === "number"
  ) {
    return priceFreshness?.last_snapshot_at ?? priceFreshness?.updated_at ?? null;
  }

  return null;
}

function selectRepresentativeBucket(
  buckets: BucketMetadataRow[],
  anchorInstanceCounts: Map<string, number>,
) {
  if (buckets.length === 0) {
    return null;
  }

  const linkedBuckets = buckets.filter((bucket) => (anchorInstanceCounts.get(bucket.id) ?? 0) > 0);
  if (linkedBuckets.length > 0) {
    const sortedLinkedBuckets = [...linkedBuckets].sort((left, right) => {
      const leftScore = anchorInstanceCounts.get(left.id) ?? 0;
      const rightScore = anchorInstanceCounts.get(right.id) ?? 0;
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return compareBuckets(left, right);
    });

    return sortedLinkedBuckets[0] ?? null;
  }

  if (buckets.length === 1) {
    return buckets[0] ?? null;
  }

  return null;
}

export async function getCanonicalVaultCollectorRows(userId: string): Promise<CanonicalVaultCollectorRow[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  const activeInstances = await fetchActiveInstances(normalizedUserId);
  const slabCertIds = normalizeIds(
    activeInstances
      .map((row) => normalizeOptionalText(row.slab_cert_id))
      .filter((value): value is string => Boolean(value)),
  );
  const slabCertMetadataById = await fetchSlabCertMetadataById(slabCertIds);
  const aggregatesByCardId = aggregateInstances(activeInstances, slabCertMetadataById);
  const cardPrintIds = normalizeIds(Array.from(aggregatesByCardId.keys()));

  if (cardPrintIds.length === 0) {
    return [];
  }

  const [
    bucketMetadataByCardId,
    cardMetadataById,
    priceMetadataByCardId,
    rawFallbackPriceMetadataByCardId,
    priceFreshnessMetadataByCardId,
  ] = await Promise.all([
    fetchBucketMetadataByCardId(normalizedUserId, cardPrintIds),
    fetchCardMetadataById(cardPrintIds),
    fetchPriceMetadataByCardId(normalizedUserId, cardPrintIds),
    fetchRawFallbackPriceMetadataByCardId(cardPrintIds),
    fetchPriceFreshnessMetadataByCardId(cardPrintIds),
  ]);
  const preferredImageUrlByCardId = new Map(
    await Promise.all(
      cardPrintIds.map(async (cardPrintId) => {
        const aggregate = aggregatesByCardId.get(cardPrintId);
        const resolvedUrl = aggregate
          ? await resolveVaultInstanceMediaUrl(aggregate.imageUrl ?? aggregate.photoUrl)
          : null;
        return [cardPrintId, resolvedUrl] as const;
      }),
    ),
  );

  const rows: CanonicalVaultCollectorRow[] = [];

  for (const [cardPrintId, aggregate] of aggregatesByCardId.entries()) {
    const buckets = bucketMetadataByCardId.get(cardPrintId) ?? [];
    const representativeBucket = selectRepresentativeBucket(buckets, aggregate.anchorInstanceCounts);

    if (!representativeBucket?.id) {
      throw new Error(
        `[vault:read-model] no safe representative_vault_item_id for card_print_id=${cardPrintId}; Phase 2 bridge is required before this row can be rendered safely.`,
      );
    }

    const card = cardMetadataById.get(cardPrintId) ?? null;
    const price = priceMetadataByCardId.get(cardPrintId) ?? null;
    const rawFallbackPrice = rawFallbackPriceMetadataByCardId.get(cardPrintId) ?? null;
    const priceFreshness = priceFreshnessMetadataByCardId.get(cardPrintId) ?? null;
    const canonicalImageFields = card ? await resolveCardImageFieldsV1(card) : null;
    const canonicalImageUrl = resolveDisplayImageUrl({
      image_url: canonicalImageFields?.image_url ?? card?.image_url ?? price?.image_url,
      image_alt_url: card?.image_alt_url,
    });
    const canonicalDisplayImageUrl = resolveDisplayImageUrl({
      display_image_url: canonicalImageFields?.display_image_url,
      image_url: canonicalImageFields?.image_url ?? card?.image_url ?? price?.image_url,
      image_alt_url: card?.image_alt_url,
      representative_image_url: canonicalImageFields?.representative_image_url ?? card?.representative_image_url,
    });
    const preferredImageUrl = preferredImageUrlByCardId.get(cardPrintId) ?? null;
    const setRecord = Array.isArray(card?.sets) ? card?.sets[0] : card?.sets;
    const primarySlab = aggregate.primarySlab;
    const counts = countVaultIntents(aggregate.copyItems);
    const inPlayCount = getInPlayCount(counts);
    const singleDiscoverableIntent = getSingleDiscoverableIntent(counts);
    const primaryIntent: VaultIntent | null = inPlayCount === 0 ? "hold" : singleDiscoverableIntent;

    rows.push({
      id: `card:${cardPrintId}`,
      vault_item_id: representativeBucket.id,
      representative_vault_item_id: representativeBucket.id,
      gv_vi_id: aggregate.totalCount === 1 ? aggregate.singleGvviId : null,
      card_id: cardPrintId,
      gv_id: card?.gv_id?.trim() || representativeBucket.gv_id?.trim() || "",
      name: card?.name?.trim() || representativeBucket.name?.trim() || "Unknown card",
      variant_key: card?.variant_key?.trim() || null,
      printed_identity_modifier: card?.printed_identity_modifier?.trim() || null,
      set_identity_model: setRecord?.identity_model?.trim() || null,
      set_code: card?.set_code?.trim() || "",
      set_name:
        setRecord?.name?.trim() || representativeBucket.set_name?.trim() || card?.set_code?.trim() || "Unknown set",
      number: card?.number?.trim() || "—",
      condition_label: aggregate.conditionLabel ?? representativeBucket.condition_label?.trim() ?? "Unknown",
      intent: primaryIntent ?? "hold",
      primary_intent: primaryIntent,
      hold_count: counts.holdCount,
      trade_count: counts.tradeCount,
      sell_count: counts.sellCount,
      showcase_count: counts.showcaseCount,
      in_play_count: inPlayCount,
      owned_count: aggregate.totalCount,
      total_count: aggregate.totalCount,
      raw_count: aggregate.rawCount,
      slab_count: aggregate.slabCount,
      removable_raw_instance_id: aggregate.removableRawInstanceId,
      slab_items: aggregate.slabItems,
      copy_items: aggregate.copyItems,
      effective_price: selectVaultEffectivePrice({
        aggregate,
        compatibilityPrice: price,
        rawFallbackPrice,
      }),
      pricing_updated_at: selectVaultPricingUpdatedAt({
        aggregate,
        compatibilityPrice: price,
        rawFallbackPrice,
        priceFreshness,
      }),
      image_url: preferredImageUrl ?? canonicalDisplayImageUrl,
      canonical_image_url: canonicalImageUrl,
      canonical_representative_image_url: canonicalImageFields?.representative_image_url ?? null,
      canonical_image_status: canonicalImageFields?.image_status ?? null,
      canonical_image_note: canonicalImageFields?.image_note ?? null,
      canonical_image_source: canonicalImageFields?.image_source ?? null,
      canonical_display_image_url: canonicalDisplayImageUrl,
      canonical_display_image_kind: canonicalImageFields?.display_image_kind ?? "missing",
      created_at: aggregate.latestCreatedAt ?? representativeBucket.created_at ?? null,
      is_slab: aggregate.slabCount > 0,
      grader: primarySlab?.grader ?? null,
      grade: primarySlab?.grade ?? null,
      cert_number: aggregate.slabCount === 1 ? primarySlab?.cert_number ?? null : null,
    });
  }

  return rows.sort((left, right) => {
    const createdComparison = compareIsoDesc(left.created_at, right.created_at);
    return createdComparison !== 0 ? createdComparison : left.name.localeCompare(right.name);
  });
}
