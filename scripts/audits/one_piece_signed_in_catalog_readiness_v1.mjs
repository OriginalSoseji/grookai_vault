import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_EXPECTED_COUNTS_V1,
  ONE_PIECE_GAME_ID_V1,
  ONE_PIECE_SIGNED_IN_CATALOG_READINESS_VERSION_V1,
  buildOnePieceSignedInCatalogReadinessReportV1,
  evaluateOnePieceSignedInCatalogReadinessV1,
} from "../../backend/pricing/one_piece_signed_in_catalog_readiness_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const EXPECTED_BRANCH = "agent/one-piece-ingestion-readiness-v1";
const POINTER_PLAN_FINGERPRINT =
  "22f2b56070e43392c38ea33c4ad06f0013707e5e1eafb672b965cfee868388a4";
const POINTER_PAYLOAD_FINGERPRINT =
  "dad6ab8990ff38f2b72816a6aea72188d38ca974137c44a65598d1b9624ea82a";

function value(argv, name) {
  return (
    argv
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? ""
  );
}

function parseArgs(argv) {
  return {
    envFile: path.resolve(
      value(argv, "env-file") || "C:\\grookai_vault\\.env.local",
    ),
    expectedCommit: value(argv, "expected-commit"),
    outDir: value(argv, "out-dir")
      ? path.resolve(value(argv, "out-dir"))
      : path.join(
          ROOT,
          "docs",
          "audits",
          "pricing",
          "one_piece_signed_in_catalog_readiness_v1",
          new Date().toISOString().replace(/[:.]/g, "-"),
        ),
  };
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]),
  );
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function captureServiceState(client) {
  const result = await client.query(
    `select jsonb_build_object(
       'release_control', (
         select to_jsonb(control)
         from public.catalog_game_release_controls control
         where control.game_code = 'one_piece'
       ),
       'counts', jsonb_build_object(
         'games', (select count(*) from public.games where code = 'one_piece'),
         'sets', (select count(*) from public.sets where game = 'one_piece'),
         'card_prints', (
           select count(*) from public.card_prints where game_id = $1::uuid
         ),
         'card_print_identity', (
           select count(*)
           from public.card_print_identity identity_row
           join public.card_prints card on card.id = identity_row.card_print_id
           where card.game_id = $1::uuid and identity_row.is_active
         ),
         'card_printings', (
           select count(*)
           from public.card_printings printing
           join public.card_prints card on card.id = printing.card_print_id
           where card.game_id = $1::uuid
         ),
         'self_hosted_images', (
           select count(*)
           from public.card_prints
           where game_id = $1::uuid
             and image_status = 'exact'
             and image_source = 'identity'
             and image_path like 'one-piece/card-prints/%'
             and image_url like '%/storage/v1/object/public/external-card-images/one-piece/card-prints/%'
         ),
         'image_coverage_gaps', (
           select count(*)
           from public.card_prints
           where game_id = $1::uuid
             and image_url is null
             and image_path is null
             and image_hash is null
         )
       ),
       'catalog_fingerprint', (
         select md5(coalesce(string_agg(
           concat_ws('|', card.id::text, card.gv_id, card.name, card.set_code,
             card.number, coalesce(card.image_url, ''), coalesce(card.image_path, ''),
             coalesce(card.image_hash, ''), coalesce(card.image_status, ''),
             coalesce(card.image_source, '')),
           E'\\n' order by card.id
         ), ''))
         from public.card_prints card where card.game_id = $1::uuid
       ),
       'non_one_piece_fingerprint', (
         select md5(coalesce(string_agg(
           concat_ws('|', card.id::text, card.gv_id, coalesce(card.image_url, ''),
             coalesce(card.image_path, ''), coalesce(card.image_hash, ''),
             coalesce(card.image_status, ''), coalesce(card.image_source, '')),
           E'\\n' order by card.id
         ), ''))
         from public.card_prints card where card.game_id <> $1::uuid
       )
     ) as value`,
    [ONE_PIECE_GAME_ID_V1],
  );
  const state = result.rows[0].value;
  return {
    ...state,
    release_fingerprint: sha256(
      JSON.stringify(stable(state.release_control)),
    ),
  };
}

async function setClientRole(client, role) {
  if (!new Set(["anon", "authenticated"]).has(role)) {
    throw new Error(`Unsupported role: ${role}`);
  }
  if (role === "anon") {
    await client.query("set local role anon");
  } else {
    await client.query("set local role authenticated");
  }
  await client.query(
    "select set_config('request.jwt.claim.role', $1, true)",
    [role],
  );
}

async function resetClientRole(client) {
  await client.query("reset role");
}

async function captureClientVisibility(client, role, sample) {
  await setClientRole(client, role);
  try {
    const base = await client.query(
      `select jsonb_build_object(
         'games', (select count(*) from public.games where code = 'one_piece'),
         'sets', (select count(*) from public.sets where game = 'one_piece'),
         'card_prints', (
           select count(*) from public.card_prints where game_id = $1::uuid
         ),
         'card_print_identity', (
           select count(*)
           from public.card_print_identity identity_row
           join public.card_prints card on card.id = identity_row.card_print_id
           where card.game_id = $1::uuid and identity_row.is_active
         ),
         'card_printings', (
           select count(*)
           from public.card_printings printing
           join public.card_prints card on card.id = printing.card_print_id
           where card.game_id = $1::uuid
         ),
         'self_hosted_images', (
           select count(*)
           from public.card_prints
           where game_id = $1::uuid
             and image_status = 'exact'
             and image_path like 'one-piece/card-prints/%'
         ),
         'image_coverage_gaps', (
           select count(*)
           from public.card_prints
           where game_id = $1::uuid and image_url is null and image_path is null
         ),
         'direct_card_matches', (
           select count(*) from public.card_prints where id = $2::uuid
         ),
         'legacy_search_matches', (
           select count(*)
           from public.search_card_prints_v1($3, null, null, 1000, 0) search_row
           where search_row.id = $2::uuid
         ),
         'print_identity_search_matches', (
           select count(*)
           from public.search_print_identity_v1($3, null, null, null, 1000, 0) search_row
           where search_row.parent_gv_id = $4
         )
       ) as value`,
      [ONE_PIECE_GAME_ID_V1, sample.id, sample.name, sample.gv_id],
    );
    const counts = base.rows[0].value;
    let sealedPricingRows = 0;
    let sealedReleaseMembers = 0;
    if (role === "authenticated") {
      const sealed = await client.query(
        `select count(*)::integer as row_count
         from public.get_active_sealed_product_pricing_v1(null, 100, 0)`,
      );
      sealedPricingRows = sealed.rows[0].row_count;
      // The read interface is bounded to 100. Durable release-member truth is
      // captured by the service-owned preflight below.
      if (sealedPricingRows !== 100) {
        throw new Error("Bounded sealed pricing read did not return 100 rows");
      }
    }
    const direct = await client.query(
      `select gv_id, name, image_url, image_path, image_status, image_source
       from public.card_prints where id = $1::uuid`,
      [sample.id],
    );
    const row = direct.rows[0] ?? null;
    return {
      role,
      counts: {
        ...counts,
        sealed_pricing_rows: sealedPricingRows,
        sealed_release_members: sealedReleaseMembers,
      },
      sample: row
        ? {
            ...row,
            image_url_self_hosted:
              typeof row.image_url === "string" &&
              row.image_url.includes(
                "/storage/v1/object/public/external-card-images/one-piece/card-prints/",
              ),
          }
        : null,
    };
  } finally {
    await resetClientRole(client);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.envFile)) {
    throw new Error(`Environment file not found: ${args.envFile}`);
  }
  dotenv.config({ path: args.envFile, override: false });
  const connectionString =
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("Production database URL is required");

  const branch = git(["branch", "--show-current"]);
  const commitSha = git(["rev-parse", "HEAD"]);
  const trackedStatus = git(["status", "--porcelain", "--untracked-files=no"]);
  if (branch !== EXPECTED_BRANCH) {
    throw new Error(`Expected branch ${EXPECTED_BRANCH}, got ${branch}`);
  }
  if (trackedStatus) throw new Error("Tracked worktree must be clean");
  if (args.expectedCommit && args.expectedCommit !== commitSha) {
    throw new Error(
      `Expected commit ${args.expectedCommit}, got ${commitSha}`,
    );
  }

  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = {
    version: ONE_PIECE_SIGNED_IN_CATALOG_READINESS_VERSION_V1,
    recorded_at: new Date().toISOString(),
    repository: {
      branch,
      commit_sha: commitSha,
      tracked_worktree_clean: true,
    },
    bindings: {
      game_id: ONE_PIECE_GAME_ID_V1,
      pointer_plan_fingerprint_sha256: POINTER_PLAN_FINGERPRINT,
      pointer_payload_fingerprint_sha256: POINTER_PAYLOAD_FINGERPRINT,
      expected_counts: ONE_PIECE_EXPECTED_COUNTS_V1,
    },
    transaction: {
      mode: "rollback_only_signed_in_simulation",
      durable_commit_authorized: false,
    },
    boundaries: {
      durable_database_writes: 0,
      release_activation: false,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      vault_writes: 0,
      deployments: 0,
    },
  };
  const runPlanBody = await writeJson(
    path.join(args.outDir, "run_plan.json"),
    runPlan,
  );

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
    application_name: "one-piece-signed-in-catalog-readiness-v1",
  });
  await client.connect();
  let transactionOpen = false;
  let simulationCompleted = false;
  let before;
  let simulatedControl;
  let anonymous;
  let authenticated;
  let privileges;
  let sample;
  try {
    before = await captureServiceState(client);
    const sampleResult = await client.query(
      `select id::text, gv_id, name
       from public.card_prints
       where game_id = $1::uuid and image_url is not null
       order by case when name ilike '%Monkey%D%Luffy%' then 0 else 1 end,
                name, gv_id
       limit 1`,
      [ONE_PIECE_GAME_ID_V1],
    );
    sample = sampleResult.rows[0];
    if (!sample) throw new Error("No self-hosted One Piece sample card found");

    const privilegeResult = await client.query(
      `select
         has_function_privilege(
           'anon',
           'public.get_active_sealed_product_pricing_v1(text,integer,integer)',
           'execute'
         ) as anonymous_sealed_rpc_execute,
         has_function_privilege(
           'authenticated',
           'public.get_active_sealed_product_pricing_v1(text,integer,integer)',
           'execute'
         ) as authenticated_sealed_rpc_execute,
         (
           select count(*)::integer
           from public.sealed_product_release_pointer pointer
           join public.sealed_product_releases release on release.id = pointer.release_id
           join public.sealed_product_release_members member on member.release_id = release.id
           join public.sealed_product_variants variant on variant.id = member.variant_id
           join public.sealed_product_families family on family.id = variant.family_id
           where pointer.singleton
             and release.release_state = 'frozen'
             and family.game_key = 'one_piece'
         ) as active_sealed_release_members`,
    );
    privileges = privilegeResult.rows[0];

    await client.query("begin");
    transactionOpen = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '240s'");
    const updated = await client.query(
      `update public.catalog_game_release_controls
       set release_status = 'signed_in',
           release_version = $1,
           evidence = evidence || jsonb_build_object(
             'rollback_only', true,
             'pointer_plan_fingerprint_sha256', $2::text,
             'pointer_payload_fingerprint_sha256', $3::text
           ),
           activated_at = now(),
           activated_by = 'one_piece_signed_in_catalog_readiness_v1',
           updated_at = now()
       where game_code = 'one_piece' and release_status = 'hidden'
       returning to_jsonb(catalog_game_release_controls) as value`,
      [
        ONE_PIECE_SIGNED_IN_CATALOG_READINESS_VERSION_V1,
        POINTER_PLAN_FINGERPRINT,
        POINTER_PAYLOAD_FINGERPRINT,
      ],
    );
    if (updated.rowCount !== 1) {
      throw new Error("One Piece hidden release control was not updated exactly once");
    }
    simulatedControl = updated.rows[0].value;
    anonymous = await captureClientVisibility(client, "anon", sample);
    authenticated = await captureClientVisibility(
      client,
      "authenticated",
      sample,
    );
    authenticated.counts.sealed_release_members =
      privileges.active_sealed_release_members;

    await client.query("rollback");
    transactionOpen = false;
    simulationCompleted = true;
  } finally {
    if (transactionOpen) {
      try {
        await client.query("reset role");
        await client.query("rollback");
      } catch {
        // Preserve the original error while still closing the connection.
      }
    }
    if (!simulationCompleted) {
      await client.end();
    }
  }

  let afterRollback;
  try {
    await client.query("begin transaction read only");
    afterRollback = await captureServiceState(client);
    await client.query("rollback");
  } finally {
    await client.end();
  }

  const decision = evaluateOnePieceSignedInCatalogReadinessV1({
    before,
    simulatedControl,
    anonymous,
    authenticated,
    privileges,
    afterRollback,
  });
  const summary = {
    ...decision,
    version: ONE_PIECE_SIGNED_IN_CATALOG_READINESS_VERSION_V1,
    recorded_at: new Date().toISOString(),
    repository: runPlan.repository,
    bindings: runPlan.bindings,
    transaction: {
      mode: runPlan.transaction.mode,
      committed: false,
      release_control_rows_temporarily_updated: 1,
    },
    boundaries: runPlan.boundaries,
    sample,
    before,
    simulated_control: simulatedControl,
    anonymous,
    authenticated,
    privileges,
    after_rollback: afterRollback,
  };
  const snapshotBody = await writeJson(
    path.join(args.outDir, "readiness_snapshot.json"),
    {
      before,
      simulated_control: simulatedControl,
      anonymous,
      authenticated,
      privileges,
      after_rollback: afterRollback,
    },
  );
  const summaryBody = await writeJson(
    path.join(args.outDir, "summary.json"),
    summary,
  );
  const reportBody = buildOnePieceSignedInCatalogReadinessReportV1(summary);
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    "run_plan.json": sha256(runPlanBody),
    "readiness_snapshot.json": sha256(snapshotBody),
    "summary.json": sha256(summaryBody),
    "REPORT.md": sha256(reportBody),
  });

  process.stdout.write(
    `${JSON.stringify({
      status: summary.status,
      ready_for_signed_in_activation: summary.ready_for_signed_in_activation,
      findings: summary.findings,
      out_dir: args.outDir,
    })}\n`,
  );
  if (!summary.ready_for_signed_in_activation) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
