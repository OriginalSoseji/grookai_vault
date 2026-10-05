import { field, parseCsv } from "../../../../../supabase/functions/vault-import-collection-v2/source.ts";
import type { CollectionPreviewRow, CollectionPreviewV2 } from "./collectionPreviewV2";

export const reviewGroups = [
  { id: "choices", label: "Choose a match" },
  { id: "graded", label: "Graded cards" },
  { id: "sealed", label: "Sealed product details" },
  { id: "number", label: "Missing card number" },
  { id: "edition", label: "Verify edition" },
  { id: "finish", label: "Verify finish" },
  { id: "other", label: "Catalog or source review" },
] as const;
export type ReviewGroup = typeof reviewGroups[number]["id"];

// Groups describe the next review task, never eligibility or a catalog match.
// A row may have further issues; its original reason and fields stay visible.
export function collectionReviewGroup(row: CollectionPreviewRow): ReviewGroup | null {
  if (row.selection || row.sealedSelection) return null;
  if (row.review) return "choices";
  const grade = field(row.source, "grade").trim().toLowerCase();
  if (grade && grade !== "ungraded") return "graded";
  if (row.sealedStatus) return "sealed";
  if (!field(row.source, "card number", "number").trim()) return "number";
  if (row.reason === "The edition must be verified before saving this card.") return "edition";
  if (row.reason === "This finish needs review; it will not be replaced with another finish.") return "finish";
  return "other";
}

export function collectionReviewCounts(preview: CollectionPreviewV2) {
  const counts: Record<ReviewGroup, number> = { choices: 0, graded: 0, sealed: 0, number: 0, edition: 0, finish: 0, other: 0 };
  for (const row of preview.rows) {
    const group = collectionReviewGroup(row);
    if (group) counts[group] += row.sourceIndices.length;
  }
  return counts;
}

export function filterCollectionRows(preview: CollectionPreviewV2, filter: "all" | "ready" | "review", group: ReviewGroup | "all", query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return preview.rows.filter(row => {
    if (filter === "ready" && !(row.selection || row.sealedSelection) || filter === "review" && (row.selection || row.sealedSelection)) return false;
    if (filter === "review" && group !== "all" && collectionReviewGroup(row) !== group) return false;
    const searchable = [...row.sourceRecords.flatMap(record => Object.values(record)), row.matchedName, row.finish, row.reason].join(" ").toLocaleLowerCase();
    return terms.every(term => searchable.includes(term));
  });
}

// Always export ALL unresolved source rows, independently of UI filters/paging.
// Read the original CSV so ordering and every field value survive grouped rows.
export function collectionReviewCsv(preview: CollectionPreviewV2, originalCsv: string): string {
  const source = parseCsv(originalCsv);
  const seen = new Set<number>(), unresolved = new Set<number>();
  if (source.length !== preview.sourceRows) throw new Error("The original file and preview no longer agree. Refresh the preview before downloading.");
  for (const row of preview.rows) {
    if (row.sourceIndices.length !== row.sourceRecords.length) throw new Error("The preview is incomplete. Refresh it before downloading.");
    row.sourceIndices.forEach((index, position) => {
      const record = row.sourceRecords[position];
      if (!Number.isInteger(index) || !source[index] || seen.has(index) ||
          Object.keys(source[index]).length !== Object.keys(record).length ||
          Object.entries(source[index]).some(([key, value]) => record[key] !== value)) {
        throw new Error("The original file and preview no longer agree. Refresh the preview before downloading.");
      }
      seen.add(index);
      if (!(row.selection || row.sealedSelection)) unresolved.add(index);
    });
  }
  if (seen.size !== source.length || unresolved.size !== preview.reviewRows) throw new Error("The preview is incomplete. Refresh it before downloading.");
  if (!unresolved.size) throw new Error("There are no review rows to download.");
  const headers = Object.keys(source[0]);
  const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [headers, ...source.flatMap((record, index) => unresolved.has(index) ? [headers.map(key => record[key])] : [])]
    .map(values => values.map(cell).join(",")).join("\r\n") + "\r\n";
}
