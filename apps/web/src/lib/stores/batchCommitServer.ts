import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createServerComponentClient } from "@/lib/supabase/server";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { STORE_NO_STORE } from "./storefrontServer";
import type { StoreOwner } from "./storefrontTypes";
import type { BatchCommitRequest } from "./batchCommitInput";
import { inventoryId } from "./storeInventoryInput";
import { copyPhotoType, COPY_PHOTO_MAX_BYTES } from "./storeCopyPhoto";
import { buildVaultInstanceMediaStoragePath, VAULT_INSTANCE_MEDIA_BUCKET } from "@/lib/vaultInstanceMedia";
import { storeBatchTarget } from "./storeProductionTarget.mjs";

// Production requires its complete deployment binding as well as DB authorization.
export const batchCommitEnabled = () => process.env.GROOKAI_STORE_BATCH_COMMIT_ENABLED === "true"
  && storeBatchTarget("commit");
export const batchCancellationEnabled = () => process.env.GROOKAI_STORE_BATCH_CANCELLATION_ENABLED === "true"
  && storeBatchTarget("cancel");
export const intakeReply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: STORE_NO_STORE });
export async function intakeContext(request: NextRequest, writing = true) {
  if (writing && request.headers.get("origin") !== getSiteOrigin()) return { response: intakeReply({ error: "Invalid request origin" }, 403) } as const;
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { response: intakeReply({ error: "Sign in required" }, 401) } as const;
  const { data, error } = await client.rpc("vendor_store_owner_v1");
  const owner = data as StoreOwner | null;
  if (error || !owner?.store) return { response: intakeReply({ error: "Store unavailable" }, 403) } as const;
  if (writing && (!owner.capabilities.store_app || !owner.rollout.app_enabled)) return { response: intakeReply({ error: "Store access unavailable. Your saved submission is retained." }, 403) } as const;
  if (writing && !batchCommitEnabled()) return { response: intakeReply({ error: "Batch adding is not enabled here. Your saved draft is unchanged." }, 503) } as const;
  if (writing) {
    const { data: control } = await createServerAdminClient().from("vendor_batch_intake_control").select("enabled").single();
    if (control?.enabled !== true) return { response: intakeReply({ error: "Batch adding is paused. Your saved submission is retained." }, 503) } as const;
  }
  return { client, user, owner } as const;
}
export async function boundedIntakeBody(request: NextRequest, limit: number) {
  const reader = request.body?.getReader();
  if (!reader || Number(request.headers.get("content-length")) > limit) throw new Error("Request is too large or empty.");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw new Error("Request is too large."); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export type IntakeReceipt = { owner_id: string; store_id: string; batch_id: string; item_id: string; instance_id: string; request: BatchCommitRequest; completed_at: string | null };
export async function ownedIntakeReceipt(client: Awaited<ReturnType<typeof createServerComponentClient>>, user: string, store: string, batch: unknown, item: unknown) {
  const { data, error } = await client.from("vendor_batch_intake_receipts").select("owner_id,store_id,batch_id,item_id,instance_id,request,completed_at")
    .eq("owner_id", user).eq("store_id", store).eq("batch_id", inventoryId(batch)).eq("item_id", inventoryId(item)).maybeSingle();
  if (error || !data) throw new Error("Saved submission unavailable. Resume the original batch.");
  if (batchCancellationEnabled()) {
    const cancellation = await client.from("vendor_batch_intake_cancellations").select("item_id")
      .eq("owner_id", user).eq("store_id", store).eq("batch_id", inventoryId(batch)).eq("item_id", inventoryId(item)).maybeSingle();
    if (cancellation.error) throw new Error("Could not check submission status. Try again.");
    if (cancellation.data) throw new Error("This submission was cancelled. Choose Edit & retry to review a new attempt.");
  }
  return data as IntakeReceipt;
}
export async function validateIntakeImage(bytes: Buffer, expected: string) {
  if (!bytes.length || bytes.length > COPY_PHOTO_MAX_BYTES || createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error("Scan differs from the saved submission.");
  const contentType = copyPhotoType(bytes);
  if (!contentType) throw new Error("Choose a JPEG, PNG or WebP scan.");
  const input = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning", animated: true });
  const info = await input.metadata();
  if (!info.width || !info.height || (info.pages ?? 1) !== 1) throw new Error("Choose a single card scan.");
  await input.stats();
  return contentType;
}
export function intakeMediaPath(receipt: IntakeReceipt, side: "front" | "back") {
  return buildVaultInstanceMediaStoragePath(receipt.owner_id, receipt.instance_id, side);
}
export async function verifyIntakeMedia(receipt: IntakeReceipt, side: "front" | "back") {
  const expected = receipt.request[`${side}_sha256`];
  if (!expected) throw new Error("This copy has no saved back scan.");
  const { data, error } = await createServerAdminClient().storage.from(VAULT_INSTANCE_MEDIA_BUCKET)
    .download(intakeMediaPath(receipt, side), { cacheNonce: randomUUID() }, { cache: "no-store" });
  if (error || !data || data.size > COPY_PHOTO_MAX_BYTES) throw new Error("Scan upload is incomplete. Resume this copy.");
  await validateIntakeImage(Buffer.from(await data.arrayBuffer()), expected);
}
export function intakeFailure(error: unknown) {
  return intakeReply({ error: error instanceof Error ? error.message : "Submission could not be confirmed. Resume the saved copy." }, 409);
}
