import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { resolveVisualSearchReviewerAccess } from "@/lib/review/visualSearchReviewerAccess";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const BUNDLE_DIR = path.join(
  process.cwd(),
  "private",
  "review",
  "visual-search",
);
const BUNDLE_FILE = "CALIBRATION_REVIEW_DASHBOARD.html.br";
const MANIFEST_FILE = "manifest.json";

type PortalBundleManifest = {
  bundle_version: string;
  bundle_sha256: string;
  packet_run_key: string;
  calibration_query_count: number;
  holdout_query_count: number;
  server_writes: boolean;
};

function sha256(value: Uint8Array) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function privateHeaders(manifest?: PortalBundleManifest) {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Security-Policy": [
      "default-src 'none'",
      "img-src https://grookaivault.com data:",
      "style-src 'unsafe-inline'",
      "script-src 'unsafe-inline'",
      "connect-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'self'",
    ].join("; "),
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    ...(manifest
      ? {
          "X-Grookai-Review-Bundle": manifest.bundle_version,
          "X-Grookai-Review-Run": manifest.packet_run_key,
        }
      : {}),
  };
}

export async function GET(request: NextRequest) {
  const cookieSink = new NextResponse(null);
  const supabase = createRouteHandlerClient(request, cookieSink);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Sign in required.", {
      status: 401,
      headers: privateHeaders(),
    });
  }

  const access = await resolveVisualSearchReviewerAccess(user);
  if (!access.allowed) {
    return new NextResponse("Not found.", {
      status: 404,
      headers: privateHeaders(),
    });
  }

  const [manifestText, bundle] = await Promise.all([
    fs.readFile(path.join(BUNDLE_DIR, MANIFEST_FILE), "utf8"),
    fs.readFile(path.join(BUNDLE_DIR, BUNDLE_FILE)),
  ]);
  const manifest = JSON.parse(manifestText) as PortalBundleManifest;

  if (
    manifest.server_writes !== false ||
    manifest.holdout_query_count !== 0 ||
    manifest.calibration_query_count !== 200 ||
    sha256(bundle) !== manifest.bundle_sha256
  ) {
    return new NextResponse("Review bundle failed integrity validation.", {
      status: 503,
      headers: privateHeaders(),
    });
  }

  const response = new NextResponse(new Uint8Array(bundle), {
    status: 200,
    headers: {
      ...privateHeaders(manifest),
      "Content-Type": "text/html; charset=utf-8",
      "Content-Encoding": "br",
      "Content-Length": String(bundle.byteLength),
      "Content-Disposition": "inline",
      Vary: "Cookie",
    },
  });

  for (const cookie of cookieSink.cookies.getAll()) {
    response.cookies.set(cookie);
  }

  return response;
}
