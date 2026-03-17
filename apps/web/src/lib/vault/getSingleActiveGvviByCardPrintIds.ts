import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export async function getSingleActiveGvviByCardPrintIds(
  userId: string,
  cardPrintIds: string[],
): Promise<Map<string, string>> {
  const normalizedUserId = userId.trim();
  const normalizedIds = Array.from(
    new Set(
      cardPrintIds
        .map((cardPrintId) => cardPrintId.trim())
        .filter((cardPrintId) => cardPrintId.length > 0),
    ),
  );

  if (!normalizedUserId || normalizedIds.length === 0) {
    return new Map<string, string>();
  }

  const adminClient = createServerAdminClient();
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("card_print_id,gv_vi_id")
    .eq("user_id", normalizedUserId)
    .is("archived_at", null)
    .in("card_print_id", normalizedIds);

  if (error) {
    throw new Error(
      `[vault_item_instances.read-single-gvvi] ${error.message}${
        error.code ? ` | code=${error.code}` : ""
      }${error.details ? ` | details=${error.details}` : ""}${
        error.hint ? ` | hint=${error.hint}` : ""
      }`,
    );
  }

  const gvviListsByCardId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const cardPrintId =
      typeof row.card_print_id === "string" ? row.card_print_id.trim() : "";
    const gvviId = typeof row.gv_vi_id === "string" ? row.gv_vi_id.trim() : "";

    if (!cardPrintId || !gvviId) {
      continue;
    }

    const current = gvviListsByCardId.get(cardPrintId) ?? [];
    current.push(gvviId);
    gvviListsByCardId.set(cardPrintId, current);
  }

  const singleActiveGvviByCardId = new Map<string, string>();
  for (const [cardPrintId, gvviIds] of gvviListsByCardId.entries()) {
    if (gvviIds.length === 1) {
      singleActiveGvviByCardId.set(cardPrintId, gvviIds[0]);
    }
  }

  return singleActiveGvviByCardId;
}
