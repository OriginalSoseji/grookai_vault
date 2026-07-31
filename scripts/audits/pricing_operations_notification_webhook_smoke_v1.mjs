import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";

import pg from "pg";

const ADMIN_URL =
  process.env.LOCAL_SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54330/postgres";
const MIGRATION_PATH =
  "supabase/migrations/20260728050000_pricing_operations_notification_webhook_v1.sql";

function assertLocalDatabase(url) {
  const hostname = new URL(url).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error("operations webhook smoke requires a local PostgreSQL host");
  }
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function main() {
  assertLocalDatabase(ADMIN_URL);
  const databaseName = `pricing_ops_webhook_smoke_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  let smoke = null;

  await admin.connect();
  try {
    await admin.query(`create database ${quoteIdentifier(databaseName)}`);
    const smokeUrl = new URL(ADMIN_URL);
    smokeUrl.pathname = `/${databaseName}`;
    smoke = new pg.Client({ connectionString: smokeUrl.toString() });
    await smoke.connect();

    await smoke.query(`
      create extension if not exists pgcrypto;
      create schema auth;

      create table auth.users (
        id uuid primary key,
        email text
      );

      create table public.user_entitlements (
        id uuid primary key default gen_random_uuid(),
        user_id uuid null references auth.users(id),
        email text null,
        role text not null,
        is_active boolean not null default true
      );

      create table public.card_prints (
        id uuid primary key default gen_random_uuid()
      );

      create table public.notification_outbox (
        id uuid primary key default gen_random_uuid(),
        recipient_user_id uuid not null references auth.users(id),
        event_type text not null,
        tier text not null,
        card_print_id uuid not null references public.card_prints(id),
        actor_user_id uuid null references auth.users(id),
        payload jsonb not null default '{}'::jsonb,
        dedupe_key text not null,
        attempts integer not null default 0,
        available_at timestamptz not null default now(),
        next_attempt_at timestamptz not null default now(),
        claimed_at timestamptz null,
        claim_expires_at timestamptz null,
        send_started_at timestamptz null,
        sent_at timestamptz null,
        folded_into_digest_at timestamptz null,
        failed_at timestamptz null,
        created_at timestamptz not null default now(),
        unique (recipient_user_id, dedupe_key)
      );
    `);

    const migration = await fs.readFile(MIGRATION_PATH, "utf8");
    await smoke.query(migration);

    const founderId = randomUUID();
    await smoke.query(
      "insert into auth.users (id, email) values ($1, 'founder@example.test')",
      [founderId],
    );
    await smoke.query(
      `
        insert into public.user_entitlements (
          user_id,
          email,
          role,
          is_active
        )
        values ($1, 'founder@example.test', 'founder', true)
      `,
      [founderId],
    );

    const notificationId = randomUUID();
    const payload = {
      notification_id: notificationId,
      event: "systemd_on_failure",
      severity: "critical",
      host: "pricing-smoke.local",
      unit: "grookai-tcgplayer-market-pipeline.service",
      commit_sha: "smoke",
    };
    const first = await smoke.query(
      "select * from public.enqueue_operations_notification_v1($1::jsonb)",
      [payload],
    );
    const second = await smoke.query(
      "select * from public.enqueue_operations_notification_v1($1::jsonb)",
      [payload],
    );
    const counts = await smoke.query(`
      select
        (select count(*)::integer from public.operations_notification_events)
          as event_count,
        (select count(*)::integer from public.notification_outbox)
          as outbox_count
    `);

    let mutationBlocked = false;
    try {
      await smoke.query(
        "update public.operations_notification_events set severity = 'critical'",
      );
    } catch (error) {
      mutationBlocked = String(error.message).includes("append-only");
    }

    let nonOperationsNullAnchorBlocked = false;
    try {
      await smoke.query(
        `
          insert into public.notification_outbox (
            recipient_user_id,
            event_type,
            tier,
            card_print_id,
            payload,
            dedupe_key
          )
          values ($1, 'message_received', 'instant', null, '{}'::jsonb, 'bad')
        `,
        [founderId],
      );
    } catch (error) {
      nonOperationsNullAnchorBlocked =
        error.code === "23514";
    }

    const firstClaim = await smoke.query(
      "select * from public.notification_dispatcher_claim_operations_alert_v1($1)",
      [notificationId],
    );
    const secondClaim = await smoke.query(
      "select * from public.notification_dispatcher_claim_operations_alert_v1($1)",
      [notificationId],
    );

    const result = {
      status: "passed",
      migration: MIGRATION_PATH,
      first_enqueue_rows: first.rowCount,
      second_enqueue_rows: second.rowCount,
      event_count: counts.rows[0].event_count,
      outbox_count: counts.rows[0].outbox_count,
      recipient_count: first.rows[0]?.recipient_count ?? null,
      mutation_blocked: mutationBlocked,
      non_operations_null_anchor_blocked: nonOperationsNullAnchorBlocked,
      first_claim_rows: firstClaim.rowCount,
      second_claim_rows: secondClaim.rowCount,
    };

    const failed = Object.entries({
      event_count: result.event_count === 1,
      outbox_count: result.outbox_count === 1,
      recipient_count: result.recipient_count === 1,
      mutation_blocked: result.mutation_blocked,
      non_operations_null_anchor_blocked:
        result.non_operations_null_anchor_blocked,
      first_claim_rows: result.first_claim_rows === 1,
      second_claim_rows: result.second_claim_rows === 0,
    }).filter(([, passed]) => !passed);
    if (failed.length > 0) {
      throw new Error(
        `operations webhook smoke failed: ${failed.map(([name]) => name).join(",")}`,
      );
    }

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    if (smoke) await smoke.end().catch(() => null);
    await admin.query(
      `
        select pg_terminate_backend(pid)
        from pg_stat_activity
        where datname = $1
          and pid <> pg_backend_pid()
      `,
      [databaseName],
    ).catch(() => null);
    await admin.query(`drop database if exists ${quoteIdentifier(databaseName)}`);
    await admin.end();
  }
}

main().catch((error) => {
  console.error(`[pricing-operations-webhook-smoke] ${error.stack || error.message}`);
  process.exitCode = 1;
});
