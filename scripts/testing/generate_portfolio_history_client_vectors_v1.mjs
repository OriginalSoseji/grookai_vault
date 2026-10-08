// Export cross-runtime projections from the locally qualified SQL/model vectors.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {summarizePortfolioObservationV1,comparePortfolioObservationsV1} from '../../backend/vault/portfolio_history_v1.mjs';
assert.equal(process.argv.length,3);
const raw=fs.readFileSync(process.argv[2]),vectors=JSON.parse(raw);
assert.equal(vectors.length,215);
const cases=vectors.filter((_,i)=>i<15||(i-15)%20===0).map(v=>({name:v.name,before:summarizePortfolioObservationV1(v.before),after:summarizePortfolioObservationV1(v.after),comparison:comparePortfolioObservationsV1(v.before,v.after)}));
fs.writeFileSync('test/fixtures/portfolio_history_v1.json',JSON.stringify({version:1,inputSha256:createHash('sha256').update(raw).digest('hex'),cases},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({cases:cases.length}));
