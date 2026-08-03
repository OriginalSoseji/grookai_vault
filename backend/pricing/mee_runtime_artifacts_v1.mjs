import path from "node:path";

export const MEE_RUNTIME_ARTIFACTS_VERSION = "MEE_RUNTIME_ARTIFACTS_V1";
export const MEE_REPO_AUDIT_RELATIVE_PATH = "docs/audits/market_evidence_engine_v1";

export function resolveMeeAuditRootV1(repoRoot, configuredRoot = process.env.MEE_RUNTIME_ARTIFACT_ROOT) {
  if (!repoRoot) throw new Error("repoRoot is required");
  const configured = String(configuredRoot ?? "").trim();
  return configured ? path.resolve(configured) : path.join(repoRoot, MEE_REPO_AUDIT_RELATIVE_PATH);
}

export function resolveMeeArtifactInputV1(repoRoot, filePath) {
  if (!filePath) return null;
  return path.isAbsolute(filePath) ? path.normalize(filePath) : path.resolve(repoRoot, filePath);
}

export function meeArtifactReferenceV1(repoRoot, filePath) {
  const resolved = path.resolve(filePath);
  const relative = path.relative(repoRoot, resolved);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replace(/\\/g, "/");
  }
  return resolved.replace(/\\/g, "/");
}
