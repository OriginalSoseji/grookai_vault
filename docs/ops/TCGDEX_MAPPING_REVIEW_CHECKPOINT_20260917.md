# TCGdex Mapping Review Boundary

Date: 2026-09-17.
Status: Implementation and focused tests complete; full hook and release status
must be read from the operator receipts and associated PR. Not deployed.
Branch: `fix/tcgdex-bridge-review-only-20260917`.
Worktree: `C:/grookai_vault_mapping_identity_20260917` (reused, no tree deleted).

## Why

The legacy `promote_tcgdex_tcgplayer_bridge_v1.mjs` directly upserted mappings
when provider pricing buckets agreed on a product ID. That did not establish
canonical identity, printed modifiers or finish authority. A conflicting owner
could also be overwritten between its separate read and upsert. An existing
matching mapping was called correct before checking other product owners.

The repaired command is a bounded read-only discovery tool. `--apply` is retired
and rejected before loading environment, credentials or clients, regardless of
flag order. No direct mapping write remains. This is not a second approval flow:
it removes an unsafe shortcut to the existing reviewed mapping workflow.

## Evidence And Handoff

`--dry-run --limit=50 --output=<new-directory>` produces a run plan, selection,
per-row review evidence and summary. Default limit is 50, maximum 500. Existing
directories are refused. Selection is saved before provider calls; each row is
saved before the next call. Artifact failures stop, rather than skip a row.

Reports preserve the parsed provider payload and its serialization hash, target
identity, observed bucket paths and both card/product mapping contexts. These
are explicitly parsed JSON bytes, not the original HTTP response bytes. Source
language/base and exact selected identities are preserved. No complete-catalog
or verified-printing claim is emitted. Existing mapping agreement remains review
evidence, not self-validation. Conflicting owners, even inactive ones, remain
conflicts. Source denial is an error, not a finding that a product is absent.

Review source identity and Master Index evidence first. Then create a fresh
V1.2 exact-mapping plan through the existing planner and maintenance executor;
this discovery report is not accepted as an apply plan or authority. Do not edit
old plan hashes, reinterpret price buckets as finish facts, or automatically
reassign historical mappings. The currently restricted mapping lane does not
automatically admit stamps, variants, languages or games it does not support.

## Verification

17 new contracts and 18 existing exact-mapping contracts pass (35 total).
Tests cover malformed IDs, source identity mismatch, missing canonical targets,
source denial, existing mappings, conflicting ownership, ambiguous buckets,
bounded selection, selection/artifact failure, real CLI apply rejection, real
loopback HTTP GET-only execution and immutable artifact readback/overwrite refusal.
No live discovery, production writes or deployment were used for these tests.

PR #483 review requires the raw canonical number, set code, identity domain,
print identity key and printed modifier in every saved parent snapshot. The
follow-up preserves those fields, including event labels that generated
`number_plain` loses. A projection-aware regression covers `BW95 (Worlds 13)`.
The CI legacy-key guard also caught an obsolete environment alias in the CLI
test; that unnecessary test override is removed without weakening the guard.

Full hook receipts belong under
`C:/grookai_vault_operator_artifacts/tcgdex_mapping_review_20260917/`.
Do not infer a hook pass from this preparation note. No hook bypass is authorized.

## Integration And Remaining Work

The predecessor mapping repair PR #482 merged at
`8afc00fe1f1bdafc40b0997dd646df06f3e67963`. GitHub checks passed; its current-head
Vercel deployment was independently verified to fail on the unchanged explicit
production activation guard. Review feedback was addressed and resolved. Ordinary
squash merge succeeded; no administrator bypass, branch deletion or activation.

Remote runtime inventory previously found older copies of the legacy bridge in
both pricing and MEE release directories. Static caller search found no direct
invocation; that does not establish runtime enforcement. Release verification
must inventory actual executors and preserve active runs, especially the pricing
worker that was still active at the last read. Do not deploy by modifying an
immutable historical release directory.

Still required: integrate this repair, verify deployed writer coverage, inspect
the JustTCG bridge, adjudicate historical mapping/finish cases, complete dependency
inventory and the MEP package, and perform the separately authorized bounded
McDonald's repair with exact readback and collector/Vault verification. This work
neither changes nor authorizes that frozen executor. The DB-wide goal is open.
