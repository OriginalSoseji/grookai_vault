"use server";

import { createServerComponentClient } from "@/lib/supabase/server";
import { createServerAdminClient } from "@/lib/supabase/admin";

export type AssignConditionSnapshotInput = {
  snapshotId: string;
  gvviId: string;
  cardPrintId: string;
};

export type AssignConditionSnapshotResult =
  | {
      ok: true;
      snapshotId: string;
      gvViId: string;
    }
  | {
      ok: false;
      snapshotId: string;
      message: string;
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

type InstanceRow = {
  gv_vi_id: string | null;
  user_id: string;
  card_print_id: string | null;
  legacy_vault_item_id: string | null;
  archived_at: string | null;
};

export async function assignConditionSnapshotAction(
  input: AssignConditionSnapshotInput,
): Promise<AssignConditionSnapshotResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      snapshotId: input.snapshotId,
      message: "Sign in required.",
    };
  }

  const snapshotId = input.snapshotId.trim();
  const gvviId = input.gvviId.trim();
  const cardPrintId = input.cardPrintId.trim();

  if (!snapshotId || !gvviId || !cardPrintId) {
    return {
      ok: false,
      snapshotId,
      message: "Snapshot assignment requires snapshot, card, and GVVI identity.",
    };
  }

  const adminClient = createServerAdminClient();
  const { data: snapshotRow, error: snapshotError } = await adminClient
    .from("condition_snapshots")
    .select("id,user_id,gv_vi_id,vault_item_id,card_print_id")
    .eq("id", snapshotId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (snapshotError || !snapshotRow) {
    return {
      ok: false,
      snapshotId,
      message: "Condition snapshot could not be resolved.",
    };
  }

  const snapshot = snapshotRow as SnapshotRow;
  if (snapshot.gv_vi_id) {
    return {
      ok: false,
      snapshotId,
      message: "This scan is already assigned.",
    };
  }

  if (!snapshot.vault_item_id) {
    return {
      ok: false,
      snapshotId,
      message: "This scan has no historical vault context to resolve.",
    };
  }

  let effectiveCardPrintId = snapshot.card_print_id?.trim() ?? "";
  if (!effectiveCardPrintId) {
    const { data: bucketRow, error: bucketError } = await adminClient
      .from("vault_items")
      .select("id,user_id,card_id")
      .eq("id", snapshot.vault_item_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bucketError || !bucketRow) {
      return {
        ok: false,
        snapshotId,
        message: "Snapshot card context could not be resolved.",
      };
    }

    effectiveCardPrintId = (((bucketRow as BucketRow).card_id ?? "")).trim();
  }

  if (!effectiveCardPrintId || effectiveCardPrintId !== cardPrintId) {
    return {
      ok: false,
      snapshotId,
      message: "This scan does not match the current card context.",
    };
  }

  const { data: instanceRow, error: instanceError } = await adminClient
    .from("vault_item_instances")
    .select("gv_vi_id,user_id,card_print_id,legacy_vault_item_id,archived_at")
    .eq("gv_vi_id", gvviId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (instanceError || !instanceRow) {
    return {
      ok: false,
      snapshotId,
      message: "Selected owned card could not be resolved.",
    };
  }

  const instance = instanceRow as InstanceRow;
  const instanceCardPrintId = instance.card_print_id?.trim() ?? "";
  const isLineageMatch = instance.legacy_vault_item_id === snapshot.vault_item_id;
  if (!instanceCardPrintId || instanceCardPrintId !== effectiveCardPrintId || (!isLineageMatch && instanceCardPrintId !== cardPrintId)) {
    return {
      ok: false,
      snapshotId,
      message: "Selected owned card does not match this scan.",
    };
  }

  const { data: updatedRow, error: updateError } = await adminClient
    .from("condition_snapshots")
    .update({
      gv_vi_id: gvviId,
    })
    .eq("id", snapshotId)
    .eq("user_id", user.id)
    .is("gv_vi_id", null)
    .select("id,gv_vi_id")
    .maybeSingle();

  if (updateError || !updatedRow) {
    return {
      ok: false,
      snapshotId,
      message: "Couldn’t assign this scan.",
    };
  }

  return {
    ok: true,
    snapshotId,
    gvViId: gvviId,
  };
}
