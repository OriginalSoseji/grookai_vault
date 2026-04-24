import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANAGED_MARKER = 'GROOKAI_MANAGED_HOOK_V1';
const HOOK_NAMES = ['pre-commit', 'pre-push'];
const LOCAL_SUFFIX = '.grookai-local';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const gitDir = path.join(repoRoot, '.git');
const hooksDir = path.join(gitDir, 'hooks');

async function ensureGitHooksDir() {
  const gitDirExists = await exists(gitDir);
  if (!gitDirExists) {
    throw new Error(`Git directory not found at ${gitDir}`);
  }

  const hooksDirExists = await exists(hooksDir);
  if (!hooksDirExists) {
    throw new Error(`Git hooks directory not found at ${hooksDir}`);
  }
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readIfExists(targetPath) {
  if (!(await exists(targetPath))) {
    return null;
  }

  return fs.readFile(targetPath, 'utf8');
}

async function installHook(hookName) {
  const sourcePath = path.join(scriptDir, hookName);
  const targetPath = path.join(hooksDir, hookName);
  const localBackupPath = `${targetPath}${LOCAL_SUFFIX}`;

  const source = await fs.readFile(sourcePath, 'utf8');
  const existing = await readIfExists(targetPath);

  if (existing && !existing.includes(MANAGED_MARKER)) {
    if (await exists(localBackupPath)) {
      throw new Error(
        `Refusing to overwrite unmanaged hook because backup already exists: ${localBackupPath}`,
      );
    }

    await fs.rename(targetPath, localBackupPath);

    try {
      await fs.chmod(localBackupPath, 0o755);
    } catch {
      // Best-effort only. Windows/git may ignore executable mode.
    }
  }

  await fs.writeFile(targetPath, source, 'utf8');

  try {
    await fs.chmod(targetPath, 0o755);
  } catch {
    // Best-effort only. Windows/git may ignore executable mode.
  }

  return targetPath;
}

async function main() {
  await ensureGitHooksDir();

  const installed = [];
  for (const hookName of HOOK_NAMES) {
    installed.push(await installHook(hookName));
  }

  console.log('Grookai hooks installed:');
  for (const installedPath of installed) {
    console.log(`- ${path.relative(repoRoot, installedPath)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
