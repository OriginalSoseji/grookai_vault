import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runPricingCompletionExactMappingContextCliV1 } from '../../scripts/audits/pricing_completion_exact_mapping_context_v1.mjs';

test('CLI rejects unknown apply capability and missing pinned-input options',async()=>{
  await assert.rejects(runPricingCompletionExactMappingContextCliV1(['--apply=true']),/unknown_or_duplicate_option/);
  await assert.rejects(runPricingCompletionExactMappingContextCliV1([]),/missing_required_option/);
});
test('rejected captures leave no output directory or acceptance manifest and existing outputs are preserved',async(t)=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mapping-cli-contract-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const input=path.join(directory,'input');fs.mkdirSync(input);
  const source=path.join(input,'source.json'),context=path.join(input,'context.json'),output=path.join(directory,'output');
  fs.writeFileSync(source,'{}');fs.writeFileSync(context,'{}');
  const args=[`--source-input=${source}`,`--context-input=${context}`,`--out-dir=${output}`,
    ...['expected-source-sha256','expected-source-sql-sha256','expected-context-sha256','expected-context-sql-sha256'].map(name=>`--${name}=${'a'.repeat(64)}`)];
  await assert.rejects(runPricingCompletionExactMappingContextCliV1(args));assert.equal(fs.existsSync(output),false);
  fs.mkdirSync(output);fs.writeFileSync(path.join(output,'sentinel'),'preserve');
  await assert.rejects(runPricingCompletionExactMappingContextCliV1(args),/output_directory_must_be_new/);
  assert.equal(fs.readFileSync(path.join(output,'sentinel'),'utf8'),'preserve');
});
