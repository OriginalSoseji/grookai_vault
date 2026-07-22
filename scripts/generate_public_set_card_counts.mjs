import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const outputPath = path.join(
  repoRoot,
  "apps",
  "web",
  "src",
  "lib",
  "publicSetCardCounts.generated.json",
);
const allowStale = process.argv.includes("--allow-stale");
const validateOnly = process.argv.includes("--validate-only");
const PAGE_SIZE = 1000;
const DB_CONNECTION_TIMEOUT_MS = 5_000;
const DB_STATEMENT_TIMEOUT_MS = 30_000;
const API_PAGE_TIMEOUT_MS = 6_000;
const API_TOTAL_TIMEOUT_MS = 45_000;
const MIN_RETAINED_SNAPSHOT_RATIO = 0.95;

async function loadEnvFile(filePath) {
  try {
    const contents = await fs.readFile(filePath, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim().replace(/^export\s+/, "");
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) continue;
      const name = line.slice(0, separatorIndex).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
      if (process.env[name] !== undefined) continue;

      let value = line.slice(separatorIndex + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[name] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await loadEnvFile(path.join(repoRoot, ".env.local"));
await loadEnvFile(path.join(repoRoot, ".env"));

function normalizeSetCode(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function readUsableExistingManifest() {
  try {
    const parsed = JSON.parse(await fs.readFile(outputPath, "utf8"));
    return (
      parsed?.schema_version === 1 &&
      parsed?.counts &&
      typeof parsed.counts === "object" &&
      Object.keys(parsed.counts).length > 0
    )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function countManifestRows(counts) {
  return Object.values(counts).reduce((total, value) => {
    const count = Number(value);
    return total + (Number.isFinite(count) && count >= 0 ? count : 0);
  }, 0);
}

function assertPlausibleSnapshot(counts, existingManifest) {
  const setCodeCount = Object.keys(counts).length;
  const rowCount = countManifestRows(counts);
  if (setCodeCount === 0 || rowCount === 0) {
    throw new Error("Generated public set count manifest was empty.");
  }

  if (!existingManifest) return;
  const existingSetCodeCount = Object.keys(existingManifest.counts).length;
  const existingRowCount = countManifestRows(existingManifest.counts);
  const retainedSetRatio = setCodeCount / existingSetCodeCount;
  const retainedRowRatio = rowCount / existingRowCount;
  if (
    retainedSetRatio < MIN_RETAINED_SNAPSHOT_RATIO ||
    retainedRowRatio < MIN_RETAINED_SNAPSHOT_RATIO
  ) {
    throw new Error(
      `Generated snapshot failed retention guard: set_ratio=${retainedSetRatio.toFixed(3)} row_ratio=${retainedRowRatio.toFixed(3)}`,
    );
  }
}

async function fetchCountsFromDatabase(connectionString) {
  const { default: pg } = await import("pg");
  const { Client } = pg;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
    query_timeout: DB_STATEMENT_TIMEOUT_MS,
    statement_timeout: DB_STATEMENT_TIMEOUT_MS,
  });
  await client.connect();

  try {
    const result = await client.query(`
      select lower(trim(set_code)) as set_code, count(*)::int as card_count
      from public.card_prints
      where gv_id is not null
        and set_code is not null
      group by lower(trim(set_code))
      order by lower(trim(set_code))
    `);

    return {
      counts: Object.fromEntries(
        result.rows.map((row) => [row.set_code, row.card_count]),
      ),
      source:
        "public.card_prints grouped by normalized set_code, filtered to non-null gv_id and set_code",
    };
  } finally {
    await client.end();
  }
}

async function fetchCountsFromPublicApi(url, publishableKey) {
  const counts = {};
  const deadlineAtMs = Date.now() + API_TOTAL_TIMEOUT_MS;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const remainingMs = deadlineAtMs - Date.now();
    if (remainingMs <= 0) {
      throw new Error("Public set count refresh exceeded its total timeout.");
    }
    const requestUrl = new URL("/rest/v1/card_prints", url);
    requestUrl.searchParams.set("select", "set_code");
    requestUrl.searchParams.set("gv_id", "not.is.null");
    requestUrl.searchParams.set("set_code", "not.is.null");
    requestUrl.searchParams.set("order", "id.asc");
    requestUrl.searchParams.set("offset", String(offset));
    requestUrl.searchParams.set("limit", String(PAGE_SIZE));
    const headers = new Headers({
      accept: "application/json",
      apikey: publishableKey,
    });
    headers.set("authorization", `Bearer ${publishableKey}`);
    headers.set("accept-profile", "public");
    const response = await fetch(requestUrl, {
      headers,
      signal: AbortSignal.timeout(
        Math.min(API_PAGE_TIMEOUT_MS, remainingMs),
      ),
    });
    if (!response.ok) {
      throw new Error(
        `Public set count page failed with HTTP ${response.status}.`,
      );
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Public set count page returned a non-array payload.");
    }

    for (const row of data) {
      const code = normalizeSetCode(row.set_code);
      if (code) counts[code] = (counts[code] ?? 0) + 1;
    }

    if (data.length < PAGE_SIZE) break;
  }

  return {
    counts,
    source:
      "build-time paged public.card_prints snapshot, filtered to non-null gv_id and set_code",
  };
}

async function generateManifest() {
  const connectionString =
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL;
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!connectionString && (!url || !publishableKey)) {
    throw new Error(
      "Missing SUPABASE_DB_URL or SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const result = connectionString
    ? await fetchCountsFromDatabase(connectionString)
    : await fetchCountsFromPublicApi(url, publishableKey);
  const { counts } = result;
  const existingManifest = await readUsableExistingManifest();
  assertPlausibleSnapshot(counts, existingManifest);

  const manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    source: result.source,
    set_code_count: Object.keys(counts).length,
    counts: Object.fromEntries(
      Object.entries(counts).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  };
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.rename(temporaryPath, outputPath);
  console.log(
    `[public-set-counts] refreshed ${manifest.set_code_count} set counts`,
  );
}

async function validateExistingManifest() {
  const manifest = await readUsableExistingManifest();
  if (!manifest) {
    throw new Error("Checked-in public set count manifest is missing or invalid.");
  }
  assertPlausibleSnapshot(manifest.counts, null);
  if (manifest.set_code_count !== Object.keys(manifest.counts).length) {
    throw new Error("Checked-in public set count manifest has a stale set count.");
  }
  console.log(
    `[public-set-counts] validated ${manifest.set_code_count} checked-in set counts`,
  );
}

if (validateOnly) {
  await validateExistingManifest();
} else {
  try {
    await generateManifest();
  } catch (error) {
    if (allowStale && (await readUsableExistingManifest())) {
      console.warn(
        `[public-set-counts] refresh failed; using checked-in manifest: ${error instanceof Error ? error.message : String(error)}`,
      );
    } else {
      throw error;
    }
  }
}
