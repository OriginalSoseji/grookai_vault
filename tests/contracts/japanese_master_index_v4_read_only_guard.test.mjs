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
