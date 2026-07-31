import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CORRECTION_TYPES = new Set([
  "character_not_present",
  "wrong_role",
  "wrong_object",
  "missing_detail",
]);
const MAX_ARTWORK_GROUP_ID_LENGTH = 240;
const MAX_QUERY_LENGTH = 180;
const MAX_DETAIL_LENGTH = 1000;
const MAX_EVIDENCE_BYTES = 64 * 1024;
const MAX_EVIDENCE_ITEMS = 100;
const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

type CorrectionPayload = {
  cardPrintId?: unknown;
  artworkGroupId?: unknown;
  originalQuery?: unknown;
  correctionType?: unknown;
  detail?: unknown;
  evidence?: unknown;
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

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalizeJson(nestedValue)]),
    );
  }
  return value;
}

export async function POST(request: NextRequest) {
  const cookieSink = new NextResponse(null);
  const client = createRouteHandlerClient(request, cookieSink);
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return jsonWithAuthCookies(
      cookieSink,
      { ok: false, error: "Sign in required." },
      401,
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | CorrectionPayload
    | null;
  const cardPrintId =
    typeof payload?.cardPrintId === "string" ? payload.cardPrintId.trim() : "";
  const artworkGroupId =
    typeof payload?.artworkGroupId === "string"
      ? payload.artworkGroupId.trim()
      : "";
  const originalQuery =
    typeof payload?.originalQuery === "string"
      ? payload.originalQuery.trim()
      : "";
  const correctionType =
    typeof payload?.correctionType === "string"
      ? payload.correctionType.trim()
      : "";
  const detail =
    typeof payload?.detail === "string" ? payload.detail.trim() : "";

  if (!UUID_PATTERN.test(cardPrintId)) {
    return jsonWithAuthCookies(
      cookieSink,
      { ok: false, error: "Invalid card reference." },
      400,
    );
  }
  if (
    !artworkGroupId ||
    artworkGroupId.length > MAX_ARTWORK_GROUP_ID_LENGTH
  ) {
    return jsonWithAuthCookies(
      cookieSink,
      { ok: false, error: "Invalid artwork reference." },
      400,
    );
  }
  if (originalQuery.length < 2 || originalQuery.length > MAX_QUERY_LENGTH) {
    return jsonWithAuthCookies(
      cookieSink,
      { ok: false, error: "Invalid search query." },
      400,
    );
  }
  if (!CORRECTION_TYPES.has(correctionType)) {
    return jsonWithAuthCookies(
      cookieSink,
      { ok: false, error: "Invalid correction type." },
      400,
    );
  }
  if (detail.length > MAX_DETAIL_LENGTH) {
    return jsonWithAuthCookies(
      cookieSink,
      { ok: false, error: "Correction detail is too long." },
      400,
    );
  }
  if (
    !Array.isArray(payload?.evidence) ||
    payload.evidence.length === 0 ||
    payload.evidence.length > MAX_EVIDENCE_ITEMS
  ) {
    return jsonWithAuthCookies(
      cookieSink,
      { ok: false, error: "Invalid evidence snapshot." },
      400,
    );
  }

  const evidenceJson = JSON.stringify(canonicalizeJson(payload.evidence));
  if (Buffer.byteLength(evidenceJson, "utf8") > MAX_EVIDENCE_BYTES) {
    return jsonWithAuthCookies(
      cookieSink,
      { ok: false, error: "Evidence snapshot is too large." },
      400,
    );
  }
  const evidenceSnapshotHash = createHash("sha256")
    .update(evidenceJson)
    .digest("hex");

  const { data: correctionId, error } = await client.rpc(
    "submit_card_visual_search_correction_v2",
    {
      card_print_id_in: cardPrintId,
      artwork_group_id_in: artworkGroupId,
      original_query_in: originalQuery,
      correction_type_in: correctionType,
      detail_in: detail || null,
      evidence_snapshot_hash_in: evidenceSnapshotHash,
    },
  );

  if (error || !correctionId) {
    console.error("[visual-search:correction] staging failed", {
      userId: user.id,
      artworkGroupId,
      correctionType,
      error: error?.message ?? "missing correction id",
    });
    return jsonWithAuthCookies(
      cookieSink,
      { ok: false, error: "Correction could not be saved." },
      503,
    );
  }

  return jsonWithAuthCookies(cookieSink, {
    ok: true,
    correctionId,
  });
}
