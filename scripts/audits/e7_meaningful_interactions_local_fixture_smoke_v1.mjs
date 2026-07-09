import fsSync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const ROOT = process.cwd();
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54330/postgres';

const FIXTURE = {
  gameId: '00000000-0000-4000-8000-00000000e700',
  userA: '00000000-0000-4000-8000-00000000e7a1',
  userB: '00000000-0000-4000-8000-00000000e7b2',
  userC: '00000000-0000-4000-8000-00000000e7c3',
  setId: '00000000-0000-4000-8000-00000000e701',
  tradeCardId: '00000000-0000-4000-8000-00000000e711',
  wantCardId: '00000000-0000-4000-8000-00000000e712',
  showcaseCardId: '00000000-0000-4000-8000-00000000e713',
  tradeVaultItemId: '00000000-0000-4000-8000-00000000e721',
  wantVaultItemId: '00000000-0000-4000-8000-00000000e722',
  showcaseVaultItemId: '00000000-0000-4000-8000-00000000e723',
  wantMatchId: '00000000-0000-4000-8000-00000000e731',
  followId: '00000000-0000-4000-8000-00000000e741',
  intentEventId: '00000000-0000-4000-8000-00000000e751',
  tradeOpenInteractionId: '00000000-0000-4000-8000-00000000e761',
  tradeReplyInteractionId: '00000000-0000-4000-8000-00000000e762',
  tradeThirdInteractionId: '00000000-0000-4000-8000-00000000e763',
  wantActionInteractionId: '00000000-0000-4000-8000-00000000e764',
  showcaseOpenInteractionId: '00000000-0000-4000-8000-00000000e765',
  showcaseReplyInteractionId: '00000000-0000-4000-8000-00000000e766',
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

async function setRole(client, role) {
  await client.query(`reset role`);
  await client.query(`set local role ${role}`);
}

async function cleanupFixture(client) {
  await client.query(
    `delete from public.card_interactions where id = any($1::uuid[])`,
    [
      [
        FIXTURE.tradeOpenInteractionId,
        FIXTURE.tradeReplyInteractionId,
        FIXTURE.tradeThirdInteractionId,
        FIXTURE.wantActionInteractionId,
        FIXTURE.showcaseOpenInteractionId,
        FIXTURE.showcaseReplyInteractionId,
      ],
    ],
  );
  await client.query(`delete from public.want_matches where id = $1`, [FIXTURE.wantMatchId]);
  await client.query(`delete from public.collector_follows where id = $1`, [FIXTURE.followId]);
  await client.query(`delete from public.vault_items where id = any($1::uuid[])`, [
    [FIXTURE.tradeVaultItemId, FIXTURE.wantVaultItemId, FIXTURE.showcaseVaultItemId],
  ]);
}

async function seedFixture(client) {
  await cleanupFixture(client);

  await client.query(
    `
      insert into auth.users (
        id, aud, role, email, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        ($1, 'authenticated', 'authenticated', 'e7-a@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($2, 'authenticated', 'authenticated', 'e7-b@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($3, 'authenticated', 'authenticated', 'e7-c@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
      on conflict (id) do nothing
    `,
    [FIXTURE.userA, FIXTURE.userB, FIXTURE.userC],
  );

  await client.query(
    `
      insert into public.public_profiles (
        user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled
      )
      values
        ($1, 'e7-a', 'E7 A', true, true),
        ($2, 'e7-b', 'E7 B', true, true),
        ($3, 'e7-c', 'E7 C', true, true)
      on conflict (user_id) do update set
        slug = excluded.slug,
        display_name = excluded.display_name,
        public_profile_enabled = excluded.public_profile_enabled,
        vault_sharing_enabled = excluded.vault_sharing_enabled
    `,
    [FIXTURE.userA, FIXTURE.userB, FIXTURE.userC],
  );

  await client.query(
    `insert into public.games (id, code, name, slug)
     values ($1, 'e7pokemon', 'E7 Pokemon', 'e7pokemon')
     on conflict (id) do update set
       code = excluded.code,
       name = excluded.name,
       slug = excluded.slug`,
    [FIXTURE.gameId],
  );

  await client.query(
    `insert into public.sets (id, game, code, name)
     values ($1, 'e7pokemon', 'E7TEST', 'E7 Test Set')
     on conflict (id) do update set
       game = excluded.game,
       code = excluded.code,
       name = excluded.name`,
    [FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.card_prints (
        id, game_id, set_id, name, number, set_code, gv_id, image_url, image_status
      )
      values
        ($1, $4, $5, 'E7 Trade Pikachu', '001', 'E7TEST', 'GV-PK-E7TEST-001', 'https://example.com/e7-1.png', 'exact'),
        ($2, $4, $5, 'E7 Want Bulbasaur', '002', 'E7TEST', 'GV-PK-E7TEST-002', 'https://example.com/e7-2.png', 'exact'),
        ($3, $4, $5, 'E7 Showcase Squirtle', '003', 'E7TEST', 'GV-PK-E7TEST-003', 'https://example.com/e7-3.png', 'exact')
      on conflict (id) do update set
        game_id = excluded.game_id,
        set_id = excluded.set_id,
        name = excluded.name,
        number = excluded.number,
        set_code = excluded.set_code,
        gv_id = excluded.gv_id,
        image_url = excluded.image_url,
        image_status = excluded.image_status
    `,
    [FIXTURE.tradeCardId, FIXTURE.wantCardId, FIXTURE.showcaseCardId, FIXTURE.gameId, FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.vault_items (
        id, user_id, card_id, qty, name, set_name, gv_id, intent, archived_at
      )
      values
        ($1, $4, $6, 1, 'E7 Trade Pikachu', 'E7 Test Set', 'GV-PK-E7TEST-001', 'trade', null),
        ($2, $4, $7, 1, 'E7 Want Bulbasaur', 'E7 Test Set', 'GV-PK-E7TEST-002', 'trade', null),
        ($3, $5, $8, 1, 'E7 Showcase Squirtle', 'E7 Test Set', 'GV-PK-E7TEST-003', 'showcase', null);
    `,
    [
      FIXTURE.tradeVaultItemId,
      FIXTURE.wantVaultItemId,
      FIXTURE.showcaseVaultItemId,
      FIXTURE.userB,
      FIXTURE.userC,
      FIXTURE.tradeCardId,
      FIXTURE.wantCardId,
      FIXTURE.showcaseCardId,
    ],
  );

  await client.query(
    `insert into public.collector_follows (id, follower_user_id, followed_user_id, created_at)
     values ($1, $2, $3, '2026-07-06 09:00:00+00')`,
    [FIXTURE.followId, FIXTURE.userA, FIXTURE.userB],
  );

  await client.query(
    `
      insert into public.card_events (
        id, event_type, card_print_id, actor_user_id, subject_user_id,
        payload, visibility, dedupe_key, created_at
      )
      values (
        $1, 'vault_intent_changed', $2, $3, null,
        jsonb_build_object(
          'vault_item_instance_id', '00000000-0000-4000-8000-00000000e799',
          'gvvi_id', 'GVVI-E7-001',
          'previous_intent', 'hold',
          'next_intent', 'trade'
        ),
        'public',
        'e7-fixture-intent',
        '2026-07-06 10:00:00+00'
      )
      on conflict (id) do nothing
    `,
    [FIXTURE.intentEventId, FIXTURE.tradeCardId, FIXTURE.userB],
  );

  await client.query(
    `
      insert into public.want_matches (
        id, want_user_id, owner_user_id, card_print_id, vault_item_id,
        distance_bucket, intent, source_type, match_strength, recommended_tier,
        status, first_seen_available_at, last_seen_available_at, payload, created_at, updated_at
      )
      values (
        $1, $2, $3, $4, $5,
        'nearby', 'trade', 'local_fixture', 0.91, 'instant',
        'active', '2026-07-06 08:00:00+00', '2026-07-06 08:00:00+00',
        '{}'::jsonb, '2026-07-06 08:00:00+00', '2026-07-06 08:00:00+00'
      );
    `,
    [FIXTURE.wantMatchId, FIXTURE.userA, FIXTURE.userB, FIXTURE.wantCardId, FIXTURE.wantVaultItemId],
  );

  await client.query(
    `
      insert into public.card_interactions (
        id, card_print_id, vault_item_id, sender_user_id, receiver_user_id, message, status, created_at
      )
      values
        ($1, $7, $10, $4, $5, 'Opening trade message', 'open', '2026-07-06 11:00:00+00'),
        ($2, $7, $10, $5, $4, 'First answer to trade', 'open', '2026-07-06 11:05:00+00'),
        ($3, $7, $10, $4, $5, 'Third message should not count', 'open', '2026-07-06 11:10:00+00'),
        ($11, $8, $12, $4, $5, 'Acting on want match', 'open', '2026-07-06 12:00:00+00'),
        ($13, $9, $14, $4, $6, 'Opening showcase message', 'open', '2026-07-06 13:00:00+00'),
        ($15, $9, $14, $6, $4, 'Showcase reply should not count as answer', 'open', '2026-07-06 13:05:00+00');
    `,
    [
      FIXTURE.tradeOpenInteractionId,
      FIXTURE.tradeReplyInteractionId,
      FIXTURE.tradeThirdInteractionId,
      FIXTURE.userA,
      FIXTURE.userB,
      FIXTURE.userC,
      FIXTURE.tradeCardId,
      FIXTURE.wantCardId,
      FIXTURE.showcaseCardId,
      FIXTURE.tradeVaultItemId,
      FIXTURE.wantActionInteractionId,
      FIXTURE.wantVaultItemId,
      FIXTURE.showcaseOpenInteractionId,
      FIXTURE.showcaseVaultItemId,
      FIXTURE.showcaseReplyInteractionId,
    ],
  );
}

function assert(condition, message, detail = undefined) {
  if (!condition) {
    const suffix = detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

async function assertAccessDenied(connectionString, role) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query('begin');
  try {
    await setRole(client, role);
    await client.query('select count(*) from public.v_meaningful_interactions_v1');
    throw new Error(`${role} unexpectedly read v_meaningful_interactions_v1`);
  } catch (error) {
    if (!/(permission denied|does not exist)/i.test(String(error.message))) {
      throw error;
    }
  } finally {
    await client.query('rollback');
    await client.end();
  }
}

async function runAssertions(client, connectionString) {
  await assertAccessDenied(connectionString, 'anon');
  await assertAccessDenied(connectionString, 'authenticated');

  const { rows: countRows } = await client.query(
    `
      select kind::text, count(*)::int as count
      from public.v_meaningful_interactions_v1
      where source_id = any($1::uuid[])
         or source_id in ($2, $3, $4)
      group by kind
      order by kind
    `,
    [
      [
        FIXTURE.tradeOpenInteractionId,
        FIXTURE.tradeReplyInteractionId,
        FIXTURE.tradeThirdInteractionId,
        FIXTURE.wantActionInteractionId,
        FIXTURE.showcaseOpenInteractionId,
        FIXTURE.showcaseReplyInteractionId,
      ],
      FIXTURE.followId,
      FIXTURE.intentEventId,
      FIXTURE.wantActionInteractionId,
    ],
  );

  const counts = Object.fromEntries(countRows.map((row) => [row.kind, Number(row.count)]));
  assert(counts.wall_follow === 1, 'Expected exactly one wall_follow', counts);
  assert(counts.trade_intent_expressed === 1, 'Expected exactly one trade_intent_expressed', counts);
  assert(counts.message_about_card === 2, 'Expected two opening card messages', counts);
  assert(counts.trade_intent_answered === 1, 'Expected exactly one trade_intent_answered', counts);
  assert(counts.want_match_acted_on === 1, 'Expected exactly one want_match_acted_on', counts);

  const { rows: excludedRows } = await client.query(
    `
      select source_id::text, kind::text
      from public.v_meaningful_interactions_v1
      where source_id = any($1::uuid[])
      order by source_id::text, kind::text
    `,
    [[FIXTURE.tradeThirdInteractionId, FIXTURE.showcaseReplyInteractionId]],
  );
  assert(excludedRows.length === 0, 'Third-plus and showcase reply rows must not count', excludedRows);

  const { rows: overlapRows } = await client.query(
    `
      select source_id::text, array_agg(kind::text order by kind::text) as kinds
      from public.v_meaningful_interactions_v1
      where source_id = $1
      group by source_id
    `,
    [FIXTURE.wantActionInteractionId],
  );
  assert(overlapRows.length === 1, 'Want-match action source should map once', overlapRows);
  assert(
    overlapRows[0].kinds.length === 1 && overlapRows[0].kinds[0] === 'want_match_acted_on',
    'Want-match action source must not also count as message_about_card',
    overlapRows,
  );

  const { rows: duplicateSourceRows } = await client.query(
    `
      select source_table, source_id::text, count(*)::int as mapped_count
      from public.v_meaningful_interactions_v1
      group by source_table, source_id
      having count(*) > 1
      order by mapped_count desc, source_table, source_id::text
    `,
  );
  assert(duplicateSourceRows.length === 0, 'One source row must map to at most one kind', duplicateSourceRows);

  const { rows: weekRows } = await client.query(
    `
      select count(*)::int as raw_week_count
      from public.v_meaningful_interactions_v1
      where occurred_at >= '2026-07-06 00:00:00+00'
        and occurred_at < '2026-07-13 00:00:00+00'
        and (
          actor_user_id = any($1::uuid[])
          or subject_user_id = any($1::uuid[])
        )
    `,
    [[FIXTURE.userA, FIXTURE.userB, FIXTURE.userC]],
  );
  assert(Number(weekRows[0].raw_week_count) === 6, 'Seeded weekly north-star raw count should be hand-reproducible as 6', weekRows[0]);

  return { counts, raw_week_count: Number(weekRows[0].raw_week_count) };
}

async function main() {
  loadLocalEnv();
  const connectionString = process.env.E7_SMOKE_DB_URL || DEFAULT_LOCAL_DB_URL;
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await seedFixture(client);
    const result = await runAssertions(client, connectionString);
    console.log(JSON.stringify({ status: 'PASS', fixture: 'e7_meaningful_interactions_local_fixture_smoke_v1', ...result }, null, 2));
  } finally {
    if (process.env.E7_SKIP_CLEANUP !== '1') {
      await cleanupFixture(client);
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
