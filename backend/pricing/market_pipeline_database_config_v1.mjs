import {conditionReferenceDatabaseConfigV1} from './condition_reference_database_config_v1.mjs';

// Keep PostgreSQL startup options while preventing URL SSL settings from
// replacing verified TLS in node-postgres. Only literal loopback is local.
export function marketPipelineDatabaseConfigV1(connectionString, environment=process.env, {readOnly=false,applicationName='tcgplayer_market_pipeline_v2'}={}) {
  if(environment.NODE_TLS_REJECT_UNAUTHORIZED==='0') throw new Error('INSECURE_DATABASE_TLS_ENVIRONMENT');
  let route;
  try { route=new URL(connectionString); } catch { throw new Error('INVALID_DATABASE_ROUTE'); }
  const allowed=new Set(['sslmode','sslrootcert','options','application_name','connect_timeout']);
  for(const key of route.searchParams.keys()) if(!allowed.has(key)) throw new Error('UNSUPPORTED_DATABASE_URL_OPTION');
  const mode=route.searchParams.get('sslmode');
  if(mode && !['require','verify-ca','verify-full'].includes(mode)) throw new Error('INSECURE_DATABASE_TLS_MODE');
  const options=route.searchParams.get('options');
  route.search='';
  const local=['localhost','127.0.0.1','[::1]'].includes(route.hostname);
  if(local && (!['postgres:','postgresql:'].includes(route.protocol) || route.hash)) throw new Error('INVALID_DATABASE_ROUTE');
  const config=local ? {connectionString:route.href,ssl:false,application_name:applicationName} : conditionReferenceDatabaseConfigV1(route.href,{ca:environment.SUPABASE_DB_CA_CERT||undefined,applicationName});
  if(options || readOnly) config.options=[options,readOnly?'-c default_transaction_read_only=on':null].filter(Boolean).join(' ');
  return config;
}
