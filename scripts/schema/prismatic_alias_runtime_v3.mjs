// Unlinked, internal-network local qualification only; no production connection.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const artifacts = 'C:/grookai_vault_operator_artifacts/prismatic_alias_discovery_20261116';
const [profile, phase, attemptArg, ...extra] = process.argv.slice(2);
assert.equal(extra.length, 0);
assert.ok(['fresh', 'retained'].includes(profile));
assert.ok(['upgrade', 'resume-upgrade', 'test'].includes(phase));
assert.ok(attemptArg === undefined || (phase === 'test' && /^--attempt=[a-z0-9-]{1,32}$/.test(attemptArg)));
const attempt = attemptArg ? '-' + attemptArg.slice(10) : '';
const upgrading = phase !== 'test';
const project = profile === 'fresh' ? 'prismatic-atomic-fresh-20261117' : 'prismatic-atomic-ret-20261117';
const lab = artifacts + '/' + (profile === 'fresh' ? 'atomic-fresh-497' : 'atomic-retained-496');
const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const binding = read(root + '/scripts/schema/prismatic_alias_candidate_v3.json');
assert.equal(binding.version, 'PRISMATIC_ALIAS_DISCOVERY_CANDIDATE_V3');
const migration = '20261117190000_prismatic_alias_discovery_v3.sql';
const candidate = fs.readFileSync(root + '/supabase/migrations/' + migration, 'utf8');
for (const [name, pin] of Object.entries(binding.candidates))
    assert.equal(sha(fs.readFileSync(root + '/supabase/migrations/' + name)), pin);
binding.migration = migration;
binding.sha256 = binding.candidates[migration];
const receiptPath = lab + '/' + (phase === 'resume-upgrade' ? 'upgrade-proof-v3-retry.json' : phase === 'upgrade' ? 'upgrade-proof-v3.json' : 'runtime-proof-v3' + attempt + '.json');
assert.equal(fs.existsSync(receiptPath), false, 'Consumed proof output');
const report = { version: 'PRISMATIC_ALIAS_RUNTIME_V3', profile, phase, project, startedAt: new Date().toISOString(), status: 'started', stage: 'guard', productionWrites: 0, candidateSha256: binding.sha256, candidates: binding.candidates, fixtureSha256: sha(fs.readFileSync(root + '/scripts/schema/prismatic_alias_runtime_fixture_v1.sql')) };
const sql = input => execFileSync('docker', ['exec', '-i', 'supabase_db_' + project, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 64000000 }).trim();
const json = input => JSON.parse(sql(input).split('\n').at(-1));
const fingerprint = () => json('begin read only; select prismatic_fixture.fingerprints(); rollback;');
const security = () => json(fs.readFileSync(root + '/scripts/schema/vendor_pricing_security_snapshot_v1.sql', 'utf8'));
const guard = expected => {
    assert.equal(fs.existsSync(lab + '/supabase/.temp/project-ref'), false);
    assert.equal(read(lab + '/replay-proof.json').pass, true);
    const c = JSON.parse(execFileSync('docker', ['inspect', 'supabase_db_' + project], { encoding: 'utf8' }))[0];
    assert.equal(c.State.Running, true);
    assert.deepEqual(Object.keys(c.NetworkSettings.Networks), [project]);
    assert.equal(JSON.parse(execFileSync('docker', ['network', 'inspect', project], { encoding: 'utf8' }))[0].Internal, true);
    const s = json("begin read only; select jsonb_build_object('ledger',(select count(*) from supabase_migrations.schema_migrations),'cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'users',(select count(*) from auth.users),'workers',current_setting('max_worker_processes')); rollback;");
    assert.deepEqual(s, { ledger: expected, cards: 1308, copies: 3, users: 1, workers: '0' });
    return s;
};
function cli(args, label) {
    const env = { ...process.env, DO_NOT_TRACK: '1' };
    for (const key of Object.keys(env))
        if (/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))
            delete env[key];
    const fd = fs.openSync(lab + '/' + label + '.log', 'wx');
    let result;
    try {
        result = spawnSync('supabase', [...args, '--workdir', lab, '--network-id', project], { cwd: lab, env, windowsHide: true, timeout: 180000, stdio: ['ignore', fd, fd] });
    }
    finally {
        fs.closeSync(fd);
    }
    assert.ifError(result.error);
    assert.equal(result.status, 0, 'Local CLI operation failed: ' + label);
}
function roleRead(role, query, mutation = '') {
    assert.ok(['anon', 'authenticated'].includes(role));
    const claims = JSON.stringify({ role, ...(role === 'authenticated' ? { sub: '10000000-0000-0000-0000-000000000016' } : {}) });
    return json(`begin${mutation ? '' : ' read only'}; set local statement_timeout='60s'; ${mutation}
 set local role ${role}; select set_config('request.jwt.claims','${claims}',true);
 ${query}; rollback;`);
}
try {
    guard(upgrading ? 496 : 497);
    const before = fingerprint();
    if (upgrading) {
        report.stage = 'rollback_candidate';
        const priorSecurity = security();
        assert.equal(candidate.split('\nbegin;\n').length, 2);
        assert.equal(candidate.split('\ncommit;\n').length, 2);
        const body = candidate.replace('\nbegin;\n', '\n').replace('\ncommit;\n', '\n');
        sql('begin;\n' + body + '\nrollback;');
        assert.deepEqual(fingerprint(), before);
        assert.deepEqual(security(), priorSecurity);
        report.rollbackRestoredSchemaAndRows = true;
        report.stage = 'cli_forward_upgrade';
        if (phase === 'resume-upgrade')
            assert.equal(sha(fs.readFileSync(lab + '/supabase/migrations/' + binding.migration)), binding.sha256);
        else
            fs.copyFileSync(root + '/supabase/migrations/' + binding.migration, lab + '/supabase/migrations/' + binding.migration, fs.constants.COPYFILE_EXCL);
        cli(['db', 'push', '--local', '--yes'], 'upgrade-v3');
        guard(497);
        assert.deepEqual(fingerprint(), before, 'Base table changed during read-only definition migration');
        cli(['db', 'push', '--local', '--yes'], 'upgrade-v3-noop');
        report.protectedTables = Object.keys(before).length;
        report.protectedStateUnchanged = true;
        report.officialCliUpgrade = true;
        report.noopPush = true;
    }
    else {
        report.stage = 'reader_regressions';
        const checks = `select jsonb_build_object(
   'excluded',cardinality(public.get_prismatic_discovery_exclusions_v1()),
   'route',public.resolve_prismatic_discovery_set_code_v1(' SV08.5 ','pokemon'),
   'otherGameRoute',public.resolve_prismatic_discovery_set_code_v1('sv08.5','mtg'),
   'setReferences',(select jsonb_agg(code) from public.resolve_visible_set_references_v1('sv08.5','pokemon')),
   'catalog',(select jsonb_agg(jsonb_build_object('code',code,'count',card_count) order by code) from public.get_public_catalog_sets_v2('pokemon') where code in ('sv08.5','sv8pt5')),
   'rawLegacy',(select count(*) from public.card_prints where set_code='sv08.5'),
   'discoveredLegacy',(select count(*) from public.v_card_prints_discovery_v1 where set_code='sv08.5'),
   'discoveredCanonical',(select count(*) from public.v_card_prints_discovery_v1 where set_code='sv8pt5'),
   'unrelatedParents',(select count(*) from public.v_card_prints_discovery_v1 where set_code not in ('sv08.5','sv8pt5')),
   'aliases',(select count(*) from public.get_public_card_print_identity_aliases_v1(array(select id from public.card_prints where set_code='sv08.5'))),
   'legacyNormalSearch',(select count(*) from public.search_game_card_prints_v4('pokemon','LOCAL REPLAY sv08.5 180',null,null,null,'en',64,0) where set_code='sv08.5'),
   'canonicalNormalSearch',(select count(*) from public.search_game_card_prints_v4('pokemon','LOCAL REPLAY sv08.5 180',null,null,null,'en',64,0) where set_code='sv8pt5'),
   'legacyTypedSearch',(select count(*) from public.search_game_card_prints_v5('pokemon','sv08.5 LOCAL REPLAY sv08.5 180',null,null,null,'en',64,0) where set_code='sv8pt5'),
   'exactLegacyId',(select count(*) from public.search_game_card_prints_v5('pokemon',(select gv_id from public.card_prints where set_code='sv08.5' and number='180'),null,null,null,'en',64,0) where set_code='sv08.5'),
   'legacySearchRpc',(select count(*) from public.search_card_prints_v1(null,'sv08.5','180',50,0) where set_code='sv8pt5'),
   'identitySearchLegacy',(select count(*) from public.search_print_identity_v1(null,'sv08.5',null,null,512,0) where parent_gv_id in(select gv_id from public.card_prints where set_code='sv08.5')),
   'pagination',(select jsonb_build_object('rows',count(*),'unique',count(distinct id),'legacy',count(*) filter(where set_code='sv08.5'),'stamped',count(*) filter(where variant_key<>'')) from generate_series(0,200,40) page_offset cross join lateral public.search_game_card_prints_v5('pokemon',null,'sv08.5',null,null,'en',40,page_offset)),
   'rawLegacyFinishes',(select count(*) from public.card_printings p join public.card_prints c on c.id=p.card_print_id where c.set_code='sv08.5'),
   'rawCanonicalFinishes',(select count(*) from public.card_printings p join public.card_prints c on c.id=p.card_print_id where c.set_code='sv8pt5'),
   'discoveredLegacyFinishes',(select count(*) from public.v_card_printings_discovery_v1 p join public.card_prints c on c.id=p.card_print_id where c.set_code='sv08.5'),
   'discoveredCanonicalFinishes',(select count(*) from public.v_card_printings_discovery_v1 p join public.card_prints c on c.id=p.card_print_id where c.set_code='sv8pt5'),
   'searchCatalogLegacy',(select count(*) from jsonb_array_elements(public.get_search_set_catalog_v1('pokemon')->'sets') s where s->>'code'='sv08.5'),
   'searchCatalogCanonical',(select count(*) from jsonb_array_elements(public.get_search_set_catalog_v1('pokemon')->'sets') s where s->>'code'='sv8pt5')
  )`;
        const expected = { excluded: 180, route: 'sv8pt5', otherGameRoute: 'sv08.5', setReferences: ['sv8pt5'], catalog: [{ code: 'sv8pt5', count: 194 }], rawLegacy: 180, discoveredLegacy: 0, discoveredCanonical: 194, unrelatedParents: 934, aliases: 180, legacyNormalSearch: 0, canonicalNormalSearch: 1, legacyTypedSearch: 1, exactLegacyId: 1, legacySearchRpc: 1, identitySearchLegacy: 0, pagination: { rows: 194, unique: 194, legacy: 0, stamped: 14 }, rawLegacyFinishes: 3, rawCanonicalFinishes: 4, discoveredLegacyFinishes: 0, discoveredCanonicalFinishes: 4, searchCatalogLegacy: 0, searchCatalogCanonical: 1 };
        for (const role of ['anon', 'authenticated']) {
            const actual = roleRead(role, checks);
            assert.deepEqual(actual, expected, role + ' reader behavior');
            report[role] = actual;
            const negative = roleRead(role, `select jsonb_build_object('excluded',cardinality(public.get_prismatic_discovery_exclusions_v1()),'route',public.resolve_prismatic_discovery_set_code_v1('sv08.5'),'retained',(select count(*) from public.v_card_prints_discovery_v1 where set_code='sv08.5'))`, "update public.card_print_identity_aliases set active=false where legacy_set_code='sv08.5' and legacy_card_print_id=(select id from public.card_prints where set_code='sv08.5' and number='180');");
            assert.deepEqual(negative, { excluded: 179, route: 'sv08.5', retained: 1 });
            const hidden = roleRead(role, `select jsonb_build_object('excluded',cardinality(public.get_prismatic_discovery_exclusions_v1()),'route',public.resolve_prismatic_discovery_set_code_v1('sv08.5'),'legacy',(select count(*) from public.v_card_prints_discovery_v1 where set_code='sv08.5'),'canonical',(select count(*) from public.v_card_prints_discovery_v1 where set_code='sv8pt5'))`, "insert into public.catalog_set_release_controls(set_id,release_status,release_version) select id,'hidden','local_prismatic_fixture' from public.sets where code='sv8pt5' on conflict(set_id) do update set release_status='hidden';");
            assert.deepEqual(hidden, { excluded: 0, route: 'sv08.5', legacy: 180, canonical: 0 });
            const extra = roleRead(role, `select jsonb_build_object('excluded',cardinality(public.get_prismatic_discovery_exclusions_v1()),'route',public.resolve_prismatic_discovery_set_code_v1('sv08.5'),'retained',(select count(*) from public.v_card_prints_discovery_v1 where set_code='sv08.5'))`, "insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,identity_domain) select game_id,set_id,set_code,'LOCAL EXTRA UNALIASED','181','GV-PK-LOCAL-UNALIASED-181',identity_domain from public.card_prints where set_code='sv08.5' and number='180';");
            assert.deepEqual(extra, { excluded: 180, route: 'sv08.5', retained: 1 });
        }
        report.negativeCases = ['inactive_alias', 'hidden_canonical_set', 'additional_unaliased_parent'];
        const owned = roleRead('authenticated', "select jsonb_build_object('copies',count(*),'legacy',count(*) filter(where c.set_code='sv08.5')) from public.vault_item_instances v join public.card_prints c on c.id=v.card_print_id");
        assert.deepEqual(owned, { copies: 3, legacy: 3 });
        report.ownershipPreserved = owned;
        report.stage = 'idempotent_definition_replay';
        const priorSecurity = security();
        sql(candidate);
        assert.deepEqual(security(), priorSecurity);
        assert.deepEqual(fingerprint(), before);
        report.idempotentDefinitions = true;
        report.protectedTables = Object.keys(before).length;
        report.protectedStateUnchanged = true;
    }
    guard(497);
    report.status = 'passed';
    report.stage = 'complete';
}
catch (error) {
    report.status = 'failed';
    report.error = error.message;
    process.exitCode = 1;
}
finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(receiptPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(report));
}
