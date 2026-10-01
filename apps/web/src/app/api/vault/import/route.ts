import { createServerComponentClient } from "@/lib/supabase/server";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { buildCollectionPreviewV2 } from "@/lib/import/collectionPreviewV2";
import { verifyCollectionReadbackV2, type CollectionAttemptV2, type CollectionReceiptV2 } from "@/lib/import/collectionReadbackV2";
import { createCollectionImportHandler } from "../../../../../../../supabase/functions/vault-import-collection-v2/handler.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  // The cookie-authenticated endpoint is same-origin only, including save retries.
  const siteOrigin = new URL(process.env.SITE_URL ?? request.url).origin;
  if (request.headers.get("origin") !== siteOrigin) return reply({ error: "Import requests must come from this website." }, 403);
  const client = await createServerComponentClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return reply({ error: "Sign in to import your collection." }, 401);
  let input: { operation: string; ownerUserId: string; csvText: string; attempt?: CollectionAttemptV2 };
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Choose a Collectr CSV." }, 400);
    const parts: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2097152) { await reader.cancel(); return reply({ error: "This import exceeds the 2 MiB request limit." }, 413); }
        parts.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!input || input.ownerUserId !== user.id) return reply({ error: "Sign in to the account that started this import." }, 409);
  } catch { return reply({ error: "This import request could not be read." }, 400); }
  if (input.operation === "preview") {
    if (typeof input.csvText !== "string") return reply({ error: "Choose a Collectr CSV." }, 400);
    try { return reply(await buildCollectionPreviewV2(client, user.id, input.csvText)); }
    catch { return reply({ error: "The CSV or complete catalog could not be read. Nothing was saved. Check the file and retry." }, 422); }
  }
  if (input.operation !== "save" || !input.attempt || input.attempt.version !== 2 || input.attempt.ownerUserId !== user.id) return reply({ error: "This import request is invalid." }, 400);
  const attempt = input.attempt;
  try {
    const result = await executeOwnerWriteV1({
      execution_name: "import_vault_collection_v2", actor_id: user.id,
      write: async context => {
        // Reuse the Edge validator, including its original CSV parser, complete
        // catalog checks and one atomic receipt-backed SQL call.
        const handler = createCollectionImportHandler({
          requireUser: async () => ({ userId: user.id, sb: client }),
          createServiceRoleClient: () => context.adminClient,
        });
        const response = await handler(new Request("https://import.internal/", { method: "POST", body: JSON.stringify(attempt) }));
        return { status: response.status, data: await response.json() };
      },
      proofs: [async ({ result }) => {
        if (result.status === 200) await verifyCollectionReadbackV2(client, attempt, result.data as CollectionReceiptV2);
      }],
    });
    if (result.status === 200) return reply(result.data);
    const code = result.data?.error;
    return reply({ code, retryWithNewRequest: result.status === 422,
      error: result.status === 422 ? "This attempt was not saved. Retry to start a new attempt."
        : result.status === 400 ? "These rows could not be validated. Keep the original file and refresh its preview."
        : code === "import_request_conflict" ? "This attempt has different saved details. Keep the original file and check your Vault."
        : "The save result could not be confirmed. Retry this same import safely." }, result.status);
  } catch { return reply({ error: "The save result could not be confirmed. Retry this same import safely." }, 503); }
}
