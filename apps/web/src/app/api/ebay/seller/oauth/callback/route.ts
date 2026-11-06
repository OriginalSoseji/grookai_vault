import { NextRequest, NextResponse } from 'next/server';
import { sellerBackend, sellerHeaders } from '@/lib/ebay/sellerHttp';
import { getSiteOrigin } from '@/lib/getSiteOrigin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
const cookieName = '__Host-grookai-ebay-link';

export async function GET(request: NextRequest) {
  let outcome = 'unconfirmed';
  try {
    const query = request.nextUrl.searchParams;
    const state = query.getAll('state'), code = query.getAll('code'), error = query.getAll('error');
    const nonce = request.cookies.getAll(cookieName);
    if (request.url.length > 11000 || state.length !== 1 || nonce.length !== 1
        || code.length > 1 || error.length > 1) throw new Error('seller_callback_invalid');
    const result = await sellerBackend().oauth.callback({ state: state[0], browserNonce: nonce[0].value,
      ...(code.length ? { code: code[0] } : {}), ...(error.length ? { error: error[0] } : {}) });
    outcome = result.status;
  } catch {
    // No codes, credentials, provider response bodies or request URLs are logged
    // or copied to the return page. Durable attempt status owns recovery.
  }
  const destination = new URL('/ebay/seller/return', getSiteOrigin());
  destination.searchParams.set('status', outcome);
  const response = NextResponse.redirect(destination, { status: 303, headers: sellerHeaders });
  response.cookies.set({ name: cookieName, value: '', secure: true, httpOnly: true,
    sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
