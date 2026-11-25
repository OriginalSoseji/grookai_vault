import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import pg from 'pg';
import dotenv from 'dotenv';
import {marketPipelineDatabaseConfigV1} from '../../backend/pricing/market_pipeline_database_config_v1.mjs';
import {PROJECT,priceLinkCodeBindingV4,readPriceLinkReleaseGateV4,readPriceLinkSchemaV4,readPriceLinkStateV4,freezePriceLinkPlanV4,assertPriceLinkPlanV4,executePriceLinksV4} from '../../backend/pricing/japanese_reviewed_price_links_v4.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
async function main(){
 if(process.argv.length===3&&process.argv[2]==='--print-code-binding'){console.log(JSON.stringify(priceLinkCodeBindingV4()));return;}
 const args={};for(const token of process.argv.slice(2)){const m=/^--(mode|out-dir|plan|plan-fingerprint|code-fingerprint|authority|rollback-receipt)=(.+)$/.exec(token);assert.ok(m&&!Object.hasOwn(args,m[1]),'Unknown or duplicate argument');args[m[1]]=m[2];}
 assert.ok(['prepare','preflight','rollback','apply','readback'].includes(args.mode));assert.ok(args['out-dir']&&args['code-fingerprint']);if(['rollback','apply'].includes(args.mode))assert.equal(process.env.GROOKAI_PREFLIGHT_ACK,'1','Scoped GROOKAI_PREFLIGHT_ACK=1 is required');const gate=readPriceLinkReleaseGateV4(),code=priceLinkCodeBindingV4();assert.equal(code.fingerprint,args['code-fingerprint']);
 const out=path.resolve(args['out-dir']);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});const save=(n,v)=>fs.writeFileSync(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'}),bound=new Map();
 const read=file=>{const bytes=fs.readFileSync(file);bound.set(path.resolve(file),sha(bytes));return JSON.parse(file.endsWith('.gz')?gunzipSync(bytes):bytes);};let c,result;
 try{
  let plan,authority,rollbackReceipt;if(args.mode==='prepare')assert.ok(!args.plan&&!args['plan-fingerprint']);else{assert.ok(args.plan&&args['plan-fingerprint']);plan=read(args.plan);assertPriceLinkPlanV4(plan,args['plan-fingerprint']);}
  if(['rollback','apply'].includes(args.mode)){assert.ok(args.authority);authority=read(args.authority);assert.ok(authority.original_decision_file);read(authority.original_decision_file);assert.equal(bound.get(path.resolve(authority.original_decision_file)),authority.owner_decision_sha256);if(args.mode==='apply'){assert.ok(args['rollback-receipt']);rollbackReceipt=read(args['rollback-receipt']);}}else assert.ok(!args.authority&&!args['rollback-receipt']);
  const revalidate=()=>{assert.deepEqual(priceLinkCodeBindingV4(),code);for(const[file,digest]of bound)assert.equal(sha(fs.readFileSync(file)),digest,'Frozen input changed');readPriceLinkReleaseGateV4();};
  const env=dotenv.parse(fs.readFileSync('C:/grookai_vault/.env.local'));assert.equal(env.SUPABASE_URL,'https://'+PROJECT+'.supabase.co');assert.match(fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8'),/project_id\s*=\s*"ycdxbpibncqcchqiihfz"/);const readOnly=['prepare','preflight','readback'].includes(args.mode);
  save('run_plan.json',{at:new Date().toISOString(),mode:args.mode,project_ref:PROJECT,gate,code,plan_fingerprint:plan?.fingerprint??null,read_only:readOnly,input_hashes:[...bound].map(([file,sha256])=>({name:path.basename(file),sha256}))});
  c=new pg.Client({...marketPipelineDatabaseConfigV1(env.SUPABASE_DB_URL,{SUPABASE_DB_CA_CERT:fs.readFileSync('C:/Users/ccabr/Downloads/prod-ca-2021.crt','utf8')},{readOnly,applicationName:'japanese_reviewed_price_links_v4'}),connectionTimeoutMillis:15000,statement_timeout:45000,query_timeout:50000});await c.connect();assert.equal(c.connection.stream.authorized,true);if(readOnly)assert.equal((await c.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
  const sanity=(await c.query('select(select count(*)::int from public.card_prints)cards,(select count(*)::int from public.sets)sets,(select count(*)::int from public.card_print_traits)traits')).rows[0];assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000,'Environment mismatch — fix before proceeding.');save('environment.json',{project_ref:PROJECT,sanity,verifiedTls:true});revalidate();
  if(args.mode==='prepare'){await c.query('begin isolation level repeatable read read only');await c.query("set local timezone='UTC'");const schema=await readPriceLinkSchemaV4(c),state=await readPriceLinkStateV4(c,schema);await c.query('rollback');plan=freezePriceLinkPlanV4({schema,state,observedAt:new Date().toISOString()});revalidate();fs.writeFileSync(path.join(out,'plan.private.json.gz'),gzipSync(Buffer.from(JSON.stringify(plan))),{flag:'wx'});result={mode:'prepare',plan_fingerprint:plan.fingerprint,code_fingerprint:code.fingerprint,expected:plan.expected,boundaries:plan.boundaries,productionWrites:0};}
  else{result=await executePriceLinksV4({client:c,plan,mode:args.mode,authority,rollbackReceipt,codeFingerprint:code.fingerprint});revalidate();}
  save('result.json',{...result,finished_at:new Date().toISOString()});console.log(JSON.stringify(result));
 }catch(e){await c?.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),error:e.message,sqlstate:e.code,commit_uncertain:e.commit_uncertain??false,rollback_uncertain:e.rollback_uncertain??false,database_result:result??null,action:'Independently read retained state; never blindly retry or silently refresh approved inputs.'});console.error(e.message);process.exitCode=1;}finally{await c?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
