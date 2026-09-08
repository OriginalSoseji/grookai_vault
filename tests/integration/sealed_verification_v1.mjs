// Captures reproducible evidence. Production is never a write target.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const replay = 'C:/grookai_vault_sealed_schema_reconcile';
const phase = process.argv[2];
assert.ok(['checks', 'fixtures', 'replay', 'android'].includes(phase), 'Use checks, fixtures, replay, or android');
const out = path.resolve('C:/grookai_vault_operator_artifacts/sealed_ownership',
  `${new Date().toISOString().replaceAll(/[:.]/g, '-')}_${phase}`);
await fs.mkdir(out, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const tracked = execFileSync('git', ['ls-files', '-m', '-o', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
const files = {};
for (const name of tracked) files[name] = sha(await fs.readFile(path.join(root, name)));
const report = { phase, base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  working_tree_hashes: files, production_writes: false, isolated_database_port: 55430, steps: [] };
await fs.writeFile(path.join(out, 'run_plan.json'), JSON.stringify(report, null, 2));
async function run(name, command, args, cwd = root) {
  const started = Date.now();
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
    child.stdout.on('data', b => chunks.push(b)); child.stderr.on('data', b => chunks.push(b));
    child.on('error', reject); child.on('exit', resolve);
  });
  const log = Buffer.concat(chunks);
  await fs.writeFile(path.join(out, `${name}.log`), log);
  report.steps.push({ name, exit_code: code, seconds: (Date.now() - started) / 1000, log_sha256: sha(log) });
  await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.steps.at(-1)));
  if (code !== 0) throw new Error(`${name} failed. See ${out}/${name}.log`);
}
console.log(JSON.stringify({ artifact_directory: out, phase }));
if (phase === 'android') {
  const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { cwd: replay, encoding: 'utf8' }));
  assert.equal(status.API_URL, 'http://127.0.0.1:55429');
  const defines = path.join(out, 'local-public-defines.json');
  await fs.writeFile(defines, JSON.stringify({ SUPABASE_URL: 'http://10.0.2.2:55429',
    SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY, SEALED_OWNERSHIP_V1_ENABLED: 'true',
    MTG_SEALED_CLIENT_V1_ENABLED: 'true', POKEMON_SEALED_CLIENT_V1_ENABLED: 'true' }));
  try {
    await run('android_debug_compile', 'pwsh', ['-NoProfile', '-Command',
      `& C:/src/flutter/bin/flutter.bat build apk --debug --no-pub --target-platform android-x64 --dart-define-from-file='${defines.replaceAll("'", "''")}'; exit $LASTEXITCODE`]);
    const apk = path.join(root, 'build/app/outputs/flutter-apk/app-debug.apk');
    report.apk = { path: apk, sha256: sha(await fs.readFile(apk)), environment: 'isolated_android_emulator_only', installed: false };
  } finally { await fs.unlink(defines); }
} else if (phase === 'fixtures') {
  await run('sql_concurrency', process.execPath, ['tests/integration/sealed_owned_instances_v1.mjs', '--concurrency']);
  await run('auth_storage', process.execPath, ['tests/integration/sealed_local_media_v1.mjs']);
} else if (phase === 'replay') {
  const config = await fs.readFile(path.join(replay, 'supabase/config.toml'), 'utf8');
  assert.match(config, /project_id\s*=\s*"sealed-ownership-replay-20260907"/);
  assert.match(config, /port\s*=\s*55430/);
  await run('strict_pre_push_full_replay', 'pwsh', ['-NoProfile', '-File', 'scripts/migration_preflight_strict.ps1',
    '-Phase', 'PrePush', '-ExpectedLocalOnlyIds', '20260905120000,20260907160000,20260907180000,20260907183000'], replay);
  await run('post_replay_sql_rollback', process.execPath, ['tests/integration/sealed_owned_instances_v1.mjs']);
} else {
  await run('contracts', process.execPath, ['--test',
    'tests/contracts/owned_collectible_contract_v1.test.mjs',
    'tests/contracts/production_function_source_reconciliation_v1.test.mjs',
    'tests/contracts/schema_column_order_engine_v1.test.mjs',
    'tests/contracts/schema_column_order_reconciliation_v1.test.mjs',
    'tests/contracts/migration_preflight_empty_pending_v1.test.mjs']);
  await run('flutter_tests', 'pwsh', ['-NoProfile', '-Command', '& C:/src/flutter/bin/flutter.bat test --no-pub test/owned_sealed_service_v1_test.dart test/owned_sealed_lot_v1_test.dart test/vault_exact_pricing_test.dart test/mtg_sealed_client_v1_test.dart test/grookai_objects/lot_pricing_screen_test.dart test/grookai_objects/lot_card_widgets_test.dart; exit $LASTEXITCODE']);
  await run('flutter_analyze', 'pwsh', ['-NoProfile', '-Command', '& C:/src/flutter/bin/flutter.bat analyze --no-pub lib/main_vault.dart lib/services/sealed lib/widgets/vault/owned_sealed_panel.dart lib/widgets/vault/sealed_copy_details_dialog.dart lib/screens/gvvi/sealed_copy_view.dart lib/models/grookai_sale_listing.dart lib/widgets/grookai_objects/lot_card_widgets.dart lib/screens/grookai_objects/lot_pricing_screen.dart; exit $LASTEXITCODE']);
  const web = path.join(root, 'apps/web');
  await run('web_tests', process.execPath, ['--experimental-strip-types', '--test', 'src/lib/sealed/ownedSealedV1.test.ts', 'src/lib/sealed/mtgSealedClientV1.test.ts'], web);
  await run('web_types', process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], web);
  await run('web_lint', process.execPath, ['node_modules/eslint/bin/eslint.js', 'src/components/vault/OwnedSealedPanel.tsx',
    'src/components/vault/SealedCopyDetails.tsx', 'src/components/vault/SealedCopyLanding.tsx',
    'src/components/vault/SealedLotDialog.tsx', 'src/lib/sealed/ownedSealedV1.ts', '--max-warnings=0'], web);
  await run('diff_check', 'git', ['diff', '--check']);
}
report.status = 'passed';
await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: 'passed', artifact_directory: out }));
