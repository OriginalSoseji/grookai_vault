import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  meeArtifactReferenceV1,
  resolveMeeArtifactInputV1,
  resolveMeeAuditRootV1,
} from "../../backend/pricing/mee_runtime_artifacts_v1.mjs";

test("MEE artifacts retain the repository audit path by default", () => {
  const repo = path.resolve("C:/repo");
  assert.equal(
    resolveMeeAuditRootV1(repo, null),
    path.join(repo, "docs/audits/market_evidence_engine_v1"),
  );
});

test("MEE artifacts can live outside an immutable release checkout", () => {
  const repo = path.resolve("C:/repo");
  const runtime = path.resolve("C:/runtime/mee");
  assert.equal(resolveMeeAuditRootV1(repo, runtime), runtime);
  assert.equal(meeArtifactReferenceV1(repo, path.join(runtime, "run.json")), path.join(runtime, "run.json").replace(/\\/g, "/"));
  assert.equal(resolveMeeArtifactInputV1(repo, path.join(runtime, "run.json")), path.join(runtime, "run.json"));
});
