import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export const GVVI_VENDOR_QR_CONTRACT_VERSION = "GVVI_VENDOR_QR_V1";
export const GVVI_REFERRAL_COOKIE_NAME = "grookai-gvvi-referral";
export const GVVI_REFERRAL_WINDOW_SECONDS = 60 * 60 * 24 * 30;

const TOKEN_VERSION = "v1";

export type VendorReferralContext = {
  version: 1;
  gvviId: string;
  createdAt: string;
  expiresAt: string;
};

export function normalizePublicGvviId(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^GVVI-[A-Z0-9]+-[0-9]{6}$/.test(normalized) ? normalized : null;
}

export function buildVendorQrDestinationUrl(origin: string, gvviId: string) {
  const normalizedGvviId = normalizePublicGvviId(gvviId);
  if (!normalizedGvviId) {
    throw new Error("Invalid public GVVI identifier.");
  }

  const normalizedOrigin = new URL(origin);
  if (normalizedOrigin.protocol !== "https:" && normalizedOrigin.hostname !== "localhost") {
    throw new Error("GVVI QR origin must use HTTPS outside localhost.");
  }

  normalizedOrigin.pathname = `/q/${encodeURIComponent(normalizedGvviId)}`;
  normalizedOrigin.search = "";
  normalizedOrigin.hash = "";
  return normalizedOrigin.toString();
}

export function canEntitlementRecordUseVendorTools(record: {
  tier?: string | null;
  role?: string | null;
  features?: unknown;
  is_active?: boolean | null;
} | null | undefined) {
  if (!record || record.is_active === false) {
    return false;
  }

  const features =
    record.features && typeof record.features === "object" && !Array.isArray(record.features)
      ? (record.features as Record<string, unknown>)
      : {};

  return (
    record.tier === "vendor" ||
    record.tier === "founder_admin" ||
    record.role === "vendor" ||
    record.role === "founder" ||
    features.vendor_tools === true
  );
}

export function isEligiblePublicVendorOffer(input: {
  ownerCanUseVendorTools: boolean;
  intent: string | null | undefined;
  pricingMode: string | null | undefined;
  askingPriceAmount: number | null | undefined;
  archivedAt?: string | null;
  publicAccessProven?: boolean;
}) {
  return (
    input.ownerCanUseVendorTools &&
    input.publicAccessProven !== false &&
    input.archivedAt == null &&
    input.intent === "sell" &&
    input.pricingMode === "asking" &&
    typeof input.askingPriceAmount === "number" &&
    Number.isFinite(input.askingPriceAmount) &&
    input.askingPriceAmount > 0
  );
}

function deriveEncryptionKey(secret: string) {
  const normalized = secret.trim();
  if (normalized.length < 32) {
    throw new Error("GVVI referral secret must contain at least 32 characters.");
  }

  return createHash("sha256").update(normalized, "utf8").digest();
}

function decodeCanonicalBase64Url(value: string, expectedLength?: number) {
  const decoded = Buffer.from(value, "base64url");
  if (
    decoded.toString("base64url") !== value ||
    (typeof expectedLength === "number" && decoded.length !== expectedLength)
  ) {
    throw new Error("Invalid referral token encoding.");
  }
  return decoded;
}

export function sealVendorReferralContext(input: {
  gvviId: string;
  secret: string;
  nowMs?: number;
}) {
  const normalizedGvviId = normalizePublicGvviId(input.gvviId);
  if (!normalizedGvviId) {
    throw new Error("Invalid referral GVVI identifier.");
  }

  const nowMs = input.nowMs ?? Date.now();
  const payload: VendorReferralContext = {
    version: 1,
    gvviId: normalizedGvviId,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + GVVI_REFERRAL_WINDOW_SECONDS * 1000).toISOString(),
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveEncryptionKey(input.secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    authTag.toString("base64url"),
  ].join(".");
}

export function unsealVendorReferralContext(input: {
  token: string | null | undefined;
  secret: string;
  nowMs?: number;
}): VendorReferralContext | null {
  try {
    const [version, encodedIv, encodedCiphertext, encodedAuthTag, extra] =
      input.token?.split(".") ?? [];
    if (
      version !== TOKEN_VERSION ||
      !encodedIv ||
      !encodedCiphertext ||
      !encodedAuthTag ||
      extra
    ) {
      return null;
    }

    const iv = decodeCanonicalBase64Url(encodedIv, 12);
    const ciphertext = decodeCanonicalBase64Url(encodedCiphertext);
    const authTag = decodeCanonicalBase64Url(encodedAuthTag, 16);
    if (ciphertext.length === 0) {
      return null;
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveEncryptionKey(input.secret),
      iv,
    );
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plaintext) as Partial<VendorReferralContext>;
    const gvviId = normalizePublicGvviId(payload.gvviId);
    const createdAtMs = Date.parse(payload.createdAt ?? "");
    const expiresAtMs = Date.parse(payload.expiresAt ?? "");
    const nowMs = input.nowMs ?? Date.now();

    if (
      payload.version !== 1 ||
      !gvviId ||
      !Number.isFinite(createdAtMs) ||
      !Number.isFinite(expiresAtMs) ||
      createdAtMs > nowMs + 60_000 ||
      expiresAtMs <= nowMs ||
      expiresAtMs - createdAtMs > GVVI_REFERRAL_WINDOW_SECONDS * 1000
    ) {
      return null;
    }

    return {
      version: 1,
      gvviId,
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  } catch {
    return null;
  }
}

export function shouldCreditVendorReferral(input: {
  accountWasCreated: boolean;
  referredVendorUserId: string;
  newUserId: string;
}) {
  return (
    input.accountWasCreated &&
    input.referredVendorUserId.length > 0 &&
    input.newUserId.length > 0 &&
    input.referredVendorUserId !== input.newUserId
  );
}
