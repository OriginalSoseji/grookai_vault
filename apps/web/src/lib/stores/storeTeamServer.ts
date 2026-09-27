import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { STORE_NO_STORE } from "./storefrontServer";

export const teamJson = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: STORE_NO_STORE });
export function teamFailure(error: unknown) {
  const code = (error as { code?: string })?.code;
  const status = code === "401" ? 401 : code === "42501" ? 403 : code === "PT409" ? 409 : 400;
  return teamJson({ error: code === "401" ? "Sign in to continue." : code === "42501"
    ? "This account does not have access. Invitations require the matching verified email."
    : code === "PT409" ? "This item changed. Reload before saving." : "Change could not be saved. Check the details and try again." }, status);
}
export async function teamClient(request: NextRequest, mutation = false) {
  if (mutation && request.headers.get("origin") !== getSiteOrigin()) throw { code: "42501" };
  const client = await createServerComponentClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw { code: "401" };
  return client;
}
export function teamUuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid identifier");
  return value;
}
export async function teamBody(request: NextRequest) {
  if (!request.body) throw new Error("Missing body");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length;
    if (length > 8192) { await reader.cancel(); throw new Error("Request too large"); } chunks.push(value); }
  const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request");
  return body as Record<string, unknown>;
}
