import assert from 'node:assert/strict';
import {mappingDatabaseConfig} from './exact_mapping_execution_guard_v1.mjs';
import {mappingReaderDatabaseConfigV1,assertMappingReaderSessionV1,MAPPING_READER_PROJECT_V1} from './exact_mapping_reader_connection_v1.mjs';

export function exactMappingPlannerDatabaseConfigV1(connectionString,{env=process.env,mode='dry_run'}={}) {
  assert.equal(mode,'dry_run','planner_connection_dry_run_only');
  // pg URL options may replace ssl/startup settings. Planner inputs must express
  // no URL overrides; verified TLS and read-only startup are chosen here only.
  let parsed;
  try {parsed=new URL(connectionString);} catch {throw new Error('planner_database_url_invalid');}
  if(parsed.search||parsed.hash||/[?#]/.test(connectionString))throw new Error('planner_database_url_options_forbidden');
  const local=['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
  const config=local?mappingDatabaseConfig(connectionString,{mode:'dry_run',env})
    :mappingReaderDatabaseConfigV1(connectionString,{mode,env});
  return {...config,application_name:'tcgplayer-market-exact-mapping-plan-v1'};
}

export async function connectExactMappingPlannerV1({Client,connectionString,env=process.env,mode='dry_run'}) {
  // Validation must finish before the client is constructed or connect is called.
  const config=exactMappingPlannerDatabaseConfigV1(connectionString,{env,mode});
  const client=new Client(config);
  let readerSession=null;
  try {
    await client.connect();
    if(config.ssl && client.connection?.stream?.authorized!==true)throw new Error('PLANNER_TLS_NOT_AUTHORIZED');
    if(config.ssl)readerSession=await assertMappingReaderSessionV1(client);
  } catch(error) {
    await client.end().catch(()=>{});
    // Never forward driver connection details or credentials in a diagnostic.
    const code=String(error?.message??'');
    throw new Error(/^(?:PLANNER_TLS_NOT_AUTHORIZED|MAPPING_READER_[A-Z_]+)$/.test(code)?code:'PLANNER_CONNECTION_FAILED');
  }
  return {client,databaseTarget:{kind:config.ssl?'production_project':'isolated_local_fixture',
    project_ref:config.ssl?MAPPING_READER_PROJECT_V1:null,
    verified_tls:config.ssl?true:false,startup_read_only:true,...(readerSession?{reader_session:readerSession}:{})}};
}
