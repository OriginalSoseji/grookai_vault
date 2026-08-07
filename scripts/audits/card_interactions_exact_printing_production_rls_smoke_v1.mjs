import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const OUTPUT_PATH = path.join(
  "docs",
  "audits",
  "release_completion_v1",
  "card_interactions_exact_printing_production_rls_smoke_v1.json",
);
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DB_URL is required");
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function countRows() {
  const result = await client.query(
    `select
       (select count(*)::int from public.card_interactions) as interactions,
       (select count(*)::int from public.card_interaction_group_states) as group_states`,
  );
  return result.rows[0];
}

try {
  await client.connect();
  const before = await countRows();
  await client.query("begin");

  const targetResult = await client.query(
    `select vault_item_id, owner_user_id, card_print_id, card_printing_id
     from public.v_card_contact_targets_v1
     where card_printing_id is not null
     order by created_at desc nulls last
     limit 1`,
  );
  const target = targetResult.rows[0];
  if (!target) {
    throw new Error("No exact-printing contact target is available for the smoke test");
  }

  const participantResult = await client.query(
    `select u.id
     from auth.users u
     where u.id <> $1
       and not public.trust_block_exists_between_v1(u.id, $1)
     order by u.created_at
     limit 2`,
    [target.owner_user_id],
  );
  if (participantResult.rows.length < 2) {
    throw new Error("Two non-owner users are required for participant and outsider proof");
  }
  const senderId = participantResult.rows[0].id;
  const outsiderId = participantResult.rows[1].id;

  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
    senderId,
  ]);
  await client.query(
    "select set_config('request.jwt.claim.role', 'authenticated', true)",
  );

  const insertedResult = await client.query(
    `insert into public.card_interactions (
       card_print_id,
       card_printing_id,
       vault_item_id,
       sender_user_id,
       receiver_user_id,
       message,
       status
     ) values ($1, $2, $3, $4, $5, $6, 'open')
     returning id`,
    [
      target.card_print_id,
      target.card_printing_id,
      target.vault_item_id,
      senderId,
      target.owner_user_id,
      "[ROLLBACK-ONLY] exact printing release smoke",
    ],
  );
  const interactionId = insertedResult.rows[0]?.id;
  if (!interactionId) {
    throw new Error("Exact-printing interaction insert did not return an ID");
  }

  const senderInteraction = await client.query(
    `select count(*)::int as count
     from public.card_interactions
     where id = $1
       and card_printing_id = $2`,
    [interactionId, target.card_printing_id],
  );
  const senderState = await client.query(
    `select count(*)::int as count
     from public.card_interaction_group_states
     where user_id = $1
       and card_print_id = $2
       and card_printing_id = $3
       and counterpart_user_id = $4`,
    [senderId, target.card_print_id, target.card_printing_id, target.owner_user_id],
  );

  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
    target.owner_user_id,
  ]);
  const receiverInteraction = await client.query(
    `select count(*)::int as count
     from public.card_interactions
     where id = $1
       and card_printing_id = $2`,
    [interactionId, target.card_printing_id],
  );
  const receiverState = await client.query(
    `select count(*)::int as count
     from public.card_interaction_group_states
     where user_id = $1
       and card_print_id = $2
       and card_printing_id = $3
       and counterpart_user_id = $4`,
    [target.owner_user_id, target.card_print_id, target.card_printing_id, senderId],
  );

  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
    outsiderId,
  ]);
  const outsiderInteraction = await client.query(
    "select count(*)::int as count from public.card_interactions where id = $1",
    [interactionId],
  );
  const outsiderStates = await client.query(
    `select count(*)::int as count
     from public.card_interaction_group_states
     where card_print_id = $1
       and card_printing_id = $2
       and counterpart_user_id in ($3, $4)`,
    [target.card_print_id, target.card_printing_id, senderId, target.owner_user_id],
  );

  await client.query("reset role");
  const mismatchedPrintingResult = await client.query(
    `select id
     from public.card_printings
     where card_print_id <> $1
     order by created_at
     limit 1`,
    [target.card_print_id],
  );
  const mismatchedPrintingId = mismatchedPrintingResult.rows[0]?.id;
  if (!mismatchedPrintingId) {
    throw new Error("No mismatched child printing is available for trigger proof");
  }

  let mismatchRejected = false;
  let mismatchErrorCode = null;
  let mismatchErrorMessage = null;
  await client.query("savepoint mismatch_probe");
  try {
    await client.query(
      `insert into public.card_interactions (
         card_print_id,
         card_printing_id,
         vault_item_id,
         sender_user_id,
         receiver_user_id,
         message,
         status
       ) values ($1, $2, $3, $4, $5, $6, 'open')`,
      [
        target.card_print_id,
        mismatchedPrintingId,
        target.vault_item_id,
        senderId,
        target.owner_user_id,
        "[ROLLBACK-ONLY] mismatched child rejection smoke",
      ],
    );
  } catch (error) {
    mismatchErrorCode = typeof error?.code === "string" ? error.code : null;
    mismatchErrorMessage = String(error?.message ?? error);
    mismatchRejected =
      mismatchErrorCode === "23514" &&
      mismatchErrorMessage === "card_interaction_printing_parent_mismatch";
    await client.query("rollback to savepoint mismatch_probe");
  }
  if (!mismatchRejected) {
    throw new Error("Mismatched child printing was not rejected by the parent guard");
  }

  const transactionEvidence = {
    exact_target_available: true,
    sender_interaction_visible: senderInteraction.rows[0].count === 1,
    sender_exact_state_visible: senderState.rows[0].count === 1,
    receiver_interaction_visible: receiverInteraction.rows[0].count === 1,
    receiver_exact_state_visible: receiverState.rows[0].count === 1,
    outsider_interaction_visible_count: outsiderInteraction.rows[0].count,
    outsider_state_visible_count: outsiderStates.rows[0].count,
    mismatched_child_rejected: mismatchRejected,
    mismatch_error_code: mismatchErrorCode,
    mismatch_error_message: mismatchErrorMessage,
  };

  if (
    !transactionEvidence.sender_interaction_visible ||
    !transactionEvidence.sender_exact_state_visible ||
    !transactionEvidence.receiver_interaction_visible ||
    !transactionEvidence.receiver_exact_state_visible ||
    transactionEvidence.outsider_interaction_visible_count !== 0 ||
    transactionEvidence.outsider_state_visible_count !== 0
  ) {
    throw new Error("Participant or outsider RLS proof failed");
  }

  await client.query("rollback");
  const after = await countRows();
  const probeReadback = await client.query(
    "select count(*)::int as count from public.card_interactions where id = $1",
    [interactionId],
  );
  const rollbackVerified =
    before.interactions === after.interactions &&
    before.group_states === after.group_states &&
    probeReadback.rows[0].count === 0;
  if (!rollbackVerified) {
    throw new Error("Rollback verification failed");
  }

  const proof = {
    schema_version: "CARD_INTERACTIONS_EXACT_PRINTING_PRODUCTION_RLS_SMOKE_V1",
    recorded_at: new Date().toISOString(),
    source_commit_sha: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    transaction_evidence: transactionEvidence,
    row_counts_before: before,
    row_counts_after: after,
    rollback_verified: rollbackVerified,
    identities_redacted: true,
    boundaries: {
      transaction_committed: false,
      persistent_rows_created: 0,
      existing_rows_updated: 0,
      existing_rows_deleted: 0,
      canonical_identity_mutated: false,
      vault_ownership_mutated: false,
      pricing_mutated: false,
    },
  };

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
