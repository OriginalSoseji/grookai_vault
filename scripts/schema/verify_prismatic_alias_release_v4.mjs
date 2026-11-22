// Exact-source release qualification. All database operations in this file are reads.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const artifacts = 'C:/grookai_vault_operator_artifacts/prismatic_alias_discovery_20261116';
const [phase, argument, ...extra] = process.argv.slice(2);
assert.ok(['AuditLinkedSchema', 'PrePush'].includes(phase));
assert.equal(extra.length, 0);
assert.match(argument ?? '', /^--out-dir=/);
const output = argument.slice(10).replaceAll('\\', '/');
assert.equal(path.win32.dirname(output).replaceAll('\\', '/'), artifacts);
assert.match(path.win32.basename(output), /^release-gate-v4-[a-z0-9-]{1,60}$/);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const report = {
    version: 'PRISMATIC_ALIAS_RELEASE_V4',
    phase,
    startedAt: new Date().toISOString(),
    pass: false,
    productionWrites: 0,
};
execFileSync(process.execPath, [
    '--use-system-ca', path.join(root, 'scripts/schema/audit_prismatic_alias_baseline_v1.mjs'), argument,
], { cwd: root, stdio: 'inherit', timeout: 600000, windowsHide: true });
try {
    const baseline = read(output + '/qualification.json');
    assert.equal(baseline.status, 'passed');
    assert.equal(baseline.migrationCount, 496);
    assert.equal(baseline.remainingSqlBytes, 0);
    assert.equal(baseline.securityExact, true);
    const binding = read(root + '/scripts/schema/prismatic_alias_candidate_v4.json');
    assert.equal(binding.version, 'PRISMATIC_ALIAS_DISCOVERY_CANDIDATE_V4');
    assert.deepEqual(Object.keys(binding.candidates), ['20261117190000_prismatic_alias_discovery_v3.sql', '20261117200000_prismatic_identity_free_set_code_v4.sql']);
    if (phase === 'PrePush') {
        const manifest = read(artifacts + '/release-manifest-v4-r3.json');
        assert.equal(manifest.version, 'PRISMATIC_ALIAS_496_TO_498_V4');
        assert.equal(manifest.revision, binding.revision);
        assert.deepEqual(manifest.candidates, binding.candidates);
        assert.equal(git(['status', '--porcelain']), '', 'Release source must be committed and clean');
        assert.equal(manifest.sourceHead, git(['rev-parse', 'HEAD']));
        for (const [file, pin] of Object.entries(manifest.sourcePins)) {
            assert.equal(sha(fs.readFileSync(path.join(root, file))), pin, 'Release source changed at ' + file);
        }
        for (const [file, pin] of Object.entries(manifest.proofPins)) {
            const proofPath = path.join(artifacts, file);
            assert.equal(sha(fs.readFileSync(proofPath)), pin, 'Qualification receipt changed at ' + file);
            const proof = read(proofPath);
            assert.ok(proof.pass === true || proof.status === 'passed', 'Qualification failed at ' + file);
        }
        const commit = read(artifacts + '/' + manifest.normalCommitResult);
        assert.equal(commit.exitCode, 0);
        assert.equal(commit.hooksUnchanged, true);
        assert.equal(commit.head, manifest.sourceHead);
        assert.equal(commit.sourceTree, git(['rev-parse', 'HEAD^{tree}']));
        const localQualification = read(artifacts + '/local-qualification-v4-r3/qualification.json');
        assert.equal(localQualification.freshRetainedSchemaEqual, true);
        assert.equal(localQualification.existingSecurityUnchanged, true);
        assert.equal(localQualification.privateSchemaUnchanged, true);
        assert.deepEqual(localQualification.anonymousHttp, { sets: 1, cards: 194, legacyDirectReads: 180 });
        const catalogSQL = fs.readFileSync(root + '/scripts/schema/reviewed_intake_public_catalog_v1.sql', 'utf8');
        const securitySQL = fs.readFileSync(root + '/scripts/schema/vendor_pricing_security_snapshot_v1.sql', 'utf8');
        for (const lab of manifest.labs) {
            assert.equal(fs.existsSync(lab.path + '/supabase/.temp/project-ref'), false);
            for (const [file, pin] of Object.entries({ ...manifest.history, ...manifest.candidates }))
                assert.equal(sha(fs.readFileSync(lab.path + '/supabase/migrations/' + file)), pin);
            const container = JSON.parse(execFileSync('docker', ['inspect', 'supabase_db_' + lab.project], { encoding: 'utf8' }))[0];
            assert.equal(container.State.Running, true);
            assert.equal(container.Image, manifest.postgresImage);
            assert.deepEqual(Object.keys(container.NetworkSettings.Networks), [lab.project]);
            const network = JSON.parse(execFileSync('docker', ['network', 'inspect', lab.project], { encoding: 'utf8' }))[0];
            assert.equal(network.Internal, true);
            const query = sql => JSON.parse(execFileSync('docker', [
                'exec', '-i', 'supabase_db_' + lab.project,
                'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
            ], { input: sql, encoding: 'utf8', timeout: 180000, maxBuffer: 64000000, windowsHide: true }));
            const catalog = query(catalogSQL);
            assert.deepEqual(catalog.LEDGER.map(row => row.version), manifest.targetLedger);
            assert.equal(sha(JSON.stringify(query(securitySQL))), lab.securitySha256);
            const state = query('begin read only; select prismatic_fixture.fingerprints(); rollback;');
            assert.equal(sha(JSON.stringify(state)), lab.protectedStateSha256);
        }
        report.sourceHead = manifest.sourceHead;
        report.replayAndRuntimeProofsExact = true;
        report.normalManagedCommitPassed = true;
    }
    report.pass = true;
    report.migrationsBefore = 496;
    report.migrationsAfter = 498;
}
catch (error) {
    report.error = error.message;
    process.exitCode = 1;
}
finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(output + '/release-qualification.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(report));
}
