import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Route } from "@playwright/test";
import { collectorFixtureAssets } from "./fixtureAssets";

export const collectorFixturePath = "/visual-fixtures/collector";
export const expectedCollectorImageCounts = { pulse: 17, discover: 15, empty: 15 } as const;

const assetFiles = new Map<string, string>(collectorFixtureAssets.map(({ url, fileName }) => [
  url, path.resolve(__dirname, "../../public/visual-fixtures/collector", fileName),
]));

export function createCollectorFixtureRequestHandler(baseURL: string) {
  const origin = new URL(baseURL);
  if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
    throw new Error("Collector fixtures require a loopback HTTP server.");
  }

  return async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const sameOrigin = url.origin === origin.origin;

    // Next's notFound development overlay asks for stack frames. Never forward it.
    if (sameOrigin && method === "POST" && url.pathname === "/__nextjs_original-stack-frames") {
      await route.abort("blockedbyclient");
      return;
    }

    let assetFile = method === "GET" ? assetFiles.get(url.href) : undefined;
    if (sameOrigin && method === "GET" && url.pathname === "/_next/image") {
      const imageURL = url.searchParams.get("url") ?? "";
      assetFile = assetFiles.get(imageURL);
      if (!assetFile && !/^\/grookai-logo-(16|32|64|192|512)\.png$/.test(imageURL)) {
        await route.abort("blockedbyclient");
        throw new Error("Fixture optimizer request is not an exact fixture asset or local logo.");
      }
    }
    if (assetFile) {
      await route.fulfill({ status: 200, contentType: "image/webp", body: await readFile(assetFile) });
      return;
    }

    const allowed = sameOrigin && method === "GET" && (
      url.pathname === collectorFixturePath || url.pathname.startsWith(`${collectorFixturePath}/`) ||
      url.pathname.startsWith("/_next/") || url.pathname.startsWith("/__nextjs") ||
      /^\/grookai-logo-(16|32|64|192|512)\.png$/.test(url.pathname) || url.pathname === "/favicon.ico"
    );
    if (!allowed) {
      await route.abort("blockedbyclient");
      throw new Error(`Fixture attempted a non-fixture request: ${method} ${url.origin}${url.pathname}`);
    }
    await route.continue();
  };
}

export async function installCollectorFixtureRoutes(context: BrowserContext, baseURL: string | undefined) {
  if (!baseURL) throw new Error("Collector fixture baseURL is required.");
  await context.route("**/*", createCollectorFixtureRequestHandler(baseURL));
}
