import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export type CanonicalVaultCollectorRow = {
  id: string;
  vault_item_id: string;
  gv_vi_id: string | null;
  card_id: string;
  gv_id: string;
  name: string;
  set_code: string;
  set_name: string;
  number: string;
  condition_label: string;
  owned_count: number;
  effective_price: number | null;
  image_url: string | null;
  created_at: string | null;
  is_slab: boolean;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
};

type ActiveInstanceRow = {
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
  set_code: string | null;
  number: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  sets:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

type InstanceAggregate = {
  key: string;
  isSlab: boolean;
  cardPrintId: string;
  slabCertId: string | null;
  ownedCount: number;
  latestCreatedAt: string | null;
  singleGvviId: string | null;
  representativeLegacyVaultItemId: string | null;
  conditionLabel: string | null;
  photoUrl: string | null;
  imageUrl: string | null;
  grader: string | null;
  grade: string | null;
  certNumber: string | null;
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

async function fetchActiveInstances(userId: string) {
  const adminClient = createServerAdminClient();
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select(
      "card_print_id,slab_cert_id,gv_vi_id,created_at,legacy_vault_item_id,condition_label,photo_url,image_url,grade_company,grade_value,grade_label",
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
  const aggregates = new Map<string, InstanceAggregate>();

  for (const row of rows) {
    const slabCertId = normalizeOptionalText(row.slab_cert_id);
    const slabCert = slabCertId ? slabCertMetadataById.get(slabCertId) ?? null : null;
    const cardPrintId = normalizeOptionalText(row.card_print_id) ?? normalizeOptionalText(slabCert?.card_print_id);
    if (!cardPrintId) {
      continue;
    }

    const key = slabCertId ? `slab:${slabCertId}` : `raw:${cardPrintId}`;
    const current = aggregates.get(key) ?? {
      key,
      isSlab: Boolean(slabCertId),
      cardPrintId,
      slabCertId,
      ownedCount: 0,
      latestCreatedAt: null,
      singleGvviId: null,
      representativeLegacyVaultItemId: null,
      conditionLabel: null,
      photoUrl: null,
      imageUrl: null,
      grader: normalizeOptionalText(slabCert?.grader) ?? normalizeOptionalText(row.grade_company),
      grade:
        normalizeGradeValue(slabCert?.grade) ??
        normalizeOptionalText(row.grade_label) ??
        normalizeOptionalText(row.grade_value),
      certNumber: normalizeOptionalText(slabCert?.cert_number),
    };

    current.ownedCount += 1;

    if (!current.latestCreatedAt && row.created_at) {
      current.latestCreatedAt = row.created_at;
    }

    if (current.ownedCount === 1) {
      current.singleGvviId = normalizeOptionalText(row.gv_vi_id);
    } else {
      current.singleGvviId = null;
    }

    if (!current.representativeLegacyVaultItemId) {
      current.representativeLegacyVaultItemId = normalizeOptionalText(row.legacy_vault_item_id);
    }

    if (!current.conditionLabel) {
      current.conditionLabel = normalizeOptionalText(row.condition_label);
    }

    if (!current.photoUrl) {
      current.photoUrl = normalizeOptionalText(row.photo_url);
    }

    if (!current.imageUrl) {
      current.imageUrl = normalizeOptionalText(row.image_url);
    }

    aggregates.set(key, current);
  }

  return aggregates;
}

async function fetchBucketMetadataByCardId(userId: string, cardPrintIds: string[]) {
  const adminClient = createServerAdminClient();
  const rowsByCardId = new Map<string, BucketMetadataRow>();

  for (const ids of chunkArray(cardPrintIds, 200)) {
    const { data, error } = await adminClient
      .from("vault_items")
      .select("id,card_id,gv_id,condition_label,name,set_name,photo_url,created_at")
      .eq("user_id", userId)
      .is("archived_at", null)
      .in("card_id", ids);

    if (error) {
      throw new Error(
        `[vault:read-model] bucket metadata query failed: ${error.message}${error.code ? ` | code=${error.code}` : ""}`,
      );
    }

    for (const row of (data ?? []) as BucketMetadataRow[]) {
      const cardId = row.card_id?.trim() ?? "";
      if (cardId) {
        rowsByCardId.set(cardId, row);
      }
    }
  }

  return rowsByCardId;
}

async function fetchCardMetadataById(cardPrintIds: string[]) {
  const adminClient = createServerAdminClient();
  const rowsById = new Map<string, CardPrintMetadataRow>();

  for (const ids of chunkArray(cardPrintIds, 200)) {
    const { data, error } = await adminClient
      .from("card_prints")
      .select("id,gv_id,name,set_code,number,image_url,image_alt_url,sets(name)")
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
      .select("card_id,effective_price,image_url")
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
  const aggregates = aggregateInstances(activeInstances, slabCertMetadataById);
  const cardPrintIds = normalizeIds(Array.from(aggregates.values()).map((aggregate) => aggregate.cardPrintId));

  if (cardPrintIds.length === 0) {
    return [];
  }

  const [bucketMetadataByCardId, cardMetadataById, priceMetadataByCardId] = await Promise.all([
    fetchBucketMetadataByCardId(normalizedUserId, cardPrintIds),
    fetchCardMetadataById(cardPrintIds),
    fetchPriceMetadataByCardId(normalizedUserId, cardPrintIds),
  ]);

  const rows: CanonicalVaultCollectorRow[] = [];

  for (const aggregate of aggregates.values()) {
    const cardPrintId = aggregate.cardPrintId;
    const bucket = bucketMetadataByCardId.get(cardPrintId) ?? null;
    const card = cardMetadataById.get(cardPrintId) ?? null;
    const price = priceMetadataByCardId.get(cardPrintId) ?? null;
    const setRecord = Array.isArray(card?.sets) ? card?.sets[0] : card?.sets;

    const compatibilityVaultItemId = bucket?.id?.trim() || aggregate.representativeLegacyVaultItemId || "";
    if (!compatibilityVaultItemId) {
      console.error("[vault:read-model] missing compatibility vault_item_id", {
        userId: normalizedUserId,
        cardPrintId,
      });
      continue;
    }

    rows.push({
      id: aggregate.key,
      vault_item_id: compatibilityVaultItemId,
      gv_vi_id: aggregate.ownedCount === 1 ? aggregate.singleGvviId : null,
      card_id: cardPrintId,
      gv_id: card?.gv_id?.trim() || bucket?.gv_id?.trim() || "",
      name: card?.name?.trim() || bucket?.name?.trim() || "Unknown card",
      set_code: card?.set_code?.trim() || "",
      set_name: setRecord?.name?.trim() || bucket?.set_name?.trim() || card?.set_code?.trim() || "Unknown set",
      number: card?.number?.trim() || "—",
      condition_label: aggregate.conditionLabel ?? bucket?.condition_label?.trim() ?? "Unknown",
      owned_count: aggregate.ownedCount,
      effective_price: typeof price?.effective_price === "number" ? price.effective_price : null,
      image_url:
        aggregate.imageUrl ??
        aggregate.photoUrl ??
        card?.image_url?.trim() ??
        card?.image_alt_url?.trim() ??
        price?.image_url?.trim() ??
        bucket?.photo_url?.trim() ??
        null,
      created_at: aggregate.latestCreatedAt ?? bucket?.created_at ?? null,
      is_slab: aggregate.isSlab,
      grader: aggregate.grader,
      grade: aggregate.grade,
      cert_number: aggregate.certNumber,
    });
  }

  return rows.sort((left, right) => {
    const leftTs = left.created_at ? Date.parse(left.created_at) : Number.NEGATIVE_INFINITY;
    const rightTs = right.created_at ? Date.parse(right.created_at) : Number.NEGATIVE_INFINITY;
    return rightTs - leftTs || left.name.localeCompare(right.name);
  });
}
