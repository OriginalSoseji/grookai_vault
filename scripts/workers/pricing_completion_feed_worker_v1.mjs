import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {runPricingCompletionFeedCycleV1,validatePricingCompletionFeedDirectoriesV1} from '../../backend/pricing/pricing_completion_feed_v1.mjs';

export function parsePricingCompletionFeedArgumentsV1(argv){
  const allowed=['feed-dir','cache-dir','state-dir','out-dir','expected-collector-sha256','expected-sql-sha256','batch-size','max-feed-age-seconds','watch','prepare-only'];
  const args=new Map();for(const arg of argv){const m=/^--([a-z0-9-]+)(?:=(.*))?$/.exec(arg);if(!m||!allowed.includes(m[1])||args.has(m[1]))throw new Error('invalid_feed_argument');args.set(m[1],m[2]??true);}
  if(args.get('prepare-only')!==true||(args.has('watch')&&args.get('watch')!==true))throw new Error('explicit_prepare_only_required');
  const options={};for(const [arg,key]of [['feed-dir','feedDirectory'],['cache-dir','cacheDirectory'],['state-dir','stateDirectory'],['out-dir','outputDirectory']]){
    const value=args.get(arg);if(typeof value!=='string'||!path.isAbsolute(value))throw new Error('absolute_feed_directories_required');options[key]=path.resolve(value);
  }
  for(const [arg,key]of [['expected-collector-sha256','expectedCollectorSha256'],['expected-sql-sha256','expectedSqlSha256']]){const value=args.get(arg);if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw new Error('external_feed_pins_required');options[key]=value;}
  options.batchSize=Number(args.get('batch-size')??100);options.maxCaptureAgeMs=Number(args.get('max-feed-age-seconds')??1800)*1000;
  if(!Number.isSafeInteger(options.batchSize)||options.batchSize<1||options.batchSize>500||!Number.isSafeInteger(options.maxCaptureAgeMs)||options.maxCaptureAgeMs<1000||options.maxCaptureAgeMs>86400000)throw new Error('invalid_feed_limits');
  return {options,watch:args.get('watch')===true};
}
export async function runPricingCompletionFeedWorkerCliV1(argv){
  const {options,watch}=parsePricingCompletionFeedArgumentsV1(argv);validatePricingCompletionFeedDirectoriesV1(options);
  const abort=new AbortController();const stop=()=>abort.abort();process.on('SIGTERM',stop);process.on('SIGINT',stop);
  try{do{const result=await runPricingCompletionFeedCycleV1(options);process.stdout.write(JSON.stringify({state:result.state,generationId:result.generationId??null,errorCode:result.errorCode??null,productionExecutionEnabled:false})+'\n');
    if(!watch)return result.state==='failed'?1:0;
    if(abort.signal.aborted)break;try{await delay(60000,undefined,{signal:abort.signal});}catch{break;}
  }while(!abort.signal.aborted);return 0;}finally{process.off('SIGTERM',stop);process.off('SIGINT',stop);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)runPricingCompletionFeedWorkerCliV1(process.argv.slice(2)).then(code=>{process.exitCode=code;}).catch(()=>{process.stderr.write('Feed worker startup failed; no production executor is enabled.\n');process.exitCode=1;});
