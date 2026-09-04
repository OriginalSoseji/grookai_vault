# MTG Sealed Merged-Main Readback V1

## Result

The read-only verification passed from merged `main` commit
`a9a384cb4085a5369e73ebd7039ab6ddcffb2a47` in GitHub Actions run
[`33834897002`](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33834897002).

- All nine durable table projections matched exactly.
- The MTG pointer still targets frozen release
  `25626032-7d72-5542-a8e0-7a6532c2f776`.
- The release still contains exactly `2,182` qualified members.
- The source fingerprint remains
  `4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af`.
- The One Piece boundary remained unchanged at
  `83e84e94755dce0dbecf5f02be2c25fa4c9ef2517c98dbe8f95225de5000be03`.
- The hidden signed-in RPC returned `0` rows.
- Database writes committed: `0`.

The complete compressed plan remains in the immutable workflow artifact
`mtg-sealed-readback-33834897002`. Its downloaded artifact hashes are recorded
in `source_artifact_hashes.json`.

## Boundary

This report proves readback only. It grants no authority for Storage, image
pointers, pricing refresh/publication, visibility activation, deployment,
Vault writes, updates, or deletes.
