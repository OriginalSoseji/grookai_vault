export type PublicSetCardOrderRow = {
  id: string;
  number: string | null;
  number_plain: string | null;
};

export const SET_ORDER_CHUNK = 1000;
export const MAX_SET_ORDER_ROWS = 50000;

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function numberTokens(row: PublicSetCardOrderRow) {
  // A denominator is not the card's position. Keep prefixes/suffixes such as
  // TG, OP17- and a intact, and never change the stored printed number.
  const value = (row.number?.trim() || row.number_plain?.trim() || "")
    .normalize("NFKC").split("/")[0].trim().toLowerCase();
  return value.match(/\d+|\D+/g) ?? [];
}

export function comparePublicSetCardOrder(left: PublicSetCardOrderRow, right: PublicSetCardOrderRow) {
  const a = numberTokens(left), b = numberTokens(right);
  if (!a.length || !b.length) return a.length ? -1 : b.length ? 1 : compareText(left.id, right.id);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = a[i], y = b[i];
    let comparison: number;
    if (/^\d+$/.test(x) && /^\d+$/.test(y)) {
      const nx = x.replace(/^0+(?=\d)/, ""), ny = y.replace(/^0+(?=\d)/, "");
      comparison = nx.length - ny.length || compareText(nx, ny);
    } else comparison = compareText(x, y);
    if (comparison) return comparison;
  }
  return a.length - b.length || compareText(left.id, right.id);
}

export async function readPublicSetCardOrderIndex(readPage: (afterId: string | null) => Promise<{
  rows: PublicSetCardOrderRow[];
  count: number | null;
}>) {
  const rows: PublicSetCardOrderRow[] = [];
  let afterId: string | null = null;
  let expected: number | null = null;
  for (;;) {
    const page = await readPage(afterId);
    if (!Number.isSafeInteger(page.count) || page.count === null || page.count < 0 || page.count > MAX_SET_ORDER_ROWS) {
      throw new Error("Invalid or oversized set ordering index");
    }
    expected ??= page.count;
    if (page.count + rows.length !== expected) throw new Error("Set changed during ordering read");
    if (page.rows.length > SET_ORDER_CHUNK || rows.length + page.rows.length > expected) throw new Error("Set ordering count mismatch");
    for (const row of page.rows) {
      if (!row.id || (afterId !== null && row.id <= afterId)) throw new Error("Duplicate or unordered set identity");
      rows.push(row);
      afterId = row.id;
    }
    if (rows.length === expected) return rows.sort(comparePublicSetCardOrder);
    // A server row cap may be lower than our requested chunk. Only the exact
    // count, not a short page, proves the selected set was completely read.
    if (!page.rows.length) throw new Error("Incomplete set ordering index");
  }
}

export function restorePublicSetCardPageOrder<T extends { id: string | null }>(ids: string[], rows: T[]) {
  const byId = new Map(rows.map(row => [row.id, row]));
  if (byId.size !== rows.length || rows.length !== ids.length || ids.some(id => !byId.has(id))) {
    throw new Error("Set page changed after ordering read");
  }
  return ids.map(id => byId.get(id)!);
}

export async function readPublicSetCardPage<T extends { id: string | null }, P>(
  pageIds: readonly string[],
  readMetadata: (ids: string[]) => Promise<T[]>,
  readPrintings: (ids: string[]) => Promise<P[]>,
) {
  const ids = [...pageIds];
  if (ids.length > 500 || new Set(ids).size !== ids.length || ids.some(id => !id)) {
    throw new Error("Invalid set page identities");
  }
  if (!ids.length) return { rows: [] as T[], printingRows: [] as P[] };

  // These reads depend on the selected IDs, not on one another. Keep metadata
  // chunks sequential and let the existing printing reader retain its limits.
  // Settle both branches before failing so no read outlives this page operation.
  const [metadata, printings] = await Promise.allSettled([
    (async () => {
      const rows: T[] = [];
      for (let start = 0; start < ids.length; start += 100) {
        rows.push(...await readMetadata(ids.slice(start, start + 100)));
      }
      return restorePublicSetCardPageOrder(ids, rows);
    })(),
    Promise.resolve().then(() => readPrintings([...ids])),
  ]);
  if (metadata.status === "rejected") throw metadata.reason;
  if (printings.status === "rejected") throw printings.reason;
  return { rows: metadata.value, printingRows: printings.value };
}
