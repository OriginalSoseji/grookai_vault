import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

function getSupabaseConfig() {
  // Env authority note:
  // Canonical public key source = SUPABASE_PUBLISHABLE_KEY
  // NEXT_PUBLIC_SUPABASE_ANON_KEY is a compatibility/framework alias only.
  // Do not create additional aliases here.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, key };
}

export function createServerComponentClient() {
  const { url, key } = getSupabaseConfig();
  const cookieStore = cookies();

  return createServerClient(url, key, {
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
  const { url, key } = getSupabaseConfig();

  return createServerClient(url, key, {
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
