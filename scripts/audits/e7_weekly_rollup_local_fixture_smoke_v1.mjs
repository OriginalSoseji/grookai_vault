import { spawnSync } from 'node:child_process';
import process from 'node:process';
import pg from 'pg';

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54330/postgres';
const connectionString = process.env.E7_SMOKE_DB_URL || DEFAULT_LOCAL_DB_URL;

const USER_A = '00000000-0000-4000-8000-00000000e7a1';
const CARD_ID = '00000000-0000-4000-8000-00000000e711';
const WEEK = '2026-07-06';
const PREV_WEEK = '2026-06-29';

function notificationId(prefix, index) {
  const tail = `${index}`.padStart(4, '0');
  return `00000000-0000-4000-8000-00000${prefix}${tail}`;
}

async function setRole(client, role) {
  await client.query('begin');
  try {
    await client.query(`reset role`);
    await client.query(`set local role ${role}`);
    await client.query('select count(*) from public.north_star_weekly_rollups');
    throw new Error(`${role} unexpectedly read north_star_weekly_rollups`);
  } catch (error) {
    if (!/(permission denied|does not exist)/i.test(String(error.message))) {
      throw error;
    }
  } finally {
    await client.query('rollback');
  }
}

async function seedNotifications(client, weekStart, prefix, eventType, tier, sentCount, tappedCount) {
  const rows = [];
  for (let index = 1; index <= sentCount; index += 1) {
    const sentDay = index <= 20 ? 1 : 2;
    rows.push({
      id: notificationId(prefix, index),
      sentAt: `${weekStart} ${String(sentDay).padStart(2, '0')}:00:00+00`,
      tappedAt: index <= tappedCount ? `${weekStart} ${String(sentDay + 1).padStart(2, '0')}:00:00+00` : null,
    });
  }

  await client.query(`delete from public.notifications_log where id = any($1::uuid[])`, [rows.map((row) => row.id)]);

  for (const row of rows) {
    await client.query(
      `
        insert into public.notifications_log (
          id, recipient_user_id, event_type, tier, card_print_id, title, body,
          deep_link, send_status, sent_at, tapped_at, created_at
        )
        values (
          $1, $2, $3, $4, $5, 'E7 Test', 'E7 Test Body',
          'grookai://card/GV-PK-E7TEST-001', 'sent', $6, $7, $6
        )
      `,
      [row.id, USER_A, eventType, tier, CARD_ID, row.sentAt, row.tappedAt],
    );
  }
}

async function seedOnboarding(client) {
  const eventIds = [
    '00000000-0000-4000-8000-00000000e781',
    '00000000-0000-4000-8000-00000000e782',
    '00000000-0000-4000-8000-00000000e783',
  ];

  for (const [index, eventType] of ['rung_1_owned', 'rung_1_wanted', 'rung_2_followed'].entries()) {
    await client.query(
      `
        insert into public.onboarding_ladder_events (
          id, user_id, event_type, card_print_id, collector_user_id, source, payload, dedupe_key, created_at
        )
        values ($1, $2, $3, $4, null, 'local_fixture', '{}'::jsonb, $5, '2026-07-06 14:00:00+00')
        on conflict do nothing
      `,
      [eventIds[index], USER_A, eventType, CARD_ID, `e7-weekly:${eventType}`],
    );
  }
}

async function callRollup(client, dryRun) {
  const { rows } = await client.query(
    `select entity, action, row_key, payload from public.run_north_star_weekly_rollup_v1($1::date, $2::boolean) order by entity, row_key`,
    [WEEK, dryRun],
  );
  return rows;
}

function assert(condition, message, detail = undefined) {
  if (!condition) {
    const suffix = detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

async function main() {
  const fixture = spawnSync(
    process.execPath,
    ['scripts/audits/e7_meaningful_interactions_local_fixture_smoke_v1.mjs'],
    {
      cwd: process.cwd(),
      env: { ...process.env, E7_SKIP_CLEANUP: '1', E7_SMOKE_DB_URL: connectionString },
      encoding: 'utf8',
    },
  );
  if (fixture.status !== 0) {
    process.stdout.write(fixture.stdout);
    process.stderr.write(fixture.stderr);
    throw new Error('E7 meaningful-interactions fixture seed failed');
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await setRole(client, 'anon');
    await setRole(client, 'authenticated');

    await seedNotifications(client, PREV_WEEK, 'e7a', 'low_signal_ping', 'instant', 25, 1);
    await seedNotifications(client, WEEK, 'e7b', 'low_signal_ping', 'instant', 25, 1);
    await seedNotifications(client, WEEK, 'e7c', 'healthy_ping', 'instant', 25, 10);
    await seedOnboarding(client);

    const dryRunRows = await callRollup(client, true);
    const dryRunRollup = dryRunRows.find((row) => row.entity === 'north_star_weekly_rollups');
    assert(dryRunRollup, 'Dry-run rollup row missing', dryRunRows);
    assert(dryRunRollup.action === 'would_upsert', 'Dry-run must not apply rows', dryRunRollup);
    assert(Number(dryRunRollup.payload.meaningful_interaction_count) === 6, 'Meaningful interaction count should match PR1 fixture', dryRunRollup.payload);
    assert(Number(dryRunRollup.payload.wau_count) >= 3, 'WAU should include app-observed fixture users', dryRunRollup.payload);
    assert(Number(dryRunRollup.payload.meaningful_interactions_per_wau) > 0, 'Normalized north-star ratio should be nonzero', dryRunRollup.payload);

    const appliedRows = await callRollup(client, false);
    const appliedRowsAgain = await callRollup(client, false);
    assert(appliedRows.length === appliedRowsAgain.length, 'Apply should be idempotent by row shape', {
      first: appliedRows.length,
      second: appliedRowsAgain.length,
    });

    const { rows: recommendations } = await client.query(
      `
        select event_type, tier, sent_count, tap_count, tap_through_rate::text, recommendation
        from public.notification_type_delivery_recommendations
        where week_start = $1
        order by event_type, tier
      `,
      [WEEK],
    );
    const weak = recommendations.find((row) => row.event_type === 'low_signal_ping' && row.tier === 'instant');
    const healthy = recommendations.find((row) => row.event_type === 'healthy_ping' && row.tier === 'instant');
    assert(weak?.recommendation === 'digest_only_candidate', 'Weak instant notification type should be flagged after two weeks', recommendations);
    assert(healthy?.recommendation === 'none', 'Healthy instant notification type should not be flagged', recommendations);

    const { rows: persisted } = await client.query(
      `select meaningful_interaction_count, wau_count, meaningful_interactions_per_wau::text from public.north_star_weekly_rollups where week_start = $1`,
      [WEEK],
    );
    assert(persisted.length === 1, 'Applied rollup row should persist exactly once', persisted);

    console.log(JSON.stringify({
      status: 'PASS',
      fixture: 'e7_weekly_rollup_local_fixture_smoke_v1',
      dry_run_rollup: dryRunRollup.payload,
      recommendations,
      persisted: persisted[0],
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
