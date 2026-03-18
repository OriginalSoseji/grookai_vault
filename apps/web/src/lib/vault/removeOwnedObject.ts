import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export type RemoveOwnedObjectInput = {
  userId: string;
  mode: "raw" | "slab";
  instanceId: string;
};

export type RemoveOwnedObjectResult =
  | {
      ok: true;
      mode: "raw" | "slab";
      instanceId: string;
    }
  | {
      ok: false;
      errorCode:
        | "UNAUTHENTICATED"
        | "INSTANCE_NOT_FOUND"
        | "INSTANCE_ALREADY_ARCHIVED"
        | "INSTANCE_TYPE_MISMATCH"
        | "REMOVE_FAILED";
      message: string;
    };

type OwnedInstanceRow = {
  id: string;
  archived_at: string | null;
  slab_cert_id: string | null;
};

function formatDbError(error: unknown) {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  const record = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };

  return [
    record.code ? `code=${record.code}` : null,
    record.message ?? null,
    record.details ? `details=${record.details}` : null,
    record.hint ? `hint=${record.hint}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" | ");
}

export async function removeOwnedObject(input: RemoveOwnedObjectInput): Promise<RemoveOwnedObjectResult> {
  const userId = input.userId.trim();
  const instanceId = input.instanceId.trim();

  if (!userId) {
    return {
      ok: false,
      errorCode: "UNAUTHENTICATED",
      message: "Sign in required.",
    };
  }

  if (!instanceId) {
    return {
      ok: false,
      errorCode: "INSTANCE_NOT_FOUND",
      message: "Owned object target could not be resolved.",
    };
  }

  const adminClient = createServerAdminClient();
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("id,archived_at,slab_cert_id")
    .eq("id", instanceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("REMOVE OWNED OBJECT ERROR [lookup]", error);
    return {
      ok: false,
      errorCode: "REMOVE_FAILED",
      message: `REMOVE_FAILED [lookup]: ${formatDbError(error)}`,
    };
  }

  const instance = (data ?? null) as OwnedInstanceRow | null;
  if (!instance) {
    return {
      ok: false,
      errorCode: "INSTANCE_NOT_FOUND",
      message: "Owned object could not be found.",
    };
  }

  if (instance.archived_at) {
    return {
      ok: false,
      errorCode: "INSTANCE_ALREADY_ARCHIVED",
      message: "Owned object has already been archived.",
    };
  }

  const isSlabInstance = Boolean(instance.slab_cert_id);
  if ((input.mode === "raw" && isSlabInstance) || (input.mode === "slab" && !isSlabInstance)) {
    return {
      ok: false,
      errorCode: "INSTANCE_TYPE_MISMATCH",
      message: "Owned object type does not match the requested remove action.",
    };
  }

  const { error: archiveError } = await adminClient
    .from("vault_item_instances")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", instanceId)
    .eq("user_id", userId)
    .is("archived_at", null);

  if (archiveError) {
    console.error("REMOVE OWNED OBJECT ERROR [archive]", archiveError);
    return {
      ok: false,
      errorCode: "REMOVE_FAILED",
      message: `REMOVE_FAILED [archive]: ${formatDbError(archiveError)}`,
    };
  }

  return {
    ok: true,
    mode: input.mode,
    instanceId,
  };
}
