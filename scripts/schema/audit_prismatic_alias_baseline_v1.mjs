// Diagnostic only: reuse an immutable, genuine CLI replay and inspect it afresh.
// This is not a production apply command or a waiver of the default preflight.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { gzipSync, gunzipSync } from 'node:zlib';
import { reconcileKnownTableColumnOrderV1 } from './column_order_reconciliation_v1.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const artifactRoot = 'C:/grookai_vault_operator_artifacts/prismatic_alias_discovery_20261116';
const priorRoot = 'C:/grookai_vault_operator_artifacts/card_remove_repair_20261114';
const [argument, ...extra] = process.argv.slice(2);
assert.equal(extra.length, 0);
assert.match(argument ?? '', /^--out-dir=/);
const output = argument.slice(10).replaceAll('\\', '/');
assert.equal(path.win32.dirname(output).replaceAll('\\', '/'), artifactRoot);
assert.match(path.win32.basename(output), /^(baseline-|release-gate-v[34]-)[a-z0-9-]{1,60}$/);
assert.equal(fs.existsSync(output), false, 'Audit output is already consumed');
fs.mkdirSync(output, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse((fs.existsSync(file) ? fs.readFileSync(file) : gunzipSync(fs.readFileSync(file + '.gz'))).toString('utf8').replace(/^\uFEFF/, ''));
const save = (name, value) => {
    const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    fs.writeFileSync(path.join(output, name + (name.endsWith('.private.json') ? '.gz' : '')), name.endsWith('.private.json') ? gzipSync(bytes) : bytes, { flag: 'wx' });
};
const report = {
    version: 'PRISMATIC_ALIAS_BASELINE_AUDIT_V1',
    startedAt: new Date().toISOString(),
    target: 'REMOTE https://ycdxbpibncqcchqiihfz.supabase.co (read-only)',
    status: 'started',
    productionWrites: 0,
    localDatabaseWrites: 0,
    defaultPreflightWaived: false,
    applyAuthorized: false,
    privateSnapshotFormat: 'lossless_gzip_json',
    stage: 'validate_replay_provenance',
};
function docker(...args) {
    return execFileSync('docker', args, { encoding: 'utf8', timeout: 60000, maxBuffer: 64000000, windowsHide: true }).trim();
}
try {
    const manifestPath = `${priorRoot}/release-manifest-v3.json`;
    const manifest = read(manifestPath);
    assert.equal(manifest.version, 'SQUARE_VAULT_REMOVAL_495_TO_496_V1');
    const expected = { ...manifest.history, ...manifest.candidates };
    let files = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => /^\d+.*\.sql$/.test(name)).sort();
    const candidates = files.filter(name => !Object.hasOwn(expected, name));
    const v4BindingPath = path.join(root, 'scripts/schema/prismatic_alias_candidate_v4.json');
    const releaseBindingPath = fs.existsSync(v4BindingPath) ? v4BindingPath : path.join(root, 'scripts/schema/prismatic_alias_candidate_v3.json');
    if (fs.existsSync(releaseBindingPath)) {
        const binding = read(releaseBindingPath);
        const forwardRepair = binding.version === 'PRISMATIC_ALIAS_DISCOVERY_CANDIDATE_V4';
        assert.ok(forwardRepair || binding.version === 'PRISMATIC_ALIAS_DISCOVERY_CANDIDATE_V3');
        assert.equal(binding.baselineMigrations, 496);
        assert.equal(binding.targetMigrations, forwardRepair ? 498 : 497);
        assert.equal(binding.releaseQualificationRequired, true);
        const expectedCandidates = ['20261117190000_prismatic_alias_discovery_v3.sql'];
        if (forwardRepair) expectedCandidates.push('20261117200000_prismatic_identity_free_set_code_v4.sql');
        assert.deepEqual(candidates, expectedCandidates);
        assert.deepEqual(Object.keys(binding.candidates), candidates);
        for (const [file, pin] of Object.entries(binding.candidates)) {
            assert.equal(sha(fs.readFileSync(path.join(root, 'supabase/migrations', file))), pin);
        }
        for (const [file, pin] of Object.entries(binding.archivedDrafts)) {
            assert.ok(file.startsWith('supabase/migration_drafts/prismatic_alias_discovery_20261116/'));
            assert.equal(sha(gunzipSync(fs.readFileSync(path.join(root, file)))), pin);
        }
        report.excludedUnappliedCandidates = binding;
        files = files.filter(name => !Object.hasOwn(binding.candidates, name));
    }
    else {
        if (fs.existsSync(path.join(root, 'scripts/schema/prismatic_alias_candidate_v2.json'))) {
            assert.equal(candidates.length, 2, 'The V2 candidate pair must both be present');
        }
        if (candidates.length) {
            const v2Path = path.join(root, 'scripts/schema/prismatic_alias_candidate_v2.json');
            if (fs.existsSync(v2Path)) {
                const binding = read(v2Path);
                assert.equal(binding.version, 'PRISMATIC_ALIAS_DISCOVERY_CANDIDATE_V2');
                assert.equal(binding.baselineMigrations, 496);
                assert.equal(binding.productionApplyAvailable, false);
                assert.deepEqual(Object.keys(binding.candidates), ['20261117063000_prismatic_alias_discovery_v1.sql', '20261117064000_prismatic_alias_query_initplans_v2.sql']);
                assert.deepEqual(candidates, Object.keys(binding.candidates));
                for (const [file, pin] of Object.entries(binding.candidates))
                    assert.equal(sha(fs.readFileSync(path.join(root, 'supabase/migrations', file))), pin, 'Candidate source changed');
                report.excludedUnappliedCandidates = binding;
                files = files.filter(name => !Object.hasOwn(binding.candidates, name));
            }
            else {
                const binding = read(path.join(root, 'scripts/schema/prismatic_alias_candidate_v1.json'));
                assert.equal(binding.version, 'PRISMATIC_ALIAS_DISCOVERY_CANDIDATE_V1');
                assert.equal(binding.migration, '20261117063000_prismatic_alias_discovery_v1.sql');
                assert.equal(binding.baselineMigrations, 496);
                assert.equal(binding.productionApplyAvailable, false);
                assert.deepEqual(candidates, [binding.migration]);
                assert.equal(sha(fs.readFileSync(path.join(root, 'supabase/migrations', binding.migration))), binding.sha256, 'Candidate source changed');
                report.excludedUnappliedCandidate = binding;
                files = files.filter(name => name !== binding.migration);
            }
        }
    }
    assert.equal(files.length, 496);
    assert.deepEqual(files, Object.keys(expected).sort());
    const pins = Object.fromEntries(files.map(name => [name, sha(fs.readFileSync(path.join(root, 'supabase/migrations', name)))]));
    assert.deepEqual(pins, expected, 'Historical migration source changed');
    assert.equal(new Set(files.map(name => name.match(/^\d+/)[0])).size, 496);
    const expectedLedger = files.map(name => name.match(/^\d+/)[0]);
    const lab = manifest.fresh;
    assert.equal(lab.project, 'square-remove-fresh-v2-496-20261114');
    assert.equal(lab.path, `${priorRoot}/fresh-v2-496`);
    const proofName = 'fresh-v2-496/replay-proof.json';
    assert.equal(sha(fs.readFileSync(`${priorRoot}/${proofName}`)), manifest.proofPins[proofName]);
    const proof = read(`${priorRoot}/${proofName}`);
    assert.equal(proof.pass, true);
    assert.equal(proof.migrations, 496);
    assert.equal(proof.aliases, 647);
    assert.equal(proof.cliPrefixResetSucceeded, true);
    assert.equal(proof.zeroStateWithExplicitPrerequisite, true);
    assert.equal(proof.productionWrites, 0);
    const freeze = read(`${lab.path}/freeze.json`);
    assert.deepEqual(freeze.sources, expected);
    const seed = read(`${lab.path}/seed-intent.json`);
    assert.equal(seed.kind, 'synthetic historical data prerequisite only');
    assert.equal(seed.fixtureSha256, sha(fs.readFileSync(`${lab.path}/synthetic-prerequisite.sql`)));
    assert.equal(seed.migrationSha256, expected['20261012010000_card_print_identity_aliases_v1.sql']);
    assert.equal(seed.cards, 1294);
    assert.equal(seed.pairs, 647);
    assert.equal(fs.existsSync(`${lab.path}/supabase/.temp/project-ref`), false);
    assert.equal(fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim(), 'ycdxbpibncqcchqiihfz');
    assert.match(fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8'), /project_id\s*=\s*"ycdxbpibncqcchqiihfz"/);
    const pooler = new URL(fs.readFileSync(path.join(root, 'supabase/.temp/pooler-url'), 'utf8').trim());
    assert.ok(decodeURIComponent(pooler.username).includes('ycdxbpibncqcchqiihfz'));
    assert.ok(pooler.hostname.endsWith('.pooler.supabase.com'));
    const containerName = `supabase_db_${lab.project}`;
    const container = JSON.parse(docker('inspect', containerName))[0];
    assert.equal(container.State.Running, true);
    assert.equal(container.Image, manifest.postgresImage);
    assert.deepEqual(Object.keys(container.NetworkSettings.Networks), [lab.project]);
    assert.equal(JSON.parse(docker('network', 'inspect', lab.project))[0].Internal, true);
    const local = input => {
        assert.match(input, /^begin\b[^;]*\bread only;/i);
        return JSON.parse(execFileSync('docker', ['exec', '-i', containerName, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
            input, encoding: 'utf8', timeout: 180000, maxBuffer: 64000000, windowsHide: true,
        }).trim());
    };
    const remote = (file, name) => {
        assert.match(fs.readFileSync(file, 'utf8'), /^begin\b[^;]*\bread only;/i);
        const result = spawnSync('supabase', ['db', 'query', '--linked', '--file', file, '--output', 'json', '--workdir', root], {
            env: { ...process.env, PGSSLMODE: 'verify-full', PGSSLROOTCERT: 'C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem' },
            windowsHide: true, timeout: 180000, maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, 'Read-only remote query failed; inspect private command output');
        fs.writeFileSync(path.join(output, `${name}.private.json.gz`), gzipSync(result.stdout), { flag: 'wx' });
        return read(path.join(output, `${name}.private.json`)).rows[0].receipt;
    };
    const catalogFile = path.join(root, 'scripts/schema/reviewed_intake_public_catalog_v1.sql');
    const securityFile = path.join(root, 'scripts/schema/vendor_pricing_security_snapshot_v1.sql');
    const localState = local(`begin read only; select jsonb_build_object('users',(select count(*) from auth.users),'copies',(select count(*) from public.vault_item_instances),'cards',(select count(*) from public.card_prints),'aliases',(select count(*) from public.card_print_identity_aliases),'workers',current_setting('max_worker_processes')); rollback;`);
    // The genuine empty replay receipt above precedes its runtime tests. That
    // retained lab is now populated; inspect it, never reset it or demand that
    // the later test inventory be deleted to reproduce the original receipt.
    assert.equal(localState.cards, 1294);
    assert.equal(localState.aliases, 647);
    assert.equal(localState.workers, '0');
    report.stage = 'capture_fresh_schema_and_security';
    const baseline = local(fs.readFileSync(catalogFile, 'utf8'));
    const security = local(fs.readFileSync(securityFile, 'utf8'));
    save('replay-catalog.private.json', baseline);
    save('replay-security.private.json', security);
    const live = remote(catalogFile, 'production-catalog');
    const liveSecurity = remote(securityFile, 'production-security');
    assert.equal(live.read_only, 'on');
    assert.equal(liveSecurity.readOnly, 'on');
    assert.ok(live.sanity.cards >= 40000 && live.sanity.sets >= 150 && live.sanity.traits >= 5000);
    assert.deepEqual(live.LEDGER.map(row => row.version), expectedLedger);
    assert.deepEqual(baseline.LEDGER.map(row => row.version), expectedLedger);
    assert.deepEqual(security, liveSecurity, 'Schema security or function definitions differ');
    assert.equal(liveSecurity.privateExecutable, 0);
    report.stage = 'compare_all_product_schemas';
    const require = createRequire('C:/gv_intake_recovery_20261027/package.json');
    for (const name of ['schemainspect', 'migra', 'client'])
        assert.equal(require(`@pgkit/${name}/package.json`).version, '0.6.1');
    const { PostgreSQL } = require('@pgkit/schemainspect');
    const { Migration } = require('@pgkit/migra');
    const queries = Object.fromEntries(Object.entries(new PostgreSQL({}, '17.6')).filter(([key]) => key.endsWith('_QUERY')));
    assert.equal(Object.keys(queries).length, 15);
    async function inspect(snapshot, schema) {
        const queryMap = new Map(Object.entries(queries).map(([key, value]) => [value, snapshot[key]]));
        const model = await PostgreSQL.create({ oneFirst: async () => snapshot.server_version, any: async (query) => {
                assert.equal(query.values.length, 0);
                assert.ok(queryMap.has(query.sql));
                return queryMap.get(query.sql);
            } });
        model.one_schema(schema);
        for (const key of ['types', 'domains', 'materialized_views', 'composite_types'])
            model[key] = Object.fromEntries(Object.entries(model[key]).filter(([, value]) => value.schema === schema));
        return model;
    }
    const schemas = ['public', 'grookai_square', 'grookai_inventory', 'grookai_vendor_pricing'];
    const reconciliations = [];
    for (const schema of schemas) {
        const a = await inspect(baseline, schema);
        const b = await inspect(live, schema);
        if (schema === 'public')
            reconciliations.push(...reconcileKnownTableColumnOrderV1(a, b));
        const diff = await Migration.create(a, b, { schema });
        diff.set_safety(false); // Allow diagnostic SQL generation, never execution.
        diff.add_all_changes(true);
        fs.writeFileSync(path.join(output, `${schema}-NEVER-EXECUTE.sql`), diff.sql, { flag: 'wx' });
        assert.equal(diff.sql.trim(), '', `Schema differs: ${schema}`);
    }
    report.stage = 'verify_stable_readback';
    const afterSecurity = remote(securityFile, 'production-security-after');
    assert.deepEqual(afterSecurity, liveSecurity, 'Production schema changed during audit');
    assert.deepEqual(local(`begin read only; select jsonb_build_object('users',(select count(*) from auth.users),'copies',(select count(*) from public.vault_item_instances),'cards',(select count(*) from public.card_prints),'aliases',(select count(*) from public.card_print_identity_aliases),'workers',current_setting('max_worker_processes')); rollback;`), localState, 'Retained lab changed during read-only audit');
    const afterPins = Object.fromEntries(files.map(name => [name, sha(fs.readFileSync(path.join(root, 'supabase/migrations', name)))]));
    assert.deepEqual(afterPins, pins);
    save('provenance.json', { sourceHashes: pins, manifestSha256: sha(fs.readFileSync(manifestPath)), proofSha256: manifest.proofPins[proofName], syntheticPrerequisiteSha256: seed.fixtureSha256, replayProject: lab.project, engineVersion: '0.6.1', reconciliations });
    Object.assign(report, { status: 'passed', stage: 'complete', migrationCount: 496, historicalAliases: 647, schemas, remainingSqlBytes: 0, securityExact: true, localState, sanity: live.sanity });
}
catch (error) {
    report.status = 'failed';
    report.error = error.message;
    process.exitCode = 1;
}
finally {
    report.finishedAt = new Date().toISOString();
    save('qualification.json', report);
    console.log(JSON.stringify(report));
}
