import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { runPricingCompletionCycleV1, validatePricingCompletionDirectoriesV1 } from '../../backend/pricing/pricing_completion_worker_v1.mjs';
import { writePricingArtifactV1 } from '../../backend/pricing/pricing_completion_files_v1.mjs';

const args = new Map();
const allowed = new Set(['input','state-dir','out-dir','batch-size','interval-seconds','watch','prepare-only']);
for (const arg of process.argv.slice(2)) {
  const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
  if (!match || !allowed.has(match[1]) || args.has(match[1])) throw new Error('unknown_or_duplicate_argument');
  args.set(match[1],match[2] ?? true);
}
if (args.get('prepare-only') !== true) throw new Error('explicit_--prepare-only_required; production execution is not installed');
if (args.has('watch') && args.get('watch') !== true) throw new Error('watch_requires_boolean_flag');
for (const required of ['input','state-dir','out-dir']) if (typeof args.get(required) !== 'string' || !args.get(required)) throw new Error(`missing_${required}`);
const interval = Number(args.get('interval-seconds') ?? 300);
if (!Number.isInteger(interval) || interval < 60 || interval > 86400) throw new Error('invalid_interval');
const options = {input:path.resolve(args.get('input')),stateDirectory:path.resolve(args.get('state-dir')),
  outputDirectory:path.resolve(args.get('out-dir')),batchSize:Number(args.get('batch-size') ?? 100)};
validatePricingCompletionDirectoriesV1(options);
let stopped = false;
const abort = new AbortController();
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => {stopped=true;abort.abort();});
let failures=0;
do {
  if (fs.existsSync(path.join(options.stateDirectory,'PAUSE'))) {
    writePricingArtifactV1(options.outputDirectory,'heartbeat.json',{state:'paused',at:new Date().toISOString(),productionExecutionEnabled:false});
  } else {
    try {
      const result = runPricingCompletionCycleV1(options);
      failures=0;
      process.stdout.write(JSON.stringify({state:result.state,preparedItems:result.preparedItems,unresolved:result.queue.unresolved})+'\n');
      writePricingArtifactV1(options.outputDirectory,'heartbeat.json',{state:result.state,at:new Date().toISOString(),productionExecutionEnabled:false});
    } catch (error) {
      failures++;
      // Errors can contain input paths; never dump environment or request objects.
      const failure = {state:'failed',runId:randomUUID(),at:new Date().toISOString(),failures,error:String(error.message).slice(0,1000),productionExecutionEnabled:false};
      writePricingArtifactV1(options.outputDirectory,`failure-${failure.runId}.json`,failure);
      writePricingArtifactV1(options.outputDirectory,'heartbeat.json',failure);
      if (!args.has('watch') || failures >= 3) {process.exitCode=1;break;}
    }
  }
  if (!args.has('watch') || stopped) break;
  try {await delay(interval*1000,undefined,{signal:abort.signal});} catch {break;}
} while (!stopped);
