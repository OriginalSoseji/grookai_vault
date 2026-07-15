import { NextResponse } from "next/server";
import {
  buildCanonCardImageProxyUrl,
  buildCanonImageProxyUrl,
  normalizeWarehouseCanonImagePath,
} from "@/lib/canon/canonImageProxy";
import { isIdentityCardImageSource } from "@/lib/publicCardImage";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_PATHS_PER_REQUEST = 100;

type CanonImageRow = {
  gv_id?: string | null;
  printing_gv_id?: string | null;
  image_source?: string | null;
  image_path?: string | null;
};

function assignStableImageUrl(map: Map<string, string>, row: CanonImageRow) {
  const imagePath = normalizeWarehouseCanonImagePath(row.image_path);
  if (!imagePath || !isIdentityCardImageSource(row.image_source)) {
    return;
  }

  const url = buildCanonCardImageProxyUrl(row.gv_id ?? row.printing_gv_id);
  if (url) {
    map.set(imagePath, url);
  }
}

async function resolveStableCanonImageUrls(paths: string[]) {
  const urlsByPath = new Map<string, string>();
  const admin = createServerAdminClient();

  const [{ data: cardPrints, error: cardPrintsError }, { data: cardPrintings, error: cardPrintingsError }] =
    await Promise.all([
      admin
        .from("card_prints")
        .select("gv_id,image_source,image_path")
        .eq("image_source", "identity")
        .in("image_path", paths),
      admin
        .from("card_printings")
        .select("printing_gv_id,image_source,image_path")
        .eq("image_source", "identity")
        .in("image_path", paths),
    ]);

  if (cardPrintsError) {
    console.error("[canon:images] card_prints lookup failed", cardPrintsError);
  }
  if (cardPrintingsError) {
    console.error("[canon:images] card_printings lookup failed", cardPrintingsError);
  }

  for (const row of cardPrints ?? []) {
    assignStableImageUrl(urlsByPath, row);
  }
  for (const row of cardPrintings ?? []) {
    assignStableImageUrl(urlsByPath, row);
  }

  return urlsByPath;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ urls: {}, error: "Invalid JSON." }, { status: 400 });
  }

  const rawPaths =
    typeof body === "object" && body !== null && Array.isArray((body as { paths?: unknown }).paths)
      ? (body as { paths: unknown[] }).paths
      : [];

  const paths = Array.from(
    new Set(rawPaths.map(normalizeWarehouseCanonImagePath).filter((path): path is string => Boolean(path))),
  ).slice(0, MAX_PATHS_PER_REQUEST);

  if (paths.length === 0) {
    return NextResponse.json({ urls: {} });
  }

  const stableUrlsByPath = await resolveStableCanonImageUrls(paths);
  const entries = paths.map((path) => {
    const url = stableUrlsByPath.get(path) ?? buildCanonImageProxyUrl(path);
    return [path, url] as const;
  });

  const json = NextResponse.json({ urls: Object.fromEntries(entries) });
  json.headers.set("Cache-Control", "no-store");
  return json;
}
