import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestedTarget = {
  vaultItemId?: unknown;
  cardPrintId?: unknown;
};

type ContactTargetRow = {
  vault_item_id: string | null;
  card_print_id: string | null;
  intent: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TARGETS = 100;
const CONTACTABLE_INTENTS = new Set(["trade", "sell", "showcase"]);
const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

function targetKey(vaultItemId: string, cardPrintId: string) {
  return `${vaultItemId}:${cardPrintId}`;
}

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

export async function POST(request: NextRequest) {
  const cookieSink = new NextResponse(null);
  const client = createRouteHandlerClient(request, cookieSink);
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return jsonWithAuthCookies(cookieSink, { eligibleTargetKeys: [] }, 401);
  }

  const payload = (await request.json().catch(() => null)) as { targets?: unknown } | null;
  if (!Array.isArray(payload?.targets) || payload.targets.length > MAX_TARGETS) {
    return jsonWithAuthCookies(
      cookieSink,
      { eligibleTargetKeys: [], error: "Invalid contact targets." },
      400,
    );
  }

  const targetByKey = new Map<string, { vaultItemId: string; cardPrintId: string }>();
  for (const candidate of payload.targets as RequestedTarget[]) {
    const vaultItemId = typeof candidate?.vaultItemId === "string" ? candidate.vaultItemId.trim() : "";
    const cardPrintId = typeof candidate?.cardPrintId === "string" ? candidate.cardPrintId.trim() : "";
    if (!UUID_PATTERN.test(vaultItemId) || !UUID_PATTERN.test(cardPrintId)) {
      return jsonWithAuthCookies(
        cookieSink,
        { eligibleTargetKeys: [], error: "Invalid contact target." },
        400,
      );
    }
    targetByKey.set(targetKey(vaultItemId, cardPrintId), { vaultItemId, cardPrintId });
  }

  const targets = Array.from(targetByKey.values());
  if (targets.length === 0) {
    return jsonWithAuthCookies(cookieSink, { eligibleTargetKeys: [] });
  }

  const { data, error } = await client
    .from("v_card_contact_targets_v1")
    .select("vault_item_id,card_print_id,intent")
    .in("vault_item_id", Array.from(new Set(targets.map((target) => target.vaultItemId))));

  if (error) {
    console.error("[network:contact-eligibility] lookup failed", {
      userId: user.id,
      targetCount: targets.length,
      error: error.message,
    });
    return jsonWithAuthCookies(
      cookieSink,
      { eligibleTargetKeys: [], error: "Contact availability could not be loaded." },
      500,
    );
  }

  const requestedKeys = new Set(targetByKey.keys());
  const eligibleTargetKeys = Array.from(
    new Set(
      ((data ?? []) as ContactTargetRow[])
        .filter((row) => Boolean(row.intent && CONTACTABLE_INTENTS.has(row.intent)))
        .map((row) => {
          const vaultItemId = typeof row.vault_item_id === "string" ? row.vault_item_id.trim() : "";
          const cardPrintId = typeof row.card_print_id === "string" ? row.card_print_id.trim() : "";
          return vaultItemId && cardPrintId ? targetKey(vaultItemId, cardPrintId) : null;
        })
        .filter((key): key is string => Boolean(key && requestedKeys.has(key))),
    ),
  );

  return jsonWithAuthCookies(cookieSink, { eligibleTargetKeys });
}
