import process from 'node:process';
import pg from 'pg';

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54330/postgres';

const FIXTURE = {
  gameId: '00000000-0000-4000-8000-00000000e901',
  setId: '00000000-0000-4000-8000-00000000e902',
  cardId: '00000000-0000-4000-8000-00000000e903',
  userA: '00000000-0000-4000-8000-00000000e9a1',
  userB: '00000000-0000-4000-8000-00000000e9b2',
  instanceA: '00000000-0000-4000-8000-00000000e9c1',
  instanceB: '00000000-0000-4000-8000-00000000e9c2',
  archivedInstanceA: '00000000-0000-4000-8000-00000000e9c3',
  memoryA: '00000000-0000-4000-8000-00000000e9d1',
  storageOwn: '00000000-0000-4000-8000-00000000e9e1',
  storageOther: '00000000-0000-4000-8000-00000000e9e2',
};

function cleanError(error) {
  return String(error?.message ?? error ?? '').replace(/\s+/g, ' ').trim();
}

function assert(condition, message, details = undefined) {
  if (!condition) {
    const suffix = details === undefined ? '' : ` ${JSON.stringify(details)}`;
    throw new Error(`${message}${suffix}`);
  }
}

async function expectDenied(label, action) {
  try {
    await action();
  } catch (error) {
    const message = cleanError(error);
    if (/permission denied|violates row-level security|not found|sign in required|collector memory target not found|collector memory photo path is invalid|42501|PGRST/i.test(message)) {
      return { label, denied: true, message };
    }
    throw new Error(`${label}: unexpected error: ${message}`);
  }
  throw new Error(`${label}: expected denial`);
}

async function asRole(client, role, userId, action) {
  await client.query('begin');
  try {
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? '']);
    await client.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
    await client.query(`set local role ${role}`);
    const result = await action();
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function asAuthenticated(client, userId, action) {
  return asRole(client, 'authenticated', userId, action);
}

async function asAnon(client, action) {
  return asRole(client, 'anon', '', action);
}

async function cleanup(client) {
  const users = [FIXTURE.userA, FIXTURE.userB];
  await client.query('begin');
  try {
    await client.query('set local session_replication_role = replica');
    await client.query('delete from storage.objects where bucket_id = $1 and name like $2', [
      'collector-memory-images',
      '00000000-0000-4000-8000-00000000e9%',
    ]);
    await client.query('delete from public.collector_memory_prompt_state where user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.collector_memories where user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.vault_item_instances where user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.public_profiles where user_id = any($1::uuid[])', [users]);
    await client.query('delete from auth.users where id = any($1::uuid[])', [users]);
    await client.query('delete from public.card_prints where id = $1', [FIXTURE.cardId]);
    await client.query('delete from public.sets where id = $1', [FIXTURE.setId]);
    await client.query('delete from public.games where id = $1', [FIXTURE.gameId]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function seed(client) {
  await cleanup(client);

  await client.query(
    `
      insert into auth.users (
        id, aud, role, email, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        ($1, 'authenticated', 'authenticated', 'e9-a@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($2, 'authenticated', 'authenticated', 'e9-b@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
      on conflict (id) do update
      set email = excluded.email,
          updated_at = now()
    `,
    [FIXTURE.userA, FIXTURE.userB],
  );

  await client.query(
    `
      insert into public.public_profiles (
        user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled
      )
      values
        ($1, 'e9-a', 'E9 A', true, true),
        ($2, 'e9-b', 'E9 B', true, true)
      on conflict (user_id) do update
      set slug = excluded.slug,
          display_name = excluded.display_name,
          public_profile_enabled = true,
          vault_sharing_enabled = true,
          updated_at = now()
    `,
    [FIXTURE.userA, FIXTURE.userB],
  );

  const game = await client.query(
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

  await client.query(
    `
      insert into public.sets (id, game, code, name)
      values ($1, 'pokemon', 'E9M', 'E9 Memory Set')
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
        $1, $2, $3, 'E9 Memory Pikachu', '009', 'E9M', 'GV-PK-E9M-009',
        'https://example.com/e9-memory-pikachu.png', 'exact'
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
    [FIXTURE.cardId, game.rows[0].id, FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.vault_item_instances (
        id, user_id, gv_vi_id, card_print_id, intent, condition_label, created_at, archived_at
      )
      values
        ($1, $4, 'GVVI-E9-A-001', $6, 'showcase', 'NM', now() - interval '2 days', null),
        ($2, $5, 'GVVI-E9-B-001', $6, 'showcase', 'NM', now() - interval '2 days', null),
        ($3, $4, 'GVVI-E9-A-ARCHIVED', $6, 'showcase', 'NM', now() - interval '3 days', now() - interval '1 day')
      on conflict (id) do update
      set user_id = excluded.user_id,
          gv_vi_id = excluded.gv_vi_id,
          card_print_id = excluded.card_print_id,
          intent = excluded.intent,
          condition_label = excluded.condition_label,
          archived_at = excluded.archived_at,
          updated_at = now()
    `,
    [
      FIXTURE.instanceA,
      FIXTURE.instanceB,
      FIXTURE.archivedInstanceA,
      FIXTURE.userA,
      FIXTURE.userB,
      FIXTURE.cardId,
    ],
  );

  await client.query(
    `
      insert into storage.objects (id, bucket_id, name, owner, metadata, created_at, updated_at)
      values
        ($1, 'collector-memory-images', $3, $5, '{}'::jsonb, now(), now()),
        ($2, 'collector-memory-images', $4, $6, '{}'::jsonb, now(), now())
      on conflict (id) do update
      set bucket_id = excluded.bucket_id,
          name = excluded.name,
          owner = excluded.owner,
          updated_at = now()
    `,
    [
      FIXTURE.storageOwn,
      FIXTURE.storageOther,
      `${FIXTURE.userA}/memories/${FIXTURE.memoryA}/photo`,
      `${FIXTURE.userB}/memories/${FIXTURE.memoryA}/photo`,
      FIXTURE.userA,
      FIXTURE.userB,
    ],
  );
}

async function assertNoPublicSurfaceReferences(client) {
  const routines = await client.query(
    `
      select n.nspname, p.proname, pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind in ('f', 'p')
        and p.proname not like 'collector_memor%'
        and pg_get_functiondef(p.oid) ilike '%collector_memor%'
    `,
  );
  assert(routines.rowCount === 0, 'Non-memory public function references collector memories', routines.rows);

  const views = await client.query(
    `
      select schemaname, viewname
      from pg_views
      where schemaname = 'public'
        and definition ilike '%collector_memor%'
    `,
  );
  assert(views.rowCount === 0, 'Public view references collector memories', views.rows);
}

async function runAssertions(client) {
  const denied = [];

  denied.push(
    await expectDenied('anon select memories', () =>
      asAnon(client, () => client.query('select count(*) from public.collector_memories')),
    ),
  );
  denied.push(
    await expectDenied('anon execute create memory', () =>
      asAnon(client, () =>
        client.query(
          `select * from public.collector_memory_create_v1($1, 'note'::public.collector_memory_type, $2)`,
          ['GVVI-E9-A-001', 'anon memory'],
        ),
      ),
    ),
  );

  const created = await asAuthenticated(client, FIXTURE.userA, () =>
    client.query(
      `
        select id, user_id, vault_item_instance_id, note, place_label, photo_path
        from public.collector_memory_create_v1(
          $1,
          'added_place'::public.collector_memory_type,
          $2,
          $3,
          $4,
          null,
          current_date,
          $5
        )
      `,
      [
        'GVVI-E9-A-001',
        'Picked this up at the local show.',
        null,
        'Denver card show',
        'e9:first-local-show',
      ],
    ),
  );
  assert(created.rowCount === 1, 'User A should create one memory');
  const memory = created.rows[0];
  assert(memory.user_id === FIXTURE.userA, 'Created memory user mismatch', memory);
  assert(memory.vault_item_instance_id === FIXTURE.instanceA, 'Created memory instance mismatch', memory);

  const listed = await asAuthenticated(client, FIXTURE.userA, () =>
    client.query('select * from public.collector_memories_for_gvvi_v1($1)', ['GVVI-E9-A-001']),
  );
  assert(listed.rowCount === 1, 'User A should read own memory through RPC', listed.rows);
  assert(listed.rows[0].place_label === 'Denver card show', 'Own memory place label should round-trip', listed.rows[0]);

  const bList = await asAuthenticated(client, FIXTURE.userB, () =>
    client.query('select * from public.collector_memories_for_gvvi_v1($1)', ['GVVI-E9-A-001']),
  );
  assert(bList.rowCount === 0, 'User B should not see User A GVVI memories', bList.rows);

  const bDirect = await asAuthenticated(client, FIXTURE.userB, () =>
    client.query('select count(*)::int as count from public.collector_memories where user_id = $1', [FIXTURE.userA]),
  );
  assert(Number(bDirect.rows[0].count) === 0, 'User B direct table read should see zero User A rows', bDirect.rows);

  denied.push(
    await expectDenied('User A cannot create memory for User B GVVI', () =>
      asAuthenticated(client, FIXTURE.userA, () =>
        client.query(
          `select * from public.collector_memory_create_v1($1, 'note'::public.collector_memory_type, $2)`,
          ['GVVI-E9-B-001', 'cross user memory'],
        ),
      ),
    ),
  );

  denied.push(
    await expectDenied('User A cannot create memory for archived GVVI', () =>
      asAuthenticated(client, FIXTURE.userA, () =>
        client.query(
          `select * from public.collector_memory_create_v1($1, 'note'::public.collector_memory_type, $2)`,
          ['GVVI-E9-A-ARCHIVED', 'archived memory'],
        ),
      ),
    ),
  );

  denied.push(
    await expectDenied('User A cannot attach wrong photo path', () =>
      asAuthenticated(client, FIXTURE.userA, () =>
        client.query(
          `select * from public.collector_memory_update_v1($1, $2, $3)`,
          [memory.id, 'bad path', `${FIXTURE.userB}/memories/${memory.id}/photo`],
        ),
      ),
    ),
  );

  const updated = await asAuthenticated(client, FIXTURE.userA, () =>
    client.query(
      `select id, photo_path from public.collector_memory_update_v1($1, $2, $3, $4, $5, $6)`,
      [
        memory.id,
        'Updated private memory',
        `${FIXTURE.userA}/memories/${memory.id}/photo`,
        'Denver',
        'Trade night',
        '2026-07-10',
      ],
    ),
  );
  assert(updated.rows[0].photo_path === `${FIXTURE.userA}/memories/${memory.id}/photo`, 'Valid photo path should save', updated.rows[0]);

  const ownStorage = await asAuthenticated(client, FIXTURE.userA, () =>
    client.query(
      `select count(*)::int as count from storage.objects where bucket_id = 'collector-memory-images' and name = $1`,
      [`${FIXTURE.userA}/memories/${FIXTURE.memoryA}/photo`],
    ),
  );
  assert(Number(ownStorage.rows[0].count) === 1, 'User A should see own memory storage object', ownStorage.rows);

  const otherStorage = await asAuthenticated(client, FIXTURE.userA, () =>
    client.query(
      `select count(*)::int as count from storage.objects where bucket_id = 'collector-memory-images' and name = $1`,
      [`${FIXTURE.userB}/memories/${FIXTURE.memoryA}/photo`],
    ),
  );
  assert(Number(otherStorage.rows[0].count) === 0, 'User A should not see User B memory storage object', otherStorage.rows);

  const archived = await asAuthenticated(client, FIXTURE.userA, () =>
    client.query('select archived_at is not null as archived from public.collector_memory_archive_v1($1)', [memory.id]),
  );
  assert(archived.rows[0].archived === true, 'Archive RPC should soft archive memory', archived.rows[0]);

  const afterArchive = await asAuthenticated(client, FIXTURE.userA, () =>
    client.query('select * from public.collector_memories_for_gvvi_v1($1)', ['GVVI-E9-A-001']),
  );
  assert(afterArchive.rowCount === 0, 'Archived memory should not appear in active list', afterArchive.rows);

  await assertNoPublicSurfaceReferences(client);

  const cardEvents = await client.query(
    `
      select count(*)::int as count
      from public.card_events
      where payload::text ilike '%e9:first-local-show%'
        or payload::text ilike '%Picked this up%'
        or event_type ilike '%memory%'
    `,
  );
  assert(Number(cardEvents.rows[0].count) === 0, 'Memory actions should not emit card_events', cardEvents.rows);

  return {
    denied,
    created_memory_id: memory.id,
    public_surface_reference_count: 0,
    emitted_card_events: Number(cardEvents.rows[0].count),
  };
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || DEFAULT_LOCAL_DB_URL;
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await seed(client);
    const result = await runAssertions(client);
    console.log(JSON.stringify({ status: 'PASS', fixture: 'e9_collector_memories_local_fixture_smoke_v1', ...result }, null, 2));
  } finally {
    await cleanup(client);
    await client.end();
  }
}

await main();
