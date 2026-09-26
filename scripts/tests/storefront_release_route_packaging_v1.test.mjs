import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..');
test('source release inventory includes every storefront API route',()=>{
  const included=new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','apps/web/src/app/api'],{cwd:root,encoding:'utf8'}).split('\0'));
  for(const group of ['stores','vendor-billing','vendor-orders','vendor-payments','vendor-preview']){
    const folder='apps/web/src/app/api/'+group;
    const routes=fs.readdirSync(path.join(root,folder),{recursive:true}).filter(p=>p.endsWith('route.ts'));
    assert.ok(routes.length);
    for(const route of routes)assert.ok(included.has(folder+'/'+route.replaceAll(path.sep,'/')),'API route excluded from release: '+route);
  }
});
