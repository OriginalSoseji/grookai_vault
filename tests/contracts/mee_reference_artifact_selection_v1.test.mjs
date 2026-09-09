import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, utimes, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { latestNormalizedReferenceArtifactV1 } from "../../backend/pricing/mee_reference_artifact_selection_v1.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "grookai-mee-selection-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("grookai-mee-selection-"));
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

async function artifact(root, name, source, time, extra = {}) {
  const file = path.join(root, `mee_06c_normalized_reference_evidence_${name}.json`);
  await writeFile(file, JSON.stringify({ counts: { source_counts: { [source]: 1 } }, normalized_evidence: [extra] }));
  await utimes(file, time, time);
  return file;
}

test("selects newest matching source by modification time and does not read older payloads", async (t) => {
  const root = await fixture(t);
  await artifact(root, "z-old", "wanted", 100);
  const expected = await artifact(root, "a-new", "wanted", 200);
  const other = await artifact(root, "other", "other", 300);
  const reads = [];
  const result = await latestNormalizedReferenceArtifactV1(root, "wanted", {
    readJsonFile: async (file) => { reads.push(file); return JSON.parse(await readFile(file, "utf8")); },
  });
  assert.equal(result.fullPath, expected);
  assert.equal(result.mtimeMs, 200000);
  assert.equal(result.artifact.normalized_evidence.length, 1);
  assert.deepEqual(reads, [other, expected]);
});

test("returns null for absent sources and ignores unrelated files and matching directories", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, "mee_06c_normalized_reference_evidence_directory.json"));
  await writeFile(path.join(root, "unrelated.json"), "invalid");
  assert.equal(await latestNormalizedReferenceArtifactV1(root, "wanted"), null);
  await artifact(root, "other", "other", 100);
  assert.equal(await latestNormalizedReferenceArtifactV1(root, "wanted"), null);
});

test("invalid newest JSON fails closed without silently choosing older evidence", async (t) => {
  const root = await fixture(t);
  await artifact(root, "older", "wanted", 100);
  const invalid = await artifact(root, "newest", "wanted", 200);
  await writeFile(invalid, "invalid");
  await assert.rejects(latestNormalizedReferenceArtifactV1(root, "wanted"), SyntaxError);
});

test("historical payload volume does not determine selection heap usage", async (t) => {
  const root = await fixture(t);
  const payload = { visible_evidence: "x".repeat(3 * 1024 * 1024) };
  for (let i = 0; i < 24; i++) await artifact(root, String(i), "wanted", 100 + i, payload);
  const helper = new URL("../../backend/pricing/mee_reference_artifact_selection_v1.mjs", import.meta.url).href;
  const child = spawnSync(process.execPath, ["--max-old-space-size=64", "--input-type=module", "-e",
    `const {latestNormalizedReferenceArtifactV1:select}=await import(${JSON.stringify(helper)}); const r=await select(${JSON.stringify(root)},'wanted'); if(!r.fullPath.endsWith('_23.json'))process.exit(2); console.log(r.artifact.normalized_evidence.length);`,
  ], { encoding: "utf8", timeout: 30000 });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), "1");
});
