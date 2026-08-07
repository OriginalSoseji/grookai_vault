import fsSync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const ROOT = process.cwd();
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54330/postgres';
const FIXTURE = {
  gameId: 'b5819e3f-0b2b-48c1-bf9a-0c87a57ea9b5',
  userA: '00000000-0000-4000-8000-00000000e3a1',
  userB: '00000000-0000-4000-8000-00000000e3b2',
  userC: '00000000-0000-4000-8000-00000000e3c3',
  setId: '00000000-0000-4000-8000-00000000e301',
  cardId: '00000000-0000-4000-8000-00000000e302',
  digestCardId: '00000000-0000-4000-8000-00000000e305',
  vaultItemId: '00000000-0000-4000-8000-00000000e303',
  instanceId: '00000000-0000-4000-8000-00000000e304',
  digestVaultItemId: '00000000-0000-4000-8000-00000000e306',
  digestInstanceId: '00000000-0000-4000-8000-00000000e307',
};

function loadLocalEnv() {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(ROOT, fileName);
    if (!fsSync.existsSync(filePath)) continue;
    const content = fsSync.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const rawValue = trimmed.slice(index + 1).trim();
      if (!key || process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

function clean(value) {
  return String(value ?? '').trim();
}

async function setAuthenticatedUser(client, userId) {
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
  await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
}

async function setServiceRole(client) {
  await client.query("select set_config('request.jwt.claim.sub', '', true)");
  await client.query("select set_config('request.jwt.claim.role', 'service_role', true)");
}

async function seedFixture(client) {
  await client.query(
    `
      insert into auth.users (
        id, aud, role, email, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        ($1, 'authenticated', 'authenticated', 'e3-want-a@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($2, 'authenticated', 'authenticated', 'e3-want-b@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($3, 'authenticated', 'authenticated', 'e3-want-c@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
      on conflict (id) do update
      set email = excluded.email,
          updated_at = now()
    `,
    [FIXTURE.userA, FIXTURE.userB, FIXTURE.userC],
  );

  await client.query(
    `
      insert into public.public_profiles (
        user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled, avatar_path
      )
      values
        ($1, 'e3-local-a', 'E3 Local A', true, true, 'https://example.com/a.png'),
        ($2, 'e3-local-b', 'E3 Local B', true, true, 'https://example.com/b.png'),
        ($3, 'e3-local-c', 'E3 Local C', true, true, 'https://example.com/c.png')
      on conflict (user_id) do update
      set slug = excluded.slug,
          display_name = excluded.display_name,
          public_profile_enabled = true,
          vault_sharing_enabled = true,
          avatar_path = excluded.avatar_path,
          updated_at = now()
    `,
    [FIXTURE.userA, FIXTURE.userB, FIXTURE.userC],
  );

  await client.query(
    `
      insert into public.collector_local_discovery_settings (
        user_id, local_discovery_enabled, area_label, region_code, country_code,
        geohash_prefix, radius_miles, location_precision, location_source
      )
      values
        ($1, true, 'E3 Test Area', 'US-CO', 'US', '9xj7', 25, 'coarse', 'manual'),
        ($2, true, 'E3 Test Area', 'US-CO', 'US', '9xj7', 25, 'coarse', 'manual'),
        ($3, true, 'E3 Test Area', 'US-CO', 'US', '9xj8', 25, 'coarse', 'manual')
      on conflict (user_id) do update
      set local_discovery_enabled = true,
          area_label = excluded.area_label,
          region_code = excluded.region_code,
          country_code = excluded.country_code,
          geohash_prefix = excluded.geohash_prefix,
          updated_at = now()
    `,
    [FIXTURE.userA, FIXTURE.userB, FIXTURE.userC],
  );

  await client.query(
    `
      insert into public.games (id, code, name, slug)
      values ($1, 'pokemon', 'Pokemon', 'pokemon')
      on conflict (code) do update
      set name = excluded.name,
          slug = excluded.slug
    `,
    [FIXTURE.gameId],
  );

  await client.query(
    `
      insert into public.sets (id, game, code, name)
      values ($1, 'pokemon', 'E3TEST', 'E3 Local Test Set')
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
        id, game_id, set_id, name, number, set_code, gv_id, image_url, image_status
      )
      values (
        $1,
        (select id from public.games where code = 'pokemon' limit 1),
        $2,
        'E3 Fixture Pikachu',
        '001',
        'E3TEST',
        'GV-PK-E3TEST-001',
        'https://example.com/card.png',
        'exact'
      )
      on conflict (id) do update
      set name = excluded.name,
          number = excluded.number,
          set_code = excluded.set_code,
          gv_id = excluded.gv_id,
          image_url = excluded.image_url,
          image_status = excluded.image_status,
          updated_at = now()
    `,
    [FIXTURE.cardId, FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.card_prints (
        id, game_id, set_id, name, number, set_code, gv_id, image_url, image_status
      )
      values (
        $1,
        (select id from public.games where code = 'pokemon' limit 1),
        $2,
        'E3 Digest Charmander',
        '002',
        'E3TEST',
        'GV-PK-E3TEST-002',
        'https://example.com/card-2.png',
        'exact'
      )
      on conflict (id) do update
      set name = excluded.name,
          number = excluded.number,
          set_code = excluded.set_code,
          gv_id = excluded.gv_id,
          image_url = excluded.image_url,
          image_status = excluded.image_status,
          updated_at = now()
    `,
    [FIXTURE.digestCardId, FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.vault_items (
        id, user_id, card_id, qty, name, set_name, gv_id, intent
      )
      values ($1, $2, $3, 1, 'E3 Fixture Pikachu', 'E3 Local Test Set', 'GV-PK-E3TEST-001', 'trade')
      on conflict (id) do update
      set user_id = excluded.user_id,
          card_id = excluded.card_id,
          qty = excluded.qty,
          name = excluded.name,
          set_name = excluded.set_name,
          gv_id = excluded.gv_id,
          intent = excluded.intent,
          archived_at = null
    `,
    [FIXTURE.vaultItemId, FIXTURE.userB, FIXTURE.cardId],
  );

  await client.query(
    `
      insert into public.vault_items (
        id, user_id, card_id, qty, name, set_name, gv_id, intent
      )
      values ($1, $2, $3, 1, 'E3 Digest Charmander', 'E3 Local Test Set', 'GV-PK-E3TEST-002', 'trade')
      on conflict (id) do update
      set user_id = excluded.user_id,
          card_id = excluded.card_id,
          qty = excluded.qty,
          name = excluded.name,
          set_name = excluded.set_name,
          gv_id = excluded.gv_id,
          intent = excluded.intent,
          archived_at = null
    `,
    [FIXTURE.digestVaultItemId, FIXTURE.userC, FIXTURE.digestCardId],
  );

  await client.query(
    `
      insert into public.vault_item_instances (
        id, user_id, gv_vi_id, card_print_id, legacy_vault_item_id, name, set_name,
        condition_label, is_graded, intent, image_display_mode
      )
      values (
        $1, $2, 'GVVI-E3-LOCAL-001', $3, $4, 'E3 Fixture Pikachu',
        'E3 Local Test Set', 'Near Mint', false, 'trade', 'canonical'
      )
      on conflict (id) do update
      set user_id = excluded.user_id,
          card_print_id = excluded.card_print_id,
          legacy_vault_item_id = excluded.legacy_vault_item_id,
          name = excluded.name,
          set_name = excluded.set_name,
          condition_label = excluded.condition_label,
          is_graded = excluded.is_graded,
          intent = excluded.intent,
          image_display_mode = excluded.image_display_mode,
          archived_at = null,
          updated_at = now()
    `,
    [FIXTURE.instanceId, FIXTURE.userB, FIXTURE.cardId, FIXTURE.vaultItemId],
  );

  await client.query(
    `
      insert into public.vault_item_instances (
        id, user_id, gv_vi_id, card_print_id, legacy_vault_item_id, name, set_name,
        condition_label, is_graded, intent, image_display_mode
      )
      values (
        $1, $2, 'GVVI-E3-LOCAL-002', $3, $4, 'E3 Digest Charmander',
        'E3 Local Test Set', 'Near Mint', false, 'trade', 'canonical'
      )
      on conflict (id) do update
      set user_id = excluded.user_id,
          card_print_id = excluded.card_print_id,
          legacy_vault_item_id = excluded.legacy_vault_item_id,
          name = excluded.name,
          set_name = excluded.set_name,
          condition_label = excluded.condition_label,
          is_graded = excluded.is_graded,
          intent = excluded.intent,
          image_display_mode = excluded.image_display_mode,
          archived_at = null,
          updated_at = now()
    `,
    [FIXTURE.digestInstanceId, FIXTURE.userC, FIXTURE.digestCardId, FIXTURE.digestVaultItemId],
  );

  await client.query(
    `
      insert into public.user_card_intents (
        user_id, card_print_id, want, trade, sell, showcase, is_public, metadata
      )
      values ($1, $2, true, false, false, false, false, '{}'::jsonb)
      on conflict (user_id, card_print_id) do update
      set want = true,
          updated_at = now()
    `,
    [FIXTURE.userA, FIXTURE.cardId],
  );

  await client.query(
    `
      insert into public.user_card_intents (
        user_id, card_print_id, want, trade, sell, showcase, is_public, metadata
      )
      values ($1, $2, true, false, false, false, false, '{}'::jsonb)
      on conflict (user_id, card_print_id) do update
      set want = true,
          updated_at = now()
    `,
    [FIXTURE.userA, FIXTURE.digestCardId],
  );
}

async function main() {
  loadLocalEnv();
  const connectionString = argValue('db-url') ?? process.env.E3_LOCAL_DB_URL ?? DEFAULT_LOCAL_DB_URL;
  const includeEngine = process.argv.includes('--include-engine');
  const includeDelivery = process.argv.includes('--include-delivery');
  if (!connectionString.includes('127.0.0.1') && !connectionString.includes('localhost')) {
    throw new Error('This audit is rollback-only and local-only; pass --db-url pointing at 127.0.0.1 or localhost.');
  }

  const client = new pg.Client({ connectionString, ssl: false });
  await client.connect();
  await client.query('begin');

  try {
    await seedFixture(client);
    await setAuthenticatedUser(client, FIXTURE.userA);

    const feed = await client.query('select * from public.local_community_feed_v2($1)', [40]);
    const candidates = await client.query(
      'select * from public.local_community_want_match_candidates_v1($1, $2)',
      [FIXTURE.userA, 100],
    );

    const feedMatch = feed.rows.find((row) => clean(row.gv_id) === 'GV-PK-E3TEST-001');
    const candidateMatch = candidates.rows.find((row) => clean(row.gv_id) === 'GV-PK-E3TEST-001');
    const agreement = Boolean(
      feedMatch
        && candidateMatch
        && clean(feedMatch.owner_slug) === clean(candidateMatch.owner_slug)
        && clean(feedMatch.intent) === clean(candidateMatch.intent)
        && feedMatch.viewer_wishlist_match === true,
    );

    const result = {
      status: agreement ? 'PASS' : 'FAIL',
      fixture: {
        want_user_id: FIXTURE.userA,
        owner_user_id: FIXTURE.userB,
        card_print_id: FIXTURE.cardId,
      },
      feed_match: feedMatch ? {
        owner_slug: feedMatch.owner_slug,
        gv_id: feedMatch.gv_id,
        intent: feedMatch.intent,
        viewer_wishlist_match: feedMatch.viewer_wishlist_match,
        match_reason: feedMatch.match_reason,
      } : null,
      candidate_match: candidateMatch ? {
        owner_slug: candidateMatch.owner_slug,
        gv_id: candidateMatch.gv_id,
        intent: candidateMatch.intent,
        distance_bucket: candidateMatch.distance_bucket,
        match_strength: candidateMatch.match_strength,
        recommended_tier: candidateMatch.recommended_tier,
        dedupe_key: candidateMatch.dedupe_key,
      } : null,
      feed_count: feed.rows.length,
      candidate_count: candidates.rows.length,
      engine: null,
      rollback_only: true,
    };

    if (includeEngine) {
      await setServiceRole(client);
      const firstRun = await client.query(
        'select * from public.run_want_match_engine_v1($1, $2)',
        [FIXTURE.userA, 50],
      );
      const matchRowsAfterFirst = await client.query(
        `
          select *
          from public.want_matches
          where want_user_id = $1
            and owner_user_id = $2
            and card_print_id = $3
          order by created_at
        `,
        [FIXTURE.userA, FIXTURE.userB, FIXTURE.cardId],
      );
      const matchId = matchRowsAfterFirst.rows[0]?.id ?? null;
      const eventsAfterFirst = await client.query(
        `
          select event_type, actor_user_id, subject_user_id, card_print_id, dedupe_key
          from public.card_events
          where dedupe_key in ($1, $2)
          order by event_type
        `,
        [`want_match_available:${matchId}`, `want_match_owner_count:${matchId}`],
      );
      const outboxAfterFirst = await client.query(
        `
          select count(*)::integer as count
          from public.notification_outbox
          where event_type like 'want_match%'
             or dedupe_key like 'want_match%'
        `,
      );

      const secondRun = await client.query(
        'select * from public.run_want_match_engine_v1($1, $2)',
        [FIXTURE.userA, 50],
      );
      const matchRowsAfterSecond = await client.query(
        `
          select count(*)::integer as count
          from public.want_matches
          where want_user_id = $1
            and owner_user_id = $2
            and card_print_id = $3
        `,
        [FIXTURE.userA, FIXTURE.userB, FIXTURE.cardId],
      );
      const eventsAfterSecond = await client.query(
        `
          select count(*)::integer as count
          from public.card_events
          where dedupe_key in ($1, $2)
        `,
        [`want_match_available:${matchId}`, `want_match_owner_count:${matchId}`],
      );

      await setAuthenticatedUser(client, FIXTURE.userA);
      const pulseBeforeWantOff = await client.query(
        `
          select count(*)::integer as count
          from public.pulse_eligible_events_for_viewer_v1($1)
          where card_event_id = (
            select id
            from public.card_events
            where dedupe_key = $2
            limit 1
          )
        `,
        [FIXTURE.userA, `want_match_available:${matchId}`],
      );

      await setServiceRole(client);
      const queuedAlert = await client.query(
        `
          insert into public.notification_outbox (
            recipient_user_id, event_type, tier, card_print_id,
            actor_user_id, card_event_id, payload, dedupe_key,
            available_at, next_attempt_at
          ) values (
            $1, 'want_match_available', 'instant', $2,
            $3,
            (
              select id
              from public.card_events
              where dedupe_key = $4
              limit 1
            ),
            jsonb_build_object('want_match_id', $5::text),
            $4,
            now() + interval '1 hour',
            now() + interval '1 hour'
          )
          returning id
        `,
        [
          FIXTURE.userA,
          FIXTURE.cardId,
          FIXTURE.userB,
          `want_match_available:${matchId}`,
          matchId,
        ],
      );
      await client.query(
        `
          update public.user_card_intents
          set want = false,
              updated_at = now()
          where user_id = $1
            and card_print_id = $2
        `,
        [FIXTURE.userA, FIXTURE.cardId],
      );
      const statusAfterWantOff = await client.query(
        `
          select status, stale_marked_at is not null as has_stale_marker,
                 payload ->> 'stale_reason' as stale_reason
          from public.want_matches
          where id = $1
        `,
        [matchId],
      );
      const queuedAlertAfterWantOff = await client.query(
        `
          select failed_at is not null as failed,
                 failure_reason,
                 send_started_at is not null as send_started
          from public.notification_outbox
          where id = $1
        `,
        [queuedAlert.rows[0].id],
      );
      const claimAfterWantOff = await client.query(
        'select id from public.notification_dispatcher_claim_batch_v1($1) where id = $2',
        [100, queuedAlert.rows[0].id],
      );
      const invalidatedSendStart = await client.query(
        'select public.notification_dispatcher_mark_send_started_if_current_v1($1) as started',
        [queuedAlert.rows[0].id],
      );
      await client.query(
        "update public.want_matches set status = 'active' where id = $1",
        [matchId],
      );
      const unsupportedReactivation = await client.query(
        `
          select status, payload ->> 'stale_reason' as stale_reason
          from public.want_matches
          where id = $1
        `,
        [matchId],
      );

      await setAuthenticatedUser(client, FIXTURE.userA);
      const candidatesAfterWantOff = await client.query(
        'select * from public.local_community_want_match_candidates_v1($1, $2)',
        [FIXTURE.userA, 100],
      );
      const pulseAfterWantOff = await client.query(
        `
          select count(*)::integer as count
          from public.pulse_eligible_events_for_viewer_v1($1)
          where card_event_id = (
            select id
            from public.card_events
            where dedupe_key = $2
            limit 1
          )
        `,
        [FIXTURE.userA, `want_match_available:${matchId}`],
      );

      await setServiceRole(client);
      await client.query(
        `
          update public.user_card_intents
          set want = true,
              updated_at = now()
          where user_id = $1
            and card_print_id = $2
        `,
        [FIXTURE.userA, FIXTURE.cardId],
      );
      const reactivationRun = await client.query(
        'select * from public.run_want_match_engine_v1($1, $2)',
        [FIXTURE.userA, 50],
      );
      const statusAfterReactivation = await client.query(
        'select status, stale_marked_at is null as stale_marker_cleared from public.want_matches where id = $1',
        [matchId],
      );
      const sendBoundaryAlert = await client.query(
        `
          insert into public.notification_outbox (
            recipient_user_id, event_type, tier, card_print_id,
            actor_user_id, payload, dedupe_key,
            available_at, next_attempt_at
          ) values (
            $1, 'want_match_available', 'instant', $2,
            $3, jsonb_build_object('want_match_id', $4::text), $5,
            now(), now()
          )
          returning id
        `,
        [
          FIXTURE.userA,
          FIXTURE.cardId,
          FIXTURE.userB,
          matchId,
          `want_match_send_boundary:${matchId}`,
        ],
      );
      const validSendStart = await client.query(
        'select public.notification_dispatcher_mark_send_started_if_current_v1($1) as started',
        [sendBoundaryAlert.rows[0].id],
      );
      const duplicateSendStart = await client.query(
        'select public.notification_dispatcher_mark_send_started_if_current_v1($1) as started',
        [sendBoundaryAlert.rows[0].id],
      );
      const sendBoundaryReadback = await client.query(
        `
          select send_started_at is not null as send_started,
                 failed_at is not null as failed
          from public.notification_outbox
          where id = $1
        `,
        [sendBoundaryAlert.rows[0].id],
      );

      await setAuthenticatedUser(client, FIXTURE.userA);
      const pulseAfterReactivation = await client.query(
        `
          select count(*)::integer as count
          from public.pulse_eligible_events_for_viewer_v1($1)
          where card_event_id = (
            select id
            from public.card_events
            where dedupe_key = $2
            limit 1
          )
        `,
        [FIXTURE.userA, `want_match_available:${matchId}`],
      );

      await setServiceRole(client);
      await client.query(
        `
          update public.public_profiles
          set vault_sharing_enabled = false
          where user_id = $1
        `,
        [FIXTURE.userB],
      );
      await setAuthenticatedUser(client, FIXTURE.userA);
      const privateCandidates = await client.query(
        'select * from public.local_community_want_match_candidates_v1($1, $2)',
        [FIXTURE.userA, 100],
      );
      await setServiceRole(client);
      const privateRun = await client.query(
        'select * from public.run_want_match_engine_v1($1, $2)',
        [FIXTURE.userA, 50],
      );
      await client.query(
        `
          update public.want_matches
          set last_seen_available_at = now() - interval '8 days'
          where id = $1
        `,
        [matchId],
      );
      const staleRun = await client.query(
        'select * from public.mark_stale_want_matches_v1($1, $2)',
        [FIXTURE.userA, 50],
      );
      const staleStatus = await client.query(
        'select status, stale_marked_at is not null as has_stale_marker from public.want_matches where id = $1',
        [matchId],
      );

      await setAuthenticatedUser(client, FIXTURE.userA);
      const viewerRows = await client.query('select * from public.want_matches_for_viewer_v1($1)', [50]);

      const insertedActions = firstRun.rows.filter((row) => row.action === 'inserted');
      const ownerCountEvents = eventsAfterFirst.rows.filter((row) => row.event_type === 'want_match_owner_count');
      const availableEvents = eventsAfterFirst.rows.filter((row) => row.event_type === 'want_match_available');
      const enginePass = Boolean(
        insertedActions.some((row) => clean(row.card_print_id) === FIXTURE.cardId)
          && matchRowsAfterFirst.rows.length === 1
          && eventsAfterFirst.rows.length === 2
          && availableEvents.length === 1
          && ownerCountEvents.length === 1
          && clean(ownerCountEvents[0]?.subject_user_id) === FIXTURE.userB
          && Number(outboxAfterFirst.rows[0]?.count ?? 0) === 0
          && Number(matchRowsAfterSecond.rows[0]?.count ?? 0) === 1
          && Number(eventsAfterSecond.rows[0]?.count ?? 0) === 2
          && Number(pulseBeforeWantOff.rows[0]?.count ?? 0) === 1
          && statusAfterWantOff.rows[0]?.status === 'stale'
          && statusAfterWantOff.rows[0]?.has_stale_marker === true
          && statusAfterWantOff.rows[0]?.stale_reason === 'canonical_want_removed'
          && queuedAlertAfterWantOff.rows[0]?.failed === true
          && queuedAlertAfterWantOff.rows[0]?.send_started === false
          && queuedAlertAfterWantOff.rows[0]?.failure_reason === 'cancelled_current_want_removed'
          && claimAfterWantOff.rows.length === 0
          && invalidatedSendStart.rows[0]?.started === false
          && unsupportedReactivation.rows[0]?.status === 'stale'
          && unsupportedReactivation.rows[0]?.stale_reason === 'activation_without_current_want'
          && !candidatesAfterWantOff.rows.some((row) => clean(row.card_print_id) === FIXTURE.cardId)
          && Number(pulseAfterWantOff.rows[0]?.count ?? 0) === 0
          && reactivationRun.rows.some((row) => clean(row.card_print_id) === FIXTURE.cardId)
          && statusAfterReactivation.rows[0]?.status === 'active'
          && statusAfterReactivation.rows[0]?.stale_marker_cleared === true
          && Number(pulseAfterReactivation.rows[0]?.count ?? 0) === 1
          && validSendStart.rows[0]?.started === true
          && duplicateSendStart.rows[0]?.started === false
          && sendBoundaryReadback.rows[0]?.send_started === true
          && sendBoundaryReadback.rows[0]?.failed === false
          && !privateCandidates.rows.some((row) => clean(row.card_print_id) === FIXTURE.cardId)
          && !privateRun.rows.some((row) => clean(row.card_print_id) === FIXTURE.cardId)
          && staleRun.rows.length === 1
          && staleStatus.rows[0]?.status === 'stale'
          && staleStatus.rows[0]?.has_stale_marker === true
          && viewerRows.rows.some((row) => clean(row.want_match_id) === clean(matchId))
      );

      result.engine = {
        status: enginePass ? 'PASS' : 'FAIL',
        first_run: firstRun.rows,
        second_run: secondRun.rows,
        match_row_count_after_first: matchRowsAfterFirst.rows.length,
        match_row_count_after_second: Number(matchRowsAfterSecond.rows[0]?.count ?? 0),
        event_rows_after_first: eventsAfterFirst.rows,
        event_count_after_second: Number(eventsAfterSecond.rows[0]?.count ?? 0),
        pulse_count_before_want_off: Number(pulseBeforeWantOff.rows[0]?.count ?? 0),
        status_after_want_off: statusAfterWantOff.rows[0] ?? null,
        queued_alert_after_want_off: queuedAlertAfterWantOff.rows[0] ?? null,
        queued_alert_claimed_after_want_off: claimAfterWantOff.rows.length,
        invalidated_send_started: invalidatedSendStart.rows[0]?.started ?? null,
        unsupported_reactivation: unsupportedReactivation.rows[0] ?? null,
        candidate_count_after_want_off: candidatesAfterWantOff.rows.length,
        pulse_count_after_want_off: Number(pulseAfterWantOff.rows[0]?.count ?? 0),
        reactivation_run: reactivationRun.rows,
        status_after_reactivation: statusAfterReactivation.rows[0] ?? null,
        pulse_count_after_reactivation: Number(pulseAfterReactivation.rows[0]?.count ?? 0),
        valid_send_started: validSendStart.rows[0]?.started ?? null,
        duplicate_send_started: duplicateSendStart.rows[0]?.started ?? null,
        send_boundary_readback: sendBoundaryReadback.rows[0] ?? null,
        want_match_outbox_rows: Number(outboxAfterFirst.rows[0]?.count ?? 0),
        private_candidate_count: privateCandidates.rows.length,
        private_run_rows: privateRun.rows.length,
        stale_run_rows: staleRun.rows,
        stale_status: staleStatus.rows[0] ?? null,
        viewer_rpc_count: viewerRows.rows.length,
      };
      result.status = agreement && enginePass ? 'PASS' : 'FAIL';
    }

    if (includeDelivery) {
      await setServiceRole(client);
      const engineRun = await client.query(
        'select * from public.run_want_match_engine_v1($1, $2)',
        [FIXTURE.userA, 50],
      );
      const matchTruthBeforeDelivery = await client.query(
        `
          select wm.id,
                 wm.card_print_id,
                 wm.status,
                 wm.recommended_tier,
                 public.viewer_has_current_card_want_v1(
                   wm.want_user_id,
                   wm.card_print_id
                 ) as has_current_want
          from public.want_matches wm
          where wm.want_user_id = $1
          order by wm.card_print_id, wm.id
        `,
        [FIXTURE.userA],
      );
      const instantEnqueue = await client.query(
        'select * from public.enqueue_want_match_instant_notifications_v1($1, $2)',
        [50, false],
      );
      const instantEnqueueSecond = await client.query(
        'select * from public.enqueue_want_match_instant_notifications_v1($1, $2)',
        [50, false],
      );
      const instantRows = await client.query(
        `
          select recipient_user_id, actor_user_id, event_type, tier, card_print_id, dedupe_key
          from public.notification_outbox
          where event_type = 'want_match_available'
          order by created_at
        `,
      );
      const ownerRows = await client.query(
        `
          select recipient_user_id, actor_user_id, event_type, tier, dedupe_key
          from public.notification_outbox
          where recipient_user_id in ($1, $2)
            and event_type like 'want_match%'
        `,
        [FIXTURE.userB, FIXTURE.userC],
      );

      const legacyDigestCutover = await client.query(
        'select * from public.enqueue_want_match_digest_notifications_v1(current_date, $1, $2)',
        [50, false],
      );
      const digestRows = await client.query(
        `
          select id, recipient_user_id, actor_user_id, event_type, tier, card_print_id, dedupe_key, payload,
                 available_at, next_attempt_at, folded_into_digest_at, failure_reason
          from public.notification_outbox
          where event_type = 'want_match_digest'
          order by created_at
        `,
      );
      const jobDryRun = await client.query(
        'select public.run_want_match_instant_candidate_pass_v1($1, $2, $3, $4, $5) as result',
        [5, 50, 50, 10, true],
      );
      const pulseDryRun = await client.query(
        'select public.run_pulse_daily_aggregation_v1(current_date, $1, $2, $3) as result',
        [50, 10, true],
      );
      const deliveryFailures = await client.query(
        `
          select source, event_type, error_message, payload
          from public.notification_emit_failures
          where source like 'want_match_%'
          order by created_at desc
        `,
      );

      const instantPass = Boolean(
        instantRows.rows.length === 1
          && instantRows.rows[0].recipient_user_id === FIXTURE.userA
          && instantRows.rows[0].actor_user_id === FIXTURE.userB
          && instantRows.rows[0].tier === 'instant'
          && String(instantRows.rows[0].dedupe_key ?? '').startsWith('want_match_available:')
          && instantEnqueue.rows.filter((row) => row.action === 'enqueued').length === 1
          && instantEnqueueSecond.rows.length === 0
      );
      const digestCutoverPass = Boolean(
        legacyDigestCutover.rows.length === 0
          && digestRows.rows.length === 0
          && Number(pulseDryRun.rows[0]?.result?.dry_run_candidates ?? 0) >= 1
      );
      const deliveryPass = Boolean(
        instantPass
          && digestCutoverPass
          && ownerRows.rows.length === 0
      );

      result.delivery = {
        status: deliveryPass ? 'PASS' : 'FAIL',
        engine_run: engineRun.rows,
        match_truth_before_delivery: matchTruthBeforeDelivery.rows,
        instant_enqueue: instantEnqueue.rows,
        instant_enqueue_second: instantEnqueueSecond.rows,
        instant_outbox_rows: instantRows.rows,
        owner_outbox_rows: ownerRows.rows,
        legacy_digest_cutover: legacyDigestCutover.rows,
        digest_outbox_rows: digestRows.rows,
        instant_job_dry_run: jobDryRun.rows[0]?.result ?? null,
        pulse_job_dry_run: pulseDryRun.rows[0]?.result ?? null,
        delivery_failures: deliveryFailures.rows,
      };
      result.status = result.status === 'PASS' && deliveryPass ? 'PASS' : 'FAIL';
    }

    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'PASS') process.exitCode = 1;
  } finally {
    await client.query('rollback');
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
