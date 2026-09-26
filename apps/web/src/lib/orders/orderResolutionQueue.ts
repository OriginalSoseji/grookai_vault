import type { SupabaseClient } from "@supabase/supabase-js";
import { acquisitionUuid } from "./orderAcquisitionTypes.ts";
import { readResolutions } from "./orderResolutions.ts";
type Cursor = { created: string; id: string };
export function resolutionQueueCursor(value: string | undefined): Cursor | null {
  if (!value) return null;
  if (value.length > 250 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid review page.");
  const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  if (!cursor || Object.keys(cursor).sort().join(",") !== "created,id" || typeof cursor.id !== "string" || !acquisitionUuid.test(cursor.id) ||
      typeof cursor.created !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(cursor.created) ||
      !Number.isFinite(Date.parse(cursor.created))) throw new Error("Invalid review page.");
  return cursor;
}
export async function readResolutionQueue(client: SupabaseClient, userId: string, makeAdmin: () => SupabaseClient, before?: string) {
  if (!acquisitionUuid.test(userId)) return null;
  const { data: grant, error: grantError } = await client.from("user_entitlements").select("tier,role,features")
    .eq("user_id", userId).eq("is_active", true).maybeSingle();
  if (grantError || grant?.tier !== "founder_admin" || !["founder", "internal"].includes(grant.role) || grant.features?.order_resolution_operator !== true) return null;
  const cursor = resolutionQueueCursor(before);
  let query = makeAdmin().from("vendor_order_resolution_cases").select("id,order_id,created_at")
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(25);
  if (cursor) query = query.or(`created_at.lt.${cursor.created},and(created_at.eq.${cursor.created},id.lt.${cursor.id})`);
  const { data, error } = await query;
  if (error || !Array.isArray(data) || data.length > 25) throw new Error("Resolution reviews are unavailable.");
  const rows = [], seen = new Set<string>();
  for (const row of data) {
    // Recheck current database authorization for each projection. No admin-loaded
    // case payload or participant identity is sent directly to the browser.
    if (!acquisitionUuid.test(row.order_id) || seen.has(row.order_id)) continue;
    seen.add(row.order_id);
    const status = await readResolutions(client, row.order_id);
    if (status?.role !== "operator") continue;
    const latest = status.cases[0]; if (latest) rows.push({ orderId: row.order_id as string, state: latest.state, createdAt: latest.createdAt });
  }
  const last = data.at(-1), next = data.length === 25 && last ? Buffer.from(JSON.stringify({ created: last.created_at, id: last.id })).toString("base64url") : null;
  return { rows, next };
}
