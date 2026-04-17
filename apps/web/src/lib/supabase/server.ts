import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerConfig } from "@/lib/supabase/config";

export function createServerComponentClient() {
  const { url, publishableKey } = getSupabaseServerConfig();
  const cookieStore = cookies();

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
