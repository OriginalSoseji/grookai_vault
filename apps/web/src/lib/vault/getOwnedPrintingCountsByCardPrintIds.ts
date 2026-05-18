import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

type OwnedPrintingRow = {
  card_print_id: string | null;
  card_printing_id: string | null;
};

function normalizeIds(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

export type OwnedPrintingCountsByCardPrintId = Map<string, Map<string, number>>;

export async function getOwnedPrintingCountsByCardPrintIds(
  userId: string | null | undefined,
  cardPrintIds: string[],
): Promise<OwnedPrintingCountsByCardPrintId> {
  const normalizedUserId = userId?.trim() ?? "";
  const normalizedCardPrintIds = normalizeIds(cardPrintIds);

  if (!normalizedUserId || normalizedCardPrintIds.length === 0) {
    return new Map();
  }

  const adminClient = createServerAdminClient();
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("card_print_id,card_printing_id")
    .eq("user_id", normalizedUserId)
    .is("archived_at", null)
    .in("card_print_id", normalizedCardPrintIds);

  if (error) {
    throw new Error(
      `[vault_item_instances.read-owned-printing-counts] ${error.message}${
        error.code ? ` | code=${error.code}` : ""
      }${error.details ? ` | details=${error.details}` : ""}${error.hint ? ` | hint=${error.hint}` : ""}`,
    );
  }

  const countsByCardPrintId: OwnedPrintingCountsByCardPrintId = new Map();
  for (const row of (data ?? []) as OwnedPrintingRow[]) {
    const cardPrintId = row.card_print_id?.trim();
    const cardPrintingId = row.card_printing_id?.trim();
    if (!cardPrintId || !cardPrintingId) {
      continue;
    }

    const countsByPrintingId = countsByCardPrintId.get(cardPrintId) ?? new Map<string, number>();
    countsByPrintingId.set(cardPrintingId, (countsByPrintingId.get(cardPrintingId) ?? 0) + 1);
    countsByCardPrintId.set(cardPrintId, countsByPrintingId);
  }

  return countsByCardPrintId;
}
