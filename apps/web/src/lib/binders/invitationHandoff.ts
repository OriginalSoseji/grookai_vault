import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const BINDER_INVITE_TRANSIENT_COOKIE =
  "gv_binder_invite_handoff_v1";
export const BINDER_INVITE_REVIEW_PATH = "/binder-invites/review";
export const BINDER_INVITE_RESPONSE_PATH = "/binder-invites/respond";
export const BINDER_INVITE_TRANSIENT_TTL_SECONDS = 15 * 60;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,256}$/;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const SEALED_PATTERN =
  /^v1\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{32,1024})\.([A-Za-z0-9_-]{22})$/;
const STATE_SECRET_ENV = "BINDER_INVITE_TRANSIENT_SECRET";
const STATE_AAD = Buffer.from(
  "grookai-vault:binder-invitation-handoff:v1",
  "utf8",
);
const MAX_CLOCK_SKEW_SECONDS = 30;

type BinderInviteTransientPayload = {
  v: 1;
  token: string;
  csrf: string;
  issuedAt: number;
  expiresAt: number;
};

export type BinderInviteTransientState = Readonly<
  BinderInviteTransientPayload
>;

type StateOptions = {
  nowMs?: number;
  secret?: string;
};

function getSecret(override?: string) {
  const secret = (override ?? process.env[STATE_SECRET_ENV])?.trim() ?? "";
  if (
    secret.length < 32 ||
    secret === "replace-with-at-least-32-random-characters"
  ) {
    return null;
  }
  return secret;
}

function deriveKey(secret: string) {
  return createHash("sha256")
    .update("grookai-vault:binder-invitation-handoff:key:v1\0", "utf8")
    .update(secret, "utf8")
    .digest();
}

function epochSeconds(nowMs?: number) {
  return Math.floor((nowMs ?? Date.now()) / 1000);
}

function canonicalBase64Url(value: string) {
  const decoded = Buffer.from(value, "base64url");
  return decoded.toString("base64url") === value ? decoded : null;
}

function isStrictPayload(
  value: unknown,
  now: number,
): value is BinderInviteTransientPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const payload = value as Record<string, unknown>;
  const keys = Object.keys(payload).sort();
  if (
    keys.length !== 5 ||
    keys.join(",") !== "csrf,expiresAt,issuedAt,token,v"
  ) {
    return false;
  }
  if (
    payload.v !== 1 ||
    typeof payload.token !== "string" ||
    !TOKEN_PATTERN.test(payload.token) ||
    typeof payload.csrf !== "string" ||
    !NONCE_PATTERN.test(payload.csrf) ||
    !Number.isSafeInteger(payload.issuedAt) ||
    !Number.isSafeInteger(payload.expiresAt)
  ) {
    return false;
  }

  const issuedAt = payload.issuedAt as number;
  const expiresAt = payload.expiresAt as number;
  return (
    issuedAt <= now + MAX_CLOCK_SKEW_SECONDS &&
    expiresAt > now &&
    expiresAt - issuedAt === BINDER_INVITE_TRANSIENT_TTL_SECONDS
  );
}

/**
 * Move a URL bearer into short-lived authenticated encryption before any
 * React render. The raw token is never used as a cookie value.
 */
export function sealBinderInviteTransientState(
  token: string,
  options: StateOptions = {},
) {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error("Binder invitation handoff is unavailable.");
  }
  const secret = getSecret(options.secret);
  if (!secret) {
    throw new Error("Binder invitation handoff is unavailable.");
  }

  const issuedAt = epochSeconds(options.nowMs);
  const payload: BinderInviteTransientPayload = {
    v: 1,
    token,
    csrf: randomBytes(32).toString("base64url"),
    issuedAt,
    expiresAt: issuedAt + BINDER_INVITE_TRANSIENT_TTL_SECONDS,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  cipher.setAAD(STATE_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

/**
 * Authentication, shape, lifetime, and token checks deliberately collapse to
 * null. Callers must show one generic unavailable state and must not log the
 * sealed value or decryption error.
 */
export function unsealBinderInviteTransientState(
  sealed: string | null | undefined,
  options: StateOptions = {},
): BinderInviteTransientState | null {
  const secret = getSecret(options.secret);
  if (!secret || !sealed || sealed.length > 1400) {
    return null;
  }
  const match = SEALED_PATTERN.exec(sealed);
  if (!match) {
    return null;
  }

  try {
    const iv = canonicalBase64Url(match[1]);
    const ciphertext = canonicalBase64Url(match[2]);
    const tag = canonicalBase64Url(match[3]);
    if (
      !iv ||
      !ciphertext ||
      !tag ||
      iv.length !== 12 ||
      tag.length !== 16 ||
      ciphertext.length === 0
    ) {
      return null;
    }

    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
    decipher.setAAD(STATE_AAD);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const payload: unknown = JSON.parse(plaintext);
    return isStrictPayload(payload, epochSeconds(options.nowMs))
      ? Object.freeze(payload)
      : null;
  } catch {
    return null;
  }
}

export function binderInviteCsrfMatches(
  expected: string,
  candidate: string,
) {
  if (
    !NONCE_PATTERN.test(expected) ||
    !NONCE_PATTERN.test(candidate) ||
    expected.length !== candidate.length
  ) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(candidate, "utf8"),
  );
}

export function isTrustedBinderInvitePost(input: {
  origin: string | null;
  expectedOrigin: string;
  localRequestOrigin?: string | null;
  secFetchSite: string | null;
  contentType: string | null;
}) {
  const origin = input.origin?.trim() ?? "";
  const allowedOrigin =
    origin === input.expectedOrigin ||
    (Boolean(input.localRequestOrigin) &&
      origin === input.localRequestOrigin);
  const fetchSite = input.secFetchSite?.trim().toLowerCase() ?? "";
  const contentType = input.contentType?.trim().toLowerCase() ?? "";

  return (
    allowedOrigin &&
    (!fetchSite || fetchSite === "same-origin") &&
    (contentType.startsWith("application/x-www-form-urlencoded") ||
      contentType.startsWith("multipart/form-data"))
  );
}
