import type { SupabaseClient } from "@supabase/supabase-js";

export type DispositionInput = {
  instanceId: string;
  type: "sale" | "trade";
  salePrice: string;
  counterparty: string;
  tradeReceived: string;
  cashDirection: "none" | "received" | "paid";
  cashAmount: string;
};
export type DispositionReceipt = {
  id: string;
  instanceId: string;
  gvviId: string;
  type: "sale" | "trade";
  counterparty: string | null;
  salePrice: number | null;
  saleCurrency: string | null;
  tradeReceived: string | null;
  cashDirection: "received" | "paid" | null;
  cashAmount: number | null;
  cashCurrency: string | null;
  recordedAt: string;
};
export class DispositionError extends Error {}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = ["instanceId", "type", "salePrice", "counterparty", "tradeReceived", "cashDirection", "cashAmount"];
function money(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new DispositionError("Enter a positive USD amount with at most two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (cents <= BigInt(0) || cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new DispositionError("The amount is outside the supported range.");
  const numeric = Number(value);
  const [wireWhole, wireFraction = ""] = String(numeric).split(".");
  if (wireFraction.length > 2 || BigInt(wireWhole) * BigInt(100) + BigInt(wireFraction.padEnd(2, "0")) !== cents) throw new DispositionError("The amount cannot be represented exactly to cents.");
  return numeric;
}
export function dispositionParams(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DispositionError("Transaction details are invalid.");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== fields.length || fields.some(k => typeof body[k] !== "string") || Object.keys(body).some(k => !fields.includes(k))) throw new DispositionError("Transaction details are invalid.");
  const input = Object.fromEntries(fields.map(k => [k, (body[k] as string).trim()])) as DispositionInput;
  if (!uuid.test(input.instanceId) || !["sale", "trade"].includes(input.type)) throw new DispositionError("Choose an exact copy and a sale or trade.");
  if (input.counterparty.length > 120 || input.tradeReceived.length > 1000 || input.salePrice.length > 20 || input.cashAmount.length > 20) throw new DispositionError("Transaction details are too long.");
  if (!["none", "received", "paid"].includes(input.cashDirection)) throw new DispositionError("Choose whether trade cash was received or paid.");
  if (input.type === "sale" && (input.tradeReceived || input.cashDirection !== "none" || input.cashAmount)) throw new DispositionError("A sale cannot include trade details.");
  if (input.type === "trade" && (input.salePrice || !input.tradeReceived)) throw new DispositionError("Describe what you received in the trade; leave the sale price empty.");
  if (input.cashDirection === "none" && input.cashAmount) throw new DispositionError("Choose whether trade cash was received or paid.");
  return {
    p_instance_id: input.instanceId.toLowerCase(),
    p_disposition_type: input.type,
    p_sale_price_amount: input.type === "sale" ? money(input.salePrice) : null,
    p_sale_price_currency: input.type === "sale" ? "USD" : null,
    p_counterparty_label: input.counterparty || null,
    p_trade_received_description: input.type === "trade" ? input.tradeReceived : null,
    p_trade_cash_direction: input.cashDirection === "none" ? null : input.cashDirection,
    p_trade_cash_amount: input.cashDirection === "none" ? null : money(input.cashAmount),
    p_trade_cash_currency: input.cashDirection === "none" ? null : "USD",
  };
}

export const DISPOSITION_COLUMNS = "id,vault_item_instance_id,gv_vi_id,disposition_type,counterparty_label,sale_price_amount,sale_price_currency,trade_received_description,trade_cash_direction,trade_cash_amount,trade_cash_currency,created_at";
export type DispositionRow = {
  id: string; vault_item_instance_id: string; gv_vi_id: string; disposition_type: "sale" | "trade";
  counterparty_label: string | null; sale_price_amount: number | string | null; sale_price_currency: string | null;
  trade_received_description: string | null; trade_cash_direction: "received" | "paid" | null;
  trade_cash_amount: number | string | null; trade_cash_currency: string | null; created_at: string;
};
export function mapDispositionReceipt(data: DispositionRow): DispositionReceipt {
  return {
    id: data.id, instanceId: data.vault_item_instance_id, gvviId: data.gv_vi_id,
    type: data.disposition_type, counterparty: data.counterparty_label,
    salePrice: data.sale_price_amount === null ? null : Number(data.sale_price_amount), saleCurrency: data.sale_price_currency,
    tradeReceived: data.trade_received_description, cashDirection: data.trade_cash_direction,
    cashAmount: data.trade_cash_amount === null ? null : Number(data.trade_cash_amount), cashCurrency: data.trade_cash_currency,
    recordedAt: data.created_at,
  };
}

export async function readOwnerDisposition(client: SupabaseClient, ownerId: string, instanceId: string): Promise<DispositionReceipt | null> {
  const { data, error } = await client.from("vault_item_instance_dispositions")
    .select(DISPOSITION_COLUMNS).eq("user_id", ownerId).eq("vault_item_instance_id", instanceId).maybeSingle();
  if (error) throw new DispositionError("The transaction receipt could not be loaded. Refresh to check its status.");
  return data ? mapDispositionReceipt(data as DispositionRow) : null;
}

export async function recordOwnerDisposition(client: SupabaseClient, ownerId: string, input: unknown, proofClient: SupabaseClient) {
  const params = dispositionParams(input);
  if (!uuid.test(ownerId)) throw new DispositionError("Sign in required.");
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user || user.id !== ownerId) throw new DispositionError("Sign in required.");
  const readCopy = async () => {
    // Archived instances are hidden by client RLS. The server proof context reads
    // this exact authenticated owner's copy; it never performs the mutation.
    const { data, error } = await proofClient.from("vault_item_instances").select("id,gv_vi_id,archived_at,card_print_id")
      .eq("id", params.p_instance_id).eq("user_id", ownerId).maybeSingle();
    if (error || !data) throw new DispositionError("This copy is unavailable or is no longer in your Vault.");
    return data;
  };
  const copy = await readCopy();
  let result: Record<string, unknown> | null = null;
  let rpcError = false;
  if (!copy.archived_at) {
    const response = await client.rpc("vault_record_exact_instance_disposition_v2", params);
    result = response.data;
    rpcError = Boolean(response.error);
  }
  // Independent owner-scoped readback also resolves a retry after a lost response.
  const receipt = await readOwnerDisposition(client, ownerId, params.p_instance_id);
  const after = await readCopy();
  if (!receipt || !after.archived_at || receipt.gvviId !== copy.gv_vi_id ||
      receipt.type !== params.p_disposition_type || receipt.salePrice !== params.p_sale_price_amount ||
      receipt.saleCurrency !== params.p_sale_price_currency || receipt.counterparty !== params.p_counterparty_label ||
      receipt.tradeReceived !== params.p_trade_received_description || receipt.cashDirection !== params.p_trade_cash_direction ||
      receipt.cashAmount !== params.p_trade_cash_amount || receipt.cashCurrency !== params.p_trade_cash_currency) {
    throw new DispositionError("This transaction could not be confirmed. Refresh to check whether the copy was already archived or recorded.");
  }
  if (!copy.archived_at && !rpcError && (!result || result.archived_instance_id !== copy.id || result.gv_vi_id !== copy.gv_vi_id || result.disposition_id !== receipt.id || result.disposition_type !== receipt.type || typeof result.card_print_id !== "string" || !uuid.test(result.card_print_id) || (copy.card_print_id && result.card_print_id !== copy.card_print_id))) {
    throw new DispositionError("The transaction response could not be confirmed. Refresh to view the saved receipt.");
  }
  return receipt;
}
