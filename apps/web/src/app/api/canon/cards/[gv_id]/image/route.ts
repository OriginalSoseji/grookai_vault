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
  set_id?: string | null;
  card_print_id?: string | null;
  image_source?: string | null;
  image_path?: string | null;
  sets?: CatalogSetAccess | CatalogSetAccess[] | null;
  games?: CatalogGameAccess | CatalogGameAccess[] | null;
};

type CatalogReleaseControl = {
  release_status?: string | null;
};

type CatalogSetAccess = {
  game?: string | null;
  catalog_set_release_controls?:
    | CatalogReleaseControl
    | CatalogReleaseControl[]
    | null;
};

type CatalogGameAccess = {
  code?: string | null;
  catalog_game_release_controls?:
    | CatalogReleaseControl
    | CatalogReleaseControl[]
    | null;
};

type CatalogImageAccess = "hidden" | "signed_in" | "public";

const CARD_IMAGE_ACCESS_SELECT =
  "id,game_id,set_id,image_source,image_path,sets(game,catalog_set_release_controls(release_status)),games(code,catalog_game_release_controls(release_status))";

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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function releaseStatus(
  value: CatalogReleaseControl | CatalogReleaseControl[] | null | undefined,
) {
  return firstRelation(value)?.release_status?.trim().toLowerCase() ?? null;
}

function catalogImageAccess(row: CardImageRow | null | undefined): CatalogImageAccess {
  const set = firstRelation(row?.sets);
  const explicitSetStatus = releaseStatus(set?.catalog_set_release_controls);
  if (explicitSetStatus === "public") return "public";
  if (explicitSetStatus === "signed_in") return "signed_in";
  if (explicitSetStatus === "hidden") return "hidden";

  const game = firstRelation(row?.games);
  const gameCode = (set?.game ?? game?.code ?? "").trim().toLowerCase();
  if (gameCode === "pokemon") {
    return "public";
  }

  const gameStatus = releaseStatus(game?.catalog_game_release_controls);
  if (gameStatus === "public") return "public";
  if (gameStatus === "signed_in") return "signed_in";
  return "hidden";
}

async function requestIsAuthenticated(request: NextRequest) {
  const requestClient = await createCatalogRequestClient(request);
  const { data, error } = await requestClient.auth.getUser();
  return !error && Boolean(data.user);
}

async function catalogImageVisibleToRequest(
  request: NextRequest,
  access: CatalogImageAccess,
) {
  if (access === "public") return true;
  if (access === "hidden") return false;
  return requestIsAuthenticated(request);
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
    .select(`gv_id,${CARD_IMAGE_ACCESS_SELECT}`)
    .eq("gv_id", gvId)
    .maybeSingle();
  if (!cardPrintResult.error && !cardPrintResult.data) {
    // Cached pages may still contain the formerly uppercased proxy URL. Keep
    // the indexed exact lookup as the hot path and pay for ILIKE only while
    // recovering those stale URLs during the cache transition.
    cardPrintResult = await admin
      .from("card_prints")
      .select(`gv_id,${CARD_IMAGE_ACCESS_SELECT}`)
      .ilike("gv_id", gvId)
      .maybeSingle();
  }
  const { data: cardPrint, error: cardPrintError } = cardPrintResult;

  if (cardPrintError) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
  }

  let cardPrintId = cardPrint?.id ?? null;
  let accessRow: CardImageRow | null = cardPrint ?? null;
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
        .select(CARD_IMAGE_ACCESS_SELECT)
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
      accessRow = parentResult.data;
      imageLocation = parentImageLocation;
    } else {
      const parentResult = await admin
        .from("card_prints")
        .select(CARD_IMAGE_ACCESS_SELECT)
        .eq("id", cardPrinting.card_print_id)
        .maybeSingle();
      if (parentResult.error || !parentResult.data) {
        return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
      }
      accessRow = parentResult.data;
    }
  }

  const access = catalogImageAccess(accessRow);
  if (
    !cardPrintId ||
    !imageLocation ||
    !(await catalogImageVisibleToRequest(request, access))
  ) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
  }

  const cacheScope = access === "public" ? "public" : "private";

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
