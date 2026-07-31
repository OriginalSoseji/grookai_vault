# CodeQL URL Authority Remediation 20260731 V1

## Context

- Repository: `OriginalSoseji/grookai_vault`
- Branch: `security/codeql-url-authority-v1`
- Baseline default-branch commit: `beabcc5fd56eb3672c0857f85eb8038949666430`
- Baseline open CodeQL alerts: `448`
- Baseline high-severity URL/hostname findings: `43`
- Database writes: none
- Supabase deployments: none
- Production configuration changes: none

## Problem

Historical acquisition and audit tooling used substring checks to decide whether
a URL belonged to a trusted source. A lookalike hostname could satisfy those
checks. Two enrichment scripts could then forward the Pokemon TCG API key to the
wrong host. Three PKMNCollectors scripts also stored URL strings in positional
tuples that CodeQL could trace into a dynamic regular-expression helper.

The web cohesion crawler separately excluded only a short list of URL schemes,
which left other non-web schemes implicit. One legacy image uploader contained
an adjacent fallback that deliberately disabled certificate verification for
two source hosts.

## Risk

- Credential disclosure to a lookalike host.
- Incorrect source-authority classification.
- Unsafe acceptance of non-HTTP links by audit tooling.
- Ambiguous URL values reaching a regular-expression sink.
- Man-in-the-middle exposure in a manually invoked storage uploader.

## Decision

Introduce one shared URL authority module based on the platform `URL` parser:

- accept only `http:` and `https:` URLs;
- compare normalized hostnames exactly;
- allow subdomains only when the caller opts in;
- require HTTPS before forwarding the Pokemon TCG API key;
- support pathname constraints independently of host authority;
- resolve crawler links only when the final URL remains HTTP/HTTPS and
  same-origin.

Convert PKMNCollectors targets from positional tuples to named objects so
`cardName` and `sourceUrl` remain distinct data-flow properties. Remove the
legacy certificate-verification bypass instead of narrowing its hostname check.

## Repairs

This pass is designed to close:

- `js/incomplete-url-substring-sanitization`: `25`
- `js/incomplete-hostname-regexp`: `17`
- `js/incomplete-url-scheme-check`: `1`

The shared authority policy is applied to:

- Pokemon TCG API credential forwarding;
- source-family classification;
- ThePriceDex preserved evidence selection;
- exact-variant source-lane classification;
- self-hosted image source-lane classification;
- web cohesion same-origin link extraction.

## Alternatives Rejected

- Broad CodeQL path exclusions: would hide owned executable tooling.
- Escaping only the dots in PKMNCollectors URLs: would preserve positional
  ambiguity instead of separating the fields.
- Continuing substring checks with additional prefixes: remains vulnerable to
  credentials, suffixes, and lookalike domains.
- Keeping the certificate bypass behind an exact hostname allowlist: hostname
  authority does not make an unverified TLS connection safe.

## Verification

- Shared URL authority contract tests: `5/5` passed.
- HTTPS acquisition contract tests: `2/2` passed.
- Full contract suite after the final implementation: `1240/1240` passed.
- Syntax checks for every changed module and test: passed.
- `git diff --check`: passed.
- PKMNCollectors dry-run replay:
  - Sun & Moon Energy: `9/9` generated.
  - Yellow A Alternate: `4/4` generated.
  - Futsal: the historical committed audit proves `4/4` generated, but the
    isolated worktree has no retained HTML cache and the current remote pages no
    longer satisfy the historical page assertions. No fixture or evidence was
    rewritten during this security pass.

## Current Truths

- The code change has not yet been proven by a merged default-branch CodeQL
  scan.
- No target alert is claimed fixed until GitHub marks it fixed on `main`.
- Existing canonical evidence and generated fixtures are unchanged.
- This pass does not change the active pricing canary or release timing.
- PostgreSQL client TLS policy is outside this URL-authority pass unless an
  affected script transmitted credentials to an unverified peer.

## Invariants

- Never forward an API key based on a URL substring.
- Never treat a registrable-domain suffix as an exact host unless subdomains are
  explicitly allowed.
- Never accept non-HTTP schemes as crawlable web links.
- Never disable TLS certificate verification for acquisition convenience.
- Never hide owned tooling by excluding audit paths from CodeQL.
- Never rewrite historical source evidence to make a security replay pass.
- Never modify production data during static-analysis remediation.

## Explicit Next Gate

Publish this repair, require all repository checks, and wait for the merged
default-branch JavaScript/TypeScript CodeQL analysis. The gate passes only when
all `43` targeted alert numbers are fixed with no replacement URL, hostname,
scheme, or certificate-verification finding. Then record the authoritative open
count and choose the next reusable owned-code repair family.
