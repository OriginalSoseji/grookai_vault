import "server-only";

import {
  assertVaultCardCountProof,
  assertVaultInstanceActiveProof,
  assertVaultInstanceArchivedProof,
} from "@/lib/contracts/ownershipMutationGuards";
import type { OwnerWriteProofContextV1 } from "@/lib/contracts/execute_owner_write_v1";
import {
  normalizeVaultInstanceImageDisplayMode,
  type VaultInstanceImageDisplayMode,
} from "@/lib/vaultInstanceImageDisplay";
import {
  normalizeVaultInstanceMediaPath,
  type VaultInstanceMediaSide,
} from "@/lib/vaultInstanceMedia";
import {
  normalizeVaultInstancePricingAmount,
  normalizeVaultInstancePricingCurrency,
  normalizeVaultInstancePricingMode,
  normalizeVaultInstancePricingNote,
  type VaultInstancePricingMode,
} from "@/lib/vaultInstancePricing";

type VaultInstanceProofInput = {
  instanceId: string;
  cardPrintId?: string | null;
};

type VaultCardCountProofInput = {
  cardPrintId: string;
  expectedCount: number;
};

type VaultInstanceConditionProofInput = {
  instanceId: string;
  expectedConditionLabel: string;
};

type VaultInstanceMediaProofInput = {
  instanceId: string;
  side: VaultInstanceMediaSide;
  expectedStoragePath: string | null;
};

type VaultInstanceNotesProofInput = {
  instanceId: string;
  expectedNotes: string | null;
};

type VaultInstancePricingProofInput = {
  instanceId: string;
  expectedPricingMode: VaultInstancePricingMode;
  expectedAskingPriceAmount: number | null;
  expectedAskingPriceCurrency: string | null;
  expectedAskingPriceNote: string | null;
};

type VaultInstanceImageDisplayModeProofInput = {
  instanceId: string;
  expectedImageDisplayMode: VaultInstanceImageDisplayMode;
};

type ConditionSnapshotAssignmentProofInput = {
  snapshotId: string;
  instanceId: string;
  expectedGvviId: string;
  expectedCardPrintId?: string | null;
};

type ImportResultSummaryProofInput = {
  importedCards: number;
  importedEntries: number;
  needsManualMatch?: number;
  skippedRows?: number;
};

type InteractionProofInput = {
  interactionId: string;
  senderUserId?: string;
  receiverUserId?: string | null;
  vaultItemId?: string | null;
  cardPrintId?: string | null;
  message?: string | null;
};

type InteractionSignalProofInput = {
  userId?: string;
  cardPrintId: string;
};

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown) {
  const normalized = normalizeOptionalText(value);
  return normalized.length > 0 ? normalized : null;
}

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

// LOCK: Owner-write proofs must verify exact-copy trust surfaces after mutation.
// LOCK: Proof helpers may wrap existing exact-copy guards, but they must not weaken them.

export function createVaultInstanceActiveProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultInstanceProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    await assertVaultInstanceActiveProof({
      adminClient: context.adminClient,
      instanceId: input.instanceId,
      userId: context.actorId,
      cardPrintId: input.cardPrintId ?? undefined,
    });
  };
}

export function createVaultInstanceArchivedProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultInstanceProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    await assertVaultInstanceArchivedProof({
      adminClient: context.adminClient,
      instanceId: input.instanceId,
      userId: context.actorId,
    });
  };
}

export function createVaultCardCountProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultCardCountProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    await assertVaultCardCountProof({
      adminClient: context.adminClient,
      userId: context.actorId,
      cardPrintId: input.cardPrintId,
      expectedCount: input.expectedCount,
    });
  };
}

export function createVaultCardCountBatchProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultCardCountProofInput[] | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const inputs = select(context);
    if (!inputs || inputs.length === 0) {
      return;
    }

    for (const input of inputs) {
      await assertVaultCardCountProof({
        adminClient: context.adminClient,
        userId: context.actorId,
        cardPrintId: input.cardPrintId,
        expectedCount: input.expectedCount,
      });
    }
  };
}

export function createNoArchivedLeakProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultInstanceProofInput | null,
) {
  return createVaultInstanceActiveProofV1(select);
}

export function createVaultInstanceConditionProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultInstanceConditionProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    const { data, error } = await context.adminClient
      .from("vault_item_instances")
      .select("id,user_id,archived_at,condition_label")
      .eq("id", input.instanceId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("owner_write_proof_failed:condition_instance_missing");
    }

    ensure(
      normalizeOptionalText(data.user_id) === normalizeOptionalText(context.actorId),
      "owner_write_proof_failed:condition_owner_drift",
    );
    ensure(!data.archived_at, "owner_write_proof_failed:condition_archived");
    ensure(
      normalizeOptionalText(data.condition_label).toUpperCase() ===
        normalizeOptionalText(input.expectedConditionLabel).toUpperCase(),
      "owner_write_proof_failed:condition_label_drift",
    );
  };
}

export function createVaultInstanceMediaProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultInstanceMediaProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    const { data, error } = await context.adminClient
      .from("vault_item_instances")
      .select("id,user_id,archived_at,image_url,image_source,image_back_url,image_back_source")
      .eq("id", input.instanceId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("owner_write_proof_failed:media_instance_missing");
    }

    ensure(
      normalizeOptionalText(data.user_id) === normalizeOptionalText(context.actorId),
      "owner_write_proof_failed:media_owner_drift",
    );
    ensure(!data.archived_at, "owner_write_proof_failed:media_archived");

    const actualStoragePath = normalizeVaultInstanceMediaPath(
      input.side === "front" ? data.image_url : data.image_back_url,
    );
    const actualSource = normalizeNullableText(
      input.side === "front" ? data.image_source : data.image_back_source,
    );
    const expectedStoragePath = normalizeVaultInstanceMediaPath(input.expectedStoragePath);
    const expectedSource = expectedStoragePath ? "user_photo" : null;

    ensure(
      actualStoragePath === expectedStoragePath,
      "owner_write_proof_failed:media_path_drift",
    );
    ensure(
      actualSource === expectedSource,
      "owner_write_proof_failed:media_source_drift",
    );
  };
}

export function createVaultInstanceNotesProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultInstanceNotesProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    const { data, error } = await context.adminClient
      .from("vault_item_instances")
      .select("id,user_id,archived_at,notes")
      .eq("id", input.instanceId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("owner_write_proof_failed:notes_instance_missing");
    }

    ensure(
      normalizeOptionalText(data.user_id) === normalizeOptionalText(context.actorId),
      "owner_write_proof_failed:notes_owner_drift",
    );
    ensure(!data.archived_at, "owner_write_proof_failed:notes_archived");
    ensure(
      normalizeNullableText(data.notes) === normalizeNullableText(input.expectedNotes),
      "owner_write_proof_failed:notes_drift",
    );
  };
}

export function createVaultInstancePricingProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultInstancePricingProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    const { data, error } = await context.adminClient
      .from("vault_item_instances")
      .select("id,user_id,archived_at,pricing_mode,asking_price_amount,asking_price_currency,asking_price_note")
      .eq("id", input.instanceId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("owner_write_proof_failed:pricing_instance_missing");
    }

    ensure(
      normalizeOptionalText(data.user_id) === normalizeOptionalText(context.actorId),
      "owner_write_proof_failed:pricing_owner_drift",
    );
    ensure(!data.archived_at, "owner_write_proof_failed:pricing_archived");
    ensure(
      normalizeVaultInstancePricingMode(data.pricing_mode) === input.expectedPricingMode,
      "owner_write_proof_failed:pricing_mode_drift",
    );
    ensure(
      normalizeVaultInstancePricingAmount(data.asking_price_amount) ===
        normalizeVaultInstancePricingAmount(input.expectedAskingPriceAmount),
      "owner_write_proof_failed:pricing_amount_drift",
    );
    ensure(
      normalizeVaultInstancePricingCurrency(data.asking_price_currency) ===
        normalizeVaultInstancePricingCurrency(input.expectedAskingPriceCurrency),
      "owner_write_proof_failed:pricing_currency_drift",
    );
    ensure(
      normalizeVaultInstancePricingNote(data.asking_price_note) ===
        normalizeVaultInstancePricingNote(input.expectedAskingPriceNote),
      "owner_write_proof_failed:pricing_note_drift",
    );
  };
}

export function createVaultInstanceImageDisplayModeProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => VaultInstanceImageDisplayModeProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    const { data, error } = await context.adminClient
      .from("vault_item_instances")
      .select("id,user_id,archived_at,image_display_mode")
      .eq("id", input.instanceId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("owner_write_proof_failed:image_display_instance_missing");
    }

    ensure(
      normalizeOptionalText(data.user_id) === normalizeOptionalText(context.actorId),
      "owner_write_proof_failed:image_display_owner_drift",
    );
    ensure(!data.archived_at, "owner_write_proof_failed:image_display_archived");
    ensure(
      normalizeVaultInstanceImageDisplayMode(data.image_display_mode) ===
        input.expectedImageDisplayMode,
      "owner_write_proof_failed:image_display_mode_drift",
    );
  };
}

export function createConditionSnapshotAssignmentProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => ConditionSnapshotAssignmentProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    const [{ data: snapshotData, error: snapshotError }, { data: instanceData, error: instanceError }] =
      await Promise.all([
        context.adminClient
          .from("condition_snapshots")
          .select("id,user_id,gv_vi_id,card_print_id")
          .eq("id", input.snapshotId)
          .maybeSingle(),
        context.adminClient
          .from("vault_item_instances")
          .select("id,user_id,gv_vi_id,card_print_id,archived_at")
          .eq("id", input.instanceId)
          .maybeSingle(),
      ]);

    if (snapshotError || !snapshotData) {
      throw new Error("owner_write_proof_failed:condition_snapshot_missing");
    }
    if (instanceError || !instanceData) {
      throw new Error("owner_write_proof_failed:condition_snapshot_instance_missing");
    }

    ensure(
      normalizeOptionalText(snapshotData.user_id) === normalizeOptionalText(context.actorId),
      "owner_write_proof_failed:condition_snapshot_owner_drift",
    );
    ensure(
      normalizeOptionalText(snapshotData.gv_vi_id) ===
        normalizeOptionalText(input.expectedGvviId),
      "owner_write_proof_failed:condition_snapshot_gvvi_drift",
    );

    if (normalizeOptionalText(input.expectedCardPrintId)) {
      ensure(
        normalizeOptionalText(instanceData.card_print_id) ===
          normalizeOptionalText(input.expectedCardPrintId),
        "owner_write_proof_failed:condition_snapshot_card_print_drift",
      );

      const snapshotCardPrintId = normalizeOptionalText(snapshotData.card_print_id);
      if (snapshotCardPrintId) {
        ensure(
          snapshotCardPrintId === normalizeOptionalText(input.expectedCardPrintId),
          "owner_write_proof_failed:condition_snapshot_snapshot_card_print_drift",
        );
      }
    }

    ensure(
      normalizeOptionalText(instanceData.user_id) === normalizeOptionalText(context.actorId),
      "owner_write_proof_failed:condition_snapshot_instance_owner_drift",
    );
    ensure(!instanceData.archived_at, "owner_write_proof_failed:condition_snapshot_instance_archived");
    ensure(
      normalizeOptionalText(instanceData.gv_vi_id) === normalizeOptionalText(input.expectedGvviId),
      "owner_write_proof_failed:condition_snapshot_instance_gvvi_drift",
    );
  };
}

export function createInteractionExistsProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => InteractionProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    const { data, error } = await context.adminClient
      .from("card_interactions")
      .select("id,sender_user_id,receiver_user_id,vault_item_id,card_print_id,message")
      .eq("id", input.interactionId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("owner_write_proof_failed:interaction_missing");
    }

    ensure(
      normalizeOptionalText(data.sender_user_id) ===
        normalizeOptionalText(input.senderUserId ?? context.actorId),
      "owner_write_proof_failed:interaction_sender_drift",
    );

    if (input.receiverUserId) {
      ensure(
        normalizeOptionalText(data.receiver_user_id) ===
          normalizeOptionalText(input.receiverUserId),
        "owner_write_proof_failed:interaction_receiver_drift",
      );
    }

    if (input.vaultItemId) {
      ensure(
        normalizeOptionalText(data.vault_item_id) ===
          normalizeOptionalText(input.vaultItemId),
        "owner_write_proof_failed:interaction_vault_item_drift",
      );
    }

    if (input.cardPrintId) {
      ensure(
        normalizeOptionalText(data.card_print_id) ===
          normalizeOptionalText(input.cardPrintId),
        "owner_write_proof_failed:interaction_card_print_drift",
      );
    }

    if (typeof input.message === "string") {
      ensure(
        normalizeOptionalText(data.message) === normalizeOptionalText(input.message),
        "owner_write_proof_failed:interaction_message_drift",
      );
    }
  };
}

export function createInteractionSignalProofV1<TResult>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => InteractionSignalProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    const { data, error } = await context.adminClient
      .from("card_signals")
      .select("id")
      .eq("user_id", input.userId ?? context.actorId)
      .eq("card_print_id", input.cardPrintId)
      .eq("signal_type", "interaction")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      throw new Error("owner_write_proof_failed:interaction_signal_missing");
    }
  };
}

export function createImportResultSummaryProofV1<
  TResult extends {
    importedCards: number;
    importedEntries: number;
    needsManualMatch: number;
    skippedRows: number;
  },
>(
  select: (
    context: OwnerWriteProofContextV1<TResult>,
  ) => ImportResultSummaryProofInput | null,
) {
  return async (context: OwnerWriteProofContextV1<TResult>) => {
    const input = select(context);
    if (!input) {
      return;
    }

    ensure(
      context.result.importedCards === input.importedCards,
      "owner_write_proof_failed:imported_cards_drift",
    );
    ensure(
      context.result.importedEntries === input.importedEntries,
      "owner_write_proof_failed:imported_entries_drift",
    );

    if (typeof input.needsManualMatch === "number") {
      ensure(
        context.result.needsManualMatch === input.needsManualMatch,
        "owner_write_proof_failed:needs_manual_match_drift",
      );
    }

    if (typeof input.skippedRows === "number") {
      ensure(
        context.result.skippedRows === input.skippedRows,
        "owner_write_proof_failed:skipped_rows_drift",
      );
    }
  };
}
