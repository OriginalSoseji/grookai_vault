# MTG Sealed Signed-In Visibility Activation V1

## Objective

Activate only the production MTG sealed backend visibility boundary for signed-in
collectors after the zero-residue live canary has passed. Client activation is a
later gate.

## Frozen Authority

- Production project: `ycdxbpibncqcchqiihfz`
- Source canary producer:
  `33496cf9297bbed16e7d6df95ea69c03b317acf7`
- Source canary plan:
  `a3facd708a9c0fb6f29d856e12f21b6ba1195ee51743064b0bd7c5e34a50978f`
- Active price release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Active image release: `86b207e6-4f73-5d9a-af40-864c47256c38`
- Active image manifest:
  `7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`

Fresh production preflight must reproduce this authority and the complete
hidden release-control row before any activation attempt.

## Authorized Mutation

The activation may update exactly one row:

```text
public.sealed_product_game_release_controls
game_key = mtg
hidden -> signed_in
```

The update must compare every baseline field, acquire the dedicated transaction
advisory lock, bind the activation fingerprint into evidence, and affect exactly
one row. A second stale compare-and-swap must affect zero rows.

## Required Proof Before Apply

The plan operation performs a rollback-only transaction. Inside that transaction
it must:

1. Match the exact hidden baseline.
2. Apply the proposed signed-in row.
3. Read the complete RPC V3 corpus as the authenticated role.
4. Prove the frozen candidate is signing-authorized.
5. Reject a replay of the stale hidden baseline.
6. Roll back.
7. Re-read the exact hidden control and protected production state.

The rollback proof is not durable activation authority. Its corpus count and
fingerprint become inputs to the separately fingerprinted activation plan.

## Apply And Readback

Apply requires the exact clean producer commit, activation fingerprint, and
guard token. After commit, the operator must create a disposable confirmed Auth
user and prove:

- authenticated RPC V3 returns the selected product;
- the signer returns an exact private-object URL;
- downloaded bytes match the frozen SHA-256;
- anonymous RPC and signing remain denied;
- protected state outside the release-control row is unchanged;
- web and Flutter remain disabled;
- the Auth fixture and all references are absent.

Any failed post-commit proof invokes the plan's exact one-step rollback before
the operator exits unsuccessfully.

## Rollback

The plan includes a separately fingerprinted rollback contract. Rollback may
restore only the captured complete hidden row and only when the current row is
owned by the exact activation fingerprint and release version. It must refuse
to overwrite any independently changed row.

## Prohibited Operations

- Web or Flutter client activation
- Anonymous visibility
- Catalog, family, variant, mapping, price, qualification, or release writes
- Price or image pointer changes
- Image-evidence or Storage writes
- Vault writes
- Cross-game writes
- Deletes, cleanup, or migrations
- Scheduler activation

## Stop Condition

This gate stops after a fingerprinted plan, rollback-only production proof,
artifact reconciliation, and checkpoint. Durable activation requires the exact
recorded authority. Client rollout remains a separate bounded gate.
