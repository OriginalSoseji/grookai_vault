import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { reconcileMtgStageRowsV1 } from "./mtg_canonical_catalog_stage_readback_v1.mjs";
import {
  captureMtgClientVisibilityV1,
  captureMtgPromotionCollisionsV1,
  captureMtgPromotionExactReadbackV1,
  captureVisiblePokemonCountV1,
  insertMtgPromotionRowsV1,
} from "./mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";
import { buildMtgCanonicalSetPromotionContractV1 } from "./mtg_canonical_catalog_set_promotion_contract_v1.mjs";
import {
  captureMtgSetPromotionStageV1,
  captureMtgSetPromotionStateV1,
  evaluateMtgSetPromotionBaselineV1,
  verifyMtgSetPromotionDeltaV1,
  verifyMtgSetPromotionExactReadbackV1,
} from "./mtg_canonical_catalog_set_promotion_rollback_proof_v1.mjs";
import { stableJson } from "./mtg_canonical_catalog_canary_stage_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_SET_PROMOTION_WRITER_V1";
const APPROVAL_ENV = "MTG_CANONICAL_SET_PROMOTION_APPROVAL";
const REQUIRED_BRANCH = "agent/mtg-pricing-readiness-v1";
const GOVERNING_FILES = Object.freeze([
  "scripts/audits/mtg_canonical_catalog_set_promotion_writer_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_set_promotion_contract_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_set_promotion_rollback_proof_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_promotion_rollback_proof_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_promotion_contract_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_canary_preflight_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_canary_stage_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_stage_readback_v1.mjs",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const args = { mode: "plan", payload: null, outDir: null };
  for (const arg of argv) {
    if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  return args;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export async function captureMtgSetPromotionRepositoryContractV1() {
  const files = {};
  for (const relativePath of GOVERNING_FILES) {
    files[relativePath] = sha256(await fs.readFile(path.join(ROOT, relativePath)));
  }
  const aggregateSha256 = sha256(stableJson(files));
  return {
    head_commit_sha: git(["rev-parse", "HEAD"]),
    governing_commit_sha: git(["log", "-1", "--format=%H", "--", ...GOVERNING_FILES]),
    branch: git(["branch", "--show-current"]),
    tracked_worktree_clean: git(["status", "--porcelain", "--untracked-files=no"]) === "",
    governing_files_sha256: aggregateSha256,
    governing_files: files,
  };
}

export function buildMtgCanonicalSetPromotionApprovalV1(plan, repository) {
  const counts = plan.row_counts;
  const requiredApprovalMessage =
    `I approve only the hidden canonical promotion of MTG set ` +
    `${plan.selected_set.code} (${plan.selected_set.name}) under plan ` +
    `${plan.promotion_plan_sha256}, writer payload ${plan.writer_payload_fingerprint}, ` +
    `staging batch ${plan.staging_batch_id}, staged rows ${plan.staging_rows_sha256}, ` +
    `promotion rows ${plan.promotion_rows_sha256}, mutation contract ` +
    `${plan.mutation_contract_sha256}, governing code commit ` +
    `${repository.governing_commit_sha}, and governing source hash ` +
    `${repository.governing_files_sha256}. This may insert exactly ` +
    `${counts.sets} set, ${counts.card_prints} card_prints, ` +
    `${counts.card_print_identity} card_print_identity rows, ` +
    `${counts.card_printings} card_printings, ${counts.external_mappings} ` +
    `Scryfall mappings, and ${counts.external_printing_mappings} TCGPlayer ` +
    `printing mappings. I do not approve migrations, release-control changes, ` +
    `signed-in or public MTG visibility, images, Storage, image pointers, ` +
    `pricing, publication, Vault writes, another set, Pokemon mutation, ` +
    `updates, deletes, truncates, cleanup, or global db push.`;
  return {
    required_approval_message: requiredApprovalMessage,
    approval_sha256: sha256(requiredApprovalMessage),
  };
}

function assertRepository(repository) {
  if (repository.branch !== REQUIRED_BRANCH) {
    throw new Error(`Unexpected branch: ${repository.branch}`);
  }
  if (!repository.tracked_worktree_clean) {
    throw new Error("Tracked worktree must be clean before promotion execution");
  }
  if (!/^[0-9a-f]{40}$/.test(repository.governing_commit_sha)) {
    throw new Error("Governing code commit could not be resolved");
  }
}

function expectCount(actual, expected, label) {
  if (Number(actual) !== Number(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

export async function captureMtgSetPromotionSecurityV1(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'release_table_rls', (
        select relrowsecurity from pg_class
        where oid = 'public.catalog_game_release_controls'::regclass
      ),
      'anon_release_select', has_table_privilege(
        'anon', 'public.catalog_game_release_controls', 'select'
      ),
      'authenticated_release_select', has_table_privilege(
        'authenticated', 'public.catalog_game_release_controls', 'select'
      ),
      'service_release_select', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'select'
      ),
      'service_release_insert', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'insert'
      ),
      'service_release_update', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'update'
      ),
      'restrictive_policy_count', (
        select count(*) from pg_policies
        where schemaname = 'public' and permissive = 'RESTRICTIVE'
          and policyname in (
            'games_catalog_release_visibility_v1',
            'sets_catalog_release_visibility_v1',
            'card_prints_catalog_release_visibility_v1',
            'card_print_identity_catalog_release_visibility_v1',
            'card_printings_catalog_release_visibility_v1'
          )
      ),
      'internal_search_anon_execute', has_function_privilege(
        'anon',
        'public.search_print_identity_unfiltered_internal_v1(text,text,text,text,integer,integer)',
        'execute'
      ),
      'internal_search_authenticated_execute', has_function_privilege(
        'authenticated',
        'public.search_print_identity_unfiltered_internal_v1(text,text,text,text,integer,integer)',
        'execute'
      ),
      'wrapper_search_anon_execute', has_function_privilege(
        'anon', 'public.search_print_identity_v1(text,text,text,text,integer,integer)', 'execute'
      ),
      'wrapper_search_authenticated_execute', has_function_privilege(
        'authenticated',
        'public.search_print_identity_v1(text,text,text,text,integer,integer)',
        'execute'
      )
    ) as value
  `);
  return result.rows[0].value;
}

export function assertMtgSetPromotionSecurityV1(security) {
  const expected = {
    release_table_rls: true,
    anon_release_select: false,
    authenticated_release_select: false,
    service_release_select: true,
    service_release_insert: true,
    service_release_update: true,
    restrictive_policy_count: 5,
    internal_search_anon_execute: false,
    internal_search_authenticated_execute: false,
    wrapper_search_anon_execute: true,
    wrapper_search_authenticated_execute: true,
  };
  if (stableJson(security) !== stableJson(expected)) {
    throw new Error(`MTG visibility security mismatch: ${stableJson(security)}`);
  }
}

export async function captureMtgSetPromotionCurrentSourceLanesV1(client, payload) {
  const result = await client.query(
    `with planned as (
       select * from jsonb_to_recordset($1::jsonb)
         as row(product_id integer, subtype text)
     ), complete_days as (
       select observation.observed_on
       from planned
       join public.tcgcsv_source_price_daily_observations observation
         on observation.category_id = 1
        and observation.product_id = planned.product_id
        and observation.subtype_name_normalized = planned.subtype
       group by observation.observed_on
       having count(*) = (select count(*) from planned)
       order by observation.observed_on desc
       limit 1
     )
     select count(*)::integer as planned_count,
            count(observation.id)::integer as source_row_count,
            count(observation.id) filter (where observation.market_price > 0)::integer
              as positive_market_price_count,
            max(observation.observed_on) as observed_on
     from planned
     left join complete_days on true
     left join public.tcgcsv_source_price_daily_observations observation
       on observation.category_id = 1
      and observation.observed_on = complete_days.observed_on
      and observation.product_id = planned.product_id
      and observation.subtype_name_normalized = planned.subtype`,
    [JSON.stringify(payload.rows.external_printing_mappings.map((row) => ({
      product_id: Number(row.meta.product_id),
      subtype: row.meta.source_subtype,
    })))],
  );
  return result.rows[0];
}

export function assertMtgSetPromotionSourceLanesV1(source, plan) {
  expectCount(
    source.planned_count,
    plan.row_counts.external_printing_mappings,
    "planned source lanes",
  );
  expectCount(
    source.source_row_count,
    plan.row_counts.external_printing_mappings,
    "current source lanes",
  );
  expectCount(
    source.positive_market_price_count,
    plan.row_counts.external_printing_mappings,
    "positive source lanes",
  );
}

function assertClientHidden(evidence, role) {
  for (const key of [
    "game_count",
    "set_count",
    "card_count",
    "identity_count",
    "printing_count",
    "legacy_search_count",
    "print_search_count",
  ]) {
    expectCount(evidence[key], 0, `${role} ${key}`);
  }
}

async function verifyPromotedState(client, payload, plan, before, pokemonAuthBefore) {
  const state = await captureMtgSetPromotionStateV1(client, plan);
  verifyMtgSetPromotionDeltaV1(plan, before, state);
  const exact = await captureMtgPromotionExactReadbackV1(client, plan.rows);
  verifyMtgSetPromotionExactReadbackV1(plan, exact);
  const security = await captureMtgSetPromotionSecurityV1(client);
  assertMtgSetPromotionSecurityV1(security);
  const source = await captureMtgSetPromotionCurrentSourceLanesV1(client, payload);
  assertMtgSetPromotionSourceLanesV1(source, plan);
  const anon = await captureMtgClientVisibilityV1(client, "anon", payload.selected_set.code);
  const authenticated = await captureMtgClientVisibilityV1(
    client,
    "authenticated",
    payload.selected_set.code,
  );
  assertClientHidden(anon, "anon");
  assertClientHidden(authenticated, "authenticated");
  expectCount(
    authenticated.pokemon_card_count,
    pokemonAuthBefore,
    "authenticated Pokemon visibility",
  );
  return {
    state,
    exact,
    security,
    source,
    client_visibility: { anon, authenticated },
  };
}

async function executeDatabaseMode({ mode, payload, plan }) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
  });
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query("begin");
    transactionOpen = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '240s'");
    const before = await captureMtgSetPromotionStateV1(client, plan);
    const stage = await captureMtgSetPromotionStageV1(client, plan);
    const reconciliation = reconcileMtgStageRowsV1(stage.rows, plan.staging_contract);
    const collisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
    const baselineFindings = evaluateMtgSetPromotionBaselineV1({
      plan,
      state: before,
      stage,
      reconciliation,
      collisions,
    });
    if (baselineFindings.length > 0) throw new Error(baselineFindings.join(", "));
    const securityBefore = await captureMtgSetPromotionSecurityV1(client);
    assertMtgSetPromotionSecurityV1(securityBefore);
    const sourceBefore = await captureMtgSetPromotionCurrentSourceLanesV1(client, payload);
    assertMtgSetPromotionSourceLanesV1(sourceBefore, plan);
    const pokemonAuthBefore = await captureVisiblePokemonCountV1(client, "authenticated");

    const inserted = await insertMtgPromotionRowsV1(client, plan.rows);
    for (const [name, expected] of Object.entries(plan.row_counts)) {
      expectCount(inserted[name], expected, `${name} inserted rows`);
    }
    const transaction = await verifyPromotedState(
      client,
      payload,
      plan,
      before,
      pokemonAuthBefore,
    );

    if (mode === "apply") {
      await client.query("commit");
      transactionOpen = false;
      const durable = await verifyPromotedState(
        client,
        payload,
        plan,
        before,
        pokemonAuthBefore,
      );
      return {
        before,
        staging_reconciliation: reconciliation,
        collisions,
        security_before: securityBefore,
        source_before: sourceBefore,
        authenticated_pokemon_before: pokemonAuthBefore,
        inserted,
        transaction,
        durable,
      };
    }

    await client.query("rollback");
    transactionOpen = false;
    const after = await captureMtgSetPromotionStateV1(client, plan);
    if (stableJson(after) !== stableJson(before)) {
      throw new Error("Writer rollback did not restore the exact canonical baseline");
    }
    const afterStage = await captureMtgSetPromotionStageV1(client, plan);
    const afterReconciliation = reconcileMtgStageRowsV1(afterStage.rows, plan.staging_contract);
    if (afterReconciliation.findings.length > 0) {
      throw new Error(`Writer rollback changed staging: ${afterReconciliation.findings.join(", ")}`);
    }
    const afterCollisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
    if (Object.values(afterCollisions).some((count) => Number(count) !== 0)) {
      throw new Error("Writer rollback left canonical rows");
    }
    const pokemonAuthAfter = await captureVisiblePokemonCountV1(client, "authenticated");
    expectCount(pokemonAuthAfter, pokemonAuthBefore, "post-rollback Pokemon visibility");
    return {
      before,
      staging_reconciliation: reconciliation,
      collisions,
      security_before: securityBefore,
      source_before: sourceBefore,
      authenticated_pokemon_before: pokemonAuthBefore,
      inserted,
      transaction,
      after_rollback: after,
      post_rollback_staging_reconciliation: afterReconciliation,
      post_rollback_collisions: afterCollisions,
      authenticated_pokemon_after: pokemonAuthAfter,
    };
  } catch (error) {
    if (transactionOpen) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function report(result) {
  return `# MTG ${result.plan.selected_set.code.toUpperCase()} Canonical Set Promotion Writer

- Status: **${result.status.toUpperCase()}**
- Mode: \`${result.mode}\`
- Governing code commit: \`${result.repository.governing_commit_sha}\`
- Governing source hash: \`${result.repository.governing_files_sha256}\`
- Promotion plan: \`${result.plan.promotion_plan_sha256}\`
- Promotion rows: \`${result.plan.total_rows}\`
- Approval SHA-256: \`${result.approval_sha256}\`
- Release status: \`hidden\`
- Durable database writes: \`${result.boundaries.database_writes}\`

## Exact Apply Approval

\`\`\`text
${result.required_approval_message}
\`\`\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = await captureMtgSetPromotionRepositoryContractV1();
  assertRepository(repository);
  const payloadBody = await fs.readFile(args.payload, "utf8");
  const payload = JSON.parse(payloadBody);
  const plan = buildMtgCanonicalSetPromotionContractV1(payload);
  const approval = buildMtgCanonicalSetPromotionApprovalV1(plan, repository);
  if (args.mode === "apply" && process.env[APPROVAL_ENV] !== approval.required_approval_message) {
    throw new Error(`Exact approval missing from ${APPROVAL_ENV}`);
  }
  const proof = args.mode === "plan" ? null : await executeDatabaseMode({
    mode: args.mode,
    payload,
    plan,
  });
  const publicPlan = {
    ...plan,
    rows: undefined,
    staging_contract: { ...plan.staging_contract, rows: undefined },
  };
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    mode: args.mode,
    status: args.mode === "plan"
      ? "promotion_plan_complete_no_database_access"
      : args.mode === "dry-run"
        ? "promotion_writer_rollback_proof_passed"
        : "hidden_canonical_set_promotion_applied_and_read_back",
    repository,
    payload_sha256: sha256(payloadBody),
    plan: publicPlan,
    approval_sha256: approval.approval_sha256,
    required_approval_message: approval.required_approval_message,
    database_proof: proof,
    boundaries: {
      database_writes: args.mode === "apply",
      transaction_rolled_back: args.mode === "dry-run",
      migration_writes: false,
      release_control_writes: false,
      release_status: "hidden",
      app_visibility_activation: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      pokemon_mutation: false,
      global_db_push: false,
    },
  };
  const outDir = args.outDir ?? path.join(
    ROOT,
    "docs",
    "audits",
    "pricing",
    "mtg_canonical_catalog_set_promotion_writer_v1",
  );
  await fs.mkdir(outDir, { recursive: true });
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), result);
  const reportBody = report(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "summary.json": sha256(summaryBody),
      "REPORT.md": sha256(reportBody),
    },
  });
  process.stdout.write(`${JSON.stringify({
    out_dir: outDir,
    status: result.status,
    plan: plan.promotion_plan_sha256,
    approval_sha256: approval.approval_sha256,
  })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
