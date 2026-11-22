import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionReferenceDatabaseConfigV1} from '../../backend/pricing/condition_reference_database_config_v1.mjs';
const direct='postgresql://fixture:fixture@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres';
test('canonical database connections require authenticated TLS and can start read-only',()=>{
  const config=conditionReferenceDatabaseConfigV1(direct,{readOnly:true});assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.ssl.servername,'db.ycdxbpibncqcchqiihfz.supabase.co');assert.equal(config.options,'-c default_transaction_read_only=on');
  const pooler=conditionReferenceDatabaseConfigV1('postgresql://postgres.ycdxbpibncqcchqiihfz:fixture@aws-1-us-east-2.pooler.supabase.com:5432/postgres');assert.equal(pooler.ssl.rejectUnauthorized,true);assert.equal(pooler.options,undefined);
});
test('wrong projects, URL TLS overrides, local routes and disabled verification fail closed',()=>{
  for(const route of [direct+'?sslmode=no-verify',direct+'#fragment',direct.replace('ycdxbpibncqcchqiihfz','otherproject'),'postgresql://fixture:fixture@127.0.0.1:5432/postgres','postgresql://postgres.other:fixture@aws-1-us-east-2.pooler.supabase.com:5432/postgres'])assert.throws(()=>conditionReferenceDatabaseConfigV1(route));
  assert.throws(()=>conditionReferenceDatabaseConfigV1(direct,{insecureTlsEnvironment:true}));assert.throws(()=>conditionReferenceDatabaseConfigV1(direct,{ca:'not a certificate'}));
});
