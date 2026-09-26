import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  GVVI_REFERRAL_WINDOW_SECONDS,
  unsealVendorReferralContext,
} from "../gvvi/vendorQrCore";

export type StoreReferralContext = {
  version: 2;
  storeId: string;
  createdAt: string;
  expiresAt: string;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function key(secret: string) {
  if (secret.trim().length < 32) throw new Error("Invalid referral secret");
  return createHash("sha256").update(secret.trim()).digest();
}
export function sealStoreReferralContext(
  storeId: string,
  secret: string,
  nowMs = Date.now(),
) {
  if (!uuid.test(storeId)) throw new Error("Invalid store reference");
  const context: StoreReferralContext = {
    version: 2,
    storeId,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(
      nowMs + GVVI_REFERRAL_WINDOW_SECONDS * 1000,
    ).toISOString(),
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(context), "utf8"),
    cipher.final(),
  ]);
  return [
    "v2",
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}
export function unsealReferralContext(
  token: string,
  secret: string,
  nowMs = Date.now(),
) {
  if (token.startsWith("v1."))
    return unsealVendorReferralContext({ token, secret, nowMs });
  try {
    const parts = token.split(".");
    if (parts.length !== 4 || parts[0] !== "v2") return null;
    const [iv, encrypted, tag] = parts.slice(1).map((value) => {
      const bytes = Buffer.from(value, "base64url");
      if (bytes.toString("base64url") !== value)
        throw new Error("Invalid encoding");
      return bytes;
    });
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length > 1024)
      return null;
    const decipher = createDecipheriv("aes-256-gcm", key(secret), iv);
    decipher.setAuthTag(tag);
    const raw = JSON.parse(
      Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
        "utf8",
      ),
    ) as StoreReferralContext;
    const created = Date.parse(raw.createdAt);
    const expires = Date.parse(raw.expiresAt);
    if (
      raw.version !== 2 ||
      !uuid.test(raw.storeId) ||
      !Number.isFinite(created) ||
      !Number.isFinite(expires) ||
      created > nowMs ||
      expires <= nowMs ||
      expires <= created ||
      expires - created > GVVI_REFERRAL_WINDOW_SECONDS * 1000
    )
      return null;
    return raw;
  } catch {
    return null;
  }
}
