import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUTPUT_PATH = path.join(
  REPO_ROOT,
  "docs",
  "audits",
  "release_completion_v1",
  "device_android",
  "exact_printing_message_journey_readback_v1.json",
);
const MESSAGE_MARKER = "Release_test_exact_printing_no_action_needed";

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

const databaseUrl = connectionString();
if (!databaseUrl) {
  throw new Error("SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required");
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: sslConfig(databaseUrl),
  application_name: "grookai_exact_printing_device_journey_readback_v1",
});

await client.connect();
try {
  await client.query("begin transaction read only");
  await client.query("set local statement_timeout = '60s'");

  const interaction = (
    await client.query(
      `select
         ci.id::text as interaction_id,
         ci.created_at,
         ci.status,
         cp.gv_id as parent_gv_id,
         cp.name as card_name,
         cp.set_code,
         cp.number,
         printing.printing_gv_id,
         printing.finish_key,
         (printing.card_print_id = ci.card_print_id) as child_parent_match,
         (ci.sender_user_id <> ci.receiver_user_id) as participants_are_distinct
       from public.card_interactions ci
       join public.card_prints cp on cp.id = ci.card_print_id
       join public.card_printings printing on printing.id = ci.card_printing_id
       where ci.message like $1
       order by ci.created_at desc
       limit 1`,
      [`%${MESSAGE_MARKER}%`],
    )
  ).rows[0] ?? null;

  if (!interaction) {
    throw new Error("exact-printing Samsung journey interaction was not found");
  }

  const stateReadback = (
    await client.query(
      `select
         count(*)::int as participant_state_count,
         count(*) filter (where states.card_printing_id is not null)::int
           as exact_participant_state_count,
         count(distinct states.user_id)::int as distinct_participant_state_users,
         bool_and(states.card_print_id = printing.card_print_id)
           as all_state_parents_match
       from public.card_interaction_group_states states
       join public.card_printings printing
         on printing.id = states.card_printing_id
       join public.card_interactions interaction
         on interaction.id = $1::uuid
       where states.card_print_id = interaction.card_print_id
         and states.card_printing_id = interaction.card_printing_id
         and (
           (states.user_id = interaction.sender_user_id
             and states.counterpart_user_id = interaction.receiver_user_id)
           or
           (states.user_id = interaction.receiver_user_id
             and states.counterpart_user_id = interaction.sender_user_id)
         )`,
      [interaction.interaction_id],
    )
  ).rows[0];

  const integrity = (
    await client.query(
      `select
         (select count(*)::int
          from public.card_interactions ci
          join public.card_printings printing
            on printing.id = ci.card_printing_id
          where ci.card_printing_id is not null
            and printing.card_print_id is distinct from ci.card_print_id)
           as invalid_interaction_parent_links,
         (select count(*)::int
          from public.card_interaction_group_states states
          join public.card_printings printing
            on printing.id = states.card_printing_id
          where states.card_printing_id is not null
            and printing.card_print_id is distinct from states.card_print_id)
           as invalid_state_parent_links,
         (select count(*)::int
          from (
            select user_id, card_print_id, card_printing_id, counterpart_user_id
            from public.card_interaction_group_states
            group by user_id, card_print_id, card_printing_id, counterpart_user_id
            having count(*) > 1
          ) duplicate_states) as duplicate_state_identity_tuples`,
    )
  ).rows[0];

  await client.query("commit");

  const checks = {
    interaction_found: true,
    exact_printing_recorded: Boolean(interaction.printing_gv_id),
    child_parent_match: interaction.child_parent_match === true,
    participants_are_distinct: interaction.participants_are_distinct === true,
    two_participant_states_recorded:
      stateReadback.participant_state_count === 2 &&
      stateReadback.exact_participant_state_count === 2 &&
      stateReadback.distinct_participant_state_users === 2,
    all_state_parents_match: stateReadback.all_state_parents_match === true,
    global_parent_integrity_clean:
      integrity.invalid_interaction_parent_links === 0 &&
      integrity.invalid_state_parent_links === 0,
    duplicate_state_identity_tuples_absent:
      integrity.duplicate_state_identity_tuples === 0,
  };

  const proof = {
    schema_version: "CARD_INTERACTION_EXACT_PRINTING_DEVICE_JOURNEY_READBACK_V1",
    recorded_at: new Date().toISOString(),
    source_commit_sha: git(["rev-parse", "HEAD"]),
    device_evidence: {
      platform: "Android",
      model: "SM-S908U",
      package: "com.grookai.vault",
      version_name: "1.0.0",
      version_code: 21,
      journey_marker: MESSAGE_MARKER,
    },
    interaction: {
      interaction_id: interaction.interaction_id,
      created_at: interaction.created_at,
      status: interaction.status,
      parent_gv_id: interaction.parent_gv_id,
      card_name: interaction.card_name,
      set_code: interaction.set_code,
      number: interaction.number,
      printing_gv_id: interaction.printing_gv_id,
      finish_key: interaction.finish_key,
    },
    participant_state_readback: stateReadback,
    global_integrity: integrity,
    checks,
    status: Object.values(checks).every(Boolean) ? "passed" : "failed",
    identities_redacted: true,
    boundaries: {
      transaction_mode: "read_only",
      persistent_rows_created_by_readback: 0,
      existing_rows_updated_by_readback: 0,
      existing_rows_deleted_by_readback: 0,
      canonical_identity_mutated: false,
      vault_ownership_mutated: false,
      pricing_mutated: false,
    },
  };

  if (proof.status !== "passed") {
    throw new Error(`device journey readback failed: ${JSON.stringify(checks)}`);
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(proof, null, 2));
} catch (error) {
  try {
    await client.query("rollback");
  } catch {}
  throw error;
} finally {
  await client.end();
}
