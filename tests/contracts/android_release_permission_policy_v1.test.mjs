import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..", "..");
const read = (...segments) =>
  fs.readFileSync(path.join(root, ...segments), "utf8");

test("Android release removes broad media and microphone permissions", () => {
  const manifest = read("android", "app", "src", "main", "AndroidManifest.xml");

  assert.match(manifest, /xmlns:tools="http:\/\/schemas\.android\.com\/tools"/);
  for (const permission of [
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.RECORD_AUDIO",
  ]) {
    const escapedPermission = permission.replaceAll(".", "\\.");
    assert.match(
      manifest,
      new RegExp(
        `<uses-permission[^>]*android:name="${escapedPermission}"[^>]*tools:node="remove"[^>]*/>`,
      ),
      `${permission} must be removed from the merged manifest`,
    );
  }

  assert.doesNotMatch(manifest, /com\.google\.android\.gms\.permission\.AD_ID/);
});

test("every Flutter camera controller disables audio capture", () => {
  const cameraSources = [
    ["lib", "screens", "scanner_v5", "scan_capture_v5_screen.dart"],
    ["lib", "screens", "scanner", "fixed_slot_capture_screen.dart"],
    ["lib", "screens", "scanner", "condition_camera_screen.dart"],
  ];

  for (const sourcePath of cameraSources) {
    const source = read(...sourcePath);
    const constructors = [
      ...source.matchAll(/=\s*CameraController\([\s\S]*?\n\s*\);/g),
    ];
    assert.ok(
      constructors.length > 0,
      `${sourcePath.join("/")} must create a camera controller`,
    );
    for (const constructor of constructors) {
      assert.match(
        constructor[0],
        /enableAudio:\s*false/,
        `${sourcePath.join("/")} must not initialize audio capture`,
      );
    }
  }
});

test("Android release web gate targets the canonical production deployment", () => {
  const workflow = read(".github", "workflows", "release.yml");

  for (const expected of [
    'GROOKAI_COLLECTOR_RELEASE_V1: "true"',
    "VERCEL_ENV: production",
    "VERCEL_PROJECT_ID: prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum",
    "SITE_URL: https://grookaivault.com",
    "NEXT_PUBLIC_SITE_URL: https://grookaivault.com",
  ]) {
    assert.ok(
      workflow.includes(expected),
      `release workflow must include ${expected}`,
    );
  }
});

test("Android release version stays above the installed Play production build", () => {
  const pubspec = read("pubspec.yaml");
  const version = pubspec.match(/^version:\s*([^+\s]+)\+(\d+)\s*$/m);

  assert.ok(version, "pubspec.yaml must declare a numeric Android build number");
  assert.equal(version[1], "1.0.0");
  assert.ok(
    Number(version[2]) >= 410,
    "Android versionCode must remain above the installed Play production build 409",
  );
});
