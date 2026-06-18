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
    const { data, error } = await adminClient
      .from("vault_item_instances")
      .select("card_print_id")
      .eq("user_id", normalizedUserId)
      .is("archived_at", null)
      .in("card_print_id", chunk);

    if (error) {
      throw new Error(
        `[vault_item_instances.read-owned-counts] ${error.message}${
          error.code ? ` | code=${error.code}` : ""
        }${error.details ? ` | details=${error.details}` : ""}${
          error.hint ? ` | hint=${error.hint}` : ""
        }`,
      );
    }

    for (const row of (data ?? []) as DirectOwnedInstanceRow[]) {
      addCount(counts, row.card_print_id);
    }
  }

  const slabCertCardPrintIdById = new Map<string, string>();
  for (const chunk of chunkArray(normalizedIds, 500)) {
    const { data, error } = await adminClient
      .from("slab_certs")
      .select("id,card_print_id")
      .in("card_print_id", chunk);

    if (error) {
      throw new Error(
        `[slab_certs.read-owned-count-card-print-anchors] ${error.message}${
          error.code ? ` | code=${error.code}` : ""
        }${error.details ? ` | details=${error.details}` : ""}${
          error.hint ? ` | hint=${error.hint}` : ""
        }`,
      );
    }

    for (const row of (data ?? []) as SlabCertOwnershipRow[]) {
      const slabCertId = typeof row.id === "string" ? row.id.trim() : "";
      const cardPrintId = typeof row.card_print_id === "string" ? row.card_print_id.trim() : "";
      if (slabCertId && cardPrintId) {
        slabCertCardPrintIdById.set(slabCertId, cardPrintId);
      }
    }
  }

  const slabCertIds = Array.from(slabCertCardPrintIdById.keys());
  for (const chunk of chunkArray(slabCertIds, 500)) {
    const { data, error } = await adminClient
      .from("vault_item_instances")
      .select("slab_cert_id")
      .eq("user_id", normalizedUserId)
      .is("archived_at", null)
      .in("slab_cert_id", chunk);

    if (error) {
      throw new Error(
        `[vault_item_instances.read-owned-count-slab-instances] ${error.message}${
          error.code ? ` | code=${error.code}` : ""
        }${error.details ? ` | details=${error.details}` : ""}${
          error.hint ? ` | hint=${error.hint}` : ""
        }`,
      );
    }

    for (const row of (data ?? []) as SlabOwnedInstanceRow[]) {
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

  const { data: directRows, error: directError } = await adminClient
    .from("vault_item_instances")
    .select("card_print_id,slab_cert_id")
    .eq("user_id", normalizedUserId)
    .is("archived_at", null);

  if (directError) {
    throw new Error(
      `[vault_item_instances.read-owned-card-print-ids] ${directError.message}${
        directError.code ? ` | code=${directError.code}` : ""
      }${directError.details ? ` | details=${directError.details}` : ""}${
        directError.hint ? ` | hint=${directError.hint}` : ""
      }`,
    );
  }

  for (const row of (directRows ?? []) as Array<{ card_print_id: string | null; slab_cert_id: string | null }>) {
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
