import type { CollectionPreviewV2 } from "./collectionPreviewV2";

// Choices come from the authenticated preview, never from free-text card IDs.
// Saving independently rechecks every original source field and exact printing.
export function chooseCollectionReviewCandidate(preview: CollectionPreviewV2, sourceIndices: number[], cardId: string | null): CollectionPreviewV2 {
  const key = JSON.stringify(sourceIndices);
  const row = preview.rows.find(row => JSON.stringify(row.sourceIndices) === key);
  if (!row?.review) throw new Error("This row has no catalog choices. Refresh its preview.");
  const candidate = cardId === null ? null : row.review.candidates.find(candidate => candidate.cardId === cardId);
  if (cardId !== null && (!candidate?.selection || JSON.stringify(candidate.selection.sourceIndices) !== key)) {
    throw new Error("This printing cannot be confirmed. Keep the row for review.");
  }
  const rows = preview.rows.map(current => current !== row ? current : {
    ...row,
    selection: candidate?.selection ? { ...candidate.selection, sourceIndices: [...sourceIndices] } : null,
    reason: candidate ? null : row.review!.reason,
    matchedName: candidate?.name ?? null, finish: candidate?.finish ?? null,
    review: { ...row.review!, selectedCardId: candidate?.cardId ?? null },
  });
  const selected = rows.filter(row => row.selection !== null);
  const readyRows = selected.reduce((sum, row) => sum + row.sourceIndices.length, 0);
  const readyCopies = selected.reduce((sum, row) => sum + (row.quantity ?? 0), 0);
  if (readyCopies > 50000) throw new Error("This selection exceeds the 50,000-copy import limit.");
  return { ...preview, rows, readyRows, readyCopies, reviewRows: preview.sourceRows - readyRows };
}
