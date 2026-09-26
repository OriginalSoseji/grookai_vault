import type { CatalogChoice } from "./storeInventoryInput";
import type { BatchSubmission } from "./batchSubmission";

export const BATCH_LIMIT = 50;
export const BATCH_FILE_LIMIT = 20 * 1024 * 1024;
export const BATCH_TOTAL_LIMIT = 250 * 1024 * 1024;
export type BatchSettings = { condition: string; intent: "hold" | "sell"; amount: string; currency: string; sections: string[]; location: string };
export type BatchAsset = { id: string; name: string; hash: string; original: Blob; preview: Blob | null; error: string | null };
export type BatchItem = {
  id: string; front: string; back: string | null; requiresBack: boolean; rotation: number;
  card: CatalogChoice | null; printing: string; confirmed: boolean;
  settings: BatchSettings; overridden: boolean; picked: boolean;
  receipt: { id: string; gvvi: string } | null; error: string | null;
  submission?: BatchSubmission;
  cancelled?: boolean;
};
export type IntakeBatch = {
  version: 1; id: string; storeId: string; revision: number; name: string;
  layout: "front" | "pairs"; defaults: BatchSettings; assets: BatchAsset[];
  items: BatchItem[]; updatedAt: string;
  storageEpoch?: string;
};
export const defaultBatchSettings = (): BatchSettings => ({ condition: "NM", intent: "hold", amount: "", currency: "USD", sections: [], location: "" });
export function newIntakeBatch(storeId: string): IntakeBatch {
  return { version: 1, id: crypto.randomUUID(), storeId, revision: 0, name: "New scan batch", layout: "front", defaults: defaultBatchSettings(), assets: [], items: [], updatedAt: new Date().toISOString() };
}
export function naturalFileOrder<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }));
}
export function pairAssets(assets: BatchAsset[], layout: IntakeBatch["layout"], defaults: BatchSettings): BatchItem[] {
  const step = layout === "pairs" ? 2 : 1;
  if (Math.ceil(assets.length / step) > BATCH_LIMIT) throw new Error(`Use at most ${BATCH_LIMIT} copies per batch.`);
  return assets.filter((_, i) => i % step === 0).map((asset, i) => ({
    id: crypto.randomUUID(), front: asset.id, back: step === 2 ? assets[i * step + 1]?.id ?? null : null, requiresBack: step === 2,
    rotation: 0, card: null, printing: "", confirmed: false, settings: structuredClone(defaults),
    overridden: false, picked: true, receipt: null, error: null,
  }));
}
export function itemProblem(batch: IntakeBatch, item: BatchItem): string | null {
  if (item.cancelled) return "Submission cancelled. Edit & retry to review a new attempt.";
  const front = batch.assets.find(a => a.id === item.front);
  const back = batch.assets.find(a => a.id === item.back);
  if (!front?.preview) return front?.error || "Front image needs attention.";
  if ((item.requiresBack ?? batch.layout === "pairs") && !item.back) return "Missing back. Attach a back or mark this copy front-only.";
  if (item.back && !back?.preview) return back?.error || "Back image needs attention.";
  if (!item.card) return "Choose the matching catalog card.";
  if (!item.card.printings.some(p => p.id === item.printing && p.printing_gv_id)) return "Choose an eligible finish.";
  if (!item.confirmed) return "Review and confirm this copy.";
  return settingsProblem(item.settings);
}
export function settingsProblem(settings: BatchSettings): string | null {
  if (!["NM", "LP", "MP", "HP", "DMG"].includes(settings.condition)) return "Choose a condition.";
  if (!["hold", "sell"].includes(settings.intent)) return "Choose a sale status.";
  if (!/^[A-Z]{3}$/.test(settings.currency)) return "Enter a three-letter currency.";
  if (settings.location.length > 120) return "Storage location must be 120 characters or fewer.";
  if (settings.sections.length > 50) return "Choose at most 50 sections.";
  if (settings.amount !== "" && (!/^\d+(\.\d{1,2})?$/.test(settings.amount) || Number(settings.amount) > 99999999)) return "Enter a valid asking price with up to two decimal places.";
  if (settings.intent === "sell" && !(Number(settings.amount) > 0)) return "For-sale copies need a positive asking price.";
  return null;
}
export function applyBatchDefaults(batch: IntakeBatch, replaceOverrides: boolean): IntakeBatch {
  const problem = settingsProblem(batch.defaults);
  if (problem) throw new Error(problem);
  return { ...batch, items: batch.items.map(item => item.picked && !item.receipt && !item.submission && (!item.overridden || replaceOverrides)
    ? { ...item, settings: structuredClone(batch.defaults), overridden: false, confirmed: false, error: null } : item) };
}
export function selectBatchMatch(item: BatchItem, card: CatalogChoice): BatchItem {
  if (item.submission) throw new Error("Resume this copy's saved submission before editing it.");
  return { ...item, card, printing: "", confirmed: false, error: null };
}
export function commitSelection(batch: IntakeBatch, list: boolean): BatchItem[] {
  const selected = batch.items.filter(item => item.picked && !item.receipt && !item.cancelled);
  if (!selected.length) throw new Error("Select at least one unfinished copy.");
  for (const item of selected) {
    if (item.submission) continue; // Always resume its immutable saved request.
    const problem = itemProblem(batch, item);
    if (problem) throw new Error(`${item.card?.name || "Copy"}: ${problem}`);
    if (list && item.settings.intent !== "sell") throw new Error("Only for-sale copies can be listed. Update the selected copies first.");
  }
  return selected;
}
