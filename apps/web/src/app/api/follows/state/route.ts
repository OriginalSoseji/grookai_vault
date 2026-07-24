import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
      { isFollowing: false, error: "Sign in required." },
      401,
    );
  }

  const collectorUserId = (request.nextUrl.searchParams.get("collector_user_id") ?? "").trim();
  if (!UUID_PATTERN.test(collectorUserId)) {
    return jsonWithAuthCookies(
      cookieSink,
      { isFollowing: false, error: "Collector could not be identified." },
      400,
    );
  }

  if (collectorUserId === user.id) {
    return jsonWithAuthCookies(cookieSink, { isFollowing: false });
  }

  const { count, error } = await client
    .from("collector_follows")
    .select("id", { head: true, count: "exact" })
    .eq("follower_user_id", user.id)
    .eq("followed_user_id", collectorUserId);

  if (error) {
    console.error("[follows:state] lookup failed", {
      userId: user.id,
      collectorUserId,
      error: error.message,
    });
    return jsonWithAuthCookies(
      cookieSink,
      { isFollowing: false, error: "Follow state could not be loaded." },
      500,
    );
  }

  return jsonWithAuthCookies(cookieSink, { isFollowing: (count ?? 0) > 0 });
}
