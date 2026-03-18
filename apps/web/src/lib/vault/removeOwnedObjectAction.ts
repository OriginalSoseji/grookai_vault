"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import { removeOwnedObject } from "@/lib/vault/removeOwnedObject";

export type RemoveOwnedObjectActionResult =
  | {
      ok: true;
      status: "removed";
      mode: "raw" | "slab";
      message: string;
      submissionKey: number;
    }
  | {
      ok: false;
      status: "login-required" | "error";
      errorCode?: string;
      message: string;
      submissionKey: number;
    };

export async function removeOwnedObjectAction(
  _previousState: RemoveOwnedObjectActionResult | null,
  formData: FormData,
): Promise<RemoveOwnedObjectActionResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const submissionKey = Date.now();

  if (!user) {
    return {
      ok: false,
      status: "login-required",
      message: "Sign in required.",
      submissionKey,
    };
  }

  const modeValue = typeof formData.get("mode") === "string" ? String(formData.get("mode")).trim() : "";
  const instanceId = typeof formData.get("instance_id") === "string" ? String(formData.get("instance_id")).trim() : "";
  if ((modeValue !== "raw" && modeValue !== "slab") || !instanceId) {
    return {
      ok: false,
      status: "error",
      errorCode: "INSTANCE_NOT_FOUND",
      message: "Owned object target could not be resolved.",
      submissionKey,
    };
  }

  const result = await removeOwnedObject({
    userId: user.id,
    mode: modeValue,
    instanceId,
  });

  if (!result.ok) {
    return {
      ok: false,
      status: "error",
      errorCode: result.errorCode,
      message: result.message,
      submissionKey,
    };
  }

  revalidatePath("/vault");

  return {
    ok: true,
    status: "removed",
    mode: result.mode,
    message: result.mode === "raw" ? "Raw card removed." : "Slab removed.",
    submissionKey,
  };
}
