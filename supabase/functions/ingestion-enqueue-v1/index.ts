import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { json, requireUser } from "../_shared/auth.ts";
import { getServiceRoleKey } from "../_shared/key_resolver.ts";

type IngestionEnqueueBody = {
  job_type?: unknown;
  payload?: unknown;
};

function isJsonValue(value: unknown): boolean {
  return value !== undefined;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed", detail: "POST required" });
  }

  let userId = "";
  try {
    const auth = await requireUser(req);
    userId = auth.userId;
  } catch (err) {
    const code = (typeof err === "object" && err !== null && "code" in err)
      ? String((err as { code?: unknown }).code ?? "unknown")
      : "unknown";
    if (code === "missing_bearer_token" || code === "invalid_jwt") {
      return json(401, { error: "auth_required" });
    }
    if (code === "server_misconfigured") {
      return json(500, { error: "server_misconfigured" });
    }
    return json(401, { error: "auth_required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL") ?? "";
  const serviceRole = getServiceRoleKey() ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRole) {
    return json(500, { error: "server_misconfigured", detail: "Supabase configuration missing" });
  }

  let body: IngestionEnqueueBody = {};
  try {
    body = (await req.json()) as IngestionEnqueueBody;
  } catch {
    body = {};
  }

  const jobType = typeof body.job_type === "string" ? body.job_type.trim() : "";
  const payload = body.payload;
  const fields: Record<string, string> = {};

  if (!jobType) {
    fields.job_type = "required";
  }
  if (!isJsonValue(payload)) {
    fields.payload = "required";
  }

  if (Object.keys(fields).length > 0) {
    return json(400, {
      error: "invalid_request",
      detail: "Invalid request payload",
      fields,
    });
  }

  const client = createClient(supabaseUrl, serviceRole);
  const { data, error } = await client
    .from("ingestion_jobs")
    .insert({
      job_type: jobType,
      payload,
      status: "pending",
      requester_user_id: userId,
    })
    .select("id, job_type")
    .single();

  if (error || !data) {
    return json(500, { error: "enqueue_failed", detail: error?.message ?? "Failed to enqueue job" });
  }

  return json(201, {
    status: "enqueued",
    job_id: data.id,
    job_type: data.job_type,
  });
};

if (import.meta.main) {
  Deno.serve(handler);
}

export default handler;
