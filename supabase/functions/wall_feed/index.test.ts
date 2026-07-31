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
  assertEquals(headers.get("prefer"), "count=planned");

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

Deno.test("wall_feed returns an empty page for an out-of-range PostgREST request", async () => {
  const response = await handleWallFeed(
    new Request(
      "https://example.test/functions/v1/wall_feed?limit=5&offset=100000",
    ),
    {
      supabaseUrl: "https://project.test",
      secretKey: "sb_secret_test",
      fetchImpl: () =>
        Promise.resolve(
          new Response("", {
            status: 416,
            headers: { "content-range": "*/17" },
          }),
        ),
      logger: { log() {}, error() {} },
    },
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { items: [], count: 17 });
});

Deno.test("wall_feed contains response body read failures", async () => {
  const upstream = new Response("[]", { status: 200 });
  Object.defineProperty(upstream, "text", {
    value: () => Promise.reject(new Error("sensitive body read failure")),
  });

  const response = await handleWallFeed(
    new Request("https://example.test/functions/v1/wall_feed"),
    {
      supabaseUrl: "https://project.test",
      secretKey: "sb_secret_test",
      fetchImpl: () => Promise.resolve(upstream),
      logger: { log() {}, error() {} },
    },
  );

  assertEquals(response.status, 502);
  const body = await response.text();
  assertMatch(body, /"error":"wall_feed_upstream_unavailable"/);
  assertNotMatch(body, /sensitive body read failure/);
});

Deno.test("wall_feed escapes user-supplied ilike metacharacters", async () => {
  let capturedUrl = "";
  const response = await handleWallFeed(
    new Request(
      "https://example.test/functions/v1/wall_feed?q=100%25_%2A%5C",
    ),
    {
      supabaseUrl: "https://project.test",
      secretKey: "sb_secret_test",
      fetchImpl: (input) => {
        capturedUrl = String(input);
        return Promise.resolve(new Response("[]", { status: 200 }));
      },
      logger: { log() {}, error() {} },
    },
  );

  assertEquals(response.status, 200);
  assertEquals(
    new URL(capturedUrl).searchParams.get("title"),
    "ilike.*100\\%\\_\\*\\\\*",
  );
});

Deno.test("wall_feed rate limits repeated client bursts before PostgREST", async () => {
  let called = 0;
  const state = new Map<
    string,
    { windowStartedAt: number; requestCount: number }
  >();
  const request = () =>
    handleWallFeed(
      new Request("https://example.test/functions/v1/wall_feed", {
        headers: { "x-forwarded-for": "192.0.2.10" },
      }),
      {
        supabaseUrl: "https://project.test",
        secretKey: "sb_secret_test",
        nowMs: () => 1_000,
        rateLimitState: state,
        fetchImpl: () => {
          called += 1;
          return Promise.resolve(new Response("[]", { status: 200 }));
        },
        logger: { log() {}, error() {} },
      },
    );

  for (let index = 0; index < 120; index += 1) {
    assertEquals((await request()).status, 200);
  }
  const limited = await request();

  assertEquals(limited.status, 429);
  assertEquals(limited.headers.get("retry-after"), "60");
  assertEquals(await limited.json(), {
    ok: false,
    error: "rate_limit_exceeded",
  });
  assertEquals(called, 120);
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
