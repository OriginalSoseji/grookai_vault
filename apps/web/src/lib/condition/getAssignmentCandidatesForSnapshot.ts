import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export type AssignmentCandidate = {
  gv_vi_id: string;
  created_at: string;
  card_print_id: string;
  is_lineage_match: boolean;
};

type SnapshotRow = {
  id: string;
  user_id: string;
  gv_vi_id: string | null;
  vault_item_id: string | null;
  card_print_id: string | null;
};

type BucketRow = {
  id: string;
  user_id: string;
  card_id: string | null;
};

type CandidateRow = {
  gv_vi_id: string | null;
  created_at: string | null;
  card_print_id: string | null;
  legacy_vault_item_id: string | null;
};

export async function getAssignmentCandidatesForSnapshot(
  userId: string,
  snapshotId: string,
  cardPrintId: string,
): Promise<AssignmentCandidate[]> {
  const normalizedUserId = userId.trim();
  const normalizedSnapshotId = snapshotId.trim();
  const normalizedCardPrintId = cardPrintId.trim();

  if (!normalizedUserId || !normalizedSnapshotId || !normalizedCardPrintId) {
    return [];
  }

  const adminClient = createServerAdminClient();
  const { data: snapshotRow, error: snapshotError } = await adminClient
    .from("condition_snapshots")
    .select("id,user_id,gv_vi_id,vault_item_id,card_print_id")
    .eq("id", normalizedSnapshotId)
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (snapshotError) {
    throw new Error(
      `[condition.assign] snapshot lookup failed: ${snapshotError.message}${
        snapshotError.code ? ` | code=${snapshotError.code}` : ""
      }`,
    );
  }

  const snapshot = (snapshotRow ?? null) as SnapshotRow | null;
  if (!snapshot || snapshot.gv_vi_id || !snapshot.vault_item_id) {
    return [];
  }

  let effectiveCardPrintId = snapshot.card_print_id?.trim() ?? "";
  if (!effectiveCardPrintId) {
    const { data: bucketRow, error: bucketError } = await adminClient
      .from("vault_items")
      .select("id,user_id,card_id")
      .eq("id", snapshot.vault_item_id)
      .eq("user_id", normalizedUserId)
      .maybeSingle();

    if (bucketError) {
      throw new Error(
        `[condition.assign] bucket lookup failed: ${bucketError.message}${
          bucketError.code ? ` | code=${bucketError.code}` : ""
        }`,
      );
    }

    effectiveCardPrintId = (((bucketRow ?? null) as BucketRow | null)?.card_id ?? "").trim();
  }

  if (!effectiveCardPrintId || effectiveCardPrintId !== normalizedCardPrintId) {
    return [];
  }

  const { data: candidateRows, error: candidateError } = await adminClient
    .from("vault_item_instances")
    .select("gv_vi_id,created_at,card_print_id,legacy_vault_item_id")
    .eq("user_id", normalizedUserId)
    .eq("card_print_id", normalizedCardPrintId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (candidateError) {
    throw new Error(
      `[condition.assign] candidate lookup failed: ${candidateError.message}${
        candidateError.code ? ` | code=${candidateError.code}` : ""
      }`,
    );
  }

  const deduped = new Map<string, AssignmentCandidate>();
  for (const row of (candidateRows ?? []) as CandidateRow[]) {
    const gvviId = typeof row.gv_vi_id === "string" ? row.gv_vi_id.trim() : "";
    const createdAt = typeof row.created_at === "string" ? row.created_at : "";
    const candidateCardPrintId = typeof row.card_print_id === "string" ? row.card_print_id.trim() : "";

    if (!gvviId || !createdAt || !candidateCardPrintId || candidateCardPrintId !== normalizedCardPrintId) {
      continue;
    }

    deduped.set(gvviId, {
      gv_vi_id: gvviId,
      created_at: createdAt,
      card_print_id: candidateCardPrintId,
      is_lineage_match: row.legacy_vault_item_id === snapshot.vault_item_id,
    });
  }

  return [...deduped.values()].sort((left, right) => {
    if (left.is_lineage_match !== right.is_lineage_match) {
      return left.is_lineage_match ? -1 : 1;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}
