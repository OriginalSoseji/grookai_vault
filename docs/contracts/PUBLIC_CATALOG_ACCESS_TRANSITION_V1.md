# Public Catalog Access Transition V1

Date: 2026-09-12

The founder requested that One Piece and MTG catalog browsing no longer require
an account. This transition implements that request without changing the
collector design, pricing licensing, sealed-product audience or ownership rules.

## Exact Boundary

- Production project: `ycdxbpibncqcchqiihfz`.
- Existing MTG and One Piece game controls: `signed_in` to `public`.
- Existing OP17 override `9acde490-e4e4-56ce-bffa-b437ceee413a`: the same transition.
- Only `release_status` changes. Historical activation metadata remains intact;
  the new transition's producer, full snapshots and fingerprint live in its
  immutable execution receipt. This is not a repeat of the initial activation.
- Other games, hidden sets, grants, policies, functions, canonical data, Storage,
  pricing, sealed controls/pointers and ownership are outside this authorization.
- No schema migration, website deployment or mobile release is involved.

## Execution

Use `scripts/catalog/public_catalog_access_execution_v1.mjs` from a clean frozen
producer. Modes are `plan`, `canary`, `apply` and `readback`. Every invocation
requires a new artifact directory and the exact producer SHA. Plan compilation
records full fresh state and creates a deterministic fingerprint. The earlier
presentation plan alone cannot authorize this executor.

Rehearse the exact transition in one transaction and roll it back. Require
independent readback proving restoration before apply. Apply requires the matching
successful canary receipt, full fresh compare-and-swap state, bounded locks,
exact row counts, protected-state parity and in-transaction anonymous set/RPC
access plus actual anonymous pricing denial. Then perform independent readback
and zero-mutation replay. Any drift, timeout or ambiguous response stops without
automatic retry. Never replay a mutation solely because its response was lost.

Signed-out website set, card and image smoke checks remain required after the
database change. Catalog activation is not proof of end-to-end client visibility.

The historical MTG signed-in refresh requires a signed-in baseline and will fail
closed on a public catalog; it cannot silently downgrade this transition. Do not
rerun that historical release operation as a repair. Ordinary pricing refreshes
do not receive catalog visibility authority.
