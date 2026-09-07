import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync,gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { buildPokemonSealedWorldPlanV1,validatePokemonSealedWorldPlanV1,pokemonSealedHashV1 } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
assert.ok(args.inventory&&args.prior&&args.out,'--inventory --prior --out required');
const rows=gunzipSync(await fs.readFile(path.join(args.inventory,'source_products.jsonl.gz'))).toString().trim().split('\n').map(JSON.parse);
const prices=gunzipSync(await fs.readFile(path.join(args.prior,'prices.jsonl.gz'))).toString().trim().split('\n').map(JSON.parse);
const prior=JSON.parse(gunzipSync(await fs.readFile(path.join(args.prior,'plan.json.gz'))));
const plan=buildPokemonSealedWorldPlanV1({sourceRows:rows,latestPriceRows:prices,latestSync:prior.latest_sync,
  producerCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()});
assert.equal(validatePokemonSealedWorldPlanV1(plan).valid,true);
assert.equal(plan.source_fingerprint_sha256,prior.source_fingerprint_sha256,'Source scope changed');
for(const key of Object.keys(plan.payload).filter(k=>k!=='releases')) assert.deepEqual(plan.payload[key],prior.payload[key],`Payload drift: ${key}`);
await fs.mkdir(args.out,{recursive:true});
const bytes=gzipSync(JSON.stringify(plan));
await fs.writeFile(path.join(args.out,'plan.json.gz'),bytes);
await fs.writeFile(path.join(args.out,'summary.json'),JSON.stringify({producer_commit:plan.producer_commit,
  source_plan_fingerprint:prior.plan_fingerprint_sha256,plan_fingerprint:plan.plan_fingerprint_sha256,
  artifact_sha256:pokemonSealedHashV1(bytes),counts:plan.counts,payload_identity_preserved:true,database_writes:0},null,2));
console.log(JSON.stringify({fingerprint:plan.plan_fingerprint_sha256,counts:plan.counts},null,2));
