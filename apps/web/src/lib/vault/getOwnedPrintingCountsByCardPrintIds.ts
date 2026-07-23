import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

type OwnedPrintingRow = {
  id: string | null;
  card_print_id: string | null;
  card_printing_id: string | null;
};

type SlabCertPrintingAnchorRow = {
  id: string | null;
  card_print_id: string | null;
};

type SlabOwnedPrintingRow = {
  id: string | null;
  slab_cert_id: string | null;
  card_printing_id: string | null;
};

function normalizeIds(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

const SUPABASE_PRINTING_COUNT_PAGE_SIZE = 1_000;

export type OwnedPrintingCountsByCardPrintId = Map<string, Map<string, number>>;

export type OwnedPrintingOwnershipByCardPrintId = {
  countsByCardPrintId: OwnedPrintingCountsByCardPrintId;
  unassignedCountsByCardPrintId: Map<string, number>;
};

export async function getOwnedPrintingOwnershipByCardPrintIds(
  userId: string | null | undefined,
  cardPrintIds: string[],
): Promise<OwnedPrintingOwnershipByCardPrintId> {
  const normalizedUserId = userId?.trim() ?? "";
  const normalizedCardPrintIds = normalizeIds(cardPrintIds);

  if (!normalizedUserId || normalizedCardPrintIds.length === 0) {
    return {
      countsByCardPrintId: new Map(),
      unassignedCountsByCardPrintId: new Map(),
    };
  }

  const adminClient = createServerAdminClient();
  const rows: OwnedPrintingRow[] = [];
  for (const cardPrintIdChunk of chunkArray(normalizedCardPrintIds, 200)) {
    for (let from = 0; ; from += SUPABASE_PRINTING_COUNT_PAGE_SIZE) {
      const to = from + SUPABASE_PRINTING_COUNT_PAGE_SIZE - 1;
      const { data, error } = await adminClient
        .from("vault_item_instances")
        .select("id,card_print_id,card_printing_id")
        .eq("user_id", normalizedUserId)
        .is("archived_at", null)
        .in("card_print_id", cardPrintIdChunk)
        .order("id", { ascending: true })
        .range(from, to);

      if (error) {
        throw new Error(
          `[vault_item_instances.read-owned-printing-counts] ${error.message}${
            error.code ? ` | code=${error.code}` : ""
          }${error.details ? ` | details=${error.details}` : ""}${error.hint ? ` | hint=${error.hint}` : ""}`,
        );
      }

      const page = (data ?? []) as OwnedPrintingRow[];
      rows.push(...page);
      if (page.length < SUPABASE_PRINTING_COUNT_PAGE_SIZE) {
        break;
      }
    }
  }

  const countsByCardPrintId: OwnedPrintingCountsByCardPrintId = new Map();
  const unassignedCountsByCardPrintId = new Map<string, number>();
  const recordOwnership = (
    cardPrintIdValue: string | null | undefined,
    cardPrintingIdValue: string | null | undefined,
  ) => {
    const cardPrintId = cardPrintIdValue?.trim();
    const cardPrintingId = cardPrintingIdValue?.trim();
    if (!cardPrintId) {
      return;
    }
    if (!cardPrintingId) {
      unassignedCountsByCardPrintId.set(
        cardPrintId,
        (unassignedCountsByCardPrintId.get(cardPrintId) ?? 0) + 1,
      );
      return;
    }

    const countsByPrintingId = countsByCardPrintId.get(cardPrintId) ?? new Map<string, number>();
    countsByPrintingId.set(cardPrintingId, (countsByPrintingId.get(cardPrintingId) ?? 0) + 1);
    countsByCardPrintId.set(cardPrintId, countsByPrintingId);
  };
  for (const row of rows) {
    recordOwnership(row.card_print_id, row.card_printing_id);
  }

  // Resolve the owner's active slab-only instances first. This keeps direct
  // identities authoritative and avoids enumerating every certificate ever
  // created for popular species cards.
  const slabOnlyRows: SlabOwnedPrintingRow[] = [];
  for (let from = 0; ; from += SUPABASE_PRINTING_COUNT_PAGE_SIZE) {
    const { data, error } = await adminClient
      .from("vault_item_instances")
      .select("id,slab_cert_id,card_printing_id")
      .eq("user_id", normalizedUserId)
      .is("archived_at", null)
      .is("card_print_id", null)
      .not("slab_cert_id", "is", null)
      .order("id", { ascending: true })
      .range(from, from + SUPABASE_PRINTING_COUNT_PAGE_SIZE - 1);
    if (error) {
      throw new Error(
        `[vault_item_instances.read-owned-slab-only-printing-counts] ${error.message}`,
      );
    }
    const page = (data ?? []) as SlabOwnedPrintingRow[];
    slabOnlyRows.push(...page);
    if (page.length < SUPABASE_PRINTING_COUNT_PAGE_SIZE) {
      break;
    }
  }

  const ownedSlabCertIds = Array.from(
    new Set(
      slabOnlyRows
        .map((row) => row.slab_cert_id?.trim() ?? "")
        .filter(Boolean),
    ),
  );
  const requestedCardPrintIdSet = new Set(normalizedCardPrintIds);
  const cardPrintIdBySlabCertId = new Map<string, string>();
  for (const slabCertIdChunk of chunkArray(ownedSlabCertIds, 200)) {
    const { data, error } = await adminClient
      .from("slab_certs")
      .select("id,card_print_id")
      .in("id", slabCertIdChunk);
    if (error) {
      throw new Error(
        `[slab_certs.read-owned-printing-anchors] ${error.message}`,
      );
    }
    for (const row of (data ?? []) as SlabCertPrintingAnchorRow[]) {
      const slabCertId = row.id?.trim() ?? "";
      const cardPrintId = row.card_print_id?.trim() ?? "";
      if (slabCertId && requestedCardPrintIdSet.has(cardPrintId)) {
        cardPrintIdBySlabCertId.set(slabCertId, cardPrintId);
      }
    }
  }
  for (const row of slabOnlyRows) {
    const slabCertId = row.slab_cert_id?.trim() ?? "";
    recordOwnership(
      cardPrintIdBySlabCertId.get(slabCertId),
      row.card_printing_id,
    );
  }

  return {
    countsByCardPrintId,
    unassignedCountsByCardPrintId,
  };
}

export async function getOwnedPrintingCountsByCardPrintIds(
  userId: string | null | undefined,
  cardPrintIds: string[],
): Promise<OwnedPrintingCountsByCardPrintId> {
  const ownership = await getOwnedPrintingOwnershipByCardPrintIds(
    userId,
    cardPrintIds,
  );
  return ownership.countsByCardPrintId;
}
