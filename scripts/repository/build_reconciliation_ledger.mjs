import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [recoveryRoot, outputPath, authorityArg] = process.argv.slice(2);

if (!recoveryRoot || !outputPath || !authorityArg) {
  throw new Error('Usage: node build_reconciliation_ledger.mjs <recovery-root> <output> <authority-sha>');
}

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 256 * 1024 * 1024,
    }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function readJson(name) {
  return JSON.parse(readFileSync(resolve(recoveryRoot, name), 'utf8'));
}

function classifyDomains(paths) {
  const domains = new Set();
  for (const path of paths) {
    if (path.startsWith('supabase/migrations/')) domains.add('migration');
    else if (path.startsWith('supabase/')) domains.add('supabase');
    else if (path.startsWith('apps/web/')) domains.add('web');
    else if (path.startsWith('lib/')) domains.add('flutter');
    else if (path.startsWith('ios/')) domains.add('ios');
    else if (path.startsWith('android/')) domains.add('android');
    else if (path.startsWith('backend/pricing/')) domains.add('pricing');
    else if (path.startsWith('backend/')) domains.add('backend');
    else if (path.startsWith('.github/workflows/')) domains.add('automation');
    else if (path.startsWith('docs/')) domains.add('documentation');
    else if (path.startsWith('scripts/')) domains.add('tooling');
    else if (path.startsWith('tests/') || path.startsWith('test/')) domains.add('tests');
    else domains.add('other');
  }
  return [...domains].sort();
}

const authority = git(['rev-parse', authorityArg]);
const emptyTree = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const localBranches = readJson('local_branches.json');
const worktrees = readJson('worktrees.json');
const pullRequests = readJson('pull_requests.json');
const remoteHeads = readFileSync(resolve(recoveryRoot, 'remote_heads.tsv'), 'utf8')
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [sha, ref] = line.split('\t');
    return { name: ref.replace('refs/heads/', ''), sha };
  });

const prByHead = new Map();
for (const pr of pullRequests) {
  const rows = prByHead.get(pr.headRefName) || [];
  rows.push(pr);
  prByHead.set(pr.headRefName, rows);
}

const worktreesByBranch = new Map();
for (const worktree of worktrees) {
  if (!worktree.branch) continue;
  const rows = worktreesByBranch.get(worktree.branch) || [];
  rows.push(worktree);
  worktreesByBranch.set(worktree.branch, rows);
}

const analysisBySha = new Map();

function analyzeSha(sha) {
  if (analysisBySha.has(sha)) return analysisBySha.get(sha);

  let relationship = 'diverged';
  if (sha === authority) {
    relationship = 'equal';
  } else if (git(['merge-base', '--is-ancestor', sha, authority], { allowFailure: true }) !== null) {
    relationship = 'ancestor';
  } else if (git(['merge-base', '--is-ancestor', authority, sha], { allowFailure: true }) !== null) {
    relationship = 'descendant';
  }

  const counts = git(['rev-list', '--left-right', '--count', `${authority}...${sha}`])
    .split(/\s+/)
    .map(Number);
  const needsDiff = relationship === 'descendant' || relationship === 'diverged';
  const discoveredMergeBase = needsDiff
    ? git(['merge-base', authority, sha], { allowFailure: true })
    : null;
  const mergeBase = needsDiff ? discoveredMergeBase || emptyTree : null;
  const allChangedPaths = needsDiff
    ? git(['diff', '--no-renames', '--name-only', mergeBase, sha])
        .split(/\r?\n/)
        .filter(Boolean)
    : [];
  const result = {
    relationship,
    merge_base: mergeBase,
    unrelated_history: needsDiff && discoveredMergeBase === null,
    authority_only_commits: counts[0],
    source_only_commits: counts[1],
    changed_path_count: allChangedPaths.length,
    changed_paths: allChangedPaths.slice(0, 500),
    changed_paths_truncated: allChangedPaths.length > 500,
    changed_domains: classifyDomains(allChangedPaths),
  };
  analysisBySha.set(sha, result);
  return result;
}

function decideDisposition({ name, analysis, prs, linkedWorktrees, sourceKind }) {
  if (name === 'main') {
    return { disposition: 'do_not_touch', reason: 'Production authority branch name is protected.' };
  }
  if (linkedWorktrees.some((worktree) => worktree.dirty)) {
    return { disposition: 'do_not_touch', reason: 'Dirty worktree requires explicit source reconciliation.' };
  }
  if (analysis.relationship === 'equal' || analysis.relationship === 'ancestor') {
    return {
      disposition: 'superseded_by_main',
      reason: 'Source commit is equal to or contained in production authority.',
    };
  }
  if (prs.some((pr) => pr.state === 'OPEN')) {
    return { disposition: 'fresh_pr_required', reason: 'Open unmerged PR requires fresh-main evaluation.' };
  }
  if (analysis.changed_domains.includes('migration')) {
    return {
      disposition: 'manual_migration_review',
      reason: 'Unmerged source changes migration history and cannot be transplanted automatically.',
    };
  }
  return {
    disposition: 'deferred_project',
    reason: `${sourceKind} contains unmerged changes requiring domain-level necessity review.`,
  };
}

function branchRow(sourceKind, name, sha) {
  const analysis = analyzeSha(sha);
  const prs = prByHead.get(name) || [];
  const linkedWorktrees = worktreesByBranch.get(name) || [];
  const decision = decideDisposition({ name, analysis, prs, linkedWorktrees, sourceKind });
  return {
    source_kind: sourceKind,
    source_name: name,
    sha,
    ...analysis,
    pull_requests: prs.map((pr) => ({
      number: pr.number,
      state: pr.state,
      draft: pr.isDraft,
      title: pr.title,
      url: pr.url,
      merge_commit: pr.mergeCommit,
    })),
    linked_worktrees: linkedWorktrees.map((worktree) => ({
      path: worktree.path,
      dirty: worktree.dirty,
      change_records: worktree.change_records,
    })),
    ...decision,
  };
}

const branchRows = [
  ...remoteHeads.map((row) => branchRow('remote_branch', row.name, row.sha)),
  ...localBranches.map((row) => branchRow('local_branch', row.branch, row.sha)),
];

const worktreeRows = worktrees.map((worktree) => {
  const analysis = analyzeSha(worktree.head);
  let disposition;
  let reason;
  if (worktree.dirty) {
    disposition = 'do_not_touch';
    reason = 'Dirty worktree preserved and pending explicit reconciliation.';
  } else if (analysis.relationship === 'equal' || analysis.relationship === 'ancestor') {
    disposition = worktree.detached ? 'historical_evidence' : 'superseded_by_main';
    reason = 'Worktree HEAD is contained in production authority.';
  } else if (analysis.changed_domains.includes('migration')) {
    disposition = 'manual_migration_review';
    reason = 'Worktree HEAD contains unmerged migration changes.';
  } else {
    disposition = 'deferred_project';
    reason = 'Worktree HEAD contains unmerged changes requiring domain review.';
  }
  return {
    source_kind: 'worktree',
    source_name: worktree.path,
    branch: worktree.branch,
    sha: worktree.head,
    dirty: worktree.dirty,
    change_records: worktree.change_records,
    ...analysis,
    disposition,
    reason,
  };
});

const allRows = [...branchRows, ...worktreeRows];
const dispositionCounts = {};
for (const row of allRows) {
  dispositionCounts[row.disposition] = (dispositionCounts[row.disposition] || 0) + 1;
}

const ledger = {
  schema_version: 'GROOKAI_REPOSITORY_RECONCILIATION_LEDGER_V1',
  generated_at: new Date().toISOString(),
  authority_sha: authority,
  sources: {
    remote_branches: remoteHeads.length,
    local_branches: localBranches.length,
    worktrees: worktrees.length,
    total_rows: allRows.length,
  },
  unique_source_shas: analysisBySha.size,
  disposition_counts: dispositionCounts,
  rows: allRows,
};

mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(resolve(outputPath), `${JSON.stringify(ledger, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify({
    authority_sha: authority,
    sources: ledger.sources,
    unique_source_shas: ledger.unique_source_shas,
    disposition_counts: ledger.disposition_counts,
  })}\n`,
);
