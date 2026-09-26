// Package the child with only traced dependencies and public artifacts; run it
// outside the repository. All reference bytes are delivered by its parent.
import './vendor_storefront_network_guard.cjs';
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{scanRuntimePackageDirectories}from'../../apps/web/src/lib/stores/scanRuntimeFiles.mjs';
import{visualReferenceMetadataV24}from'../../apps/web/src/lib/stores/scanVisualCatalogV24.mjs';
import{runVisualProcessV24}from'../../apps/web/src/lib/stores/scanVisualProcessV24.mjs';
const dir='.local/integration/vendor-scan-runtime-v24',output=dir+'/package-final.private.json';assert.ok(!fs.existsSync(output));
const web=path.resolve('apps/web'),dest=path.join(process.env.USERPROFILE,'.codex/tmp/vendor-scan-runtime-v24-'+Date.now());fs.mkdirSync(dest,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const packages=scanRuntimePackageDirectories(web);
assert.ok(packages.some(p=>p.replaceAll('\\','/').endsWith('/@techstark/opencv-js')));
for(const source of packages.filter(p=>!packages.some(parent=>p.startsWith(parent+path.sep)))){
 const relative=path.relative(web,source);assert.ok(!relative.startsWith('..'));fs.cpSync(source,path.join(dest,relative),{recursive:true,errorOnExist:true,force:false});
}
const source=path.join(web,'src/lib/stores'),target=path.join(dest,'src/lib/stores');fs.mkdirSync(target,{recursive:true});
const sourceFiles=[];
for(const name of fs.readdirSync(source).filter(n=>/^scan.*\.mjs$/.test(n)||/^scanExpanded.*\.json(?:\.gz)?$/.test(n)||['visualMatchCore.mjs','visualMatchIndex.json','visualMatchCatalog.json'].includes(n))){fs.copyFileSync(path.join(source,name),path.join(target,name),fs.constants.COPYFILE_EXCL);sourceFiles.push({name,sha256:hash(fs.readFileSync(path.join(source,name)))});}
const imagePlan=read('.local/integration/vendor-scan-release-20260924/image-plan.private.json'),images=new Map(imagePlan.images.map(r=>[r.id,r])),byId=visualReferenceMetadataV24(new URL('../../apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz',import.meta.url));
const labels=read('.local/integration/vendor-scan-visual-v16/labels.private.json').filter(r=>r.corpus==='browser_heic'||r.corpus==='legacy');assert.equal(labels.length,3);
const report={at:new Date().toISOString(),scope:'Standalone local filesystem packaging on Windows; not Linux/Vercel build proof.',package:dest,packages:packages.map(p=>path.relative(web,p)),sources:sourceFiles,rows:[]};fs.writeFileSync(output,JSON.stringify(report),{flag:'wx'});
const loadReferences=async(ids,{signal})=>{signal.throwIfAborted();return ids.map(id=>{const row=images.get(id),bytes=fs.readFileSync(row.source);assert.equal(hash(bytes),row.sha256);return{id,bytes};});};
for(const label of labels){const bytes=fs.readFileSync(label.path);assert.equal(hash(bytes),label.sha256);const start=performance.now();let result,error;
 try{result=await runVisualProcessV24(path.join(target,'scanVisualWorkerV24.mjs'),bytes,{byId,loadReferences});}catch(e){error=e.code||e.message;}
 const correct=!!result?.candidates.length&&result.candidates.every(c=>label.expected.includes(result.references.find(r=>r.id===c.id)?.gv_id)&&c.rotation===(label.corpus==='legacy'?180:0));
 report.rows.push({file:label.file,ms:Math.round(performance.now()-start),correct,error,result});fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({file:label.file,correct,error,ms:report.rows.at(-1).ms}));
}
let files=0,bytes=0;function count(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())count(p);else{files++;bytes+=fs.statSync(p).size;}}}count(dest);
report.finishedAt=new Date().toISOString();report.summary={cases:3,correct:report.rows.filter(r=>r.correct).length,files,bytes};fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));assert.equal(report.summary.correct,3);
