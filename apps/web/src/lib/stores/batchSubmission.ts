import type { BatchItem, IntakeBatch } from "./batchIntake";
import type { BatchCommitRequest } from "./batchCommitInput";

export type BatchSubmission = { request: BatchCommitRequest; front: Blob; back: Blob | null };
export async function freezeBatchSubmission(batch: IntakeBatch, item: BatchItem, list: boolean): Promise<BatchSubmission> {
  if (item.submission) return item.submission;
  const front = batch.assets.find(a => a.id === item.front)?.preview;
  const back = batch.assets.find(a => a.id === item.back)?.preview ?? null;
  if (!front || !item.card || (item.back && !back)) throw new Error("Scan preview unavailable.");
  const hash = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())), x => x.toString(16).padStart(2, "0")).join("");
  return { front, back, request: {
    version: 1, batch_id: batch.id, item_id: item.id, card_id: item.card.id, printing_id: item.printing,
    ...structuredClone(item.settings), list, front_sha256: await hash(front), back_sha256: back ? await hash(back) : null,
  } };
}
// A lost HTTP response must not let a later edit become a second interpretation
// of the same physical copy. Only selection, error and receipt may change.
export function assertSubmittedItemsRetained(previous: IntakeBatch, next: IntakeBatch) {
  for (const item of previous.items.filter(i => i.submission && !i.cancelled)) {
    const retained = next.items.find(i => i.id === item.id);
    const details = (value: BatchItem) => JSON.stringify({ front: value.front, back: value.back, rotation: value.rotation, card: value.card, printing: value.printing, settings: value.settings, confirmed: value.confirmed, requiresBack: value.requiresBack });
    if (!retained?.submission || JSON.stringify(retained.submission.request) !== JSON.stringify(item.submission!.request) ||
        retained.submission.front !== item.submission!.front || retained.submission.back !== item.submission!.back || details(retained) !== details(item)) {
      throw new Error("Resume the pending copy before changing or removing it.");
    }
  }
}

export type BatchCancellation = { batch_id: string; item_id: string } & (
  { cancelled: true; completed: false } | { cancelled: false; completed: true; id: string; gvvi: string }
);
export function reconcileBatchCancellation(batch: IntakeBatch, itemId: string, result: BatchCancellation): IntakeBatch {
  const item = batch.items.find(i => i.id === itemId);
  if (!item?.submission || item.receipt || result.batch_id !== batch.id || result.item_id !== itemId) throw new Error("Submission changed. Reopen this batch.");
  if (result.cancelled === true && result.completed === false) return { ...batch, items: batch.items.map(i => i.id === itemId ? { ...i, cancelled: true, picked: false, error: null } : i) };
  if (result.completed === true && result.cancelled === false && result.id && result.gvvi) return { ...batch, items: batch.items.map(i => i.id === itemId ? { ...i, receipt: { id: result.id, gvvi: result.gvvi }, picked: false, error: null } : i) };
  throw new Error("Cancellation was not confirmed. Resume or try cancelling again.");
}
export function retryCancelledItem(item: BatchItem): BatchItem {
  if (!item.cancelled || item.receipt) throw new Error("Confirm cancellation before editing this attempt.");
  return { ...item, id: crypto.randomUUID(), submission: undefined, cancelled: undefined, receipt: null, confirmed: false, picked: true, error: null };
}
