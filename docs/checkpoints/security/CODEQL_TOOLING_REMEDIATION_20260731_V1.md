# CodeQL Tooling Remediation 20260731 V1

## Context

- Repository: `OriginalSoseji/grookai_vault`
- Branch: `security/codeql-tooling-boundary-v1`
- Baseline default-branch commit: `f8cfee590994bfd465d87a47f7cdf5307bb81067`
- Baseline open CodeQL alerts on `refs/heads/main`: `526`
- CodeQL setup: GitHub default setup, default query suite, remote threat model
- Runtime security fixes from PR `#161` were already merged and deployed before this pass.

## Problem

The remaining CodeQL total mixed three different authorities:

1. owned executable maintenance and acquisition code;
2. historical one-shot tooling that remains executable when an operator invokes it;
3. immutable downloaded HTML retained only as source evidence.

Treating the total as one runtime defect count was inaccurate. Excluding all audit paths would also be unsafe because Grookai-owned scripts in those paths can fetch remote data, connect to production, or perform guarded writes.

## Baseline Inventory

### By path authority

| Scope | Alerts |
|---|---:|
| `scripts/audits/**` | 444 |
| `docs/audits/**/raw_sources/**` | 38 |
| `backend/warehouse/**` | 24 |
| `backend/identity/**` | 9 |
| `docs/audits/**/cache/**` | 8 |
| `scripts/ingest/**` | 3 |

### Leading rules

| Rule | Alerts |
|---|---:|
| `js/incomplete-sanitization` | 275 |
| `js/double-escaping` | 88 |
| `js/functionality-from-untrusted-source` | 38 |
| `js/incomplete-url-substring-sanitization` | 25 |
| `js/identity-replacement` | 24 |
| `js/disabling-certificate-validation` | 22 |
| `js/incomplete-hostname-regexp` | 17 |
| `js/bad-tag-filter` | 14 |
| `js/redos` | 9 |
| `js/xss-through-dom` | 8 |

## Decision

- Keep CodeQL enabled for all Grookai-owned JavaScript and TypeScript, including audit and maintenance scripts.
- Do not switch to advanced setup or add a broad path exclusion to reduce the alert count.
- Classify the 46 alerts in downloaded HTML/cache files as non-executable third-party evidence. These files are never imported, bundled, served, or executed by Grookai.
- Repair owned high-severity reusable code first.
- Preserve database TLS behavior outside this pass unless the affected connection can be verified under its own production contract.

## Repairs

This pass is designed to close 31 high-severity alerts:

- 8 `js/redos` alerts in four identity maintenance scripts by replacing ambiguous suffix regular expressions with one linear shared normalizer;
- 1 `js/redos` alert in official checklist PDF extraction by replacing a multi-alternative token regex with bounded operator parsing;
- 22 `js/disabling-certificate-validation` alerts by restoring peer verification for HTTPS acquisition and for the pinned PostgreSQL bootstrap.

Operator-specific certificate authorities must be supplied through the normal Node trust configuration, such as `NODE_EXTRA_CA_CERTS`. Disabling peer verification is no longer an accepted fallback.

## Evidence Boundary

The 46 third-party evidence alerts are confined to:

- `docs/audits/new_set_release_ingestion_v1/20260714_abyss_eye_pitch_black/raw_sources/abyss_eye_jp/*.html` (`38`)
- `docs/audits/english_master_index_source_exhaustion_v1/justinbasil_prize_pack_finish_acquisition_v1/cache/*.html` (`8`)

They are retained byte-for-byte for provenance. Their classification does not authorize dismissing any alert in `scripts/**`, `backend/**`, `apps/**`, or `supabase/**`.

## Verification

- Targeted security/ingestion/WH22/WH23 tests: `32/32` passed.
- Full contract suite: `1235/1235` passed.
- Syntax checks for all new and directly changed shared modules: passed.
- `git diff --check`: passed.
- The managed shipcheck hook could not pass `grookai:preflight` because this isolated worktree has no `SUPABASE_DB_URL`; the repository's documented intentional `--no-verify` publication path was used only after the independent secret guard, syntax, targeted, full-contract, and diff gates passed.
- Database writes: none.
- Supabase deployments: none.
- Production configuration changes: none.
- Active pricing canary: unchanged.

## Current Truths

- The deployed runtime CodeQL findings repaired in PR `#161` remain closed.
- This pass materially reduces high-severity maintenance-tool risk but does not clear the full historical backlog.
- The open count after merge and default-branch CodeQL analysis is authoritative; projected counts are not completion evidence.
- The 46 downloaded-evidence alerts may be dismissed only with an explicit non-executable-evidence rationale after path-by-path readback.
- Every remaining owned-code alert must be repaired or individually adjudicated. It must not be hidden by excluding audit directories.

## Invariants

- Never disable TLS certificate verification to work around a local trust-chain problem.
- Never provide credentials to an unverified PostgreSQL peer.
- Never treat downloaded HTML evidence as application code.
- Never use evidence classification to suppress Grookai-owned executable tooling.
- Never claim CodeQL completion from a projected alert count.
- Never modify production data as part of static-analysis remediation.

## Remaining Work

1. Merge this pass and require the default-branch CodeQL scan to finish.
2. Confirm all 31 targeted alert numbers close on `main` and no replacement findings appear.
3. Path-check and explicitly adjudicate the 46 downloaded-evidence alerts.
4. Re-inventory the remaining owned-code alerts by reusable tool family.
5. Repair URL/hostname handling before lower-risk output-normalization warnings.
6. Continue release gates separately: physical clean-account iPhone journey, 72-hour pricing canary completion, ordered migrations, 17-surface proof, and seven unattended cycles.

## Explicit Next Gate

The next gate is a merged default-branch CodeQL readback proving the 31 targeted high-severity findings are closed without new alerts. No CodeQL alert classification or further repair batch should be declared complete before that readback.
