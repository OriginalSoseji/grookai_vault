import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import * as p from '../../scripts/schema/jungle_scoped_price_lineage_release_policy_v1.mjs';
import {assertJungleScopedPriceForwardHashesV1} from '../helpers/jungle_scoped_price_forward_inventory_v1.mjs';
import {assertRetainedPriceForwardHashesV4} from '../helpers/retained_price_forward_inventory_v4.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const binding=JSON.parse(fs.readFileSync(new URL('../../scripts/schema/jungle_scoped_price_lineage_release_v1.json',import.meta.url)));
const clone=x=>structuredClone(x);
const actual={...binding.history,[p.CANDIDATE]:p.SQL_SHA};

test('new source fixture preserves earlier exact inventory rejection',()=>{
 const b=JSON.parse(fs.readFileSync(new URL('../../scripts/schema/best_of_game_discovery_candidate_v17.json',import.meta.url)));
 const history={...b.history,...b.candidates};
 assertJungleScopedPriceForwardHashesV1(history,actual);
 assert.throws(()=>assertRetainedPriceForwardHashesV4(history,actual));
 for(const mutate of [x=>delete x[p.CANDIDATE],x=>x[p.CANDIDATE]='0'.repeat(64),x=>x['20261126193100_extra.sql']='1'.repeat(64),x=>x[Object.keys(history)[0]]='0'.repeat(64)]){
  const bad=clone(actual);mutate(bad);assert.throws(()=>assertJungleScopedPriceForwardHashesV1(history,bad));
 }
});

test('only exact history and reviewed sole forward SQL are admitted',()=>{
 p.validateInventory(binding.history,actual);
 for(const mutate of [x=>delete x[Object.keys(binding.history)[0]],x=>x[Object.keys(binding.history)[0]]='0'.repeat(64),x=>x[p.CANDIDATE]='0'.repeat(64),x=>x['20261126193100_unapproved.sql']='1'.repeat(64)]){
  const x=clone(actual);mutate(x);assert.throws(()=>p.validateInventory(binding.history,x));
 }
 const changed=clone(binding.history);changed[Object.keys(changed)[0]]='0'.repeat(64);
 assert.throws(()=>p.validateInventory(changed,{...changed,[p.CANDIDATE]:p.SQL_SHA}));
 const ledger=Object.keys(binding.history).map(x=>x.match(/^\d+/)[0]);p.validateLedger(ledger,binding.history);
 assert.throws(()=>p.validateLedger([...ledger,'20261126193000'],binding.history));
 assert.throws(()=>p.validateLedger([...ledger].reverse(),binding.history));
});

test('release invocation rejects mode, target, path escape and arbitrary flags',()=>{
 const out='--out-dir='+p.BASE+'/release-gate-v1-contract-test';
 for(const phase of ['AuditLinkedSchema','PrePush'])assert.equal(p.validateInvocation([phase,out]).phase,phase);
 for(const args of [['Apply',out],['PrePush',out,'--db-url=postgres://other'],['PrePush',out+'/../escape'],['PrePush','--out-dir=C:/elsewhere'],['PrePush',out+'X']])assert.throws(()=>p.validateInvocation(args));
});

test('actual decision, expiry, source authority and unchanged guards are required',()=>{
 const owner={actualOwnerDecision:true,reviewFingerprint:p.REVIEW,exactSqlSha256:p.SQL_SHA,allowNewNamedFailClosedExact524To525Scope:true,allowPinnedOneFunctionApplicationOnlyAfterRequiredGates:true,guardsWaived:false,sourceQuoteRefreshAuthorized:false,maximumAdditionalRecoveryDispatches:1,approvedAt:'2026-11-26T21:03:39.145Z',expiresAt:'2026-11-27T21:03:39.145Z'};
 const now=Date.parse('2026-11-26T22:00:00Z');p.validateOwner(owner,p.OWNER_SHA,now);
 for(const [key,value]of [['actualOwnerDecision',false],['guardsWaived',true],['sourceQuoteRefreshAuthorized',true],['reviewFingerprint','other'],['exactSqlSha256','other'],['maximumAdditionalRecoveryDispatches',2],['allowNewNamedFailClosedExact524To525Scope',false]])assert.throws(()=>p.validateOwner({...owner,[key]:value},p.OWNER_SHA,now));
 assert.throws(()=>p.validateOwner(owner,'0'.repeat(64),now));
 assert.throws(()=>p.validateOwner(owner,p.OWNER_SHA,Date.parse(owner.expiresAt)));
 assert.throws(()=>p.validateOwner(owner,p.OWNER_SHA,Date.parse(owner.approvedAt)-1));
});

test('existing strict gate is preserved byte for byte outside exactly two additions',()=>{
 const source=fs.readFileSync(new URL('../../scripts/migration_preflight_strict.ps1',import.meta.url),'utf8');p.validateOriginalGate(source);
 assert.throws(()=>p.validateOriginalGate(source.replace('Set-StrictMode -Version Latest','Set-StrictMode -Version 2')));
 assert.throws(()=>p.validateOriginalGate(source+'\n# changed earlier behavior\n'));
 assert.throws(()=>p.validateOriginalGate(source.replace('BEGIN JUNGLE_SCOPED_PRICE_LINEAGE_V1 PARAMETER','BEGIN REMOVED PARAMETER')));
 assert.throws(()=>p.validateOriginalGate(source+source));
});

test('canonical direct verified TLS and both read-only controls cannot be overridden',()=>{
 const env={SUPABASE_URL:'https://'+p.PROJECT+'.supabase.co',SUPABASE_DB_URL:'postgresql://postgres:fixture@db.'+p.PROJECT+'.supabase.co/postgres'};
 p.validateRoute(env);p.validateEnvironment({NODE_OPTIONS:'--use-system-ca'});
 for(const name of ['PGHOST','PGOPTIONS','DATABASE_URL','NODE_TLS_REJECT_UNAUTHORIZED','GROOKAI_PREFLIGHT_ACK'])assert.throws(()=>p.validateEnvironment({[name]:'1'}));
 for(const url of ['postgresql://postgres:fixture@localhost/postgres','postgresql://postgres:fixture@db.'+p.PROJECT+'.supabase.co/other','postgresql://postgres@db.'+p.PROJECT+'.supabase.co/postgres'])assert.throws(()=>p.validateRoute({...env,SUPABASE_DB_URL:url}));
 assert.throws(()=>p.validateRoute({...env,SUPABASE_URL:'https://other.supabase.co'}));
 const session={database:'postgres',read_only:'on',default_read_only:'on'};p.validateSession(session,true);
 assert.throws(()=>p.validateSession(session,false));
 for(const key of ['read_only','default_read_only'])assert.throws(()=>p.validateSession({...session,[key]:'off'},true));
});

test('owned lab cannot be replaced, exposed, reseeded or put on a public network',()=>{
 const b={id:'owned',image:'pinned',created:'created',project:'owned',networks:['owned'],mounts:[]};
 const db={Id:b.id,Image:b.image,Created:b.created,State:{Running:true},NetworkSettings:{Networks:{owned:{}},Ports:{'5432/tcp':[{HostIp:'127.0.0.1'}]}},Mounts:[]};
 const network={Internal:true,Labels:{'grookai.jungle-lineage.owner':'owned'}};p.validateLab(db,network,b);
 for(const [key,value]of [['Id','borrowed'],['Image','other'],['Created','recreated']])assert.throws(()=>p.validateLab({...db,[key]:value},network,b));
 assert.throws(()=>p.validateLab(db,{...network,Internal:false},b));
 const exposed=clone(db);exposed.NetworkSettings.Ports['5432/tcp'][0].HostIp='0.0.0.0';assert.throws(()=>p.validateLab(exposed,network,b));
 const mounted=clone(db);mounted.Mounts.push({Type:'bind',Source:'C:/other',Destination:'/data'});assert.throws(()=>p.validateLab(mounted,network,b));
 const state={users:0,copies:0,cards:1316,workers:'0',ledger:Object.keys(actual).sort().map(x=>x.match(/^\d+/)[0])};p.validateOwnedState(state,binding.history);
 for(const[key,value]of [['users',1],['copies',1],['cards',1317],['workers','8'],['ledger',state.ledger.slice(1)]])assert.throws(()=>p.validateOwnedState({...state,[key]:value},binding.history));
});

test('all four schema differences must be empty',()=>{
 const diffs=Object.fromEntries(p.SCHEMAS.map(x=>[x,'']));p.requireEmptyDiffs(diffs);
 for(const schema of p.SCHEMAS)assert.throws(()=>p.requireEmptyDiffs({...diffs,[schema]:'alter table unexpected;'}));
 const incomplete=clone(diffs);delete incomplete.grookai_square;assert.throws(()=>p.requireEmptyDiffs(incomplete));
});

test('normal and hosted evidence must belong to the same completed producing source',()=>{
 const normal={state:'passed',exitCode:0,finalHead:'head',finalTree:'tree',productionDatabaseStartupReadOnly:true,verifiedDatabaseTls:true,steps:[{exitCode:0},{exitCode:0}],hookHashes:binding.managedHookHashes};
 p.validateNormal(normal,'head','tree',binding.managedHookHashes);
 for(const[key,value]of [['finalHead','other'],['finalTree','other'],['productionDatabaseStartupReadOnly',false],['verifiedDatabaseTls',false],['steps',[{exitCode:0}]],['hookHashes',{}]])assert.throws(()=>p.validateNormal({...normal,[key]:value},'head','tree',binding.managedHookHashes));
 const hosted={source:'head',pass:true,requiredNames:p.REQUIRED_CHECKS,missing:[],pending:[],failures:[],checks:p.REQUIRED_CHECKS.map(name=>({name,head_sha:'head',status:'completed',conclusion:'success'}))};p.validateHosted(hosted,'head');
 for(const[key,value]of [['source','other'],['pass',false],['pending',['scan']],['checks',hosted.checks.slice(1)]])assert.throws(()=>p.validateHosted({...hosted,[key]:value},'head'));
 const wrong=clone(hosted);wrong.checks[0].head_sha='other';assert.throws(()=>p.validateHosted(wrong,'head'));
 const failed=clone(hosted);failed.checks[0].conclusion='failure';assert.throws(()=>p.validateHosted(failed,'head'));
});

test('strict entry rejects mixed scopes and pending IDs before any metadata or database access',{skip:process.platform!=='win32'},()=>{
 const gate=new URL('../../scripts/migration_preflight_strict.ps1',import.meta.url);
 const common=['-NoProfile','-File',fileURLToPath(gate),'-JungleScopedPriceLineageReleaseV1','-AuditOutDir',p.BASE+'/release-gate-v1-rejected-contract'];
 for(const extra of [ ['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261126193000'], ['-Phase','PrePush','-ExpectedLocalOnlyIds','20261126193001'], ['-Phase','AuditLinkedSchema','-MarketPriceRetentionBaselineV1'], ['-Phase','AuditLinkedSchema','-AuditEnvFile','other'] ]){
  const r=spawnSync('pwsh',[...common,...extra],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(r.status,1);assert.match(r.stderr,/Jungle scoped lineage V1 admits only exact524/);
 }
 assert.equal(fs.existsSync(p.BASE+'/release-gate-v1-rejected-contract'),false);
});
