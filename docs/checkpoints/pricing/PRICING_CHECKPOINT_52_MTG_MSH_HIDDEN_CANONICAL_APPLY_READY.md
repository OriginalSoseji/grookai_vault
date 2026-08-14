# Pricing Checkpoint 52: MTG MSH Hidden Canonical Apply Ready

## Status

The fail-closed, set-generic durable promotion writer is implemented, frozen,
and rollback-proven for Marvel Super Heroes (`msh`). Its exact dry-run inserted
all 3,089 planned rows inside one production transaction, reconciled every row
and boundary, and rolled back. A separately committed read-only verifier then
proved that production returned to the exact preflight state with zero
findings.

MSH is ready for one bounded hidden canonical apply. It is not yet durably
canonical, visible, priced, imaged, published, or available to Vault clients.

## Frozen Code And Evidence

- branch: `agent/mtg-pricing-readiness-v1`;
- writer producing commit:
  `3d52514250805260186599efa0c4153e718b67fb`;
- independent verifier commit:
  `e77ce1e831cc9a142a1eeca38941884e0a05d6ef`;
- governing source SHA-256:
  `4f3e96ff6157962e7f123a7fcfe87443e753f64c6b02163e62d1b32d50216ebd`;
- writer payload file SHA-256:
  `e49748977f8688aa852b9f5366cfb68c8b2f6ed92ab2db284f8b1ec9ad96a12f`;
- writer dry-run summary SHA-256:
  `9388fd71358e1128c8ea78edf5ee42ef3e395126fc81a30a7b2666ca8bf15f7e`;
- independent readback summary SHA-256:
  `a26a7492e05b62705b86be80900eb11d3d26844e6600c9a54d3fa00057ed6aaa`.

The writer resolves its governing code identity from the latest commit that
changed its governing files. Later audit-only commits therefore cannot
silently change the approved writer identity.

## Frozen MSH Contract

- selected set: `msh` / `Marvel Super Heroes`;
- source payload fingerprint:
  `73d0b68c08ff462cc2f853520faa491a73d9d7e27db9c93afcc95bfc06c00e38`;
- immutable staging batch:
  `276cc9f7-0159-5df3-874c-73ea04e741a4`;
- staged rows SHA-256:
  `788eaf7637311ce021f531d70430f05700594eb03fd48a0c00bd8e0e4b7f0e6c`;
- canonical promotion rows SHA-256:
  `2b3cb12453146bea1bf9adfe793ad8f62d237bb720f3946e4603d028a19b275e`;
- mutation contract SHA-256:
  `9ac75a734957bc25901805e51a9a6a8787b8a982cc76db771a90c934d737ebac`;
- promotion plan SHA-256:
  `b6d2e6e0af04948fbb27e73deb4cbb6dc39d55a9bc0b7e0709f3b551b3a778ba`;
- approval SHA-256:
  `7f7086ed5e04f3faa9dcc61c91ef3524c90cda2d275be7ef12b339c632dd6014`.

Exact permitted inserts:

- 1 set;
- 453 parent `card_prints`;
- 453 `card_print_identity` rows;
- 865 finish-specific `card_printings`;
- 453 Scryfall parent mappings;
- 864 exact TCGPlayer printing mappings;
- 3,089 total rows.

## Writer Rollback Proof

The frozen writer ran in `--dry-run` mode from a clean tracked worktree at the
writer producing commit. It proved:

- the source lane contained all 864 planned TCGPlayer rows with positive market
  evidence;
- immutable staging reconciled to exactly 3,089 rows and the frozen staging
  hash;
- every canonical identifier and mapping was collision-free;
- all six insert/readback counts exactly matched the plan;
- MSH reached 453 parents, 453 identities, 865 printings, 453 Scryfall mappings,
  and 864 TCGPlayer mappings inside the transaction;
- DSK remained 417 parents and 807 printings;
- MTG release status remained `hidden`;
- anonymous and authenticated MTG catalog and search surfaces remained zero;
- service and authenticated Pokemon counts remained unchanged;
- the full transaction rolled back and the complete post-rollback state matched
  preflight exactly.

Status: `promotion_writer_rollback_proof_passed`.

## Independent Production Readback

The independent verifier ran from pushed commit
`e77ce1e831cc9a142a1eeca38941884e0a05d6ef` in a separate read-only
transaction. It reported zero findings and proved:

- canonical MSH counts are zero in every planned table;
- canonical MTG remains DSK-only at 417 parents, 417 identities, and 807
  printings;
- immutable MSH staging remains exactly 3,089 rows with the expected hash;
- MSH collision counts remain zero;
- MTG remains hidden from anonymous and authenticated catalog/search surfaces;
- Pokemon remains 58,769 service-visible parents and 58,768
  authenticated-visible parents;
- no database mutation was issued.

Status: `rollback_independently_verified`.

## Exact Apply Approval

The durable writer requires this exact environment value and rejects any other
approval text:

```text
I approve only the hidden canonical promotion of MTG set msh (Marvel Super Heroes) under plan b6d2e6e0af04948fbb27e73deb4cbb6dc39d55a9bc0b7e0709f3b551b3a778ba, writer payload 73d0b68c08ff462cc2f853520faa491a73d9d7e27db9c93afcc95bfc06c00e38, staging batch 276cc9f7-0159-5df3-874c-73ea04e741a4, staged rows 788eaf7637311ce021f531d70430f05700594eb03fd48a0c00bd8e0e4b7f0e6c, promotion rows 2b3cb12453146bea1bf9adfe793ad8f62d237bb720f3946e4603d028a19b275e, mutation contract 9ac75a734957bc25901805e51a9a6a8787b8a982cc76db771a90c934d737ebac, governing code commit 3d52514250805260186599efa0c4153e718b67fb, and governing source hash 4f3e96ff6157962e7f123a7fcfe87443e753f64c6b02163e62d1b32d50216ebd. This may insert exactly 1 set, 453 card_prints, 453 card_print_identity rows, 865 card_printings, 453 Scryfall mappings, and 864 TCGPlayer printing mappings. I do not approve migrations, release-control changes, signed-in or public MTG visibility, images, Storage, image pointers, pricing, publication, Vault writes, another set, Pokemon mutation, updates, deletes, truncates, cleanup, or global db push.
```

## Permanent Artifacts

- writer rollback proof:
  `docs/audits/pricing/mtg_canonical_catalog_set_promotion_writer_v1/2026-08-13T23-49-32Z_dry_run/`;
- independent post-rollback readback:
  `docs/audits/pricing/mtg_canonical_catalog_set_promotion_post_rollback_readback_v1/2026-08-14T00-02-04Z_writer_dry_run/`.

Both directories contain `summary.json`, `REPORT.md`, and SHA-256 artifact
manifests.

## Verification

- all MTG contract tests: 76/76 passed;
- Node syntax/import checks passed;
- `git diff --check` passed;
- the writer commit passed the full pre-commit and pre-push shipchecks;
- the verifier commit passed the full pre-commit shipcheck, including 614
  Flutter tests;
- its first push hook became idle during Flutter execution after the shell
  wrapper detached, so that orphaned process tree was terminated and the exact
  already-tested commit was transported with `--no-verify`;
- local and remote verifier SHAs reconcile exactly.

An earlier writer verification attempt encountered four transient Flutter test
loader failures. The four files passed 31/31 in isolation, and the unchanged
writer commit then passed the complete shipcheck. No product code was patched
to mask that infrastructure event.

## Invariants

- Immutable staging is the only authorized source for the apply.
- The apply is insert-only and collision-free.
- Existing canonical rows cannot be updated or deleted.
- MTG must remain hidden before, during, and after commit.
- DSK must remain unchanged.
- MSH image pointers remain null; no external image is published.
- Pricing evidence may be mapped but is not published by this apply.
- Pokemon, pricing publication, Vault ownership, images, and Storage remain out
  of scope.
- No additional MTG set may be bundled into this operation.
- Any preflight, insert, exact readback, delta, security, visibility, or
  post-commit mismatch must fail the writer.

## Exact Next Gate

After receiving the exact approval text above, run the frozen writer once in
`--apply` mode against the frozen payload. It may commit only the 3,089 planned
MSH rows. Immediately run the independent post-apply verifier and require exact
row, hash, delta, security, DSK, staging, Pokemon, and zero-client-visibility
reconciliation.

Stop on any mismatch. Do not promote another set, write images or Storage,
update image pointers, publish MTG prices, activate MTG visibility, or write
Vault data as part of this gate.
