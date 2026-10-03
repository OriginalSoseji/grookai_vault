// Offline source-byte validation only. Never performs database or network writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertJungleEditionMasterV1} from '../../backend/catalog/jungle_edition_master_authority_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{assert.match(arg,/^--(?:artifact-map|as-of|out-dir)=.+$/);const i=arg.indexOf('=');return[arg.slice(2,i),arg.slice(i+1)];}));
assert.deepEqual(Object.keys(args).sort(),['artifact-map','as-of','out-dir']);
const file=new URL('../../docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(file)),mapPath=path.resolve(args['artifact-map']);
const map=JSON.parse(fs.readFileSync(mapPath)),artifacts=new Map();
for(const r of map){assert.ok(!artifacts.has(r.ref),'duplicate_artifact_ref');artifacts.set(r.ref,fs.readFileSync(path.resolve(path.dirname(mapPath),r.path)));}
const result=assertJungleEditionMasterV1(manifest,artifacts,{asOf:args['as-of']});
const out=path.resolve(args['out-dir']);fs.mkdirSync(out);
const receipt={...result,at:new Date().toISOString(),asOf:args['as-of'],manifestSha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),manifestFingerprint:manifest.fingerprint,artifacts:artifacts.size};
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
