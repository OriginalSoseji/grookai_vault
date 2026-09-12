import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/collector_polish/cameo_full_replay_20260912';
const project='collector-cameo-replay-20260912';
const container=`supabase_db_${project}`;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sql=query=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1','-c',query],{encoding:'utf8',windowsHide:true}).trim();
assert.equal(process.argv.length,2,'No arbitrary target or operation');
assert.equal((await fs.realpath(out)).replaceAll('\\','/').toLowerCase(),out.toLowerCase(),'Replay path must resolve to the exact isolated project');
const plan=JSON.parse(await fs.readFile(path.join(out,'run_plan.json'),'utf8'));
assert.equal(plan.project,project);assert.equal(plan.databasePort,56530);
const config=await fs.readFile(path.join(out,'supabase/config.toml'));
assert.equal(hash(config),plan.configSha256);
assert.ok(config.toString().includes(`project_id = "${project}"`));
const state=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8',windowsHide:true}))[0];
assert.equal(state.State.Running,true);assert.equal(state.NetworkSettings.Ports['5432/tcp'][0].HostPort,'56530');
assert.equal(sql('select (select count(*) from public.card_prints)||(\'|\')||(select count(*) from auth.users)||(\'|\')||(select count(*) from public.sealed_product_variants);'),'0|0|0','Never reset populated application databases');
const names=Object.keys(plan.sourceHashes).sort();
assert.equal(names.length,394);
for (const dir of [path.join(root,'supabase/migrations'),path.join(out,'supabase/migrations')]) {
  assert.deepEqual((await fs.readdir(dir)).filter(n=>/^\d+.*\.sql$/.test(n)).sort(),names,'Migration inventory changed');
}
for(const name of names){
  assert.equal(hash(await fs.readFile(path.join(root,'supabase/migrations',name))),plan.sourceHashes[name],'Source changed');
  assert.equal(hash(await fs.readFile(path.join(out,'supabase/migrations',name))),plan.sourceHashes[name],'Replay copy changed');
}
const env={...process.env};
for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const run=spawnSync('pwsh',['-NoProfile','-Command',`supabase db reset --workdir '${out}' --local --yes; exit $LASTEXITCODE`],{env,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:24*1024*1024});
await fs.writeFile(path.join(out,'reset.log'),(run.stdout??'')+(run.stderr??''));
assert.equal(run.status,0,'Isolated reset failed; inspect operator reset.log');
const ledger=JSON.parse(sql('select jsonb_agg(version order by version) from supabase_migrations.schema_migrations;'));
assert.deepEqual(ledger,names.map(n=>n.match(/^\d+/)[0]));
assert.equal(sql("select count(*) from public.get_public_card_cameos_v2('GV-PK-MEW-200');"),'0');
assert.equal(sql('select count(*) from public.card_cameo_confirmations_v1;'),'0');
const result={checkedAt:new Date().toISOString(),status:'passed',project,databasePort:56530,
  migrationCount:ledger.length,ledgerSha256:hash(JSON.stringify(ledger)),sourceHashes:plan.sourceHashes,
  resetLogSha256:hash(await fs.readFile(path.join(out,'reset.log'))),productionWrites:0,
  existingPreviewResets:0,confirmedCameos:0,fullChainResetReplay:true};
await fs.writeFile(path.join(out,'reset-readback.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,migrations:ledger.length,productionWrites:0,out}));
