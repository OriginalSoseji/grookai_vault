import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

type DirectOwnedInstanceRow = {
  card_print_id: string | null;
};

type SlabCertOwnershipRow = {
  id: string | null;
  card_print_id: string | null;
};

type SlabOwnedInstanceRow = {
  slab_cert_id: string | null;
};

type SupabaseReadError = {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

const SUPABASE_OWNERSHIP_PAGE_SIZE = 1_000;

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function addCount(counts: Map<string, number>, cardPrintId: string | null | undefined) {
  const normalizedCardPrintId = typeof cardPrintId === "string" ? cardPrintId.trim() : "";
  if (!normalizedCardPrintId) {
    return;
  }

  counts.set(normalizedCardPrintId, (counts.get(normalizedCardPrintId) ?? 0) + 1);
}

function formatReadError(prefix: string, error: SupabaseReadError) {
  return `${prefix} ${error.message}${error.code ? ` | code=${error.code}` : ""}${
    error.details ? ` | details=${error.details}` : ""
  }${error.hint ? ` | hint=${error.hint}` : ""}`;
}

async function fetchAllOwnershipPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: SupabaseReadError | null }>,
  errorPrefix: string,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += SUPABASE_OWNERSHIP_PAGE_SIZE) {
    const to = from + SUPABASE_OWNERSHIP_PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      throw new Error(formatReadError(errorPrefix, error));
    }
    const page = (Array.isArray(data) ? data : []) as T[];
    rows.push(...page);
    if (page.length < SUPABASE_OWNERSHIP_PAGE_SIZE) {
      break;
    }
  }
  return rows;
}

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
  const counts = new Map<string, number>();

  for (const chunk of chunkArray(normalizedIds, 500)) {
    const rows = await fetchAllOwnershipPages<DirectOwnedInstanceRow>(
      (from, to) =>
        adminClient
          .from("vault_item_instances")
          .select("id,card_print_id")
          .eq("user_id", normalizedUserId)
          .is("archived_at", null)
          .in("card_print_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      "[vault_item_instances.read-owned-counts]",
    );

    for (const row of rows) {
      addCount(counts, row.card_print_id);
    }
  }

  const slabCertCardPrintIdById = new Map<string, string>();
  for (const chunk of chunkArray(normalizedIds, 500)) {
    const rows = await fetchAllOwnershipPages<SlabCertOwnershipRow>(
      (from, to) =>
        adminClient
          .from("slab_certs")
          .select("id,card_print_id")
          .in("card_print_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      "[slab_certs.read-owned-count-card-print-anchors]",
    );

    for (const row of rows) {
      const slabCertId = typeof row.id === "string" ? row.id.trim() : "";
      const cardPrintId = typeof row.card_print_id === "string" ? row.card_print_id.trim() : "";
      if (slabCertId && cardPrintId) {
        slabCertCardPrintIdById.set(slabCertId, cardPrintId);
      }
    }
  }

  const slabCertIds = Array.from(slabCertCardPrintIdById.keys());
  for (const chunk of chunkArray(slabCertIds, 500)) {
    const rows = await fetchAllOwnershipPages<SlabOwnedInstanceRow>(
      (from, to) =>
        adminClient
          .from("vault_item_instances")
          .select("id,slab_cert_id")
          .eq("user_id", normalizedUserId)
          .is("archived_at", null)
          .in("slab_cert_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      "[vault_item_instances.read-owned-count-slab-instances]",
    );

    for (const row of rows) {
      const slabCertId = typeof row.slab_cert_id === "string" ? row.slab_cert_id.trim() : "";
      addCount(counts, slabCertCardPrintIdById.get(slabCertId));
    }
  }

  return counts;
}

export async function getOwnedCardPrintIdsForUser(userId: string): Promise<string[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  const adminClient = createServerAdminClient();
  const ownedCardPrintIds = new Set<string>();
  const slabCertIds = new Set<string>();

  const directRows = await fetchAllOwnershipPages<{
    card_print_id: string | null;
    slab_cert_id: string | null;
  }>(
    (from, to) =>
      adminClient
        .from("vault_item_instances")
        .select("id,card_print_id,slab_cert_id")
        .eq("user_id", normalizedUserId)
        .is("archived_at", null)
        .order("id", { ascending: true })
        .range(from, to),
    "[vault_item_instances.read-owned-card-print-ids]",
  );

  for (const row of directRows) {
    const cardPrintId = row.card_print_id?.trim() ?? "";
    if (cardPrintId) {
      ownedCardPrintIds.add(cardPrintId);
    }

    const slabCertId = row.slab_cert_id?.trim() ?? "";
    if (slabCertId) {
      slabCertIds.add(slabCertId);
    }
  }

  const slabCertIdList = Array.from(slabCertIds);
  for (const chunk of chunkArray(slabCertIdList, 500)) {
    const { data: slabRows, error: slabError } = await adminClient
      .from("slab_certs")
      .select("id,card_print_id")
      .in("id", chunk);

    if (slabError) {
      throw new Error(
        `[slab_certs.read-owned-card-print-ids] ${slabError.message}${
          slabError.code ? ` | code=${slabError.code}` : ""
        }${slabError.details ? ` | details=${slabError.details}` : ""}${
          slabError.hint ? ` | hint=${slabError.hint}` : ""
        }`,
      );
    }

    for (const row of (slabRows ?? []) as SlabCertOwnershipRow[]) {
      const cardPrintId = row.card_print_id?.trim() ?? "";
      if (cardPrintId) {
        ownedCardPrintIds.add(cardPrintId);
      }
    }
  }

  return Array.from(ownedCardPrintIds);
}
