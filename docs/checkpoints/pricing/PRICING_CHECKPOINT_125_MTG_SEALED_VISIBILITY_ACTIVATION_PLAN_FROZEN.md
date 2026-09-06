# Pricing Checkpoint 125: MTG Sealed Visibility Activation Plan Frozen

## Context

Checkpoint 124 proved the complete production signed-in MTG sealed read path
through Supabase Auth, RPC V3, the trusted image signer, and exact private
Storage bytes. That canary restored MTG sealed visibility to `hidden`; it did
not authorize durable visibility or client activation.

## Problem

The durable transition needed its own immutable authority. Reusing the canary
mutation directly would not provide a complete-row compare-and-swap, a stable
corpus fingerprint, stale-authority rejection, immediate real-auth readback,
or a one-step exact rollback contract.

## Risk

An unsafe activation could overwrite a newer release decision, expose sealed
rows anonymously, activate clients before the backend is proven, serve stale or
unbound price/image authority, leave an Auth fixture behind, or fail after
commit without restoring the exact hidden baseline.

## Decision

Build a dedicated activation operator that can mutate only the MTG row in
`sealed_product_game_release_controls`. Before durable apply, execute the exact
transition inside a repeatable-read transaction, reconcile the complete
authenticated RPC V3 corpus, prove signing authorization, reject replay of the
stale baseline, roll back, and compare the complete production state.

The durable apply path is separately guarded by the frozen activation
fingerprint. It includes real-auth HTTP readback and automatically invokes the
exact rollback plan if any post-commit proof fails. Web and Flutter remain
hard-disabled throughout this gate.

## Alternatives Rejected

- Enable clients with the backend transition: rejected because client rollout
  is an independent blast-radius gate.
- Reuse the temporary canary fingerprint: rejected because a canary pass is
  evidence, not durable authority.
- Status-only update predicate: rejected because every baseline column must be
  part of the compare-and-swap boundary.
- Manual rollback instructions only: rejected because post-commit proof failure
  must invoke an exact, ownership-checked inverse automatically.
- Count-only corpus proof: rejected because the same count can conceal member
  drift; the plan freezes both count and fingerprint.

## Implementation Authority

- Activation implementation commit:
  `8e38eb5f1c5905a8b39264605e58918c206bf17a`
- Final telemetry repair and plan producer:
  `32539d1f7b9198092543f597871e0fbf71687ccf`
- Source canary producer:
  `33496cf9297bbed16e7d6df95ea69c03b317acf7`
- Source canary plan:
  `a3facd708a9c0fb6f29d856e12f21b6ba1195ee51743064b0bd7c5e34a50978f`

The first rollback-proof draft correctly restored production but its telemetry
double-counted one PostgreSQL HOT update. The source was repaired before final
authority, contract coverage was added, and the final proof attributes exactly
one transaction-local row update.

## Frozen Activation Authority

- Production project: `ycdxbpibncqcchqiihfz`
- Activation plan fingerprint:
  `29ad09b5d117bcfa22698c429d280444f1fb7f9fe0b43419a1f3882b4fb95599`
- Rollback plan fingerprint:
  `c2c7ef6d4db92db44b2341e82a110fb226ecf503627a01dceb6ec810c864ff05`
- Authenticated corpus rows: `2,144`
- Authenticated corpus fingerprint:
  `34a91368a22a296beff607934d070ff888a8f858de9e497ffbb88a4a8634ded7`
- Active price release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Active price members: `2,182`
- Active image release: `86b207e6-4f73-5d9a-af40-864c47256c38`
- Active image members: `2,149`
- Active image manifest:
  `7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`

## Rollback-Only Production Proof

- Transaction started: `true`
- Durable commit: `false`
- Transaction rolled back: `true`
- Release-control rows updated in transaction: `1`
- Write attribution: only `sealed_product_game_release_controls`, one update
- Signed-in RPC V3 rows: `2,144`
- Selected exact object signing authorized: `true`
- Stale baseline CAS rows updated: `0`
- Complete release-control row restored: `true`
- Protected production state restored: `true`
- Hidden authenticated RPC rows after rollback: `0`
- Hidden signing authorized after rollback: `false`
- Preflight and post-rollback artifact SHA-256:
  `34e43d8a1a88a6e39a5c1a7ba9bed9c5265df540d3814a5913bb6f936ba96648`
- Independent full-artifact reproductions: `2`
- Reproduction mismatches: `0`

## Current Truths

- MTG catalog visibility is `signed_in`.
- MTG sealed visibility is `hidden`.
- The durable activation plan is frozen but has not been applied.
- RPC V3, the trusted signer, active price release, active image release, and
  private self-hosted images are present and mutually bound.
- Web and Flutter MTG sealed clients remain literal hard-disabled.
- Anonymous RPC and signing remain denied.
- No durable database write occurred in this gate.

## Invariants

- Durable apply must reproduce the exact activation and corpus fingerprints.
- Only one complete MTG release-control row may change.
- Any failed post-commit proof must restore the exact captured hidden row.
- A row independently changed after this plan must never be overwritten.
- Client activation, anonymous visibility, scheduling, and refresh remain
  separate gates.

## What Must Never Be Broken

Do not expose private Storage paths, grant anonymous execution, activate either
client in this backend gate, bypass the complete-row CAS, accept count parity
without corpus fingerprint parity, persist disposable credentials, mutate
price/image pointers or releases, or let an activation failure remain visible.

## Verification

- New activation contracts: `8/8` passed.
- Complete MTG sealed contract family: `191/191` passed.
- Full pre-commit shipcheck on final producer: passed.
- Flutter tests in shipcheck: `657/657` passed.
- Production rollback-only proof: passed.
- Durable database writes: `0`.
- Permanent artifact hash mismatches: `0`.

## Permanent Evidence

- Contract:
  `docs/contracts/MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_V1.md`
- Audit:
  `docs/audits/pricing/mtg_sealed_signed_in_visibility_activation_v1/2026-09-05T17-22-28Z_plan/`

## Exact Next Gate

Execute only the frozen durable MTG sealed backend transition from `hidden` to
`signed_in` using activation fingerprint
`29ad09b5d117bcfa22698c429d280444f1fb7f9fe0b43419a1f3882b4fb95599`.
Require immediate real-auth RPC, signer, exact-byte, anonymous-denial,
protected-state, disabled-client, and zero-auth-residue readback. On any failed
proof, run the exact rollback bound to
`c2c7ef6d4db92db44b2341e82a110fb226ecf503627a01dceb6ec810c864ff05`.
Stop before enabling web or Flutter clients.
