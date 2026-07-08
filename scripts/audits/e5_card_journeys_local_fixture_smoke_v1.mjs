import process from 'node:process';
import pg from 'pg';

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54330/postgres';

const FIXTURE = {
  gameId: '00000000-0000-4000-8000-00000000e901',
  setId: '00000000-0000-4000-8000-00000000e902',
  cardId: '00000000-0000-4000-8000-00000000e903',
  otherCardId: '00000000-0000-4000-8000-00000000e904',
  viewerUserId: '00000000-0000-4000-8000-00000000e910',
  tradeOwnerUserId: '00000000-0000-4000-8000-00000000e911',
  saleOwnerUserId: '00000000-0000-4000-8000-00000000e912',
  holdOwnerUserId: '00000000-0000-4000-8000-00000000e913',
  privateOwnerUserId: '00000000-0000-4000-8000-00000000e914',
  mutedOwnerUserId: '00000000-0000-4000-8000-00000000e915',
  blockedOwnerUserId: '00000000-0000-4000-8000-00000000e916',
  publicWantUserId: '00000000-0000-4000-8000-00000000e917',
  privateWantUserId: '00000000-0000-4000-8000-00000000e918',
  completionEventId: '00000000-0000-4000-8000-00000000e931',
  scannerEventId: '00000000-0000-4000-8000-00000000e932',
};

const USERS = [
  [FIXTURE.viewerUserId, 'e5-viewer@grookai.local', 'e5-viewer', 'E5 Viewer', true, true, 'Denver', 'CO', 'US', '9xj'],
  [FIXTURE.tradeOwnerUserId, 'e5-trade@grookai.local', 'e5-trade', 'E5 Trade Owner', true, true, 'Denver', 'CO', 'US', '9xj'],
  [FIXTURE.saleOwnerUserId, 'e5-sale@grookai.local', 'e5-sale', 'E5 Sale Owner', true, true, 'Boulder', 'CO', 'US', '9xh'],
  [FIXTURE.holdOwnerUserId, 'e5-hold@grookai.local', 'e5-hold', 'E5 Hold Owner', true, true, 'Denver', 'CO', 'US', '9xj'],
  [FIXTURE.privateOwnerUserId, 'e5-private@grookai.local', 'e5-private', 'E5 Private Owner', false, false, 'Aspen', 'CO', 'US', '9wz'],
  [FIXTURE.mutedOwnerUserId, 'e5-muted@grookai.local', 'e5-muted', 'E5 Muted Owner', true, true, 'Fort Collins', 'CO', 'US', '9xk'],
  [FIXTURE.blockedOwnerUserId, 'e5-blocked@grookai.local', 'e5-blocked', 'E5 Blocked Owner', true, true, 'Pueblo', 'CO', 'US', '9wq'],
  [FIXTURE.publicWantUserId, 'e5-public-want@grookai.local', 'e5-public-want', 'E5 Public Want', true, false, null, null, 'US', null],
  [FIXTURE.privateWantUserId, 'e5-private-want@grookai.local', 'e5-private-want', 'E5 Private Want', false, false, null, null, 'US', null],
];

const EXPECTED_FEED_COLUMNS = [
  'feed_item_id',
  'source_type',
  'owner_slug',
  'owner_display_name',
  'owner_avatar_path',
  'gv_id',
  'card_name',
  'set_code',
  'set_name',
  'card_number',
  'intent',
  'image_url',
  'display_image_kind',
  'locality_label',
  'distance_bucket',
  'relationship_context',
  'viewer_wishlist_match',
  'match_reason',
  'created_at',
  'route_target',
];

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

async function setAuthenticatedUser(client, userId) {
  await client.query('reset role');
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
  await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
  await client.query('set local role authenticated');
}

async function seedFixture(client) {
  let gameId = FIXTURE.gameId;

  await client.query(
    `
      insert into auth.users (
        id, aud, role, email, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      select user_id, 'authenticated', 'authenticated', email, now(), '{}'::jsonb, '{}'::jsonb, now(), now()
      from (values
        ${USERS.map((_, index) => `($${index * 2 + 1}::uuid, $${index * 2 + 2}::text)`).join(',\n        ')}
      ) as seeded(user_id, email)
      on conflict (id) do update
      set email = excluded.email,
          updated_at = now()
    `,
    USERS.flatMap(([userId, email]) => [userId, email]),
  );

  await client.query(
    `
      insert into public.public_profiles (
        user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled
      )
      select user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled
      from (values
        ${USERS.map((_, index) =>
          `($${index * 5 + 1}::uuid, $${index * 5 + 2}::text, $${index * 5 + 3}::text, $${index * 5 + 4}::boolean, $${index * 5 + 5}::boolean)`,
        ).join(',\n        ')}
      ) as seeded(user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled)
      on conflict (user_id) do update
      set slug = excluded.slug,
          display_name = excluded.display_name,
          public_profile_enabled = excluded.public_profile_enabled,
          vault_sharing_enabled = excluded.vault_sharing_enabled,
          updated_at = now()
    `,
    USERS.flatMap(([userId, , slug, displayName, publicProfile, vaultSharing]) => [
      userId,
      slug,
      displayName,
      publicProfile,
      vaultSharing,
    ]),
  );

  await client.query(
    `
      insert into public.collector_local_discovery_settings (
        user_id, local_discovery_enabled, area_label, region_code, country_code, geohash_prefix
      )
      select user_id, area_label is not null, area_label, region_code, country_code, geohash_prefix
      from (values
        ${USERS.map((_, index) =>
          `($${index * 5 + 1}::uuid, $${index * 5 + 2}::text, $${index * 5 + 3}::text, $${index * 5 + 4}::text, $${index * 5 + 5}::text)`,
        ).join(',\n        ')}
      ) as seeded(user_id, area_label, region_code, country_code, geohash_prefix)
      on conflict (user_id) do update
      set local_discovery_enabled = excluded.local_discovery_enabled,
          area_label = excluded.area_label,
          region_code = excluded.region_code,
          country_code = excluded.country_code,
          geohash_prefix = excluded.geohash_prefix,
          updated_at = now()
    `,
    USERS.flatMap(([userId, , , , , , areaLabel, regionCode, countryCode, geohashPrefix]) => [
      userId,
      areaLabel,
      regionCode,
      countryCode,
      geohashPrefix,
    ]),
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
      values ($1, 'pokemon', 'E5J', 'E5 Journey Set', '2026-07-08')
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
        ($1, $3, $4, 'E5 Journey Pikachu', '025', '', 'Rare', 'https://example.com/e5-journey-pikachu.png', 'E5J', 'e5-journey-pikachu', 'GV-PK-E5J-025'),
        ($2, $3, $4, 'E5 Other Card', '026', '', 'Rare', 'https://example.com/e5-other.png', 'E5J', 'e5-other-card', 'GV-PK-E5J-026')
      on conflict (id) do update
      set name = excluded.name,
          number = excluded.number,
          image_url = excluded.image_url,
          set_code = excluded.set_code,
          gv_id = excluded.gv_id,
          updated_at = now()
    `,
    [FIXTURE.cardId, FIXTURE.otherCardId, gameId, FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.collector_local_mutes (muter_user_id, muted_user_id)
      values ($1, $2)
      on conflict (muter_user_id, muted_user_id) do nothing
    `,
    [FIXTURE.viewerUserId, FIXTURE.mutedOwnerUserId],
  );

  await client.query(
    `
      insert into public.collector_local_blocks (blocker_user_id, blocked_user_id)
      values ($1, $2)
      on conflict (blocker_user_id, blocked_user_id) do nothing
    `,
    [FIXTURE.viewerUserId, FIXTURE.blockedOwnerUserId],
  );

  await client.query(
    `
      insert into public.vault_item_instances (
        id, user_id, gv_vi_id, card_print_id, intent, created_at
      )
      values
        ('00000000-0000-4000-8000-00000000e921', $1, 'GVVI-E5-TRADE', $7, 'trade', '2026-07-08 10:00:00+00'),
        ('00000000-0000-4000-8000-00000000e922', $2, 'GVVI-E5-SALE', $7, 'sell', '2026-07-08 10:10:00+00'),
        ('00000000-0000-4000-8000-00000000e923', $3, 'GVVI-E5-HOLD', $7, 'hold', '2026-07-08 10:20:00+00'),
        ('00000000-0000-4000-8000-00000000e924', $4, 'GVVI-E5-PRIVATE', $7, 'trade', '2026-07-08 10:30:00+00'),
        ('00000000-0000-4000-8000-00000000e925', $5, 'GVVI-E5-MUTED', $7, 'trade', '2026-07-08 10:40:00+00'),
        ('00000000-0000-4000-8000-00000000e926', $6, 'GVVI-E5-BLOCKED', $7, 'sell', '2026-07-08 10:50:00+00'),
        ('00000000-0000-4000-8000-00000000e927', $1, 'GVVI-E5-OTHER', $8, 'trade', '2026-07-08 11:00:00+00')
      on conflict (id) do update
      set intent = excluded.intent,
          archived_at = null,
          updated_at = now()
    `,
    [
      FIXTURE.tradeOwnerUserId,
      FIXTURE.saleOwnerUserId,
      FIXTURE.holdOwnerUserId,
      FIXTURE.privateOwnerUserId,
      FIXTURE.mutedOwnerUserId,
      FIXTURE.blockedOwnerUserId,
      FIXTURE.cardId,
      FIXTURE.otherCardId,
    ],
  );

  await client.query(
    `
      insert into public.wishlist_items (user_id, card_id)
      values
        ($1, $3),
        ($2, $3)
      on conflict (user_id, card_id) do nothing
    `,
    [FIXTURE.publicWantUserId, FIXTURE.privateWantUserId, FIXTURE.cardId],
  );

  await client.query(
    `
      insert into public.card_events (
        id, event_type, card_print_id, actor_user_id, subject_user_id,
        payload, visibility, dedupe_key, created_at
      )
      values
        ($1, 'set_completion_crossed', $3, $4, $4, '{"threshold":75,"subject_label":"E5 Journey Set"}'::jsonb, 'private', 'e5-journey-completion', '2026-07-08 12:00:00+00'),
        ($2, 'scanner_v5_vault_add_enriched', $3, $5, null, '{"gvvi_id":"GVVI-E5-TRADE","session_id":"e5-scanner"}'::jsonb, 'private', 'e5-journey-scanner-enriched', '2026-07-08 12:05:00+00')
      on conflict (dedupe_key) where dedupe_key is not null do nothing
    `,
    [
      FIXTURE.completionEventId,
      FIXTURE.scannerEventId,
      FIXTURE.cardId,
      FIXTURE.viewerUserId,
      FIXTURE.tradeOwnerUserId,
    ],
  );
}

async function expectAnonDenied(client) {
  await client.query('savepoint e5_anon_denied_check');
  await client.query('reset role');
  await client.query("select set_config('request.jwt.claim.sub', '', true)");
  await client.query("select set_config('request.jwt.claim.role', 'anon', true)");
  await client.query('set local role anon');

  try {
    await client.query('select * from public.card_journey_snapshot_v1($1)', [FIXTURE.cardId]);
    await client.query('rollback to savepoint e5_anon_denied_check');
    return false;
  } catch (error) {
    await client.query('rollback to savepoint e5_anon_denied_check');
    return /permission denied|not_authenticated/i.test(error.message);
  } finally {
    await client.query('reset role');
    await client.query('release savepoint e5_anon_denied_check').catch(() => {});
  }
}

async function main() {
  const connectionString = argValue('db-url') || process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL;
  const client = new pg.Client({ connectionString, ssl: false });
  await client.connect();

  const summary = {};

  try {
    await client.query('begin');
    await seedFixture(client);

    summary.anon_denied = await expectAnonDenied(client);

    await setAuthenticatedUser(client, FIXTURE.viewerUserId);

    const feedProbe = await client.query('select * from public.local_community_feed_v2(1)');
    summary.local_community_feed_v2_columns = feedProbe.fields.map((field) => field.name);
    summary.feed_signature_unchanged =
      JSON.stringify(summary.local_community_feed_v2_columns) === JSON.stringify(EXPECTED_FEED_COLUMNS);

    const snapshot = await client.query('select * from public.card_journey_snapshot_v1($1)', [FIXTURE.cardId]);
    summary.snapshot = snapshot.rows[0];

    const owners = await client.query('select * from public.card_journey_collectors_v1($1, $2, 20, null, null)', [
      FIXTURE.cardId,
      'owners',
    ]);
    summary.owner_slugs = owners.rows.map((row) => row.owner_slug).sort();
    summary.owner_payload_has_private_ids = owners.fields.some((field) =>
      ['vault_item_id', 'vault_item_instance_id', 'instance_id'].includes(field.name),
    );

    const trade = await client.query('select * from public.card_journey_collectors_v1($1, $2, 20, null, null)', [
      FIXTURE.cardId,
      'trade',
    ]);
    const sale = await client.query('select * from public.card_journey_collectors_v1($1, $2, 20, null, null)', [
      FIXTURE.cardId,
      'sale',
    ]);
    summary.trade_slugs = trade.rows.map((row) => row.owner_slug);
    summary.sale_slugs = sale.rows.map((row) => row.owner_slug);

    await client.query('savepoint e5_want_kind_check');
    try {
      await client.query('select * from public.card_journey_collectors_v1($1, $2, 20, null, null)', [
        FIXTURE.cardId,
        'want',
      ]);
      await client.query('rollback to savepoint e5_want_kind_check');
      summary.want_collector_kind_rejected = false;
    } catch (error) {
      await client.query('rollback to savepoint e5_want_kind_check');
      summary.want_collector_kind_rejected = /invalid_card_journey_collector_kind/i.test(error.message);
    } finally {
      await client.query('release savepoint e5_want_kind_check').catch(() => {});
    }

    const momentsPageOne = await client.query('select * from public.card_journey_moments_v1($1, 2, null, null)', [
      FIXTURE.cardId,
    ]);
    const cursor = momentsPageOne.rows.at(-1);
    const momentsPageTwo = await client.query('select * from public.card_journey_moments_v1($1, 50, $2, $3)', [
      FIXTURE.cardId,
      cursor?.next_cursor_created_at ?? null,
      cursor?.next_cursor_event_id ?? null,
    ]);
    const momentRows = [...momentsPageOne.rows, ...momentsPageTwo.rows];
    summary.moment_types = momentRows.map((row) => row.event_type);
    summary.moment_event_ids = momentRows.map((row) => row.event_id);
    summary.moment_payload_column_present = momentsPageOne.fields.some((field) => field.name === 'payload');
    summary.moment_pages_overlap = momentsPageOne.rows.filter((row) =>
      momentsPageTwo.rows.some((other) => other.event_id === row.event_id),
    ).length;

    const geography = await client.query('select * from public.card_journey_geography_v1($1)', [FIXTURE.cardId]);
    summary.geography_areas = geography.rows.map((row) => row.area_label).sort();
    summary.geography_payload_has_people = geography.fields.some((field) =>
      ['owner_user_id', 'public_profile_id', 'owner_slug', 'owner_display_name', 'avatar_path', 'instance_id'].includes(field.name),
    );

    const singleAreaCard = await client.query('select * from public.card_journey_geography_v1($1)', [FIXTURE.otherCardId]);
    summary.single_area_geography_rows = singleAreaCard.rowCount;

    await client.query('savepoint e5_internal_source_client_check');
    try {
      await client.query(
        `
          select *
          from public.card_journey_public_copy_sources_v1($1, $2)
          limit 1
        `,
        [FIXTURE.viewerUserId, FIXTURE.cardId],
      );
      await client.query('rollback to savepoint e5_internal_source_client_check');
      summary.public_copy_source_client_denied = false;
    } catch (error) {
      await client.query('rollback to savepoint e5_internal_source_client_check');
      summary.public_copy_source_client_denied = /permission denied/i.test(error.message);
    } finally {
      await client.query('release savepoint e5_internal_source_client_check').catch(() => {});
    }

    await client.query('reset role');
    const sourceColumns = await client.query(
      `
        select *
        from public.card_journey_public_copy_sources_v1($1, $2)
        limit 1
      `,
      [FIXTURE.viewerUserId, FIXTURE.cardId],
    );
    summary.public_copy_source_uses_area_label = sourceColumns.fields.some((field) => field.name === 'locality_label');
    summary.public_copy_source_private_ids = sourceColumns.fields.some((field) =>
      ['vault_item_id', 'vault_item_instance_id', 'instance_id'].includes(field.name),
    );
    await setAuthenticatedUser(client, FIXTURE.viewerUserId);

    const expectedOwners = ['e5-hold', 'e5-sale', 'e5-trade'];
    const forbiddenOwners = ['e5-private', 'e5-muted', 'e5-blocked'];

    if (!summary.anon_denied) {
      throw new Error('anon was not denied from card_journey_snapshot_v1');
    }
    if (!summary.feed_signature_unchanged) {
      throw new Error(`local_community_feed_v2 signature changed: ${summary.local_community_feed_v2_columns.join(',')}`);
    }
    if (Number(summary.snapshot.owner_collector_count) !== 3) {
      throw new Error(`expected 3 public owners, saw ${summary.snapshot.owner_collector_count}`);
    }
    if (Number(summary.snapshot.trade_collector_count) !== 1 || Number(summary.snapshot.sale_collector_count) !== 1) {
      throw new Error('trade/sale snapshot counts are wrong');
    }
    if (Number(summary.snapshot.want_collector_count) !== 1) {
      throw new Error(`expected aggregate public want count 1, saw ${summary.snapshot.want_collector_count}`);
    }
    if (Number(summary.snapshot.geography_area_count) !== 2) {
      throw new Error(`expected 2 geography areas, saw ${summary.snapshot.geography_area_count}`);
    }
    if (!summary.snapshot.has_public_activity) {
      throw new Error('snapshot did not report public activity');
    }
    if (summary.owner_payload_has_private_ids || summary.public_copy_source_private_ids) {
      throw new Error('collector/source RPC exposed private instance or vault ids');
    }
    if (JSON.stringify(summary.owner_slugs) !== JSON.stringify(expectedOwners)) {
      throw new Error(`owner list mismatch: ${summary.owner_slugs.join(',')}`);
    }
    if (forbiddenOwners.some((slug) => summary.owner_slugs.includes(slug))) {
      throw new Error('private, muted, or blocked owner leaked into owner list');
    }
    if (summary.trade_slugs.join(',') !== 'e5-trade' || summary.sale_slugs.join(',') !== 'e5-sale') {
      throw new Error('trade/sale collector lists are wrong');
    }
    if (!summary.want_collector_kind_rejected) {
      throw new Error('want collector list was not rejected');
    }
    if (summary.moment_payload_column_present) {
      throw new Error('moments RPC returned raw payload');
    }
    if (summary.moment_types.includes('scanner_v5_vault_add_enriched')) {
      throw new Error('private scanner enriched event leaked as a moment');
    }
    if (!summary.moment_types.includes('vault_added') || !summary.moment_types.includes('set_completion_crossed')) {
      throw new Error(`expected vault_added and set_completion_crossed moments, saw ${summary.moment_types.join(',')}`);
    }
    if (summary.moment_pages_overlap !== 0) {
      throw new Error('moment keyset pages overlapped');
    }
    if (summary.geography_payload_has_people) {
      throw new Error('geography RPC exposed people/copy identifiers');
    }
    if (JSON.stringify(summary.geography_areas) !== JSON.stringify(['Boulder', 'Denver'])) {
      throw new Error(`geography areas mismatch: ${summary.geography_areas.join(',')}`);
    }
    if (summary.single_area_geography_rows !== 0) {
      throw new Error('single-area geography should be hidden');
    }
    if (!summary.public_copy_source_uses_area_label) {
      throw new Error('public copy source does not expose locality_label from area_label source');
    }
    if (!summary.public_copy_source_client_denied) {
      throw new Error('internal public copy source was callable by authenticated clients');
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
