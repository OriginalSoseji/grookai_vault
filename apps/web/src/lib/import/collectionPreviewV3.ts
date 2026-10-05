import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCollectionPreviewV2, importReviewMessage, type CollectionPreviewV2 } from "./collectionPreviewV2.ts";
import { planCollectrSealedIdentities, type SealedCatalogEvidence } from "../../../../../supabase/functions/vault-import-collection-v2/sealed_identity.ts";
import { sealedMetadata } from "../../../../../supabase/functions/vault-import-collection-v2/sealed_metadata.ts";
import type { CollectionAttemptV2, CollectionReceiptV2 } from "./collectionReadbackV2.ts";
import type { SealedSelection } from "../../../../../supabase/functions/vault-import-collection-v2/sealed_targets.ts";

export type CollectionAttemptV3 = Omit<CollectionAttemptV2, "version"> & { version: 3; sealedTargets: SealedSelection[]; sealedAcquisitionCurrency: string | null };
export type CollectionReceiptV3 = CollectionReceiptV2 & { version: 3; importedSealed: number; sealedTargets: (SealedSelection & {objectKind: "sealed"; instanceIds: string[]})[] };
export type CollectionPreviewV3 = CollectionPreviewV2 & { version: 3; sealedAcquisitionCurrency: string | null; sealedImportEnabled: boolean };
export type CollectionAttempt = CollectionAttemptV2 | CollectionAttemptV3;
export type CollectionReceipt = CollectionReceiptV2 | CollectionReceiptV3;
export type CollectionPreview = CollectionPreviewV2 | CollectionPreviewV3;
export const isV3Preview = (preview: CollectionPreview): preview is CollectionPreviewV3 => "version" in preview && preview.version === 3;
export const importReady = (row: CollectionPreviewV2["rows"][number]) => !!(row.selection || row.sealedSelection);
export function mixedImportCounts(preview: CollectionPreviewV2) {
  return { cards: preview.rows.reduce((n,r)=>n+(r.selection ? r.quantity ?? 0 : 0),0), sealed: preview.rows.reduce((n,r)=>n+(r.sealedSelection ? r.quantity ?? 0 : 0),0) };
}
const reasons: Record<string,string> = {
  missing_identity: "No exact sealed product match was found. Keep this row for review.",
  unreleased_identity: "This sealed product is not available for import yet.",
  set_review: "The source set does not agree with the sealed catalog. Check the original details.",
  language_review: "The product language needs review.", ambiguous_identity: "More than one sealed product matches. The package identity needs review.",
  variant_review: "The product's region, edition or release wave needs review.", grade_review: "Graded items need review; they cannot be saved as sealed products.",
  finish_review: "This finish cannot be applied to a sealed product.", watchlist_review: "Watchlist items are not owned inventory.",
  unsupported_game: "This game's sealed products are not supported for import.", invalid_quantity: "The quantity must be a positive whole number.",
  import_currency_requires_review: "Choose the purchase currency to import this sealed product's cost.",
  conflicting_import_currency: "The chosen currency conflicts with this row's recorded currency.",
  invalid_import_currency: "Use a three-letter purchase currency code.", conflicting_sealed_metadata: "Conflicting source details need review.",
};
export function combineSealedPreview(cards: CollectionPreviewV2, csv: string, catalog: SealedCatalogEvidence, enabled: boolean, currency: string | null): CollectionPreviewV3 {
  if (currency !== null && !/^[A-Z]{3}$/.test(currency)) throw new Error("invalid_import_currency");
  const unresolved = cards.rows.filter(r=>!r.selection).flatMap(r=>r.sourceIndices);
  const plans = new Map(planCollectrSealedIdentities(csv,catalog,unresolved).rows.map(r=>[r.sourceIndex,r]));
  const rows = cards.rows.map(row=>{
    const plan = plans.get(row.sourceIndices[0]);
    if (!plan || plan.status === "card_path" || row.sourceIndices.length !== 1) return row;
    let reason: string | null = reasons[plan.status] ?? row.reason;
    let selection: SealedSelection | null = null;
    if (plan.status === "exact_identity") {
      try {
        sealedMetadata(row.source,currency);
        if (!enabled) reason = "Sealed-product imports are not available for this account yet. This row will stay in review.";
        else { selection = { sourceIndices:[...row.sourceIndices],sealedVariantId:plan.candidates[0].variantId }; reason = null; }
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        reason = reasons[code] ?? importReviewMessage(code);
      }
    }
    return { ...row, quantity:plan.quantity ?? row.quantity, sealedSelection:selection, sealedStatus:plan.status,
      matchedName:selection ? plan.candidates[0].name : row.matchedName, finish:null, reason };
  });
  const ready = rows.filter(importReady), readyCopies = ready.reduce((n,r)=>n+(r.quantity??0),0), readyRows=ready.reduce((n,r)=>n+r.sourceIndices.length,0);
  if(readyCopies>50000)throw new Error("invalid_import_quantity");
  return {...cards,version:3,rows,readyRows,readyCopies,reviewRows:cards.sourceRows-readyRows,sealedAcquisitionCurrency:currency,sealedImportEnabled:enabled};
}
export async function buildCollectionPreviewV3(client: SupabaseClient, owner: string, csv: string, enabled: boolean, currency: string | null) {
  const cards = await buildCollectionPreviewV2(client,owner,csv);
  const catalog = await client.rpc("get_collection_import_sealed_catalog_v3");
  if(catalog.error)throw new Error("sealed_catalog_unavailable");
  return combineSealedPreview(cards,csv,catalog.data,enabled,currency);
}
