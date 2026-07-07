import pg from "pg";

const DB_URL = process.env.SUPABASE_DB_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54330/postgres";

const USER_A = "00000000-0000-4000-8000-00000000e2a1";
const USER_B = "00000000-0000-4000-8000-00000000e2b1";
let gameId = "b5819e3f-0b2b-48c1-bf9a-0c87a57ea9b5";
const SET_ID = "00000000-0000-4000-8000-00000000e2c1";
const CARD_ID = "00000000-0000-4000-8000-00000000e2d1";

const client = new pg.Client({ connectionString: DB_URL });

async function q(text, params = []) {
  return client.query(text, params);
}

async function setup() {
  await q("begin");
  await q("delete from public.notifications_log where recipient_user_id in ($1, $2)", [USER_A, USER_B]);
  await q(`
    delete from public.notification_emit_failures
    where recipient_user_id in ($1, $2)
       or source_id in (select id from public.notification_outbox where recipient_user_id in ($1, $2))
  `, [USER_A, USER_B]);
  await q("delete from public.notification_delivery_budgets where user_id in ($1, $2)", [USER_A, USER_B]);
  await q("delete from public.notification_outbox where recipient_user_id in ($1, $2)", [USER_A, USER_B]);
  await q("delete from public.device_tokens where user_id in ($1, $2) or token like 'pr2-proof-%'", [USER_A, USER_B]);
  await q("delete from public.notification_prefs where user_id in ($1, $2)", [USER_A, USER_B]);
  await q("delete from public.watches where user_id in ($1, $2) and subject_id = $3", [USER_A, USER_B, CARD_ID]);
  await q("delete from public.public_profiles where user_id in ($1, $2)", [USER_A, USER_B]);
  await q("delete from auth.users where id in ($1, $2)", [USER_A, USER_B]);

  await q(`
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at
    ) values
      ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pr2-a@grookai.test', 'x', now(), now(), now()),
      ($2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pr2-b@grookai.test', 'x', now(), now(), now())
    on conflict (id) do nothing;
  `, [USER_A, USER_B]);

  await q(`
    insert into public.public_profiles (user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled)
    values
      ($1, 'pr2-a', 'PR2 A', true, true),
      ($2, 'pr2-b', 'PR2 B', true, true)
    on conflict (user_id) do update set display_name = excluded.display_name;
  `, [USER_A, USER_B]);

  await q(`
    insert into public.games (id, code, name, slug)
    values ($1, 'pokemon', 'Pokemon', 'pokemon')
    on conflict (code) do update set name = excluded.name
  `, [gameId]);
  gameId = (await q("select id from public.games where code = 'pokemon' limit 1")).rows[0].id;

  await q(`
    insert into public.sets (id, game, name, code, release_date, created_at, updated_at)
    values ($1, 'pokemon', 'PR2 Proof Set', 'PR2', now(), now(), now())
    on conflict (id) do nothing;
  `, [SET_ID]);

  await q(`
    insert into public.card_prints (id, game_id, set_id, name, number, set_code, gv_id)
    values ($1, $2, $3, 'PR2 Proof Pikachu', '001', 'PR2', 'GV-PR2-001')
    on conflict (id) do update set
      name = excluded.name,
      gv_id = excluded.gv_id;
  `, [CARD_ID, gameId, SET_ID]);

  await q(`
    insert into public.device_tokens (user_id, token, platform)
    values ($1, 'pr2-proof-token-active', 'android')
    on conflict (token) do update set user_id = excluded.user_id, disabled_at = null, last_seen_at = now();
  `, [USER_B]);
  await q("commit");
}

async function createOutboxRows(count, prefix, recipient = USER_B) {
  for (let i = 0; i < count; i += 1) {
    await q(`
      insert into public.notification_outbox (
        recipient_user_id,
        event_type,
        tier,
        card_print_id,
        actor_user_id,
        payload,
        dedupe_key
      ) values (
        $1,
        'message_received',
        'instant',
        $2,
        $3,
        jsonb_build_object('message_preview', $4::text),
        $5
      );
    `, [recipient, CARD_ID, USER_A, `proof message ${prefix}-${i}`, `${prefix}:${i}`]);
  }
}

async function budgetProof() {
  await q("begin");
  await createOutboxRows(5, "budget");
  const { rows } = await q("select * from public.notification_dispatcher_claim_batch_v1(10)");
  const sent = [];
  const folded = [];
  for (const row of rows) {
    const { rows: budgetRows } = await q(
      "select public.notification_dispatcher_reserve_budget_v1($1, current_date) as ok",
      [row.recipient_user_id],
    );
    if (budgetRows[0].ok) {
      await q("select public.notification_dispatcher_mark_send_started_v1($1)", [row.id]);
      await q(
        "select public.notification_dispatcher_mark_sent_v1($1, gen_random_uuid(), (select id from public.device_tokens where user_id = $2 limit 1), 'PR2 Proof Pikachu · PR2 A sent you a message', 'proof', 'grookai://card/GV-PR2-001')",
        [row.id, USER_B],
      );
      sent.push(row.id);
    } else {
      await q(
        "select public.notification_dispatcher_mark_folded_v1($1, 'PR2 Proof Pikachu', 'folded', 'grookai://card/GV-PR2-001', 'daily_budget_exhausted')",
        [row.id],
      );
      folded.push(row.id);
    }
  }
  const summary = await q(`
    select send_status, count(*)::int as count
    from public.notifications_log
    where outbox_id = any($1::uuid[])
    group by send_status
    order by send_status;
  `, [[...sent, ...folded]]);
  await q("rollback");
  return { claimed: rows.length, sent: sent.length, folded: folded.length, log: summary.rows };
}

async function concurrentBudgetProof() {
  await q("begin");
  await q("delete from public.notification_delivery_budgets where user_id = $1 and budget_date = current_date", [USER_B]);
  const clients = await Promise.all(
    Array.from({ length: 5 }, async () => {
      const c = new pg.Client({ connectionString: DB_URL });
      await c.connect();
      return c;
    }),
  );
  const reservations = await Promise.all(
    clients.map((c) =>
      c.query("select public.notification_dispatcher_reserve_budget_v1($1, current_date) as ok", [USER_B])
    ),
  );
  await Promise.all(clients.map((c) => c.end()));
  const ok = reservations.filter((result) => result.rows[0].ok).length;
  const denied = reservations.length - ok;
  await q("rollback");
  return { attempted: reservations.length, reserved: ok, denied };
}

async function retryProof() {
  await q("begin");
  await createOutboxRows(1, "retry");
  let { rows } = await q("select * from public.notification_dispatcher_claim_batch_v1(1)");
  const row = rows[0];
  const states = [];
  for (let i = 0; i < 3; i += 1) {
    const { rows: statusRows } = await q(
      "select public.notification_dispatcher_mark_retry_or_failed_v1($1, 'forced_transient', now() + interval '1 second') as status",
      [row.id],
    );
    states.push(statusRows[0].status);
    if (statusRows[0].status === "retry") {
      await q("update public.notification_outbox set next_attempt_at = now(), available_at = now() where id = $1", [row.id]);
      rows = (await q("select * from public.notification_dispatcher_claim_batch_v1(1)")).rows;
    }
  }
  const finalRow = await q("select attempts, failed_at is not null as dead_lettered, failure_reason from public.notification_outbox where id = $1", [row.id]);
  await q("rollback");
  return { states, final: finalRow.rows[0] };
}

async function suppressProof() {
  await q("begin");
  await q("insert into public.notification_prefs (user_id, instant_enabled) values ($1, false)", [USER_B]);
  await createOutboxRows(1, "pref");
  let row = (await q("select * from public.notification_dispatcher_claim_batch_v1(1)")).rows[0];
  await q(
    "select public.notification_dispatcher_mark_folded_v1($1, 'PR2 Proof Pikachu', 'folded', 'grookai://card/GV-PR2-001', 'instant_disabled')",
    [row.id],
  );
  const prefLog = await q("select send_status, failure_reason from public.notifications_log where outbox_id = $1", [row.id]);

  await q("delete from public.notification_prefs where user_id = $1", [USER_B]);
  await q(`
    insert into public.watches (user_id, subject_type, subject_id, reason, strength, muted_at)
    values ($1, 'card', $2, 'manual', 1, now())
    on conflict (user_id, subject_type, subject_id)
    do update set muted_at = excluded.muted_at;
  `, [USER_B, CARD_ID]);
  await createOutboxRows(1, "mute");
  row = (await q("select * from public.notification_dispatcher_claim_batch_v1(1)")).rows[0];
  await q(
    "select public.notification_dispatcher_mark_skipped_v1($1, 'PR2 Proof Pikachu', 'skipped', 'grookai://card/GV-PR2-001', 'watch_muted')",
    [row.id],
  );
  const muteLog = await q("select send_status, failure_reason from public.notifications_log where outbox_id = $1", [row.id]);
  await q("rollback");
  return { disabledPrefs: prefLog.rows[0], mutedWatch: muteLog.rows[0] };
}

async function tokenHygieneProof() {
  await q("begin");
  const tokenId = (await q("select id from public.device_tokens where user_id = $1 limit 1", [USER_B])).rows[0].id;
  await q("select public.notification_dispatcher_disable_token_v1($1, 'forced_unregistered')", [tokenId]);
  const token = await q("select disabled_at is not null as disabled from public.device_tokens where id = $1", [tokenId]);
  await q("rollback");
  return token.rows[0];
}

async function validationFailureProof() {
  await q("begin");
  await q(`
    insert into public.notification_emit_failures (source, recipient_user_id, event_type, error_message, payload)
    values ('notification_dispatcher', $1, 'message_received', 'missing_card_anchor', '{}'::jsonb)
  `, [USER_B]);
  const count = await q(`
    select count(*)::int as failures
    from public.notification_emit_failures
    where recipient_user_id = $1 and error_message = 'missing_card_anchor'
  `, [USER_B]);
  await q("rollback");
  return count.rows[0];
}

try {
  await client.connect();
  await setup();
  const report = {
    budget: await budgetProof(),
    concurrentBudget: await concurrentBudgetProof(),
    retry: await retryProof(),
    suppression: await suppressProof(),
    tokenHygiene: await tokenHygieneProof(),
    validationFailure: await validationFailureProof(),
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.end().catch(() => null);
}
