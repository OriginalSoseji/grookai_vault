import type { SupabaseClient } from "@supabase/supabase-js";
import { DISPOSITION_COLUMNS, mapDispositionReceipt, type DispositionRow } from "./vaultDisposition.ts";

export const HISTORY_LIMIT = 30;
type Cursor = { at: string; id: string };
export type HistoryFilters = { query: string; field: "gvvi" | "counterparty"; type: "all" | "sale" | "trade"; after: string };
export const EMPTY_HISTORY_FILTERS: HistoryFilters = { query: "", field: "gvvi", type: "all", after: "" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function decodeHistoryCursor(value: string): Cursor {
  try {
    if (!/^[A-Za-z0-9_-]{1,240}$/.test(value)) throw new Error();
    const bytes = Buffer.from(value, "base64url");
    if (bytes.toString("base64url") !== value) throw new Error();
    const cursor = JSON.parse(bytes.toString("utf8"));
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor) || Object.keys(cursor).sort().join(",") !== "at,id" || typeof cursor.at !== "string" || typeof cursor.id !== "string" || !uuid.test(cursor.id)) throw new Error();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(cursor.at) || new Date(cursor.at).toISOString().slice(0,19) !== cursor.at.slice(0,19)) throw new Error();
    // Preserve PostgreSQL microseconds; Date.toISOString would truncate the cursor.
    return { at: cursor.at, id: cursor.id.toLowerCase() };
  } catch { throw new Error("This history page link is invalid. Start from the newest receipts."); }
}
export function historyCursor(at: string, id: string) {
  const encoded = Buffer.from(JSON.stringify({ at, id })).toString("base64url");
  decodeHistoryCursor(encoded);
  return encoded;
}
export function historyFilters(raw: Record<string, string | string[] | undefined>): HistoryFilters {
  if (Object.keys(raw).some(k => !["q", "field", "type", "after"].includes(k)) || Object.values(raw).some(v => v !== undefined && typeof v !== "string")) throw new Error("History filters are invalid.");
  const query = ((raw.q as string | undefined) ?? "").trim();
  const field = raw.field || "gvvi", type = raw.type || "all", after = (raw.after as string | undefined) || "";
  if (query.length > 120 || !["gvvi", "counterparty"].includes(String(field)) || !["all", "sale", "trade"].includes(String(type))) throw new Error("History filters are invalid.");
  if (after) decodeHistoryCursor(after);
  return { query, field: field as HistoryFilters["field"], type: type as HistoryFilters["type"], after };
}
export function historyHref(filters: HistoryFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.field !== "gvvi") params.set("field", filters.field);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.after) params.set("after", filters.after);
  return `/vault/transactions${params.size ? `?${params}` : ""}`;
}
export function literalHistoryPattern(query: string) {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}
export async function readDispositionHistory(client: SupabaseClient, filters: HistoryFilters) {
  const normalized = historyFilters({q: filters.query, field: filters.field, type: filters.type, after: filters.after});
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw new Error("Sign in to view your transaction history.");
  let query = client.from("vault_item_instance_dispositions").select(DISPOSITION_COLUMNS).eq("user_id", user.id);
  if (normalized.type !== "all") query = query.eq("disposition_type", normalized.type);
  if (normalized.query) query = query.ilike(normalized.field === "gvvi" ? "gv_vi_id" : "counterparty_label", literalHistoryPattern(normalized.query));
  if (normalized.after) {
    const cursor = decodeHistoryCursor(normalized.after);
    query = query.or(`created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(HISTORY_LIMIT + 1);
  if (error) throw new Error("Transaction history could not be loaded. Try again.");
  const rows = (data ?? []) as DispositionRow[];
  const items = rows.slice(0, HISTORY_LIMIT).map(mapDispositionReceipt);
  const last = items.at(-1);
  return { items, next: rows.length > HISTORY_LIMIT && last ? historyCursor(last.recordedAt, last.id) : null };
}
