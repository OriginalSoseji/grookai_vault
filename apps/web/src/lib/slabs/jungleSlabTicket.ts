import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const aad = Buffer.from("grookai:jungle-slab-intake:v1");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type JungleSlabTicket = {
  version: 1; ownerId: string; requestId: string; cardPrintId: string; printingId: string;
  certNumber: string; grade: string; gvId: string; issuedAt: number; expiresAt: number; payload: unknown;
};
function key(secret: string) {
  if (secret.length < 32) throw new Error("Slab verification is unavailable.");
  return createHash("sha256").update(aad).update("\0").update(secret).digest();
}
function validate(value: unknown, now: number): asserts value is JungleSlabTicket {
  if (!value || typeof value !== "object") throw new Error("Invalid slab verification.");
  const t = value as JungleSlabTicket;
  if (t.version !== 1 || ![t.ownerId,t.requestId,t.cardPrintId,t.printingId].every(v => typeof v === "string" && uuid.test(v))
    || typeof t.certNumber !== "string" || !/^[0-9]{1,32}$/.test(t.certNumber)
    || typeof t.grade !== "string" || !/^(?:[1-9](?:\.5)?|10)$/.test(t.grade)
    || typeof t.gvId !== "string" || !/^GV-PK-JU-\d+-(?:FIRST-EDITION|UNLIMITED)$/.test(t.gvId)
    || !Number.isSafeInteger(t.issuedAt) || !Number.isSafeInteger(t.expiresAt)
    || t.issuedAt > now + 30_000 || t.expiresAt <= now || t.expiresAt <= t.issuedAt
    || t.expiresAt - t.issuedAt > 30 * 60_000 || !t.payload
    || Buffer.byteLength(JSON.stringify(t.payload)) > 16_384) throw new Error("Slab verification expired or is invalid. Verify again.");
}
export function sealJungleSlabTicket(ticket: JungleSlabTicket, secret: string, now = Date.now()): string {
  validate(ticket, now);
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(aad);
  const body = Buffer.concat([cipher.update(JSON.stringify(ticket), "utf8"), cipher.final()]);
  return ["v1",iv.toString("base64url"),body.toString("base64url"),cipher.getAuthTag().toString("base64url")].join(".");
}
export function openJungleSlabTicket(token: string, secret: string, ownerId: string, now = Date.now()): JungleSlabTicket {
  if (typeof token !== "string" || token.length > 32768 || !/^v1\.[\w-]{16}\.[\w-]+\.[\w-]{22}$/.test(token)) throw new Error("Invalid slab verification.");
  const [,iv,body,tag] = token.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url"));
  decipher.setAAD(aad); decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const value: unknown = JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, "base64url")),decipher.final()]).toString("utf8"));
  validate(value, now);
  if (value.ownerId !== ownerId) throw new Error("Slab verification belongs to another session.");
  return value;
}
