import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import pg from 'pg';
import {marketPipelineDatabaseConfigV1} from '../../backend/pricing/market_pipeline_database_config_v1.mjs';
import {REVIEWED_PLAY_NORMAL_PROGRAMME_V1 as VERSION,prepareReviewedPlayNormalProgrammePlanV1,runReviewedPlayNormalProgrammeV1}
  from '../../backend/warehouse/reviewed_play_normal_programme_v1.mjs';

const args=new Map();for(const item of process.argv.slice(2)){
 const match=/^--([a-z-]+)=(.+)$/.exec(item);assert.ok(match,'Every argument must be an explicit --name=value');
 assert.ok(!args.has(match[1]),'Duplicate argument');args.set(match[1],match[2]);
}
for(const key of args.keys())assert.ok(['mode','out-root','plan','authority','release-gate','rollback-receipt','receipt'].includes(key),'Unknown argument');
const mode=args.get('mode')??'prepare';assert.ok(['prepare','preflight','rollback','apply','readback'].includes(mode));
assert.ok(args.get('out-root'),'A new private operator output directory is required');const out=path.resolve(args.get('out-root'));
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.ok(path.relative(root,out).startsWith('..'),'Operator artifacts must remain outside the source checkout');
if(process.platform==='win32')assert.ok(path.relative('C:/grookai_vault_operator_artifacts',out).split(path.sep)[0]!=='..','Use the private operator artifact root');
else assert.ok(out.startsWith('/var/lib/grookai/'),'Use private Grookai runtime storage');
assert.equal(fs.existsSync(out),false,'Output already exists; inspect its outcome instead of repeating execution');fs.mkdirSync(out,{recursive:true});
const durable=(name,value)=>{const fd=fs.openSync(path.join(out,name),'wx',0o600);try{fs.writeFileSync(fd,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
const read=file=>{assert.ok(file,'Required exact private input file missing');const bytes=fs.readFileSync(file);return JSON.parse(file.endsWith('.gz')?gunzipSync(bytes):bytes);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const started={version:VERSION,mode,started_at:new Date().toISOString(),production_write_requested:['rollback','apply'].includes(mode),
 automatic_retry_allowed:false,source_root:root};durable('STARTED.json',started);
const url=process.env.SUPABASE_DB_URL||process.env.DATABASE_URL||process.env.POSTGRES_URL;
const secrets=[url,process.env.SUPABASE_SECRET_KEY,process.env.SUPABASE_SERVICE_ROLE_KEY,process.env.GV_USER_ACCESS_TOKEN];
try{if(url){secrets.push(new URL(url).password,decodeURIComponent(new URL(url).password));}}catch{}
const redact=text=>secrets.filter(Boolean).reduce((value,secret)=>value.replaceAll(secret,'[REDACTED]'),String(text));
let client,plan,result;const report={...started,pass:false,committed:false,commit_uncertain:false,rollback_uncertain:false};
try{
 if(['rollback','apply'].includes(mode))assert.equal(process.env.GROOKAI_PREFLIGHT_ACK,'1','Exact programme owner decision and scoped GROOKAI_PREFLIGHT_ACK=1 required');
 assert.equal(process.env.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co','Canonical project URL required');
 console.log(JSON.stringify({target:'REMOTE',supabase_url:process.env.SUPABASE_URL,mode,write_requested:['rollback','apply'].includes(mode)}));
 const readOnly=!['rollback','apply'].includes(mode);
 client=new pg.Client({...marketPipelineDatabaseConfigV1(url,process.env,{readOnly,applicationName:'reviewed_play_normal_programme_'+mode}),
  connectionTimeoutMillis:15000,statement_timeout:120000,query_timeout:125000});
 await client.connect();assert.equal(client.connection.stream.authorized,true);
 // The actual pool route may ignore startup options. Set and read back the
 // session default explicitly; do not weaken TLS or change server defaults.
 await client.query('set default_transaction_read_only='+ (readOnly?'on':'off'));
 assert.equal((await client.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,readOnly?'on':'off');
 const sanity=(await client.query('select(select count(*)::int from public.card_prints)cards,(select count(*)::int from public.sets)sets,(select count(*)::int from public.card_print_traits)traits')).rows[0];
 assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000,'Environment mismatch — fix before proceeding.');report.environment=sanity;
 if(mode==='prepare') {
  await client.query('begin isolation level repeatable read read only');plan=await prepareReviewedPlayNormalProgrammePlanV1(client);await client.query('rollback');
  const compressed=gzipSync(JSON.stringify(plan)),fd=fs.openSync(path.join(out,'plan.private.json.gz'),'wx',0o600);
  try{fs.writeFileSync(fd,compressed);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  Object.assign(report,{pass:true,prepared_only:true,execution_authority:false,plan_fingerprint:plan.fingerprint,plan_sha256:sha(compressed),
   code_fingerprint:plan.code_fingerprint,code_files:plan.price_links.code_binding.files.length,source_commit:git(['rev-parse','HEAD']),
   source_tree:git(['write-tree']),tracked_source_clean:git(['status','--porcelain','--untracked-files=no'])==='',expected:plan.expected,
   source_sync_run_id:plan.price_links.source_snapshot.run.id,source_fingerprint:plan.price_links.source_fingerprint});
  const review=`# Prepared consolidated reviewed Play repair\n\nPlan ${plan.fingerprint}; complete producer ${plan.code_fingerprint} (${report.code_files} files). Canonical project ycdxbpibncqcchqiihfz. This preparation grants no execution authority.\n\nOne transaction adds18 RAW warehouse candidates,18 stages,144 append-only events,9 canonical parents,9 active identities,9 physically proved Normal printings,9 verified reviews,9 exact TCGplayer parent/product links and11 private negative-ID RAW receipts. Two historical ordinary-parent intakes remain exact and receive distinct successor records. No existing IDs, cards, printings, identities, reviews, aliases, images, collections, source observations, stored prices, publication pointers or sequences change.\n\nSource ${report.source_sync_run_id}; complete frozen frame ${report.source_fingerprint}. Source/quote/schema/producer drift stops before commit. All32/old98/32-link and149-pair/298-parent identity holds remain. Three untyped foil leads remain outside this positive Normal scope.\n\nThe production runner requires the qualified source release, one explicit exact programme decision including the scoped ACK, matching actual whole-transaction rollback, one apply, durable pre-COMMIT receipt and independent zero-write readback. Do not approve a design sketch or repeat a consumed outcome. The global pricing shadow/publication/app/natural-refresh and other held review/image layers remain separate acceptance gates.\n`;
  durable('owner-review.md',review);
 }else {
  plan=read(args.get('plan'));
  const receipt=args.has('receipt')?read(args.get('receipt')):null;
  result=await runReviewedPlayNormalProgrammeV1({client,plan,mode,
   decision:args.has('authority')?read(args.get('authority')):null,
   releaseGate:args.has('release-gate')?read(args.get('release-gate')):null,
   rollbackReceipt:args.has('rollback-receipt')?read(args.get('rollback-receipt')):null,
   committedReceipt:receipt?.receipt??receipt,
   beforeCommit:async proposed=>durable('proposed-before-commit.private.json',proposed)});
  durable('result.private.json',result);Object.assign(report,{pass:true,committed:result.committed,plan_fingerprint:plan.fingerprint,
   code_fingerprint:plan.code_fingerprint,status:result.status,rollback_proven:result.rollback_proven??false,write_count:result.write_count??null});
 }
}catch(error){
 report.error={name:error.name,code:error.code,message:redact(error.message).slice(0,3000)};
 report.committed=error.committed??false;report.commit_uncertain=error.commit_uncertain??false;report.rollback_uncertain=error.rollback_uncertain??false;
 if(error.proposed_receipt&&!fs.existsSync(path.join(out,'proposed-before-commit.private.json')))durable('proposed-on-failure.private.json',error.proposed_receipt);
 process.exitCode=1;
}finally{
 if(client)await client.end().catch(()=>{});report.finished_at=new Date().toISOString();durable('operator-result.json',report);
 console.log(JSON.stringify({version:VERSION,mode,pass:report.pass,committed:report.committed,commit_uncertain:report.commit_uncertain,
  rollback_uncertain:report.rollback_uncertain,plan_fingerprint:report.plan_fingerprint,code_fingerprint:report.code_fingerprint,
  prepared_only:report.prepared_only??false,error:report.error,automatic_retry_allowed:false}));
}
