import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {RUNTIME_FILES,RELEASE_VERSION,sha256,dependencyFiles} from '../../backend/catalog/pokemon_warehouse_discovery_runtime_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),[producer,outArg]=process.argv.slice(2);assert.match(producer??'',/^[a-f0-9]{40}$/);assert.ok(outArg);
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();assert.equal(git('rev-parse','HEAD'),producer);assert.equal(git('status','--porcelain'),'','clean_qualified_producer_required');
const out=path.resolve(outArg);fs.mkdirSync(out);const files={};
for(const relative of RUNTIME_FILES){const source=['package.json','package-lock.json'].includes(relative)?`deploy/pokemon-discovery/${relative}`:relative;const bytes=execFileSync('git',['show',`${producer}:${source}`],{cwd:root,maxBuffer:8*1024*1024});const target=path.join(out,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});files[relative]=sha256(bytes);}
const npmArgs=['ci','--ignore-scripts','--omit=dev','--no-audit','--no-fund'];
if(process.platform==='win32')execFileSync('cmd.exe',['/d','/s','/c','npm',...npmArgs],{cwd:out,stdio:'inherit'});else execFileSync('npm',npmArgs,{cwd:out,stdio:'inherit'});
const manifest={version:RELEASE_VERSION,producer_commit:producer,node_major:20,files,dependencies:dependencyFiles(out)};const bytes=JSON.stringify(manifest,null,2)+'\n';fs.writeFileSync(path.join(out,'release-manifest.json'),bytes,{flag:'wx'});console.log(JSON.stringify({producer,out,manifest_sha256:sha256(bytes),dependency_files:Object.keys(manifest.dependencies).length}));
