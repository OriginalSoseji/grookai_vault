import {NextRequest, NextResponse} from 'next/server';
import {getSiteOrigin} from '@/lib/getSiteOrigin';
import {squareBackend, squareHeaders} from '@/lib/square/http';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  let status = 'reconnect_required';
  let nativeReturn=false;
  try {
    // Reject duplicate response parameters rather than choosing one implicitly.
    for (const name of ['state', 'code', 'error']) if (request.nextUrl.searchParams.getAll(name).length > 1) throw Error();
    const result=await squareBackend().callback({state: request.nextUrl.searchParams.get('state') ?? '',
      browserNonce: request.cookies.get('grookai-square-oauth')?.value ?? '',
      code: request.nextUrl.searchParams.get('code') ?? undefined, denied: request.nextUrl.searchParams.has('error')});
    status = 'connected';
    nativeReturn=result.clientReturn==='native';
  } catch { /* No raw OAuth code, error, state or credential enters the return URL. */ }
  const destination = new URL(nativeReturn?'/square/return':'/account/connections/square', getSiteOrigin());
  destination.searchParams.set('status', status);
  const response = NextResponse.redirect(destination, {status: 303, headers: squareHeaders});
  response.cookies.set('grookai-square-oauth', '', {httpOnly: true, secure: true, sameSite: 'lax', path: '/api/square/oauth/callback', maxAge: 0});
  return response;
}
