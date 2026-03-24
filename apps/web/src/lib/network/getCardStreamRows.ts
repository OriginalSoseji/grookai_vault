import "server-only";

import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  normalizeDiscoverableVaultIntent,
  normalizeVaultIntent,
  type DiscoverableVaultIntent,
  type VaultIntent,
} from "@/lib/network/intent";

type CardStreamSourceRow = {
  vault_item_id: string | null;
  owner_user_id: string | null;
  owner_slug: string | null;
  owner_display_name: string | null;
  card_print_id: string | null;
  intent: string | null;
  quantity: number | null;
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

export type CardStreamRow = {
  vaultItemId: string;
  ownerUserId: string;
  ownerSlug: string;
  ownerDisplayName: string;
  cardPrintId: string;
  intent: DiscoverableVaultIntent;
  quantity: number;
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
  imageUrl: string | null;
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

function normalizeRow(row: CardStreamSourceRow): CardStreamRow | null {
  const vaultItemId = normalizeOptionalText(row.vault_item_id);
  const ownerUserId = normalizeOptionalText(row.owner_user_id);
  const ownerSlug = normalizeOptionalText(row.owner_slug);
  const ownerDisplayName = normalizeOptionalText(row.owner_display_name);
  const cardPrintId = normalizeOptionalText(row.card_print_id);
  const intent = normalizeDiscoverableVaultIntent(row.intent);
  const gvId = normalizeOptionalText(row.gv_id);

  if (!vaultItemId || !ownerUserId || !ownerSlug || !ownerDisplayName || !cardPrintId || !intent || !gvId) {
    return null;
  }

  return {
    vaultItemId,
    ownerUserId,
    ownerSlug,
    ownerDisplayName,
    cardPrintId,
    intent,
    quantity: Math.max(1, row.quantity ?? 1),
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
    imageUrl: getBestPublicCardImageUrl(row.image_url) ?? normalizeOptionalText(row.image_url),
  };
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
      "vault_item_id,owner_user_id,owner_slug,owner_display_name,card_print_id,intent,quantity,condition_label,is_graded,grade_company,grade_value,grade_label,created_at,gv_id,name,set_code,set_name,number,image_url",
    )
    .order("created_at", { ascending: false })
    .order("vault_item_id", { ascending: false })
    .limit(normalizedLimit);

  if (normalizedIntent) {
    query = query.eq("intent", normalizedIntent);
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

  return ((data ?? []) as CardStreamSourceRow[])
    .map(normalizeRow)
    .filter((row): row is CardStreamRow => row !== null)
    .filter((row) => normalizeVaultIntent(row.intent) !== "hold");
}
