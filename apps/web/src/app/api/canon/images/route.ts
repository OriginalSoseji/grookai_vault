import { NextResponse } from "next/server";
import { resolveVaultInstanceMediaUrl } from "@/lib/vault/resolveVaultInstanceMediaUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_PATHS_PER_REQUEST = 100;
const WAREHOUSE_CANON_IMAGE_PREFIX = "warehouse-derived/self-hosted-images-v1/";

function normalizeWarehouseCanonPath(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.length > 512 ||
    normalized.includes("..") ||
    !normalized.startsWith(WAREHOUSE_CANON_IMAGE_PREFIX)
  ) {
    return null;
  }

  return normalized;
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
    new Set(rawPaths.map(normalizeWarehouseCanonPath).filter((path): path is string => Boolean(path))),
  ).slice(0, MAX_PATHS_PER_REQUEST);

  if (paths.length === 0) {
    return NextResponse.json({ urls: {} });
  }

  const entries = await Promise.all(
    paths.map(async (path) => {
      const url = await resolveVaultInstanceMediaUrl(path);
      return [path, url] as const;
    }),
  );

  const json = NextResponse.json({ urls: Object.fromEntries(entries) });
  json.headers.set("Cache-Control", "no-store");
  return json;
}
