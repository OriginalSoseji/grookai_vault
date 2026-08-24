import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

import {
  PRODUCTION_SAME_CANDIDATE_CLIENT_GATE_V1,
  REQUIRED_CLIENT_JOURNEYS_V1,
  evaluateProductionSameCandidateClientGateV1
} from './production_same_candidate_client_gate_v1.mjs';

const execFileAsync = promisify(execFile);
export const PACKAGE_VERSION = 'PRODUCTION_SAME_CANDIDATE_PACKAGE_PREP_V1';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stamp(date) {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

async function command(executable, args) {
  const { stdout } = await execFileAsync(executable, args, {
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true
  });
  return stdout.trim();
}

function parseArgs(argv, now) {
  const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const defaultRoot = process.platform === 'win32'
    ? path.join('C:\\secure-ops', 'production-backend-launch', 'same-candidate-prep')
    : path.join('artifacts', 'production-backend-launch', 'same-candidate-prep');
  return {
    outDir: path.resolve(value('--out-dir') ?? path.join(defaultRoot, `${stamp(now)}_preparation`))
  };
}

export function buildSameCandidateManifestTemplateV1({ sourceCommitSha }) {
  const artifact = (platform) => ({
    source_commit_sha: null,
    build_id: null,
    built_at: null,
    ...(platform === 'web' ? { deployment_url: null } : { binary_sha256: null })
  });
  const journey = () => ({
    source_commit_sha: null,
    observed_at: null,
    database_reconciliation: 'not_run',
    checks: Object.fromEntries(REQUIRED_CLIENT_JOURNEYS_V1.map((name) => [name, 'not_run'])),
    evidence_paths: []
  });
  return {
    schema_version: PRODUCTION_SAME_CANDIDATE_CLIENT_GATE_V1,
    candidate: {
      source_commit_sha: sourceCommitSha,
      frozen_at: null
    },
    artifacts: {
      web: artifact('web'),
      android: artifact('android'),
      ios: artifact('ios')
    },
    journeys: {
      web: journey(),
      android: journey(),
      ios: journey()
    },
    boundaries: {
      production_database_writes: false,
      public_rollout: false
    }
  };
}

function markdown(report) {
  return [
    `# ${PACKAGE_VERSION}`,
    '',
    `- Prepared: \`${report.prepared_at}\``,
    `- Source commit: \`${report.git.commit_sha}\``,
    `- Branch: \`${report.git.branch}\``,
    `- Tracked worktree clean: \`${report.git.tracked_worktree_clean}\``,
    `- Candidate frozen: \`false\``,
    `- Gate status: **${report.gate.status.toUpperCase()}**`,
    '',
    '## Required Evidence',
    '',
    '- One web deployment built from the candidate SHA',
    '- One governed Android binary built from the candidate SHA',
    '- One TestFlight iOS binary built from the candidate SHA',
    ...REQUIRED_CLIENT_JOURNEYS_V1.map((journey) => `- \`${journey}\` passed on web, Android, and iOS`),
    '- Zero-mismatch database reconciliation for every platform journey packet',
    '',
    '## Current Gate Findings',
    '',
    ...report.gate.findings.map((code) => `- \`${code}\``),
    '',
    '## Boundaries',
    '',
    '- This package does not freeze a candidate.',
    '- No deployment, build, database write, or public rollout was started.',
    '- Artifact source SHAs remain empty until proven by build/deployment metadata.',
    ''
  ].join('\n');
}

export async function runSameCandidatePackagePrepV1({ argv = process.argv.slice(2), now = new Date() } = {}) {
  const args = parseArgs(argv, now);
  const [commitSha, branch, trackedChanges, aheadBehind] = await Promise.all([
    command('git', ['rev-parse', 'HEAD']),
    command('git', ['branch', '--show-current']),
    command('git', ['status', '--short', '--untracked-files=no']),
    command('git', ['rev-list', '--left-right', '--count', 'origin/main...HEAD']).catch(() => 'unavailable')
  ]);
  const manifest = buildSameCandidateManifestTemplateV1({ sourceCommitSha: commitSha });
  const gate = await evaluateProductionSameCandidateClientGateV1(manifest, { verifyEvidencePaths: false });
  const [behind, ahead] = /^\d+\s+\d+$/.test(aheadBehind)
    ? aheadBehind.split(/\s+/).map(Number)
    : [null, null];
  const body = {
    schema_version: PACKAGE_VERSION,
    prepared_at: now.toISOString(),
    git: {
      commit_sha: commitSha,
      branch,
      tracked_worktree_clean: trackedChanges.length === 0,
      commits_behind_origin_main: behind,
      commits_ahead_of_origin_main: ahead
    },
    candidate_frozen: false,
    manifest_template: 'same_candidate_client_manifest.template.json',
    required_journeys: [...REQUIRED_CLIENT_JOURNEYS_V1],
    gate,
    boundaries: {
      deployment_started: false,
      mobile_build_started: false,
      production_database_writes: false,
      public_rollout: false
    }
  };
  const report = { ...body, report_fingerprint_sha256: sha256(JSON.stringify(body)) };
  await fs.mkdir(args.outDir, { recursive: true });
  const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
  const reportContent = `${JSON.stringify(report, null, 2)}\n`;
  await Promise.all([
    fs.writeFile(path.join(args.outDir, 'same_candidate_client_manifest.template.json'), manifestContent),
    fs.writeFile(path.join(args.outDir, 'same_candidate_client_manifest.template.json.sha256'), `${sha256(manifestContent)}  same_candidate_client_manifest.template.json\n`),
    fs.writeFile(path.join(args.outDir, 'preparation_report.json'), reportContent),
    fs.writeFile(path.join(args.outDir, 'preparation_report.json.sha256'), `${sha256(reportContent)}  preparation_report.json\n`),
    fs.writeFile(path.join(args.outDir, 'SAME_CANDIDATE_PREPARATION.md'), markdown(report))
  ]);
  process.stdout.write(`${JSON.stringify({
    status: report.gate.status,
    candidate_frozen: report.candidate_frozen,
    commit_sha: commitSha,
    branch,
    tracked_worktree_clean: report.git.tracked_worktree_clean,
    findings: report.gate.findings,
    artifact_directory: args.outDir,
    report_fingerprint_sha256: report.report_fingerprint_sha256
  }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runSameCandidatePackagePrepV1().catch((error) => {
    console.error(`[production-same-candidate-package-prep] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
