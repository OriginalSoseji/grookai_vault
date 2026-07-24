import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const expectedDock = ["Pulse", "Wall", "Scan", "Vault", "Search"];

test("native visual parity manifest freezes the approved app and dock amendment", () => {
  const manifest = readJson(
    "docs/audits/mobile_web_native_parity_v1/app_canon_manifest.json",
  );

  assert.equal(
    manifest.source_baseline.commit,
    "abb42bddb170fe2ac71a21cc7036269c83c8b9dd",
  );
  assert.equal(manifest.installed_app.package, "com.grookai.vault");
  assert.equal(manifest.installed_app.version_code, 21);
  assert.equal(
    manifest.installed_app.apk_sha256,
    "810ae9964618f364abe1b7da548376867ff913e751edb3ca34f3e87850c2e892",
  );
  assert.deepEqual(manifest.visual_authority.approved_dock_order, expectedDock);
  assert.equal(manifest.private_reference_policy.commit_raw_captures, false);
});

test("route matrix gives every surface one shell mode and preserves Scan semantics", () => {
  const matrix = readJson(
    "docs/audits/mobile_web_native_parity_v1/route_state_matrix.json",
  );

  assert.deepEqual(matrix.primary_dock_order, expectedDock);
  assert.equal(matrix.mobile_max_width_exclusive_css_px, 900);

  for (const surface of matrix.surfaces) {
    assert.equal(typeof surface.shell_mode, "string");
    assert.ok(surface.shell_mode.length > 0, `${surface.surface} needs a shell mode`);
    assert.ok(Array.isArray(surface.routes) && surface.routes.length > 0);
    assert.ok(
      Array.isArray(surface.required_states) &&
        surface.required_states.length > 0,
      `${surface.surface} needs required states`,
    );
  }

  const scan = matrix.surfaces.find((surface) => surface.surface === "Scan");
  assert.deepEqual(scan.routes, ["/scan"]);
  assert.equal(scan.shell_mode, "fullscreen");
  assert.equal(scan.dock, "hidden");

  const importer = matrix.surfaces.find(
    (surface) => surface.surface === "Import and photos",
  );
  assert.deepEqual(importer.routes, ["/vault/import"]);
});

test("runtime shell manifest is the exact five-item owner-approved order", () => {
  const manifest = read(
    "apps/web/src/lib/mobileParity/shellManifest.ts",
  );
  let cursor = -1;

  for (const label of expectedDock) {
    const next = manifest.indexOf(`label: "${label}"`, cursor + 1);
    assert.ok(next > cursor, `${label} must follow the prior dock item`);
    cursor = next;
  }

  assert.match(manifest, /key: "scan"[\s\S]*?href: "\/scan"[\s\S]*?kind: "action"/);
  assert.doesNotMatch(manifest, /label: "Dex"/);
});

test("new parity authority explicitly supersedes conflicting shell guidance", () => {
  const contract = read(
    "docs/contracts/MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1.md",
  );
  const oldGuidance = read(
    "docs/contracts/MOBILE_JAKOBS_LAW_UX_CONTRACT_V1.md",
  );
  const binder = read(
    "docs/contracts/COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1.md",
  );

  assert.match(contract, /Pulse · Wall · Scan · Vault · Search/);
  assert.match(contract, /does not authorize:[\s\S]*database migration/i);
  assert.match(contract, /push, preview deployment, merge, production/i);
  assert.match(oldGuidance, /SUPERSEDED FOR MOBILE SHELL AND NAVIGATION/);
  assert.match(binder, /Pulse, Wall, Scan, Vault, and Search/);
});

test("visual fixtures fail closed in Vercel and keep private captures out of CI", () => {
  const fixtureMode = read("apps/web/src/lib/visualParity/fixtureMode.ts");
  const fixturePage = read(
    "apps/web/src/app/visual-fixtures/parity/[scenario]/page.tsx",
  );
  const packageJson = readJson("apps/web/package.json");

  assert.match(fixtureMode, /GROOKAI_VISUAL_TEST_MODE === "1"/);
  assert.match(fixtureMode, /process\.env\.VERCEL !== "1"/);
  assert.match(fixtureMode, /process\.env\.NODE_ENV !== "production"/);
  assert.match(fixturePage, /notFound\(\)/);
  assert.equal(
    packageJson.scripts["test:parity:visual"],
    "playwright test tests/parity/mobile.visual.spec.ts",
  );
  assert.equal(
    packageJson.scripts["test:parity:a11y"],
    "playwright test tests/parity/mobile.a11y.spec.ts",
  );
});
