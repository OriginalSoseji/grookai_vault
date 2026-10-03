import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const script = 'scripts/proofs/pokemon_classic_dependency_replay_v1.mjs';
function rejected(database, route, pattern) {
  const child = spawnSync(process.execPath, [script, 'unused-private-state', database, 'unused-output'], {
    encoding: 'utf8', env: { ...process.env, DISCOVERY_INTAKE_PROOF_URL: route }, timeout: 10000,
  });
  assert.notEqual(child.status, 0);
  assert.match(child.stderr, pattern);
}
test('Classic dependency replay rejects production hosts before filesystem or database access', () => {
  rejected('grookai_classic_canonical_proof_deps_test', 'postgres://unused@db.ycdxbpibncqcchqiihfz.supabase.co/postgres', /loopback_proof_route_required/);
});
test('Classic dependency replay cannot target an existing general application database', () => {
  rejected('postgres', 'postgres://unused@127.0.0.1/postgres', /scoped_proof_database_required/);
});
test('Classic dependency replay rejects silently truncated PostgreSQL identifiers', () => {
  rejected('grookai_classic_canonical_proof_deps_' + 'a'.repeat(40), 'postgres://unused@127.0.0.1/postgres', /database_identifier_too_long/);
});
test('Classic dependency replay requires the local administrative route', () => {
  rejected('grookai_classic_canonical_proof_deps_test', 'postgres://unused@127.0.0.1/existing_lab', /local_admin_database_required/);
});
