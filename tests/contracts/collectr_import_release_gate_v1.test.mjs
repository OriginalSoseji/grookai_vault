import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
for(const args of [[],['apply'],['PrePush','--apply']]){
  test(`Collectr verifier rejects unsupported arguments ${JSON.stringify(args)} before access`,()=>{
    const r=spawnSync(process.execPath,['scripts/schema/verify_collectr_import_release_v1.mjs',...args],{cwd:root,encoding:'utf8'});
    assert.notEqual(r.status,0);assert.match(r.stderr,/AssertionError/);
  });
}
for(const args of [[],['apply'],['dry-run','--apply']]){
  test(`Collectr package rejects unsupported arguments ${JSON.stringify(args)} before access`,()=>{
    const r=spawnSync(process.execPath,['scripts/release/prepare_collectr_import_v1.mjs',...args],{cwd:root,encoding:'utf8'});
    assert.notEqual(r.status,0);assert.match(r.stderr,/AssertionError/);
  });
}
