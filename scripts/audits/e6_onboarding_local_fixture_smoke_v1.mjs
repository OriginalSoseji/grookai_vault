import process from 'node:process';
import pg from 'pg';

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54330/postgres';
const FIXTURE = {
  gameId: '00000000-0000-4000-8000-00000000e600',
  setId: '00000000-0000-4000-8000-00000000e601',
  ownedCardId: '00000000-0000-4000-8000-00000000e602',
  wantedCardId: '00000000-0000-4000-8000-00000000e603',
  vaultInstanceId: '00000000-0000-4000-8000-00000000e604',
  userA: '00000000-0000-4000-8000-00000000e6a1',
  userB: '00000000-0000-4000-8000-00000000e6b2',
};

function cleanError(error) {
  return String(error?.message ?? error ?? '').replace(/\s+/g, ' ').trim();
}

async function expectDenied(label, action) {
  try {
    await action();
  } catch (error) {
    const message = cleanError(error);
    if (/permission denied|violates row-level security|not_authenticated|not authorized|not_authorized|42501/i.test(message)) {
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
    await client.query('delete from public.onboarding_ladder_events where user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.onboarding_ladder_state where user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.user_card_intents where user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.wishlist_items where user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.watches where user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.card_events where actor_user_id = any($1::uuid[]) or subject_user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.vault_item_instances where user_id = any($1::uuid[])', [users]);
    await client.query('delete from public.public_profiles where user_id = any($1::uuid[])', [users]);
    await client.query('delete from auth.users where id = any($1::uuid[])', [users]);
    await client.query('delete from public.card_prints where id in ($1, $2)', [FIXTURE.ownedCardId, FIXTURE.wantedCardId]);
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
        ($1, 'authenticated', 'authenticated', 'e6-a@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
        ($2, 'authenticated', 'authenticated', 'e6-b@grookai.local', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
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
        ($1, 'e6-local-a', 'E6 Local A', true, true),
        ($2, 'e6-local-b', 'E6 Local B', true, true)
      on conflict (user_id) do update
      set slug = excluded.slug,
          display_name = excluded.display_name,
          public_profile_enabled = true,
          vault_sharing_enabled = true,
          updated_at = now()
    `,
    [FIXTURE.userA, FIXTURE.userB],
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
      values ($1, 'pokemon', 'E6TEST', 'E6 Local Test Set')
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
      values
        ($1, (select id from public.games where code = 'pokemon' limit 1), $3, 'E6 Owned Pikachu', '001', 'E6TEST', 'GV-PK-E6TEST-001', 'https://example.com/e6-owned.png', 'exact'),
        ($2, (select id from public.games where code = 'pokemon' limit 1), $3, 'E6 Wanted Eevee', '002', 'E6TEST', 'GV-PK-E6TEST-002', 'https://example.com/e6-wanted.png', 'exact')
      on conflict (id) do update
      set name = excluded.name,
          number = excluded.number,
          set_code = excluded.set_code,
          gv_id = excluded.gv_id,
          image_url = excluded.image_url,
          image_status = excluded.image_status
    `,
    [FIXTURE.ownedCardId, FIXTURE.wantedCardId, FIXTURE.setId],
  );

  await client.query(
    `
      insert into public.vault_item_instances (
        id, user_id, gv_vi_id, card_print_id, condition_label, created_at
      )
      values ($1, $2, 'GVVI-E6-LOCAL-A-001', $3, 'NM', now() - interval '1 day')
      on conflict (id) do update
      set user_id = excluded.user_id,
          card_print_id = excluded.card_print_id,
          archived_at = null,
          updated_at = now()
    `,
    [FIXTURE.vaultInstanceId, FIXTURE.userA, FIXTURE.ownedCardId],
  );
}

async function scalar(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return Number(rows[0]?.value ?? 0);
}

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL,
  });
  await client.connect();
  await client.query("set statement_timeout = '20s'");
  await client.query("set lock_timeout = '5s'");

  const report = {
    fixture: FIXTURE,
    checks: {},
    denials: [],
  };

  try {
    await seed(client);

    report.denials.push(await expectDenied('anon select onboarding_ladder_state', () =>
      asAnon(client, () => client.query('select count(*) from public.onboarding_ladder_state')),
    ));
    report.denials.push(await expectDenied('anon select onboarding_ladder_events', () =>
      asAnon(client, () => client.query('select count(*) from public.onboarding_ladder_events')),
    ));
    report.denials.push(await expectDenied('anon call onboarding_ladder_state_v1', () =>
      asAnon(client, () => client.query('select * from public.onboarding_ladder_state_v1()')),
    ));

    await asAuthenticated(client, FIXTURE.userA, () =>
      client.query(
        `
          insert into public.user_card_intents (
            user_id, card_print_id, want, trade, sell, showcase, is_public, metadata
          )
          values ($1, $2, true, false, false, false, false, '{}'::jsonb)
          on conflict (user_id, card_print_id) do update
          set want = true,
              updated_at = now()
        `,
        [FIXTURE.userA, FIXTURE.wantedCardId],
      ),
    );

    report.checks.wishlist_rows_after_want =
      await scalar(client, 'select count(*) as value from public.wishlist_items where user_id = $1 and card_id = $2', [FIXTURE.userA, FIXTURE.wantedCardId]);
    report.checks.want_watch_rows_after_want =
      await scalar(client, "select count(*) as value from public.watches where user_id = $1 and subject_type = 'card' and subject_id = $2 and reason = 'want'", [FIXTURE.userA, FIXTURE.wantedCardId]);
    report.checks.want_added_events_after_want =
      await scalar(client, "select count(*) as value from public.card_events where actor_user_id = $1 and card_print_id = $2 and event_type = 'want_added'", [FIXTURE.userA, FIXTURE.wantedCardId]);

    const stateRows = await asAuthenticated(client, FIXTURE.userA, () =>
      client.query('select * from public.onboarding_ladder_state_v1()'),
    );
    const state = stateRows.rows[0] ?? {};
    report.checks.bootstrap_owned_detected = state.owned_card_print_id === FIXTURE.ownedCardId;
    report.checks.bootstrap_wanted_detected = state.wanted_card_print_id === FIXTURE.wantedCardId;
    report.checks.bootstrap_suggestions_only_for_owned_wanted_no_follow = state.should_show_collector_suggestions === true && state.is_complete === false;

    await asAuthenticated(client, FIXTURE.userA, () =>
      client.query('select * from public.onboarding_record_rung_v1($1, $2, null, $3, $4::jsonb)', [
        'rung_1_wanted',
        FIXTURE.wantedCardId,
        'search',
        '{}',
      ]),
    );
    await asAuthenticated(client, FIXTURE.userA, () =>
      client.query('select * from public.onboarding_record_rung_v1($1, $2, null, $3, $4::jsonb)', [
        'rung_1_wanted',
        FIXTURE.wantedCardId,
        'search',
        '{}',
      ]),
    );
    report.checks.rung_1_wanted_event_rows_after_duplicate_calls =
      await scalar(client, "select count(*) as value from public.onboarding_ladder_events where user_id = $1 and event_type = 'rung_1_wanted'", [FIXTURE.userA]);

    await asAuthenticated(client, FIXTURE.userA, () =>
      client.query(
        'update public.user_card_intents set trade = false, want = true where user_id = $1 and card_print_id = $2',
        [FIXTURE.userA, FIXTURE.wantedCardId],
      ),
    );
    report.checks.want_added_events_after_repeat_true =
      await scalar(client, "select count(*) as value from public.card_events where actor_user_id = $1 and card_print_id = $2 and event_type = 'want_added'", [FIXTURE.userA, FIXTURE.wantedCardId]);

    report.denials.push(await expectDenied('user A insert state for user B', () =>
      asAuthenticated(client, FIXTURE.userA, () =>
        client.query('insert into public.onboarding_ladder_state (user_id) values ($1)', [FIXTURE.userB]),
      ),
    ));
    report.denials.push(await expectDenied('user A insert event for user B', () =>
      asAuthenticated(client, FIXTURE.userA, () =>
        client.query("insert into public.onboarding_ladder_events (user_id, event_type) values ($1, 'onboarding_skipped')", [FIXTURE.userB]),
      ),
    ));

    await client.query(
      "insert into public.onboarding_ladder_state (user_id) values ($1) on conflict (user_id) do nothing",
      [FIXTURE.userB],
    );
    await client.query(
      "insert into public.onboarding_ladder_events (user_id, event_type, dedupe_key) values ($1, 'onboarding_skipped', 'e6-local-b-event') on conflict (dedupe_key) where dedupe_key is not null do nothing",
      [FIXTURE.userB],
    );
    const aSeesBState = await asAuthenticated(client, FIXTURE.userA, () =>
      client.query('select count(*)::int as count from public.onboarding_ladder_state where user_id = $1', [FIXTURE.userB]),
    );
    const aSeesBEvents = await asAuthenticated(client, FIXTURE.userA, () =>
      client.query('select count(*)::int as count from public.onboarding_ladder_events where user_id = $1', [FIXTURE.userB]),
    );
    report.checks.user_a_selects_b_state_rows = Number(aSeesBState.rows[0]?.count ?? 0);
    report.checks.user_a_selects_b_event_rows = Number(aSeesBEvents.rows[0]?.count ?? 0);

    report.denials.push(await expectDenied('user A update own event denied', () =>
      asAuthenticated(client, FIXTURE.userA, () =>
        client.query("update public.onboarding_ladder_events set source = 'mutated' where user_id = $1", [FIXTURE.userA]),
      ),
    ));
    report.denials.push(await expectDenied('user A delete own event denied', () =>
      asAuthenticated(client, FIXTURE.userA, () =>
        client.query('delete from public.onboarding_ladder_events where user_id = $1', [FIXTURE.userA]),
      ),
    ));

    await asAuthenticated(client, FIXTURE.userA, () =>
      client.query('update public.user_card_intents set want = false where user_id = $1 and card_print_id = $2', [FIXTURE.userA, FIXTURE.wantedCardId]),
    );
    report.checks.wishlist_rows_after_want_false =
      await scalar(client, 'select count(*) as value from public.wishlist_items where user_id = $1 and card_id = $2', [FIXTURE.userA, FIXTURE.wantedCardId]);
    report.checks.want_removed_events_after_want_false =
      await scalar(client, "select count(*) as value from public.card_events where actor_user_id = $1 and card_print_id = $2 and event_type = 'want_removed'", [FIXTURE.userA, FIXTURE.wantedCardId]);

    const expected = {
      wishlist_rows_after_want: 1,
      want_watch_rows_after_want: 1,
      want_added_events_after_want: 1,
      bootstrap_owned_detected: true,
      bootstrap_wanted_detected: true,
      bootstrap_suggestions_only_for_owned_wanted_no_follow: true,
      rung_1_wanted_event_rows_after_duplicate_calls: 1,
      want_added_events_after_repeat_true: 1,
      user_a_selects_b_state_rows: 0,
      user_a_selects_b_event_rows: 0,
      wishlist_rows_after_want_false: 0,
      want_removed_events_after_want_false: 1,
    };

    for (const [key, expectedValue] of Object.entries(expected)) {
      if (report.checks[key] !== expectedValue) {
        throw new Error(`${key} expected ${expectedValue}, got ${report.checks[key]}`);
      }
    }

    report.status = 'pass';
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await cleanup(client);
    await client.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'fail', error: cleanError(error) }, null, 2));
  process.exitCode = 1;
});
