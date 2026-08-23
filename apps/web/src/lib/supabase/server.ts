import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerConfig } from "@/lib/supabase/config";

export async function createServerComponentClient() {
  const { url, publishableKey } = getSupabaseServerConfig();
  const headerStore = await headers();
  const authorization = headerStore.get("authorization")?.trim() ?? "";
  if (/^Bearer\s+\S+$/i.test(authorization)) {
    return createSupabaseClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components can read auth cookies reliably, but may not be able to write them.
        }
      },
    },
  });
}

export async function hasSupabaseServerAuthCookie() {
  const cookieStore = await cookies();
  const { url } = getSupabaseServerConfig();
  const projectRef = (() => {
    try {
      return new URL(url).hostname.split(".")[0];
    } catch {
      return null;
    }
  })();
  const expectedPrefix = projectRef ? `sb-${projectRef}-auth-token` : null;

  return cookieStore.getAll().some((cookie) => {
    if (expectedPrefix && cookie.name.startsWith(expectedPrefix)) {
      return Boolean(cookie.value);
    }

    return (
      cookie.name.startsWith("sb-") &&
      cookie.name.includes("auth-token") &&
      Boolean(cookie.value)
    );
  });
}

export function createRouteHandlerClient(request: NextRequest, response: NextResponse) {
  const { url, publishableKey } = getSupabaseServerConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}

export function createClient(request: NextRequest, response: NextResponse) {
  return createRouteHandlerClient(request, response);
}
