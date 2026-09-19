// Test process preload: fail closed before any non-loopback connection.
const net = require("node:net");
const tls = require("node:tls");
const allowed = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
function checkHost(host) {
  if (host && !allowed.has(String(host)))
    throw new Error("Storefront local proof blocked a non-loopback connection");
}
for (const transport of [net, tls]) {
  for (const method of ["connect", "createConnection"]) {
    if (!transport[method]) continue;
    const original = transport[method];
    transport[method] = function (...args) {
      const first = args[0];
      if (typeof first === "object") checkHost(first.host ?? first.hostname);
      else if (typeof first === "number" && typeof args[1] === "string")
        checkHost(args[1]);
      return original.apply(this, args);
    };
  }
}
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  checkHost(url.hostname);
  return originalFetch(input, init);
};
