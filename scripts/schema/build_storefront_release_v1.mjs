// Reproducible packaging of three unapplied migrations. No database operations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url));
const audit=path.join(root,'docs/audits/vendor_storefront_release_package_v1');
const binding=JSON.parse(fs.readFileSync(path.join(audit,'consolidation.json')));
const inputs=binding.inputs.map(({name,sha256})=>{
  const bytes=fs.readFileSync(path.join(audit,'historical_migrations',name));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256);return bytes.toString().replaceAll('\r\n','\n');
});
const pattern=name=>new RegExp(`create(?: or replace)? function public\\.${name}\\b[\\s\\S]*?\\$\\$;`,'i');
const extract=(source,name)=>{const match=source.match(pattern(name));assert.ok(match,`missing ${name}`);return match[0].replace(/^create or replace /i,'create ');};
const publish=extract(inputs[1],'vendor_store_publish_v1');
const mutate=extract(inputs[2],'vendor_store_custom_mutate_v1');
// Callback replacements preserve SQL $$ literally; string replacements would collapse it.
inputs[0]=inputs[0].replace(pattern('vendor_store_publish_v1'),()=>publish);
inputs[1]=inputs[1].replace(pattern('vendor_store_publish_v1'),'').replace(pattern('vendor_store_custom_mutate_v1'),()=>mutate);
const unwrap=s=>s.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'').trim();
const result=`-- Consolidated unapplied storefront release. Historical inputs and binding are
-- retained in docs/audits/vendor_storefront_release_package_v1/.
-- Final function behavior and grants are preserved; no duplicate definitions.
begin;
${unwrap(inputs[0])}

${unwrap(inputs[1])}
commit;
`;
const target=path.join(root,'supabase/migrations',binding.output.name);
assert.ok(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--write'));
if(process.argv[2]==='--write')fs.writeFileSync(target,result);
else assert.equal(fs.readFileSync(target,'utf8').replaceAll('\r\n','\n'),result,'release does not match reproducible consolidation');
console.log(JSON.stringify({status:'passed',sha256:createHash('sha256').update(fs.readFileSync(target)).digest('hex')}));
