"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { createServerComponentClient } from "@/lib/supabase/server";
import { assertAuthenticatedVaultUser } from "@/lib/vault/assertAuthenticatedVaultUser";
import { prepareImportTargets, verifyImportReceipt } from "@/lib/import/importAttempt";
import type { ImportVaultItemsResult, MatchResult, WebImportAttempt, WebImportOutcome } from "@/types/import";

class ImportFailure extends Error {
  constructor(readonly code: "invalid" | "failed" | "conflict" | "unconfirmed") { super(code); }
}

export async function importVaultItemsForUser({ client, userId, rows, requestId = randomUUID() }: {
  client: SupabaseClient; userId: string; rows: MatchResult[]; requestId?: string;
}): Promise<ImportVaultItemsResult> {
  await assertAuthenticatedVaultUser(client, userId);
  let prepared: ReturnType<typeof prepareImportTargets>;
  try { prepared = prepareImportTargets(rows, requestId); }
  catch { throw new ImportFailure("invalid"); }
  const { targets, needsManualMatch } = prepared;
  if (!targets.length) return { importedCards: 0, importedEntries: 0, needsManualMatch, skippedRows: needsManualMatch, requestId };

  // One admitted attempt is one transaction. The SQL owner lock protects its
  // deficit calculation, exact copies, compatibility mirrors and durable receipt.
  return executeOwnerWriteV1<ImportVaultItemsResult>({
    execution_name: "import_vault_items",
    actor_id: userId,
    write: async context => {
      context.setMetadata("import_request_id", requestId);
      const { data, error } = await context.adminClient.rpc("admin_import_vault_receipted_v1", {
        p_user_id: userId, p_request_id: requestId, p_rows: targets,
      });
      if (error) throw new ImportFailure("unconfirmed");
      if (data?.requestId !== requestId) throw new ImportFailure("unconfirmed");
      if (data.success === false) {
        if (data.error === "import_request_conflict") throw new ImportFailure("conflict");
        // A returned terminal failure is persisted outside the rolled-back write
        // subtransaction. Only this confirmed response permits a NEW attempt.
        if (["vault_paused", "import_outcome_unconfirmed"].includes(data.error)) throw new ImportFailure("failed");
        throw new ImportFailure("unconfirmed");
      }
      try { verifyImportReceipt(data, targets, requestId); }
      catch { throw new ImportFailure("unconfirmed"); }
      context.setMetadata("import_receipt", data);
      return { importedCards: data.importedCards, importedEntries: data.importedEntries,
        needsManualMatch, skippedRows: needsManualMatch, requestId };
    },
    proofs: [async ({ getMetadata, result }) => {
      // Validate the owner-bound transaction's saved outcome. A retry must not
      // recreate copies subsequently sold/archived or require current counts to
      // equal a historical receipt's counts.
      const receipt = getMetadata<unknown>("import_receipt");
      verifyImportReceipt(receipt, targets, requestId);
      if (result.requestId !== requestId) throw new ImportFailure("unconfirmed");
    }],
  });
}

export async function importVaultItems(rows: MatchResult[], attempt?: WebImportAttempt): Promise<WebImportOutcome> {
  const client = await createServerComponentClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || (attempt && attempt.ownerId !== user.id)) {
    if (!attempt) throw new Error("Sign in required.");
    return { ok: false, errorCode: "account_changed", message: "Sign in to the account that started this import, then retry." };
  }
  try {
    if (attempt && typeof attempt.requestId !== "string") throw new ImportFailure("invalid");
    const result = await importVaultItemsForUser({ client, userId: user.id, rows, requestId: attempt?.requestId });
    // Stable event identity makes a recovered attempt the same activity, not a
    // new import. Ancillary event/cache outages cannot hide a committed save.
    try {
      await client.rpc("card_events_emit_vault_import_summary_v1", {
        p_user_id: user.id, p_import_run_id: `web_import_${result.requestId}`,
        p_payload: { source: "web_collection_import", import_run_id: `web_import_${result.requestId}`,
          imported_cards: result.importedCards, imported_entries: result.importedEntries,
          needs_manual_match: result.needsManualMatch, skipped_rows: result.skippedRows },
      });
    } catch { /* Ownership outcome is retained in its durable receipt. */ }
    try { revalidatePath("/vault"); revalidatePath("/wall"); revalidatePath("/founder"); } catch { /* Retry returns the committed receipt. */ }
    return { ...result, ok: true };
  } catch (error) {
    const code = error instanceof ImportFailure ? error.code : "unconfirmed";
    const message = code === "failed" ? "This attempt failed and no cards were added. Retry to start a new attempt."
      : code === "invalid" ? "This import has invalid or oversized rows. Review the file and upload it again."
      : code === "conflict" ? "This attempt already exists with different details. Keep the original import and check your Vault."
      : "The save result could not be confirmed. Retry this same import to recover its result safely.";
    // Existing cached clients without attempt support expect failures to throw.
    if (!attempt) throw new Error(message);
    return { ok: false, errorCode: code, message };
  }
}
