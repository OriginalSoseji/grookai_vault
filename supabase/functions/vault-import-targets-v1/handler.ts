import { corsHeaders, corsJson } from "../_shared/cors.ts";

type RpcResult = { data: unknown; error: { code?: string } | null };
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult> };
type Dependencies = {
  requireUser: (request: Request) => Promise<{ userId: string; sb: RpcClient }>;
  createServiceRoleClient: () => RpcClient;
};
type Target = {
  cardId: string; gvId: string; desiredQuantity: number; condition: string;
  acquisitionCost: number | null; createdAt: string | null; notes: string | null;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const optionalString = (value: unknown, max: number) => value === null || value === undefined || (typeof value === "string" && value.length <= max);

function parseTargets(body: unknown): Target[] | null {
  if (!object(body) || !Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 5000) return null;
  const seen = new Set<string>();
  const targets: Target[] = [];
  let total = 0;
  for (const row of body.rows) {
    if (!object(row) || typeof row.cardId !== "string" || !uuid.test(row.cardId) ||
        typeof row.gvId !== "string" || !row.gvId.trim() || row.gvId.length > 200 ||
        !integer(row.desiredQuantity) || row.desiredQuantity < 1 ||
        typeof row.condition !== "string" || !["NM", "LP", "MP", "HP", "DMG"].includes(row.condition) ||
        !optionalString(row.notes, 4000) || !optionalString(row.createdAt, 40) ||
        (row.createdAt != null && (typeof row.createdAt !== "string" || !Number.isFinite(Date.parse(row.createdAt)))) ||
        (row.acquisitionCost != null && (typeof row.acquisitionCost !== "number" || !Number.isFinite(row.acquisitionCost) || row.acquisitionCost < 0))) return null;
    const cardId = row.cardId.toLowerCase();
    if (seen.has(cardId)) return null;
    seen.add(cardId);
    total += row.desiredQuantity;
    if (total > 50000) return null;
    targets.push({ cardId, gvId: row.gvId, desiredQuantity: row.desiredQuantity, condition: row.condition,
      acquisitionCost: row.acquisitionCost as number | null ?? null,
      createdAt: row.createdAt as string | null ?? null, notes: row.notes as string | null ?? null });
  }
  return targets;
}

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_request");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2 * 1024 * 1024) { await reader.cancel(); throw new Error("invalid_request"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

// One admitted request is one database transaction. No per-row writes or fallback.
export function createImportHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return corsJson(405, { error: "method_not_allowed" });
    let auth: Awaited<ReturnType<Dependencies["requireUser"]>>;
    try { auth = await dependencies.requireUser(request); }
    catch (error) {
      const code = (error as { code?: string })?.code;
      return corsJson(code === "missing_bearer_token" || code === "invalid_jwt" ? 401 : 503,
        { error: code === "missing_bearer_token" || code === "invalid_jwt" ? "sign_in_required" : "import_unavailable" });
    }
    let rows: Target[] | null;
    try {
      const body = await readBody(request);
      if (!object(body) || body.ownerUserId !== auth.userId) return corsJson(409, { error: "import_account_changed" });
      rows = parseTargets(body);
    }
    catch { return corsJson(400, { error: "invalid_import_targets" }); }
    if (!rows) return corsJson(400, { error: "invalid_import_targets" });
    // Server-owned attempt identity; never accept a caller's actor/request ID.
    const requestId = crypto.randomUUID();
    try {
      const { data, error } = await dependencies.createServiceRoleClient().rpc("admin_import_vault_receipted_v1", {
        p_user_id: auth.userId, p_request_id: requestId, p_rows: rows,
      });
      if (error) return corsJson(503, { error: error.code === "GV001" ? "vault_paused" : "import_outcome_unconfirmed", requestId });
      if (!object(data) || data.requestId !== requestId) return corsJson(503, { error: "import_outcome_unconfirmed", requestId });
      if (data.success !== true) return corsJson(503, { error: data.error === "vault_paused" ? "vault_paused" : "import_outcome_unconfirmed", requestId });
      if (!object(data) || !integer(data.importedCards) || !integer(data.importedEntries) ||
          data.importedCards > rows.reduce((sum, row) => sum + row.desiredQuantity, 0) ||
          data.importedEntries > rows.length || !Array.isArray(data.targets) || data.targets.length !== rows.length) {
        return corsJson(503, { error: "import_outcome_unconfirmed", requestId });
      }
      const expected = new Map(rows.map(row => [row.cardId, row.desiredQuantity]));
      const proof = new Map<string, number>();
      for (const target of data.targets) {
        if (!object(target) || typeof target.cardPrintId !== "string" || !integer(target.expectedCount) ||
            !expected.has(target.cardPrintId) || proof.has(target.cardPrintId) ||
            target.expectedCount < expected.get(target.cardPrintId)!) return corsJson(503, { error: "import_outcome_unconfirmed", requestId });
        proof.set(target.cardPrintId, target.expectedCount);
      }
      return corsJson(200, { success: true, requestId, importedCards: data.importedCards,
        importedEntries: data.importedEntries, targets: data.targets });
    } catch {
      // A transport failure can follow a commit. Never claim that nothing saved.
      return corsJson(503, { error: "import_outcome_unconfirmed", requestId });
    }
  };
}
