import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export type ConditionSnapshotListItem = {
  id: string;
  created_at: string;
  gv_vi_id: string | null;
  vault_item_id: string | null;
  assignment_state: "assigned" | "unassigned";
  scan_quality: string | null;
  confidence: number | null;
};

type VaultInstanceRow = {
  gv_vi_id: string | null;
};

type VaultItemRow = {
  id: string;
};

type ConditionSnapshotRow = {
  id: string;
  created_at: string | null;
  gv_vi_id: string | null;
  vault_item_id: string | null;
  scan_quality: Record<string, unknown> | null;
  confidence: number | null;
};

function normalizeIds(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function normalizeScanQuality(scanQuality: Record<string, unknown> | null) {
  if (!scanQuality || typeof scanQuality !== "object") {
    return null;
  }

  const analysisStatus = typeof scanQuality.analysis_status === "string" ? scanQuality.analysis_status.trim() : "";
  if (analysisStatus) {
    return analysisStatus.replace(/[_-]+/g, " ");
  }

  if (scanQuality.ok === true) {
    return "ok";
  }

  const failureReason = typeof scanQuality.failure_reason === "string" ? scanQuality.failure_reason.trim() : "";
  if (failureReason) {
    return failureReason.replace(/[_-]+/g, " ");
  }

  return null;
}

function normalizeSnapshotRow(
  row: ConditionSnapshotRow,
  assignmentState: ConditionSnapshotListItem["assignment_state"],
): ConditionSnapshotListItem | null {
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";

  if (!id || !createdAt) {
    return null;
  }

  return {
    id,
    created_at: createdAt,
    gv_vi_id: typeof row.gv_vi_id === "string" && row.gv_vi_id.trim().length > 0 ? row.gv_vi_id.trim() : null,
    vault_item_id:
      typeof row.vault_item_id === "string" && row.vault_item_id.trim().length > 0 ? row.vault_item_id.trim() : null,
    assignment_state: assignmentState,
    scan_quality: normalizeScanQuality(row.scan_quality),
    confidence: typeof row.confidence === "number" ? row.confidence : null,
  };
}

export async function getConditionSnapshotsForCard(
  userId: string,
  cardPrintId: string,
): Promise<ConditionSnapshotListItem[]> {
  const normalizedUserId = userId.trim();
  const normalizedCardPrintId = cardPrintId.trim();

  if (!normalizedUserId || !normalizedCardPrintId) {
    return [];
  }

  const adminClient = createServerAdminClient();

  const [{ data: instanceRows, error: instanceError }, { data: bucketRows, error: bucketError }] = await Promise.all([
    adminClient
      .from("vault_item_instances")
      .select("gv_vi_id")
      .eq("user_id", normalizedUserId)
      .eq("card_print_id", normalizedCardPrintId)
      .is("archived_at", null),
    adminClient
      .from("vault_items")
      .select("id")
      .eq("user_id", normalizedUserId)
      .eq("card_id", normalizedCardPrintId),
  ]);

  if (instanceError) {
    throw new Error(
      `[condition.read] active instance query failed: ${instanceError.message}${
        instanceError.code ? ` | code=${instanceError.code}` : ""
      }`,
    );
  }

  if (bucketError) {
    throw new Error(
      `[condition.read] bucket lineage query failed: ${bucketError.message}${
        bucketError.code ? ` | code=${bucketError.code}` : ""
      }`,
    );
  }

  const activeGvviIds = normalizeIds(
    ((instanceRows ?? []) as VaultInstanceRow[]).map((row) => (typeof row.gv_vi_id === "string" ? row.gv_vi_id : "")),
  );
  const bucketIds = normalizeIds(((bucketRows ?? []) as VaultItemRow[]).map((row) => row.id ?? ""));

  const assignedPromise =
    activeGvviIds.length > 0
      ? adminClient
          .from("condition_snapshots")
          .select("id,created_at,gv_vi_id,vault_item_id,scan_quality,confidence")
          .eq("user_id", normalizedUserId)
          .in("gv_vi_id", activeGvviIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });

  const unassignedPromise =
    bucketIds.length > 0
      ? adminClient
          .from("condition_snapshots")
          .select("id,created_at,gv_vi_id,vault_item_id,scan_quality,confidence")
          .eq("user_id", normalizedUserId)
          .is("gv_vi_id", null)
          .in("vault_item_id", bucketIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });

  const [{ data: assignedRows, error: assignedError }, { data: unassignedRows, error: unassignedError }] =
    await Promise.all([assignedPromise, unassignedPromise]);

  if (assignedError) {
    throw new Error(
      `[condition.read] assigned snapshot query failed: ${assignedError.message}${
        assignedError.code ? ` | code=${assignedError.code}` : ""
      }`,
    );
  }

  if (unassignedError) {
    throw new Error(
      `[condition.read] unassigned snapshot query failed: ${unassignedError.message}${
        unassignedError.code ? ` | code=${unassignedError.code}` : ""
      }`,
    );
  }

  const assigned = ((assignedRows ?? []) as ConditionSnapshotRow[])
    .map((row) => normalizeSnapshotRow(row, "assigned"))
    .filter((row): row is ConditionSnapshotListItem => row !== null);

  const unassigned = ((unassignedRows ?? []) as ConditionSnapshotRow[])
    .map((row) => normalizeSnapshotRow(row, "unassigned"))
    .filter((row): row is ConditionSnapshotListItem => row !== null);

  return [...assigned, ...unassigned];
}
