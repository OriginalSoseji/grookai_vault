import type { NormalizedRow } from "@/types/import";

function buildRowKey(row: NormalizedRow) {
  return `${row.compareSet}|${row.compareNumber}|${row.compareName}`;
}

export function reconcileVaultQuantities(rows: NormalizedRow[], existingVault: Record<string, number>) {
  const result: NormalizedRow[] = [];

  for (const row of rows) {
    const key = buildRowKey(row);
    const existingQty = existingVault[key] ?? 0;
    const desiredQty = row.quantity ?? 1;
    const delta = desiredQty - existingQty;

    if (delta <= 0) {
      continue;
    }

    result.push({
      ...row,
      quantity: delta,
    });
  }

  return result;
}
