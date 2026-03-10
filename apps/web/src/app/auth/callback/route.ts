import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const CODE_VERIFIER_SUFFIX = "-code-verifier";
const AUTH_NEXT_COOKIE = "grookai-auth-next";

function getSafeNextPath(nextParam?: string | null) {
  return nextParam && nextParam.startsWith("/") ? nextParam : "/vault";
}

function createServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = cookies();
  return createClient(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: false,
      storage: {
        getItem(keyName: string) {
          if (!keyName.endsWith(CODE_VERIFIER_SUFFIX)) {
            return null;
          }

          return cookieStore.get(keyName)?.value ?? null;
        },
        setItem(keyName: string, value: string) {
          if (!keyName.endsWith(CODE_VERIFIER_SUFFIX)) {
            return;
          }

          cookieStore.set(keyName, value, {
            path: "/",
            maxAge: 60 * 10,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        },
        removeItem(keyName: string) {
          if (!keyName.endsWith(CODE_VERIFIER_SUFFIX)) {
            return;
          }

          cookieStore.set(keyName, "", {
            path: "/",
            maxAge: 0,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        },
      },
    },
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const cookieStore = cookies();
  const nextPath = getSafeNextPath(cookieStore.get(AUTH_NEXT_COOKIE)?.value ?? requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_callback_failed", requestUrl.origin));
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session?.access_token || !data.session.refresh_token) {
    return NextResponse.redirect(new URL("/login?error=oauth_callback_failed", requestUrl.origin));
  }

  const completeUrl = new URL("/auth/complete", requestUrl.origin);
  completeUrl.hash = new URLSearchParams({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    next: nextPath,
  }).toString();

  const response = NextResponse.redirect(completeUrl);
  response.cookies.set(AUTH_NEXT_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
