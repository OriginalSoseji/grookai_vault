import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  summarizeTcgplayerMarketPerformanceV1,
  TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1,
  TCGPLAYER_MARKET_READ_P95_TARGET_MS_V1,
} from "../../backend/pricing/tcgplayer_market_performance_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "read_performance",
);
const AUDIT_VERSION = "TCGPLAYER_MARKET_READ_PERFORMANCE_AUDIT_V1";

function parseArgs(argv) {
  const args = {
    iterations: 30,
    warmups: 3,
    targetP95Ms: TCGPLAYER_MARKET_READ_P95_TARGET_MS_V1,
    outRoot: DEFAULT_OUT_ROOT,
    requirePass: false,
  };
  for (const arg of argv) {
    if (arg.startsWith("--iterations=")) {
      args.iterations = Number(arg.slice("--iterations=".length));
    } else if (arg.startsWith("--warmups=")) {
      args.warmups = Number(arg.slice("--warmups=".length));
    } else if (arg.startsWith("--target-p95-ms=")) {
      args.targetP95Ms = Number(arg.slice("--target-p95-ms=".length));
    } else if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else if (arg === "--require-pass") {
      args.requirePass = true;
    }
  }
  if (!Number.isInteger(args.iterations) || args.iterations < 5) {
    throw new Error("--iterations must be an integer >= 5");
  }
  if (!Number.isInteger(args.warmups) || args.warmups < 0) {
    throw new Error("--warmups must be an integer >= 0");
  }
  if (!Number.isFinite(args.targetP95Ms) || args.targetP95Ms <= 0) {
    throw new Error("--target-p95-ms must be positive");
  }
  return args;
}

function requiredEnvironment() {
  const result = {
    databaseUrl:
      process.env.SUPABASE_DB_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      "",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || "",
  };
  if (!result.databaseUrl) throw new Error("SUPABASE_DB_URL is required");
  if (!result.supabaseUrl) throw new Error("SUPABASE_URL is required");
  if (!result.supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required");
  }
  return result;
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonl(rows) {
  return (
    rows.map((row) => JSON.stringify(row)).join("\n") +
    (rows.length ? "\n" : "")
  );
}

function gitValue(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function take(ids, count) {
  return ids.slice(0, Math.min(ids.length, count));
}

function testCases(parentIds, printingIds) {
  return [
    {
      case_id: "parent_detail_1",
      scope: "parent",
      requested_ids: take(parentIds, 1),
    },
    {
      case_id: "parent_grid_25",
      scope: "parent",
      requested_ids: take(parentIds, 25),
    },
    {
      case_id: "parent_grid_all_current",
      scope: "parent",
      requested_ids: parentIds,
    },
    {
      case_id: "printing_detail_1",
      scope: "card_printing",
      requested_ids: take(printingIds, 1),
    },
    {
      case_id: "printing_batch_50",
      scope: "card_printing",
      requested_ids: take(printingIds, 50),
    },
    {
      case_id: "printing_batch_all_current",
      scope: "card_printing",
      requested_ids: printingIds,
    },
  ].map((testCase) => ({
    ...testCase,
    expected_row_count: testCase.requested_ids.length,
  }));
}

function requestPayload(testCase) {
  return {
    p_card_print_ids:
      testCase.scope === "parent" ? testCase.requested_ids : null,
    p_card_printing_ids:
      testCase.scope === "card_printing" ? testCase.requested_ids : null,
  };
}

async function callRpc(endpoint, key, testCase) {
  const started = performance.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload(testCase)),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();
    const durationMs = performance.now() - started;
    let parsed = null;
    try {
      parsed = body ? JSON.parse(body) : null;
    } catch {
      parsed = null;
    }
    if (!response.ok) {
      return {
        duration_ms: Number(durationMs.toFixed(3)),
        http_status: response.status,
        row_count: 0,
        response_bytes: Buffer.byteLength(body),
        error: {
          code: String(parsed?.code ?? response.status),
          message: String(parsed?.message ?? "RPC request failed").slice(0, 500),
        },
      };
    }
    return {
      duration_ms: Number(durationMs.toFixed(3)),
      http_status: response.status,
      row_count: Array.isArray(parsed) ? parsed.length : 0,
      response_bytes: Buffer.byteLength(body),
      error: null,
    };
  } catch (error) {
    return {
      duration_ms: Number((performance.now() - started).toFixed(3)),
      http_status: null,
      row_count: 0,
      response_bytes: 0,
      error: {
        code: String(error?.cause?.code ?? error?.name ?? "request_error"),
        message: String(error?.message ?? error).slice(0, 500),
      },
    };
  }
}

async function authenticatedExplain(client, testCase) {
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    const parentIds =
      testCase.scope === "parent" ? testCase.requested_ids : null;
    const printingIds =
      testCase.scope === "card_printing" ? testCase.requested_ids : null;
    const readback = await client.query(
      `select *
       from public.get_market_pricing_read_model_v1(
         $1::uuid[],
         $2::uuid[]
       )`,
      [parentIds, printingIds],
    );
    const explain = await client.query(
      `explain (analyze, buffers, format json)
       select *
       from public.get_market_pricing_read_model_v1(
         $1::uuid[],
         $2::uuid[]
       )`,
      [parentIds, printingIds],
    );
    return {
      case_id: testCase.case_id,
      role: "authenticated",
      row_count: readback.rowCount,
      expected_row_count: testCase.expected_row_count,
      plan: explain.rows[0]["QUERY PLAN"],
    };
  } finally {
    await client.query("rollback").catch(() => {});
  }
}

function markdown(runPlan, summary, access) {
  const lines = [
    "# TCGPlayer Market Read Performance V1",
    "",
    `- Audit version: \`${AUDIT_VERSION}\``,
    `- Policy version: \`${TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1}\``,
    `- Commit: \`${runPlan.commit_sha}\``,
    `- Branch: \`${runPlan.branch}\``,
    `- Status: \`${summary.status}\``,
    `- Required p95: \`<= ${summary.target_p95_ms} ms\``,
    `- HTTP credential mode: \`${runPlan.http_credential_mode}\``,
    `- Direct database role proof: \`${access.authenticated_role_readback ? "passed" : "failed"}\``,
    "",
    "The HTTP measurements use the production PostgREST endpoint and the exact",
    "`get_market_pricing_read_model_v1` RPC consumed by web and Flutter. The",
    "stored credential is a service credential, so this is transport/runtime",
    "performance proof rather than an end-user JWT timing claim. The same RPC is",
    "also executed directly under the `authenticated` database role.",
    "",
    "| Case | IDs | p50 ms | p95 ms | p99 ms | Errors | Status |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...summary.cases.map(
      (row) =>
        `| ${row.case_id} | ${row.requested_id_count} | ${row.latency_ms.p50} | ${row.latency_ms.p95} | ${row.latency_ms.p99} | ${row.error_count} | ${row.status} |`,
    ),
    "",
    "## Findings",
    "",
    ...(summary.findings.length
      ? summary.findings.map((finding) => `- \`${finding}\``)
      : ["- none"]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = requiredEnvironment();
  const client = new Client({
    connectionString: env.databaseUrl,
    ssl: sslConfig(env.databaseUrl),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 60_000,
    query_timeout: 60_000,
  });
  await client.connect();
  try {
    const sample = (
      await client.query(
        `select
           current_price.card_print_id,
           current_price.card_printing_id
         from public.v_market_price_current_v1 current_price
         order by current_price.card_print_id,
                  current_price.card_printing_id`,
      )
    ).rows;
    const parentIds = [
      ...new Set(sample.map((row) => row.card_print_id).filter(Boolean)),
    ];
    const printingIds = [
      ...new Set(sample.map((row) => row.card_printing_id).filter(Boolean)),
    ];
    if (!parentIds.length || !printingIds.length) {
      throw new Error("current publication sample is empty");
    }
    const cases = testCases(parentIds, printingIds);
    if (cases.some((testCase) => !testCase.requested_ids.length)) {
      throw new Error("one or more performance cases has no IDs");
    }
    const functionMetadata = (
      await client.query(
        `select
           has_function_privilege(
             'authenticated',
             'public.get_market_pricing_read_model_v1(uuid[], uuid[])',
             'EXECUTE'
           ) as authenticated_execute,
           pg_get_functiondef(
             'public.get_market_pricing_read_model_v1(uuid[], uuid[])'::regprocedure
           ) as function_definition`,
      )
    ).rows[0];
    const runDir = path.join(args.outRoot, stamp());
    await fs.mkdir(runDir, { recursive: true });
    const runPlan = {
      audit_version: AUDIT_VERSION,
      policy_version: TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1,
      commit_sha: gitValue(["rev-parse", "HEAD"]),
      branch: gitValue(["branch", "--show-current"]),
      started_at: new Date().toISOString(),
      endpoint_host: new URL(env.supabaseUrl).host,
      rpc: "get_market_pricing_read_model_v1",
      http_credential_mode: "service_role_transport",
      direct_database_role: "authenticated",
      iterations: args.iterations,
      warmups: args.warmups,
      target_p95_ms: args.targetP95Ms,
      parent_sample_count: parentIds.length,
      printing_sample_count: printingIds.length,
      function_definition_sha256: sha256(
        functionMetadata.function_definition ?? "",
      ),
      cases: cases.map((testCase) => ({
        case_id: testCase.case_id,
        scope: testCase.scope,
        requested_id_count: testCase.requested_ids.length,
        expected_row_count: testCase.expected_row_count,
      })),
      boundaries: {
        database_reads_only: true,
        database_writes: false,
        publication_writes: false,
        mapping_writes: false,
        customer_state_writes: false,
        secrets_persisted: false,
      },
    };
    await fs.writeFile(
      path.join(runDir, "run_plan.json"),
      `${JSON.stringify(runPlan, null, 2)}\n`,
    );

    const endpoint = `${env.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/get_market_pricing_read_model_v1`;
    for (const testCase of cases) {
      for (let index = 0; index < args.warmups; index += 1) {
        const warmup = await callRpc(
          endpoint,
          env.supabaseSecretKey,
          testCase,
        );
        if (warmup.error) {
          throw new Error(
            `warmup failed for ${testCase.case_id}: ${warmup.error.code} ${warmup.error.message}`,
          );
        }
      }
    }

    const measurements = [];
    for (const testCase of cases) {
      for (let index = 0; index < args.iterations; index += 1) {
        measurements.push({
          case_id: testCase.case_id,
          iteration: index + 1,
          ...(await callRpc(endpoint, env.supabaseSecretKey, testCase)),
        });
      }
    }
    const explainPlans = [];
    for (const testCase of cases) {
      explainPlans.push(await authenticatedExplain(client, testCase));
    }
    const summary = summarizeTcgplayerMarketPerformanceV1(
      cases,
      measurements,
      { targetP95Ms: args.targetP95Ms },
    );
    const access = {
      authenticated_execute_granted:
        functionMetadata.authenticated_execute === true,
      authenticated_role_readback: explainPlans.every(
        (row) => row.row_count === row.expected_row_count,
      ),
    };
    if (
      !access.authenticated_execute_granted ||
      !access.authenticated_role_readback
    ) {
      summary.status = "failed";
      summary.findings.push("authenticated_role_proof_failed");
    }
    const sampleIds = {
      parent_card_print_ids: parentIds,
      card_printing_ids: printingIds,
    };
    const files = {
      "sample_ids.json": `${JSON.stringify(sampleIds, null, 2)}\n`,
      "measurements.jsonl": jsonl(measurements),
      "explain_plans.json": `${JSON.stringify(explainPlans, null, 2)}\n`,
      "summary.json": `${JSON.stringify({ ...summary, access }, null, 2)}\n`,
      "REPORT.md": markdown(runPlan, summary, access),
    };
    const hashes = {
      "run_plan.json": sha256(
        await fs.readFile(path.join(runDir, "run_plan.json")),
      ),
    };
    for (const [name, contents] of Object.entries(files)) {
      await fs.writeFile(path.join(runDir, name), contents);
      hashes[name] = sha256(Buffer.from(contents));
    }
    await fs.writeFile(
      path.join(runDir, "artifact_hashes.json"),
      `${JSON.stringify(hashes, null, 2)}\n`,
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          ...summary,
          access,
          artifact_root: path
            .relative(REPO_ROOT, runDir)
            .replace(/\\/g, "/"),
        },
        null,
        2,
      )}\n`,
    );
    if (args.requirePass && summary.status !== "passed") process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[market-read-performance] ${error.stack || error.message}`);
  process.exitCode = 1;
});
