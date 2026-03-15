import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import type { WebEventPayload } from "@/lib/telemetry/events";
import { WEB_EVENT_NAMES } from "@/lib/telemetry/events";
import { trackServerEvent } from "@/lib/telemetry/trackServerEvent";

const ANONYMOUS_ID_COOKIE = "grookai-anonymous-id";

function isEventName(value: unknown): value is WebEventPayload["eventName"] {
  return typeof value === "string" && WEB_EVENT_NAMES.includes(value as WebEventPayload["eventName"]);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getSafeAnonymousId(request: NextRequest, response: NextResponse) {
  const existing = request.cookies.get(ANONYMOUS_ID_COOKIE)?.value?.trim();
  if (existing) {
    return existing;
  }

  const generated = `anon_${randomUUID()}`;
  response.cookies.set(ANONYMOUS_ID_COOKIE, generated, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  return generated;
}

async function parseRequestBody(request: NextRequest) {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as Partial<WebEventPayload>;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const body = await parseRequestBody(request);

  if (!body || !isEventName(body.eventName)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const authClient = createRouteHandlerClient(request, response);
  const {
    data: { user },
  } = await authClient.auth.getUser();

  await trackServerEvent({
    eventName: body.eventName,
    userId: user?.id ?? (body.eventName === "account_created" && isUuid(body.userId) ? body.userId : null),
    anonymousId: user ? null : getSafeAnonymousId(request, response),
    path: typeof body.path === "string" ? body.path : null,
    gvId: typeof body.gvId === "string" ? body.gvId : null,
    setCode: typeof body.setCode === "string" ? body.setCode : null,
    searchQuery: typeof body.searchQuery === "string" ? body.searchQuery : null,
    metadata: body.metadata ?? null,
  });

  return response;
}
