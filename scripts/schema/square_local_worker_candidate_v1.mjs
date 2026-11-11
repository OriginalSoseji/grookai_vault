// Apply exactly one candidate ONLY to this task's new unlinked disposable lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
const source = 'C:/grookai_square_sync_20261110';
const lab = 'C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
const project = 'square-fresh-483-20261110';
const candidate = '20261111060000_square_catalog_worker_runs_v1.sql';
const sha = data => createHash('sha256').update(data).digest('hex');
const read = name => JSON.parse(fs.readFileSync(lab + '/' + name));
const phase = process.argv[2]; assert.ok(['apply', 'verify'].includes(phase));
const docker = (...args) => execFileSync('docker', args, {encoding: 'utf8', timeout: 120000, maxBuffer: 32_000_000, windowsHide: true});
assert.equal(fs.existsSync(lab + '/supabase/.temp/project-ref'), false);
const freeze = read('freeze.json'), replay = read('replay-result.json');
assert.equal(replay.pass, true); assert.equal(replay.migrations, 483); assert.equal(replay.cliPrefixResetSucceeded, true);
assert.equal(sha(fs.readFileSync(lab + '/supabase/config.toml')), freeze.configSha256);
const database = JSON.parse(docker('inspect', 'supabase_db_' + project))[0];
assert.equal(database.State.Running, true); assert.deepEqual(Object.keys(database.NetworkSettings.Networks), [project]);
assert.equal(JSON.parse(docker('network', 'inspect', project))[0].Internal, true);
const sql = input => execFileSync('docker', ['exec', '-i', 'supabase_db_' + project, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
  {input, encoding: 'utf8', timeout: 120000, maxBuffer: 32_000_000, windowsHide: true});
const versions = Object.keys(freeze.sources).map(name => name.match(/^\d+/)[0]).sort().concat('20261111051000');
assert.equal(versions.length, 484);
for (const prefix of [source, lab]) assert.equal(sha(fs.readFileSync(prefix+'/supabase/migrations/20261111051000_square_catalog_sync_v1.sql')), '3e6103471137049e5bb74634ea1e93f425a1e64994f17ca60513b1953287171b');
for (const [name, pin] of Object.entries(freeze.sources)) {
  assert.equal(sha(fs.readFileSync(source + '/supabase/migrations/' + name)), pin);
  assert.equal(sha(fs.readFileSync(lab + '/supabase/migrations/' + name)), pin);
}
const bytes = fs.readFileSync(source + '/supabase/migrations/' + candidate);
const state = () => JSON.parse(sql("begin read only;select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'workers',current_setting('max_worker_processes'),'ledger',(select json_agg(version order by version) from supabase_migrations.schema_migrations));rollback;"));
function verify() {
  const current = state(); assert.equal(current.workers, '0');
  assert.deepEqual(current.ledger, [...versions, candidate.match(/^\d+/)[0]]);
  assert.equal(sql('begin read only;select linking_enabled::text||\':\'||catalog_enabled::text||\':\'||cardinality(owner_allowlist)::text from grookai_square.controls where singleton;rollback;').trim(), 'false:false:0');
  assert.equal(sha(fs.readFileSync(lab + '/supabase/migrations/' + candidate)), sha(bytes));
  return current;
}
if (phase === 'apply') {
  assert.equal(fs.existsSync(lab + '/worker-candidate-intent.json'), false, 'Never repeat a consumed candidate apply');
  assert.deepEqual(state(), {users: 0, cards: 1294, copies: 0, workers: '0', ledger: versions});
  fs.copyFileSync(source + '/supabase/migrations/' + candidate, lab + '/supabase/migrations/' + candidate, fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(lab + '/worker-candidate-intent.json', JSON.stringify({candidate, sha256: sha(bytes), at: new Date().toISOString(), consumed: true, productionWrites: 0}), {flag: 'wx'});
  const env = {...process.env, DO_NOT_TRACK: '1'};
  for (const key of Object.keys(env)) if (/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key)) delete env[key];
  const cli = label => {
    const fd = fs.openSync(lab + '/' + label + '.log', 'wx'); let result;
    try {result = spawnSync('supabase', ['db', 'push', '--local', '--yes', '--workdir', lab, '--network-id', project],
      {env, cwd: lab, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 180000});}
    finally {fs.closeSync(fd);}
    assert.ifError(result.error); assert.equal(result.status, 0, 'Candidate failed; inspect retained log, do not retry/reset');
  };
  try {
    cli('worker-candidate-apply'); const after = verify(); cli('worker-candidate-noop');
    fs.writeFileSync(lab + '/worker-candidate-result.json', JSON.stringify({pass: true, candidate, sha256: sha(bytes), after, noOpPassed: true,
      genuine483ReplayPreserved: true, productionWrites: 0}, null, 2), {flag: 'wx'});
  } catch (error) {
    fs.writeFileSync(lab + '/worker-candidate-failure.json', JSON.stringify({status: 'failed', code: error.code ?? error.name, productionWrites: 0}), {flag: 'wx'});
    throw error;
  }
} else {assert.equal(read('worker-candidate-result.json').pass, true); verify();}
console.log(JSON.stringify({phase, pass: true, migrations: 485, productionWrites: 0}));
