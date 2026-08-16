import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  normalizeCanonImageGvId,
  resolveCanonCardImageStorageLocation,
  type CanonCardImageStorageLocation,
} from "@/lib/canon/canonImageProxy";
import { isIdentityCardImageSource } from "@/lib/publicCardImage";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerConfig } from "@/lib/supabase/config";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getContentTypeForPath(path: string) {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".webp")) return "image/webp";
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".gif")) return "image/gif";
  if (lowerPath.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

type CardImageRow = {
  id?: string | null;
  game_id?: string | null;
  card_print_id?: string | null;
  image_source?: string | null;
  image_path?: string | null;
};

function resolveIdentityImageLocation(
  row: CardImageRow | null | undefined,
): CanonCardImageStorageLocation | null {
  if (!isIdentityCardImageSource(row?.image_source)) {
    return null;
  }

  return resolveCanonCardImageStorageLocation(row?.image_path);
}

async function createCatalogRequestClient(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (/^Bearer\s+\S+$/i.test(authorization)) {
    const { url, publishableKey } = getSupabaseServerConfig();
    return createSupabaseClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return createServerComponentClient();
}

async function catalogCardVisibleToRequest(
  request: NextRequest,
  cardPrintId: string,
) {
  const requestClient = await createCatalogRequestClient(request);
  const { data, error } = await requestClient.rpc(
    "catalog_card_print_visible_to_request_v1",
    { p_card_print_id: cardPrintId },
  );

  return !error && data === true;
}

async function catalogImageCacheScope(
  admin: ReturnType<typeof createServerAdminClient>,
  gameId?: string | null,
) {
  if (!gameId) {
    return "private" as const;
  }

  const { data: game, error: gameError } = await admin
    .from("games")
    .select("code")
    .eq("id", gameId)
    .maybeSingle();
  const gameCode = game?.code?.trim().toLowerCase();
  if (gameError || !gameCode) {
    return "private" as const;
  }
  if (gameCode === "pokemon") {
    return "public" as const;
  }

  const { data: control, error: controlError } = await admin
    .from("catalog_game_release_controls")
    .select("release_status")
    .eq("game_code", gameCode)
    .maybeSingle();

  return !controlError && control?.release_status === "public"
    ? ("public" as const)
    : ("private" as const);
}

export async function GET(
  request: NextRequest,
  props: {
    params: Promise<{ gv_id: string }>;
  }
) {
  const params = await props.params;
  const gvId = normalizeCanonImageGvId(params.gv_id);
  if (!gvId) {
    return NextResponse.json({ error: "Invalid card id." }, { status: 400 });
  }

  const admin = createServerAdminClient();
  let cardPrintResult = await admin
    .from("card_prints")
    .select("id,game_id,gv_id,image_source,image_path")
    .eq("gv_id", gvId)
    .maybeSingle();
  if (!cardPrintResult.error && !cardPrintResult.data) {
    // Cached pages may still contain the formerly uppercased proxy URL. Keep
    // the indexed exact lookup as the hot path and pay for ILIKE only while
    // recovering those stale URLs during the cache transition.
    cardPrintResult = await admin
      .from("card_prints")
      .select("id,game_id,gv_id,image_source,image_path")
      .ilike("gv_id", gvId)
      .maybeSingle();
  }
  const { data: cardPrint, error: cardPrintError } = cardPrintResult;

  if (cardPrintError) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
  }

  let cardPrintId = cardPrint?.id ?? null;
  let gameId = cardPrint?.game_id ?? null;
  let imageLocation = resolveIdentityImageLocation(cardPrint);
  if (!cardPrint || !imageLocation) {
    let cardPrintingResult = await admin
      .from("card_printings")
      .select("card_print_id,printing_gv_id,image_source,image_path")
      .eq("printing_gv_id", gvId)
      .maybeSingle();
    if (!cardPrintingResult.error && !cardPrintingResult.data) {
      cardPrintingResult = await admin
        .from("card_printings")
        .select("card_print_id,printing_gv_id,image_source,image_path")
        .ilike("printing_gv_id", gvId)
        .maybeSingle();
    }
    const { data: cardPrinting, error: cardPrintingError } = cardPrintingResult;

    if (cardPrintingError || !cardPrinting) {
      return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
    }

    cardPrintId = cardPrinting.card_print_id;
    imageLocation = resolveIdentityImageLocation(cardPrinting);
    if (!imageLocation) {
      // Most finish/stamp child identities intentionally inherit their
      // parent's visual instead of storing a duplicate object. Keep that
      // inheritance inside Grookai's canonical image boundary.
      const parentResult = await admin
        .from("card_prints")
        .select("id,game_id,image_source,image_path")
        .eq("id", cardPrinting.card_print_id)
        .maybeSingle();
      const parentImageLocation = resolveIdentityImageLocation(
        parentResult.data,
      );
      if (
        parentResult.error ||
        !parentResult.data?.id ||
        !parentImageLocation
      ) {
        return NextResponse.json(
          { error: "Image unavailable." },
          { status: 404 },
        );
      }
      cardPrintId = parentResult.data.id;
      gameId = parentResult.data.game_id;
      imageLocation = parentImageLocation;
    } else {
      const parentResult = await admin
        .from("card_prints")
        .select("game_id")
        .eq("id", cardPrinting.card_print_id)
        .maybeSingle();
      if (parentResult.error) {
        return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
      }
      gameId = parentResult.data?.game_id ?? null;
    }
  }

  if (
    !cardPrintId ||
    !imageLocation ||
    !(await catalogCardVisibleToRequest(request, cardPrintId))
  ) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
  }

  const cacheScope = await catalogImageCacheScope(admin, gameId);

  const { data, error } = await admin.storage
    .from(imageLocation.bucket)
    .download(imageLocation.path);

  if (error || !data) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
  }

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Cache-Control": cacheScope === "public"
        ? "public, max-age=0, s-maxage=300, stale-while-revalidate=600"
        : "private, no-store",
      "CDN-Cache-Control": cacheScope === "public"
        ? "public, s-maxage=300, stale-while-revalidate=600"
        : "private, no-store",
      "Vercel-CDN-Cache-Control": cacheScope === "public"
        ? "public, s-maxage=300, stale-while-revalidate=600"
        : "private, no-store",
      "Content-Type": data.type || getContentTypeForPath(imageLocation.path),
    },
  });
}
