#!/usr/bin/env node
import {runPricingCompletionDiscoveryFeedCycleV1,validatePricingDiscoveryFeedDirectoriesV1} from '../../backend/pricing/pricing_completion_discovery_feed_v1.mjs';

const allowed=new Set(['feed-dir','state-dir','out-dir','batch-size','master-collector-sha256','master-sql-sha256','master-rpc-sha256',
  'warehouse-collector-sha256','warehouse-sql-sha256','ca-sha256']);
function main(args){
  let prepare=false;const values={};
  for(const arg of args){if(arg==='--prepare-only'){if(prepare)throw new Error('duplicate_option');prepare=true;continue;}
    const m=/^--([a-z0-9-]+)=(.+)$/.exec(arg);if(!m||!allowed.has(m[1])||Object.hasOwn(values,m[1]))throw new Error('unknown_or_duplicate_option');values[m[1]]=m[2];}
  if(!prepare)throw new Error('prepare_only_required');
  for(const required of [...allowed].filter(k=>k!=='batch-size'))if(!values[required])throw new Error('required_option_missing');
  const options={feedDirectory:values['feed-dir'],stateDirectory:values['state-dir'],outputDirectory:values['out-dir'],
    batchSize:values['batch-size']===undefined?100:Number(values['batch-size']),expectedPins:{
      master:{collectorSha256:values['master-collector-sha256'],sqlSha256:values['master-sql-sha256'],appRpcSha256:values['master-rpc-sha256']},
      warehouse:{collectorSha256:values['warehouse-collector-sha256'],sqlSha256:values['warehouse-sql-sha256']},caSha256:values['ca-sha256']}};
  validatePricingDiscoveryFeedDirectoriesV1(options);
  const result=runPricingCompletionDiscoveryFeedCycleV1(options);process.stdout.write(JSON.stringify(result)+'\n');
  if(!['prepared','paused'].includes(result.state))process.exitCode=1;
}
try{main(process.argv.slice(2));}catch(error){process.stderr.write(JSON.stringify({state:'failed',errorCode:/^[a-z_]+$/.test(error.message)?error.message:'discovery_worker_rejected',productionExecutionEnabled:false})+'\n');process.exitCode=1;}
