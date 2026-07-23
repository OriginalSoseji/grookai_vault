import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicProfileRow = {
  slug: string | null;
  public_profile_enabled: boolean | null;
};

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

function jsonWithAuthCookies(
  cookieSink: NextResponse,
  body: Record<string, unknown>,
  status = 200,
) {
  const response = NextResponse.json(body, {
    status,
    headers: PRIVATE_NO_STORE_HEADERS,
  });

  for (const cookie of cookieSink.cookies.getAll()) {
    response.cookies.set(cookie);
  }

  return response;
}

export async function GET(request: NextRequest) {
  const cookieSink = new NextResponse(null);
  const client = createRouteHandlerClient(request, cookieSink);
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return jsonWithAuthCookies(
      cookieSink,
      {
        isAuthenticated: false,
        profileHref: null,
        wallHref: "/wall",
        networkUnreadCount: 0,
      },
      401,
    );
  }

  const [profileResponse, unreadResponse] = await Promise.all([
    client
      .from("public_profiles")
      .select("slug,public_profile_enabled")
      .eq("user_id", user.id)
      .maybeSingle(),
    client
      .from("card_interaction_group_states")
      .select("user_id", { head: true, count: "exact" })
      .eq("user_id", user.id)
      .eq("has_unread", true)
      .is("archived_at", null)
      .is("closed_at", null),
  ]);

  if (profileResponse.error) {
    console.error("[navigation:shell] profile lookup failed", {
      userId: user.id,
      error: profileResponse.error.message,
    });
  }
  if (unreadResponse.error) {
    console.error("[navigation:shell] unread count lookup failed", {
      userId: user.id,
      error: unreadResponse.error.message,
    });
  }

  const profile = (profileResponse.data ?? null) as PublicProfileRow | null;
  const slug = typeof profile?.slug === "string" ? profile.slug.trim() : "";

  return jsonWithAuthCookies(cookieSink, {
    isAuthenticated: true,
    profileHref: slug ? `/u/${slug}` : null,
    wallHref: slug && profile?.public_profile_enabled ? `/u/${slug}` : "/wall",
    networkUnreadCount: unreadResponse.error ? 0 : Math.max(0, unreadResponse.count ?? 0),
  });
}
