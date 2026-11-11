import {NextRequest, NextResponse} from 'next/server';
import {squareBackend, squareHeaders} from '@/lib/square/http';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const result = await squareBackend().launch(request.nextUrl.searchParams.get('capability') ?? '');
    const response = NextResponse.redirect(result.authorizationUrl, {status: 303, headers: squareHeaders});
    response.cookies.set('grookai-square-oauth', result.browserNonce, {httpOnly: true, secure: true,
      sameSite: 'lax', path: '/api/square/oauth/callback', maxAge: 600});
    return response;
  } catch {return new NextResponse('This Square connection link expired. Return to grookai and connect again.', {status: 400, headers: squareHeaders});}
}
