import assert from 'node:assert/strict';
// Adapter for the CLI's third-party JSON schema, never an environment fallback.
// Callers still validate their dedicated project, containers and exact ports.
export function localSupabaseStatusSecret(status) {
  const url = new URL(status.API_URL);
  assert.equal(url.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
  assert.ok(Number(url.port) >= 1024 && Number(url.port) <= 65535);
  assert.equal(url.pathname, '/');
  assert.equal(url.username + url.password + url.search + url.hash, '');
  const secret = status.SERVICE_ROLE_KEY;
  assert.equal(typeof secret, 'string');
  const parts = secret.split('.');
  assert.equal(parts.length, 3);
  assert.equal(JSON.parse(Buffer.from(parts[1], 'base64url').toString()).role, 'service_role');
  return secret;
}
