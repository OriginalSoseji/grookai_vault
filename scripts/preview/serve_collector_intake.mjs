import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../', import.meta.url));
assert.equal(execFileSync('git', ['branch','--show-current'], { cwd: root, encoding:'utf8' }).trim(), 'preview/collector-authenticated-20260910');
const local = JSON.parse(execFileSync('supabase', ['status','-o','json'], { cwd: root, encoding:'utf8', stdio:['ignore','pipe','pipe'] }));
assert.equal(local.API_URL, 'http://127.0.0.1:54321');
assert.match(execFileSync('docker', ['port','supabase_db_ycdxbpibncqcchqiihfz','5432'], { encoding:'utf8' }), /:54330/);
assert.equal(execFileSync('docker', ['ps','--filter','name=supabase_edge_runtime_ycdxbpibncqcchqiihfz','--format','{{.Names}}'], { encoding:'utf8' }).trim(), '', 'Do not replace another local Edge runtime');
const out = `C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910/intake-runtime-${Date.now()}`;
const files = ['warehouse-intake-v1/index.ts','warehouse-intake-v1/evidence.mjs','_shared/auth.ts','_shared/key_resolver.ts','_shared/cors.ts'];
const manifest = {};
for (const file of files) {
  const source = path.join(root, 'supabase/functions', file);
  const target = path.join(out,'supabase/functions',file);
  mkdirSync(path.dirname(target), { recursive:true });
  copyFileSync(source,target);
  manifest[file] = createHash('sha256').update(readFileSync(target)).digest('hex');
}
// A restricted runtime tree has one callable function, no workers, .env or linked project file.
writeFileSync(`${out}/supabase/config.toml`, `project_id = "ycdxbpibncqcchqiihfz"
[api]
port = 54321
[db]
port = 54330
shadow_port = 54331
major_version = 17
[db.migrations]
enabled = false
[db.seed]
enabled = false
[edge_runtime]
enabled = true
policy = "per_worker"
inspector_port = 8083
deno_version = 2
[functions.warehouse-intake-v1]
enabled = true
verify_jwt = false
`);
writeFileSync(`${out}/empty.env`, '# No external credentials. CLI supplies local runtime credentials.\n');
writeFileSync(`${out}/run_plan.json`, JSON.stringify({ branch:'preview/collector-authenticated-20260910', baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(), endpoint:local.API_URL, sourceHashes:manifest, authentication:'requireUser verifies token through local GoTrue; gateway JWT check disabled for current signing keys', productionWrites:false, schemaChanges:false, workers:false }, null, 2));
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/SUPABASE|DATABASE|POSTGRES|PGPASSWORD|OPENAI|ANTHROPIC|PSA|UPSTASH|VERCEL|BRIDGE_IMPORT|RESEND|SENDGRID|SENTRY|POSTHOG|AWS|S3_|TCGPLAYER|EBAY/i.test(key)) delete env[key];
}
console.log(JSON.stringify({ runtime:out, endpoint:local.API_URL }));
const child = spawn('supabase',['functions','serve','--env-file',`${out}/empty.env`], { cwd:out, env, stdio:'inherit', windowsHide:true });
child.on('error', error => { console.error(error.message); process.exitCode=1; });
child.on('exit', code => { process.exitCode=code ?? 1; });
