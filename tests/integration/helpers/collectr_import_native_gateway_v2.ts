import { createCollectionImportHandler } from "../../../supabase/functions/vault-import-collection-v2/handler.ts";
import { requireUser, createServiceRoleClient } from "../../../supabase/functions/_shared/auth.ts";
const upstream = Deno.env.get('SUPABASE_URL');
if (upstream !== 'http://127.0.0.1:58141' || !Deno.env.get('GV_COLLECTR_FIXTURE_OWNER')) throw Error('Wrong local fixture');
const handler = createCollectionImportHandler({ requireUser, createServiceRoleClient });
let dropNext = false;
Deno.serve({hostname:'127.0.0.1',port:58450}, async request => {
  const url = new URL(request.url);
  if (url.pathname === '/__collectr_fixture_health') return Response.json({project:'collectr-import-full-410-20260930',localOnly:true});
  if (url.pathname === '/__test/drop-next-import-response' && request.method === 'POST') {
    try { const auth = await requireUser(request); if (auth.userId !== Deno.env.get('GV_COLLECTR_FIXTURE_OWNER')) return new Response('denied',{status:403}); }
    catch { return new Response('denied',{status:401}); }
    dropNext = true; return Response.json({armed:true});
  }
  if (url.pathname === '/functions/v1/vault-import-collection-v2') {
    const response = await handler(request);
    if (dropNext && response.status === 200) { dropNext = false; return Response.json({error:'synthetic_response_interruption'},{status:503}); }
    return response;
  }
  if (!url.pathname.startsWith('/auth/v1/') && !url.pathname.startsWith('/rest/v1/')) return new Response('not found',{status:404});
  const headers = new Headers(request.headers); headers.delete('host');
  const response = await fetch(upstream + url.pathname + url.search, {method:request.method,headers,
    body:['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer(),redirect:'manual'});
  return response;
});
