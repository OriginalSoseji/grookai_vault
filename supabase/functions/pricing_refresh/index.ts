// deno-lint-ignore-file no-explicit-any
// Pricing refresh scheduled Edge Function
// - Enqueue MV refresh job if not already queued/running
// - Run the worker once via RPC (process_jobs)

interface JsonResponse {
  ok: boolean;
  handled?: number;
  jobQueued?: boolean;
  error?: string;
}

function env(key: string): string | undefined {
  try { return Deno.env.get(key) ?? undefined } catch { return undefined }
}

const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_KEY = env('SERVICE_ROLE_KEY') || env('SUPABASE_SERVICE_ROLE_KEY') || env('SERVICE_ROLE');

function headers() {
  if (!SERVICE_KEY) throw new Error('Missing service role key in function environment');
  return {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact'
  } as Record<string,string>;
}

async function getQueuedCount(): Promise<number> {
  const url = `${SUPABASE_URL}/rest/v1/jobs?name=eq.refresh_latest_card_prices_mv&status=in.(queued,running)&select=id`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`count jobs failed: ${res.status} ${await res.text()}`);
  const cr = res.headers.get('content-range');
  if (cr && cr.includes('/')) {
    const total = cr.split('/')[1];
    const n = parseInt(total, 10);
    if (!Number.isNaN(n)) return n;
  }
  const arr: any[] = await res.json();
  return Array.isArray(arr) ? arr.length : 0;
}

async function enqueueIfNeeded(): Promise<boolean> {
  const cnt = await getQueuedCount();
  if (cnt > 0) return false;
  const url = `${SUPABASE_URL}/rest/v1/jobs`;
  const body = [{ name: 'refresh_latest_card_prices_mv', payload: {} }];
  const res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`enqueue failed: ${res.status} ${await res.text()}`);
  return true;
}

async function runWorkerOnce(): Promise<number> {
  const url = `${SUPABASE_URL}/rest/v1/rpc/process_jobs`;
  const res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify({ p_limit: 1 }) });
  if (!res.ok) throw new Error(`process_jobs failed: ${res.status} ${await res.text()}`);
  const val = await res.json();
  const handled = typeof val === 'number' ? val : (val?.process_jobs ?? 0);
  return handled ?? 0;
}

function json(status: number, data: JsonResponse): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method Not Allowed' });
  }
  try {
    if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
    const queued = await enqueueIfNeeded();
    const handled = await runWorkerOnce();
    const msg = `[pricing_refresh] handled=${handled} queued=${queued} at=${new Date().toISOString()}`;
    console.log(msg);
    return json(200, { ok: true, handled, jobQueued: queued });
  } catch (e: any) {
    const err = (e?.message || String(e)).slice(0, 200);
    console.error(`[pricing_refresh] ERROR ${err}`);
    return json(500, { ok: false, error: err });
  }
}

// Export as standard Edge Function entrypoint
serve(handler);

