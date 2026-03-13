import type { NormalizedRow } from "@/types/import";

function buildRowKey(row: NormalizedRow) {
  return `${row.compareSet}|${row.compareNumber}|${row.compareName}`;
}

export function collapseRows(rows: NormalizedRow[]): NormalizedRow[] {
  const map = new Map<string, NormalizedRow>();

  for (const row of rows) {
    const quantity = row.quantity ?? 1;
    const key = buildRowKey(row);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...row });
      continue;
    }

    existing.quantity = (existing.quantity ?? 1) + quantity;
  }

  return Array.from(map.values());
}
