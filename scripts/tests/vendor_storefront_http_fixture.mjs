// Local-only Supabase protocol adapter, backed by the real isolated SQL fixture.
// This is not GoTrue/PostgREST/Storage integration proof. No production credentials.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual } from "node:crypto";
import assert from "node:assert/strict";
import pg from "pg";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const receipt = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      process.argv.includes("--custom")
        ? ".local/storefront/custom-latest.json"
        : ".local/storefront/latest.json",
    ),
    "utf8",
  ),
);
assert.match(receipt.database, /^grookai_storefront_v1_[0-9]+$/);
assert(receipt.results.every((r) => r.passed));
const pool = new pg.Pool({
  host: "127.0.0.1",
  port: 15438,
  user: "storefront_test",
  database: receipt.database,
  connectionTimeoutMillis: 3000,
});
assert.equal(
  (await pool.query("show data_directory")).rows[0].data_directory
    .replaceAll("\\", "/")
    .toLowerCase(),
  path
    .join(root, ".local/storefront/pgdata")
    .replaceAll("\\", "/")
    .toLowerCase(),
);
const secret = "isolated-storefront-fixture-signing-key-not-a-real-secret";
const encode = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
function token(id) {
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
const users = Object.fromEntries(
  ["owner", "other", "visitor"].map((k) => [k, token(receipt.fixture[k])]),
);
fs.writeFileSync(
  path.join(root, ".local/storefront/http-fixture.json"),
  JSON.stringify({ tokens: users, fixture: receipt.fixture }, null, 2),
);
function userFromToken(value) {
  if (!value) return null;
  const [a, b, c] = value.split(".");
  if (!a || !b || !c) return null;
  const expected = createHmac("sha256", secret).update(`${a}.${b}`).digest();
  const actual = Buffer.from(c, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return null;
  const payload = JSON.parse(Buffer.from(b, "base64url"));
  return Object.values(receipt.fixture).includes(payload.sub) &&
    payload.exp > Date.now() / 1000
    ? payload.sub
    : null;
}
const rpcNames = [
  "vendor_store_owner_v1",
  "vendor_store_save_v1",
  "vendor_store_select_item_v1",
  "vendor_store_select_section_v1",
  "vendor_store_publish_v1",
  "vendor_store_set_media_v1",
  "vendor_store_read_v1",
  "vendor_store_read_v2",
  "vendor_store_custom_owner_v1",
  "vendor_store_custom_mutate_v1",
  "vendor_store_custom_detail_v1",
  "vendor_referral_credit_v1",
];
const definitions = (
  await pool.query(
    "select proname,proargnames from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=$1 and proname=any($2)",
    ["public", rpcNames],
  )
).rows;
const mediaObjects = new Map();
async function asUser(user, admin, fn) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const role = admin ? "service_role" : user ? "authenticated" : "anon";
    await c.query(`set local role ${role}`);
    await c.query(
      "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",
      [user ?? "", role],
    );
    const result = await fn(c);
    await c.query("commit");
    return result;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
const server = http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "http://127.0.0.1:15440");
  res.setHeader(
    "access-control-allow-headers",
    "authorization,apikey,content-type,x-client-info",
  );
  res.setHeader("cache-control", "no-store");
  const send = (status, data) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
  };
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1:15439");
    const bearer = req.headers.authorization?.replace(/^Bearer /i, "");
    const admin = bearer === "storefront-local-service-only";
    const user = userFromToken(bearer);
    if (url.pathname === "/auth/v1/user") {
      if (!user) return send(401, { message: "Local authentication required" });
      const row = (
        await pool.query("select * from auth.users where id=$1", [user])
      ).rows[0];
      return send(200, {
        ...row,
        aud: "authenticated",
        role: "authenticated",
        app_metadata: { provider: "email" },
        user_metadata: {},
        identities: [],
      });
    }
    if (url.pathname.startsWith("/storage/v1/object/")) {
      const objectPath = decodeURIComponent(
        url.pathname.slice("/storage/v1/object/".length),
      ).replace(/^authenticated\//, "");
      if (!objectPath.startsWith("vendor-store-media/")) return send(404, {});
      const name = objectPath.slice("vendor-store-media/".length);
      if (req.method === "POST" && user) {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 5242880 + 65536) throw Error("Too large");
          chunks.push(chunk);
        }
        let bytes = Buffer.concat(chunks);
        let mime = req.headers["content-type"];
        // The pinned Dart Storage SDK uses multipart even for uploadBinary.
        // This adapter is synthetic; accepting its wire format does not prove
        // real Supabase Storage policy or Auth behavior.
        if (mime?.startsWith("multipart/form-data;")) {
          const boundary = /boundary=(?:"([^"]+)"|([^;\s]+))/.exec(mime);
          if (!boundary) return send(400, { message: "Missing boundary" });
          // Dart deliberately sends filename=""; WHATWG formData treats that
          // as text. Parse this bounded fixture format without decoding bytes
          // as UTF-8 or altering the image payload.
          const files = bytes
            .toString("latin1")
            .split(`--${boundary[1] ?? boundary[2]}`)
            .flatMap((part) => {
              const split = part.indexOf("\r\n\r\n");
              if (split < 0 || !part.endsWith("\r\n")) return [];
              const headers = part.slice(0, split);
              if (
                !/content-disposition:[^\r\n]*;\s*filename="[^"]*"/i.test(
                  headers,
                )
              )
                return [];
              return [
                {
                  mime: /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1],
                  bytes: Buffer.from(part.slice(split + 4, -2), "latin1"),
                },
              ];
            });
          if (files.length !== 1)
            return send(400, { message: "One file required" });
          mime = files[0].mime;
          bytes = files[0].bytes;
        }
        if (bytes.length > 5242880) return send(400, { message: "Too large" });
        if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
          return send(400, { message: "Invalid media type" });
        await asUser(user, false, (c) =>
          c.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
            "vendor-store-media",
            name,
          ]),
        );
        mediaObjects.set(name, {
          bytes,
          mime,
        });
        return send(200, { Key: objectPath });
      }
      if (req.method === "GET" && admin && mediaObjects.has(name)) {
        const media = mediaObjects.get(name);
        res.writeHead(200, { "content-type": media.mime });
        res.end(media.bytes);
        return;
      }
      return send(404, {});
    }
    if (url.pathname.startsWith("/rest/v1/rpc/") && req.method === "POST") {
      const name = url.pathname.slice("/rest/v1/rpc/".length);
      const definition = definitions.find((d) => d.proname === name);
      if (!definition)
        return send(404, { code: "TEST_ONLY", message: "RPC not in fixture" });
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) throw new Error("Request too large");
      }
      const body = JSON.parse(raw || "{}");
      const names = Object.keys(body);
      assert(names.every((n) => definition.proargnames?.includes(n)));
      const sql = `select public.${name}(${names.map((n, i) => `${n} => $${i + 1}`).join(",")}) as value`;
      const data = await asUser(user, admin, (c) =>
        c.query(
          sql,
          names.map((n) => body[n]),
        ),
      );
      return send(200, data.rows[0].value);
    }
    if (url.pathname === "/rest/v1/vendor_stores" && admin) {
      const slug = url.searchParams.get("slug")?.replace(/^eq\./, "");
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      const rows = (
        await pool.query(
          "select logo_path,banner_path from vendor_stores where slug=$1 or id::text=$2",
          [slug ?? null, id ?? null],
        )
      ).rows;
      return send(
        200,
        req.headers.accept?.includes("object") ? (rows[0] ?? null) : rows,
      );
    }
    if (url.pathname === "/rest/v1/vendor_store_custom_products" && admin) {
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      const store = url.searchParams.get("store_id")?.replace(/^eq\./, "");
      const rows = (
        await pool.query(
          "select photo_paths from vendor_store_custom_products where id::text=$1 and store_id::text=$2",
          [id, store],
        )
      ).rows;
      return send(
        200,
        req.headers.accept?.includes("object") ? (rows[0] ?? null) : rows,
      );
    }
    // Empty unrelated shell/profile reads, with no remote fallback or writes.
    if (url.pathname.startsWith("/rest/v1/") && req.method === "GET")
      return send(200, []);
    return send(404, {
      code: "TEST_ONLY",
      message: "Endpoint not implemented by local fixture",
    });
  } catch (e) {
    send(e.code === "PT409" ? 409 : e.code === "42501" ? 403 : 400, {
      code: e.code ?? "FIXTURE_ERROR",
      message: e.message,
    });
  }
});
server.listen(15439, "127.0.0.1", () =>
  console.log(
    "Isolated SQL-backed fixture listening on http://127.0.0.1:15439",
  ),
);
process.on("SIGTERM", () =>
  server.close(() => pool.end().then(() => process.exit(0))),
);
