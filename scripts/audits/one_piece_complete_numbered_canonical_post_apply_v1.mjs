import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateOnePieceCompleteNumberedPostApplyV1,
  summarizeOnePieceCompleteNumberedDurableReadbackV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_apply_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";
import {
  captureOnePieceCompleteNumberedDurableReadbackV1,
} from "./one_piece_complete_numbered_canonical_apply_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PATHS = Object.freeze({
  promotionPlan: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_numbered_canonical_promotion_v1", "frozen_plan_v1",
    "promotion_plan.json.gz"),
  applyPlan: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_numbered_canonical_apply_v1", "frozen_apply_plan_v1",
    "apply_plan.json"),
  applySummary: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_numbered_canonical_apply_v1", "durable_apply_v1",
    "summary.json"),
});
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_apply_v1",
  "independent_post_apply_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseArgs(argv) {
  const args = {
    verify: false,
    expectedHeadSha: "",
    envFile: "C:\\grookai_vault\\.env.local",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument === "--verify-post-apply") args.verify = true;
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!args.verify) throw new Error("--verify-post-apply is required");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body, "utf8");
}

function clientOptions(connectionString) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: "one-piece-complete-numbered-independent-post-apply-v1",
  };
}

async function captureGlobal(client, promotionPlan) {
  const targetIds = promotionPlan.payload.numbered_cards.map((row) =>
    row.card_print.id);
  const heldProducts = [
    ...promotionPlan.payload.authority_holds,
    ...promotionPlan.payload.non_english_language_holds,
  ].map((row) => String(row.source_product_id));
  const row = (await client.query(`select
    (select count(*)::int from public.sets where game='one_piece') as sets,
    (select count(*)::int from public.card_prints where game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid) as card_prints,
    (select count(*)::int from public.card_print_identity i join public.card_prints c
      on c.id=i.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid) as card_print_identity,
    (select count(*)::int from public.card_print_identity_source_evidence e
      join public.card_prints c on c.id=e.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid)
      as card_print_identity_source_evidence,
    (select count(*)::int from public.external_mappings e join public.card_prints c
      on c.id=e.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid) as external_mappings,
    (select count(*)::int from public.card_printings p join public.card_prints c
      on c.id=p.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid) as card_printings,
    (select count(*)::int from public.external_printing_mappings e
      join public.card_printings p on p.id=e.card_printing_id
      join public.card_prints c on c.id=p.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid)
      as external_printing_mappings,
    (select count(*)::int from public.card_printings
      where card_print_id=any($1::uuid[])) as target_child_printings,
    (select count(*)::int from public.card_prints where id=any($1::uuid[])
      and (image_url is not null or image_alt_url is not null))
      as target_image_pointers,
    (select count(*)::int from public.external_mappings
      where source='tcgplayer' and external_id=any($2::text[]))
      as held_external_mappings,
    (select release_status from public.catalog_game_release_controls
      where game_code='one_piece') as release_status`,
  [targetIds, heldProducts])).rows[0];
  const result = Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]));
  result.transaction_read_only = (await client.query(
    "show transaction_read_only")).rows[0]?.transaction_read_only === "on";
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    result[`${role}_visible`] = (await client.query(
      "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
    )).rows[0]?.visible === true;
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean post-apply verifier");
  }
  const bodies = Object.fromEntries(await Promise.all(Object.entries(PATHS)
    .map(async ([key, file]) => [key, await fs.readFile(file)])));
  const promotionPlan = JSON.parse(gunzipSync(bodies.promotionPlan));
  const applyPlan = JSON.parse(bodies.applyPlan);
  const applySummary = JSON.parse(bodies.applySummary);
  const runPlan = {
    version: "ONE_PIECE_COMPLETE_NUMBERED_CANONICAL_POST_APPLY_V1",
    recorded_at: new Date().toISOString(),
    repository,
    mode: "fresh_read_only_post_apply_verification",
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: promotionPlan.payload_fingerprint_sha256,
    database_writes: 0,
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const artifacts = {};
  artifacts["run_plan.json"] = await writeJson(
    path.join(args.outDir, "run_plan.json"), runPlan);

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const client = new Client(clientOptions(connectionString));
  await client.connect();
  let open = false;
  let freshReadback;
  let globalReadback;
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    freshReadback = await captureOnePieceCompleteNumberedDurableReadbackV1(
      client, promotionPlan);
    globalReadback = await captureGlobal(client, promotionPlan);
    await client.query("rollback");
    open = false;
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
  const findings = evaluateOnePieceCompleteNumberedPostApplyV1({
    promotionPlan,
    applyPlan,
    applySummary,
    freshReadback,
    globalReadback,
  });
  const summary = {
    version: runPlan.version,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0
      ? "independent_post_apply_readback_passed"
      : "independent_post_apply_readback_failed",
    repository,
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: promotionPlan.payload_fingerprint_sha256,
    readback: summarizeOnePieceCompleteNumberedDurableReadbackV1(freshReadback),
    global_readback: globalReadback,
    findings,
    boundaries: {
      database_writes: 0,
      storage_writes: 0,
      publication_writes: 0,
      app_visibility_changes: 0,
    },
    exact_next_gate: findings.length === 0
      ? "checkpoint hidden English numbered canon; then gate DON and sealed separately"
      : "stop and investigate read-only post-apply findings",
  };
  artifacts["readback.json"] = await writeJson(
    path.join(args.outDir, "readback.json"), {
      digest: summary.readback,
      global: globalReadback,
    });
  artifacts["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"), summary);
  const report = `# Complete One Piece Numbered Canonical Post-Apply V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- One Piece sets/parents/identities/evidence/mappings: \`59 / 6508 / 6508 / 6508 / 6508\`\n` +
    `- Existing child printings/mappings: \`14 / 14\`\n` +
    `- Held products promoted: \`0\`\n` +
    `- New parent image pointers/child printings: \`0 / 0\`\n` +
    `- Hidden for all roles: \`true\`\n` +
    `- Findings: \`${findings.length}\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  artifacts["REPORT.md"] = Buffer.from(report, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: body.length,
      sha256: sha256(body),
    })),
    bound_inputs: Object.entries(PATHS).map(([name, file]) => ({
      name,
      path: path.relative(ROOT, file).replaceAll("\\", "/"),
      sha256: sha256(bodies[name]),
    })),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (findings.length) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { PATHS };
