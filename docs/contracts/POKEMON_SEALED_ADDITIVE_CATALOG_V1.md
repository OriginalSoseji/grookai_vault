# Pokemon Sealed Additive Catalog V1

Date: 2026-09-16.
Authority: founder requested completion of anniversary sealed work under
`POKEMON_SEALED_PRODUCTION_V1.md`. No additional micro-approval is needed inside
that bounded authority; this document does not expand the daily refresh scope.

## Scope

Admit at most 50 explicitly selected, independently classified source products
per manifest into the existing Pokemon sealed domain. The current selection is
696613, 704145, 704146, 704148, 704152, 704155, 704168, 704169, 704192.
Reuse exactly one existing family after full projection comparison. Insert only
absent candidates, variants, reviews, mappings, evidence, qualifications and an
inactive release with members; freeze that new release after manifest checks.
No old row changes, except the new release's own draft-to-frozen transition.

This is NOT publication. No Storage, pointer, visibility, Vault, client, schema,
card, set, other-game, or scheduled-worker changes are part of this execution.
The existing hidden-lane apply command must not be used on the live lane.

## Execution

Entry point: `scripts/audits/pokemon_sealed_additive_apply_v1.mjs`.
Required: `--mode`, `--plan`, `--out`, `--fingerprint`, `--product-ids`.
Only explicit `preflight`, `canary`, `apply`, and `readback` modes are accepted.
The plan producer must equal clean tracked HEAD. Required runtime sources must
be tracked. Run artifacts are exclusive-created outside the repository and
include plan bytes, source hashes, exact product selection and commit provenance.

Use the established worker environment and verified CA chain. The command does
not load a workstation env file or disable certificate verification. It checks
canonical project routing and minimum database counts on every connection.

1. Regenerate the nine-product plan from frozen source and current warehouse
   price evidence with the frozen producer; persist all inputs and hashes.
2. Read-only serializable preflight rechecks exact source/price/sync parity,
   freshness, ownership, family parity, counts and collisions.
3. Canary inserts and freezes only the manifest inside a serializable
   transaction, verifies readback and write attribution, rolls back, and checks
   absence on a separate connection. Existing family must remain exact.
4. Apply requires `--canary` and `--canary-hash` binding a successful canary to
   the same project, producer, plan and exact insert count. It repeats preflight
   and transaction checks. No automatic retry is performed.
5. Persist before-COMMIT evidence. Commit once, then verify every applied row
   through a separate read-only connection. Repeat the exact frozen apply to
   prove zero new writes while the same source snapshot still holds.

A lost COMMIT response is unknown, not failed-and-safe-to-retry. Read back first.
A post-commit readback failure is recorded as committed/readback-failed and must
not trigger deletion or blind reapplication. Every attempt has a new directory.

## Following Gate

Verified images, source-change receipts, unioned paired publication, and an
explicit refresh-baseline extension remain separate steps. Never replace the
live catalog with the nine-product release. Preserve the original 1,721-member
image baseline, including currently held products, when extending daily refresh.
