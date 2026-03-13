import type { NormalizedRow } from "@/types/import";

export function validateRows(rows: NormalizedRow[]) {
  const valid: NormalizedRow[] = [];
  const invalid: NormalizedRow[] = [];

  for (const row of rows) {
    if (!row.compareSet || !row.compareNumber || !row.compareName) {
      invalid.push(row);
      continue;
    }

    if ((row.quantity ?? 1) <= 0) {
      invalid.push(row);
      continue;
    }

    valid.push(row);
  }

  return { valid, invalid };
}
