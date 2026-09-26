import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {localSupabaseStatusSecret} from '../../scripts/lib/local_supabase_cli_status_v1.mjs';
const adapter=fs.readFileSync(new URL('../../scripts/lib/local_supabase_cli_status_v1.mjs',import.meta.url),'utf8');
const field=adapter.match(/const secret = status\.([A-Z_]+);/)[1];
const token=role=>'e30.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.synthetic';
test('CLI status adapter accepts only a local endpoint and an admin-role token',()=>{
  const status={API_URL:'http://127.0.0.1:29021',[field]:token('service_role')};
  assert.equal(localSupabaseStatusSecret(status),status[field]);
  for(const API_URL of ['https://example.com','https://127.0.0.1:29021','http://127.0.0.1:80','http://user:password@localhost:29021','http://localhost:29021?remote=1'])assert.throws(()=>localSupabaseStatusSecret({...status,API_URL}));
  for(const value of [undefined,'bad',token('anon'),token('authenticated')])assert.throws(()=>localSupabaseStatusSecret({...status,[field]:value}));
});
test('key guard exception permits only the CLI property in the dedicated adapter',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'store-cli-key-guard-'));
  try{
    execFileSync('git',['init','-q'],{cwd:dir});fs.mkdirSync(path.join(dir,'scripts/lib'),{recursive:true});
    fs.copyFileSync(new URL('../../scripts/guard_no_legacy_keys.ps1',import.meta.url),path.join(dir,'scripts/guard_no_legacy_keys.ps1'));
    const target=path.join(dir,'scripts/lib/local_supabase_cli_status_v1.mjs');fs.writeFileSync(target,adapter);
    execFileSync('git',['add','.'],{cwd:dir});
    const run=()=>spawnSync('pwsh',['-NoProfile','-File','scripts/guard_no_legacy_keys.ps1'],{cwd:dir,encoding:'utf8',timeout:20000,windowsHide:true});
    assert.equal(run().status,0);
    fs.writeFileSync(target,adapter.replace('status.'+field,'process.env.'+field));assert.equal(run().status,1);
    fs.writeFileSync(target,adapter);fs.writeFileSync(path.join(dir,'other.mjs'),adapter);execFileSync('git',['add','other.mjs'],{cwd:dir});assert.equal(run().status,1);
  }finally{
    assert.equal(path.dirname(fs.realpathSync(dir)),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('store-cli-key-guard-'));
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
