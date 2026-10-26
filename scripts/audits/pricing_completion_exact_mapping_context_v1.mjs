import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { preparePricingCompletionExactMappingReadbackV1 } from '../../backend/pricing/pricing_completion_exact_mapping_context_v1.mjs';

function requireValue(ok, code) { if (!ok) throw new Error(code); }
function checkAncestors(directory) {
  const root=path.parse(directory).root;let cursor=root;
  for(const part of directory.slice(root.length).split(/[\\/]/).filter(Boolean)) {
    cursor=path.join(cursor,part);const stat=fs.lstatSync(cursor);
    requireValue(stat.isDirectory() && !stat.isSymbolicLink(),'directory_redirection_forbidden');
  }
}
function write(directory,name,value) {
  const bytes=JSON.stringify(value,null,2)+'\n';const fd=fs.openSync(path.join(directory,name),'wx',0o600);
  try {fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
  return createHash('sha256').update(bytes).digest('hex');
}

export async function runPricingCompletionExactMappingContextCliV1(argv,now=Date.now()) {
  const allowed=['source-input','context-input','expected-source-sha256','expected-source-sql-sha256',
    'expected-context-sha256','expected-context-sql-sha256','out-dir'];
  const args=new Map();
  for(const arg of argv) {
    const match=/^--([a-z0-9-]+)=(.+)$/.exec(arg);
    requireValue(match && allowed.includes(match[1]) && !args.has(match[1]),'unknown_or_duplicate_option');
    args.set(match[1],match[2]);
  }
  requireValue(allowed.every(key=>args.has(key)),'missing_required_option');
  for(const key of ['source-input','context-input','out-dir']) requireValue(path.isAbsolute(args.get(key)),'absolute_paths_required');
  const output=path.resolve(args.get('out-dir'));
  checkAncestors(path.dirname(output));requireValue(!fs.existsSync(output),'output_directory_must_be_new');
  const compare=value=>process.platform==='win32'?value.toLowerCase():value;
  const bytes={};
  for(const key of ['source-input','context-input']) {
    const input=path.resolve(args.get(key));checkAncestors(path.dirname(input));
    const root=compare(path.dirname(input)),out=compare(output);
    requireValue(out!==root && !out.startsWith(root+path.sep) && !root.startsWith(out+path.sep),'input_output_must_be_disjoint');
    const stat=fs.lstatSync(input);
    requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.size>0 && stat.size<=256*1024*1024,'invalid_input_file');
    bytes[key]=fs.readFileSync(input);
  }
  const result=await preparePricingCompletionExactMappingReadbackV1({sourceBytes:bytes['source-input'],contextBytes:bytes['context-input'],
    expectedSourceSha256:args.get('expected-source-sha256'),expectedSourceSqlSha256:args.get('expected-source-sql-sha256'),
    expectedContextSha256:args.get('expected-context-sha256'),expectedContextSqlSha256:args.get('expected-context-sql-sha256'),now});
  // Creating the output only after full validation leaves rejected captures without an accepted plan.
  fs.mkdirSync(output,{mode:0o700});
  const {productEvidence,receipt,...plan}=result;
  const files={};
  for(const [name,value] of [['plan.json',plan],['product_evidence.json',productEvidence],['receipt.json',receipt]]) {
    files[name]={path:name,sha256:write(output,name,value)};
  }
  write(output,'accepted_manifest.json',{schema_version:'PRICING_COMPLETION_MAPPING_PLAN_FILES_V1',
    preparationOnly:true,executionAuthorized:false,databaseWrites:0,files});
  return {preparationOnly:true,executionAuthorized:false,databaseWrites:0,liveDatabaseAccess:false,
    sourceRunId:result.sourceRunId,summary:result.summary,reviewBatches:result.reviewBatches.length};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  runPricingCompletionExactMappingContextCliV1(process.argv.slice(2)).then(result=>{
    process.stdout.write(JSON.stringify(result)+'\n');
  }).catch(error=>{
    const message=String(error?.message ?? '');
    const diagnostic=/^[a-zA-Z0-9_:-]+$/.test(message)?message:'invalid_capture_or_local_io';
    process.stderr.write(`Offline mapping preparation failed: ${diagnostic}; no accepted plan manifest produced.\n`);
    process.exitCode=1;
  });
}
