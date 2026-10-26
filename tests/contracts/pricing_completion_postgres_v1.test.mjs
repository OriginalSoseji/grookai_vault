import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readPricingCompletionSourceSnapshotV1 } from '../../backend/pricing/pricing_completion_source_export_v1.mjs';
import { readPricingCompletionMasterSnapshotV1, buildPricingCompletionMasterGapExportV1 } from '../../backend/pricing/pricing_completion_master_gap_export_v1.mjs';

const enabled = process.env.PRICING_COMPLETION_SQL_TESTS === 'offline-disposable';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Only an explicitly opted-in fresh loopback DB. No .env, remote routing, host
// process launch, shell command, schema reset or automatic production target.
test('real PostgreSQL export qualification in isolated disposable offline fixture', { skip: !enabled, timeout: 120000 }, async t => {
  const url = new URL(process.env.PRICING_COMPLETION_TEST_DB_URL);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
  assert.equal(url.search, ''); assert.equal(url.hash, '');
  const database = url.pathname.slice(1);
  assert.match(database, /^pricing_completion_fixture_[a-z0-9_]{1,18}$/);
  const role = `${database}_reader`;
  const { default: pg } = await import('pg');
  const admin = new pg.Client({ connectionString: url.href, ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 15000 });
  const readerUrl = new URL(url.href);
  readerUrl.username = role; readerUrl.password = '';
  const reader = new pg.Client({ connectionString: readerUrl.href, ssl: false, connectionTimeoutMillis: 5000,
    statement_timeout: 15000, options: '-c default_transaction_read_only=on' });
  let readerConnected = false;
  await admin.connect();
  try {
    const environment = (await admin.query("select current_database() as database, host(inet_server_addr()) as address")).rows[0];
    assert.equal(environment.database, database);
    assert.ok(['127.0.0.1', '::1'].includes(environment.address));
    assert.equal((await admin.query("select count(*)::int as n from information_schema.tables where table_schema='public'")).rows[0].n, 0, 'fixture must be a fresh empty database');
    assert.equal((await admin.query('select count(*)::int as n from pg_roles where rolname=$1', [role])).rows[0].n, 0, 'fixture reader role must be new');
    const fixture = await fs.readFile(new URL('../database/pricing_completion_export_fixture_v1.sql', import.meta.url), 'utf8');
    await admin.query(fixture);
    const parentColumns = (await admin.query("select column_name,data_type from information_schema.columns where table_schema='public' and table_name='card_prints'")).rows;
    assert.ok(parentColumns.some(column => column.column_name === 'game_id' && column.data_type === 'uuid'));
    assert.ok(!parentColumns.some(column => column.column_name === 'game'), 'canonical game must resolve through games.code, never an invented parent game column');
    const migration = await fs.readFile(new URL('../../supabase/migrations/20261001203000_jungle_edition_price_reader_integration_v1.sql', import.meta.url), 'utf8');
    const definitions = [...migration.matchAll(/create or replace function public\.get_market_pricing_read_model_v1\([\s\S]*?\r?\n\$\$;/g)];
    assert.equal(definitions.length, 1, 'exact reviewed RPC definition must be uniquely retained');
    const rpc = definitions[0][0];
    await admin.query(rpc);
    // Role name is derived solely from the restrictive database-name grammar.
    await admin.query(`create role "${role}" login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls`);
    await admin.query(`grant usage on schema public to "${role}"`);
    // Only direct-query dependencies. The SECURITY DEFINER RPC owns access to
    // its internal gates; the export role must not be able to read them itself.
    const directTables = ['games', 'sets', 'card_prints', 'card_printings', 'tcgcsv_source_sync_runs',
      'market_price_pipeline_runs', 'market_price_publication_sets', 'market_price_current_publication',
      'market_price_qualification_decisions', 'market_price_publication_snapshots',
      'tcgcsv_source_price_daily_observations', 'tcgcsv_source_products', 'tcgcsv_source_groups'];
    assert.equal(directTables.length, 13);
    for (const table of directTables) {
      await admin.query(`alter table public.${table} enable row level security`);
      await admin.query(`create policy pricing_completion_fixture_read on public.${table} for select to "${role}" using (true)`);
      await admin.query(`grant select on public.${table} to "${role}"`);
    }
    await admin.query('revoke execute on all functions in schema public from public');
    await admin.query(`grant execute on function public.get_market_pricing_read_model_v1(uuid[],uuid[]) to "${role}"`);
    await reader.connect(); readerConnected = true;
    const identity = (await reader.query("select current_user, session_user, current_setting('default_transaction_read_only') as read_only")).rows[0];
    assert.equal(identity.current_user, role); assert.equal(identity.session_user, role); assert.equal(identity.read_only, 'on');
    const adminRole = (await admin.query('select current_user as role')).rows[0].role;
    assert.match(adminRole, /^[a-z_][a-z0-9_]*$/);
    assert.equal((await reader.query("select count(*)::int as n from pg_auth_members where member=(select oid from pg_roles where rolname=current_user)")).rows[0].n, 0);
    const rls = (await reader.query(`select c.relname, c.relrowsecurity,
      has_table_privilege(current_user,c.oid,'SELECT') as can_select,
      has_table_privilege(current_user,c.oid,'UPDATE') as can_update
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`, [directTables])).rows;
    assert.equal(rls.length, 13);
    assert.ok(rls.every(row => row.relrowsecurity && row.can_select && !row.can_update));
    const masterReader = async (client, { sourceRunId, capturedAt }) => buildPricingCompletionMasterGapExportV1(
      await readPricingCompletionMasterSnapshotV1(client, { games: ['pokemon'], currency: 'USD',
        sourceRunId, observedAt: capturedAt, evidenceRef: 'offline-postgres-fixture/exact-rpc', batchSize: 2 }));
    const capture = () => readPricingCompletionSourceSnapshotV1(reader, { now: Date.now(), expectedRunId: uuid(1), readMasterSnapshot: masterReader });
    async function mutateThenRestore(mutate, restore, check) {
      await mutate(); try { await check(); } finally { await restore(); }
    }

    await t.test('real parameterized census retains all six lanes, exact price gaps and no-child parent', async () => {
      const result = await capture();
      assert.equal(result.receipt.rollbackAcknowledged, true);
      assert.deepEqual(Object.values(result.receipt.laneCounts), [1, 1, 1, 1, 1, 1]);
      assert.equal(result.masterExport.summary.canonicalParents, 3);
      assert.equal(result.masterExport.summary.exactPrintings, 3);
      assert.equal(result.masterExport.summary.freshPriced, 1);
      assert.equal(result.masterExport.summary.masterPriceGaps, 2);
      assert.equal(result.masterExport.parentsWithoutPrintings.length, 1);
      assert.equal(result.masterExport.parentsWithoutPrintings[0].parentId, uuid(102));
      assert.equal(result.masterExport.parentsWithoutPrintings[0].printingId, null);
      assert.equal(result.snapshot.observations.length, 8);
      assert.equal(result.normalized.coverage.masterToPrice.expectedUnresolved, 3);
      assert.equal(result.normalized.coverage.masterToPrice.status, 'partial');
      assert.equal(result.normalized.summary.complete, false);
      assert.equal(result.masterExport.usablePrices[0].printingId, uuid(201));
      assert.ok(result.snapshot.observations.every(row => row.identity.condition === 'NOT_CONDITION_SPECIFIC'));
      assert.equal(result.receipt.publicationBinding.publicationSetId, uuid(3));
      // The source transaction must really be closed, not only report a receipt.
      assert.equal((await reader.query("select current_setting('transaction_isolation') as isolation")).rows[0].isolation, 'read committed');
    });

    await t.test('real restricted reader has no write privilege even when transaction mode is changed', async () => {
      const privileges = (await reader.query("select has_table_privilege(current_user,'public.card_prints','UPDATE') as can_update")).rows[0];
      assert.equal(privileges.can_update, false);
      await assert.rejects(reader.query('update public.card_prints set name=name where id=$1', [uuid(101)]), error => ['25006', '42501'].includes(error.code));
      await reader.query('begin read write');
      try { await assert.rejects(reader.query('update public.card_prints set name=name where id=$1', [uuid(101)]), error => error.code === '42501'); }
      finally { await reader.query('rollback'); }
      for (const statement of [
        `set role "${adminRole}"`,
        `create role "${role}_escape"`,
        'create table public.forbidden_reader_write(id integer)',
        'select * from public.pricing_completion_private_probe',
        'select * from public.external_mappings',
        'select * from public.card_printing_truth_reviews',
        'select * from public.jungle_edition_identity_links_v1',
        'select * from public.mv_market_listing_active_ask_current_v1',
        "select public.jungle_edition_price_row_valid_v1('{}'::jsonb)",
      ]) {
        await reader.query('begin read write');
        try { await assert.rejects(reader.query(statement), error => error.code === '42501'); }
        finally { await reader.query('rollback'); }
      }
      await reader.query('reset role');
      const after = (await reader.query('select session_user,current_user')).rows[0];
      assert.deepEqual(after, { session_user: role, current_user: role });
    });

    await t.test('named role SELECT policy is enforced by PostgreSQL, not only recorded as metadata', async () => {
      await mutateThenRestore(
        () => admin.query('alter policy pricing_completion_fixture_read on public.market_price_pipeline_runs using (false)'),
        () => admin.query('alter policy pricing_completion_fixture_read on public.market_price_pipeline_runs using (true)'),
        () => assert.rejects(capture(), /run_missing/));
      assert.equal((await capture()).receipt.rollbackAcknowledged, true);
    });

    await t.test('current pointer bound to another valid run is rejected before combined export', async () => {
      await admin.query(`insert into public.market_price_pipeline_runs select $1::uuid,'fixture-historical',source_sync_run_id,
        0,0,0,0,0,0,0,completed_at-interval '1 day',created_at-interval '1 day',run_mode,state,reconciliation_state
        from public.market_price_pipeline_runs where id=$2`, [uuid(51), uuid(1)]);
      await admin.query('insert into public.market_price_publication_sets values($1,$2,\'published\')', [uuid(53), uuid(51)]);
      try {
        await mutateThenRestore(
          () => admin.query('update public.market_price_current_publication set run_id=$1,publication_set_id=$2', [uuid(51), uuid(53)]),
          () => admin.query('update public.market_price_current_publication set run_id=$1,publication_set_id=$2', [uuid(1), uuid(3)]),
          () => assert.rejects(capture(), /current_publication_context_mismatch/));
      } finally {
        await admin.query('delete from public.market_price_publication_sets where id=$1', [uuid(53)]);
        await admin.query('delete from public.market_price_pipeline_runs where id=$1', [uuid(51)]);
      }
    });

    await t.test('source observation product, subtype and row identity are checked against actual joined columns', async () => {
      for (const [column, wrong, original, expected] of [
        ['product_id', 999, 101, /source_observation_product_mismatch/],
        ['subtype_name', 'Reverse Holofoil', 'Holofoil', /source_observation_subtype_mismatch/],
        ['source_price_row_identity', 'different-row', 'fixture-row-1', /source_observation_identity_mismatch/],
      ]) await mutateThenRestore(
        () => admin.query(`update public.tcgcsv_source_price_daily_observations set ${column}=$1 where id=$2`, [wrong, uuid(1001)]),
        () => admin.query(`update public.tcgcsv_source_price_daily_observations set ${column}=$1 where id=$2`, [original, uuid(1001)]),
        () => assert.rejects(capture(), expected));
    });

    await t.test('Pokemon parents missing sets or routed to another game cannot disappear from SQL census', async () => {
      for (const target of [null, uuid(11)]) await mutateThenRestore(
        () => admin.query('update public.card_prints set set_id=$1 where id=$2', [target, uuid(102)]),
        () => admin.query('update public.card_prints set set_id=$1 where id=$2', [uuid(10), uuid(102)]),
        () => assert.rejects(capture(), /parent set ID|parent set game routing mismatch/));
    });

    await t.test('read model denies reviewed invalidated source link and hidden printing without source-ledger mutation', async () => {
      await mutateThenRestore(
        () => admin.query(`update public.external_mappings set meta='{"reviewed_invalidation":{"reason_code":"PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT"}}' where id=1`),
        () => admin.query("update public.external_mappings set meta='{}' where id=1"),
        async () => { assert.equal((await capture()).masterExport.summary.freshPriced, 0); });
      await mutateThenRestore(
        () => admin.query("insert into public.card_printing_truth_reviews values($1,$2,true,'hidden_pending_review')", [uuid(5001), uuid(201)]),
        () => admin.query('delete from public.card_printing_truth_reviews where id=$1', [uuid(5001)]),
        async () => { assert.equal((await capture()).masterExport.summary.freshPriced, 0); });
    });

    await t.test('exact read ignores cheaper parent summary and retains unpriced sibling separately', async () => {
      const parent = (await reader.query('select * from public.get_market_pricing_read_model_v1($1::uuid[],$2::uuid[])', [[uuid(101)], []])).rows;
      assert.equal(parent.length, 1); assert.equal(parent[0].pricing_scope, 'parent');
      const result = await capture();
      assert.equal(result.masterExport.usablePrices.length, 1);
      assert.ok(result.masterExport.observations.some(row => row.identity.printingId === uuid(202)));
    });

    await t.test('retained source counters cannot conceal omitted decisions or truncated export', async () => {
      await mutateThenRestore(
        () => admin.query('update public.market_price_pipeline_runs set selected_count=9 where id=$1', [uuid(1)]),
        () => admin.query('update public.market_price_pipeline_runs set selected_count=8 where id=$1', [uuid(1)]),
        () => assert.rejects(capture(), /run_ledger_count_mismatch/));
      await assert.rejects(readPricingCompletionSourceSnapshotV1(reader, { now: Date.now(), expectedRunId: uuid(1), maxRows: 5 }), /row_limit/);
    });

    const final = await capture();
    assert.equal(final.masterExport.summary.freshPriced, 1);
    t.diagnostic(JSON.stringify({ proofScope: 'minimal typed SQL fixture plus unmodified application RPC; not full-schema/migration/production proof',
      rpcDefinitionSha256: createHash('sha256').update(rpc).digest('hex'),
      fixtureSha256: createHash('sha256').update(fixture).digest('hex'),
      postgresVersion: (await admin.query('show server_version')).rows[0].server_version,
      sourceLanes: final.receipt.laneCounts, masterSummary: final.masterExport.summary,
      directReadTables: directTables, namedRoleSelectPolicies: directTables.length,
      editionBranch: 'conservative false fixture dependency; not qualified', fixturesPreserved: true }));
  } finally {
    if (readerConnected) await reader.end();
    await admin.end();
  }
});
