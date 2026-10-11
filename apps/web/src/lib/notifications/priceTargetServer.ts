import "server-only";
import {NextRequest, NextResponse} from "next/server";
import {createServerComponentClient} from "@/lib/supabase/server";
export const priceJson = (value: unknown, status = 200) => NextResponse.json(value, {status, headers: {"Cache-Control":"private, no-store, max-age=0", Vary:"Authorization, Cookie"}});
export async function priceActor(request: NextRequest) {
  // Both reads and writes must use the editor's captured bearer. No cookie fallback.
  if (!/^Bearer\s+\S+$/i.test(request.headers.get("authorization") ?? "")) return null;
  const client = await createServerComponentClient();
  const {data:{user},error} = await client.auth.getUser();
  return user && !error ? {client, user} : null;
}
export async function priceBody(request: NextRequest) {
  if (!request.body) throw Error("Missing request");
  const reader = request.body.getReader(), parts: Uint8Array[] = []; let length = 0;
  while (true) {const {done,value} = await reader.read(); if (done) break; length += value.length; if (length > 8192) {await reader.cancel(); throw Error("Request too large");} parts.push(value);}
  return JSON.parse(Buffer.concat(parts).toString("utf8")) as unknown;
}
