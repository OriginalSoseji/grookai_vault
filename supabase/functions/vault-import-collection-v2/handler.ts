import { corsHeaders, corsJson } from "../_shared/cors.ts";
import {
  ImportValidationError,
  jsonbByteSize,
  normalize,
  number,
  parseCsv,
  setName,
  type SourceRow,
  text,
} from "./source.ts";
type Client = {
  from: (name: string) => any;
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: any; error: any }>;
};
type Dependencies = {
  requireUser: (request: Request) => Promise<{ userId: string; sb: Client }>;
  createServiceRoleClient: () => Client;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const validId = (id: unknown): id is string =>
  typeof id === "string" && uuid.test(id);
type Selection = {
  sourceIndices: number[];
  cardId: string;
  gvId: string;
  cardPrintingId: string | null;
};
type Target = Selection & {
  finishKey: string | null;
  desiredQuantity: number;
  condition: string;
  acquisitionCost: number | null;
  createdAt: string | null;
  createdAtDateOnly: boolean;
  notes: string | null;
};
async function body(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new ImportValidationError("invalid_request");
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2097152) {
        await reader.cancel();
        throw new ImportValidationError("import_size_limit");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
const sourceSignature = (row: SourceRow) =>
  JSON.stringify(Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => !["quantity", "qty"].includes(text(key).toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b)),
  ));
function selections(raw: unknown, count: number): Selection[] {
  if (!Array.isArray(raw) || raw.length > 5000) {
    throw new ImportValidationError("invalid_import_targets");
  }
  const used = new Set<number>();
  return raw.map((row) => {
    if (
      !object(row) || !validId(row.cardId) || typeof row.gvId !== "string" ||
      !row.gvId || row.gvId.length > 200 ||
      !(row.cardPrintingId == null || validId(row.cardPrintingId)) ||
      !Array.isArray(row.sourceIndices) || row.sourceIndices.length === 0 ||
      row.sourceIndices.length > count
    ) throw new ImportValidationError("invalid_import_targets");
    const indices = row.sourceIndices.map((index: unknown) => {
      if (
        typeof index !== "number" || !Number.isInteger(index) || index < 0 ||
        index >= count || used.has(index)
      ) throw new ImportValidationError("invalid_import_source_indices");
      used.add(index);
      return index;
    }).sort((a: number, b: number) => a - b);
    return {
      sourceIndices: indices,
      cardId: row.cardId.toLowerCase(),
      gvId: row.gvId,
      cardPrintingId: row.cardPrintingId?.toLowerCase() ?? null,
    };
  });
}
async function resolveTargets(
  client: Client,
  source: SourceRow[],
  selected: Selection[],
): Promise<Target[]> {
  const targets: Target[] = [];
  let total = 0;
  const byCard = new Map<string, any>(), byPrinting = new Map<string, any>();
  const ids = [...new Set(selected.map((r) => r.cardId))].sort();
  for (let start = 0; start < ids.length; start += 100) {
    const chunk = ids.slice(start, start + 100);
    let after: string | null = null;
    while (true) {
      let query = client.from("card_prints").select(
        "id,gv_id,name,number,sets(name,game)",
      ).in("id", chunk);
      if (after !== null) query = query.gt("id", after);
      const { data, error } = await query.order("id").limit(500);
      if (error || !Array.isArray(data)) throw new Error("catalog_unavailable");
      if (data.length === 0) break;
      for (const row of data) {
        if (!validId(row.id) || (after !== null && row.id <= after)) {
          throw new Error("catalog_pagination_failed");
        }
        byCard.set(row.id, row);
        after = row.id;
      }
    }
    let offset = 0;
    const seen = new Set<string>();
    while (true) {
      const { data, error } = await client.rpc(
        "get_public_card_printing_options_v1",
        { p_card_print_ids: chunk, p_limit: 1000, p_offset: offset },
      );
      if (error || !Array.isArray(data)) {
        throw new Error("printing_catalog_unavailable");
      }
      if (data.length === 0) break;
      for (const row of data) {
        if (!validId(row.id) || seen.has(row.id)) {
          throw new Error("printing_pagination_failed");
        }
        seen.add(row.id);
        byPrinting.set(row.id, row);
      }
      offset += data.length;
    }
  }
  for (const selectedRow of selected) {
    const original = source[selectedRow.sourceIndices[0]],
      base = normalize(original),
      signature = sourceSignature(original);
    let desired = 0;
    for (const index of selectedRow.sourceIndices) {
      if (sourceSignature(source[index]) !== signature) {
        throw new ImportValidationError("import_metadata_conflict");
      }
      desired += normalize(source[index]).quantity;
    }
    total += desired;
    if (total > 50000) throw new ImportValidationError("import_quantity_limit");
    const card = byCard.get(selectedRow.cardId),
      set = Array.isArray(card?.sets) ? card.sets[0] : card?.sets;
    if (
      !card || card.gv_id !== selectedRow.gvId || !object(set) ||
      (base.game && set.game !== base.game) ||
      text(card.name ?? "").toLowerCase() !== base.name ||
      setName(set.name ?? "", base.game) !== base.set ||
      number(card.number ?? "") !== base.number
    ) throw new ImportValidationError("import_card_identity_mismatch");
    let finishKey = base.finishKey;
    if (finishKey === null) {
      const options = [...byPrinting.values()].filter(option =>
        option.card_print_id === card.id && option.finish_is_active === true);
      if (options.length !== 1 || options[0].id !== selectedRow.cardPrintingId) {
        throw new ImportValidationError("import_printing_requires_review");
      }
      finishKey = options[0].finish_key;
    }
    if (finishKey !== null) {
      const printing = byPrinting.get(selectedRow.cardPrintingId ?? "");
      if (
        !printing || printing.card_print_id !== card.id ||
        printing.finish_key !== finishKey ||
        printing.finish_is_active !== true
      ) throw new ImportValidationError("import_printing_identity_mismatch");
      if (
        [...byPrinting.values()].filter((option) =>
          option.card_print_id === card.id &&
          option.finish_key === finishKey &&
          option.finish_is_active === true
        ).length !== 1
      ) throw new ImportValidationError("import_printing_requires_review");
    } else if (selectedRow.cardPrintingId !== null) {
      throw new ImportValidationError("import_finish_requires_review");
    }
    targets.push({
      ...selectedRow,
      finishKey,
      desiredQuantity: desired,
      condition: base.condition,
      acquisitionCost: base.acquisitionCost,
      createdAt: base.createdAt,
      createdAtDateOnly: base.createdAtDateOnly,
      notes: base.notes,
    });
  }
  return targets;
}
export function createCollectionImportHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return corsJson(405, { error: "method_not_allowed" });
    }
    let auth: Awaited<ReturnType<Dependencies["requireUser"]>>;
    try {
      auth = await dependencies.requireUser(request);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const unauthorized = ["missing_bearer_token", "invalid_jwt"].includes(
        code ?? "",
      );
      return corsJson(unauthorized ? 401 : 503, {
        error: unauthorized ? "sign_in_required" : "import_unavailable",
      });
    }
    let requestId: string,
      sourceSha256: string,
      sourceRows: SourceRow[],
      targets: Target[];
    try {
      const input = await body(request);
      if (!object(input) || input.ownerUserId !== auth.userId) {
        return corsJson(409, { error: "import_account_changed" });
      }
      if (!validId(input.requestId) || typeof input.csvText !== "string") {
        throw new ImportValidationError("invalid_request");
      }
      requestId = input.requestId;
      sourceRows = parseCsv(input.csvText);
      const selected = selections(input.targets, sourceRows.length);
      targets = await resolveTargets(auth.sb, sourceRows, selected);
      sourceSha256 = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(input.csvText),
          ),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      if (
        jsonbByteSize(sourceRows) + jsonbByteSize(targets) > 2097152
      ) throw new ImportValidationError("import_size_limit");
    } catch (error) {
      if (error instanceof ImportValidationError) {
        return corsJson(400, { error: error.message });
      }
      if (error instanceof SyntaxError) {
        return corsJson(400, { error: "invalid_request" });
      }
      return corsJson(503, { error: "catalog_unavailable" });
    }
    try {
      const { data, error } = await dependencies.createServiceRoleClient().rpc(
        "admin_import_vault_collection_v2",
        {
          p_user_id: auth.userId,
          p_request_id: requestId,
          p_source_sha256: sourceSha256,
          p_source_rows: sourceRows,
          p_targets: targets,
        },
      );
      if (error || !object(data) || data.requestId !== requestId) {
        return corsJson(503, {
          error: "import_outcome_unconfirmed",
          requestId,
        });
      }
      if (data.success !== true) {
        return corsJson(data.error === "import_request_conflict" ? 409 : 422, {
          error: data.error === "vault_paused"
            ? "vault_paused"
            : data.error === "import_request_conflict"
            ? "import_request_conflict"
            : "import_failed",
          requestId,
        });
      }
      if (
        data.sourceSha256 !== sourceSha256 ||
        data.sourceRows !== sourceRows.length ||
        !Number.isSafeInteger(data.reviewRows) || data.reviewRows < 0 ||
        data.reviewRows > sourceRows.length ||
        !Number.isSafeInteger(data.importedCards) || data.importedCards < 0 ||
        data.importedCards >
          targets.reduce((sum, row) => sum + row.desiredQuantity, 0) ||
        !Number.isSafeInteger(data.importedEntries) ||
        data.importedEntries < 0 || data.importedEntries > targets.length ||
        !Array.isArray(data.targets) || data.targets.length !== targets.length
      ) {
        return corsJson(503, {
          error: "import_outcome_unconfirmed",
          requestId,
        });
      }
      const expected = new Map(
        targets.map((row) => [JSON.stringify(row.sourceIndices), row]),
      );
      const returnedIds = new Set<string>();
      for (const target of data.targets) {
        if (
          !object(target) || !Array.isArray(target.sourceIndices) ||
          !Array.isArray(target.instanceIds)
        ) {
          return corsJson(503, {
            error: "import_outcome_unconfirmed",
            requestId,
          });
        }
        const key = JSON.stringify(target.sourceIndices),
          row = expected.get(key);
        if (
          !row || target.cardId !== row.cardId ||
          target.cardPrintingId !== row.cardPrintingId ||
          target.instanceIds.length !== row.desiredQuantity ||
          target.instanceIds.some((id: unknown) => !validId(id)) ||
          new Set(target.instanceIds).size !== target.instanceIds.length
        ) {
          return corsJson(503, {
            error: "import_outcome_unconfirmed",
            requestId,
          });
        }
        for (const id of target.instanceIds) {
          if (returnedIds.has(id)) {
            return corsJson(503, {
              error: "import_outcome_unconfirmed",
              requestId,
            });
          }
          returnedIds.add(id);
        }
        expected.delete(key);
      }
      return corsJson(200, data);
    } catch {
      return corsJson(503, { error: "import_outcome_unconfirmed", requestId });
    }
  };
}
