import fs from 'node:fs/promises';
import path from 'node:path';
import {reconcileMasterPrintings} from '../../backend/catalog/master_index_printing_authority_v1.mjs';

async function main() {
  const args={};
  for (const token of process.argv.slice(2)) {
    const match=/^--(manifest|snapshot|artifact-map|as-of|out-dir)=(.+)$/.exec(token);
    if (!match || args[match[1]]) throw new Error(`Unknown or repeated argument: ${token}`);
    args[match[1]]=match[2];
  }
  for (const key of ['manifest','snapshot','artifact-map','as-of','out-dir']) {
    if (!args[key]) throw new Error(`--${key} is required`);
  }
  const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
  const manifest=await read(args.manifest),snapshot=await read(args.snapshot);
  const map=await read(args['artifact-map']),artifacts=new Map();
  if (!Array.isArray(map)) throw new Error('artifact-map must be an array of {ref,path}');
  for (const entry of map) {
    if (!entry.ref || !entry.path || artifacts.has(entry.ref)) throw new Error('Invalid/duplicate evidence reference');
    artifacts.set(entry.ref,await fs.readFile(path.resolve(path.dirname(args['artifact-map']),entry.path)));
  }
  const result=reconcileMasterPrintings(manifest,snapshot,{artifacts,asOf:args['as-of']});
  const out=path.resolve(args['out-dir']);
  await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.mkdir(out);
  for (const [name,value] of Object.entries({manifest,snapshot,reconciliation:result})) {
    await fs.writeFile(path.join(out,`${name}.json`),`${JSON.stringify(value,null,2)}\n`,{flag:'wx'});
  }
  console.log(JSON.stringify({status:result.status,findings:result.findings.length,proposals:result.proposals.length,
    write_ready:false,database_writes:0,out_dir:out}));
  if (result.status!=='printing_ready') process.exitCode=2;
}

main().catch(error=>{console.error(error.message);process.exitCode=1;});
