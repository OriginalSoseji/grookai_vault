export const MAPPING_READER_ROLE_V1='grookai_pricing_reader_v1';
export const MAPPING_READER_PROJECT_V1='ycdxbpibncqcchqiihfz';
const HOST='aws-1-us-east-2.pooler.supabase.com';
function requireValue(ok,code){if(!ok)throw new Error(code);}

export function mappingReaderDatabaseConfigV1(connectionString,{mode='dry_run',env=process.env}={}) {
  requireValue(mode==='dry_run','MAPPING_READER_DRY_RUN_ONLY');
  requireValue(env.NODE_TLS_REJECT_UNAUTHORIZED!=='0','MAPPING_READER_INSECURE_TLS_ENVIRONMENT');
  let url;try{url=new URL(connectionString);}catch{throw new Error('MAPPING_READER_URL_INVALID');}
  requireValue(['postgres:','postgresql:'].includes(url.protocol),'MAPPING_READER_PROTOCOL_INVALID');
  requireValue(typeof connectionString==='string'&&!/[?#]/.test(connectionString),'MAPPING_READER_URL_OPTIONS_FORBIDDEN');
  requireValue(url.username===`${MAPPING_READER_ROLE_V1}.${MAPPING_READER_PROJECT_V1}`,'MAPPING_READER_LOGIN_INVALID');
  requireValue(url.hostname===HOST&&url.port==='5432'&&url.pathname==='/postgres','MAPPING_READER_TARGET_INVALID');
  // Do not allow percent-encoded host normalization to broaden the literal target.
  const authority=connectionString.slice(connectionString.indexOf('://')+3).split('/')[0];
  requireValue(authority.slice(authority.lastIndexOf('@')+1)===`${HOST}:5432`,'MAPPING_READER_LITERAL_TARGET_REQUIRED');
  requireValue(url.password.length>0,'MAPPING_READER_PASSWORD_REQUIRED');
  return {connectionString:url.href,ssl:{rejectUnauthorized:true,servername:HOST},
    application_name:'grookai-exact-mapping-reader-v1',connectionTimeoutMillis:15000,
    statement_timeout:120000,query_timeout:125000,options:'-c default_transaction_read_only=on'};
}

export const MAPPING_READER_SESSION_SQL_V1=`select session_user::text as session_user,
       current_user::text as current_user,
       current_setting('transaction_read_only') as transaction_read_only,
       current_setting('default_transaction_read_only') as default_transaction_read_only,
       r.rolname::text as role_name, r.rolcanlogin, r.rolsuper, r.rolcreatedb,
       r.rolcreaterole, r.rolreplication, r.rolbypassrls, r.rolinherit,
       (select count(*)::integer from pg_catalog.pg_auth_members m where m.member=r.oid) as membership_count
  from pg_catalog.pg_roles r where r.rolname=current_user`;

export async function assertMappingReaderSessionV1(client) {
  let result;
  try{result=await client.query(MAPPING_READER_SESSION_SQL_V1);}catch{throw new Error('MAPPING_READER_SESSION_QUERY_FAILED');}
  requireValue(result?.command==='SELECT'&&Array.isArray(result.rows)&&result.rows.length===1,'MAPPING_READER_SESSION_ROW_COUNT');
  const row=result.rows[0];
  requireValue(row.session_user===MAPPING_READER_ROLE_V1&&row.current_user===MAPPING_READER_ROLE_V1&&row.role_name===MAPPING_READER_ROLE_V1,'MAPPING_READER_DIRECT_LOGIN_REQUIRED');
  requireValue(row.transaction_read_only==='on'&&row.default_transaction_read_only==='on','MAPPING_READER_READ_ONLY_REQUIRED');
  requireValue(row.rolcanlogin===true,'MAPPING_READER_LOGIN_ATTRIBUTE_REQUIRED');
  for(const key of ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls','rolinherit'])requireValue(row[key]===false,'MAPPING_READER_UNSAFE_ROLE_ATTRIBUTES');
  requireValue(Number.isSafeInteger(row.membership_count)&&row.membership_count===0,'MAPPING_READER_ROLE_MEMBERSHIP_FORBIDDEN');
  return {role:MAPPING_READER_ROLE_V1,session_user:MAPPING_READER_ROLE_V1,current_user:MAPPING_READER_ROLE_V1,
    direct_login_verified:true,read_only_verified:true,role_attributes_verified:true,full_acl_qualified:false};
}
