import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  PublicProvisionalCard,
  PublicProvisionalLabel,
  PublicProvisionalState,
} from "@/lib/provisional/publicProvisionalTypes";
import { PROVISIONAL_NOT_CANON_COPY, PROVISIONAL_SOURCE_COPY } from "@/lib/provisional/provisionalProductCopy";

type JsonRecord = Record<string, unknown>;

// LOCK: Public provisional warehouse access must flow only through this adapter.
// LOCK: Do not expose raw warehouse rows. Enforce contract whitelist only.
export type PublicProvisionalWarehouseCandidateRow = {
  id: string | null;
  gv_id?: unknown;
  state: string | null;
  submission_intent: string | null;
  promoted_card_print_id: string | null;
  proposed_action_type: string | null;
  identity_audit_status: string | null;
  claimed_identity_payload: JsonRecord | null;
  reference_hints_payload: JsonRecord | null;
  created_at: string | null;
};

export const ALLOWED_STATES = [
  "RAW",
  "NORMALIZED",
  "CLASSIFIED",
  "REVIEW_READY",
] as const satisfies readonly PublicProvisionalState[];

const EXCLUDED_IDENTITY_AUDIT_STATUSES = new Set([
  "ALIAS",
  "SLOT_CONFLICT",
  "AMBIGUOUS",
  "PRINTING_ONLY",
]);

const EXCLUDED_PROPOSED_ACTION_TYPES = new Set([
  "ENRICH_CANON_IMAGE",
  "CREATE_CARD_PRINTING",
  "BLOCKED_NO_PROMOTION",
]);

const PUBLIC_PROVISIONAL_SELECT = [
  "id",
  "state",
  "submission_intent",
  "promoted_card_print_id",
  "proposed_action_type",
  "identity_audit_status",
  "claimed_identity_payload",
  "reference_hints_payload",
  "created_at",
].join(",");

function createPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeUpper(value: unknown) {
  return normalizeText(value).toUpperCase();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export function isPublicProvisionalCandidateId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function firstText(records: Array<JsonRecord | null>, keys: string[]) {
  for (const record of records) {
    if (!record) continue;

    for (const key of keys) {
      const normalized = normalizeText(record[key]);
      if (normalized) return normalized;
    }
  }

  return "";
}

function getIdentityRecords(row: PublicProvisionalWarehouseCandidateRow) {
  return [asRecord(row.claimed_identity_payload), asRecord(row.reference_hints_payload)];
}

export function deriveDisplayName(row: PublicProvisionalWarehouseCandidateRow) {
  return firstText(getIdentityRecords(row), ["display_name", "card_name", "name"]);
}

export function deriveSetHint(row: PublicProvisionalWarehouseCandidateRow) {
  return firstText(getIdentityRecords(row), [
    "set_hint",
    "set_code",
    "effective_set_code",
    "effective_routed_set_code",
    "set_name",
    "effective_set_name",
  ]);
}

export function deriveNumberHint(row: PublicProvisionalWarehouseCandidateRow) {
  return firstText(getIdentityRecords(row), [
    "printed_number",
    "number",
    "number_plain",
    "normalized_number_plain",
    "normalized_number_left",
  ]);
}

function getPotentialImageUrls(record: JsonRecord | null): string[] {
  if (!record) return [];

  const candidates = [
    record.image_url,
    record.public_image_url,
    record.external_image_url,
    record.source_image_url,
    record.imageUrl,
  ];
  const snapshot = asRecord(record.source_card_snapshot);
  if (snapshot) {
    candidates.push(snapshot.image_url, snapshot.public_image_url, snapshot.imageUrl);
  }

  return candidates.map(normalizeText).filter(Boolean);
}

export function isPublicSafeProvisionalImageUrl(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  const lowered = normalized.toLowerCase();

  try {
    const url = new URL(normalized);
    if (!lowered.startsWith("http://") && !lowered.startsWith("https://")) {
      return false;
    }

    if (lowered.includes("storage") || lowered.includes("signed")) {
      return false;
    }

    if (url.searchParams.has("token") || url.searchParams.has("signature") || url.searchParams.has("expires")) {
      return false;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function safeImage(row: PublicProvisionalWarehouseCandidateRow) {
  const [claimed, reference] = getIdentityRecords(row);
  const candidate = [...getPotentialImageUrls(claimed), ...getPotentialImageUrls(reference)].find(
    isPublicSafeProvisionalImageUrl,
  );

  return candidate ?? null;
}

export function mapState(state: string | null): PublicProvisionalState | null {
  const normalized = normalizeUpper(state);
  return ALLOWED_STATES.includes(normalized as PublicProvisionalState)
    ? (normalized as PublicProvisionalState)
    : null;
}

export function mapLabel(state: PublicProvisionalState): PublicProvisionalLabel {
  return state === "RAW" ? "UNCONFIRMED" : "UNDER REVIEW";
}

export function mapExplanation(state: PublicProvisionalState) {
  if (state === "RAW") {
    return PROVISIONAL_NOT_CANON_COPY;
  }

  return "Visible while under review.";
}

export function safeSource(row: PublicProvisionalWarehouseCandidateRow) {
  const reference = asRecord(row.reference_hints_payload);
  if (normalizeText(reference?.bridge_source) !== "external_discovery_bridge_v1") {
    return undefined;
  }

  return PROVISIONAL_SOURCE_COPY;
}

export function isPublicProvisionalWarehouseRowEligible(row: PublicProvisionalWarehouseCandidateRow) {
  const state = mapState(row.state);
  if (normalizeText(row.promoted_card_print_id)) {
    throw new Error("SECURITY: Promoted row leaked into provisional adapter");
  }
  if (normalizeText(row.gv_id)) {
    throw new Error("SECURITY: GV-ID found on provisional row");
  }
  if (!row.id || !state) return false;
  if (normalizeUpper(row.submission_intent) !== "MISSING_CARD") return false;
  if (normalizeText(asRecord(row.reference_hints_payload)?.bridge_source) !== "external_discovery_bridge_v1") {
    return false;
  }

  const identityAuditStatus = normalizeUpper(row.identity_audit_status);
  if (identityAuditStatus && EXCLUDED_IDENTITY_AUDIT_STATUSES.has(identityAuditStatus)) {
    return false;
  }

  const proposedActionType = normalizeUpper(row.proposed_action_type);
  if (proposedActionType && EXCLUDED_PROPOSED_ACTION_TYPES.has(proposedActionType)) {
    return false;
  }

  return true;
}

export function toPublicProvisionalCard(row: PublicProvisionalWarehouseCandidateRow): PublicProvisionalCard | null {
  if (!isPublicProvisionalWarehouseRowEligible(row)) {
    return null;
  }

  const provisionalState = mapState(row.state);
  const displayName = deriveDisplayName(row);
  const setHint = deriveSetHint(row);
  const numberHint = deriveNumberHint(row);

  if (!provisionalState || !displayName || !setHint || !numberHint) {
    return null;
  }

  const safeRow = Object.freeze({
    candidate_id: row.id as string,
    display_name: displayName,
    set_hint: setHint,
    number_hint: numberHint,
    image_url: safeImage(row),
    provisional_state: provisionalState,
    provisional_label: mapLabel(provisionalState),
    public_explanation: mapExplanation(provisionalState),
    source_label: safeSource(row),
    created_at: row.created_at ?? undefined,
  });

  return safeRow;
}

function matchesPublicProvisionalQuery(card: PublicProvisionalCard, query?: string | null, setCode?: string | null) {
  const normalizedSetCode = normalizeLower(setCode);
  if (normalizedSetCode && normalizeLower(card.set_hint) !== normalizedSetCode) {
    return false;
  }

  const normalizedQuery = normalizeLower(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeLower(
    [
      card.display_name,
      card.set_hint,
      card.number_hint,
      card.source_label,
      card.provisional_label,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const tokens = normalizedQuery.match(/[a-z0-9/.-]+/g) ?? [];

  return tokens.every((token) => haystack.includes(token));
}

export async function getPublicProvisionalCards(input?: {
  query?: string | null;
  setCode?: string | null;
  limit?: number;
}): Promise<PublicProvisionalCard[]> {
  const requestedLimit =
    typeof input?.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(Math.trunc(input.limit), 50)
      : 12;
  const queryLimit = Math.min(Math.max(requestedLimit * 4, 24), 100);
  const supabase = createPublicSupabase();

  // SECURITY: DO NOT ACCESS WAREHOUSE DIRECTLY.
  // USE getPublicProvisionalCards (CONTRACT ENFORCED).
  const { data, error } = await supabase
    .from("canon_warehouse_candidates")
    .select(PUBLIC_PROVISIONAL_SELECT)
    .eq("submission_intent", "MISSING_CARD")
    .in("state", [...ALLOWED_STATES])
    .is("promoted_card_print_id", null)
    .filter("reference_hints_payload->>bridge_source", "eq", "external_discovery_bridge_v1")
    .or("identity_audit_status.is.null,identity_audit_status.not.in.(ALIAS,SLOT_CONFLICT,AMBIGUOUS,PRINTING_ONLY)")
    .or("proposed_action_type.is.null,proposed_action_type.not.in.(ENRICH_CANON_IMAGE,CREATE_CARD_PRINTING,BLOCKED_NO_PROMOTION)")
    .order("created_at", { ascending: false })
    .limit(queryLimit);

  if (error) {
    throw new Error(`Public provisional warehouse query failed: ${error.message}`);
  }

  const rows = ((data ?? []) as unknown as PublicProvisionalWarehouseCandidateRow[])
    .map((row) => {
      if (!ALLOWED_STATES.includes(normalizeUpper(row.state) as PublicProvisionalState)) {
        return null;
      }

      return toPublicProvisionalCard(row);
    })
    .filter((card): card is PublicProvisionalCard => Boolean(card))
    .filter((card) => matchesPublicProvisionalQuery(card, input?.query, input?.setCode))
    .slice(0, requestedLimit);

  if (process.env.NODE_ENV !== "production") {
    if (rows.length > 300) {
      console.warn("SECURITY: Provisional surface size abnormal");
    }

    for (const row of rows) {
      console.warn("Provisional row served:", row.candidate_id);
    }
  }

  return rows;
}

export async function getPublicProvisionalCardById(candidateId: string): Promise<PublicProvisionalCard | null> {
  const normalizedCandidateId = normalizeText(candidateId);
  if (!normalizedCandidateId || !isPublicProvisionalCandidateId(normalizedCandidateId)) {
    return null;
  }

  const supabase = createPublicSupabase();

  // LOCK: Provisional detail is non-canonical and adapter-backed only.
  // LOCK: Never expose raw warehouse rows or canonical authority fields here.
  const { data, error } = await supabase
    .from("canon_warehouse_candidates")
    .select(PUBLIC_PROVISIONAL_SELECT)
    .eq("id", normalizedCandidateId)
    .eq("submission_intent", "MISSING_CARD")
    .in("state", [...ALLOWED_STATES])
    .is("promoted_card_print_id", null)
    .filter("reference_hints_payload->>bridge_source", "eq", "external_discovery_bridge_v1")
    .or("identity_audit_status.is.null,identity_audit_status.not.in.(ALIAS,SLOT_CONFLICT,AMBIGUOUS,PRINTING_ONLY)")
    .or("proposed_action_type.is.null,proposed_action_type.not.in.(ENRICH_CANON_IMAGE,CREATE_CARD_PRINTING,BLOCKED_NO_PROMOTION)")
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[public-provisional] detail adapter failed closed", {
        message: error.message,
      });
    }

    return null;
  }

  return data ? toPublicProvisionalCard(data as unknown as PublicProvisionalWarehouseCandidateRow) : null;
}
