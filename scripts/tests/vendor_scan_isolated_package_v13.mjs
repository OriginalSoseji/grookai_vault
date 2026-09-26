import './vendor_storefront_network_guard.cjs';import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';
import{scanRuntimePackageDirectories}from'../../apps/web/src/lib/stores/scanRuntimeFiles.mjs';import{runScanProcess}from'../../apps/web/src/lib/stores/scanProcessV1.mjs';
const web=path.resolve('apps/web'),dest=path.join(process.env.USERPROFILE,'.codex/tmp/vendor-scan-isolated-package-'+Date.now());fs.mkdirSync(dest,{recursive:true});
const modules=scanRuntimePackageDirectories(web);
for(const source of modules.filter(m=>!modules.some(parent=>m.startsWith(parent+path.sep)))){const relative=path.relative(web,source);assert.ok(!relative.startsWith('..'));fs.cpSync(source,path.join(dest,relative),{recursive:true,errorOnExist:true,force:false});}
const sourceDir=web+'/src/lib/stores',targetDir=dest+'/src/lib/stores';fs.mkdirSync(targetDir,{recursive:true});
for(const name of fs.readdirSync(sourceDir).filter(n=>/^scan.*\.mjs$/.test(n)||/^scanExpanded.*\.json(?:\.gz)?$/.test(n)||['visualMatchCore.mjs','visualMatchIndex.json','visualMatchCatalog.json'].includes(n)))fs.copyFileSync(sourceDir+'/'+name,targetDir+'/'+name,fs.constants.COPYFILE_EXCL);
let bytes=0,files=0;function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())walk(p);else{files++;bytes+=fs.statSync(p).size;}}}walk(dest);
const image=fs.readFileSync(path.join(process.env.USERPROFILE,'.codex/tmp/vendor-real-scans-20260923/gallery-v12/derived/gallery-1.jpg'));
const start=performance.now(),result=await runScanProcess(targetDir+'/scanMatchWorker.mjs',{version:'v13',bytes:image},{timeoutMs:20000});assert.equal(result.references[0]?.gv_id,'GV-PK-LOR-TG02');
const receipt={at:new Date().toISOString(),status:'passed',package:dest,files,bytes,runtimePackages:modules.map(m=>path.relative(web,m)),ms:Math.round(performance.now()-start),resources:result.resources,platform:process.platform};
fs.writeFileSync('.local/integration/vendor-scan-release-20260924/isolated-package-proof.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,files,bytes,ms:receipt.ms,peakRssBytes:result.resources.peakRssBytes}));
