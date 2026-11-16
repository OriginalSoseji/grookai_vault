import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertAuditOnlyArgs,
  assertReadOnlySql,
  environmentFingerprint,
  withReadOnlyClient,
} from '../../scripts/audits/japanese_master_index_v4/read_only_guard_v1.mjs';
import {
  contentFingerprint,
  stableJson,
} from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';
import { provesConsistentReadOnlyBaseline } from '../../scripts/audits/japanese_master_index_v4/finalize_v1.mjs';

test('Japanese Master Index rejects every mutation-capable CLI flag', () => {
  for (const flag of [
    '--apply',
    '--write',
    '--mutate',
    '--insert',
    '--update',
    '--delete',
    '--migrate',
    '--upload',
    '--promote',
    '--quarantine',
  ]) {
    assert.throws(() => assertAuditOnlyArgs([flag]), /rejected mutation flag/);
  }

  assert.doesNotThrow(() => assertAuditOnlyArgs([
    '--output-root=.tmp/jpn',
    '--environment=local-read-only',
  ]));
});

test('Japanese Master Index SQL guard allows reads and rejects writes', () => {
  assert.doesNotThrow(() => assertReadOnlySql(`
    with cards as (
      select 'update is evidence text' as note
    )
    select * from cards
  `));
  assert.doesNotThrow(() => assertReadOnlySql('show transaction_read_only'));

  for (const sql of [
    'insert into public.example values (1)',
    'update public.example set value = 1',
    'delete from public.example',
    'create table public.example(id integer)',
    'select * into temporary example from public.source',
    'select * from public.example for update',
    'with changed as (delete from public.example returning *) select * from changed',
    'select nextval(\'public.example_seq\')',
    'select pg_advisory_lock(1)',
    'select 1; select 2',
  ]) {
    assert.throws(() => assertReadOnlySql(sql), /rejected/);
  }
});

test('read-only client proves session state and rolls back', async () => {
  const statements = [];
  const fakeClient = {
    async connect() {
      statements.push('CONNECT');
    },
    async query(sql) {
      statements.push(sql);
      if (sql === 'show transaction_read_only') {
        return { rows: [{ transaction_read_only: 'on' }] };
      }
      if (sql === 'show default_transaction_read_only') {
        return { rows: [{ default_transaction_read_only: 'on' }] };
      }
      if (sql === 'select 1 as value') return { rows: [{ value: 1 }] };
      return { rows: [] };
    },
    async end() {
      statements.push('END');
    },
  };

  const result = await withReadOnlyClient({
    connectionString: 'postgresql://reader:secret@localhost:5432/grookai',
    environmentLabel: 'contract-test',
    clientFactory: () => fakeClient,
  }, async (db, proof) => {
    assert.equal(proof.transaction_read_only, 'on');
    assert.equal(proof.default_transaction_read_only, 'on');
    assert.throws(
      () => db.query('update public.example set value = 1'),
      /rejected UPDATE SQL/,
    );
    return (await db.query('select 1 as value')).rows[0].value;
  });

  assert.equal(result, 1);
  assert.deepEqual(statements, [
    'CONNECT',
    'set default_transaction_read_only = on',
    'begin read only',
    'show transaction_read_only',
    'show default_transaction_read_only',
    'select 1 as value',
    'rollback',
    'END',
  ]);
});

test('consistent read proves isolation before exposing the client', async () => {
  for (const actualIsolation of ['repeatable read', 'read committed']) {
    const statements = [];
    const fakeClient = {
      async connect() {},
      async query(sql) {
        statements.push(sql);
        if (sql === 'show transaction_read_only') return { rows: [{ transaction_read_only: 'on' }] };
        if (sql === 'show default_transaction_read_only') return { rows: [{ default_transaction_read_only: 'on' }] };
        if (sql === 'show transaction_isolation') return { rows: [{ transaction_isolation: actualIsolation }] };
        return { rows: [] };
      },
      async end() { statements.push('END'); },
    };
    let called = false;
    const operation = withReadOnlyClient({
      connectionString: 'postgresql://reader:secret@localhost:5432/grookai',
      clientFactory: () => fakeClient,
      consistentSnapshot: true,
    }, async (_db, proof) => {
      called = true;
      assert.equal(proof.transaction_isolation, 'repeatable read');
    });
    if (actualIsolation === 'repeatable read') await operation;
    else await assert.rejects(operation, /could not prove repeatable-read isolation/);
    assert.equal(called, actualIsolation === 'repeatable read');
    assert.ok(statements.includes('begin isolation level repeatable read read only'));
    assert.deepEqual(statements.slice(-2), ['rollback', 'END']);
  }
});

test('finalization rejects incomplete or inconsistent baseline proof', () => {
  const proof = { guard_version: 'v1', transaction_read_only: 'on', default_transaction_read_only: 'on', transaction_isolation: 'repeatable read' };
  const boundary = { database_writes: false, storage_writes: false, pricing_writes: false, identity_writes: false, family_promotion_writes: false };
  assert.equal(provesConsistentReadOnlyBaseline(proof, boundary), true);
  assert.equal(provesConsistentReadOnlyBaseline({ ...proof, transaction_isolation: 'read committed' }, boundary), false);
  assert.equal(provesConsistentReadOnlyBaseline({ ...proof, transaction_isolation: undefined }, boundary), false);
  assert.equal(provesConsistentReadOnlyBaseline(proof, {}), false);
  assert.equal(provesConsistentReadOnlyBaseline(proof, { ...boundary, database_writes: true }), false);
});

test('environment fingerprint never contains credentials', () => {
  const fingerprint = environmentFingerprint(
    'postgresql://reader:super-secret@example.test:5432/grookai',
    'test',
  );
  const serialized = JSON.stringify(fingerprint);
  assert.doesNotMatch(serialized, /reader|super-secret/);
  assert.match(fingerprint.environment_key_sha256, /^[a-f0-9]{64}$/);
});

test('artifact content fingerprints are deterministic across object key order', () => {
  const left = {
    beta: [{ z: 2, a: 1 }],
    alpha: 'value',
    observed_at: new Date('2026-07-26T00:00:00.000Z'),
  };
  const right = {
    observed_at: new Date('2026-07-26T00:00:00.000Z'),
    alpha: 'value',
    beta: [{ a: 1, z: 2 }],
  };

  assert.equal(stableJson(left), stableJson(right));
  assert.equal(contentFingerprint(left), contentFingerprint(right));
  assert.match(stableJson(left), /2026-07-26T00:00:00\.000Z/);
});
