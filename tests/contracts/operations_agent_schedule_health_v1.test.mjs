import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(
  new URL('../../supabase/migrations/20261016150000_operations_agent_schedule_health_v1.sql', import.meta.url),
  'utf8',
);

test('periodic agents alone are eligible for heartbeat staleness', () => {
  assert.match(
    migration,
    /a\.schedule_kind in \('cron', 'timer', 'continuous'\)[\s\S]*a\.last_heartbeat_at < now\(\) - make_interval/,
  );
  assert.doesNotMatch(
    migration,
    /schedule_kind in \('event', 'manual'\)[\s\S]*then 'stale'/,
  );
});

test('maintenance recovers legacy stale incidents for idle event and manual agents', () => {
  assert.match(
    migration,
    /a\.schedule_kind in \('event', 'manual'\)/,
  );
  assert.match(
    migration,
    /Event and manual agents are healthy while idle; no periodic heartbeat is required\./,
  );
  assert.match(migration, /OPERATIONS_MAINTENANCE_V1_1/);
});
