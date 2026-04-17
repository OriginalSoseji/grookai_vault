import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  buildLoginHref,
  isProtectedRoute,
  normalizeNextPath,
  PROTECTED_ROUTE_MATCHER,
} from "./src/lib/auth/routeAccess";
import { getSupabaseServerConfig } from "./src/lib/supabase/config";

export async function middleware(request: NextRequest) {
  if (!isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const { url, publishableKey } = getSupabaseServerConfig();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextPath = normalizeNextPath(
      request.nextUrl.pathname,
      request.nextUrl.search,
    );
    return NextResponse.redirect(
      new URL(buildLoginHref(nextPath), request.url),
    );
  }

  return response;
}

export const config = {
  matcher: [...PROTECTED_ROUTE_MATCHER],
};
