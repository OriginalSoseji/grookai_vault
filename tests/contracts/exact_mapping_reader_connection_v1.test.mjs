import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPPING_READER_ROLE_V1,MAPPING_READER_SESSION_SQL_V1,mappingReaderDatabaseConfigV1,assertMappingReaderSessionV1} from '../../backend/pricing/exact_mapping_reader_connection_v1.mjs';
const remote='postgresql://grookai_pricing_reader_v1.ycdxbpibncqcchqiihfz:synthetic@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
const row=()=>({session_user:MAPPING_READER_ROLE_V1,current_user:MAPPING_READER_ROLE_V1,role_name:MAPPING_READER_ROLE_V1,
  transaction_read_only:'on',default_transaction_read_only:'on',rolcanlogin:true,rolsuper:false,rolcreatedb:false,rolcreaterole:false,
  rolreplication:false,rolbypassrls:false,rolinherit:false,membership_count:0});
test('reader config is exact session-pooler project/role and cannot become apply',()=>{
  const c=mappingReaderDatabaseConfigV1(remote,{env:{}});assert.equal(c.connectionString,remote);
  assert.equal(c.ssl.rejectUnauthorized,true);assert.equal(c.ssl.servername,'aws-1-us-east-2.pooler.supabase.com');
  assert.equal(c.options,'-c default_transaction_read_only=on');
  assert.throws(()=>mappingReaderDatabaseConfigV1(remote,{mode:'apply',env:{}}),/DRY_RUN_ONLY/);
});
test('reader rejects any broader role, target, alternate port, protocol, encoded spelling or URL overrides',()=>{
  const invalid=[remote.replace('grookai_pricing_reader_v1.','postgres.'),remote.replace('ycdxbpibncqcchqiihfz','wrong'),
    remote.replace(':5432/',':6543/'),remote.replace(':5432/','/'),remote.replace('/postgres','/another'),
    remote.replace('postgresql:','https:'),remote.replace('grookai','%67rookai'),remote.replace('aws-1','%61ws-1'),
    remote.replace('aws-1-us-east-2.pooler.supabase.com','127.0.0.1'),remote+'?sslmode=no-verify',remote+'?',remote+'#fragment',
    remote+'?options=-c%20role%3Dpostgres',remote.replace(':synthetic@',':@')];
  for(const url of invalid)assert.throws(()=>mappingReaderDatabaseConfigV1(url,{env:{}}),/MAPPING_READER_/);
  assert.throws(()=>mappingReaderDatabaseConfigV1(remote,{env:{NODE_TLS_REJECT_UNAUTHORIZED:'0'}}),/INSECURE_TLS/);
});
test('direct role proof runs one fixed SELECT and returns no credential or full-ACL claim',async()=>{
  const queries=[];const proof=await assertMappingReaderSessionV1({query:async sql=>{queries.push(sql);return {command:'SELECT',rows:[row()]};}});
  assert.deepEqual(queries,[MAPPING_READER_SESSION_SQL_V1]);assert.equal(proof.direct_login_verified,true);assert.equal(proof.full_acl_qualified,false);
  assert.equal(proof.role,MAPPING_READER_ROLE_V1);assert.equal(Object.hasOwn(proof,'connectionString'),false);
});
test('missing/extra rows and SET ROLE/elevated/not-read-only sessions fail closed',async()=>{
  const invalid=[[],[row(),row()],[{...row(),session_user:'postgres'}],[{...row(),current_user:'postgres'}],
    [{...row(),role_name:'another'}],[{...row(),transaction_read_only:'off'}],[{...row(),default_transaction_read_only:'off'}],
    [{...row(),rolcanlogin:false}],[{...row(),membership_count:1}],[{...row(),membership_count:'0'}]];
  for(const attr of ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls','rolinherit']){
    invalid.push([{...row(),[attr]:true}]);const missing=row();delete missing[attr];invalid.push([missing]);
  }
  for(const rows of invalid)await assert.rejects(assertMappingReaderSessionV1({query:async()=>({command:'SELECT',rows})}),/MAPPING_READER_/);
});
test('session query errors are sanitized rather than exposing driver diagnostics',async()=>{
  await assert.rejects(assertMappingReaderSessionV1({query:async()=>{throw new Error(remote);}}),error=>error.message==='MAPPING_READER_SESSION_QUERY_FAILED'&&!error.message.includes('synthetic'));
});
