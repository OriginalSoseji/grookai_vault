import { NextRequest, NextResponse } from "next/server";
import { getOwnerWallSections } from "@/lib/wallSections/getOwnerWallSections";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import type { OwnerPublicWallRailModel } from "@/lib/wallSections/wallSectionTypes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function privateJson(body: OwnerPublicWallRailModel, response: NextResponse) {
  const next = NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
  });

  for (const cookie of response.cookies.getAll()) {
    next.cookies.set(cookie);
  }

  return next;
}

export async function GET(request: NextRequest) {
  const cookieSink = new NextResponse(null);
  const client = createRouteHandlerClient(request, cookieSink);
  const collectorUserId = request.nextUrl.searchParams.get("collectorUserId")?.trim() ?? "";
  const {
    data: { user },
  } = await client.auth.getUser();

  // LOCK: /u/[slug] is the primary Wall experience for both viewing and owner section management.
  // LOCK: Owner controls must not appear for public viewers.
  if (!user || !collectorUserId || user.id !== collectorUserId) {
    return privateJson(
      {
        isOwner: false,
        sections: [],
        limitState: null,
        loadError: null,
      },
      cookieSink,
    );
  }

  const model = await getOwnerWallSections(user.id);

  return privateJson(
    {
      isOwner: true,
      sections: model.sections,
      limitState: model.limitState,
      loadError: model.loadError,
    },
    cookieSink,
  );
}
