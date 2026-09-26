import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCustomImportRows } from "./customProductImport.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type CustomImportReceipt = { id: string; productIds: string[]; createdAt: string };
export class CustomImportError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function importId(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) throw new CustomImportError("Invalid import batch. Start a new import.");
  return value.toLowerCase();
}
function receipt(value: unknown, id: string): CustomImportReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid import receipt");
  const row = value as Record<string, unknown>;
  if (row.id !== id || !Array.isArray(row.product_ids) || row.product_ids.length < 1 || row.product_ids.length > 100 ||
      row.product_ids.some(v => typeof v !== "string" || !uuid.test(v)) || new Set(row.product_ids).size !== row.product_ids.length ||
      typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at))) throw new Error("Invalid import receipt");
  return {id, productIds: row.product_ids as string[], createdAt: row.created_at};
}
async function authenticate(client: SupabaseClient) {
  const {data: {user}, error} = await client.auth.getUser();
  if (error || !user) throw new CustomImportError("Sign in to manage this import.", 401);
}
export async function readCustomImport(client: SupabaseClient, batchId: unknown): Promise<CustomImportReceipt | null> {
  const id = importId(batchId);
  await authenticate(client);
  const {data, error} = await client.from("vendor_store_custom_imports")
    .select("id,product_ids,created_at").eq("id", id).maybeSingle();
  if (error) throw new CustomImportError("Import status could not be loaded. Keep this page to check again.", 503);
  return data ? receipt(data, id) : null;
}
export async function createCustomImport(client: SupabaseClient, value: unknown): Promise<CustomImportReceipt> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== "id,rows") throw new CustomImportError("Invalid import request.");
  const input = value as {id: unknown; rows: unknown}, id = importId(input.id);
  let rows;
  try { rows = normalizeCustomImportRows(input.rows); } catch (error) { throw new CustomImportError((error as Error).message); }
  await authenticate(client);
  const {data, error} = await client.rpc("vendor_store_custom_import_v1", {p_import_id: id, p_rows: rows});
  if (error) {
    if (error.code === "PT409") throw new CustomImportError("This batch already imported different rows. Start a new import for a different file.", 409);
    if (error.code === "42501") throw new CustomImportError("Custom product import requires an active store package and editing access.", 403);
    if (["22023", "23514", "22P02"].includes(error.code)) throw new CustomImportError("No products were imported. Check the product fields and limits.");
    throw new CustomImportError("Import could not be confirmed. Keep this page and check its status before retrying.", 503);
  }
  let saved;
  try { saved = receipt(data, id); } catch { throw new CustomImportError("Import receipt could not be verified. Keep this page and check its status.", 503); }
  if (saved.productIds.length !== rows.length) throw new CustomImportError("Import count could not be verified. Check this batch's status.", 503);
  const verified = await readCustomImport(client, id);
  if (!verified || JSON.stringify(verified) !== JSON.stringify(saved)) throw new CustomImportError("Import readback could not be verified. Check this batch's status.", 503);
  return saved;
}
