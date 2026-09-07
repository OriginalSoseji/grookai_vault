import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {buildPokemonSealedImageReleaseV1} from '../../backend/pricing/pokemon_sealed_image_release_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
assert.ok(args.catalog&&args.images&&args.storage&&args.out);
const read=async(dir,name)=>JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));
const plan=buildPokemonSealedImageReleaseV1({catalog:JSON.parse(gunzipSync(await fs.readFile(args.catalog))),
  acquisition:await read(args.images,'results.json'),acquisitionSummary:await read(args.images,'summary.json'),
  storage:await read(args.storage,'results.json'),storageSummary:await read(args.storage,'summary.json'),
  producerCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()});
await fs.mkdir(args.out,{recursive:true});
await fs.writeFile(path.join(args.out,'plan.json.gz'),gzipSync(JSON.stringify(plan)));
console.log(JSON.stringify({fingerprint:plan.fingerprint,counts:plan.counts,release:plan.payload.releases[0]},null,2));
