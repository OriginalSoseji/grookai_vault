import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Client } = pg;

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
const PAGE_SIZE = 1000;
const DB_CONNECTION_TIMEOUT_MS = 5_000;
const DB_STATEMENT_TIMEOUT_MS = 30_000;
const API_PAGE_TIMEOUT_MS = 6_000;
const API_TOTAL_TIMEOUT_MS = 45_000;
const MIN_RETAINED_SNAPSHOT_RATIO = 0.95;

dotenv.config({ path: path.join(repoRoot, ".env.local"), quiet: true });
dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });

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
  const supabase = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const counts = {};
  const deadlineAtMs = Date.now() + API_TOTAL_TIMEOUT_MS;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const remainingMs = deadlineAtMs - Date.now();
    if (remainingMs <= 0) {
      throw new Error("Public set count refresh exceeded its total timeout.");
    }
    const { data, error } = await supabase
      .from("card_prints")
      .select("set_code")
      .not("gv_id", "is", null)
      .not("set_code", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
      .abortSignal(
        AbortSignal.timeout(Math.min(API_PAGE_TIMEOUT_MS, remainingMs)),
      );

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      const code = normalizeSetCode(row.set_code);
      if (code) counts[code] = (counts[code] ?? 0) + 1;
    }

    if ((data ?? []).length < PAGE_SIZE) break;
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
