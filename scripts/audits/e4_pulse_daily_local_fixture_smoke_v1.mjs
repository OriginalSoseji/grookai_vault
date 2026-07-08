import process from 'node:process';
import pg from 'pg';

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54330/postgres';

const FIXTURE = {
  gameId: 'b5819e3f-0b2b-48c1-bf9a-0c87a57ea9b5',
  viewerUserId: '00000000-0000-4000-8000-00000000e5a1',
  ownerUserId: '00000000-0000-4000-8000-00000000e5b2',
  zeroUserId: '00000000-0000-4000-8000-00000000e5c3',
  setId: '00000000-0000-4000-8000-00000000e501',
  collectorCardId: '00000000-0000-4000-8000-00000000e502',
  digestCardId: '00000000-0000-4000-8000-00000000e503',
  collectorEventId: '00000000-0000-4000-8000-00000000e511',
  digestMatchId: '00000000-0000-4000-8000-00000000e512',
  legacyOutboxId: '00000000-0000-4000-8000-00000000e513',
};

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

async function seedFixture(client) {
  let gameId = FIXTURE.gameId;

  await client.query(
    `
      insert into auth.users (
        id, aud, role, email, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        ($1, 'authenticated', 'authenticated', 'e4-pulse-daily-viewer@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($2, 'authenticated', 'authenticated', 'e4-pulse-daily-owner@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($3, 'authenticated', 'authenticated', 'e4-pulse-daily-zero@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
      on conflict (id) do update
      set email = excluded.email,
          updated_at = now()
    `,
    [FIXTURE.viewerUserId, FIXTURE.ownerUserId, FIXTURE.zeroUserId],
  );

  await client.query(
    `
      insert into public.public_profiles (
        user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled
      )
      values
        ($1, 'e4-pulse-daily-viewer', 'E4 Pulse Daily Viewer', true, true),
        ($2, 'e4-pulse-daily-owner', 'E4 Pulse Daily Owner', true, true),
        ($3, 'e4-pulse-daily-zero', 'E4 Pulse Daily Zero', true, true)
      on conflict (user_id) do update
      set slug = excluded.slug,
          display_name = excluded.display_name,
          public_profile_enabled = true,
          vault_sharing_enabled = true,
          updated_at = now()
    `,
    [FIXTURE.viewerUserId, FIXTURE.ownerUserId, FIXTURE.zeroUserId],
  );

  const gameResult = await client.query(
    `
      insert into public.games (id, code, name, slug)
      values ($1, 'pokemon', 'Pokemon', 'pokemon')
      on conflict (code) do update
      set name = excluded.name,
          slug = excluded.slug
      returning id
    `,
    [FIXTURE.gameId],
  );
  gameId = gameResult.rows[0].id;

  await client.query(
    `
      insert into public.sets (id, game, code, name, release_date)
      values ($1, 'pokemon', 'E5P', 'E4 Pulse Daily Set', '2026-07-08')
      on conflict (id) do update
      set code = excluded.code,
          name = excluded.name,
          updated_at = now()
    `,
    [FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.card_prints (
        id, game_id, set_id, name, number, variant_key, rarity,
        image_url, set_code, print_identity_key, gv_id
      )
      values
        ($1, $3, $4, 'Pulse Daily Collector Card', '010', '', 'Rare', 'https://example.com/pulse-daily-collector.png', 'E5P', 'e4-pulse-daily-collector', 'GV-PK-E5P-010'),
        ($2, $3, $4, 'Pulse Daily Want Card', '011', '', 'Rare', 'https://example.com/pulse-daily-want.png', 'E5P', 'e4-pulse-daily-want', 'GV-PK-E5P-011')
      on conflict (id) do update
      set name = excluded.name,
          number = excluded.number,
          image_url = excluded.image_url,
          set_code = excluded.set_code,
          gv_id = excluded.gv_id,
          updated_at = now()
    `,
    [FIXTURE.collectorCardId, FIXTURE.digestCardId, gameId, FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.watches (
        user_id, subject_type, subject_id, reason, strength, muted_at, origin
      )
      values
        ($1, 'collector', $2, 'manual', 0.9, null, 'live'),
        ($1, 'card', $3, 'want', 1.0, null, 'live')
      on conflict (user_id, subject_type, subject_id) do update
      set reason = excluded.reason,
          strength = excluded.strength,
          muted_at = excluded.muted_at,
          origin = excluded.origin,
          updated_at = now()
    `,
    [FIXTURE.viewerUserId, FIXTURE.ownerUserId, FIXTURE.digestCardId],
  );

  await client.query(
    `
      insert into public.card_events (
        id, event_type, card_print_id, actor_user_id, subject_user_id,
        payload, visibility, dedupe_key, created_at
      )
      values (
        $1, 'vault_added', $2, $3, null,
        '{"intent":"trade","display_image_url":"https://example.com/pulse-daily-collector.png"}'::jsonb,
        'public', 'e4-pulse-daily-collector-event', '2026-07-08 11:00:00+00'
      )
      on conflict (dedupe_key) where dedupe_key is not null do nothing
    `,
    [FIXTURE.collectorEventId, FIXTURE.collectorCardId, FIXTURE.ownerUserId],
  );

  await client.query(
    `
      insert into public.want_matches (
        id, want_user_id, owner_user_id, card_print_id,
        distance_bucket, locality_label, relationship_context, intent,
        source_type, match_strength, recommended_tier, status,
        first_seen_available_at, last_seen_available_at, payload
      )
      values (
        $1, $2, $3, $4,
        'same_region', 'Denver', 'same_region', 'trade',
        'local_fixture', 0.74, 'digest', 'active',
        '2026-07-08 10:30:00+00', '2026-07-08 10:30:00+00',
        '{"display_image_url":"https://example.com/pulse-daily-want.png"}'::jsonb
      )
      on conflict (id) do update
      set status = 'active',
          recommended_tier = 'digest',
          updated_at = now()
    `,
    [FIXTURE.digestMatchId, FIXTURE.viewerUserId, FIXTURE.ownerUserId, FIXTURE.digestCardId],
  );

  await client.query(
    `
      insert into public.notification_outbox (
        id, recipient_user_id, event_type, tier, card_print_id,
        actor_user_id, payload, dedupe_key, available_at, next_attempt_at
      )
      values (
        $1, $2, 'want_match_digest', 'daily_pulse', $3,
        $4, '{"window_key":"2026-07-08","match_count":1}'::jsonb,
        'want_match_digest:e4-pulse-daily-viewer:2026-07-08', now(), now()
      )
      on conflict (recipient_user_id, dedupe_key) do nothing
    `,
    [FIXTURE.legacyOutboxId, FIXTURE.viewerUserId, FIXTURE.digestCardId, FIXTURE.ownerUserId],
  );
}

async function main() {
  const connectionString = argValue('db-url') || process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL;
  const client = new pg.Client({ connectionString, ssl: false });
  await client.connect();

  const summary = {};

  try {
    await client.query('begin');
    await seedFixture(client);

    const digestNoop = await client.query(
      "select count(*)::integer as count from public.enqueue_want_match_digest_notifications_v1('2026-07-08'::date, 500, false)",
    );
    summary.cutover_digest_enqueue_returned_rows = digestNoop.rows[0].count;

    const runResult = await client.query(
      "select public.run_pulse_daily_aggregation_v1('2026-07-08'::date, 500, 25, false) as result",
    );
    summary.run_result = runResult.rows[0].result;

    const pulseRows = await client.query(
      `
        select id, event_type, tier, dedupe_key, card_print_id, payload, available_at, failure_reason
        from public.notification_outbox
        where recipient_user_id = $1
          and event_type = 'pulse_daily'
      `,
      [FIXTURE.viewerUserId],
    );
    summary.pulse_daily_rows = pulseRows.rows.map((row) => ({
      id: row.id,
      dedupe_key: row.dedupe_key,
      item_count: row.payload.item_count,
      counts_by_type: row.payload.counts_by_type,
      top_card_name: row.payload.top_card?.name,
      route: row.payload.route,
    }));

    const zeroRows = await client.query(
      `
        select count(*)::integer as count
        from public.notification_outbox
        where recipient_user_id = $1
          and event_type = 'pulse_daily'
      `,
      [FIXTURE.zeroUserId],
    );
    summary.zero_user_pulse_daily_rows = zeroRows.rows[0].count;

    const legacyRows = await client.query(
      `
        select event_type, failed_at is not null as skipped, failure_reason
        from public.notification_outbox
        where id = $1
      `,
      [FIXTURE.legacyOutboxId],
    );
    summary.legacy_digest_after_cutover = legacyRows.rows[0] ?? null;

    const undeliveredLegacy = await client.query(
      `
        select count(*)::integer as count
        from public.notification_outbox
        where event_type = 'want_match_digest'
          and sent_at is null
          and folded_into_digest_at is null
          and failed_at is null
      `,
    );
    summary.undelivered_legacy_digest_rows = undeliveredLegacy.rows[0].count;

    const pulseOutboxId = pulseRows.rows[0]?.id;
    await client.query(
      "select public.notification_dispatcher_reschedule_digest_fold_v1($1, 'daily_budget_exhausted', '2026-07-09 09:00:00+00'::timestamptz)",
      [pulseOutboxId],
    );
    const rescheduled = await client.query(
      `
        select available_at, next_attempt_at, folded_into_digest_at, failure_reason, payload
        from public.notification_outbox
        where id = $1
      `,
      [pulseOutboxId],
    );
    summary.pulse_daily_after_budget_fold = {
      available_at: rescheduled.rows[0].available_at,
      next_attempt_at: rescheduled.rows[0].next_attempt_at,
      folded_into_digest_at: rescheduled.rows[0].folded_into_digest_at,
      failure_reason: rescheduled.rows[0].failure_reason,
      reschedule_reason: rescheduled.rows[0].payload.reschedule_reason,
    };

    if (summary.cutover_digest_enqueue_returned_rows !== 0) {
      throw new Error('legacy digest enqueue returned rows after cutover');
    }

    if (summary.pulse_daily_rows.length !== 1) {
      throw new Error(`expected one pulse_daily row, saw ${summary.pulse_daily_rows.length}`);
    }

    if (summary.pulse_daily_rows[0].item_count < 2) {
      throw new Error(`expected pulse payload to include collector item and digest want match, saw ${summary.pulse_daily_rows[0].item_count}`);
    }

    if (!summary.pulse_daily_rows[0].counts_by_type?.want_match) {
      throw new Error('digest-tier want match was not folded into pulse_daily payload');
    }

    if (summary.zero_user_pulse_daily_rows !== 0) {
      throw new Error('zero-item user received a pulse_daily row');
    }

    if (!summary.legacy_digest_after_cutover?.skipped ||
        summary.legacy_digest_after_cutover.failure_reason !== 'superseded_by_pulse_daily') {
      throw new Error('legacy want_match_digest row was not skipped with superseded_by_pulse_daily');
    }

    if (summary.undelivered_legacy_digest_rows !== 0) {
      throw new Error('undelivered legacy want_match_digest row remained after cutover');
    }

    if (summary.pulse_daily_after_budget_fold.folded_into_digest_at !== null ||
        summary.pulse_daily_after_budget_fold.failure_reason !== 'daily_budget_exhausted_rescheduled' ||
        summary.pulse_daily_after_budget_fold.reschedule_reason !== 'daily_budget_exhausted') {
      throw new Error('pulse_daily budget fold did not reschedule cleanly');
    }

    await client.query('rollback');
    summary.rollback_only = true;
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await client.query('rollback').catch(() => {});
    console.error(JSON.stringify({ ...summary, error: error.message }, null, 2));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await main();
