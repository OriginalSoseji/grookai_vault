import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const requireFromWeb = createRequire(path.join(ROOT, "apps", "web", "package.json"));
const sharp = requireFromWeb("sharp");

const SOURCES = Object.freeze({
  icon: "apps/web/public/grookai-logo-512.png",
  androidSearch:
    "artifacts/release/signed_out_catalog_native_v1/charizard_results_no_keyboard.png",
  androidCard:
    "artifacts/release/signed_out_catalog_native_v1/charizard_card_current.png",
  physicalIphone:
    "docs/audits/release_completion_v1/device_ios/final_candidate_xcode_physical_journeys_v1/2026-08-08T02-15-47Z/iphone_testflight_286_search.png",
});

const OUTPUTS = Object.freeze({
  icon: "artifacts/store/google_play/app_icon_512.png",
  feature: "artifacts/store/google_play/feature_graphic_1024x500.png",
  googleSearch: "artifacts/store/google_play/phone_01_search.png",
  googleCard: "artifacts/store/google_play/phone_02_card.png",
  iphoneSearch: "artifacts/app_store/screenshots/prepared/iphone_65_01_search.png",
  manifest: "artifacts/store/store_media_manifest_v1.json",
  permanentManifest: "docs/audits/store_release_readiness_v1/store_media_manifest_v1.json",
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

async function sha256File(filePath) {
  return createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

async function requireSources() {
  for (const relativePath of Object.values(SOURCES)) {
    const stat = await fs.stat(absolute(relativePath)).catch(() => null);
    if (!stat?.isFile() || stat.size === 0) throw new Error(`missing store-media source: ${relativePath}`);
  }
}

async function writePhoneScreenshot(source, output) {
  await sharp(absolute(source))
    .resize({ width: 1080, height: 2160, fit: "cover", position: "top" })
    .png({ compressionLevel: 9 })
    .toFile(absolute(output));
}

async function writeFeatureGraphic() {
  const screenshot = await sharp(absolute(SOURCES.androidSearch))
    .resize({ width: 310, height: 452, fit: "cover", position: "top" })
    .png()
    .toBuffer();
  const logo = await sharp(absolute(SOURCES.icon))
    .resize({ width: 112, height: 112, fit: "contain" })
    .png()
    .toBuffer();
  const copy = Buffer.from(`
    <svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="500" fill="#06080d"/>
      <rect x="54" y="330" width="502" height="6" fill="#59a7ff"/>
      <rect x="54" y="348" width="232" height="6" fill="#31c48d"/>
      <text x="190" y="122" fill="#ffffff" font-family="Arial, sans-serif" font-size="58" font-weight="700">Grookai Vault</text>
      <text x="54" y="270" fill="#d9e1ec" font-family="Arial, sans-serif" font-size="29">Exact cards. One trusted vault.</text>
      <text x="54" y="410" fill="#9eabbc" font-family="Arial, sans-serif" font-size="22">Search  |  Identify  |  Collect</text>
      <rect x="672" y="24" width="328" height="452" rx="12" fill="#101722" stroke="#26364a" stroke-width="2"/>
    </svg>
  `);
  await sharp({ create: { width: 1024, height: 500, channels: 3, background: "#06080d" } })
    .composite([
      { input: copy, left: 0, top: 0 },
      { input: logo, left: 54, top: 36 },
      { input: screenshot, left: 681, top: 24 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(absolute(OUTPUTS.feature));
}

async function describe(relativePath, provenance) {
  const filePath = absolute(relativePath);
  const [metadata, stat, hash] = await Promise.all([
    sharp(filePath).metadata(),
    fs.stat(filePath),
    sha256File(filePath),
  ]);
  return {
    path: relativePath,
    width: metadata.width,
    height: metadata.height,
    bytes: stat.size,
    sha256: hash,
    provenance,
  };
}

async function main() {
  await requireSources();
  for (const output of Object.values(OUTPUTS)) {
    await fs.mkdir(path.dirname(absolute(output)), { recursive: true });
  }

  await sharp(absolute(SOURCES.icon))
    .flatten({ background: "#000000" })
    .resize({ width: 512, height: 512, fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(absolute(OUTPUTS.icon));
  await Promise.all([
    writePhoneScreenshot(SOURCES.androidSearch, OUTPUTS.googleSearch),
    writePhoneScreenshot(SOURCES.androidCard, OUTPUTS.googleCard),
    sharp(absolute(SOURCES.physicalIphone))
      .resize({ width: 1242, height: 2688, fit: "cover", position: "top" })
      .png({ compressionLevel: 9 })
      .toFile(absolute(OUTPUTS.iphoneSearch)),
    writeFeatureGraphic(),
  ]);

  const assets = await Promise.all([
    describe(OUTPUTS.icon, "existing Grookai production icon"),
    describe(OUTPUTS.feature, "deterministic composition using Grookai icon and current Android build 297 search evidence"),
    describe(OUTPUTS.googleSearch, "current Android build 297 emulator search evidence"),
    describe(OUTPUTS.googleCard, "current Android build 297 emulator card-detail evidence"),
    describe(OUTPUTS.iphoneSearch, "physical iPhone TestFlight build 286 search evidence; no material Search redesign through build 297"),
  ]);
  const sources = await Promise.all(
    Object.entries(SOURCES).map(async ([key, relativePath]) => ({
      key,
      path: relativePath,
      sha256: await sha256File(absolute(relativePath)),
    })),
  );
  const manifest = {
    schema_version: "GROOKAI_STORE_MEDIA_MANIFEST_V1",
    generated_at: new Date().toISOString(),
    generator: "scripts/release/generate_store_media_assets_v1.mjs",
    sources,
    assets,
    intentionally_missing: [
      {
        path: "artifacts/app_store/screenshots/prepared/ipad_pro_129_01_search.png",
        reason: "Requires a truthful current iPad or iPad-simulator capture on macOS; no synthetic replacement is authorized.",
      },
    ],
  };
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  await Promise.all([
    fs.writeFile(absolute(OUTPUTS.manifest), manifestJson),
    fs.writeFile(absolute(OUTPUTS.permanentManifest), manifestJson),
  ]);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[generate-store-media-assets-v1] ${error.stack || error.message}`);
  process.exitCode = 1;
});
