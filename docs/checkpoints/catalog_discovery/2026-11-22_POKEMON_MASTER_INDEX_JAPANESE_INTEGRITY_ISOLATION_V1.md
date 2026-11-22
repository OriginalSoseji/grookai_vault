# Pokemon Master Index Japanese Integrity Isolation V1

Date: 2026-11-22
Status: locally verified implementation candidate; no production data writes

## Failure evidence

Natural scheduled workflow run `45019401412` rebuilt the English Master Index
and multilingual candidate snapshots, then stopped at the Japanese discovery
integrity gate:

```text
Japanese set M6a full-checklist disagreement: TCGdex=176, Bulbapedia=2
```

The run correctly performed no canonical, database, Storage, pricing,
publication, or Vault writes. Its 90-day artifact preserves the discovery log
and the independently built candidate reports.

## Repair boundary

The Japanese discovery worker remains fail-closed. Parser failures, mixed set
codes, incomplete evidence, and count disagreements still cannot produce a
Japanese incremental plan or canonical authority.

The combined daily workflow now contains that failure at the Japanese lane
boundary:

- write a deterministic no-change `source_integrity_blocked` Japanese plan;
- preserve the prior Japanese admitted Master Index;
- record `canonical_authority: false` and no writes;
- allow independently verified English and language candidate changes to pass
  their existing data-only validation; and
- suppress downstream universal discovery and catalog promotion dispatch until
  the Japanese integrity conflict clears.

This is failure isolation, not evidence substitution. The observed two-row
Bulbapedia result is not accepted, TCGdex is not promoted as sole authority, and
`M6a` remains held.

## Verification and release gate

Required local verification:

- focused English, language, Japanese incremental, discovery, and automation
  contract tests;
- YAML source assertions proving the integrity-blocked plan has no authority;
- syntax checks for the referenced workers;
- repository secret guard; and
- `git diff --check`.

Completed local verification:

- `97/97` focused contract tests passed across English refresh, language
  continuity, Japanese incremental admission, universal discovery, and catalog
  shadow automation;
- syntax checks passed for the four referenced refresh/discovery workers;
- the release secret-packaging guard passed; and
- `git diff --check` passed.

The fresh Windows worktree's lockfile install could not verify the npm registry
certificate chain (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). TLS verification was not
disabled. Tests used an existing read-only dependency tree whose installed
`typescript 5.9.3` and `uuid 14.0.0` versions exactly match this checkout's
lockfile. Hosted CI remains the independent clean-install and workflow-syntax
gate.

After review and merge, observe the next natural scheduled run. A healthy job
may continue unrelated data-only candidate publication while the Japanese
source conflict remains visible in source-health evidence. Do not manually
dispatch discovery, do not promote `M6a`, and do not treat the combined job's
success as proof that the Japanese conflict is resolved.
