import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  operationsAgentScheduleHealthRelease as release,
  validateOperationsAgentScheduleHealthArguments,
  verifyOperationsAgentScheduleHealthSources,
} from '../../scripts/schema/verify_operations_agent_schedule_health_v1.mjs';

for (const phase of ['AuditLinkedSchema', 'PrePush']) {
  test(`schedule-health release accepts ${phase} with explicit evidence paths`, () => {
    assert.equal(validateOperationsAgentScheduleHealthArguments([
      phase, '--env-file=C:/private.env', '--out-dir=C:/new-output',
    ]).phase, phase);
  });
}

for (const args of [
  [],
  ['PrePush'],
  ['apply', '--env-file=C:/private.env', '--out-dir=C:/new-output'],
  ['PrePush', '--env-file=C:/private.env', '--target=other'],
]) {
  test(`schedule-health release rejects unbounded arguments ${JSON.stringify(args)}`, () => {
    assert.throws(() => validateOperationsAgentScheduleHealthArguments(args));
  });
}

test('schedule-health source inventory requires a unique newest candidate', () => {
  const synthetic = Array.from({ length: release.sourceMigrationCount - 1 }, (_, i) =>
    `${String(20000101000000 + i).padStart(14, '0')}_synthetic.sql`);
  assert.equal(verifyOperationsAgentScheduleHealthSources([...synthetic, release.migration]).at(-1), '20261016150000');
  assert.throws(() => verifyOperationsAgentScheduleHealthSources(synthetic));
  assert.throws(() => verifyOperationsAgentScheduleHealthSources([...synthetic, '20261016160000_other.sql']));
  const duplicate = [...synthetic, release.migration];
  duplicate[0] = `20261016150000_duplicate.sql`;
  assert.throws(() => verifyOperationsAgentScheduleHealthSources(duplicate));
});

test('schedule-health candidate remains fingerprint-bound', () => {
  const source = fs.readFileSync(`supabase/migrations/${release.migration}`);
  assert.equal(createHash('sha256').update(source).digest('hex'), release.migrationSha256);
});

for (const args of [
  ['-Phase', 'PrePush', '-OperationsAgentScheduleHealthV1'],
  ['-Phase', 'PrePush', '-OperationsAgentScheduleHealthV1', '-ExpectedLocalOnlyIds', '20261016160000', '-AuditEnvFile', 'C:/private.env', '-AuditOutDir', 'C:/new-output'],
  ['-Phase', 'AuditLinkedSchema', '-OperationsAgentScheduleHealthV1', '-ExpectedLocalOnlyIds', '20261016150000', '-AuditEnvFile', 'C:/private.env', '-AuditOutDir', 'C:/new-output', '-ReconciledReplayAudit'],
]) {
  test(`PowerShell schedule-health gate rejects invalid scope before database access: ${args.join(' ')}`, () => {
    const result = spawnSync('pwsh', ['-NoProfile', '-File', 'scripts/migration_preflight_strict.ps1', ...args], {
      encoding: 'utf8', timeout: 20000, windowsHide: true,
    });
    assert.notEqual(result.status, 0);
    assert.match((result.stdout ?? '') + (result.stderr ?? ''), /Operations agent schedule health permits only/);
    assert.doesNotMatch(result.stdout ?? '', /productionMigrations|Connecting to remote|supabase migration list/);
  });
}
