export type ExportFields = Record<string, string | number | boolean | null | string[]>;
export type InventoryCopy = {
  kind: "card" | "slab" | "sealed";
  record: ExportFields;
  card: ExportFields | null;
  printing: ExportFields | null;
  certificate: ExportFields | null;
  sealed: ExportFields | null;
  sections: ExportFields[];
};
export type InventoryExport = {
  schema: "grookai-inventory-export-v1"; version: 1; ownerId: string;
  scope: "all_active_owned_copies"; complete: true; capturedAt: string;
  copyCount: number; copies: InventoryCopy[];
};

const invalid = (): never => { throw new Error("The complete inventory export could not be confirmed. Please retry."); };
const uuid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const object = (v: unknown): Record<string, unknown> => {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return invalid();
  return v as Record<string, unknown>;
};
const keys = (v: Record<string, unknown>, expected: string) => {
  if (Object.keys(v).sort().join("|") !== expected.split(" ").sort().join("|")) invalid();
};
const utc = (v: unknown): v is string => typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(v) &&
  Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
const nullableUuid = (v: unknown) => v === null || uuid(v);
const decimal = (v: unknown) => v === null || typeof v === "string" &&
  /^(?:-?\d+(?:\.\d+)?|NaN|Infinity|-Infinity)$/.test(v);
const recordKeys = "id user_id gv_vi_id card_print_id card_printing_id slab_cert_id sealed_product_variant_id legacy_vault_item_id acquisition_cost acquisition_currency condition_label condition_score is_graded grade_company grade_value grade_label notes name set_name intent pricing_mode asking_price_amount asking_price_currency asking_price_note seal_state package_condition photo_url image_source image_url image_back_source image_back_url image_display_mode created_at updated_at";
const cardKeys = "id gv_id name number set_id set_code set_name game_id game_key identity_domain variant_key printed_identity_modifier set_identity_model print_identity_key";
const printingKeys = "id card_print_id printing_gv_id finish_key is_provisional";
const certificateKeys = "id gv_slab_id card_print_id grader cert_number grade qualifiers subgrades_json label_variant label_metadata_json";
const sealedKeys = "id family_id family_name game_key variant_key name package_form language_code region_code edition wave manufacturer_sku upc release_date explicit_contents_json identity_contract_version identity_fingerprint";

function projection(v: unknown, expected: string, special: Record<string, (v: unknown) => boolean> = {}): ExportFields {
  const row = object(v); keys(row, expected);
  for (const [key, value] of Object.entries(row)) {
    if (!(special[key] ? special[key](value) : value === null || typeof value === "string")) invalid();
  }
  return row as ExportFields;
}

/** Validates one complete server snapshot. Does not stitch display pages or calculate prices. */
export function inventoryExport(ownerId: string, input: unknown): InventoryExport {
  const doc = object(input); keys(doc, "schema version ownerId scope complete capturedAt copyCount copies");
  if (!uuid(ownerId) || doc.ownerId !== ownerId || doc.schema !== "grookai-inventory-export-v1" ||
      doc.version !== 1 || doc.scope !== "all_active_owned_copies" || doc.complete !== true || !utc(doc.capturedAt) ||
      !Number.isSafeInteger(doc.copyCount) || (doc.copyCount as number) < 0 || (doc.copyCount as number) > 20000 ||
      !Array.isArray(doc.copies) || doc.copies.length !== doc.copyCount) return invalid();
  const ids = new Set<string>();
  for (const value of doc.copies) {
    const copy = object(value); keys(copy, "kind record card printing certificate sealed sections");
    const r = projection(copy.record, recordKeys, {
      is_graded: v => typeof v === "boolean", condition_score: v => v === null || Number.isSafeInteger(v),
    });
    if (!uuid(r.id) || ids.has(r.id) || r.user_id !== ownerId || !utc(r.created_at) || !utc(r.updated_at)) return invalid();
    ids.add(r.id);
    for (const key of ["card_print_id", "card_printing_id", "slab_cert_id", "sealed_product_variant_id", "legacy_vault_item_id"]) {
      if (!nullableUuid(r[key])) return invalid();
    }
    if ([r.card_print_id, r.slab_cert_id, r.sealed_product_variant_id].filter(v => v !== null).length !== 1 ||
        !decimal(r.acquisition_cost) || !decimal(r.asking_price_amount)) return invalid();
    const kind = r.slab_cert_id !== null ? "slab" : r.sealed_product_variant_id !== null ? "sealed" : "card";
    if (copy.kind !== kind || kind === "sealed" && r.card_printing_id !== null || kind === "slab" && r.is_graded !== true) return invalid();
    const certificate = copy.certificate === null ? null : projection(copy.certificate, certificateKeys, {
      qualifiers: v => v === null || Array.isArray(v) && v.every(x => typeof x === "string"),
    });
    if (certificate && (kind !== "slab" || certificate.id !== r.slab_cert_id || !uuid(certificate.card_print_id) || !decimal(certificate.grade))) return invalid();
    const cardId = r.card_print_id ?? certificate?.card_print_id ?? null;
    const card = copy.card === null ? null : projection(copy.card, cardKeys);
    if (card && (!uuid(card.id) || card.id !== cardId || kind === "sealed")) return invalid();
    const printing = copy.printing === null ? null : projection(copy.printing, printingKeys, {is_provisional: v => typeof v === "boolean"});
    if (printing && (!uuid(printing.id) || printing.id !== r.card_printing_id || printing.card_print_id !== cardId || kind === "sealed")) return invalid();
    const sealed = copy.sealed === null ? null : projection(copy.sealed, sealedKeys);
    if (sealed && (kind !== "sealed" || sealed.id !== r.sealed_product_variant_id || !uuid(sealed.family_id))) return invalid();
    if (!Array.isArray(copy.sections)) return invalid();
    const sectionIds = new Set<string>();
    for (const value of copy.sections) {
      const section = projection(value, "id name position is_public", {
        position: v => Number.isSafeInteger(v), is_public: v => typeof v === "boolean",
      });
      if (!uuid(section.id) || sectionIds.has(section.id) || typeof section.name !== "string") return invalid();
      sectionIds.add(section.id);
    }
  }
  // Detach the validated private snapshot from any mutable SDK response.
  const json = JSON.stringify(doc);
  if (new TextEncoder().encode(json).length > 33554432) return invalid();
  return JSON.parse(json) as InventoryExport;
}

export function inventoryExportJson(snapshot: InventoryExport): string {
  return JSON.stringify(inventoryExport(snapshot.ownerId, snapshot)) + "\n";
}

/** Quoting alone does not neutralize formulas. JSON retains the unmodified value. */
export function inventoryCsvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s\u0000-\u001f\u007f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function inventoryExportCsv(input: InventoryExport): string {
  const doc = inventoryExport(input.ownerId, input);
  const columns = ["Copy ID", "Kind", "GVVI", "Name", "Set", "Number", "Game", "Card ID", "Printing ID", "Finish", "Certificate ID", "Grader", "Certificate number", "Certificate grade", "Sealed variant ID", "Package", "Language", "Condition", "Legacy graded", "Legacy grader", "Legacy grade", "Legacy grade label", "Seal state", "Package condition", "Acquisition cost", "Acquisition currency", "Intent", "Asking amount", "Asking currency", "Asking note", "Notes", "Sections", "Created at", "Updated at", "Photo reference", "Back photo reference", "Captured at"];
  const rows: unknown[][] = [columns];
  for (const copy of doc.copies) {
    const r = copy.record, c = copy.card, cert = copy.certificate, sealed = copy.sealed;
    rows.push([r.id, copy.kind, r.gv_vi_id, r.name ?? c?.name ?? sealed?.name, r.set_name ?? c?.set_name,
      c?.number, c?.game_key ?? sealed?.game_key, r.card_print_id ?? cert?.card_print_id, r.card_printing_id,
      copy.printing?.finish_key, r.slab_cert_id, cert?.grader, cert?.cert_number, cert?.grade,
      r.sealed_product_variant_id, sealed?.package_form, sealed?.language_code, r.condition_label,
      r.is_graded, r.grade_company, r.grade_value, r.grade_label, r.seal_state, r.package_condition,
      r.acquisition_cost, r.acquisition_currency, r.intent, r.asking_price_amount, r.asking_price_currency,
      r.asking_price_note, r.notes, JSON.stringify(copy.sections.map(s => ({id: s.id, name: s.name}))),
      r.created_at, r.updated_at, r.image_url ?? r.photo_url, r.image_back_url, doc.capturedAt]);
  }
  return "\uFEFF" + rows.map(row => row.map(inventoryCsvCell).join(",")).join("\r\n") + "\r\n";
}

export function inventoryExportError(error: unknown): string {
  const e = typeof error === "object" && error !== null ? error as {code?: string; message?: string} : {};
  if (e.message?.includes("inventory_export_too_many_copies")) return "This collection exceeds the current export limit of 20,000 copies. No file was created.";
  if (e.message?.includes("inventory_export_too_large")) return "This collection exceeds the current export file size limit. No file was created.";
  if (e.code === "PGRST202" || e.code === "42883") return "Inventory export is not available on this server yet.";
  return "Your complete inventory could not be loaded. Please retry; no file was created.";
}
