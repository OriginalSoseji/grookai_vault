// Offline regression over previously reviewed scans, not an independent holdout.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareVisualIndex, VISUAL_VERSION } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import { matchScanV3 } from '../../apps/web/src/lib/stores/scanMatchV3.mjs';
const root=process.cwd(),dir=path.join(root,'.local/integration/vendor-scan-expansion-v3');
const hash=b=>createHash('sha256').update(b).digest('hex');
const build=JSON.parse(fs.readFileSync(path.join(dir,'local-build-2026-09-23T22-52-10-191Z.json')));
const raw=fs.readFileSync(build.artifactPath);assert.equal(hash(raw),build.artifactSha256);
const catalog=raw.toString().trim().split('\n').map(JSON.parse).sort((a,b)=>a.id.localeCompare(b.id));
assert.equal(catalog.length,20079);
const references=prepareVisualIndex({version:VISUAL_VERSION,references:catalog});
const labels=JSON.parse(fs.readFileSync(path.join(dir,'frozen-evaluation-v3.private.json')));
assert.equal(hash(fs.readFileSync(path.join(root,'apps/web/src/lib/stores/scanMatchV3.mjs'))),labels.matcherSha256);
const scans=path.join(process.env.USERPROFILE,'.codex/tmp/vendor-real-scans-20260923/holdout-v2');
const report={at:new Date().toISOString(),scope:'Previously evaluated real-scan regression; no independent holdout claim',references:catalog.length,matcherSha256:labels.matcherSha256,indexSha256:build.artifactSha256,rows:[]};
const output=path.join(dir,'regression-'+report.at.replaceAll(/[:.]/g,'-')+'.private.json');
for(const label of labels.labels){
 assert.equal(hash(fs.readFileSync(path.join(scans,'files',label.file))),label.sha256);
 const start=performance.now();let result;
 try{result=await matchScanV3(fs.readFileSync(path.join(scans,'derived',label.file+'.jpg')),references,catalog);}catch(error){result={status:'error',error:error.message,candidates:[]};}
 const expected=label.expectedGvIds??[];
 const returned=result.candidates.map(c=>({...c,gv_id:catalog.find(r=>r.id===c.id)?.gv_id}));
 report.rows.push({file:label.file,expected,status:result.status,error:result.error,candidates:returned,wrong:returned.some(c=>!expected.includes(c.gv_id)),correct:returned.length>0&&returned.every(c=>expected.includes(c.gv_id)),ms:Math.round(performance.now()-start)});
 fs.writeFileSync(output,JSON.stringify(report,null,2));
 if(report.rows.length%10===0)console.log(JSON.stringify({processed:report.rows.length,correct:report.rows.filter(r=>r.correct).length,wrong:report.rows.filter(r=>r.wrong).length}));
}
report.finishedAt=new Date().toISOString();report.summary={scans:report.rows.length,correct:report.rows.filter(r=>r.correct).length,wrong:report.rows.filter(r=>r.wrong).length,abstained:report.rows.filter(r=>!r.candidates.length).length};
report.releaseReady=false;fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({output,...report.summary}));
