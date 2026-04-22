import "server-only";

import {
  resolveCardImageFieldsV1,
  type CardDisplayImageKind,
} from "@/lib/canon/resolveCardImageFieldsV1";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  normalizeDiscoverableVaultIntent,
  type DiscoverableVaultIntent,
} from "@/lib/network/intent";

type CardStreamSourceRow = {
  vault_item_id: string | null;
  owner_user_id: string | null;
  owner_slug: string | null;
  owner_display_name: string | null;
  card_print_id: string | null;
  intent: string | null;
  quantity: number | null;
  in_play_count: number | null;
  trade_count: number | null;
  sell_count: number | null;
  showcase_count: number | null;
  raw_count: number | null;
  slab_count: number | null;
  condition_label: string | null;
  is_graded: boolean | null;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  created_at: string | null;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  image_url: string | null;
};

type CardStreamIdentityRow = {
  id: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  display_image_url?: string | null;
  display_image_kind?: CardDisplayImageKind | null;
  sets:
    | {
        identity_model: string | null;
      }
    | {
        identity_model: string | null;
      }[]
    | null;
};

type CardStreamCopySourceRow = {
  id: string;
  gv_vi_id: string | null;
  user_id: string | null;
  card_print_id: string | null;
  slab_cert_id: string | null;
  legacy_vault_item_id: string | null;
  intent: string | null;
  condition_label: string | null;
  is_graded: boolean | null;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  created_at: string | null;
};

type SlabCertMetadataRow = {
  id: string;
  card_print_id: string | null;
  grader: string | null;
  cert_number: string | null;
  grade: number | string | null;
};

export type CardStreamCopy = {
  instanceId: string;
  gvviId: string | null;
  vaultItemId: string;
  intent: DiscoverableVaultIntent;
  conditionLabel: string | null;
  isGraded: boolean;
  gradeCompany: string | null;
  gradeValue: string | null;
  gradeLabel: string | null;
  certNumber: string | null;
  createdAt: string | null;
};

export type CardStreamRow = {
  vaultItemId: string;
  ownerUserId: string;
  ownerSlug: string;
  ownerDisplayName: string;
  cardPrintId: string;
  intent: DiscoverableVaultIntent | null;
  quantity: number;
  inPlayCount: number;
  tradeCount: number;
  sellCount: number;
  showcaseCount: number;
  rawCount: number;
  slabCount: number;
  conditionLabel: string | null;
  isGraded: boolean;
  gradeCompany: string | null;
  gradeValue: string | null;
  gradeLabel: string | null;
  createdAt: string | null;
  gvId: string;
  name: string;
  setCode: string;
  setName: string;
  number: string;
  variantKey: string | null;
  printedIdentityModifier: string | null;
  setIdentityModel: string | null;
  imageUrl: string | null;
  inPlayCopies: CardStreamCopy[];
};

export type GetCardStreamRowsOptions = {
  intent?: DiscoverableVaultIntent | null;
  cardPrintId?: string | null;
  excludeUserId?: string | null;
  limit?: number;
};

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

function compareCreatedAtDescending(left: string | null, right: string | null) {
  const leftTime = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightTime = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;
  return rightTime - leftTime;
}

function buildGroupKey(ownerUserId: string, cardPrintId: string) {
  return `${ownerUserId}:${cardPrintId}`;
}

function normalizeRow(
  row: CardStreamSourceRow,
  identityByCardPrintId: Map<string, CardStreamIdentityRow>,
): CardStreamRow | null {
  const vaultItemId = normalizeOptionalText(row.vault_item_id);
  const ownerUserId = normalizeOptionalText(row.owner_user_id);
  const ownerSlug = normalizeOptionalText(row.owner_slug);
  const ownerDisplayName = normalizeOptionalText(row.owner_display_name);
  const cardPrintId = normalizeOptionalText(row.card_print_id);
  const intent = normalizeDiscoverableVaultIntent(row.intent);
  const gvId = normalizeOptionalText(row.gv_id);

  if (!vaultItemId || !ownerUserId || !ownerSlug || !ownerDisplayName || !cardPrintId || !gvId) {
    return null;
  }

  const inPlayCount = Math.max(1, row.in_play_count ?? row.quantity ?? 1);
  const identityRow = identityByCardPrintId.get(cardPrintId);
  const setRecord = Array.isArray(identityRow?.sets) ? identityRow.sets[0] : identityRow?.sets;
  const displayImageUrl =
    getBestPublicCardImageUrl(row.image_url) ??
    normalizeOptionalText(identityRow?.display_image_url) ??
    getBestPublicCardImageUrl(identityRow?.image_url, identityRow?.image_alt_url) ??
    getBestPublicCardImageUrl(identityRow?.representative_image_url) ??
    null;

  return {
    vaultItemId,
    ownerUserId,
    ownerSlug,
    ownerDisplayName,
    cardPrintId,
    intent,
    quantity: inPlayCount,
    inPlayCount,
    tradeCount: Math.max(0, row.trade_count ?? 0),
    sellCount: Math.max(0, row.sell_count ?? 0),
    showcaseCount: Math.max(0, row.showcase_count ?? 0),
    rawCount: Math.max(0, row.raw_count ?? 0),
    slabCount: Math.max(0, row.slab_count ?? 0),
    conditionLabel: normalizeOptionalText(row.condition_label),
    isGraded: row.is_graded === true,
    gradeCompany: normalizeOptionalText(row.grade_company),
    gradeValue: normalizeOptionalText(row.grade_value),
    gradeLabel: normalizeOptionalText(row.grade_label),
    createdAt: row.created_at ?? null,
    gvId,
    name: normalizeOptionalText(row.name) ?? "Unknown card",
    setCode: normalizeOptionalText(row.set_code) ?? "Unknown set",
    setName: normalizeOptionalText(row.set_name) ?? normalizeOptionalText(row.set_code) ?? "Unknown set",
    number: normalizeOptionalText(row.number) ?? "—",
    variantKey: normalizeOptionalText(identityRow?.variant_key),
    printedIdentityModifier: normalizeOptionalText(identityRow?.printed_identity_modifier),
    setIdentityModel: normalizeOptionalText(setRecord?.identity_model),
    imageUrl: displayImageUrl,
    inPlayCopies: [],
  };
}

async function fetchCardStreamIdentityMap(cardPrintIds: string[]) {
  const client = createServerComponentClient();
  const normalizedIds = Array.from(new Set(cardPrintIds.map((value) => normalizeOptionalText(value)).filter((value): value is string => Boolean(value))));
  const identityByCardPrintId = new Map<string, CardStreamIdentityRow>();

  for (let index = 0; index < normalizedIds.length; index += 500) {
    const batch = normalizedIds.slice(index, index + 500);
    const { data, error } = await client
      .from("card_prints")
      .select(
        "id,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(identity_model)",
      )
      .in("id", batch);

    if (error) {
      throw new Error(`[network:stream] card identity lookup failed: ${error.message}`);
    }

    const rowsWithDisplayImage = await Promise.all(
      ((data ?? []) as CardStreamIdentityRow[]).map(async (row) => {
        const imageFields = await resolveCardImageFieldsV1(row);
        return {
          ...row,
          image_url: imageFields.image_url,
          representative_image_url: imageFields.representative_image_url,
          image_status: imageFields.image_status,
          image_note: imageFields.image_note,
          image_source: imageFields.image_source,
          image_path: imageFields.image_path,
          display_image_url: imageFields.display_image_url,
          display_image_kind: imageFields.display_image_kind,
        } satisfies CardStreamIdentityRow;
      }),
    );

    for (const row of rowsWithDisplayImage) {
      const id = normalizeOptionalText(row.id);
      if (id) {
        identityByCardPrintId.set(id, row);
      }
    }
  }

  return identityByCardPrintId;
}

async function fetchInPlayCopies(rows: CardStreamRow[]) {
  const admin = createServerAdminClient();
  const requestedGroupKeys = new Set(rows.map((row) => buildGroupKey(row.ownerUserId, row.cardPrintId)));
  const ownerUserIds = Array.from(new Set(rows.map((row) => row.ownerUserId)));

  if (ownerUserIds.length === 0 || requestedGroupKeys.size === 0) {
    return new Map<string, CardStreamCopy[]>();
  }

  const { data: instances, error: instancesError } = await admin
    .from("vault_item_instances")
    .select(
      "id,gv_vi_id,user_id,card_print_id,slab_cert_id,legacy_vault_item_id,intent,condition_label,is_graded,grade_company,grade_value,grade_label,created_at",
    )
    .in("user_id", ownerUserIds)
    .is("archived_at", null)
    .in("intent", ["trade", "sell", "showcase"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (instancesError) {
    throw new Error(`[network:stream] copy drilldown query failed: ${instancesError.message}`);
  }

  const slabCertIds = Array.from(
    new Set(
      ((instances ?? []) as CardStreamCopySourceRow[])
        .map((row) => normalizeOptionalText(row.slab_cert_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const slabCertById = new Map<string, SlabCertMetadataRow>();

  if (slabCertIds.length > 0) {
    const { data: slabCerts, error: slabCertsError } = await admin
      .from("slab_certs")
      .select("id,card_print_id,grader,cert_number,grade")
      .in("id", slabCertIds);

    if (slabCertsError) {
      throw new Error(`[network:stream] slab cert metadata query failed: ${slabCertsError.message}`);
    }

    for (const row of (slabCerts ?? []) as SlabCertMetadataRow[]) {
      const slabCertId = normalizeOptionalText(row.id);
      if (slabCertId) {
        slabCertById.set(slabCertId, row);
      }
    }
  }

  const copiesByGroupKey = new Map<string, CardStreamCopy[]>();

  for (const row of (instances ?? []) as CardStreamCopySourceRow[]) {
    const ownerUserId = normalizeOptionalText(row.user_id);
    const vaultItemId = normalizeOptionalText(row.legacy_vault_item_id);
    const slabCert = normalizeOptionalText(row.slab_cert_id)
      ? slabCertById.get(normalizeOptionalText(row.slab_cert_id)!)
      : null;
    const cardPrintId =
      normalizeOptionalText(row.card_print_id) ?? normalizeOptionalText(slabCert?.card_print_id);
    const intent = normalizeDiscoverableVaultIntent(row.intent);

    if (!ownerUserId || !vaultItemId || !cardPrintId || !intent) {
      continue;
    }

    const groupKey = buildGroupKey(ownerUserId, cardPrintId);
    if (!requestedGroupKeys.has(groupKey)) {
      continue;
    }

    const copies = copiesByGroupKey.get(groupKey) ?? [];
    copies.push({
      instanceId: row.id,
      gvviId: normalizeOptionalText(row.gv_vi_id),
      vaultItemId,
      intent,
      conditionLabel: normalizeOptionalText(row.condition_label),
      isGraded: row.is_graded === true,
      gradeCompany: normalizeOptionalText(slabCert?.grader) ?? normalizeOptionalText(row.grade_company),
      gradeValue: normalizeGradeValue(slabCert?.grade) ?? normalizeOptionalText(row.grade_value),
      gradeLabel: normalizeOptionalText(row.grade_label),
      certNumber: normalizeOptionalText(slabCert?.cert_number),
      createdAt: row.created_at ?? null,
    });
    copiesByGroupKey.set(groupKey, copies);
  }

  for (const [groupKey, copies] of copiesByGroupKey.entries()) {
    copiesByGroupKey.set(
      groupKey,
      [...copies].sort((left, right) => compareCreatedAtDescending(left.createdAt, right.createdAt)),
    );
  }

  return copiesByGroupKey;
}

export async function getCardStreamRows({
  intent = null,
  cardPrintId = null,
  excludeUserId = null,
  limit = 60,
}: GetCardStreamRowsOptions = {}): Promise<CardStreamRow[]> {
  const client = createServerComponentClient();
  const normalizedIntent = normalizeDiscoverableVaultIntent(intent);
  const normalizedCardPrintId = normalizeOptionalText(cardPrintId);
  const normalizedExcludeUserId = normalizeOptionalText(excludeUserId);
  const normalizedLimit = Math.max(1, Math.min(limit, 120));

  let query = client
    .from("v_card_stream_v1")
    .select(
      "vault_item_id,owner_user_id,owner_slug,owner_display_name,card_print_id,intent,quantity,in_play_count,trade_count,sell_count,showcase_count,raw_count,slab_count,condition_label,is_graded,grade_company,grade_value,grade_label,created_at,gv_id,name,set_code,set_name,number,image_url",
    )
    .order("created_at", { ascending: false })
    .order("vault_item_id", { ascending: false })
    .limit(normalizedLimit);

  if (normalizedIntent) {
    query = query.gt(`${normalizedIntent}_count`, 0);
  }

  if (normalizedCardPrintId) {
    query = query.eq("card_print_id", normalizedCardPrintId);
  }

  if (normalizedExcludeUserId) {
    query = query.neq("owner_user_id", normalizedExcludeUserId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`[network:stream] card stream query failed: ${error.message}`);
  }

  const sourceRows = (data ?? []) as CardStreamSourceRow[];
  const identityByCardPrintId = await fetchCardStreamIdentityMap(
    sourceRows
      .map((row) => row.card_print_id)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  );
  const rows = sourceRows
    .map((row) => normalizeRow(row, identityByCardPrintId))
    .filter((row): row is CardStreamRow => row !== null);
  const copiesByGroupKey = await fetchInPlayCopies(rows);

  return rows.map((row) => ({
    ...row,
    inPlayCopies: copiesByGroupKey.get(buildGroupKey(row.ownerUserId, row.cardPrintId)) ?? [],
  }));
}
