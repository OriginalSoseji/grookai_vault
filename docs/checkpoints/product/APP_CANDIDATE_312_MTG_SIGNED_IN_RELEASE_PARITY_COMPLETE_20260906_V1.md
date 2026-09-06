# App Candidate 312 MTG Signed-In Release Parity Complete

## Status

Build `312` has exact source parity across the immutable web deployment,
signed Android artifact, valid TestFlight build, current governed pricing, and
the production MTG signed-in catalog release. The signed-in release boundary is
active and independently read back. This checkpoint does not claim App Store
review submission or public App Store release.

## Context

The prior checkpoint reserved build `312` while exact merged-SHA client
artifacts and the governed MTG release remained open. PR `#421` merged as
`663390001d80e52f0782e58f280be7d2abad0737`; all release artifacts below were
produced from that exact source authority.

## Problem

The first release plan was blocked because the governed pricing view had aged
past its 36-hour freshness boundary. After current pricing was restored, the
release apply committed successfully, but its GitHub job reused the mutation
database connection for a long post-commit proof. That connection terminated
before the job could write its success summary, causing the workflow to report
failure after the release-control update had already committed.

## Risk

A workflow conclusion alone could incorrectly imply the release mutation did
not occur. Blindly rerunning the apply could obscure provenance or perform an
unnecessary second release-control mutation. Reusing one connection also made
future long readbacks vulnerable to the same false-failure mode.

## Decision

- Treat production readback as authority for the committed release state.
- Do not rerun the already-committed release mutation.
- Harden future release execution by closing the mutation connection after
  commit and using independent bounded connections for state, anonymous-role,
  authenticated-role, and rollback work.
- Preserve the failed workflow as accurate evidence of a post-commit proof
  transport failure, not relabel it as a successful job.

## Exact Client Provenance

- Source SHA: `663390001d80e52f0782e58f280be7d2abad0737`.
- Web deployment: GitHub deployment `6294350318`, immutable URL
  `https://grookai-vault-bupsa5kbj-sosejis-projects.vercel.app`.
- Android: build `312`, workflow `34040578737`, artifact `9991678164`, SHA-256
  `3da157cd2705f711e04a3606f6bbc1528c84dc2b8cf61cefe315d2232273df0b`.
- iOS: TestFlight build `312`, App Store build ID
  `40e5522f-28ca-4013-a798-f9a42902c278`, processing state `VALID`.
- Exact-SHA CI: Guard, Contracts Runtime Protection, Flutter CI, CodeQL, and
  signed APK workflows passed.

The current `main` later advanced to `3664a8683` only for generated founder
operations dashboard JSON. Its newer Vercel production deployment is not
claimed as exact build-312 web provenance. The immutable deployment above is
the parity evidence.

## Pricing Restoration

- Dry-run workflow `34041850517`: passed.
- Shadow workflow `34042115875`: passed and reconciled.
- Shadow/source sync: `1bbb7d37-23f2-48d8-9538-fcb58ef2161d`.
- The GitHub production attempt `34044131812` stopped before writes because a
  stale-row comparison found six fewer Pokemon rows in the fresh source.
- Source review proved the delta was real: 11 obsolete Holo/Reverse rows left
  the source and five current rows entered it. Seven affected TCGPlayer
  products now expose only `Normal`; preserving stale variants would have been
  incorrect.
- The exact-SHA production worker then ran against the frozen source sync with
  run key `mtg-global-market-production-20260906-build312-repair`.
- Durable run ID: `c9f22aa1-775c-4126-a88c-49ace0c1d0d6`.
- Selected: `206,459`; eligible/current: `164,139`.
- Current MTG rows: `132,961`; current Pokemon rows: `31,178`.
- Durable state: `verified`; reconciliation: `reconciled`; mismatches: `0`.
- Canonical and Vault writes: `0`.

## Release Apply And Readback

- Frozen release plan workflow `34047889277`: passed.
- Plan fingerprint:
  `39a731f35bf4dea6aadd41090bcffc98c718524bd00cc35e553b0f1e1ab24534`.
- Apply workflow `34047994529`: release-control refresh committed, then the
  reused connection terminated during post-commit proof.
- Release-control readback:
  - status: `signed_in`;
  - version: `MTG_SIGNED_IN_CATALOG_RELEASE_V1`;
  - updated at: `2026-09-06T17:16:18.773Z`;
  - refresh fingerprint: exact plan fingerprint above;
  - deployed clients: exact web, Android, and iOS build-312 evidence above.
- Post-commit plan workflow `34048584342`: passed read only.
- Independent role proof recorded at `2026-09-06T17:37:50.856Z`:
  - anonymous catalog, image, search, and pricing counts: all `0`;
  - authenticated: `946` sets, `104,412` card prints, `104,412` active
    identities, `157,678` printings, `104,250` self-hosted fronts, `162` image
    coverage gaps, and `108,187` image faces;
  - one exact sample card was returned by direct card lookup, search, image-face
    lookup, and governed pricing.

Permanent machine-readable evidence:
`docs/audits/pricing/mtg_signed_in_catalog_release_v1/20260906_build312_production_readback.json`.

## Current Truths

- MTG is active for signed-in catalog consumers.
- Anonymous MTG catalog and pricing visibility remains denied.
- Current governed pricing contains both MTG and Pokemon rows.
- Build `312` exists as a valid TestFlight build; it was not submitted for App
  Store review or public release by this work.
- The exact build-312 web deployment remains immutable and successful.
- The newer production alias deployment contains generated dashboard snapshot
  changes and is not used as exact-SHA parity proof.

## Invariants

- Never infer mutation success or failure solely from a post-commit workflow
  conclusion; require database readback.
- Never rerun a release mutation before reading the current release-control
  row and comparing its fingerprint.
- Anonymous denial must remain intact.
- Signed-in release changes must not mutate catalog identity, image evidence,
  Storage, Vault, or App Store publication state.
- Android, iOS, and immutable web provenance must remain tied to their exact
  producing commit.

## Verification

- Targeted release contracts pass (`7/7`).
- Agent syntax check passes.
- `git diff --check` passes.
- Full repository `shipcheck` passes, including secret packaging guard,
  production drift/runtime checks, the complete Node contract suite, web
  typecheck/lint/strict production build, Flutter analysis, and all `662`
  Flutter tests.

## Next Gate

Merge the post-commit connection hardening, then repair the separate MTG
pricing workflow guard so a legitimate fresh-source variant delta cannot block
restoring an expired governed price view. No release mutation rerun is needed.
