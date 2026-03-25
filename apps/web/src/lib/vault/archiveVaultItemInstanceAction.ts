"use server";

import { revalidatePath } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";

type ArchiveVaultItemInstanceRpcRow = {
  archived_instance_id?: string | null;
  gv_vi_id?: string | null;
  card_print_id?: string | null;
  legacy_vault_item_id?: string | null;
  remaining_active_count?: number | string | null;
  bucket_qty?: number | string | null;
  bucket_archived_at?: string | null;
};

export type ArchiveVaultItemInstanceActionResult =
  | {
      ok: true;
      status: "removed";
      submissionKey: number;
      instanceId: string;
      gvviId: string | null;
      message: string;
    }
  | {
      ok: false;
      status: "login-required" | "validation-error" | "error";
      submissionKey: number;
      errorCode?: string;
      message: string;
    };

function normalizeOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalInteger(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function mapArchiveErrorMessage(message: string | null) {
  switch (message) {
    case "instance_id_required":
      return {
        errorCode: "INSTANCE_ID_REQUIRED",
        message: "Exact copy target could not be resolved.",
      };
    case "vault_instance_not_found_or_not_owned":
      return {
        errorCode: "INSTANCE_NOT_FOUND",
        message: "Exact copy could not be found.",
      };
    case "vault_instance_already_archived":
      return {
        errorCode: "INSTANCE_ALREADY_ARCHIVED",
        message: "Exact copy has already been removed from the active vault.",
      };
    case "vault_instance_missing_card_print":
      return {
        errorCode: "INSTANCE_CARD_MISSING",
        message: "Exact copy identity could not be resolved.",
      };
    case "vault_instance_archive_failed":
      return {
        errorCode: "REMOVE_FAILED",
        message: "Exact copy could not be removed.",
      };
    default:
      return {
        errorCode: "REMOVE_FAILED",
        message: "Exact copy could not be removed.",
      };
  }
}

export async function archiveVaultItemInstanceAction(
  _previousState: ArchiveVaultItemInstanceActionResult | null,
  formData: FormData,
): Promise<ArchiveVaultItemInstanceActionResult> {
  const submissionKey = Date.now();
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: "login-required",
      submissionKey,
      errorCode: "UNAUTHENTICATED",
      message: "Sign in required.",
    };
  }

  const instanceId = normalizeOptionalText(formData.get("instance_id"));
  if (!instanceId) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      errorCode: "INSTANCE_ID_REQUIRED",
      message: "Exact copy target could not be resolved.",
    };
  }

  const { data, error } = await client.rpc("vault_archive_exact_instance_v1", {
    p_instance_id: instanceId,
  });

  if (error) {
    const mapped = mapArchiveErrorMessage(normalizeOptionalText(error.message));
    return {
      ok: false,
      status: "error",
      submissionKey,
      errorCode: mapped.errorCode,
      message: mapped.message,
    };
  }

  const archived = (data ?? null) as ArchiveVaultItemInstanceRpcRow | null;
  const gvviId = normalizeOptionalText(archived?.gv_vi_id);
  const cardPrintId = normalizeOptionalText(archived?.card_print_id);
  const remainingActiveCount = normalizeOptionalInteger(archived?.remaining_active_count);
  const bucketQty = normalizeOptionalInteger(archived?.bucket_qty);

  revalidatePath("/vault");
  revalidatePath("/network");
  revalidatePath("/network/inbox");
  revalidatePath("/account");
  revalidatePath("/", "layout");

  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
    revalidatePath(`/gvvi/${gvviId}`);
  }

  const admin = createServerAdminClient();
  const revalidationTasks: Promise<unknown>[] = [];

  if (cardPrintId) {
    revalidationTasks.push(
      Promise.resolve(
        admin
          .from("card_prints")
          .select("gv_id")
          .eq("id", cardPrintId)
          .maybeSingle()
          .then(({ data: cardRow }) => {
            const gvId = normalizeOptionalText(cardRow?.gv_id);
            if (gvId) {
              revalidatePath(`/card/${gvId}`);
            }
          }),
      ),
    );
  }

  revalidationTasks.push(
    Promise.resolve(
      admin
        .from("public_profiles")
        .select("slug")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          const slug = normalizeOptionalText(profile?.slug);
          if (!slug) {
            return;
          }

          revalidatePath(`/u/${slug}`);
          revalidatePath(`/u/${slug}/collection`);
        }),
    ),
  );

  await Promise.all(revalidationTasks);

  const resolvedRemainingCount = remainingActiveCount ?? bucketQty ?? 0;
  const message =
    resolvedRemainingCount > 0
      ? "Exact copy removed from your active vault. History was preserved."
      : "Exact copy removed from your active vault. That grouped card now has no active copies.";

  return {
    ok: true,
    status: "removed",
    submissionKey,
    instanceId,
    gvviId,
    message,
  };
}
