import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const webRoot = new URL("../../apps/web/", import.meta.url);
const require = createRequire(new URL("package.json", webRoot));
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = (name) => readFileSync(new URL(`src/${name}`, webRoot), "utf8");

// Only the route's service/component boundaries are doubled. No database or actions run.
function harness({ user = null, rows = [], collectors = [], env = {} } = {}) {
  const calls = { auth: 0, cards: [], discover: [], streamProps: [], collectorProps: [], targets: [] };
  const modules = new Map();
  const mocks = {
    "next/link": ({ children, prefetch, ...props }) => React.createElement("a", props, children),
    "@/lib/auth/requireServerUser": {
      getOptionalServerUser: async () => { calls.auth++; return { user }; },
    },
    "@/lib/network/getCardStreamRows": {
      getCardStreamRows: async (args) => { calls.cards.push(args); return rows; },
    },
    "@/lib/network/getCollectorDiscoverRows": {
      getCollectorDiscoverRows: async (args) => { calls.discover.push(args); return collectors; },
    },
    "@/components/network/NetworkStreamCard": (props) => { calls.streamProps.push(props); return null; },
    "@/components/public/CollectorListRow": (props) => { calls.collectorProps.push(props); return null; },
    "@/components/network/ContactEligibilityProvider": ({ targets, children }) => {
      calls.targets.push(...targets);
      return children;
    },
  };

  function load(name) {
    if (modules.has(name)) return modules.get(name);
    const file = [name, `${name}.tsx`, `${name}.ts`].find((candidate) =>
      existsSync(new URL(`src/${candidate}`, webRoot)),
    );
    assert.ok(file, `Missing presentation module: ${name}`);
    const module = { exports: {} };
    const code = ts.transpileModule(source(file), {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      URLSearchParams,
      process: { env },
      require: (id) => {
        if (Object.hasOwn(mocks, id)) return mocks[id];
        if (id.startsWith("@/")) return load(id.slice(2));
        return require(id);
      },
    }, { filename: file });
    modules.set(name, module.exports);
    return module.exports;
  }

  return {
    calls,
    nav: (active) => renderToStaticMarkup(React.createElement(load("components/network/NetworkSectionNav").default, { active })),
    render: async (route, searchParams = {}) => {
      const Page = load(`app/network/${route === "discover" ? "discover/" : ""}page`).default;
      return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(searchParams) }));
    },
  };
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("protected design preview retains Pulse tabs without private reader calls", async () => {
  const h = harness({ env: { NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY: "true" } });
  for (const route of ["cards", "discover"]) {
    const html = await h.render(route);
    assert.match(html, /not connected to this read-only preview/);
    assert.match(html, /href="\/network\/discover"/);
  }
  assert.equal(h.calls.auth, 0);
  assert.equal(h.calls.cards.length, 0);
  assert.equal(h.calls.discover.length, 0);
});

test("Discover is an explicit Pulse tab; every section exposes its active route", () => {
  for (const [active, href, label] of [
    ["cards", "/network", "Cards"],
    ["collectors", "/network/discover", "Discover"],
    ["nearby", "/network/nearby", "Nearby"],
  ]) {
    const html = harness({ env: { LOCAL_COMMUNITY_FEED_V1_ENABLED: "true" } }).nav(active);
    assert.match(html, /<nav aria-label="Pulse sections"/);
    assert.match(html, new RegExp(`href="${href}" aria-current="page"[^>]*>${label}</a>`));
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    assert.match(html, /href="\/network\/discover"[^>]*>Discover<\/a>/);
  }
});

test("Nearby still respects default-off, staging enablement and explicit disable precedence", () => {
  for (const [env, enabled] of [
    [{}, false],
    [{ APP_ENV: "staging" }, true],
    [{ VERCEL_ENV: "preview" }, true],
    [{ NEXT_PUBLIC_LOCAL_COMMUNITY_FEED_V1_ENABLED: "true" }, true],
    [{ APP_ENV: "staging", LOCAL_COMMUNITY_FEED_V1_ENABLED: "false" }, false],
    [{ LOCAL_COMMUNITY_FEED_V1_ENABLED: "true", NEXT_PUBLIC_LOCAL_COMMUNITY_FEED_V1_ENABLED: "false" }, false],
  ]) {
    assert.equal(harness({ env }).nav("cards").includes('href="/network/nearby"'), enabled);
  }
});

test("Pulse forwards reader rows, verified viewer and exact-copy eligibility without extra discovery reads", async () => {
  const rows = [
    { vaultItemId: "group-a", cardPrintId: "card-a", inPlayCopies: [{ vaultItemId: "copy-a" }, { vaultItemId: "copy-b" }] },
    { vaultItemId: "group-b", cardPrintId: "card-b", inPlayCopies: [] },
  ];
  const app = harness({ user: { id: "viewer" }, rows });
  const html = await app.render("cards", { intent: " TRADE " });
  assert.equal(app.calls.auth, 1);
  assert.deepEqual(plain(app.calls.cards), [{ intent: "trade", excludeUserId: "viewer", limit: 24 }]);
  assert.deepEqual(app.calls.discover, []);
  assert.deepEqual(plain(app.calls.targets), [
    { vaultItemId: "copy-a", cardPrintId: "card-a" },
    { vaultItemId: "copy-b", cardPrintId: "card-a" },
    { vaultItemId: "group-b", cardPrintId: "card-b" },
  ]);
  assert.equal(app.calls.streamProps.length, rows.length);
  app.calls.streamProps.forEach((props, index) => {
    assert.equal(props.row, rows[index]);
    assert.equal(props.viewerUserId, "viewer");
    assert.equal(props.isAuthenticated, true);
    assert.equal(props.currentPath, "/network?intent=trade");
  });
  assert.match(html, /href="\/network\/inbox"[^>]*>.*Open inbox<\/a>/);
  assert.match(html, /href="\/network\?intent=trade" aria-current="page"/);
});

test("Signed-out Pulse preserves login and all governed intent destinations", async () => {
  for (const intent of [undefined, "hold", "invalid", "sell", "showcase"]) {
    const app = harness();
    const html = await app.render("cards", { intent });
    assert.equal(app.calls.cards[0].excludeUserId, null);
    assert.equal(app.calls.cards[0].intent, ["sell", "showcase"].includes(intent) ? intent : null);
    assert.match(html, /href="\/login\?next=%2Fnetwork"/);
    assert.match(html, /No cards available right now/);
    for (const value of ["trade", "sell", "showcase"]) assert.ok(html.includes(`href="/network?intent=${value}"`));
    assert.doesNotMatch(html, /href="\/network\?intent=hold"/);
    assert.equal(app.calls.targets.length, 0);
  }
});

test("Discover forwards only its bounded reader results and preserves follow/login props", async () => {
  const collectors = [
    { userId: "a", slug: "collector-a", displayName: "Collector A", avatarUrl: null, createdAt: "2026-09-01T12:00:00Z" },
    { userId: "b", slug: "collector-b", displayName: "Collector B", avatarUrl: null, createdAt: "invalid" },
    { userId: "c", slug: "collector-c", displayName: "Collector C", avatarUrl: null, createdAt: null },
  ];
  for (const user of [null, { id: "viewer" }]) {
    const app = harness({ user, collectors });
    const query = "@Collector & name";
    await app.render("discover", { q: `  ${query}  ` });
    assert.equal(app.calls.auth, 1);
    assert.deepEqual(plain(app.calls.discover), [{ query, excludeUserId: user?.id ?? null, limit: 30 }]);
    assert.deepEqual(app.calls.cards, []);
    app.calls.collectorProps.forEach((props, index) => {
      assert.equal(props.collector, collectors[index]);
      assert.equal(props.viewerUserId, user?.id ?? null);
      assert.equal(props.isAuthenticated, Boolean(user));
      assert.equal(props.initialIsFollowing, false);
      assert.equal(props.loginHref, `/login?next=${encodeURIComponent(`/network/discover?q=${encodeURIComponent(query)}`)}`);
      assert.equal(props.metadata, index === 0 ? "Joined Sep 2026" : "Collector");
    });
    assert.equal(app.calls.collectorProps.length, collectors.length);
  }
});

test("Discover GET search is labeled, safely renders query text and offers a real reset route", async () => {
  const html = await harness().render("discover", { q: '<script>alert("x")</script>' });
  const form = html.match(/<form\b[^>]*>/)?.[0] ?? "";
  for (const attribute of ['action="/network/discover"', 'method="get"', 'role="search"', 'aria-label="Collector search"']) {
    assert.ok(form.includes(attribute), `Search form must retain ${attribute}`);
  }
  assert.match(html, /<label for="collector-query"/);
  assert.match(html, /id="collector-query" type="search"/);
  assert.match(html, /aria-label="Search collectors"/);
  assert.match(html, /href="\/network\/discover" aria-label="Clear collector search"/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /No collectors found/);
});

test("Blank Discover search retains the unfiltered empty state and does not offer a redundant reset", async () => {
  const app = harness();
  const html = await app.render("discover", { q: "   " });
  assert.equal(app.calls.discover[0].query, null);
  assert.match(html, /Latest collectors/);
  assert.match(html, /No collectors available right now/);
  assert.doesNotMatch(html, /aria-label="Clear collector search"/);
});

test("Presentation stays unframed, uses existing routes, and adds no fetching or preview state", async () => {
  for (const route of ["cards", "discover"]) {
    const html = await harness().render(route);
    assert.match(html, /<h1[^>]*>Pulse<\/h1>/);
    assert.match(html, /aria-label="Collector destinations"/);
    for (const href of ["/network/discover", "/wall", "/vault", "/network/inbox"]) assert.ok(html.includes(`href="${href}"`));
  }
  for (const file of ["app/network/page.tsx", "app/network/discover/page.tsx", "components/network/NetworkPageLayout.tsx", "components/network/NetworkSectionNav.tsx"]) {
    assert.doesNotMatch(source(file), /localStorage|useStore|collector-site-preview|fetch\(|useEffect|createServerAdminClient|surface="(?:card|subtle)"/);
  }
  assert.match(source("components/network/NetworkPageLayout.tsx"), /prefetch=\{false\}/);
});
