import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const helper = fs.readFileSync(
  path.join(repoRoot, "apps", "web", "src", "lib", "network", "getCardStreamRows.ts"),
  "utf8",
);
const page = fs.readFileSync(
  path.join(repoRoot, "apps", "web", "src", "app", "network", "page.tsx"),
  "utf8",
);

test("Network copy drilldown is scoped to visible owners and cards", () => {
  assert.match(helper, /\.in\(["']user_id["'],\s*ownerUserIds\)/);
  assert.match(helper, /\.in\(["']card_print_id["'],\s*cardPrintIds\)/);
  assert.match(helper, /\.in\(["']slab_cert_id["'],\s*slabCertIds\.slice/);
  assert.match(helper, /Scope both copy lanes to the visible cards/);
});

test("Network first paint has a bounded card payload", () => {
  assert.match(page, /NETWORK_STREAM_PAGE_LIMIT\s*=\s*24/);
  assert.match(page, /limit:\s*NETWORK_STREAM_PAGE_LIMIT/);
});
