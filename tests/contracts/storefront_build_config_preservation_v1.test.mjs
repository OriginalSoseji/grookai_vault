import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {captureStorefrontBuildConfig} from '../../scripts/ci/preserve_storefront_build_config.mjs';

const env={NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_STAGING:'true',GROOKAI_DISABLE_TELEMETRY:'1'};
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grookai-build-config-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const declaration='/// <reference types="next" />\r\nimport "./.next/types/routes.d.ts";\r\n';
  const config={compilerOptions:{strict:true},include:['next-env.d.ts','.next/types/**/*.ts']};
  fs.writeFileSync(path.join(dir,'next-env.d.ts'),declaration);
  fs.writeFileSync(path.join(dir,'tsconfig.json'),JSON.stringify(config,null,2)+'\r\n');
  const originals=['next-env.d.ts','tsconfig.json'].map(n=>fs.readFileSync(path.join(dir,n)));
  return {dir,config,declaration,originals};
}
function generate(f){
  fs.writeFileSync(path.join(f.dir,'next-env.d.ts'),f.declaration.replaceAll('.next/types/','.next-storefront/types/').replaceAll('\r\n','\n'));
  fs.writeFileSync(path.join(f.dir,'tsconfig.json'),JSON.stringify({...f.config,include:[...f.config.include,'.next-storefront/types/**/*.ts','.next-storefront/dev/types/**/*.ts']}));
}
test('local build restores only known generated changes byte-for-byte',t=>{
  const f=fixture(t); const restore=captureStorefrontBuildConfig(f.dir,env); generate(f); restore();
  ['next-env.d.ts','tsconfig.json'].forEach((n,i)=>assert.deepEqual(fs.readFileSync(path.join(f.dir,n)),f.originals[i]));
});
test('an unchanged failed build preserves existing source bytes',t=>{
  const f=fixture(t); captureStorefrontBuildConfig(f.dir,env)();
  ['next-env.d.ts','tsconfig.json'].forEach((n,i)=>assert.deepEqual(fs.readFileSync(path.join(f.dir,n)),f.originals[i]));
});
test('unexpected concurrent config edit fails without restoring either file',t=>{
  const f=fixture(t); const restore=captureStorefrontBuildConfig(f.dir,env); generate(f);
  const target=path.join(f.dir,'tsconfig.json'); const changed=JSON.parse(fs.readFileSync(target));changed.compilerOptions.strict=false;fs.writeFileSync(target,JSON.stringify(changed));
  const bytes=['next-env.d.ts','tsconfig.json'].map(n=>fs.readFileSync(path.join(f.dir,n)));
  assert.throws(restore,/Unexpected tsconfig/);
  ['next-env.d.ts','tsconfig.json'].forEach((n,i)=>assert.deepEqual(fs.readFileSync(path.join(f.dir,n)),bytes[i]));
});
test('unexpected declaration edit is preserved',t=>{
  const f=fixture(t); const restore=captureStorefrontBuildConfig(f.dir,env);
  fs.appendFileSync(path.join(f.dir,'next-env.d.ts'),'// concurrent change\n');
  assert.throws(restore,/Unexpected next-env/);
  assert.match(fs.readFileSync(path.join(f.dir,'next-env.d.ts'),'utf8'),/concurrent change/);
});
test('production and ordinary builds do not restore source files',t=>{
  const f=fixture(t);const restore=captureStorefrontBuildConfig(f.dir,{VERCEL:'1'});generate(f);restore();
  assert.match(fs.readFileSync(path.join(f.dir,'next-env.d.ts'),'utf8'),/next-storefront/);
});
test('local restoration rejects production and incomplete local modes',t=>{
  const f=fixture(t);
  for(const changed of [{VERCEL:'1'},{VERCEL_ENV:'production'},{GROOKAI_DISABLE_TELEMETRY:'0'},{NEXT_PUBLIC_COLLECTOR_STAGING:'false'}]){
    assert.throws(()=>captureStorefrontBuildConfig(f.dir,{...env,...changed}));
  }
});
