import {NextRequest, NextResponse} from 'next/server';
import {squareBackend, squareHeaders} from '@/lib/square/http';
import {getSiteOrigin} from '@/lib/getSiteOrigin';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const result = await squareBackend().launch(request.nextUrl.searchParams.get('capability') ?? '');
    const response = NextResponse.redirect(result.authorizationUrl, {status: 303, headers: squareHeaders});
    response.cookies.set('grookai-square-oauth', result.browserNonce, {httpOnly: true, secure: true,
      sameSite: 'lax', path: '/api/square/oauth/callback', maxAge: 600});
    // Routing hint only: no identity or OAuth authority. Retain it longer than
    // the nonce so expired consent can still return to the app.
    response.cookies.set('grookai-square-return', result.clientReturn, {httpOnly: true, secure: true,
      sameSite: 'lax', path: '/api/square/oauth', maxAge: 1800});
    return response;
  } catch {
    const native=request.cookies.get('grookai-square-return')?.value==='native';
    const destination = new URL(native?'/square/return?status=reconnect_required':'/square/reconnect', getSiteOrigin());
    return NextResponse.redirect(destination, {status: 303, headers: squareHeaders});
  }
}
