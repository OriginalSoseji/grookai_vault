// Public reference material only. Packaging never enables the pilot flag.
import fs from 'node:fs';import assert from 'node:assert/strict';import{gzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{loadCatalogV8}from'../../tests/vendor_scan_catalog_v8.mjs';
const dir='apps/web/src/lib/stores',privateDir='.local/integration/vendor-scan-release-20260924',hash=x=>createHash('sha256').update(x).digest('hex');
assert.ok(!fs.existsSync(dir+'/scanExpandedCatalogV13.json.gz'));
const snapshotBytes=fs.readFileSync(privateDir+'/catalog-snapshot.private.json'),snapshot=JSON.parse(snapshotBytes),{catalog,indexSha256,metadataSha256}=loadCatalogV8();
assert.equal(snapshot.target,'hrtbjchobencariqclab');assert.equal(snapshot.indexSha256,indexSha256);
const byId=new Map(snapshot.cards.map(c=>[c.id,c]));
for(const row of catalog){const current=byId.get(row.id);assert.ok(current);for(const key of ['gv_id','name','number','image_path'])assert.equal(current[key],row[key]);}
const bytes=gzipSync(Buffer.from(JSON.stringify(catalog)),{level:9});
const manifest={version:'vendor_scan_artifact_v13',database:snapshot.target,references:catalog.length,artifactSha256:hash(bytes),compressedBytes:bytes.length,indexSha256,metadataSha256,snapshotSha256:hash(snapshotBytes),sourceHashes:Object.fromEntries(fs.readdirSync(dir).filter(f=>/^scan.*\.mjs$/.test(f)||f==='visualMatchCore.mjs').sort().map(f=>[f,hash(fs.readFileSync(dir+'/'+f))])),scope:'Still-scan parent suggestions; human identity and printing review required',enabled:false};
fs.writeFileSync(dir+'/scanExpandedCatalogV13.json.gz',bytes,{flag:'wx'});fs.writeFileSync(dir+'/scanExpandedManifestV13.json',JSON.stringify(manifest,null,2),{flag:'wx'});
console.log(JSON.stringify({packaged:true,references:catalog.length,bytes:bytes.length,enabled:false}));
