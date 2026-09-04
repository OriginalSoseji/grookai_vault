import { corsHeaders, corsJson } from "../_shared/cors.ts";
import { createServiceRoleClient, requireAuthUser } from "../_shared/auth.ts";

const BUCKET = "user-card-images";
const EXPIRES_IN_SECONDS = 60 * 60;
const OBJECT_PATH =
  /^sealed\/mtg\/sha256\/[0-9a-f]{2}\/[0-9a-f]{64}\.(jpg|png|gif|webp)$/;

type SignRequestV1 = {
  storage_bucket?: unknown;
  object_path?: unknown;
};

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return corsJson(405, { error: "method_not_allowed" });
  }

  try {
    const { sb: callerClient } = await requireAuthUser(req);
    const body = await req.json() as SignRequestV1;
    const bucket = typeof body.storage_bucket === "string"
      ? body.storage_bucket.trim()
      : "";
    const objectPath = typeof body.object_path === "string"
      ? body.object_path.trim()
      : "";
    if (bucket !== BUCKET || !OBJECT_PATH.test(objectPath)) {
      return corsJson(400, { error: "invalid_image_reference" });
    }

    const { data: authorized, error: authorizationError } =
      await callerClient.rpc("mtg_sealed_image_object_signing_authorized_v1", {
        p_bucket_id: bucket,
        p_object_name: objectPath,
      });
    if (authorizationError) {
      console.error("[mtg-sealed-sign-image-v1] authorization failed", {
        code: authorizationError.code,
      });
      return corsJson(503, { error: "image_authorization_unavailable" });
    }
    if (authorized !== true) {
      return corsJson(404, { error: "image_not_available" });
    }

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient.storage
      .from(BUCKET)
      .createSignedUrl(objectPath, EXPIRES_IN_SECONDS);
    if (error || typeof data?.signedUrl !== "string" || !data.signedUrl) {
      console.error("[mtg-sealed-sign-image-v1] signing failed", {
        code: error?.name,
      });
      return corsJson(503, { error: "image_signing_unavailable" });
    }

    return corsJson(200, {
      signed_url: data.signedUrl,
      expires_in: EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "internal_error";
    if (code === "missing_bearer_token" || code === "invalid_jwt") {
      return corsJson(401, { error: "unauthorized" });
    }
    console.error("[mtg-sealed-sign-image-v1] request failed", { code });
    return corsJson(500, { error: "internal_error" });
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
