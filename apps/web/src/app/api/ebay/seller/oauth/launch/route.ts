import { NextRequest, NextResponse } from 'next/server';
import { sellerBackend, sellerHeaders, sellerReply } from '@/lib/ebay/sellerHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const values = request.nextUrl.searchParams.getAll('capability');
    if (values.length !== 1) return sellerReply({ error: 'This eBay link has expired. Start again from grookai.' }, 400);
    const result = await sellerBackend().oauth.launch(values[0]);
    const response = NextResponse.redirect(result.authorizationUrl, { status: 303, headers: sellerHeaders });
    response.cookies.set(result.cookie);
    return response;
  } catch {
    return sellerReply({ error: 'This eBay link is unavailable. Return to grookai and check the connection status.' }, 409);
  }
}
