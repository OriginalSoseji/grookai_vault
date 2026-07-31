import { handleWallFeed } from "./index.ts";

function assert(
  condition: unknown,
  message = "assertion failed",
): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`expected ${expectedJson}, received ${actualJson}`);
  }
}

function assertMatch(actual: string, expected: RegExp): void {
  if (!expected.test(actual)) {
    throw new Error(`${JSON.stringify(actual)} did not match ${expected}`);
  }
}

function assertNotMatch(actual: string, expected: RegExp): void {
  if (expected.test(actual)) {
    throw new Error(
      `${JSON.stringify(actual)} unexpectedly matched ${expected}`,
    );
  }
}

Deno.test("wall_feed issues one fixed-shape read without bearer authorization", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const response = await handleWallFeed(
    new Request(
      "https://example.test/functions/v1/wall_feed?limit=5&offset=2&q=Pikachu&condition=Near%20Mint&min_price_cents=100&max_price_cents=5000",
    ),
    {
      supabaseUrl: "https://project.test",
      secretKey: "sb_secret_test",
      fetchImpl: (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
        return Promise.resolve(
          new Response("[]", {
            status: 200,
            headers: { "content-range": "*/17" },
          }),
        );
      },
      logger: { log() {}, error() {} },
    },
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { items: [], count: 17 });
  assertEquals(capturedInit?.method, "GET");
  const headers = new Headers(capturedInit?.headers);
  assertEquals(headers.get("apikey"), "sb_secret_test");
  assertEquals(headers.get("authorization"), null);

  const restUrl = new URL(capturedUrl);
  assertEquals(restUrl.pathname, "/rest/v1/wall_feed_view");
  assertEquals(restUrl.searchParams.get("limit"), "5");
  assertEquals(restUrl.searchParams.get("offset"), "2");
  assertEquals(restUrl.searchParams.get("order"), "created_at.desc");
  assertEquals(restUrl.searchParams.get("title"), "ilike.*Pikachu*");
  assertEquals(restUrl.searchParams.get("condition"), 'in.("Near Mint")');
  assert(restUrl.searchParams.get("select")?.includes("listing_id"));
  assertNotMatch(restUrl.searchParams.get("select") ?? "", /\*/);
  assertNotMatch(capturedUrl, /card_name|set_code|card_number/);
});

Deno.test("wall_feed sanitizes upstream database failures", async () => {
  const response = await handleWallFeed(
    new Request("https://example.test/functions/v1/wall_feed"),
    {
      supabaseUrl: "https://project.test",
      secretKey: "sb_secret_test",
      fetchImpl: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: "42501",
              message: "sensitive database detail",
            }),
            { status: 401 },
          ),
        ),
      logger: { log() {}, error() {} },
    },
  );

  assertEquals(response.status, 502);
  assertEquals(response.headers.get("cache-control"), "no-store");
  const body = await response.text();
  assertMatch(body, /"error":"wall_feed_query_failed"/);
  assertMatch(body, /"upstream_code":"42501"/);
  assertNotMatch(body, /sensitive database detail/);
});

Deno.test("wall_feed rejects writes before contacting PostgREST", async () => {
  let called = false;
  const response = await handleWallFeed(
    new Request("https://example.test/functions/v1/wall_feed", {
      method: "POST",
    }),
    {
      supabaseUrl: "https://project.test",
      secretKey: "sb_secret_test",
      fetchImpl: () => {
        called = true;
        return Promise.resolve(new Response("[]"));
      },
      logger: { log() {}, error() {} },
    },
  );

  assertEquals(response.status, 405);
  assertEquals(called, false);
});
