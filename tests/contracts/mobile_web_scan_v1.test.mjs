import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const page = read("apps/web/src/app/scan/page.tsx");
const client = read("apps/web/src/app/scan/ScanClient.tsx");
const styles = read("apps/web/src/app/scan/scan.module.css");

test("production Scan is an authenticated, non-indexed /scan route", () => {
  assert.match(page, /requireServerUser\("\/scan"\)/);
  assert.match(page, /title:\s*"Scan \| Grookai Vault"/);
  assert.match(page, /index:\s*false/);
  assert.match(page, /<ScanClient\s*\/>/);
});

test("camera permission begins only from an explicit Start camera action", () => {
  const startHandler = client.indexOf("async function startCamera()");
  const getUserMedia = client.indexOf("navigator.mediaDevices.getUserMedia");
  const startButton = client.indexOf('onClick={startCamera}');

  assert.ok(startHandler >= 0, "startCamera handler must exist");
  assert.ok(
    getUserMedia > startHandler,
    "getUserMedia must live inside the explicit start handler",
  );
  assert.ok(startButton > getUserMedia, "a visible control must invoke startCamera");
  assert.match(client, /Camera access starts only after you choose Start camera\./);
  assert.doesNotMatch(
    client.slice(0, startHandler),
    /getUserMedia/,
    "camera access must not happen during render or mount",
  );
});

test("camera requests the rear camera, captures locally, and cleans every track", () => {
  assert.match(client, /audio:\s*false/);
  assert.match(client, /facingMode:\s*\{\s*ideal:\s*"environment"\s*\}/);
  assert.match(client, /context\.drawImage\(video/);
  assert.match(client, /canvas\.toBlob\(resolve,\s*"image\/jpeg",\s*0\.94\)/);
  assert.match(client, /stream\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(client, /videoRef\.current\.srcObject = null/);
  assert.match(client, /return \(\) => \{[\s\S]*stopCamera\(\)/);
  assert.match(client, /URL\.createObjectURL\(file\)/);
  assert.match(client, /URL\.revokeObjectURL/);
});

test("Scan includes an explicit device-photo fallback and denied states", () => {
  assert.match(client, /accept="image\/\*"/);
  assert.doesNotMatch(
    client,
    /<input[\s\S]*?accept="image\/\*"[\s\S]*?capture=/,
    "the fallback must allow an existing photo rather than forcing another camera",
  );
  assert.match(client, /NotAllowedError/);
  assert.match(client, /SecurityError/);
  assert.match(client, /NotFoundError/);
  assert.match(client, /Try camera again/);
  assert.match(client, /Use a photo instead/);
});

test("capture handoff is truthful, explicit, and mutation-free", () => {
  assert.match(client, /Grookai does not identify or add this photo yet\./);
  assert.match(client, /Nothing has been\s+uploaded\./);
  assert.match(client, /No photo is uploaded automatically\./);
  assert.match(client, /href="\/explore"/);
  assert.match(client, />\s*Search and add manually\s*</);
  assert.match(client, /href="\/vault\/import"/);
  assert.match(client, />\s*Import a Collectr CSV\s*</);
  assert.match(client, /Vault Import accepts a Collectr CSV only/);
  assert.match(client, /download=\{photo\.file\.name\}/);
  assert.match(client, /onClick=\{sharePhoto\}/);

  assert.doesNotMatch(client, /\bfetch\s*\(/);
  assert.doesNotMatch(client, /\bsupabase\b/i);
  assert.doesNotMatch(client, /\bimportVaultItems\b/);
  assert.doesNotMatch(client, /\bFormData\b/);
  assert.doesNotMatch(client, /\bserver action\b/i);
});

test("scanner surface preserves the canonical card geometry and accessible controls", () => {
  assert.match(styles, /aspect-ratio:\s*2\.5\s*\/\s*3\.5/);
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /env\(safe-area-inset-top\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(client, /aria-live="polite"/);
  assert.match(client, /role="alert"/);
  assert.match(client, /aria-label="Capture card photo"/);
  assert.match(client, /aria-label="Close scanner"/);
});
