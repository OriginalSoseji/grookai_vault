// Test-process instrumentation only. Never imported by production application
// code. All Square requests stay on a loopback synthetic provider in this mode.
if(process.env.SQUARE_PROVIDER_FIXTURE_V2!=='true'||process.env.SUPABASE_URL!=='http://127.0.0.1:61841'||
 process.env.SQUARE_APP_ID!=='synthetic-fixture-app'||process.env.NEXT_PUBLIC_SQUARE_LOCAL_TEST!=='true'||process.env.VERCEL)throw Error('Square provider fixture requires the exact local process');
const original=globalThis.fetch.bind(globalThis);
globalThis.fetch=(input,init)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(url.origin==='https://connect.squareupsandbox.com'||url.origin==='https://connect.squareup.com'){
  const headers=new Headers(init?.headers);
  if(headers.get('Authorization')!=='Bearer synthetic-access-token')throw Error('Only synthetic fixture credentials may reach the local provider');
  return original(new URL(url.pathname+url.search,'http://127.0.0.1:61852'),{...init,headers});
 }
 return original(input,init);
};
