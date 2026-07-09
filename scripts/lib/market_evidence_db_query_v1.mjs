import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;

export function marketEvidenceDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

export async function marketEvidenceQueryRows(sql) {
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required for DB query execution.");
  }

  const timeoutMs = Number.parseInt(process.env.MEE_DB_QUERY_TIMEOUT_MS ?? "180000", 10);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("MEE_DB_QUERY_TIMEOUT_MS must be a positive integer when set.");
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: timeoutMs,
    statement_timeout: timeoutMs,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(`set statement_timeout = ${timeoutMs}`);
    const result = await client.query(sql);
    return Array.isArray(result) ? result.flatMap((entry) => entry.rows ?? []) : result.rows ?? [];
  } finally {
    await client.end();
  }
}

async function main() {
  const fileIndex = process.argv.indexOf("--file");
  const inlineIndex = process.argv.indexOf("--sql");
  const sql =
    fileIndex !== -1
      ? await readFile(process.argv[fileIndex + 1], "utf8")
      : inlineIndex !== -1
        ? process.argv[inlineIndex + 1]
        : null;

  if (!sql) {
    throw new Error("Usage: node scripts/lib/market_evidence_db_query_v1.mjs --file <path> OR --sql <sql>");
  }

  const rows = await marketEvidenceQueryRows(sql);
  process.stdout.write(`${JSON.stringify({ rows })}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
