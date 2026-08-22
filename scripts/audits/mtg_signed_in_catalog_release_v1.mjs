import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  MTG_GAME_ID_V1,
  MTG_SIGNED_IN_CATALOG_RELEASE_VERSION_V1,
  MTG_SIGNED_IN_EXPECTED_COUNTS_V1,
  evaluateMtgSignedInReleasePlanV1,
  evaluateMtgSignedInReleaseReadbackV1,
} from "../../backend/pricing/mtg_signed_in_catalog_release_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

function argument(argv, name, fallback = "") {
  return (
    argv
      .find((entry) => entry.startsWith(`--${name}=`))
      ?.slice(name.length + 3) ?? fallback
  ).trim();
}

function parseArgs(argv) {
  const mode = argument(argv, "mode", "plan");
  if (!new Set(["plan", "apply"]).has(mode)) {
    throw new Error("--mode must be plan or apply");
  }
  const transition = argument(argv, "transition", "activate");
  if (!new Set(["activate", "refresh"]).has(transition)) {
    throw new Error("--transition must be activate or refresh");
  }
  return {
    mode,
    transition,
    envFile: path.resolve(
      argument(argv, "env-file", "C:\\grookai_vault\\.env.local"),
    ),
    outDir: path.resolve(
      argument(
        argv,
        "out-dir",
        path.join(
          ROOT,
          "docs",
          "audits",
          "pricing",
          "mtg_signed_in_catalog_release_v1",
          new Date().toISOString().replace(/[:.]/g, "-"),
        ),
      ),
    ),
    expectedCommit: argument(argv, "expected-commit"),
    expectedPlanFingerprint: argument(argv, "expected-plan-fingerprint"),
    deployment: {
      web: {
        production_status: argument(argv, "web-production-status"),
        commit_sha: argument(argv, "web-commit"),
        deployment_id: argument(argv, "web-deployment-id"),
      },
      android: {
        artifact_status: argument(argv, "android-artifact-status"),
        artifact_sha256: argument(
          argv,
          "android-artifact-sha256",
        ).toLowerCase(),
        commit_sha: argument(argv, "android-commit"),
        version_code: argument(argv, "android-version-code"),
        workflow_run_id: argument(argv, "android-workflow-run-id"),
      },
      ios: {
        distribution_status: argument(argv, "ios-distribution-status"),
        build_number: argument(argv, "ios-build-number"),
        commit_sha: argument(argv, "ios-commit"),
        app_store_build_id: argument(argv, "ios-app-store-build-id"),
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

const COUNTS_SQL = `jsonb_build_object(
  'games', (select count(*) from public.games where code = 'mtg'),
  'sets', (select count(*) from public.sets where game = 'mtg'),
  'card_prints', (select count(*) from public.card_prints where game_id = $1::uuid),
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
  'exact_printing_mappings', (
    select count(*) from public.external_printing_mappings mapping
    join public.card_printings printing on printing.id = mapping.card_printing_id
    join public.card_prints card on card.id = printing.card_print_id
    where card.game_id = $1::uuid and mapping.source = 'tcgplayer_market'
      and mapping.active and mapping.external_id ~ '^[1-9][0-9]*:(normal|foil)$'
  ),
  'self_hosted_fronts', (
    select count(*) from public.card_prints where game_id = $1::uuid
      and image_status = 'exact' and image_source = 'identity'
      and image_path like 'warehouse-derived/self-hosted-images-v1/card_prints/mtg/%'
  ),
  'image_faces', (
    select count(*) from public.card_print_image_faces face
    join public.card_prints card on card.id = face.card_print_id
    where card.game_id = $1::uuid and face.image_status = 'exact'
  ),
  'image_coverage_gaps', (
    select count(*) from public.card_prints where game_id = $1::uuid
      and image_url is null and image_path is null and image_hash is null
  ),
  'current_pricing_rows', (
    select count(*) from public.v_market_price_current_v1 price
    join public.card_prints card on card.id = price.card_print_id
    where card.game_id = $1::uuid
  )
)`;

async function captureState(client) {
  const result = await client.query(
    `select jsonb_build_object(
       'release_control', (
         select to_jsonb(control) from public.catalog_game_release_controls control
         where control.game_code = 'mtg'
       ),
       'counts', ${COUNTS_SQL},
       'catalog_fingerprint', (
         select md5(coalesce(string_agg(concat_ws('|', card.id::text, card.gv_id,
           card.name, card.set_code, card.number, coalesce(card.image_url, ''),
           coalesce(card.image_path, ''), coalesce(card.image_hash, '')),
           E'\\n' order by card.id), ''))
         from public.card_prints card where card.game_id = $1::uuid
       ),
       'non_mtg_fingerprint', (
         select md5(coalesce(string_agg(concat_ws('|', card.id::text, card.gv_id,
           coalesce(card.image_url, ''), coalesce(card.image_path, ''),
           coalesce(card.image_hash, '')), E'\\n' order by card.id), ''))
         from public.card_prints card where card.game_id <> $1::uuid
       )
     ) as value`,
    [MTG_GAME_ID_V1],
  );
  return result.rows[0].value;
}

async function captureRoleVisibility(client, role, sample) {
  if (!new Set(["anon", "authenticated"]).has(role)) {
    throw new Error(`Unsupported role ${role}`);
  }
  await client.query("begin transaction read only");
  try {
    await client.query(`set local role ${role}`);
    await client.query(
      "select set_config('request.jwt.claim.role', $1, true)",
      [role],
    );
    const result = await client.query(
      `select jsonb_build_object(
         'games', (select count(*) from public.games where code = 'mtg'),
         'sets', (select count(*) from public.sets where game = 'mtg'),
         'card_prints', (select count(*) from public.card_prints where game_id = $1::uuid),
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
         'self_hosted_fronts', (
           select count(*) from public.card_prints where game_id = $1::uuid
             and image_status = 'exact' and image_source = 'identity'
         ),
         'image_coverage_gaps', (
           select count(*) from public.card_prints where game_id = $1::uuid
             and image_url is null and image_path is null and image_hash is null
         ),
         'direct_card_matches', (select count(*) from public.card_prints where id = $2::uuid),
         'search_matches', (
           select count(*) from public.search_card_prints_v1($3, null, null, 1000, 0) search_row
           where search_row.id = $2::uuid
         )
       ) as value`,
      [MTG_GAME_ID_V1, sample.id, sample.name],
    );
    const counts = result.rows[0].value;
    counts.image_faces = 0;
    counts.direct_face_matches = 0;
    counts.pricing_rows = 0;
    if (role === "authenticated") {
      const imageVisibility = await client.query(
        `select jsonb_build_object(
           'image_faces', (
             select count(*) from public.card_print_image_faces face
             join public.card_prints card on card.id = face.card_print_id
             where card.game_id = $1::uuid and face.image_status = 'exact'
           ),
           'direct_face_matches', (
             select count(*) from public.get_card_print_image_faces_v1($2::uuid)
           )
         ) as value`,
        [MTG_GAME_ID_V1, sample.id],
      );
      counts.image_faces = imageVisibility.rows[0].value.image_faces;
      counts.direct_face_matches =
        imageVisibility.rows[0].value.direct_face_matches;
      const pricing = await client.query(
        "select count(*)::integer as count from public.get_market_pricing_read_model_v1(array[$1::uuid], null)",
        [sample.id],
      );
      counts.pricing_rows = pricing.rows[0].count;
    }
    await client.query("rollback");
    return { role, counts };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function restoreReleaseControl(
  client,
  before,
  planFingerprint,
  transition,
) {
  const fingerprintField =
    transition === "refresh"
      ? "release_refresh_plan_fingerprint_sha256"
      : "activation_plan_fingerprint_sha256";
  const result = await client.query(
    `update public.catalog_game_release_controls
     set release_status = $1, release_version = $2, evidence = $3::jsonb,
         activated_at = $4, activated_by = $5, updated_at = $6
     where game_code = 'mtg' and release_status = 'signed_in'
       and release_version = $7
       and evidence->>$8 = $9`,
    [
      before.release_status,
      before.release_version,
      JSON.stringify(before.evidence ?? {}),
      before.activated_at,
      before.activated_by,
      before.updated_at,
      MTG_SIGNED_IN_CATALOG_RELEASE_VERSION_V1,
      fingerprintField,
      planFingerprint,
    ],
  );
  if (result.rowCount !== 1) {
    throw new Error(
      "Automatic release-control rollback did not restore exactly one row",
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (existsSync(args.envFile)) {
    dotenv.config({ path: args.envFile, override: false });
  } else if (!process.env.SUPABASE_DB_URL) {
    throw new Error(
      "Environment file is missing and SUPABASE_DB_URL is not configured",
    );
  }
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");

  const repository = {
    branch: git(["branch", "--show-current"]),
    commit_sha: git(["rev-parse", "HEAD"]),
    tracked_worktree_clean:
      git(["status", "--porcelain", "--untracked-files=no"]) === "",
  };
  if (!repository.tracked_worktree_clean)
    throw new Error("Tracked worktree must be clean");
  if (args.expectedCommit && args.expectedCommit !== repository.commit_sha) {
    throw new Error("Expected commit does not match the current commit");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: "mtg-signed-in-catalog-release-v1",
  });
  await client.connect();
  try {
    const before = await captureState(client);
    const expectedReleaseStatus =
      args.transition === "refresh" ? "signed_in" : "hidden";
    const planPayload = {
      version: MTG_SIGNED_IN_CATALOG_RELEASE_VERSION_V1,
      transition: args.transition,
      repository,
      game: { code: "mtg", id: MTG_GAME_ID_V1 },
      expected_counts: MTG_SIGNED_IN_EXPECTED_COUNTS_V1,
      baseline: before,
      deployment: args.deployment,
      mutation: {
        table: "public.catalog_game_release_controls",
        predicate: {
          game_code: "mtg",
          release_status: expectedReleaseStatus,
        },
        update: { release_status: "signed_in" },
        maximum_rows: 1,
      },
      boundaries: {
        catalog_writes: 0,
        pricing_writes: 0,
        storage_writes: 0,
        vault_writes: 0,
        release_control_updates: 1,
      },
    };
    const planFingerprint = sha256(JSON.stringify(stable(planPayload)));
    const decision = evaluateMtgSignedInReleasePlanV1({
      before,
      deployment: args.deployment,
      transition: args.transition,
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
      execution_mode: args.mode,
      recorded_at: new Date().toISOString(),
      activation_plan_fingerprint_sha256: planFingerprint,
      release_plan_fingerprint_sha256: planFingerprint,
      decision,
    };
    await fs.mkdir(args.outDir, { recursive: true });
    const planBody = await writeJson(
      path.join(args.outDir, "run_plan.json"),
      runPlan,
    );

    if (args.mode === "plan") {
      await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
        "run_plan.json": sha256(planBody),
      });
      process.stdout.write(
        `${JSON.stringify({
          status: decision.status,
          findings: decision.findings,
          activation_plan_fingerprint_sha256: planFingerprint,
          out_dir: args.outDir,
        })}\n`,
      );
      if (!decision.ready_for_apply) process.exitCode = 2;
      return;
    }

    if (!decision.ready_for_apply) {
      throw new Error(
        `Activation plan is blocked: ${JSON.stringify(decision.findings)}`,
      );
    }
    if (args.expectedPlanFingerprint !== planFingerprint) {
      throw new Error("Expected activation plan fingerprint does not match");
    }
    const sampleResult = await client.query(
      `select card.id::text, card.gv_id, card.name
       from public.card_prints card
       join public.v_market_price_current_v1 price on price.card_print_id = card.id
       where card.game_id = $1::uuid and card.image_status = 'exact'
       order by card.name, card.gv_id limit 1`,
      [MTG_GAME_ID_V1],
    );
    const sample = sampleResult.rows[0];
    if (!sample) throw new Error("No image-backed priced MTG sample exists");

    let committed = false;
    let updatedRows = 0;
    try {
      await client.query("begin");
      await client.query("set local lock_timeout = '5s'");
      const locked = await client.query(
        "select release_status from public.catalog_game_release_controls where game_code = 'mtg' for update",
      );
      if (
        locked.rowCount !== 1 ||
        locked.rows[0].release_status !== expectedReleaseStatus
      ) {
        throw new Error(
          `MTG release row is not exactly one ${expectedReleaseStatus} row`,
        );
      }
      const update =
        args.transition === "refresh"
          ? await client.query(
              `update public.catalog_game_release_controls
               set release_version = $1,
                   evidence = evidence || jsonb_build_object(
                     'release_refresh_plan_fingerprint_sha256', $2::text,
                     'deployed_clients', $3::jsonb,
                     'last_refreshed_at', now()
                   ),
                   updated_at = now()
               where game_code = 'mtg' and release_status = 'signed_in'
               returning game_code`,
              [
                MTG_SIGNED_IN_CATALOG_RELEASE_VERSION_V1,
                planFingerprint,
                JSON.stringify(args.deployment),
              ],
            )
          : await client.query(
              `update public.catalog_game_release_controls
               set release_status = 'signed_in', release_version = $1,
                   evidence = evidence || jsonb_build_object(
                     'activation_plan_fingerprint_sha256', $2::text,
                     'deployed_clients', $3::jsonb
                   ),
                   activated_at = now(), activated_by = 'mtg_signed_in_catalog_release_v1',
                   updated_at = now()
               where game_code = 'mtg' and release_status = 'hidden'
               returning game_code`,
              [
                MTG_SIGNED_IN_CATALOG_RELEASE_VERSION_V1,
                planFingerprint,
                JSON.stringify(args.deployment),
              ],
            );
      updatedRows = update.rowCount;
      if (updatedRows !== 1)
        throw new Error("Release update did not affect exactly one row");
      await client.query("commit");
      committed = true;

      const after = await captureState(client);
      const anonymous = await captureRoleVisibility(client, "anon", sample);
      const authenticated = await captureRoleVisibility(
        client,
        "authenticated",
        sample,
      );
      const result = evaluateMtgSignedInReleaseReadbackV1({
        before,
        after,
        anonymous,
        authenticated,
        updatedRows,
        activationPlanFingerprint: planFingerprint,
        transition: args.transition,
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
        sample,
      };
      const summaryBody = await writeJson(
        path.join(args.outDir, "summary.json"),
        summary,
      );
      await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
        "run_plan.json": sha256(planBody),
        "summary.json": sha256(summaryBody),
      });
      if (!result.release_active) {
        throw new Error(
          `Release readback failed: ${JSON.stringify(result.findings)}`,
        );
      }
      process.stdout.write(
        `${JSON.stringify({
          status: result.status,
          activation_plan_fingerprint_sha256: planFingerprint,
          out_dir: args.outDir,
        })}\n`,
      );
    } catch (error) {
      if (committed) {
        await restoreReleaseControl(
          client,
          before.release_control,
          planFingerprint,
          args.transition,
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
