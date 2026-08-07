import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  WANT_MATCH_JOURNEY_READBACK_POLICY_V1,
  evaluateWantMatchJourneyReadbackV1,
} from "../../backend/release/want_match_journey_readback_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_VERSION = "RELEASE_WANT_MATCH_JOURNEY_READBACK_AUDIT_V1";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "release",
  "want_match_journey",
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
    deviceEvidencePath: deviceEvidence ? path.resolve(deviceEvidence) : "",
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

function time(value) {
  const parsed = new Date(value ?? "");
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
}

function same(left, right) {
  return String(left ?? "") === String(right ?? "");
}

function assertNoSensitiveEvidenceKeys(value, location = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSensitiveEvidenceKeys(item, `${location}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  const prohibited = /^(email|password|token|user_?id|device_?serial|udid|message)$/i;
  for (const [key, child] of Object.entries(value)) {
    if (prohibited.test(key)) {
      throw new Error(
        `sensitive device evidence key is prohibited: ${location}.${key}`,
      );
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
  return { rawHash: sha256(raw), evidence, artifacts };
}

function scoreChain(chain) {
  return [
    chain.wantOn,
    chain.wantOff,
    chain.availableEvent,
    chain.interaction,
    chain.sourceExact,
    chain.ownerContextExact,
    chain.messageExact,
    chain.match.status === "stale",
    chain.match.stale_reason === "canonical_want_removed",
  ].filter(Boolean).length;
}

function buildChains(rows) {
  return rows.matches.map((match) => {
    const matchTime = time(match.created_at);
    const wantOn = rows.feedEvents
      .filter(
        (event) =>
          event.event_type === "want_on" &&
          same(event.card_print_id, match.card_print_id) &&
          time(event.created_at) <= matchTime,
      )
      .at(-1);
    const wantOff = rows.feedEvents.find(
      (event) =>
        event.event_type === "want_off" &&
        same(event.card_print_id, match.card_print_id) &&
        time(event.created_at) > matchTime,
    );
    const availableEvent = rows.cardEvents.find(
      (event) =>
        event.event_type === "want_match_available" &&
        same(event.card_print_id, match.card_print_id) &&
        same(event.want_match_id, match.id),
    );
    const interaction = rows.interactions.find(
      (candidate) =>
        same(candidate.card_print_id, match.card_print_id) &&
        same(candidate.sender_user_id, match.want_user_id) &&
        same(candidate.receiver_user_id, match.owner_user_id) &&
        time(candidate.created_at) >= matchTime &&
        (!wantOff || time(candidate.created_at) < time(wantOff.created_at)),
    );
    const sourceExact = Boolean(
      match.source_instance_id &&
        same(match.source_instance_id, match.instance_id) &&
        same(match.source_owner_user_id, match.owner_user_id) &&
        same(match.source_card_print_id, match.card_print_id) &&
        same(match.source_vault_item_id, match.vault_item_id),
    );
    const ownerContextExact = Boolean(
      sourceExact &&
        match.owner_slug &&
        match.owner_display_name &&
        match.owner_slug === match.payload_owner_slug &&
        match.owner_display_name === match.payload_owner_display_name,
    );
    const messageExact = Boolean(
      interaction &&
        sourceExact &&
        same(interaction.vault_item_id, match.vault_item_id) &&
        same(interaction.vault_item_instance_id, match.instance_id) &&
        same(interaction.card_printing_id, match.source_card_printing_id),
    );
    return {
      match,
      wantOn,
      wantOff,
      availableEvent,
      interaction,
      sourceExact,
      ownerContextExact,
      messageExact,
    };
  });
}

async function queryJourneyEvidence(client, args) {
  await client.query("begin transaction read only");
  try {
    await client.query("set local statement_timeout = '120s'");
    const parameters = [
      args.subjectUserId,
      args.windowStart,
      args.windowEnd,
    ];
    const account = (
      await client.query(
        `select created_at
         from auth.users
         where id = $1::uuid
         limit 1`,
        [args.subjectUserId],
      )
    ).rows[0] ?? null;
    const feedEvents = (
      await client.query(
        `select card_print_id::text, event_type, created_at
         from public.card_feed_events
         where user_id = $1::uuid
           and created_at between $2::timestamptz and $3::timestamptz
           and event_type in ('want_on', 'want_off')
         order by created_at, id`,
        parameters,
      )
    ).rows;
    const intents = (
      await client.query(
        `select card_print_id::text, want, updated_at
         from public.user_card_intents
         where user_id = $1::uuid`,
        [args.subjectUserId],
      )
    ).rows;
    const matches = (
      await client.query(
        `select
           wm.id::text,
           wm.want_user_id::text,
           wm.owner_user_id::text,
           wm.card_print_id::text,
           wm.vault_item_id::text,
           wm.instance_id::text,
           wm.status,
           wm.created_at,
           wm.updated_at,
           wm.stale_marked_at,
           wm.payload ->> 'stale_reason' as stale_reason,
           wm.payload ->> 'owner_slug' as payload_owner_slug,
           wm.payload ->> 'owner_display_name' as payload_owner_display_name,
           cp.gv_id,
           pp.slug as owner_slug,
           pp.display_name as owner_display_name,
           vii.id::text as source_instance_id,
           vii.user_id::text as source_owner_user_id,
           vii.legacy_vault_item_id::text as source_vault_item_id,
           coalesce(vii.card_print_id, sc.card_print_id)::text as source_card_print_id,
           vii.card_printing_id::text as source_card_printing_id
         from public.want_matches wm
         join public.card_prints cp on cp.id = wm.card_print_id
         left join public.public_profiles pp on pp.user_id = wm.owner_user_id
         left join public.vault_item_instances vii on vii.id = wm.instance_id
         left join public.slab_certs sc on sc.id = vii.slab_cert_id
         where wm.want_user_id = $1::uuid
           and wm.created_at between $2::timestamptz and $3::timestamptz
         order by wm.created_at, wm.id`,
        parameters,
      )
    ).rows;
    const cardEvents = (
      await client.query(
        `select
           event_type,
           card_print_id::text,
           payload ->> 'want_match_id' as want_match_id,
           created_at
         from public.card_events
         where subject_user_id = $1::uuid
           and created_at between $2::timestamptz and $3::timestamptz
           and event_type = 'want_match_available'
         order by created_at, id`,
        parameters,
      )
    ).rows;
    const interactions = (
      await client.query(
        `select
           card_print_id::text,
           vault_item_id::text,
           vault_item_instance_id::text,
           card_printing_id::text,
           sender_user_id::text,
           receiver_user_id::text,
           status,
           char_length(message)::integer as message_length,
           created_at
         from public.card_interactions
         where sender_user_id = $1::uuid
           and created_at between $2::timestamptz and $3::timestamptz
         order by created_at, id`,
        parameters,
      )
    ).rows;
    const pulseRows = (
      await client.query(
        `select
           event_type,
           card_print_id::text,
           payload ->> 'want_match_id' as want_match_id
         from public.binder_pulse_base_eligible_events_for_viewer_v1($1::uuid)
         where event_type = 'want_match_available'`,
        [args.subjectUserId],
      )
    ).rows;
    const outboxRows = (
      await client.query(
        `select
           event_type,
           card_print_id::text,
           send_started_at,
           sent_at,
           folded_into_digest_at,
           failed_at,
           failure_reason,
           created_at
         from public.notification_outbox
         where recipient_user_id = $1::uuid
           and created_at between $2::timestamptz and $3::timestamptz
           and event_type = any (
             array['want_match_available'::text, 'want_match_digest'::text, 'pulse_daily'::text]
           )
         order by created_at, id`,
        parameters,
      )
    ).rows;
    const emissionFailureCount = Number(
      (
        await client.query(
          `select count(*)::integer as failure_count
           from public.card_events_emit_failures
           where actor_user_id = $1::uuid
             and created_at between $2::timestamptz and $3::timestamptz`,
          parameters,
        )
      ).rows[0]?.failure_count ?? 0,
    );

    await client.query("commit");

    const rows = {
      feedEvents,
      intents,
      matches,
      cardEvents,
      interactions,
      pulseRows,
      outboxRows,
    };
    const chains = buildChains(rows).sort((left, right) => {
      const scoreDelta = scoreChain(right) - scoreChain(left);
      return scoreDelta || time(left.match.created_at) - time(right.match.created_at);
    });
    const chain = chains[0] ?? null;
    const cardIntent = chain
      ? intents.find((intent) => same(intent.card_print_id, chain.match.card_print_id))
      : null;
    const optOutTime = time(chain?.wantOff?.created_at);
    const relevantOutbox = chain
      ? outboxRows.filter(
          (row) =>
            same(row.card_print_id, chain.match.card_print_id) ||
            ["want_match_digest", "pulse_daily"].includes(row.event_type),
        )
      : [];
    const invalidDeliverable = relevantOutbox.filter(
      (row) =>
        !row.sent_at && !row.folded_into_digest_at && !row.failed_at,
    );
    const postOptOutDelivery = relevantOutbox.filter(
      (row) =>
        optOutTime !== null &&
        ((time(row.send_started_at) ?? -Infinity) > optOutTime ||
          (time(row.sent_at) ?? -Infinity) > optOutTime),
    );
    const stalePulseCount = chain
      ? pulseRows.filter((row) => same(row.want_match_id, chain.match.id)).length
      : pulseRows.length;

    return {
      account: {
        exists: Boolean(account),
        created_at: iso(account?.created_at),
      },
      database: {
        want_on_event_count: feedEvents.filter(
          (row) => row.event_type === "want_on",
        ).length,
        want_off_event_count: feedEvents.filter(
          (row) => row.event_type === "want_off",
        ).length,
        want_events_share_exact_card: Boolean(
          chain?.wantOn &&
            chain?.wantOff &&
            same(chain.wantOn.card_print_id, chain.wantOff.card_print_id),
        ),
        want_off_after_want_on: Boolean(
          chain?.wantOn &&
            chain?.wantOff &&
            time(chain.wantOff.created_at) > time(chain.wantOn.created_at),
        ),
        final_current_want: cardIntent?.want === true,
        generated_match_count: matches.length,
        match_owner_is_distinct: Boolean(
          chain && !same(chain.match.want_user_id, chain.match.owner_user_id),
        ),
        exact_source_instance_present: chain?.sourceExact === true,
        owner_context_matches_source: chain?.ownerContextExact === true,
        available_event_count: cardEvents.filter(
          (row) => chain && same(row.want_match_id, chain.match.id),
        ).length,
        card_centered_message_count: interactions.filter(
          (row) => chain && same(row.card_print_id, chain.match.card_print_id),
        ).length,
        message_matches_exact_match_tuple: chain?.messageExact === true,
        message_after_match: Boolean(
          chain?.interaction &&
            time(chain.interaction.created_at) >= time(chain.match.created_at),
        ),
        message_before_opt_out: Boolean(
          chain?.interaction &&
            chain?.wantOff &&
            time(chain.interaction.created_at) < time(chain.wantOff.created_at),
        ),
        active_match_count_after_opt_out: chain?.wantOff
          ? matches.filter(
              (row) =>
                same(row.card_print_id, chain.match.card_print_id) &&
                row.status === "active",
            ).length
          : matches.filter((row) => row.status === "active").length,
        stale_match_count_after_opt_out: chain?.wantOff
          ? matches.filter(
              (row) =>
                same(row.card_print_id, chain.match.card_print_id) &&
                row.status === "stale" &&
                time(row.stale_marked_at) >= time(chain.match.created_at),
            ).length
          : 0,
        canonical_want_removed_reason_present:
          chain?.match.stale_reason === "canonical_want_removed",
        stale_match_pulse_visibility_count: stalePulseCount,
        invalid_deliverable_notification_count: invalidDeliverable.length,
        post_opt_out_notification_delivery_count: postOptOutDelivery.length,
        event_emission_failure_count: emissionFailureCount,
        message_content_redacted: true,
        exact_card_gv_id: chain?.match.gv_id ?? null,
        want_enabled_at: iso(chain?.wantOn?.created_at),
        match_created_at: iso(chain?.match.created_at),
        available_event_at: iso(chain?.availableEvent?.created_at),
        message_created_at: iso(chain?.interaction?.created_at),
        want_disabled_at: iso(chain?.wantOff?.created_at),
        stale_marked_at: iso(chain?.match.stale_marked_at),
      },
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

function markdown(report) {
  const lines = [
    "# Physical iPhone Want Match Journey Readback",
    "",
    `- Audit: \`${AUDIT_VERSION}\``,
    `- Policy: \`${report.policy_version}\``,
    `- Status: \`${report.status}\``,
    `- TestFlight build: \`${report.release.testflight_build}\``,
    `- App commit: \`${report.release.app_commit_sha}\``,
    `- Subject fingerprint: \`${report.subject_fingerprint_sha256}\``,
    `- Exact card: \`${report.database.exact_card_gv_id ?? "not proven"}\``,
    "",
    "## Device Proof",
    "",
    `- Physical iPhone: \`${report.device.physical_device}\``,
    `- Installed from TestFlight: \`${report.device.installed_from_testflight}\``,
    `- Tested at: \`${report.device.tested_at}\``,
    `- Evidence artifacts: \`${report.device.artifact_count}\``,
    "",
    "## Exact Journey Readback",
    "",
    `- Want enabled at: \`${report.database.want_enabled_at}\``,
    `- Match created at: \`${report.database.match_created_at}\``,
    `- Available event at: \`${report.database.available_event_at}\``,
    `- Card-centered message at: \`${report.database.message_created_at}\``,
    `- Want disabled at: \`${report.database.want_disabled_at}\``,
    `- Match marked stale at: \`${report.database.stale_marked_at}\``,
    `- Exact owner/source tuple: \`${report.database.message_matches_exact_match_tuple}\``,
    `- Stale match visible in Pulse: \`${report.database.stale_match_pulse_visibility_count}\``,
    `- Invalid deliverable notifications: \`${report.database.invalid_deliverable_notification_count}\``,
    `- Post-opt-out deliveries: \`${report.database.post_opt_out_notification_delivery_count}\``,
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
  const evaluation = evaluateWantMatchJourneyReadbackV1(evaluationInput);
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
    account: evaluationInput.account,
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
      owner_id_in_artifacts: false,
      match_id_in_artifacts: false,
      interaction_id_in_artifacts: false,
      message_content_in_artifacts: false,
      device_serial_in_artifacts: false,
    },
  };

  const runDir = path.join(args.outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });
  const runPlan = {
    audit_version: AUDIT_VERSION,
    policy_version: WANT_MATCH_JOURNEY_READBACK_POLICY_V1,
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
        exact_card_gv_id: report.database.exact_card_gv_id,
        artifact_root: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
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
  console.error(`[want-match-journey-readback] ${error.stack || error.message}`);
  process.exitCode = 1;
});
