# Print Identity Search Visible Bound V1

## Status

`COMPLETE - APPLIED AND READ BACK IN PRODUCTION`

The production print-identity search now applies request-role catalog
visibility before bounding high-priority name candidates. Hidden catalog rows
can no longer consume an anonymous caller's name slots or incorrectly suppress
lower-ranked candidate families.

## Context

Recovery of the production migration history exposed a defect in
`PRINT_IDENTITY_SEARCH_BOUNDED_CANDIDATES_V1`. Its `name_seed` was limited
before request-role visibility was enforced later in `candidate_cards`.

Issue `#282` governed the forward repair. Historical migration
`20260824174500` remained unchanged so it continues to describe the exact SQL
that production originally applied.

## Problem And Risk

When visible Pokemon and signed-in or hidden catalogs shared a matching name,
excluded rows could consume the bounded candidate slots. They could also make
`name_seed_sufficient` true, preventing set, finish, and cameo seed families
from participating. Anonymous result pages could therefore be underfilled or
empty despite valid visible matches.

Changing the historical migration would have hidden the defect and broken
ledger traceability. Broadly changing search ranking or release policy would
have created unrelated product risk.

## Decision

Create one forward migration that adds two predicates inside `name_seed`,
before its `ORDER BY` and `LIMIT`:

- require a non-null parent GV-ID;
- require `catalog_parent_gv_id_visible_to_request_v1(cp.gv_id)`.

`name_seed_sufficient` continues to count `name_seed`, which now means it
counts only bounded candidates visible to the caller. The later visibility
predicate remains in `candidate_cards` as defense in depth for every seed
family.

## Alternatives Rejected

- Rewrite the recovered historical migration: rejected because migration
  history must remain production-traceable.
- Increase the candidate limit: rejected because hidden rows could still crowd
  visible rows and the policy defect would remain.
- Remove `name_seed_sufficient`: rejected because it would discard the
  performance optimization rather than fixing its authority boundary.
- Filter only after ranking: rejected because excluded rows would still affect
  candidate capacity and sufficiency.
- Change release controls: rejected because the controls were correct; their
  enforcement order was not.

## Implementation

- Contract:
  `docs/contracts/PRINT_IDENTITY_SEARCH_VISIBLE_BOUND_V1.md`
- Migration:
  `supabase/migrations/20260828021500_print_identity_search_visible_bound_v1.sql`
- Rollback-only runner:
  `scripts/audits/print_identity_search_visible_bound_rollback_v1.mjs`
- Read-only apply verifier:
  `scripts/audits/print_identity_search_visible_bound_readback_v1.mjs`
- Contract test:
  `tests/contracts/print_identity_search_visible_bound_v1.test.mjs`
- Audit directory:
  `docs/audits/catalog_discovery/print_identity_search_visible_bound_v1/`
- Pull request:
  `https://github.com/OriginalSoseji/grookai_vault/pull/284`
- Migration source merge commit:
  `0787eeb3da606a67fc0ef73434d80d74ee42ccf1`

## Rollback-Only Proof

Before durable apply, the reviewed migration replaced the function inside a
production transaction and was rolled back.

- Probe query: `golem`.
- Source name coverage: `22` anonymous-visible parents and `30`
  anonymous-hidden parents.
- Anonymous result: `25` rows, game codes exactly `pokemon`.
- Authenticated result: `25` rows, game codes exactly `mtg`.
- Function signature, result type, and ACL during the transaction: unchanged.
- Original function restored after rollback: exact hash match.
- Migration ledger after rollback: exact match.
- Durable writes: `0`.

## Migration Apply

Supabase CLI dry-run reconciled every local and remote migration through
`20260826070000` and offered exactly one pending file. From immutable commit
`0787eeb3da606a67fc0ef73434d80d74ee42ccf1`, CLI version `2.90.0` applied only:

`20260828021500_print_identity_search_visible_bound_v1.sql`

Authorized durable changes were one function replacement, one function comment
replacement, ACL reassertion, and one migration-ledger row. No table data
outside the migration ledger changed.

## Production Readback

- Latest migration: `20260828021500`.
- Ledger row count for the version: exactly `1`.
- Ledger statements recorded: `7`.
- Final function SHA-256:
  `18298b24d75efe5fda01c8242ed132ec6e1fc65226d02ac64bbb7f1a54eb5fbd`.
- Function signature and result shape: unchanged.
- Function ACL: unchanged for `postgres`, `anon`, `authenticated`, and
  `service_role`.
- Function comment: `PRINT_IDENTITY_SEARCH_VISIBLE_BOUND_V1`.
- Anonymous `golem`: `25` Pokemon rows only.
- Authenticated `golem`: `25` MTG rows.
- Service-role `golem`: `25` MTG rows.
- Visibility failures: `0`.
- Post-apply CLI dry-run: remote database up to date, zero pending migrations.

## Permanent Artifact Hashes

- Migration file:
  `91bdbe7829e4e53a77620bbc22f3dfa6acccb70061bb80b0fcc00bfc209c1269`
- `rollback_proof.json`:
  `99f1b6d7f64eaf331eea16273bcb819ab17048c6e4e204e8fd40d9d2efbfb078`
- `apply_plan.json`:
  `3f76cbf5664fbd0b17b0fc4ba6af89f0e779ca183b1901aa823187a7eaf292a2`
- `apply_execution.json`:
  `2f58215d74d717dab5ea6ddc9a487d5b2c834ea897e210a7de014c4e390c2f77`
- `apply_readback.json`:
  `3dcf444c751b8c9e9379bb5c2186d953144442da7dc3ebc7f7a908a2e1a91725`

## Validation

- New search-repair contract tests: `9/9` passed.
- Targeted search, visibility, cross-TCG, migration-recovery, ACL, and pricing
  boundary suites: `50/50` passed.
- Rollback-only production smoke: passed.
- Read-only production apply verification: passed.
- Production drift audit: `0` critical failures.
- Release secret-packaging guard: passed.
- Pull-request CodeQL: passed.
- Contracts drift gates: passed.
- Contracts runtime protection: passed.
- Legacy-key scan: passed.
- Vercel preview: passed.
- Codex review: no major issues.

The repository's previously documented `29` unrelated pinned-artifact test
failures remain outside this repair; no result was relabeled.

## Current Truths

1. Production and Git migration history now end at `20260828021500`.
2. Request-role visibility is applied before the high-priority name bound.
3. `name_seed_sufficient` counts only visible name candidates.
4. Final candidate visibility remains a second defense.
5. Search signature, output shape, ranking, grants, and release policy did not
   change.
6. Issue `#282` is resolved.
7. No catalog game foundations, cards, sets, identities, images, prices, or
   Vault rows were changed.

## Invariants

1. Visibility must precede every bounded candidate set that can determine
   search sufficiency.
2. Hidden rows must never consume result capacity for a caller who cannot
   receive them.
3. Final result visibility must remain fail-closed even when seed-specific
   filters exist.
4. The shared search RPC signature and fixed result shape must remain stable.
5. Release controls, not source presence, determine cross-TCG visibility.
6. Future search performance changes require mixed-role regression coverage.
7. Historical migrations must never be rewritten to carry a forward fix.

## What Must Never Be Broken

- Do not move visibility back after a candidate limit.
- Do not treat authenticated catalog access as anonymous public access.
- Do not remove final candidate visibility defense.
- Do not broaden direct table grants or function execute roles.
- Do not combine search optimization with canonical catalog mutation.
- Do not edit `20260824174500` or `20260828021500` after application.

## Explicit Next Gate

Return to the bounded Yu-Gi-Oh/Gundam game-foundation project. First define and
execute a rollback-only production canary for exactly two deterministic
`games` rows and two hidden `catalog_game_release_controls` rows. Prove exact
before/transient/after reconciliation and zero card, set, printing, mapping,
identity, image, pricing, publication, or Vault writes.

Only after that canary and independent review may a durable foundation apply
be considered. Canonical reconciliation issue `#277` remains open until those
foundations exist and the 46,259 Wave 1 candidates are rerun read-only.
