import { normalizePsaGradeValue } from "@/lib/slabs/normalizePsaGrade";

// Provider observations, never a canonical card ID or authority to change a copy.
export type PsaCertificateIdentity = {
  certNumber: string;
  year: string | null;
  brand: string | null;
  category: string | null;
  cardNumber: string | null;
  subject: string | null;
  variety: string | null;
  isPsaDna: boolean | null;
  isDualCert: boolean | null;
  itemStatus: string | null;
};

export type SlabVerificationResult = {
  grader: "PSA";
  cert_number: string;
  verified: boolean;
  grade?: string;
  title?: string;
  image_url?: string;
  parser_status: "verified" | "partial" | "failed";
  error_code?: string;
  identity?: PsaCertificateIdentity;
  raw_payload?: unknown;
};

export function normalizePsaCertNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\s-]/g, "");
  // Keep leading zeroes. A numeric JSON value cannot prove they were preserved.
  return /^[0-9]{1,32}$/.test(normalized) ? normalized : null;
}

const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 512 ? v.trim() : null;

export function parsePsaCertificateResponse(certNumber: string, payload: unknown): SlabVerificationResult {
  const requested = normalizePsaCertNumber(certNumber);
  const fail = (error_code: string): SlabVerificationResult => ({
    grader: "PSA", cert_number: requested ?? certNumber, verified: false,
    parser_status: "failed", error_code, raw_payload: payload,
  });
  if (!requested) return fail("INVALID_CERT_FORMAT");
  if (!record(payload)) return fail("PSA_API_INVALID_RESPONSE");

  // PSA documents error envelopes as well as the current PSACert wrapper.
  // An explicit error always wins, even when a stale PSACert object is present.
  for (const key of ["IsValidRequest", "isValidRequest"]) {
    if (Object.hasOwn(payload, key) && payload[key] !== true) return fail("PSA_INVALID_CERT_REQUEST");
  }
  for (const key of ["ServerMessage", "serverMessage"]) {
    if (!Object.hasOwn(payload, key)) continue;
    if (payload[key] === "No data found") return fail("PSA_CERT_NOT_FOUND");
    if (payload[key] !== "Request successful") return fail("PSA_API_INVALID_RESPONSE");
  }
  if (!record(payload.PSACert)) return fail("PSA_API_INVALID_RESPONSE");
  const cert = payload.PSACert;
  const returned = normalizePsaCertNumber(cert.CertNumber);
  if (!returned) return fail("PSA_CERT_NUMBER_MISSING");
  if (returned !== requested) return fail("PSA_CERT_NUMBER_MISMATCH");

  const grade = text(cert.CardGrade) ?? text(cert.GradeDescription);
  const numeric = normalizePsaGradeValue(grade);
  if (!grade || !numeric || Number(numeric) < 1 || Number(numeric) > 10 || Number(numeric) * 2 % 1 !== 0) {
    return fail("PSA_GRADE_MISSING");
  }
  const descriptionGrade = normalizePsaGradeValue(text(cert.GradeDescription));
  if (descriptionGrade && Number(descriptionGrade) !== Number(numeric)) return fail("PSA_GRADE_CONFLICT");

  const identity: PsaCertificateIdentity = {
    certNumber: returned, year: text(cert.Year), brand: text(cert.Brand), category: text(cert.Category),
    cardNumber: text(cert.CardNumber), subject: text(cert.Subject), variety: text(cert.Variety),
    isPsaDna: typeof cert.IsPSADNA === "boolean" ? cert.IsPSADNA : null,
    isDualCert: typeof cert.IsDualCert === "boolean" ? cert.IsDualCert : null,
    itemStatus: text(cert.ItemStatus),
  };
  const candidateImage = text(cert.ImageURL ?? cert.ImageUrl ?? cert.imageUrl ?? cert.ImageUri ?? cert.imageUri);
  return {
    grader: "PSA", cert_number: returned, verified: true, grade, parser_status: "verified",
    title: [identity.subject, identity.variety].filter(Boolean).join(" — ") || undefined,
    image_url: candidateImage && /^https?:\/\//i.test(candidateImage) ? candidateImage : undefined,
    identity, raw_payload: payload,
  };
}
