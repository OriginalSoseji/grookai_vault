import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  loadTcgplayerMarketCanaryDefinitionV1,
  tcgplayerMarketCanarySourceKeyV1,
  validateTcgplayerMarketCanaryDefinitionV1,
} from "../../backend/pricing/tcgplayer_market_canary_definition_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const definition = argv
    .find((arg) => arg.startsWith("--definition="))
    ?.slice("--definition=".length)
    .trim();
  if (!definition) throw new Error("--definition is required");
  return { definition: path.resolve(definition) };
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

export function evaluateTcgplayerMarketCanaryContinuityV1(
  definition,
  rows,
) {
  validateTcgplayerMarketCanaryDefinitionV1(definition);
  const rowsBySourceKey = new Map();
  for (const row of rows) {
    const key = tcgplayerMarketCanarySourceKeyV1(row);
    const matches = rowsBySourceKey.get(key) ?? [];
    matches.push(row);
    rowsBySourceKey.set(key, matches);
  }

  const missing = [];
  const duplicate = [];
  const identityMismatches = [];
  for (const printing of definition.printings) {
    const key = tcgplayerMarketCanarySourceKeyV1(printing);
    const matches = rowsBySourceKey.get(key) ?? [];
    if (matches.length === 0) {
      missing.push({
        source_key: key,
        printing_gv_id: printing.printing_gv_id,
      });
      continue;
    }
    if (matches.length > 1) {
      duplicate.push({
        source_key: key,
        printing_gv_id: printing.printing_gv_id,
        row_count: matches.length,
      });
      continue;
    }
    const row = matches[0];
    const mismatches = [
      ["card_print_id", printing.card_print_id],
      ["gv_id", printing.gv_id],
      ["printing_gv_id", printing.printing_gv_id],
      ["finish_key", printing.expected_finish],
    ]
      .filter(([field, expected]) => row[field] !== expected)
      .map(([field, expected]) => ({
        field,
        expected,
        actual: row[field] ?? null,
      }));
    if (mismatches.length) {
      identityMismatches.push({
        source_key: key,
        printing_gv_id: printing.printing_gv_id,
        mismatches,
      });
    }
  }

  const findings = [];
  if (missing.length) findings.push("canary_source_identity_missing");
  if (duplicate.length) findings.push("canary_source_identity_duplicated");
  if (identityMismatches.length) findings.push("canary_identity_drifted");
  return {
    policy_version: "TCGPLAYER_MARKET_CANARY_CONTINUITY_POLICY_V1",
    status: findings.length ? "failed" : "passed",
    canary_id: definition.canary_id,
    expected_count: definition.expected_count,
    candidate_row_count: rows.length,
    exact_source_identity_count:
      definition.expected_count -
      missing.length -
      duplicate.length -
      identityMismatches.length,
    missing,
    duplicate,
    identity_mismatches: identityMismatches,
    findings,
    boundaries: {
      database_reads_only: true,
      database_writes: false,
      publication_activation: false,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }
  const loaded = await loadTcgplayerMarketCanaryDefinitionV1(
    args.definition,
  );
  const printingIds = loaded.definition.printings.map(
    (printing) => printing.card_printing_id,
  );
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 20 * 60 * 1000,
    query_timeout: 20 * 60 * 1000,
  });
  try {
    await client.connect();
    const rows = (
      await client.query(
        `select *
           from public.v_tcgplayer_market_qualification_candidates_v1
          where card_printing_id = any($1::uuid[])
          order by source_product_id, source_subtype_name,
                   source_observation_id`,
        [printingIds],
      )
    ).rows;
    const result = evaluateTcgplayerMarketCanaryContinuityV1(
      loaded.definition,
      rows,
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status !== "passed") process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(`[market-canary-continuity] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
