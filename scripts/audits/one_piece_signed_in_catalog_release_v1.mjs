import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_SIGNED_IN_CATALOG_RELEASE_VERSION_V1,
  evaluateOnePieceSignedInCatalogReleasePlanV1,
  evaluateOnePieceSignedInCatalogReleaseReadbackV1,
} from "../../backend/pricing/one_piece_signed_in_catalog_release_v1.mjs";
import {
  ONE_PIECE_EXPECTED_COUNTS_V1,
  ONE_PIECE_GAME_ID_V1,
} from "../../backend/pricing/one_piece_signed_in_catalog_readiness_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function arg(argv, name, fallback = "") {
  return (
    argv.find((entry) => entry.startsWith(`--${name}=`))?.slice(name.length + 3) ??
    fallback
  ).trim();
}

function parseArgs(argv) {
  const mode = arg(argv, "mode", "plan");
  if (!new Set(["plan", "apply"]).has(mode)) {
    throw new Error("--mode must be plan or apply");
  }
  return {
    mode,
    envFile: path.resolve(
      arg(argv, "env-file", "C:\\grookai_vault\\.env.local"),
    ),
    outDir: path.resolve(
      arg(
        argv,
        "out-dir",
        path.join(
          ROOT,
          "docs",
          "audits",
          "pricing",
          "one_piece_signed_in_catalog_release_v1",
          new Date().toISOString().replace(/[:.]/g, "-"),
        ),
      ),
    ),
    expectedCommit: arg(argv, "expected-commit"),
    expectedPlanFingerprint: arg(argv, "expected-plan-fingerprint"),
    deployment: {
      web: {
        production_status: arg(argv, "web-production-status"),
        commit_sha: arg(argv, "web-commit"),
        deployment_id: arg(argv, "web-deployment-id"),
      },
      android: {
        artifact_status: arg(argv, "android-artifact-status"),
        artifact_sha256: arg(argv, "android-artifact-sha256").toLowerCase(),
        commit_sha: arg(argv, "android-commit"),
        version_code: arg(argv, "android-version-code"),
        workflow_run_id: arg(argv, "android-workflow-run-id"),
      },
      ios: {
        distribution_status: arg(argv, "ios-distribution-status"),
        build_number: arg(argv, "ios-build-number"),
        commit_sha: arg(argv, "ios-commit"),
        app_store_build_id: arg(argv, "ios-app-store-build-id"),
      },
    },
  };
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function captureState(client) {
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
           select count(*) from public.card_prints
           where game_id = $1::uuid and image_status = 'exact'
             and image_source = 'identity'
             and image_path like 'one-piece/card-prints/%'
         ),
         'image_coverage_gaps', (
           select count(*) from public.card_prints
           where game_id = $1::uuid and image_url is null
             and image_path is null and image_hash is null
         )
       ),
       'catalog_fingerprint', (
         select md5(coalesce(string_agg(
           concat_ws('|', card.id::text, card.gv_id, card.name, card.set_code,
             card.number, coalesce(card.image_url, ''),
             coalesce(card.image_path, ''), coalesce(card.image_hash, ''),
             coalesce(card.image_status, ''), coalesce(card.image_source, '')),
           E'\\n' order by card.id
         ), '')) from public.card_prints card where card.game_id = $1::uuid
       ),
       'non_one_piece_fingerprint', (
         select md5(coalesce(string_agg(
           concat_ws('|', card.id::text, card.gv_id,
             coalesce(card.image_url, ''), coalesce(card.image_path, ''),
             coalesce(card.image_hash, ''), coalesce(card.image_status, ''),
             coalesce(card.image_source, '')),
           E'\\n' order by card.id
         ), '')) from public.card_prints card where card.game_id <> $1::uuid
       )
     ) as value`,
    [ONE_PIECE_GAME_ID_V1],
  );
  return result.rows[0].value;
}

async function capturePrivileges(client) {
  const result = await client.query(
    `select
       has_function_privilege(
         'anon',
         'public.get_active_sealed_product_pricing_v1(text,integer,integer)',
         'execute'
       ) as anonymous_sealed_rpc_execute,
       (
         select count(*)::integer
         from public.sealed_product_release_pointer pointer
         join public.sealed_product_releases release on release.id = pointer.release_id
         join public.sealed_product_release_members member
           on member.release_id = release.id
         join public.sealed_product_variants variant on variant.id = member.variant_id
         join public.sealed_product_families family on family.id = variant.family_id
         where pointer.singleton and release.release_state = 'frozen'
           and family.game_key = 'one_piece'
       ) as active_sealed_release_members`,
  );
  return result.rows[0];
}

async function captureRoleVisibility(client, role, sample) {
  if (!new Set(["anon", "authenticated"]).has(role)) {
    throw new Error(`Unsupported role ${role}`);
  }
  await client.query("begin transaction read only");
  try {
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
    const result = await client.query(
      `select jsonb_build_object(
         'games', (select count(*) from public.games where code = 'one_piece'),
         'sets', (select count(*) from public.sets where game = 'one_piece'),
         'card_prints', (
           select count(*) from public.card_prints where game_id = $1::uuid
         ),
         'card_print_identity', (
           select count(*) from public.card_print_identity identity_row
           join public.card_prints card on card.id = identity_row.card_print_id
           where card.game_id = $1::uuid and identity_row.is_active
         ),
         'card_printings', (
           select count(*) from public.card_printings printing
           join public.card_prints card on card.id = printing.card_print_id
           where card.game_id = $1::uuid
         ),
         'self_hosted_images', (
           select count(*) from public.card_prints
           where game_id = $1::uuid and image_status = 'exact'
             and image_path like 'one-piece/card-prints/%'
         ),
         'image_coverage_gaps', (
           select count(*) from public.card_prints
           where game_id = $1::uuid and image_url is null and image_path is null
         ),
         'direct_card_matches', (
           select count(*) from public.card_prints where id = $2::uuid
         ),
         'legacy_search_matches', (
           select count(*)
           from public.search_card_prints_v1($3, null, null, 1000, 0) as search_row
           where search_row.id = $2::uuid
         )
       ) as value`,
      [ONE_PIECE_GAME_ID_V1, sample.id, sample.name],
    );
    const counts = result.rows[0].value;
    counts.sealed_pricing_rows = 0;
    if (role === "authenticated") {
      const sealed = await client.query(
        "select count(*)::integer as count from public.get_active_sealed_product_pricing_v1(null, 100, 0)",
      );
      counts.sealed_pricing_rows = sealed.rows[0].count;
    }
    await client.query("rollback");
    return { role, counts };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function restoreReleaseControl(client, before, planFingerprint) {
  const result = await client.query(
    `update public.catalog_game_release_controls
     set release_status = $1,
         release_version = $2,
         evidence = $3::jsonb,
         activated_at = $4,
         activated_by = $5,
         updated_at = $6
     where game_code = 'one_piece'
       and release_status = 'signed_in'
       and release_version = $7
       and evidence->>'activation_plan_fingerprint_sha256' = $8`,
    [
      before.release_status,
      before.release_version,
      JSON.stringify(before.evidence ?? {}),
      before.activated_at,
      before.activated_by,
      before.updated_at,
      ONE_PIECE_SIGNED_IN_CATALOG_RELEASE_VERSION_V1,
      planFingerprint,
    ],
  );
  if (result.rowCount !== 1) {
    throw new Error("Automatic release-control rollback did not restore exactly one row");
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.envFile)) throw new Error("Environment file is missing");
  dotenv.config({ path: args.envFile, override: false });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");

  const repository = {
    branch: git(["branch", "--show-current"]),
    commit_sha: git(["rev-parse", "HEAD"]),
    tracked_worktree_clean:
      git(["status", "--porcelain", "--untracked-files=no"]) === "",
  };
  if (!repository.tracked_worktree_clean) {
    throw new Error("Tracked worktree must be clean");
  }
  if (args.expectedCommit && args.expectedCommit !== repository.commit_sha) {
    throw new Error("Expected commit does not match the current commit");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
    application_name: "one-piece-signed-in-catalog-release-v1",
  });
  await client.connect();
  let before;
  try {
    before = await captureState(client);
    const planPayload = {
      version: ONE_PIECE_SIGNED_IN_CATALOG_RELEASE_VERSION_V1,
      repository,
      game: { code: "one_piece", id: ONE_PIECE_GAME_ID_V1 },
      expected_counts: ONE_PIECE_EXPECTED_COUNTS_V1,
      baseline: before,
      deployment: args.deployment,
      mutation: {
        table: "public.catalog_game_release_controls",
        predicate: { game_code: "one_piece", release_status: "hidden" },
        update: { release_status: "signed_in" },
        maximum_rows: 1,
      },
      boundaries: {
        catalog_writes: 0,
        pricing_writes: 0,
        storage_writes: 0,
        vault_writes: 0,
        release_control_updates: args.mode === "apply" ? 1 : 0,
      },
    };
    const planFingerprint = sha256(JSON.stringify(stable(planPayload)));
    const decision = evaluateOnePieceSignedInCatalogReleasePlanV1({
      before,
      deployment: args.deployment,
    });
    if (args.deployment.web.commit_sha !== repository.commit_sha) {
      decision.findings.push({
        code: "deployment_commit_mismatch",
        actual: args.deployment.web.commit_sha || null,
        expected: repository.commit_sha,
      });
      decision.status = "blocked";
      decision.ready_for_apply = false;
    }
    const runPlan = {
      ...planPayload,
      recorded_at: new Date().toISOString(),
      activation_plan_fingerprint_sha256: planFingerprint,
      decision,
    };
    await fs.mkdir(args.outDir, { recursive: true });
    const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);

    if (args.mode === "plan") {
      await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
        "run_plan.json": sha256(runPlanBody),
      });
      process.stdout.write(
        `${JSON.stringify({ status: decision.status, findings: decision.findings, activation_plan_fingerprint_sha256: planFingerprint, out_dir: args.outDir })}\n`,
      );
      if (!decision.ready_for_apply) process.exitCode = 2;
      return;
    }

    if (!decision.ready_for_apply) {
      throw new Error(`Activation plan is blocked: ${JSON.stringify(decision.findings)}`);
    }
    if (args.expectedPlanFingerprint !== planFingerprint) {
      throw new Error("Expected activation plan fingerprint does not match");
    }

    const sampleResult = await client.query(
      `select id::text, gv_id, name from public.card_prints
       where game_id = $1::uuid and image_status = 'exact'
       order by case when name ilike '%Monkey%D%Luffy%' then 0 else 1 end,
                name, gv_id limit 1`,
      [ONE_PIECE_GAME_ID_V1],
    );
    const sample = sampleResult.rows[0];
    if (!sample) throw new Error("No exact-image One Piece sample exists");
    const privileges = await capturePrivileges(client);
    let committed = false;
    let updatedRows = 0;
    try {
      await client.query("begin");
      await client.query("set local lock_timeout = '5s'");
      const locked = await client.query(
        "select release_status from public.catalog_game_release_controls where game_code = 'one_piece' for update",
      );
      if (locked.rowCount !== 1 || locked.rows[0].release_status !== "hidden") {
        throw new Error("One Piece release row is not exactly one hidden row");
      }
      const update = await client.query(
        `update public.catalog_game_release_controls
         set release_status = 'signed_in',
             release_version = $1,
             evidence = evidence || jsonb_build_object(
               'activation_plan_fingerprint_sha256', $2::text,
               'deployed_clients', $3::jsonb
             ),
             activated_at = now(),
             activated_by = 'one_piece_signed_in_catalog_release_v1',
             updated_at = now()
         where game_code = 'one_piece' and release_status = 'hidden'
         returning game_code`,
        [
          ONE_PIECE_SIGNED_IN_CATALOG_RELEASE_VERSION_V1,
          planFingerprint,
          JSON.stringify(args.deployment),
        ],
      );
      updatedRows = update.rowCount;
      if (updatedRows !== 1) throw new Error("Release update did not affect exactly one row");
      await client.query("commit");
      committed = true;

      const after = await captureState(client);
      const anonymous = await captureRoleVisibility(client, "anon", sample);
      const authenticated = await captureRoleVisibility(
        client,
        "authenticated",
        sample,
      );
      const result = evaluateOnePieceSignedInCatalogReleaseReadbackV1({
        before,
        after,
        anonymous,
        authenticated,
        privileges,
        updatedRows,
        activationPlanFingerprint: planFingerprint,
      });
      const summary = {
        ...result,
        recorded_at: new Date().toISOString(),
        repository,
        deployment: args.deployment,
        activation_plan_fingerprint_sha256: planFingerprint,
        transaction: { committed, release_control_rows_updated: updatedRows },
        before,
        after,
        anonymous,
        authenticated,
        privileges,
        sample,
      };
      const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
      await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
        "run_plan.json": sha256(runPlanBody),
        "summary.json": sha256(summaryBody),
      });
      if (!result.release_active) {
        throw new Error(`Release readback failed: ${JSON.stringify(result.findings)}`);
      }
      process.stdout.write(
        `${JSON.stringify({ status: result.status, activation_plan_fingerprint_sha256: planFingerprint, out_dir: args.outDir })}\n`,
      );
    } catch (error) {
      if (committed) {
        await restoreReleaseControl(
          client,
          before.release_control,
          planFingerprint,
        );
      } else {
        await client.query("rollback");
      }
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
