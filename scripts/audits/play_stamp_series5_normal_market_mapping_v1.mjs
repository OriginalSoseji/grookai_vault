import {assertStampIdentityProductionAdmissionV1} from '../../backend/catalog/stamp_identity_admission_hold_v1.mjs';
import fs from 'node:fs';
import {assertStampSourceContextV1,assertStampSourceExecutionContextV1} from '../../backend/pricing/stamp_source_7da8_context_v1.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import dotenv from 'dotenv';
import pg from 'pg';
import {playSeries5CodeBindingV1} from './play_stamp_series5_normal_execution_v1.mjs';
import {loadPlaySeries5SourcesV1} from './play_stamp_series5_normal_sources_v1.mjs';
import {playStampDescriptor,assertPlayStampPlan} from '../../backend/catalog/play_stamp_series5_normal_execution_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {marketPipelineDatabaseConfigV1} from '../../backend/pricing/market_pipeline_database_config_v1.mjs';
import {PROJECT,REGISTRY,CANONICAL_PLAN,readMappingSchema,readMappingSources,freezeMappingPlan,assertMappingPlan,assertMappingAuthority,assertActualPlayChildren,readScopedMappings,classifyMappings,executePlayMarketMapping} from '../../backend/pricing/play_stamp_series5_normal_market_mapping_v1.mjs';

import {assertStampExecutionSchemaContextV2 as assertStampExecutionSchemaContextV1} from '../../backend/catalog/stamp_schema_522_continuity_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function playSeries5MarketMappingCodeBindingV1(){
 const files=[...playSeries5CodeBindingV1().files,...[
  'backend/pricing/stamp_source_7da8_context_v1.mjs','docs/contracts/STAMP_SOURCE_7DA8_CONTINUITY_V1.md',
  'scripts/audits/play_stamp_series5_normal_market_mapping_v1.mjs',
  'backend/pricing/play_stamp_series5_normal_market_mapping_v1.mjs',
  'backend/pricing/play_stamp_series5_normal_mapping_registry_v1.mjs',
  'docs/contracts/PLAY_STAMP_SERIES5_NORMAL_MARKET_MAPPING_V1.md',
 ].map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))}))];
 return {files,fingerprint:hash(files)};
}
async function main(){
 if(process.argv.length===3&&process.argv[2]==='--print-code-binding'){console.log(JSON.stringify(playSeries5MarketMappingCodeBindingV1()));return;}
 const args={};for(const token of process.argv.slice(2)){const m=/^--(mode|out-dir|canonical-plan|source-dir|plan|plan-fingerprint|code-fingerprint|authority|rollback-receipt|schema-context|source-context)=(.+)$/.exec(token);assert.ok(m&&!Object.hasOwn(args,m[1]),'Unknown/duplicate argument');args[m[1]]=m[2];}
 assertStampSourceContextV1(args['source-context']);assert.ok(['prepare','preflight','rollback','apply','readback'].includes(args.mode));for(const k of ['out-dir','canonical-plan','source-dir','code-fingerprint'])assert.ok(args[k],'Missing '+k);
 assertStampIdentityProductionAdmissionV1('mapping4',{mode:args.mode});
 const out=path.resolve(args['out-dir']);assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
 const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 let c;try{
  const code=playSeries5MarketMappingCodeBindingV1();assert.equal(code.fingerprint,args['code-fingerprint']);const bound=new Map();
  const read=file=>{const bytes=fs.readFileSync(file);bound.set(path.resolve(file),sha(bytes));return JSON.parse(file.endsWith('.gz')?gunzipSync(bytes):bytes);};
  const canonical=read(args['canonical-plan']);assertPlayStampPlan(canonical,CANONICAL_PLAN);
  const descriptor=playStampDescriptor(loadPlaySeries5SourcesV1(root,args['source-dir']));for(const k of ['children','reviews','raw'])assert.deepEqual(canonical[k],descriptor[k]);
  let plan,authority,rollbackReceipt,schemaContext=null,sourceContext=null;if(args.mode!=='prepare'){assert.ok(args.plan&&args['plan-fingerprint']);plan=read(args.plan);assertMappingPlan(plan,args['plan-fingerprint']);schemaContext=assertStampExecutionSchemaContextV1(plan,args['schema-context'],'mapping4');sourceContext=assertStampSourceExecutionContextV1(plan,args['source-context'],args['schema-context'],'mapping4');}else assert.ok(!args.plan&&!args['plan-fingerprint']);
  if(['rollback','apply'].includes(args.mode)){assert.ok(args.authority);authority=read(args.authority);assertMappingAuthority(authority,{plan,codeFingerprint:code.fingerprint,mode:args.mode});if(args.mode==='apply'){assert.ok(args['rollback-receipt']);rollbackReceipt=read(args['rollback-receipt']);}}else assert.ok(!args.authority&&!args['rollback-receipt']);
  const revalidate=()=>{assert.deepEqual(playSeries5MarketMappingCodeBindingV1(),code);for(const [file,digest]of bound)assert.equal(sha(fs.readFileSync(file)),digest,'Frozen input changed');assert.deepEqual(playStampDescriptor(loadPlaySeries5SourcesV1(root,args['source-dir'])),descriptor);if(authority)assertMappingAuthority(authority,{plan,codeFingerprint:code.fingerprint,mode:args.mode});};
  const readOnly=['prepare','preflight','readback'].includes(args.mode);save('run_plan.json',{at:new Date().toISOString(),mode:args.mode,project_ref:PROJECT,code,canonical_plan_fingerprint:canonical.fingerprint,plan_fingerprint:plan?.fingerprint??null,read_only:readOnly,requested_source_context:args['source-context']??null,source_context:sourceContext,requested_schema_context:args['schema-context']??null,schema_context:schemaContext,authority_fingerprint:authority?.fingerprint??null});
  const owner=dotenv.parse(fs.readFileSync('C:/grookai_vault/.env.local'));assert.equal(owner.SUPABASE_URL,'https://'+PROJECT+'.supabase.co');assert.match(fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8'),/project_id\s*=\s*"ycdxbpibncqcchqiihfz"/);
  c=new pg.Client({...marketPipelineDatabaseConfigV1(owner.SUPABASE_DB_URL,{SUPABASE_DB_CA_CERT:fs.readFileSync('C:/Users/ccabr/Downloads/prod-ca-2021.crt','utf8')},{readOnly,applicationName:'play_stamp_exact28_market_mapping_v1'}),statement_timeout:45000,query_timeout:50000,connectionTimeoutMillis:15000});await c.connect();assert.equal(c.connection.stream.authorized,true);
  const sanity=(await c.query('select (select count(*)::int from public.card_prints) cards,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits')).rows[0];assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000,'Environment mismatch — fix before proceeding.');save('environment.json',{project_ref:PROJECT,sanity,verifiedTls:true});revalidate();
  let result;if(args.mode==='prepare'){
   await c.query('begin isolation level repeatable read read only');await c.query("set local timezone='UTC'");
   plan=freezeMappingPlan({source:await readMappingSources(c),schema:await readMappingSchema(c),canonicalPlan:canonical,schemaContext:args['schema-context'],sourceContext:args['source-context']});schemaContext=assertStampExecutionSchemaContextV1(plan,args['schema-context'],'mapping4');sourceContext=assertStampSourceExecutionContextV1(plan,args['source-context'],args['schema-context'],'mapping4');assert.equal(classifyMappings(plan,await readScopedMappings(c,plan)),'before');
   const children=(await c.query('select id from public.card_printings where card_print_id=any($1::uuid[]) order by id limit 7',[REGISTRY.targets.map(t=>t.parent.id)])).rows;
   let canonicalReady=false;if(children.length){await assertActualPlayChildren(c,canonical);canonicalReady=true;}
   await c.query('rollback');revalidate();fs.writeFileSync(path.join(out,'plan.private.json.gz'),gzipSync(Buffer.from(JSON.stringify(plan))),{flag:'wx'});
   result={mode:'prepare',productionWrites:0,prospective_only:!canonicalReady,canonical_ready:canonicalReady,plan_fingerprint:plan.fingerprint,code_fingerprint:code.fingerprint,expected:plan.expected,boundaries:plan.boundaries};
  }else result=await executePlayMarketMapping({client:c,plan,schemaContext:args['schema-context'],sourceContext:args['source-context'],canonicalPlan:canonical,mode:args.mode,codeFingerprint:code.fingerprint,authority,rollbackReceipt,beforeCommit:async proof=>{revalidate();save('precommit_readback.json',proof);}});
  save('result.json',{...result,source_context:sourceContext,schema_context:schemaContext,finished_at:new Date().toISOString()});console.log(JSON.stringify(result));
 }catch(error){await c?.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),error:error.message,sqlstate:error.code,commit_uncertain:error.commit_uncertain??false,rollback_uncertain:error.rollback_uncertain??false,action:'Independently inspect retained state; no blind retry or baseline refresh.'});console.error(error.message);process.exitCode=1;}finally{await c?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
