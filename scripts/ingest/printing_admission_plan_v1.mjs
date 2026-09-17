import fs from 'node:fs/promises';
import path from 'node:path';
import {buildPrintingAdmissionPlan, evaluatePrintingReadback} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

async function main() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--(manifest|existing|readback|out-dir)=(.+)$/.exec(arg);
    if (!match || args[match[1]]) throw new Error(`Unknown or repeated argument: ${arg}`);
    args[match[1]] = match[2];
  }
  if (!args.manifest || !args['out-dir']) throw new Error('--manifest and --out-dir are required');
  const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
  const manifest = await read(args.manifest);
  const plan = buildPrintingAdmissionPlan(manifest, args.existing ? await read(args.existing) : []);
  const readiness = args.readback ? evaluatePrintingReadback(manifest, await read(args.readback)) : null;
  const out = path.resolve(args['out-dir']);
  await fs.mkdir(path.dirname(out), {recursive:true});
  await fs.mkdir(out); // A rerun must not replace a previous frozen plan.
  for (const [name, value] of Object.entries({manifest, printing_plan:plan, readiness})) {
    await fs.writeFile(path.join(out, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`, {flag:'wx'});
  }
  console.log(JSON.stringify({status:readiness?.status ?? plan.status,
    inserts:plan.inserts.length, retained:plan.retained.length, database_writes:0, out_dir:out}));
  if (readiness?.status === 'blocked') process.exitCode = 2;
}

main().catch(error => {console.error(error.message); process.exitCode = 1;});
