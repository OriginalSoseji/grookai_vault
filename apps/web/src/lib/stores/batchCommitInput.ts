// The same canonical payload is retained in the browser and checked by the server.
// Image hashes describe the exact derivative bytes, never catalog identity.
export type BatchCommitRequest = {
  version: 1; batch_id: string; item_id: string; card_id: string; printing_id: string;
  condition: string; intent: "hold" | "sell"; amount: string; currency: string;
  sections: string[]; location: string; list: boolean; front_sha256: string; back_sha256: string | null;
};
const uuid = (v: unknown): string => {
  if (typeof v !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) throw new Error("Invalid batch reference.");
  return v.toLowerCase();
};
const digest = (v: unknown): string => {
  if (typeof v !== "string" || !/^[0-9a-f]{64}$/.test(v)) throw new Error("Invalid scan fingerprint.");
  return v;
};
export function parseBatchCommit(value: unknown): BatchCommitRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid batch request.");
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || typeof v.list !== "boolean" || !["hold", "sell"].includes(String(v.intent)) || !["NM", "LP", "MP", "HP", "DMG"].includes(String(v.condition))) throw new Error("Review the copy details.");
  if (typeof v.amount !== "string" || (v.amount !== "" && (!/^\d{1,8}(\.\d{1,2})?$/.test(v.amount) || Number(v.amount) > 99999999))) throw new Error("Enter a valid asking price.");
  if ((v.intent === "sell" && !(Number(v.amount) > 0)) || (v.list && v.intent !== "sell")) throw new Error("Listings need a positive asking price and For sale status.");
  if (typeof v.currency !== "string" || !/^[A-Z]{3}$/.test(v.currency) || typeof v.location !== "string" || v.location.length > 120) throw new Error("Check currency and storage location.");
  if (!Array.isArray(v.sections) || v.sections.length > 50) throw new Error("Invalid sections.");
  const result: BatchCommitRequest = {
    version: 1, batch_id: uuid(v.batch_id), item_id: uuid(v.item_id), card_id: uuid(v.card_id), printing_id: uuid(v.printing_id),
    condition: String(v.condition), intent: v.intent as "hold" | "sell", amount: v.amount === "" ? "" : Number(v.amount).toFixed(2),
    currency: v.currency, sections: [...new Set(v.sections.map(uuid))].sort(), location: v.location, list: v.list,
    front_sha256: digest(v.front_sha256), back_sha256: v.back_sha256 === null ? null : digest(v.back_sha256),
  };
  if (Object.keys(v).some(key => !(key in result))) throw new Error("Unexpected batch field.");
  return result;
}
