import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';
import {SquareApiError} from './client_v1.mjs';
const fail = () => {throw new SquareApiError('square_credential_envelope_invalid');};
const decode = value => {
  if (typeof value !== 'string') return fail();
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.toString('base64url') !== value) return fail();
  return bytes;
};
function key(value) {
  if (typeof value !== 'string') return fail();
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length !== 32 || bytes.toString('base64') !== value) return fail();
  return bytes;
}
function aad(context) {
  if (!context || !['launch', 'tokens'].includes(context.purpose) || !['production', 'sandbox'].includes(context.environment)) return fail();
  for (const field of ['ownerId', 'connectionId', 'bindingId']) if (typeof context[field] !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(context[field])) return fail();
  return Buffer.from(JSON.stringify(['grookai-square-v1', context.purpose, context.environment, context.ownerId, context.connectionId, context.bindingId]));
}
export function sealSquareCredential(value, encryptionKey, context) {
  const plaintext = Buffer.from(JSON.stringify(value));
  if (plaintext.length > 32768) return fail();
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(encryptionKey), iv);
  cipher.setAAD(aad(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return ['v1', iv.toString('base64url'), ciphertext.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
}
export function openSquareCredential(envelope, encryptionKey, context) {
  try {
    if (typeof envelope !== 'string' || envelope.length > 65536) return fail();
    const [version, ivText, dataText, tagText, extra] = envelope.split('.');
    if (version !== 'v1' || extra !== undefined) return fail();
    const iv = decode(ivText), tag = decode(tagText), data = decode(dataText);
    if (iv.length !== 12 || tag.length !== 16) return fail();
    const decipher = createDecipheriv('aes-256-gcm', key(encryptionKey), iv);
    decipher.setAAD(aad(context)); decipher.setAuthTag(tag);
    const bytes = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(bytes.toString('utf8'));
  } catch {return fail();}
}
