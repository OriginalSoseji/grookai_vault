import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/collector_polish/cameo_full_replay_20260912';
const project='collector-cameo-replay-20260912';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(process.argv.length,2,'No remote target or reset option');
await fs.mkdir(out,{recursive:false});
await fs.mkdir(path.join(out,'supabase/migrations'),{recursive:true});
const source=path.join(root,'supabase/migrations');
const files=(await fs.readdir(source)).filter(n=>/^\d+.*\.sql$/.test(n)).sort();
assert.equal(files.length,394,'Unexpected migration set');
assert.equal(new Set(files.map(n=>n.match(/^\d+/)[0])).size,files.length);
const hashes={};
for(const name of files){
  const bytes=await fs.readFile(path.join(source,name));hashes[name]=hash(bytes);
  await fs.copyFile(path.join(source,name),path.join(out,'supabase/migrations',name));
  assert.equal(hash(await fs.readFile(path.join(out,'supabase/migrations',name))),hashes[name]);
}
const config=await fs.readFile(path.join(root,'supabase/config.toml'),'utf8');
assert.ok(config.includes('project_id = "ycdxbpibncqcchqiihfz"'));
// Mechanical fixture-only isolation; production and existing preview config stay untouched.
const isolated=config.replace('project_id = "ycdxbpibncqcchqiihfz"',`project_id = "${project}"`)
  .replaceAll('54321','56521').replaceAll('54330','56530').replaceAll('54331','56531')
  .replaceAll('54329','56529').replaceAll('54323','56523').replaceAll('54324','56524')
  .replaceAll('54327','56527').replaceAll('8083','8583')
  .replace(/(\[db.seed\][\s\S]*?)enabled = true/,'$1enabled = false');
await fs.writeFile(path.join(out,'supabase/config.toml'),isolated);
await fs.writeFile(path.join(out,'run_plan.json'),JSON.stringify({project,root:out,databasePort:56530,
  migrationCount:files.length,sourceHashes:hashes,configSha256:hash(isolated),productionWrites:0,
  existingPreviewResets:0,scope:'New isolated fixture project only; no credentials copied'},null,2));
console.log(JSON.stringify({out,project,migrations:files.length,productionWrites:0}));
