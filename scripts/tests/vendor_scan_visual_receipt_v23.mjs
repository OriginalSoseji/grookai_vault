// Read/finalize existing offline evidence; no external requests or mutations.
import './vendor_storefront_network_guard.cjs';
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{spawnSync}from'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const dir='.local/integration/vendor-scan-visual-v23',fresh=process.env.USERPROFILE+'/.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23';
const regression=read(dir+'/regression.private.json'),selection=read(fresh+'/selection.private.json'),holdout=read(fresh+'/results.private.json'),cold=read(dir+'/cold-worker.private.json'),lifecycle=read(dir+'/lifecycle.private.json');
assert.ok(regression.finishedAt&&holdout.finishedAt&&cold.finishedAt&&lifecycle.finishedAt&&lifecycle.passed);assert.equal(regression.rows.length,308);assert.equal(holdout.rows.length,12);
for(const[file,sha]of Object.entries(selection.sources))assert.equal(hash(fs.readFileSync(file)),sha);
for(const[name,sha]of Object.entries(regression.sourceHashes))assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/'+name)),sha);
assert.deepEqual(holdout.sourceHashes,selection.sources);assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz')),selection.catalogSha256);
assert.equal(regression.catalogSha256,selection.catalogSha256);assert.equal(holdout.catalogSha256,selection.catalogSha256);
const legacy=read(process.env.USERPROFILE+'/.codex/tmp/vendor-real-scans-20260923/holdout-v2/results.private.json').rows.filter(r=>r.cards.length);
const losses=legacy.filter(old=>!regression.rows.find(r=>r.corpus==='v2_100'&&r.file===old.file)?.candidates.some(c=>c.gv_id===old.cards[0].gv_id&&c.rotation===old.cards[0].rotation)).map(r=>r.file);
const tests=['vendor_scan_geometry_v17','vendor_scan_reference_risk_v18','vendor_scan_geometry_v19','vendor_scan_shortlist_v19','vendor_scan_reference_risk_v20','vendor_scan_geometry_v22','vendor_scan_geometry_v23'];
const log=fs.readFileSync(dir+'/unit-tests.txt','utf8');assert.match(log,/# tests 28\b/);assert.match(log,/# fail 0\b/);
const sources=Object.keys(selection.sources).map(p=>p.replace('apps/web/',''));
const lint=spawnSync(process.execPath,['node_modules/eslint/bin/eslint.js',...sources,'src/lib/stores/scanGeometryV22.mjs','--max-warnings=0'],{cwd:'apps/web',encoding:'utf8',timeout:30000});
fs.writeFileSync(dir+'/lint.txt',lint.stdout+lint.stderr,{flag:'wx'});assert.equal(lint.status,0);
const quantiles=values=>{const v=values.toSorted((a,b)=>a-b);return{p50:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)],max:v.at(-1)};};
const receipt={at:new Date().toISOString(),sourceBaseline:'7ef0ba02040d290bfa390b8bd3882d7b960f4ccd',releaseQualified:false,
 reason:'Offline qualification only. No hosted reference delivery/current eligibility integration, unshared deployment tests or physical-phone proof.',
 sourceHashes:selection.sources,catalogSha256:selection.catalogSha256,correction:regression.correction,
 reports:{regression:hash(fs.readFileSync(dir+'/regression.private.json')),freshSelection:hash(fs.readFileSync(fresh+'/selection.private.json')),freshLabels:hash(fs.readFileSync(fresh+'/frozen-labels.private.json')),freshResults:hash(fs.readFileSync(fresh+'/results.private.json')),coldWorker:hash(fs.readFileSync(dir+'/cold-worker.private.json')),lifecycle:hash(fs.readFileSync(dir+'/lifecycle.private.json'))},
 regression:regression.summary,legacyV2:{previouslyCorrect:legacy.length,losses},
 targets:regression.rows.filter(r=>['gallery_v12','browser_heic','legacy'].includes(r.corpus)).map(r=>({corpus:r.corpus,file:r.file,expected:r.expected,correct:r.correct,status:r.status,candidates:r.candidates.map(c=>({gv_id:c.gv_id,rotation:c.rotation}))})),
 fresh:{...holdout.summary,scope:selection.scope,excluded:0,labelCorrections:0,misses:holdout.rows.filter(r=>r.expected.length&&!r.correct).map(r=>({file:r.file,expected:r.expected,status:r.status})),classification:'Seven card backs, one unsupported Chespin CRI005/086, four supported fronts. All now development data.'},
 cold:{...cold.summary,rows:cold.rows.map(r=>({corpus:r.corpus,file:r.file,correct:r.correct,error:r.error,ms:r.ms,workerExited:r.workerExited,resources:r.result?.resources})),scope:cold.scope},
 lifecycle:{passed:lifecycle.passed,rows:lifecycle.rows,scope:lifecycle.scope},
 timings:{geometryMs:quantiles(regression.rows.map(r=>r.ms)),freshRetrievalPlusGeometryMs:quantiles(holdout.rows.map(r=>r.ms)),scope:'Local partly concurrent runs with pinned on-disk references. Cold test includes process startup; none include hosted network/reference downloads. No latency SLA.'},
 checks:{unitTests:28,failed:0,targetedEslint:'passed',unitLogSha256:hash(fs.readFileSync(dir+'/unit-tests.txt')),lintLogSha256:hash(fs.readFileSync(dir+'/lint.txt')),testSourceHashes:Object.fromEntries(tests.map(n=>[n,hash(fs.readFileSync('scripts/tests/'+n+'.test.mjs'))])),fullBuild:'Not run; serving code unchanged'},
 localRuntime:{opencv:'4.12.0-release.1',lockSha256:hash(fs.readFileSync('.local/integration/opencv-runtime-v16/package-lock.json')),scope:'Private isolated prefix; application dependencies unchanged'},
 limitations:['308 reused development files, not unseen accuracy evidence','Twelve fresh-byte convenience samples; physical-copy independence not established','Prior Dratini label correction retained; no new correction','Alternative registered-footer edge criterion is a new acceptance route','Exact duplicate hashes/same-name reprint guard retained; different-byte cross-name semantic collisions not exhaustively validated','No real GG scan or physical-phone proof','Bulbasaur fresh-12.jpeg abstains; do not retune and call this sample unseen'],
 unchanged:['Shared search-repair/V2 pilot','Application dependencies and serving flags','Canonical/catalog data','Mac originals','Inventory, entitlements and payments','No merge, commit or deployment']};
fs.mkdirSync('docs/audits/vendor_scan_visual_v23',{recursive:true});fs.writeFileSync('docs/audits/vendor_scan_visual_v23/PROOF_20260924.json',JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({regression:receipt.regression,legacyV2:receipt.legacyV2,fresh:receipt.fresh,cold:cold.summary,tests:28,lint:'passed',releaseQualified:false}));
