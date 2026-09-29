import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { assertMarketSchedulerSessionUrlV1, marketSessionConnectionStringV1, startMarketSchedulerHeartbeatV1 } from '../../backend/pricing/market_scheduler_session_v1.mjs';

test('persistent pricing sessions preserve project and TLS options while selecting session pooling', () => {
  const input = 'postgresql://postgres.test:fixture%40password@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=verify-full';
  const expected = input.replace(':6543/', ':5432/');
  assert.equal(marketSessionConnectionStringV1(input), expected);
  assert.throws(() => assertMarketSchedulerSessionUrlV1(input), /session pooler/);
  assert.throws(() => marketSessionConnectionStringV1('postgres://postgres:fixture@db.test.supabase.co:6543/postgres'), /session pooler/);
  const local = 'postgres://postgres:postgres@127.0.0.1:54330/postgres';
  assert.equal(marketSessionConnectionStringV1(local), local);
  assertMarketSchedulerSessionUrlV1(expected);
});

test('heartbeat does not overlap queries and drains before lock release', async () => {
  let active = 0, maximum = 0, calls = 0;
  const lost = [];
  const client = { query: async () => {
    active++; maximum = Math.max(maximum, active); calls++;
    await delay(20); active--;
    return { rows: [{ backend_pid: 123 }] };
  } };
  const stop = startMarketSchedulerHeartbeatV1(client, 123, e => lost.push(e), 5);
  await delay(55); await stop();
  const completed = calls;
  await delay(25);
  assert.equal(maximum, 1); assert.equal(active, 0);
  assert.ok(completed >= 1); assert.equal(calls, completed); assert.deepEqual(lost, []);
});

test('a changed backend or failed heartbeat revokes execution authority once', async () => {
  for (const failure of ['changed', 'connection']) {
    const lost = [];
    const client = { query: async () => {
      if (failure === 'connection') throw new Error('connection lost');
      return { rows: [{ backend_pid: 456 }] };
    } };
    const stop = startMarketSchedulerHeartbeatV1(client, 123, e => lost.push(e), 5);
    await delay(30); await stop();
    assert.equal(lost.length, 1);
    assert.match(lost[0].message, /changed|connection lost/);
  }
});
