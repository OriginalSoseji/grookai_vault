import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname, basename} from 'node:path';
import {spawnSync} from 'node:child_process';

const writer = resolve('scripts/write_ios_xcode_secrets.rb');
const source = readFileSync(writer, 'utf8');
const ruby = spawnSync('ruby', ['--version'], {encoding:'utf8'}).status === 0;
test('iOS carries sealed gates through environment selection and encoded defines', () => {
  assert.match(source, /sealed_keys = %w\[MTG_SEALED_CLIENT_V1_ENABLED POKEMON_SEALED_CLIENT_V1_ENABLED SEALED_OWNERSHIP_V1_ENABLED\]/);
  assert.match(source, /optional_keys \+ binder_keys \+ sealed_keys/);
  assert.match(source, /encoded = .*binder_keys \+ sealed_keys/);
});

test('actual iOS config defaults off, respects overrides, rejects malformed gates and omits secrets', {skip: !ruby}, () => {
  const dir = mkdtempSync(join(tmpdir(), 'grookai-ios-flags-'));
  try {
    mkdirSync(join(dir,'ios','Flutter'), {recursive:true});
    mkdirSync(join(dir,'lib'));
    writeFileSync(join(dir,'lib','firebase_options.dart'), "static const FirebaseOptions ios = FirebaseOptions(\n  appId: 'fixture-ios',\n);\n");
    const env = {...process.env, SUPABASE_URL:'https://fixture.supabase.co', SUPABASE_PUBLISHABLE_KEY:'public-fixture', SUPABASE_SECRET_KEY:'must-not-package'};
    delete env.MTG_SEALED_CLIENT_V1_ENABLED;
    delete env.POKEMON_SEALED_CLIENT_V1_ENABLED;
    delete env.SEALED_OWNERSHIP_V1_ENABLED;
    const run = overrides => spawnSync('ruby',[writer],{cwd:dir,env:{...env,...overrides},encoding:'utf8'});
    const defines = () => readFileSync(join(dir,'ios','Flutter','ReleaseSecrets.xcconfig'),'utf8')
      .match(/^DART_DEFINES=(.*)$/m)[1].split(',').map(s=>Buffer.from(s,'base64').toString()).join('\n');
    assert.equal(run({}).status,0);
    assert.match(defines(),/MTG_SEALED_CLIENT_V1_ENABLED=false/);
    assert.match(defines(),/POKEMON_SEALED_CLIENT_V1_ENABLED=false/);
    assert.match(defines(),/SEALED_OWNERSHIP_V1_ENABLED=false/);
    writeFileSync(join(dir,'.env.local'),'MTG_SEALED_CLIENT_V1_ENABLED=true\nPOKEMON_SEALED_CLIENT_V1_ENABLED=false\n');
    assert.equal(run({POKEMON_SEALED_CLIENT_V1_ENABLED:'true'}).status,0);
    assert.match(defines(),/MTG_SEALED_CLIENT_V1_ENABLED=true/);
    assert.match(defines(),/POKEMON_SEALED_CLIENT_V1_ENABLED=true/);
    assert.equal(run({SEALED_OWNERSHIP_V1_ENABLED:'true'}).status,0);
    assert.match(defines(),/SEALED_OWNERSHIP_V1_ENABLED=true/);
    assert.equal(run({SEALED_OWNERSHIP_V1_ENABLED:'false'}).status,0);
    assert.match(defines(),/SEALED_OWNERSHIP_V1_ENABLED=false/);
    assert.notEqual(run({SEALED_OWNERSHIP_V1_ENABLED:'yes'}).status,0);
    assert.doesNotMatch(defines(),/must-not-package|SUPABASE_SECRET_KEY/);
    assert.equal(run({MTG_SEALED_CLIENT_V1_ENABLED:'false'}).status,0);
    assert.match(defines(),/MTG_SEALED_CLIENT_V1_ENABLED=false/);
    const invalid = run({POKEMON_SEALED_CLIENT_V1_ENABLED:'yes'});
    assert.notEqual(invalid.status,0);
    assert.match(invalid.stderr,/Invalid boolean release flag/);
  } finally {
    assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
    assert.ok(basename(dir).startsWith('grookai-ios-flags-'));
    rmSync(dir,{recursive:true,force:true});
  }
});

test('signed Android release explicitly carries the default-off ownership gate', () => {
  const workflow = readFileSync(resolve('.github/workflows/flutter-build-apk.yml'), 'utf8');
  assert.match(workflow, /--dart-define=SEALED_OWNERSHIP_V1_ENABLED="\$\{\{ vars\.SEALED_OWNERSHIP_V1_ENABLED \|\| 'false' \}\}"/);
});
