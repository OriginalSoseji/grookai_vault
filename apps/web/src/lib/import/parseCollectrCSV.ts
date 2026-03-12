import type { ParsedRow } from "@/types/import";

type ColumnMap = {
  productName: string;
  set: string;
  number: string;
  condition?: string;
  quantity?: string;
  averageCost?: string;
  dateAdded?: string;
  notes?: string;
};

const EXCLUDED_NAME_HEADERS = new Set([
  "portfolio name",
  "collection name",
  "folder name",
  "list name",
]);

const SAFE_PRODUCT_NAME_HEADERS = [
  "product name",
  "card name",
];

function parseCsvTable(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue);
  if (currentRow.some((value) => value.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function findHeader(headers: string[], matchers: string[]) {
  return headers.find((header) => {
    const normalized = normalizeHeader(header);
    return matchers.some((matcher) => normalized.includes(matcher));
  });
}

function findProductNameHeader(headers: string[]) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  const exactMatch = normalizedHeaders.find((header) => header.normalized === "product name");
  if (exactMatch) {
    return exactMatch.original;
  }

  const safeMatches = normalizedHeaders.filter(
    (header) =>
      SAFE_PRODUCT_NAME_HEADERS.includes(header.normalized) &&
      !EXCLUDED_NAME_HEADERS.has(header.normalized),
  );

  if (safeMatches.length === 1) {
    return safeMatches[0].original;
  }

  if (safeMatches.length > 1) {
    throw new Error("This CSV contains multiple possible product-name columns. Keep the original Collectr Product Name column and remove ambiguity.");
  }

  throw new Error("This CSV is missing the required Product Name column.");
}

function buildColumnMap(headers: string[]): ColumnMap {
  const productName = findProductNameHeader(headers);
  const set = findHeader(headers, ["set", "series"]);
  const number = findHeader(headers, ["card number", "number"]);

  if (!productName || !set || !number) {
    throw new Error("This CSV is missing one or more required Collectr columns: Product Name, Set, or Card Number.");
  }

  return {
    productName,
    set,
    number,
    condition: findHeader(headers, ["card condition", "condition"]),
    quantity: findHeader(headers, ["quantity", "qty"]),
    averageCost: findHeader(headers, ["average cost", "cost"]),
    dateAdded: findHeader(headers, ["date added", "added"]),
    notes: findHeader(headers, ["notes", "comment"]),
  };
}

export function parseCollectrCSV(csvText: string): ParsedRow[] {
  const table = parseCsvTable(csvText);
  if (table.length < 2) {
    throw new Error("This CSV does not contain any collection rows.");
  }

  const headers = table[0].map((header) => header.trim());
  const columnMap = buildColumnMap(headers);

  return table.slice(1).map((cells, rowIndex) => {
    const raw = headers.reduce<Record<string, string>>((record, header, headerIndex) => {
      record[header] = (cells[headerIndex] ?? "").trim();
      return record;
    }, {});

    return {
      sourceRow: rowIndex + 2,
      rawName: raw[columnMap.productName] ?? "",
      rawSet: raw[columnMap.set] ?? "",
      rawNumber: raw[columnMap.number] ?? "",
      rawCondition: columnMap.condition ? raw[columnMap.condition] ?? "" : "",
      rawQuantity: columnMap.quantity ? raw[columnMap.quantity] ?? "" : "",
      rawCost: columnMap.averageCost ? raw[columnMap.averageCost] ?? "" : "",
      rawDate: columnMap.dateAdded ? raw[columnMap.dateAdded] ?? "" : "",
      rawNotes: columnMap.notes ? raw[columnMap.notes] ?? "" : "",
    } satisfies ParsedRow;
  });
}
