# Pricing Checkpoint 92: One Piece Card Images Applied and Verified

## Result

The One Piece parent-card image lane is complete for every exact source image
currently available.

- 6,730 canonical One Piece parent cards inspected
- 6,553 exact source images downloaded, hash recorded, self-hosted, and read back
- 6,553 exact `card_prints` image pointers applied and independently verified
- 177 provider coverage gaps preserved as explicit null pointers
- 0 representative or wrong-artwork substitutions

## Authority And Safety

Each stored object retains its source authority and immutable hash evidence.
The writer used collision preflight, a 25-row rollback canary, bounded mutations,
and independent post-apply readback. The non-One Piece image fingerprint was
unchanged.

The 177 gaps are not failures and are not evidence that an image does not
exist. They mean an exact provider image was unavailable during this run. The
catalog must render its governed missing-image state for those rows until an
exact source is acquired.

## Frozen Evidence

- Source-plan fingerprint:
  `5a05e6058f41987b81a41507745201114efb847602ab974daefea0a065982664`
- Pointer-plan fingerprint:
  `22f2b56070e43392c38ea33c4ad06f0013707e5e1eafb672b965cfee868388a4`
- Pointer payload fingerprint:
  `dad6ab8990ff38f2b72816a6aea72188d38ca974137c44a65598d1b9624ea82a`

Permanent audit roots:

- `docs/audits/pricing/one_piece_card_image_self_host_v1/`
- `docs/audits/pricing/one_piece_card_image_pointer_v1/`

## Invariants

- Only exact card artwork may populate an exact parent-card pointer.
- A missing exact source remains null; it is never filled with another printing.
- Storage success does not grant catalog visibility.
- Image pointer changes cannot mutate canonical identity or non-One Piece rows.

## Next Gate

Prove the signed-in release boundary across direct reads, search, card detail,
set browsing, and sealed pricing while leaving the durable release control
hidden.
