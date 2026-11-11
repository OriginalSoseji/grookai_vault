// Run the ordinary repository commands with both SDK and SQL routed to the same
// owned local lab. No check is skipped, replaced or pointed at production.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
const root='C:/grookai_square_sync_20261110',lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
const require=createRequire(root+'/backend/package.json'),mode=process.argv[2];
const commands={preflight:'preflight',shipcheck:'shipcheck',contracts:'contracts:test',health:'contracts:runtime-health',quarantine:'contracts:quarantine-report',deferred:'contracts:deferred-report',commit:'git commit with ordinary hooks',push:'git push with ordinary hooks','flutter-diagnostic':'isolated stalled Flutter files','flutter-load-diagnostic':'isolated four failed test-worker loads'};
assert.ok(Object.hasOwn(commands,mode));assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
const cfg=require('dotenv').parse(fs.readFileSync(root+'/apps/web/.env.local'));
assert.equal(cfg.SUPABASE_URL,'http://127.0.0.1:61841');assert.equal(cfg.SQUARE_APP_ID,'synthetic-fixture-app');
const raw=execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
const status=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)),database=new URL(status.DB_URL);
assert.equal(database.hostname,'127.0.0.1');assert.equal(database.port,'61840');assert.equal(database.pathname,'/postgres');
const env={...process.env};for(const name of Object.keys(env))if(/SUPABASE|SQUARE|STRIPE|^EBAY_|^VERCEL|^GV_USER_ACCESS_TOKEN$|^NODE_ENV$|COLLECTOR_|_LOCAL_TEST|^DOTENV_CONFIG_PATH$|^PG/.test(name))delete env[name];
Object.assign(env,cfg,{SUPABASE_DB_URL:database.toString(),DOTENV_CONFIG_PATH:root+'/apps/web/.env.local',NODE_USE_SYSTEM_CA:'1'});
const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');assert.equal(fs.existsSync(npm),true);
console.log('LOCAL ordinary '+commands[mode]+': API61841 + SQL61840; inherited production credentials excluded');
const logDir='C:/grookai_vault_operator_artifacts/square_sync_20261110/source-checks-v2';fs.mkdirSync(logDir,{recursive:true});
const log=logDir+'/'+mode+'-'+Date.now()+'.log',fd=fs.openSync(log,'wx');
console.log('Retaining complete check output at '+log);
const child=mode==='commit'?spawn('git',['commit','-m','feat(square): automate exact-copy catalog, stock and sale synchronization'],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]})
 :mode==='flutter-diagnostic'?spawn('pwsh',['-NoProfile','-Command','flutter test --no-pub --reporter expanded test/combined_search_repository_test.dart test/collectr_mtg_identity_test.dart'],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]})
 :mode==='flutter-load-diagnostic'?spawn('pwsh',['-NoProfile','-Command','flutter test --no-pub --reporter expanded test/custom_collectibles_v1_test.dart test/dex_card_quick_actions_test.dart test/dex_collection_intelligence_contract_test.dart test/dex_filter_options_test.dart'],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]})
 :mode==='push'?spawn('git',['push','--set-upstream','origin','feat/square-catalog-sync-v1'],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]})
 :spawn(process.execPath,[npm,'run',commands[mode]],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]});
child.on('error',()=>{fs.closeSync(fd);process.exitCode=1;});child.on('exit',code=>{fs.closeSync(fd);console.log(JSON.stringify({mode,exitCode:code,log}));process.exitCode=code??1;});
