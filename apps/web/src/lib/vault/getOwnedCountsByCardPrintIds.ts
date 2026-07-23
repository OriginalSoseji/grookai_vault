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

type AllOwnedInstanceRow = {
  card_print_id: string | null;
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
  const requestedCardPrintIds = new Set(normalizedIds);

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

  const slabOnlyRows = await fetchAllOwnershipPages<SlabOwnedInstanceRow>(
    (from, to) =>
      adminClient
        .from("vault_item_instances")
        .select("id,slab_cert_id")
        .eq("user_id", normalizedUserId)
        .is("archived_at", null)
        .is("card_print_id", null)
        .not("slab_cert_id", "is", null)
        .order("id", { ascending: true })
        .range(from, to),
    "[vault_item_instances.read-owned-count-slab-only-instances]",
  );
  const ownedSlabCertIds = Array.from(
    new Set(
      slabOnlyRows
        .map((row) => row.slab_cert_id?.trim() ?? "")
        .filter(Boolean),
    ),
  );
  const slabCertCardPrintIdById = new Map<string, string>();
  for (const chunk of chunkArray(ownedSlabCertIds, 500)) {
    const { data, error } = await adminClient
      .from("slab_certs")
      .select("id,card_print_id")
      .in("id", chunk);
    if (error) {
      throw new Error(
        formatReadError("[slab_certs.read-owned-count-anchors]", error),
      );
    }
    for (const row of (data ?? []) as SlabCertOwnershipRow[]) {
      const slabCertId = row.id?.trim() ?? "";
      const cardPrintId = row.card_print_id?.trim() ?? "";
      if (slabCertId && requestedCardPrintIds.has(cardPrintId)) {
        slabCertCardPrintIdById.set(slabCertId, cardPrintId);
      }
    }
  }
  for (const row of slabOnlyRows) {
    const slabCertId = row.slab_cert_id?.trim() ?? "";
    addCount(counts, slabCertCardPrintIdById.get(slabCertId));
  }

  return counts;
}

export async function getOwnedCardPrintIdsForUser(userId: string): Promise<string[]> {
  const counts = await getAllOwnedCountsForUser(userId);
  return Array.from(counts.keys());
}

export async function getAllOwnedCountsForUser(
  userId: string,
): Promise<Map<string, number>> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return new Map<string, number>();
  }

  const adminClient = createServerAdminClient();
  const counts = new Map<string, number>();
  const ownedRows = await fetchAllOwnershipPages<AllOwnedInstanceRow>(
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

  const slabCertIds = new Set<string>();
  for (const row of ownedRows) {
    const cardPrintId = row.card_print_id?.trim() ?? "";
    if (cardPrintId) {
      addCount(counts, cardPrintId);
      continue;
    }

    const slabCertId = row.slab_cert_id?.trim() ?? "";
    if (slabCertId) {
      slabCertIds.add(slabCertId);
    }
  }

  const cardPrintIdBySlabCertId = new Map<string, string>();
  for (const chunk of chunkArray(Array.from(slabCertIds), 500)) {
    const { data: slabRows, error: slabError } = await adminClient
      .from("slab_certs")
      .select("id,card_print_id")
      .in("id", chunk);

    if (slabError) {
      throw new Error(
        `[slab_certs.read-all-owned-counts] ${slabError.message}${
          slabError.code ? ` | code=${slabError.code}` : ""
        }${slabError.details ? ` | details=${slabError.details}` : ""}${
          slabError.hint ? ` | hint=${slabError.hint}` : ""
        }`,
      );
    }

    for (const row of (slabRows ?? []) as SlabCertOwnershipRow[]) {
      const slabCertId = row.id?.trim() ?? "";
      const cardPrintId = row.card_print_id?.trim() ?? "";
      if (slabCertId && cardPrintId) {
        cardPrintIdBySlabCertId.set(slabCertId, cardPrintId);
      }
    }
  }

  for (const row of ownedRows) {
    if (row.card_print_id?.trim()) {
      continue;
    }
    const slabCertId = row.slab_cert_id?.trim() ?? "";
    addCount(counts, cardPrintIdBySlabCertId.get(slabCertId));
  }

  return counts;
}
