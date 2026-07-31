import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootUrl = new URL("../../", import.meta.url);

function source(relativePath) {
  return readFileSync(new URL(relativePath, rootUrl), "utf8").replaceAll("\r\n", "\n");
}

function requirementVersions() {
  return new Map(
    source("backend/ai_border_service/requirements.txt")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("==", 2)),
  );
}

test("AI border service retains the audited Python dependency floor", () => {
  const requirements = requirementVersions();

  assert.equal(requirements.get("fastapi"), "0.141.1");
  assert.equal(requirements.get("starlette"), "1.3.1");
  assert.equal(requirements.get("pillow"), "12.3.0");
  assert.equal(requirements.get("idna"), "3.15");
  assert.equal(requirements.get("click"), "8.3.3");
  assert.equal(requirements.get("requests"), "2.33.0");
  assert.equal(requirements.get("annotated-doc"), "0.0.5");
});

test("AI border service declares every unconditional third-party import", () => {
  const app = source("backend/ai_border_service/app.py");
  const requirements = requirementVersions();

  assert.match(app, /^import requests$/m);
  assert.equal(requirements.has("requests"), true);
});

test("backend npm tree retains patched archive and image-processing releases", () => {
  const packageJson = JSON.parse(source("backend/package.json"));

  assert.equal(packageJson.dependencies.sharp, "0.35.3");
  assert.equal(packageJson.overrides["adm-zip"], "0.6.0");
  assert.equal(packageJson.overrides.sharp, "0.35.3");
});
