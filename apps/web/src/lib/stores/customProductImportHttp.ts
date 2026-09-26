import type { SupabaseClient } from "@supabase/supabase-js";
import { CUSTOM_IMPORT_MAX_BYTES } from "./customProductImport.ts";
import { createCustomImport, readCustomImport, CustomImportError } from "./customProductImportService.ts";
export const IMPORT_HEADERS = {"Cache-Control":"private, no-store", "Vary":"Cookie, Authorization"};
export async function readImportBody(request: Request) {
  const limit = CUSTOM_IMPORT_MAX_BYTES + 1024, length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new CustomImportError("Import request exceeds 1 MiB.", 413);
  if (!request.body) throw new CustomImportError("Choose a CSV to import.");
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new CustomImportError("Import request exceeds 1 MiB.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(bytes)); }
  catch { throw new CustomImportError("Invalid import data."); }
}
export async function handleCustomImport(request: Request, deps: {client: () => Promise<SupabaseClient>; origin: string}) {
  try {
    if (request.method === "GET") {
      const query = new URL(request.url).searchParams;
      if ([...query.keys()].some(k => k !== "id") || query.getAll("id").length !== 1) throw new CustomImportError("Invalid import batch.");
      return Response.json({receipt: await readCustomImport(await deps.client(), query.get("id"))}, {headers:IMPORT_HEADERS});
    }
    if (request.method !== "POST") return new Response("Method not allowed", {status:405, headers:IMPORT_HEADERS});
    if (request.headers.get("origin") !== deps.origin) throw new CustomImportError("Invalid request origin.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new CustomImportError("Send JSON import data.", 415);
    const input = await readImportBody(request);
    return Response.json({receipt: await createCustomImport(await deps.client(), input)}, {headers:IMPORT_HEADERS});
  } catch (error) {
    return Response.json({error: error instanceof CustomImportError ? error.message : "Import could not be confirmed. Keep this page and check its status."},
      {status: error instanceof CustomImportError ? error.status : 503, headers:IMPORT_HEADERS});
  }
}
