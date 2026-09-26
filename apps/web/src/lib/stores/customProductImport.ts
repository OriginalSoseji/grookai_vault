// Shared, dependency-free validation for browser preview and the server import boundary.
// This format creates custom drafts only; no catalog matching or publication fields.
export const CUSTOM_IMPORT_MAX_ROWS = 100;
export const CUSTOM_IMPORT_MAX_BYTES = 1024 * 1024;
export const CUSTOM_IMPORT_TEXT_LIMITS = {
  title: 120, description: 4000, category: 80, franchise: 80, manufacturer: 120,
  release_region: 80, language: 80, condition_description: 500,
  packaging_description: 500, private_sku: 80,
} as const;
export type CustomImportTextField = keyof typeof CUSTOM_IMPORT_TEXT_LIMITS;
export type CustomImportRow = Record<CustomImportTextField, string> & {
  asking_price_amount: number | null; available_quantity: number;
};
export const CUSTOM_IMPORT_COLUMNS = [
  ...Object.keys(CUSTOM_IMPORT_TEXT_LIMITS), "asking_price_amount", "available_quantity",
] as const;
export const CUSTOM_IMPORT_TEMPLATE = CUSTOM_IMPORT_COLUMNS.join(",") + "\r\n";

function fail(row: number, message: string): never {
  throw new Error(`Row ${row}: ${message}`);
}

function csvTable(text: string): string[][] {
  if (new TextEncoder().encode(text).byteLength > CUSTOM_IMPORT_MAX_BYTES) throw new Error("Choose a CSV up to 1 MiB.");
  if (text.includes("\0")) throw new Error("CSV contains a null character.");
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], field = "", state: "start" | "plain" | "quoted" | "closed" = "start";
  const endField = () => {
    row.push(field); field = ""; state = "start";
    if (row.length > CUSTOM_IMPORT_COLUMNS.length) fail(rows.length + 1, "too many columns.");
  };
  const endRow = () => {
    endField();
    if (row.some(cell => cell.trim())) rows.push(row);
    row = [];
    if (rows.length > CUSTOM_IMPORT_MAX_ROWS + 1) throw new Error("Import at most 100 products at a time.");
  };
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (state === "quoted") {
      if (c === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; } else state = "closed";
      } else field += c;
    } else if (c === ",") endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      endRow();
    } else if (state === "closed") fail(rows.length + 1, "unexpected text after a closing quote.");
    else if (c === '"') {
      if (state !== "start") fail(rows.length + 1, "quote inside an unquoted field.");
      state = "quoted";
    } else { field += c; state = "plain"; }
  }
  if (state === "quoted") fail(rows.length + 1, "unclosed quoted field.");
  if (row.length || field || state === "closed") endRow();
  return rows;
}

export function normalizeCustomImportRows(value: unknown): CustomImportRow[] {
  if (!Array.isArray(value) || !value.length || value.length > CUSTOM_IMPORT_MAX_ROWS) throw new Error("Import between 1 and 100 products.");
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > CUSTOM_IMPORT_MAX_BYTES) throw new Error("Import data exceeds 1 MiB.");
  return value.map((input, index) => {
    const rowNumber = index + 2;
    if (!input || typeof input !== "object" || Array.isArray(input)) fail(rowNumber, "invalid product.");
    const row = input as Record<string, unknown>;
    for (const name of Object.keys(row)) if (!(CUSTOM_IMPORT_COLUMNS as readonly string[]).includes(name)) fail(rowNumber, `unknown column ${name}.`);
    const result = {} as CustomImportRow;
    for (const [name, max] of Object.entries(CUSTOM_IMPORT_TEXT_LIMITS)) {
      const raw = row[name] ?? "";
      if (typeof raw !== "string" || raw.includes("\0")) fail(rowNumber, `invalid ${name}.`);
      const text = raw.trim();
      if ([...text].length > max) fail(rowNumber, `${name} exceeds ${max} characters.`);
      result[name as CustomImportTextField] = text;
    }
    if (!result.title) fail(rowNumber, "title is required.");
    const quantity = row.available_quantity;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) fail(rowNumber, "available_quantity must be an integer from 0 to 1000000.");
    result.available_quantity = quantity;
    const price = row.asking_price_amount ?? null;
    if (price !== null && (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 99999999.99 || !/^\d+(?:\.\d{1,2})?$/.test(String(price)))) fail(rowNumber, "asking_price_amount must be a USD amount from 0 to 99999999.99, with at most two decimal places.");
    result.asking_price_amount = price as number | null;
    return result;
  });
}

export function parseCustomProductCsv(text: string): CustomImportRow[] {
  const [rawHeaders, ...rows] = csvTable(text);
  if (!rawHeaders) throw new Error("CSV is empty.");
  const headers = rawHeaders.map(header => header.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error("CSV has duplicate column names.");
  for (const header of headers) if (!(CUSTOM_IMPORT_COLUMNS as readonly string[]).includes(header)) throw new Error(`Unknown column: ${header || "(blank)"}. Use the custom-product template.`);
  if (!headers.includes("title") || !headers.includes("available_quantity")) throw new Error("CSV requires title and available_quantity columns.");
  return normalizeCustomImportRows(rows.map((cells, index) => {
    if (cells.length !== headers.length) fail(index + 2, "column count does not match the header.");
    const row: Record<string, unknown> = Object.fromEntries(headers.map((name, i) => [name, cells[i]]));
    const quantity = String(row.available_quantity).trim();
    if (!/^\d+$/.test(quantity)) fail(index + 2, "available_quantity must be a whole number.");
    row.available_quantity = Number(quantity);
    const price = String(row.asking_price_amount ?? "").trim();
    if (price && !/^\d+(?:\.\d{1,2})?$/.test(price)) fail(index + 2, "use a decimal USD asking_price_amount without currency symbols or separators.");
    row.asking_price_amount = price ? Number(price) : null;
    return row;
  }));
}
