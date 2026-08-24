import path from "node:path";

export const MEE_RUNTIME_ARTIFACTS_VERSION = "MEE_RUNTIME_ARTIFACTS_V1";
export const MEE_REPO_AUDIT_RELATIVE_PATH = "docs/audits/market_evidence_engine_v1";
export const MEE_RUNTIME_GENERATED_RELATIVE_PATH = "generated";

function configuredAuditRoot(configuredRoot) {
  const configured = String(configuredRoot ?? "").trim();
  return configured ? path.resolve(configured) : null;
}

export function resolveMeeAuditRootV1(repoRoot, configuredRoot = process.env.MEE_RUNTIME_ARTIFACT_ROOT) {
  if (!repoRoot) throw new Error("repoRoot is required");
  return configuredAuditRoot(configuredRoot)
    ?? path.join(repoRoot, MEE_REPO_AUDIT_RELATIVE_PATH);
}

export function resolveMeeRuntimePathV1(
  repoRoot,
  repoRelativePath,
  configuredRoot = process.env.MEE_RUNTIME_ARTIFACT_ROOT,
) {
  if (!repoRoot) throw new Error("repoRoot is required");
  if (!repoRelativePath) throw new Error("repoRelativePath is required");
  if (path.isAbsolute(repoRelativePath)) return path.normalize(repoRelativePath);

  const runtimeRoot = configuredAuditRoot(configuredRoot);
  const repositoryPath = path.resolve(repoRoot, repoRelativePath);
  const normalizedRelativePath = path.relative(repoRoot, repositoryPath);
  if (normalizedRelativePath.startsWith("..") || path.isAbsolute(normalizedRelativePath)) {
    throw new Error("repoRelativePath must stay inside repoRoot");
  }
  if (!runtimeRoot) return repositoryPath;

  const repoAuditPath = path.normalize(MEE_REPO_AUDIT_RELATIVE_PATH);
  const auditRelativePath = path.relative(repoAuditPath, normalizedRelativePath);
  if (
    auditRelativePath === ""
    || (!auditRelativePath.startsWith("..") && !path.isAbsolute(auditRelativePath))
  ) {
    return path.join(runtimeRoot, auditRelativePath);
  }

  return path.join(
    runtimeRoot,
    MEE_RUNTIME_GENERATED_RELATIVE_PATH,
    normalizedRelativePath,
  );
}

export function meeArtifactReadCandidatesV1(
  repoRoot,
  repoRelativePath,
  configuredRoot = process.env.MEE_RUNTIME_ARTIFACT_ROOT,
) {
  const runtimePath = resolveMeeRuntimePathV1(repoRoot, repoRelativePath, configuredRoot);
  const repositoryPath = path.resolve(repoRoot, repoRelativePath);
  return runtimePath === repositoryPath
    ? [repositoryPath]
    : [runtimePath, repositoryPath];
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
