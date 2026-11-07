# Restore the approved set-gallery artwork

The owner identified that the November 7 layout correction retained incorrect
set artwork. October 15 commit `d8f5b70a7` on `feat/web-visual-redesign-v2` had
already fixed selection, but that fix was absent from main and the live source.
This restores the Pokemon gallery behavior while preserving the Winter theme and the shared
spacing/upright-grid correction in PR873.

- Select verified set/package artwork from the row, then exact package evidence
  from the existing presentation manifest. Exclude representative card covers.
- Fall back to the matching set logo. Bundle the previously verified 30th,
  Ascended Heroes and Pitch Black PNGs locally; preserve their original bytes.
  `asc` uses the existing catalog shorthand identity `me02.5`.
- Remove the staging-only rarity-ranked card substitution, so previews cannot
  present a card as evidence of set artwork.
- Keep existing One Piece/MTG cover authority unchanged. Their governed covers
  use `manual` provenance; the old patch's global allowlist removed those images.
- Preserve set identities, routes, names, bilingual metadata and card counts.
  No database, Storage, canonical image-pointer or pricing writes.
- Use the shared seasonal primary button for the existing sealed browse link.

The mandatory contract suite exercises the actual set-summary mapping and logo
resolver. The local layout fixture now uses set artwork instead of sample cards.
Vercel runs `scripts/ci/check_web_visual_contract.mjs` before its normal build;
this retains Winter/accent/spacing/upright checks and rejects a missing artwork
restoration or missing bundled logos. Older branches must integrate the fix.

The production baseline is deployment `dpl_C9bhArf84zz1z2SkSNVexzg2JapM`, built
from main `6e54742a6f1ab683a5d8f14d7e662641a689afee`. Release evidence, logo
provenance and live readback belong to operator artifacts under
`web_set_artwork_restore_20261107`; this source checkpoint alone does not assert
publication.
