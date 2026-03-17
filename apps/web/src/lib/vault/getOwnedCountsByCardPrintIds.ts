import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export async function getOwnedCountsByCardPrintIds(
  userId: string,
  cardPrintIds: string[],
): Promise<Map<string, number>> {
  const normalizedUserId = userId.trim();
  const normalizedIds = Array.from(
    new Set(
      cardPrintIds
        .map((cardPrintId) => cardPrintId.trim())
        .filter((cardPrintId) => cardPrintId.length > 0),
    ),
  );

  if (!normalizedUserId || normalizedIds.length === 0) {
    return new Map<string, number>();
  }

  const adminClient = createServerAdminClient();
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("card_print_id")
    .eq("user_id", normalizedUserId)
    .is("archived_at", null)
    .in("card_print_id", normalizedIds);

  if (error) {
    throw new Error(
      `[vault_item_instances.read-owned-counts] ${error.message}${
        error.code ? ` | code=${error.code}` : ""
      }${error.details ? ` | details=${error.details}` : ""}${
        error.hint ? ` | hint=${error.hint}` : ""
      }`,
    );
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const cardPrintId =
      typeof row.card_print_id === "string" ? row.card_print_id.trim() : "";

    if (!cardPrintId) {
      continue;
    }

    counts.set(cardPrintId, (counts.get(cardPrintId) ?? 0) + 1);
  }

  return counts;
}
