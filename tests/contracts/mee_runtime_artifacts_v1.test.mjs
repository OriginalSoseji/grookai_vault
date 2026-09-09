import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  meeArtifactReadCandidatesV1,
  meeArtifactReferenceV1,
  resolveMeeArtifactInputV1,
  resolveMeeAuditRootV1,
  resolveMeeRuntimePathV1,
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

test("scheduled MEE outputs never write into an immutable release checkout", () => {
  const repo = path.resolve("C:/repo");
  const runtime = path.resolve("C:/runtime/mee");
  assert.equal(
    resolveMeeRuntimePathV1(
      repo,
      "docs/audits/market_evidence_engine_v1/package/report.json",
      runtime,
    ),
    path.join(runtime, "package/report.json"),
  );
  assert.equal(
    resolveMeeRuntimePathV1(repo, "docs/contracts/generated.md", runtime),
    path.join(runtime, "generated/docs/contracts/generated.md"),
  );
  assert.equal(
    resolveMeeRuntimePathV1(repo, "docs/sql/generated.sql", runtime),
    path.join(runtime, "generated/docs/sql/generated.sql"),
  );
});

test("MEE runtime reads prefer generated evidence and retain repository fallback", () => {
  const repo = path.resolve("C:/repo");
  const runtime = path.resolve("C:/runtime/mee");
  assert.deepEqual(
    meeArtifactReadCandidatesV1(
      repo,
      "docs/audits/market_evidence_engine_v1/package/report.json",
      runtime,
    ),
    [
      path.join(runtime, "package/report.json"),
      path.join(repo, "docs/audits/market_evidence_engine_v1/package/report.json"),
    ],
  );
});

test("MEE runtime output paths cannot escape the release-relative namespace", () => {
  assert.throws(
    () => resolveMeeRuntimePathV1(path.resolve("repo"), "../outside.txt", path.resolve("runtime/mee")),
    /must stay inside repoRoot/,
  );
});
