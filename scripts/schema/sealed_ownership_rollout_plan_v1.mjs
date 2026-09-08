// Read-only plan generator. Applying migrations and activating ownership are separate gates.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = process.argv[2];
assert.ok(out, 'Provide an artifact output directory');
const sha = data => createHash('sha256').update(data).digest('hex');
const names = [
  '20260905120000_mtg_sealed_image_dimension_constraint_repair_v1.sql',
  '20260907160000_production_function_source_replay_reconciliation_v1.sql',
  '20260907180000_sealed_owned_instances_v1.sql',
  '20260907183000_sealed_owned_read_models_v1.sql',
];
const migrations = [];
for (const file of names) {
  const content = await fs.readFile(path.join(root, 'supabase/migrations', file));
  const committed = execFileSync('git', ['show', `HEAD:supabase/migrations/${file}`], { cwd: root });
  // Git may checkout CRLF. Authority is the exact committed SQL, with the disk hash explicit.
  assert.equal(content.toString().replaceAll('\r\n', '\n'), committed.toString().replaceAll('\r\n', '\n'), `${file} is not frozen`);
  migrations.push({ file, version: file.slice(0, 14), sha256: sha(committed), working_file_sha256: sha(content), bytes: committed.length });
}
const plan = { contract: 'SEALED_OWNED_COLLECTIBLES_V1', production_project: 'ycdxbpibncqcchqiihfz',
  execution_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  migrations, status: 'prepared_not_applied', default_enabled: false,
  writes_performed: false, authorization: 'Exact production migration authority is required before apply.',
  preflight: ['Fresh canonical environment sanity and full migration ledger parity',
    'Exact four pending IDs, exact committed file hashes, no unrelated pending migrations',
    'Existing baseline reconciliation plus exact new ownership schema footprint; no widened drift exception',
    'lock_timeout=5s; stop on lock contention; no forced termination of production sessions',
    'No standalone update/delete/cleanup and no catalog/pricing/release-pointer writes'],
  schema_scope: ['One existing sealed image-dimension constraint repair',
    '32 frozen function source line-ending reconciliations only',
    'Additive sealed ownership anchor/conditions, bound request journal and default-disabled add control',
    'Sealed lifecycle/read RPCs, indexes, grants and private media policies'],
  rollout: ['Apply exact frozen migrations under governed authority; verify ledger and object/grant readback',
    'Deploy both clients with ownership flags off; preserve all existing card/slab behavior',
    'Run bounded authorized owner canary with exact released Pokemon and MTG variants',
    'Prove add/retry, conditions, totals, Wall, sale/trade/cash, archive, media, history and cross-client readback',
    'Verify signed-in/anonymous/blocked/private roles and disabled-add rollback before activation',
    'Enable only after evidence reconciliation; monitor failures, duplicate copies and pricing coverage'],
  rollback: ['Disable server add control and both client entry flags',
    'Preserve owned copies, GVVIs, transaction history, uploads and read access',
    'Do not revert additive schema, delete user data or reassign canonical identities'],
  exclusions: ['Catalog ingestion or visibility changes', 'Pricing publication or release/image-pointer changes',
    'Unconsented counterparty transfers', 'Production fixture insertion', 'Physical device overwrite with local emulator build'],
};
const fingerprint = sha(JSON.stringify(plan));
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'run_plan.json'), JSON.stringify({ ...plan, plan_fingerprint: fingerprint }, null, 2));
console.log(JSON.stringify({ status: plan.status, execution_commit: plan.execution_commit, plan_fingerprint: fingerprint, migrations }));
