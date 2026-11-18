const PROJECT='ycdxbpibncqcchqiihfz';

// Canonical intake transport. Reject URL options that could override TLS policy.
export function conditionReferenceDatabaseConfigV1(connectionString,{ca,readOnly=false,insecureTlsEnvironment=false,applicationName='grookai_condition_reference_v1'}={}){
  if(insecureTlsEnvironment)throw new Error('INSECURE_DATABASE_TLS_ENVIRONMENT');
  let route;
  try{route=new URL(connectionString);}catch{throw new Error('INVALID_DATABASE_ROUTE');}
  if(!['postgres:','postgresql:'].includes(route.protocol)||route.search||route.hash||route.pathname!=='/postgres')throw new Error('INVALID_DATABASE_ROUTE');
  const direct=route.hostname===`db.${PROJECT}.supabase.co`&&(!route.port||route.port==='5432');
  const pooler=/^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(route.hostname)&&decodeURIComponent(route.username).endsWith(`.${PROJECT}`)&&['5432','6543'].includes(route.port);
  if(!direct&&!pooler)throw new Error('DATABASE_PROJECT_MISMATCH');
  if(ca!==undefined&&(typeof ca!=='string'||!ca.includes('-----BEGIN CERTIFICATE-----')))throw new Error('INVALID_DATABASE_CA');
  return{connectionString,application_name:applicationName,ssl:{rejectUnauthorized:true,servername:route.hostname,...(ca?{ca}:{})},connectionTimeoutMillis:15000,statement_timeout:180000,...(readOnly?{options:'-c default_transaction_read_only=on'}:{})};
}
