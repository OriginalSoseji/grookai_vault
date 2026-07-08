import process from 'node:process';
import pg from 'pg';

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54330/postgres';

const FIXTURE = {
  gameId: 'b5819e3f-0b2b-48c1-bf9a-0c87a57ea9b5',
  viewerUserId: '00000000-0000-4000-8000-00000000e4a1',
  ownerUserId: '00000000-0000-4000-8000-00000000e4b2',
  privateOwnerUserId: '00000000-0000-4000-8000-00000000e4c3',
  setId: '00000000-0000-4000-8000-00000000e401',
  cardWantId: '00000000-0000-4000-8000-00000000e402',
  cardCollectorId: '00000000-0000-4000-8000-00000000e403',
  cardMutedId: '00000000-0000-4000-8000-00000000e404',
  wantEventId: '00000000-0000-4000-8000-00000000e411',
  collectorEventId: '00000000-0000-4000-8000-00000000e412',
  completionEventId: '00000000-0000-4000-8000-00000000e413',
  mutedEventId: '00000000-0000-4000-8000-00000000e414',
  privateEventId: '00000000-0000-4000-8000-00000000e415',
};

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

async function setAuthenticatedUser(client, userId) {
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
  await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
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
        ($1, 'authenticated', 'authenticated', 'e4-pulse-viewer@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($2, 'authenticated', 'authenticated', 'e4-pulse-owner@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($3, 'authenticated', 'authenticated', 'e4-pulse-private@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
      on conflict (id) do update
      set email = excluded.email,
          updated_at = now()
    `,
    [FIXTURE.viewerUserId, FIXTURE.ownerUserId, FIXTURE.privateOwnerUserId],
  );

  await client.query(
    `
      insert into public.public_profiles (
        user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled
      )
      values
        ($1, 'e4-pulse-viewer', 'E4 Pulse Viewer', true, true),
        ($2, 'e4-pulse-owner', 'E4 Pulse Owner', true, true),
        ($3, 'e4-pulse-private', 'E4 Pulse Private', false, false)
      on conflict (user_id) do update
      set slug = excluded.slug,
          display_name = excluded.display_name,
          public_profile_enabled = excluded.public_profile_enabled,
          vault_sharing_enabled = excluded.vault_sharing_enabled,
          updated_at = now()
    `,
    [FIXTURE.viewerUserId, FIXTURE.ownerUserId, FIXTURE.privateOwnerUserId],
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
      values ($1, 'pokemon', 'E4P', 'E4 Pulse Set', '2026-07-08')
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
        ($1, $4, $5, 'Pulse Want Card', '001', '', 'Rare', 'https://example.com/want.png', 'E4P', 'e4-pulse-want', 'GV-PK-E4P-001'),
        ($2, $4, $5, 'Pulse Collector Card', '002', '', 'Rare', 'https://example.com/collector.png', 'E4P', 'e4-pulse-collector', 'GV-PK-E4P-002'),
        ($3, $4, $5, 'Pulse Muted Card', '003', '', 'Rare', 'https://example.com/muted.png', 'E4P', 'e4-pulse-muted', 'GV-PK-E4P-003')
      on conflict (id) do update
      set name = excluded.name,
          number = excluded.number,
          image_url = excluded.image_url,
          set_code = excluded.set_code,
          gv_id = excluded.gv_id,
          updated_at = now()
    `,
    [FIXTURE.cardWantId, FIXTURE.cardCollectorId, FIXTURE.cardMutedId, gameId, FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.watches (
        user_id, subject_type, subject_id, reason, strength, muted_at, origin
      )
      values
        ($1, 'card', $2, 'want', 1.0, null, 'live'),
        ($1, 'collector', $3, 'manual', 0.9, null, 'live'),
        ($1, 'collector', $4, 'manual', 0.9, null, 'live'),
        ($1, 'set', $5, 'inferred', 0.7, null, 'live'),
        ($1, 'card', $6, 'want', 1.0, now(), 'live')
      on conflict (user_id, subject_type, subject_id) do update
      set reason = excluded.reason,
          strength = excluded.strength,
          muted_at = excluded.muted_at,
          origin = excluded.origin,
          updated_at = now()
    `,
    [
      FIXTURE.viewerUserId,
      FIXTURE.cardWantId,
      FIXTURE.ownerUserId,
      FIXTURE.privateOwnerUserId,
      FIXTURE.setId,
      FIXTURE.cardMutedId,
    ],
  );

  await client.query(
    `
      insert into public.card_events (
        id, event_type, card_print_id, actor_user_id, subject_user_id,
        payload, visibility, dedupe_key, created_at
      )
      values
        ($1, 'want_match_available', $6, $9, $8, '{"distance_bucket":"nearby","locality_label":"Denver","intent":"trade","display_image_url":"https://example.com/want.png"}'::jsonb, 'private', 'e4-pulse-smoke-want', '2026-07-08 10:00:00+00'),
        ($2, 'vault_added', $7, $9, null, '{"intent":"trade","display_image_url":"https://example.com/collector.png"}'::jsonb, 'public', 'e4-pulse-smoke-collector', '2026-07-08 11:00:00+00'),
        ($3, 'set_completion_crossed', $7, $8, $8, jsonb_build_object('set_id', $10::text, 'subject_id', $10::text, 'subject_label', 'E4 Pulse Set', 'threshold', 50), 'private', 'e4-pulse-smoke-completion', '2026-07-08 12:00:00+00'),
        ($4, 'want_match_available', $11, $9, $8, '{"distance_bucket":"nearby","intent":"trade"}'::jsonb, 'private', 'e4-pulse-smoke-muted', '2026-07-08 13:00:00+00'),
        ($5, 'vault_added', $7, $12, null, '{"intent":"trade"}'::jsonb, 'private', 'e4-pulse-smoke-private', '2026-07-08 14:00:00+00')
      on conflict (dedupe_key) where dedupe_key is not null do nothing
    `,
    [
      FIXTURE.wantEventId,
      FIXTURE.collectorEventId,
      FIXTURE.completionEventId,
      FIXTURE.mutedEventId,
      FIXTURE.privateEventId,
      FIXTURE.cardWantId,
      FIXTURE.cardCollectorId,
      FIXTURE.viewerUserId,
      FIXTURE.ownerUserId,
      FIXTURE.setId,
      FIXTURE.cardMutedId,
      FIXTURE.privateOwnerUserId,
    ],
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
    await setAuthenticatedUser(client, FIXTURE.viewerUserId);

    const valueTypes = await client.query(
      `
        select count(*)::integer as count
        from public.card_events
        where event_type = any (array['card_value_moved', 'value_moved', 'card_value_changed'])
      `,
    );
    summary.value_move_event_rows_present = valueTypes.rows[0].count;

    const pageOne = await client.query('select * from public.pulse_items_v1(2, null, null)');
    summary.page_one_buckets = pageOne.rows.map((row) => row.rank_bucket);
    summary.page_one_event_ids = pageOne.rows.map((row) => row.card_event_id);

    const cursor = pageOne.rows.at(-1);
    const pageTwo = await client.query(
      'select * from public.pulse_items_v1(10, $1, $2)',
      [cursor.next_cursor_created_at, cursor.next_cursor_event_id],
    );
    summary.page_two_buckets = pageTwo.rows.map((row) => row.rank_bucket);
    summary.page_two_event_ids = pageTwo.rows.map((row) => row.card_event_id);

    const hardCap = await client.query('select count(*)::integer as count from public.pulse_items_v1(999, null, null)');
    summary.hard_cap_row_count = hardCap.rows[0].count;

    const combinedEventIds = [...summary.page_one_event_ids, ...summary.page_two_event_ids];
    summary.pagination_overlap_count =
      summary.page_one_event_ids.filter((eventId) => summary.page_two_event_ids.includes(eventId)).length;
    summary.muted_event_visible = combinedEventIds.includes(FIXTURE.mutedEventId);
    summary.private_event_visible = combinedEventIds.includes(FIXTURE.privateEventId);

    const unreadBefore = await client.query('select * from public.pulse_unread_count_v1()');
    summary.unread_before = unreadBefore.rows[0];

    await client.query(
      'select * from public.pulse_mark_seen_v1($1, $2)',
      [unreadBefore.rows[0].latest_event_created_at, unreadBefore.rows[0].latest_event_id],
    );
    const unreadAfter = await client.query('select * from public.pulse_unread_count_v1()');
    summary.unread_after = unreadAfter.rows[0];

    try {
      await client.query(
        'select * from public.pulse_mark_seen_v1($1, $2)',
        ['2026-07-08 10:00:00+00', FIXTURE.wantEventId],
      );
      summary.backwards_rejected = false;
    } catch (error) {
      summary.backwards_rejected = /backwards/i.test(error.message);
    }

    if (summary.page_one_buckets.join(',') !== 'want_match,collector_activity') {
      throw new Error(`unexpected page one ranking: ${summary.page_one_buckets.join(',')}`);
    }

    if (!summary.page_two_buckets.includes('completion')) {
      throw new Error(`completion bucket missing from page two: ${summary.page_two_buckets.join(',')}`);
    }

    if (summary.hard_cap_row_count > 50) {
      throw new Error(`pulse_items_v1 hard cap exceeded: ${summary.hard_cap_row_count}`);
    }

    if (summary.pagination_overlap_count !== 0) {
      throw new Error(`keyset pages overlapped on ${summary.pagination_overlap_count} rows`);
    }

    if (summary.muted_event_visible || summary.private_event_visible) {
      throw new Error('muted or private event leaked into Pulse results');
    }

    if (Number(summary.unread_before.unread_count) !== 3) {
      throw new Error(`expected 3 unread rows before mark_seen, saw ${summary.unread_before.unread_count}`);
    }

    if (Number(summary.unread_after.unread_count) !== 0) {
      throw new Error(`expected 0 unread rows after mark_seen, saw ${summary.unread_after.unread_count}`);
    }

    if (!summary.backwards_rejected) {
      throw new Error('pulse_mark_seen_v1 did not reject backwards movement');
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
