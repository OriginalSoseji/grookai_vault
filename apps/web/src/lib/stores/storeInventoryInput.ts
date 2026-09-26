export const COPY_CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;
export const COPY_INTENTS = ["hold", "sell", "trade", "showcase"] as const;
export function inventoryId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid inventory reference.");
  return value;
}
export function inventorySettings(body: Record<string, unknown>) {
  const condition = String(body.condition);
  const intent = String(body.intent) as typeof COPY_INTENTS[number];
  const mode = body.mode;
  const amount = typeof body.amount === "string" ? body.amount.trim() : body.amount;
  const price = Number(amount);
  const currency = String(body.currency).trim().toUpperCase();
  if (!COPY_CONDITIONS.includes(condition as typeof COPY_CONDITIONS[number]) || !COPY_INTENTS.includes(intent)) throw new Error("Choose a condition and sale status.");
  if (mode !== "market" && mode !== "asking") throw new Error("Choose a pricing mode.");
  if (mode === "asking" && ((typeof amount !== "string" && typeof amount !== "number") || amount === "" || !Number.isFinite(price) || price < 0 || price > 99999999 || Math.abs(price * 100 - Math.round(price * 100)) > 0.00001 || !/^[A-Z]{3}$/.test(currency))) throw new Error("Enter a valid asking price with up to two decimal places and a three-letter currency.");
  if (typeof body.selected !== "boolean") throw new Error("Choose whether to list this copy in your store.");
  if (body.selected && (intent !== "sell" || mode !== "asking" || price <= 0)) throw new Error("Store listings need For sale and a positive asking price.");
  if (!Array.isArray(body.sections) || body.sections.length > 50) throw new Error("Invalid sections.");
  return { condition, intent, mode: mode as "market" | "asking", amount: mode === "asking" ? price : null, currency, selected: body.selected, sections: [...new Set(body.sections.map(inventoryId))] };
}
export type InventorySettings = ReturnType<typeof inventorySettings>;
export type CatalogChoice = { id: string; gv_id: string; name: string; number: string; set_code: string; image: string | null; printings: { id: string; printing_gv_id: string | null; finish_label: string }[] };
export type CopyDetails = { id: string; gv_vi_id: string; condition_label: string | null; intent: string; pricing_mode: string; asking_price_amount: number | null; asking_price_currency: string | null; slab_cert_id: string | null; sections: string[]; selected: boolean };
