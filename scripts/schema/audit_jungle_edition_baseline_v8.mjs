// Fixed READ ONLY production414 comparison to the qualified PR572 replay.
// No Docker control operations, local mutations, reset or production apply.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const base='C:/grookai_vault_operator_artifacts/search_name_plan_20261001/full-414-v1';
const out='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const pending=['20261001050000_jungle_edition_foundation_v1.sql','20261001203000_jungle_edition_price_reader_integration_v1.sql','20261001211000_jungle_edition_current_artifact_date_v1.sql','20261001213000_jungle_edition_artifact_date_lineage_v1.sql','20261001220000_jungle_edition_scoped_lineage_validation_v1.sql','20261001223000_jungle_edition_resolved_readiness_v1.sql','20261001224000_jungle_edition_search_v5_integration_v1.sql'];
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
assert.equal(process.argv.length,2);assert.ok(process.execArgv.includes('--use-system-ca'));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_jungle_edition_20261001');
const freeze=read(base+'/freeze.json'),proof=read(base+'/replay-result.json');
assert.equal(proof.status,'passed');assert.equal(proof.migrations,414);assert.equal(proof.fullReplay,true);assert.equal(proof.noOpPush,true);
const sourceHashes=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(fs.readFileSync(root+'supabase/migrations/'+n))]));
assert.equal(Object.keys(freeze.sourceHashes).length,414);
for(const [name,hash]of Object.entries(freeze.sourceHashes)){assert.equal(sourceHashes[name],hash,name);assert.equal(sha(fs.readFileSync(base+'/supabase/migrations/'+name)),hash,name);}
assert.deepEqual(Object.keys(sourceHashes).filter(n=>!freeze.sourceHashes[n]),pending);
const versions=Object.keys(sourceHashes).map(n=>n.split('_')[0]);assert.equal(new Set(versions).size,421,'Duplicate migration versions');
assert.equal(sourceHashes[pending[2]],'adeaf22171dc15dfd138ac5da33548e40e06203666d4981234c1f29cd7e76b12','Renumbered unapplied migration body changed');
const local=read(base+'/replayed.private.json');
assert.deepEqual(local.LEDGER,Object.keys(freeze.sourceHashes).sort().map(n=>({version:n.split('_')[0]})));
const directory=out+'/baseline-414-'+Date.now();fs.mkdirSync(directory);
const save=(name,v)=>fs.writeFileSync(directory+'/'+name,JSON.stringify(v,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),readOnly:true,applyAuthority:false,scriptSha256:sha(fs.readFileSync(new URL(import.meta.url))),replaySha256:sha(fs.readFileSync(base+'/replayed.private.json')),productionWrites:0});
try{
 const {query,ref}=await import('../release/storefront_production_live_common_v1.mjs');assert.equal(ref,'ycdxbpibncqcchqiihfz');
 const remote=(await query(snapshotSql))[0].receipt;save('remote.private.json',remote);
 assert.deepEqual(remote.LEDGER,local.LEDGER);assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
 const comparison=await compareSnapshots(local,remote,{reconcile:true,output:directory+'/comparison'});
 const result={at:new Date().toISOString(),status:'passed',target:ref,migrations:414,candidateMigrations:421,sourceHashes,pending,comparison,output:directory,productionWrites:0,localWrites:0,applyAuthority:false,qualifiedReplaySha256:sha(fs.readFileSync(base+'/replay-result.json')),retainedRuntimeInspected:false};
 save('receipt.json',result);fs.writeFileSync(out+'/jungle-search-baseline-414-latest.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({status:'passed',migrations:414,candidateMigrations:421,pending:pending.length,normalizedBytes:comparison.normalizedBytes,securityObjects:comparison.securityObjects,output:directory}));
}catch(e){save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack});throw e;}
