import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const root='C:/grookai_vault_collector_authenticated';
const out=`C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_${Date.now()}`;
const exec=(file,args)=>execFileSync(file,args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});
assert.equal(exec('git',['branch','--show-current']).trim(),'preview/collector-authenticated-20260910');
mkdirSync(out,{recursive:true});
const token=JSON.parse(readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'),'utf8')).token;
const team='team_EFKFYSau9Gf8wEaix8zXgQZG';
async function get(route){const r=await fetch(`https://api.vercel.com${route}?teamId=${team}`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw Error(`Vercel readback ${r.status}`);return r.json();}
const live=await get('/v9/projects/prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum');
const deployed=await get(`/v13/deployments/${live.targets.production.id}`);
const domains=await get(`/v9/projects/${live.id}/domains`);
const preview=await get('/v13/deployments/dpl_Fq34VrWUfJg5REwfPBTPop3eG3Ys');
const sha=deployed.meta?.githubCommitSha || deployed.gitSource?.sha;
assert.match(sha,/^[0-9a-f]{40}$/);
assert.equal(deployed.readyState,'READY');
exec('git',['fetch','origin',sha]);
const liveRef=`refs/tags/preserve/live-before-collector-${Date.now()}`;
exec('git',['update-ref',liveRef,sha,'0000000000000000000000000000000000000000']);
exec('git',['bundle','create',`${out}/live-source.bundle`,liveRef]);
exec('git',['bundle','verify',`${out}/live-source.bundle`]);
exec('git',['archive','--format=zip',`--output=${out}/live-source.zip`,sha]);
const captured=JSON.parse(exec('node',['scripts/preview/preserve_collector_authenticated.mjs']).trim());
const base=exec('git',['rev-parse','HEAD']).trim();
const candidateRef=`refs/tags/preserve/collector-base-${Date.now()}`;
exec('git',['update-ref',candidateRef,base,'0000000000000000000000000000000000000000']);
exec('git',['bundle','create',`${out}/collector-base.bundle`,candidateRef]);
exec('git',['bundle','verify',`${out}/collector-base.bundle`]);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const receipt={createdAt:new Date().toISOString(),out,live:{projectId:live.id,deploymentId:deployed.id,url:`https://${deployed.url}`,commit:sha,ref:liveRef,domains:domains.domains.map(d=>d.name),retention:live.deploymentExpiration??null,build:{framework:live.framework,rootDirectory:live.rootDirectory,buildCommand:live.buildCommand,installCommand:live.installCommand,nodeVersion:live.nodeVersion}},
  preservedReadOnlyPreview:{id:preview.id,url:`https://${preview.url}`,state:preview.readyState},candidate:{baseCommit:base,ref:candidateRef,sourceSnapshot:captured.out,files:captured.files,manifestSha256:hash(`${captured.out}/manifest.json`)},
  recoveryFiles:['live-source.bundle','live-source.zip','collector-base.bundle'].map(name=>({name,sha256:hash(`${out}/${name}`)})),productionMutations:0,productionDatabaseWrites:0,gitPush:false};
writeFileSync(`${out}/preservation.json`,JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt));
