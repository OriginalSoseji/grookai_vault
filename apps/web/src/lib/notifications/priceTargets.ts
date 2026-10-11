export type PriceTarget = {
  id: string; revision: string; printingId: string; cardPrintId: string; name: string;
  printingGvId: string; finish: string; amount: string; currency: "USD";
  direction: "at_or_below" | "at_or_above"; enabled: boolean;
  lastCheckedAt: string | null; triggeredAt: string | null;
  reference: null | {amount: string; currency: "USD"; observedAt: string; publishedAt: string; provenanceId: string; publicationSetId: string; runId: string};
};
export type PriceTargets = {version: 1; ownerId: string; editEnabled: boolean; targets: PriceTarget[]};
export type PriceTargetRequest = {requestId: string; id: string; expectedRevision: string; printingId: string; direction: PriceTarget["direction"]; amount: string; currency: "USD"; enabled: boolean};
export type PriceTargetCatalog = {more: boolean; cards: {id: string; gv_id: string; name: string; number: string; set_code: string; printings: {id: string; printing_gv_id: string; finish_label: string}[]}[]};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function priceTargetAmount(value: string) {
  if (typeof value !== "string" || value.length > 1024 || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value) || !/[1-9]/.test(value)) throw Error("Enter a positive USD amount using digits and a decimal point.");
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
}
export function parsePriceTargets(ownerId: string, value: unknown): PriceTargets {
  if (!value || typeof value !== "object") throw Error("Price alerts could not be read.");
  const v = value as PriceTargets;
  if (v.ownerId !== ownerId || v.version !== 1 || typeof v.editEnabled !== "boolean" || !Array.isArray(v.targets) || v.targets.length > 1000) throw Error("Price alerts could not be read.");
  const ids = new Set();
  for (const t of v.targets) {
    if (!t || ![t.id,t.printingId,t.cardPrintId].every(x => typeof x === "string" && uuid.test(x)) || ids.has(t.id) || typeof t.revision !== "string" || !/^[1-9][0-9]{0,18}$/.test(t.revision) || BigInt(t.revision) > 9223372036854775807n || typeof t.enabled !== "boolean" || t.currency !== "USD" || !["at_or_below","at_or_above"].includes(t.direction) || ![t.name,t.printingGvId,t.finish].every(x => typeof x === "string")) throw Error("Price alerts are incomplete.");
    ids.add(t.id); priceTargetAmount(t.amount);
    for (const at of [t.lastCheckedAt,t.triggeredAt]) if (at !== null && (typeof at !== "string" || !Number.isFinite(Date.parse(at)))) throw Error("Price alert dates are incomplete.");
    if (t.reference !== null) {
      if (!t.reference || typeof t.reference !== "object" || Array.isArray(t.reference)) throw Error("Price reference is incomplete.");
      priceTargetAmount(t.reference.amount);
      if (t.reference.currency !== "USD" || ![t.reference.provenanceId,t.reference.publicationSetId,t.reference.runId].every(x => typeof x === "string" && uuid.test(x)) || ![t.reference.observedAt,t.reference.publishedAt].every(x => typeof x === "string" && Number.isFinite(Date.parse(x)))) throw Error("Price reference is incomplete.");
    }
  }
  return v;
}
