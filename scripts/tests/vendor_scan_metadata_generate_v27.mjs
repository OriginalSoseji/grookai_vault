import './vendor_storefront_network_guard.cjs';
import fs from'node:fs';import assert from'node:assert/strict';import{gzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{loadVisualCatalogV24,VISUAL_ARTIFACT_SHA256}from'../../apps/web/src/lib/stores/scanVisualCatalogV24.mjs';
const source='apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz',target='apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz';
const rows=loadVisualCatalogV24(source).map(({id,gv_id,image_path,sha256})=>({id,gv_id,image_path,sha256}));
const json=Buffer.from(JSON.stringify({version:'scan_reference_metadata_v27',sourceArtifactSha256:VISUAL_ARTIFACT_SHA256,rows})),bytes=gzipSync(json,{level:9});
if(process.argv.includes('--write'))fs.writeFileSync(target,bytes,{flag:'wx'});else assert.deepEqual(fs.readFileSync(target),bytes);
const report={at:new Date().toISOString(),sourceArtifactSha256:VISUAL_ARTIFACT_SHA256,rows:rows.length,compressedBytes:bytes.length,decodedBytes:json.length,sha256:createHash('sha256').update(bytes).digest('hex'),fields:Object.keys(rows[0])};
fs.writeFileSync('.local/integration/vendor-scan-runtime-v27/metadata-'+(process.argv.includes('--write')?'generation':'readback')+'.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
