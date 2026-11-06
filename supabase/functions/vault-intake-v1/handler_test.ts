import { createIntakeHandler } from "./handler.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}
const request = (body: unknown) =>
  new Request("http://localhost/intake", {
    method: "POST",
    body: JSON.stringify(body),
  });
const operationId = "11111111-2222-4333-8444-555555555555";
const success = (result: unknown) => ({
  ok: true,
  version: 1,
  operation_id: operationId,
  result,
});
Deno.test("requires verified identity and ignores a forged actor in payload", async () => {
  let params: Record<string, unknown> = {};
  let rpcName = "";
  const handler = createIntakeHandler({
    requireUser: async () => ({ userId: "verified-owner" }),
    createServiceRoleClient: () => ({
      rpc: async (name, p) => {
        rpcName = name;
        params = p;
        return { data: success([]), error: null };
      },
    }),
  });
  const response = await handler(
    request({ action: "lots.list", payload: { p_actor_user_id: "forged" } }),
  );
  equal(response.status, 200);
  equal(rpcName, "vault_intake_request_v1");
  equal(params.p_actor_user_id, "verified-owner");
  equal(await response.json(), {
    ok: true,
    result: [],
    operation_id: operationId,
  });
  equal(response.headers.get("cache-control"), "no-store");
  const unauthorized = createIntakeHandler({
    requireUser: async () => {
      throw Error("invalid token");
    },
    createServiceRoleClient: () => {
      throw Error("must not dispatch");
    },
  });
  equal((await unauthorized(request({ action: "lots.list" }))).status, 401);
});
Deno.test("bounds payloads and only dispatches known operations", async () => {
  const handler = createIntakeHandler({
    requireUser: async () => ({ userId: "owner" }),
    createServiceRoleClient: () => {
      throw Error("must not dispatch");
    },
  });
  equal((await handler(request({ action: "admin.delete" }))).status, 400);
  equal(
    (await handler(request({ action: "batch.save", payload: [] }))).status,
    400,
  );
  equal(
    (await handler(
      request({
        action: "batch.save",
        payload: { snapshot: "a".repeat(4_000_001) },
      }),
    )).status,
    413,
  );
});
Deno.test("maps conflicts and hides internal database messages", async () => {
  let failure = { sqlstate: "40001", code: "lot_changed_review_costs_again" };
  const handler = createIntakeHandler({
    requireUser: async () => ({ userId: "owner" }),
    createServiceRoleClient: () => ({
      rpc: async () => ({
        data: { ok: false, version: 1, operation_id: operationId, error: failure },
        error: null,
      }),
    }),
  });
  let response = await handler(request({ action: "batch.commit" }));
  equal(response.status, 409);
  equal(await response.json(), {
    error: "lot_changed_review_costs_again",
    operation_id: operationId,
  });
  failure = { sqlstate: "XX000", code: "secret internal SQL details" };
  response = await handler(request({ action: "lots.list" }));
  equal(response.status, 503);
  equal(await response.json(), {
    error: "intake_service_unavailable",
    operation_id: operationId,
  });
});

Deno.test("maps persisted ownership failures and paused writes without leaking details", async () => {
  for (
    const [sqlstate, code, status, publicCode] of [
      ["P0002", "not_found", 404, "not_found"],
      ["55000", "intake_writes_disabled", 503, "intake_service_unavailable"],
      ["P0001", "request_conflict", 409, "request_conflict"],
      ["P0001", "invalid_quantity", 422, "invalid_quantity"],
    ] as const
  ) {
    const handler = createIntakeHandler({
      requireUser: async () => ({ userId: "owner" }),
      createServiceRoleClient: () => ({
        rpc: async () => ({
          data: {
            ok: false,
            version: 1,
            operation_id: operationId,
            error: { sqlstate, code },
          },
          error: null,
        }),
      }),
    });
    const response = await handler(request({ action: "batch.commit" }));
    equal(response.status, status);
    equal(await response.json(), { error: publicCode, operation_id: operationId });
  }
});

Deno.test("unknown envelopes and RPC transport failures retain retryable status", async () => {
  for (
    const rpcResult of [
      { data: null, error: { code: "PGRST202", message: "private details" } },
      { data: [], error: null },
      { data: { ok: true, version: 2 }, error: null },
      {
        data: { ok: true, version: 1, operation_id: operationId },
        error: null,
      },
      {
        data: { ok: false, version: 1, operation_id: operationId, error: {} },
        error: null,
      },
    ]
  ) {
    const handler = createIntakeHandler({
      requireUser: async () => ({ userId: "owner" }),
      createServiceRoleClient: () => ({ rpc: async () => rpcResult }),
    });
    const response = await handler(request({ action: "batch.commit" }));
    equal(response.status, 503);
    equal(await response.json(), { error: "intake_service_unavailable" });
  }
});

Deno.test("method checks and malformed JSON never dispatch privileged work", async () => {
  let dispatched = false;
  const handler = createIntakeHandler({
    requireUser: async () => ({ userId: "owner" }),
    createServiceRoleClient: () => {
      dispatched = true;
      throw Error("must not dispatch");
    },
  });
  equal((await handler(new Request("http://localhost/intake"))).status, 405);
  equal(
    (await handler(new Request("http://localhost/intake", { method: "OPTIONS" })))
      .status,
    200,
  );
  equal(
    (await handler(
      new Request("http://localhost/intake", { method: "POST", body: "{" }),
    )).status,
    400,
  );
  equal(dispatched, false);
});
