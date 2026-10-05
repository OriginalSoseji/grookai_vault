// Candidate adapter only. Existing V2 routes remain unchanged until qualification.
import { corsHeaders, corsJson } from "../_shared/cors.ts";
import { body, selections, resolveTargets, type Dependencies } from "./handler.ts";
import { field, ImportValidationError, jsonbByteSize, parseCsv, text } from "./source.ts";
import { sealedMetadata } from "./sealed_metadata.ts";
import { sealedSelections, resolveSealedTargets } from "./sealed_targets.ts";

const id = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), b => b.toString(16).padStart(2, "0")).join("");
const canonical = (v: any): string => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : object(v) ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}` : JSON.stringify(v);

export function createImportHandlerV3(dependencies: Dependencies & { allowNewRequest?: boolean }) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return corsJson(405, { error: "method_not_allowed" });
    let auth;
    try { auth = await dependencies.requireUser(request); }
    catch { return corsJson(401, { error: "sign_in_required" }); }
    let requestId: string | undefined, writing = false;
    try {
      const input = await body(request);
      if (!object(input) || input.ownerUserId !== auth.userId) return corsJson(409, { error: "import_account_changed" });
      if (!id(input.requestId) || typeof input.csvText !== "string" ||
        !(input.sealedAcquisitionCurrency == null || typeof input.sealedAcquisitionCurrency === "string")) throw new ImportValidationError("invalid_request");
      requestId = input.requestId.toLowerCase();
      const source = parseCsv(input.csvText), cards = selections(input.targets, source.length);
      const sealed = sealedSelections(input.sealedTargets, source.length, new Set(cards.flatMap(c => c.sourceIndices)));
      if (cards.length + sealed.length > 5000) throw new ImportValidationError("invalid_import_targets");
      const currency = input.sealedAcquisitionCurrency?.trim().toUpperCase() || null;
      const sourceSha256 = await hash(input.csvText);
      const requestSha256 = await hash(canonical({ owner: auth.userId, source: sourceSha256, cards, sealed, currency }));
      const cardCounts = cards.map(c => c.sourceIndices.reduce((n, i) => {
        // Parse only quantity for receipt verification; no catalog lookup on recovery.
        const value = text(field(source[i], "quantity", "qty")).replaceAll(",", "") || "1";
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new ImportValidationError("invalid_import_quantity");
        return n + Number(value);
      }, 0));
      const sealedCounts = sealed.map(s => s.sourceIndices.reduce((n, i) => n + sealedMetadata(source[i], currency).quantity, 0));
      if ([...cardCounts, ...sealedCounts].reduce((a, b) => a + b, 0) > 50000) throw new ImportValidationError("invalid_import_quantity");
      const respond = (data: unknown): Response => {
        const unconfirmed = () => corsJson(503, { error: "import_outcome_unconfirmed", requestId });
        if (!object(data) || data.requestId !== requestId) return unconfirmed();
        if (data.success !== true) return corsJson(data.error === "import_request_conflict" ? 409 : 422,
          { error: ["import_request_conflict", "vault_paused"].includes(data.error) ? data.error : "import_failed", requestId });
        if (data.version !== 3 || data.sourceSha256 !== sourceSha256 || data.sourceRows !== source.length ||
          !Number.isSafeInteger(data.reviewRows) || data.reviewRows < 0 || data.reviewRows > source.length ||
          !Number.isSafeInteger(data.importedEntries) || data.importedEntries < 0 || data.importedEntries > cards.length + sealed.length) return unconfirmed();
        const copyIds = new Set<string>();
        for (const [expected, counts, returned, added, kind] of [
          [cards, cardCounts, data.targets, data.importedCards, "card"],
          [sealed, sealedCounts, data.sealedTargets, data.importedSealed, "sealed"],
        ] as const) {
          if (!Array.isArray(returned) || returned.length !== expected.length || !Number.isSafeInteger(added) || added < 0 || added > counts.reduce((a, b) => a + b, 0)) return unconfirmed();
          const remaining = new Map(expected.map((s, i) => [JSON.stringify(s.sourceIndices), { s, count: counts[i] }]));
          for (const r of returned) {
            if (!object(r) || !Array.isArray(r.sourceIndices) || !Array.isArray(r.instanceIds)) return unconfirmed();
            const k = JSON.stringify(r.sourceIndices), entry = remaining.get(k);
            if (!entry || r.instanceIds.length !== entry.count) return unconfirmed();
            const s = entry.s as any;
            if (kind === "sealed" ? r.objectKind !== "sealed" || r.sealedVariantId !== s.sealedVariantId : r.cardId !== s.cardId || r.cardPrintingId !== s.cardPrintingId) return unconfirmed();
            for (const copy of r.instanceIds) { if (!id(copy) || copyIds.has(copy.toLowerCase())) return unconfirmed(); copyIds.add(copy.toLowerCase()); }
            remaining.delete(k);
          }
        }
        return corsJson(200, data);
      };
      // Read the durable original receipt before catalog/rollout validation.
      const receipt = await auth.sb.rpc("get_collection_import_receipt_v3", { p_request_id: requestId, p_request_sha256: requestSha256 });
      if (receipt.error) throw new Error("receipt_unavailable");
      if (receipt.data !== null) return respond(receipt.data);
      if (dependencies.allowNewRequest === false) return corsJson(422, {error:"sealed_import_disabled",requestId});
      const cardTargets = await resolveTargets(auth.sb, source, cards);
      let sealedTargets: ReturnType<typeof resolveSealedTargets> = [];
      if (sealed.length) {
        const catalog = await auth.sb.rpc("get_collection_import_sealed_catalog_v3", {});
        if (catalog.error) throw new Error("catalog_unavailable");
        sealedTargets = resolveSealedTargets(input.csvText, catalog.data, sealed, currency);
      }
      if (jsonbByteSize(source) + jsonbByteSize(cardTargets) + jsonbByteSize(sealedTargets) > 2097152) throw new ImportValidationError("import_size_limit");
      writing = true;
      const result = await dependencies.createServiceRoleClient().rpc("admin_import_vault_collection_v3", {
        p_user_id: auth.userId, p_request_id: requestId, p_request_sha256: requestSha256, p_source_sha256: sourceSha256,
        p_source_rows: source, p_card_targets: cardTargets, p_sealed_targets: sealedTargets,
      });
      if (result.error) throw new Error("unconfirmed");
      return respond(result.data);
    } catch (error) {
      if (error instanceof ImportValidationError) return corsJson(400, { error: error.message });
      if (error instanceof SyntaxError) return corsJson(400, { error: "invalid_request" });
      return corsJson(503, { error: writing ? "import_outcome_unconfirmed" : "import_unavailable", ...(requestId ? { requestId } : {}) });
    }
  };
}
