import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  CLEAN_ACCOUNT_JOURNEY_READBACK_POLICY_V1,
  evaluateCleanAccountJourneyReadbackV1,
} from "../../backend/release/clean_account_journey_readback_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_VERSION = "RELEASE_CLEAN_ACCOUNT_JOURNEY_READBACK_AUDIT_V1";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "release",
  "clean_account_journey",
);

function value(argv, name) {
  return (
    argv
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? ""
  );
}

function parseArgs(argv) {
  const deviceEvidence = value(argv, "device-evidence");
  return {
    subjectUserId:
      value(argv, "subject-user-id") ||
      String(process.env.RELEASE_JOURNEY_SUBJECT_USER_ID ?? "").trim(),
    windowStart: value(argv, "window-start"),
    windowEnd: value(argv, "window-end") || new Date().toISOString(),
    expectedAppCommitSha: value(argv, "expected-app-commit-sha"),
    expectedTestflightBuild: value(argv, "expected-testflight-build"),
    deviceEvidencePath: deviceEvidence
      ? path.resolve(deviceEvidence)
      : "",
    outRoot: path.resolve(value(argv, "out-root") || DEFAULT_OUT_ROOT),
    requirePass: argv.includes("--require-pass"),
  };
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

function git(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function iso(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function count(rows, predicate) {
  return rows.filter(predicate).length;
}

function assertNoSensitiveEvidenceKeys(value, location = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSensitiveEvidenceKeys(item, `${location}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  const prohibited = /^(email|password|token|user_?id|device_?serial|udid)$/i;
  for (const [key, child] of Object.entries(value)) {
    if (prohibited.test(key)) {
      throw new Error(`sensitive device evidence key is prohibited: ${location}.${key}`);
    }
    assertNoSensitiveEvidenceKeys(child, `${location}.${key}`);
  }
}

async function loadDeviceEvidence(args) {
  if (!args.deviceEvidencePath) {
    throw new Error("--device-evidence is required");
  }
  const raw = await fs.readFile(args.deviceEvidencePath, "utf8");
  const evidence = JSON.parse(raw);
  assertNoSensitiveEvidenceKeys(evidence);
  const artifactPaths = Array.isArray(evidence.artifact_paths)
    ? evidence.artifact_paths
    : [];
  const artifacts = [];
  for (const [index, configuredPath] of artifactPaths.entries()) {
    const absolutePath = path.resolve(
      path.dirname(args.deviceEvidencePath),
      String(configuredPath),
    );
    const contents = await fs.readFile(absolutePath);
    artifacts.push({
      artifact_index: index + 1,
      size_bytes: contents.length,
      sha256: sha256(contents),
    });
  }
  return {
    rawHash: sha256(raw),
    evidence,
    artifacts,
  };
}

async function queryJourneyEvidence(client, args) {
  await client.query("begin transaction read only");
  try {
    await client.query("set local statement_timeout = '120s'");
    const account = (
      await client.query(
        `select id::text, created_at
         from auth.users
         where id = $1::uuid
         limit 1`,
        [args.subjectUserId],
      )
    ).rows[0] ?? null;

    const parameters = [
      args.subjectUserId,
      args.windowStart,
      args.windowEnd,
    ];
    const instances = (
      await client.query(
        `select
           id::text,
           card_print_id::text,
           intent,
           asking_price_amount,
           created_at,
           updated_at
         from public.vault_item_instances
         where user_id = $1::uuid
           and created_at >= $2::timestamptz
           and created_at <= $3::timestamptz
           and archived_at is null
         order by created_at, id`,
        parameters,
      )
    ).rows;
    const binders = (
      await client.query(
        `select id::text, public_id::text, title, created_at
         from public.binders
         where owner_user_id = $1::uuid
           and created_at >= $2::timestamptz
           and created_at <= $3::timestamptz
           and lifecycle = 'active'
         order by created_at, id`,
        parameters,
      )
    ).rows;
    const cardEvents = (
      await client.query(
        `select id::text, event_type, card_print_id::text, payload, created_at
         from public.card_events
         where actor_user_id = $1::uuid
           and created_at >= $2::timestamptz
           and created_at <= $3::timestamptz
           and event_type in ('vault_added', 'vault_intent_changed')
         order by created_at, id`,
        parameters,
      )
    ).rows;
    const binderIds = binders.map((row) => row.id);
    const binderEvents = binderIds.length === 0
      ? []
      : (
          await client.query(
            `select id::text, binder_id::text, event_type, created_at
             from public.binder_activity_events
             where actor_user_id = $1::uuid
               and binder_id = any($2::uuid[])
               and created_at >= $3::timestamptz
               and created_at <= $4::timestamptz
               and event_type = 'binder_created'
             order by created_at, id`,
            [
              args.subjectUserId,
              binderIds,
              args.windowStart,
              args.windowEnd,
            ],
          )
        ).rows;
    const emissionFailures = (
      await client.query(
        `select count(*)::integer as failure_count
         from public.card_events_emit_failures
         where actor_user_id = $1::uuid
           and created_at >= $2::timestamptz
           and created_at <= $3::timestamptz`,
        parameters,
      )
    ).rows[0]?.failure_count ?? 0;

    await client.query("commit");

    const instanceById = new Map(instances.map((row) => [row.id, row]));
    const binderIdSet = new Set(binderIds);
    const vaultAddedEvents = cardEvents.filter(
      (row) => row.event_type === "vault_added",
    );
    const intentEvents = cardEvents.filter(
      (row) => row.event_type === "vault_intent_changed",
    );
    const vaultAddedMatches = vaultAddedEvents.some((event) => {
      const instanceId = String(
        event.payload?.vault_item_instance_id ?? "",
      );
      const instance = instanceById.get(instanceId);
      return Boolean(
        instance &&
          instance.card_print_id &&
          instance.card_print_id === event.card_print_id,
      );
    });
    const intentEventMatches = intentEvents.some((event) => {
      const instanceId = String(
        event.payload?.vault_item_instance_id ?? "",
      );
      const instance = instanceById.get(instanceId);
      const nextIntent = String(event.payload?.next_intent ?? "").toLowerCase();
      return Boolean(
        instance &&
          ["trade", "sell", "showcase"].includes(nextIntent) &&
          String(instance.intent ?? "").toLowerCase() === nextIntent,
      );
    });

    return {
      account: {
        exists: Boolean(account),
        created_at: iso(account?.created_at),
      },
      database: {
        owned_instance_count: instances.length,
        non_hold_intent_count: count(instances, (row) =>
          ["trade", "sell", "showcase"].includes(
            String(row.intent ?? "").toLowerCase(),
          ),
        ),
        priced_sale_intent_count: count(
          instances,
          (row) =>
            String(row.intent ?? "").toLowerCase() === "sell" &&
            Number(row.asking_price_amount) > 0,
        ),
        binder_count: binders.length,
        vault_added_event_count: vaultAddedEvents.length,
        vault_intent_changed_event_count: intentEvents.length,
        binder_created_event_count: binderEvents.length,
        vault_added_matches_owned_instance: vaultAddedMatches,
        intent_event_matches_current_intent: intentEventMatches,
        binder_created_matches_binder: binderEvents.some((event) =>
          binderIdSet.has(event.binder_id),
        ),
        event_emission_failure_count: Number(emissionFailures),
        first_owned_at: iso(instances[0]?.created_at),
        first_binder_at: iso(binders[0]?.created_at),
        latest_card_activity_at: iso(cardEvents.at(-1)?.created_at),
        latest_binder_activity_at: iso(binderEvents.at(-1)?.created_at),
      },
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

function markdown(report) {
  const lines = [
    "# Physical iPhone Clean-Account Journey Readback",
    "",
    `- Audit: \`${AUDIT_VERSION}\``,
    `- Policy: \`${report.policy_version}\``,
    `- Status: \`${report.status}\``,
    `- TestFlight build: \`${report.release.testflight_build}\``,
    `- App commit: \`${report.release.app_commit_sha}\``,
    `- Subject fingerprint: \`${report.subject_fingerprint_sha256}\``,
    "",
    "## Device Proof",
    "",
    `- Physical iPhone: \`${report.device.physical_device}\``,
    `- Installed from TestFlight: \`${report.device.installed_from_testflight}\``,
    `- Tested at: \`${report.device.tested_at}\``,
    `- Evidence artifacts: \`${report.device.artifact_count}\``,
    "",
    "## Database Readback",
    "",
    `- New owned instances: \`${report.database.owned_instance_count}\``,
    `- Non-hold intents/listings: \`${report.database.non_hold_intent_count}\``,
    `- New Binders: \`${report.database.binder_count}\``,
    `- Linked vault-added activity: \`${report.database.vault_added_matches_owned_instance}\``,
    `- Linked intent activity: \`${report.database.intent_event_matches_current_intent}\``,
    `- Linked Binder-created activity: \`${report.database.binder_created_matches_binder}\``,
    `- Event emission failures: \`${report.database.event_emission_failure_count}\``,
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((finding) => `- \`${finding}\``)
      : ["- none"]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.subjectUserId) throw new Error("--subject-user-id is required");
  if (!args.windowStart) throw new Error("--window-start is required");
  if (!args.expectedAppCommitSha) {
    throw new Error("--expected-app-commit-sha is required");
  }
  if (!args.expectedTestflightBuild) {
    throw new Error("--expected-testflight-build is required");
  }
  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }

  const verifierCommitSha = git(["rev-parse", "HEAD"]);
  const verifierBranch = git(["branch", "--show-current"]);
  const trackedWorktreeClean =
    !git(["status", "--porcelain", "--untracked-files=no"]);
  if (args.requirePass && !trackedWorktreeClean) {
    throw new Error("tracked worktree must be clean with --require-pass");
  }

  const deviceInput = await loadDeviceEvidence(args);
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 120_000,
  });
  await client.connect();
  let databaseEvidence;
  try {
    databaseEvidence = await queryJourneyEvidence(client, args);
  } finally {
    await client.end().catch(() => {});
  }

  const deviceEvidence = deviceInput.evidence;
  const evaluationInput = {
    window: { start: args.windowStart, end: args.windowEnd },
    release: {
      app_commit_sha: deviceEvidence.app_commit_sha,
      expected_app_commit_sha: args.expectedAppCommitSha,
      testflight_build: deviceEvidence.testflight_build,
      expected_testflight_build: args.expectedTestflightBuild,
    },
    device: {
      platform: deviceEvidence.platform,
      physical_device: deviceEvidence.physical_device,
      installed_from_testflight: deviceEvidence.installed_from_testflight,
      device_model_family: deviceEvidence.device_model_family,
      tested_at: deviceEvidence.tested_at,
      confirmations: deviceEvidence.confirmations,
      artifact_count: deviceInput.artifacts.length,
    },
    ...databaseEvidence,
  };
  const evaluation = evaluateCleanAccountJourneyReadbackV1(evaluationInput);
  const report = {
    audit_version: AUDIT_VERSION,
    ...evaluation,
    as_of: new Date().toISOString(),
    verifier_commit_sha: verifierCommitSha,
    verifier_branch: verifierBranch,
    tracked_worktree_clean: trackedWorktreeClean,
    window: evaluationInput.window,
    release: evaluationInput.release,
    subject_fingerprint_sha256: sha256(args.subjectUserId),
    device: evaluationInput.device,
    database: evaluationInput.database,
    device_evidence: {
      input_sha256: deviceInput.rawHash,
      artifacts: deviceInput.artifacts,
    },
    boundaries: {
      database_transaction_read_only: true,
      database_writes: false,
      production_user_mutations: false,
      email_in_artifacts: false,
      user_id_in_artifacts: false,
      device_serial_in_artifacts: false,
    },
  };

  const runDir = path.join(args.outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });
  const runPlan = {
    audit_version: AUDIT_VERSION,
    policy_version: CLEAN_ACCOUNT_JOURNEY_READBACK_POLICY_V1,
    verifier_commit_sha: verifierCommitSha,
    verifier_branch: verifierBranch,
    tracked_worktree_clean: trackedWorktreeClean,
    expected_app_commit_sha: args.expectedAppCommitSha,
    expected_testflight_build: args.expectedTestflightBuild,
    subject_fingerprint_sha256: report.subject_fingerprint_sha256,
    window: report.window,
    require_pass: args.requirePass,
    boundaries: report.boundaries,
  };
  const files = {
    "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
    "summary.json": `${JSON.stringify(report, null, 2)}\n`,
    "REPORT.md": markdown(report),
  };
  const hashes = {};
  for (const [name, contents] of Object.entries(files)) {
    await fs.writeFile(path.join(runDir, name), contents);
    hashes[name] = sha256(contents);
  }
  await fs.writeFile(
    path.join(runDir, "artifact_hashes.json"),
    `${JSON.stringify(hashes, null, 2)}\n`,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        status: report.status,
        completion_allowed: report.completion_allowed,
        findings: report.findings,
        artifact_root: path
          .relative(REPO_ROOT, runDir)
          .replace(/\\/g, "/"),
      },
      null,
      2,
    )}\n`,
  );
  if (args.requirePass && !report.completion_allowed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[clean-account-journey-readback] ${error.stack || error.message}`);
  process.exitCode = 1;
});
