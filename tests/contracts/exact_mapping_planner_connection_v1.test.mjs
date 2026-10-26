import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exactMappingPlannerDatabaseConfigV1,connectExactMappingPlannerV1} from '../../backend/pricing/exact_mapping_planner_connection_v1.mjs';
import {MAPPING_READER_ROLE_V1,MAPPING_READER_SESSION_SQL_V1} from '../../backend/pricing/exact_mapping_reader_connection_v1.mjs';
const remote='postgresql://grookai_pricing_reader_v1.ycdxbpibncqcchqiihfz:synthetic@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
const session=()=>({session_user:MAPPING_READER_ROLE_V1,current_user:MAPPING_READER_ROLE_V1,role_name:MAPPING_READER_ROLE_V1,
  transaction_read_only:'on',default_transaction_read_only:'on',rolcanlogin:true,rolsuper:false,rolcreatedb:false,rolcreaterole:false,
  rolreplication:false,rolbypassrls:false,rolinherit:false,membership_count:0});
function fixture({authorized=true,connectError=false,sessionRow=session()}={}){const events=[];return {events,Client:class {
  constructor(config){events.push(['construct',config]);this.connection={stream:{authorized}};}
  async connect(){events.push(['connect']);if(connectError)throw new Error('synthetic_connect_failure');}
  async query(sql){events.push(['query',sql]);return {command:'SELECT',rows:[sessionRow]};}
  async end(){events.push(['end']);}
}};}
test('exact project uses authenticated TLS and read-only startup',async()=>{
  const f=fixture(),r=await connectExactMappingPlannerV1({Client:f.Client,connectionString:remote,env:{}});
  const config=f.events[0][1];assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.ssl.servername,'aws-1-us-east-2.pooler.supabase.com');
  assert.equal(config.options,'-c default_transaction_read_only=on');assert.equal(config.application_name,'tcgplayer-market-exact-mapping-plan-v1');
  assert.equal(r.databaseTarget.kind,'production_project');assert.equal(r.databaseTarget.project_ref,'ycdxbpibncqcchqiihfz');
  assert.equal(r.databaseTarget.verified_tls,true);assert.equal(r.databaseTarget.reader_session.direct_login_verified,true);
  assert.equal(r.databaseTarget.reader_session.full_acl_qualified,false);assert.deepEqual(f.events[2],['query',MAPPING_READER_SESSION_SQL_V1]);
});
test('outside project, deceptive hosts, URL overrides and insecure environment reject before client construction/connect',async()=>{
  const cases=[{url:remote.replace('ycdxbpibncqcchqiihfz','wrong')},{url:remote.replace('aws-1-us-east-2.pooler.supabase.com','localhost.evil.example')},
    {url:remote+'?sslmode=no-verify'},{url:remote+'?sslrootcert=C%3A%2Fevil.pem'},{url:remote+'?options=-c%20default_transaction_read_only%3Doff'},
    {url:remote,env:{NODE_TLS_REJECT_UNAUTHORIZED:'0'}},{url:'postgresql://user:synthetic@127.0.0.1:5432/postgres'},
    {url:remote.replace('grookai_pricing_reader_v1.','postgres.')},{url:remote.replace(':5432/',':6543/')},{url:remote+'#ignored'}];
  for(const item of cases){const f=fixture();await assert.rejects(connectExactMappingPlannerV1({Client:f.Client,connectionString:item.url,env:item.env??{}}));assert.deepEqual(f.events,[]);}
});
test('unauthorized TLS stream and failed connection are closed before any query',async()=>{
  for(const options of [{authorized:false},{connectError:true}]){const f=fixture(options);await assert.rejects(connectExactMappingPlannerV1({Client:f.Client,connectionString:remote,env:{}}),options.connectError?/PLANNER_CONNECTION_FAILED/:/PLANNER_TLS_NOT_AUTHORIZED/);assert.deepEqual(f.events.slice(1),[['connect'],['end']]);}
});
test('unsafe reader session closes connection and never starts planner reads',async()=>{
  const f=fixture({sessionRow:{...session(),session_user:'postgres'}});
  await assert.rejects(connectExactMappingPlannerV1({Client:f.Client,connectionString:remote,env:{}}),/MAPPING_READER_DIRECT_LOGIN_REQUIRED/);
  assert.deepEqual(f.events.slice(1),[['connect'],['query',MAPPING_READER_SESSION_SQL_V1],['end']]);
});
test('isolated fixture is truthfully labeled and remains read-only',async()=>{
  const f=fixture({authorized:false}),url='postgresql://reader:synthetic@127.0.0.1:54330/grookai_mapping_authority_fixture';
  const config=exactMappingPlannerDatabaseConfigV1(url,{env:{}});assert.equal(config.ssl,false);assert.equal(config.options,'-c default_transaction_read_only=on');
  const r=await connectExactMappingPlannerV1({Client:f.Client,connectionString:url,env:{}});assert.deepEqual(r.databaseTarget,{kind:'isolated_local_fixture',project_ref:null,verified_tls:false,startup_read_only:true});
});
test('actual planner uses verified connection before transaction and exposes target provenance in both receipts',()=>{
  const source=readFileSync(new URL('../../scripts/audits/tcgplayer_market_exact_mapping_plan_v1.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/rejectUnauthorized:\s*false|function sslConfig/);
  assert.ok(source.indexOf('exactMappingPlannerDatabaseConfigV1(url)')<source.indexOf('const [commitSha'));
  assert.ok(source.indexOf('await connectExactMappingPlannerV1')<source.indexOf('await client.query("begin read only")'));
  assert.equal((source.match(/database_target: databaseTarget/g)??[]).length,2);
});
