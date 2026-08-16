# Pricing Checkpoint 63: One Piece ST-01 Language And Image Readiness Passed

## Current Truth

The exact 21-row One Piece ST-01 staging batch now has a zero-finding,
source-backed language and image-acquisition readiness proof from producer
`c8b01d27bb6541857cd1b0220b2a13f92cf31b1e`.

This gate downloaded and verified source bytes only in ignored `.tmp`. It did
not connect to the database or Supabase Storage and did not mutate canonical,
sealed, pricing, publication, Vault, or image-pointer state.

## Final Result

- Readiness fingerprint:
  `e98d7e21fd828765165f6fde5a897c24104e8d9dabaeebe3808950a886190468`
- Selected staged rows: `21`
- Accepted image acquisitions: `21 / 21`
- Preferred-resolution images: `19 / 21`
- Exact official English-authority rows: `18 / 21`
- Official numbered-card matches: `17 / 17`
- Proposed content-addressed card/DON paths: `18`
- Sealed paths pending a sealed image contract: `3`
- Duplicate selected-image hashes: `0`
- Findings: `0`
- Artifact hash mismatches: `0`
- Database connections/writes: `0 / 0`
- Storage connections/writes: `0 / 0`
- Pointer updates: `0`

## Authority Boundaries

- Bandai's English ST-01 product page proves the regular English
  `STARTER DECK -Straw Hat Crew- [ST-01]`, release date, MSRP, deck contents,
  and 17 card types.
- Bandai's English card list proves every `ST01-001` through `ST01-017`
  number/name pair and supplies an exact image attached to each pair.
- The regular base deck row has exact English product authority.
- The display, retailer set-of-four bundle, and unnumbered Green Compass DON!!
  variant remain context-only. Their specific identities are not inferred from
  the official ST-01 page.
- No blanket English-language authority is granted to TCGPlayer category 68.

Official sources:

- `https://en.onepiece-cardgame.com/products/decks/st01-04.php`
- `https://en.onepiece-cardgame.com/cardlist/?series=569001`

## Image Truth

- All 17 numbered cards use the exact Bandai card-list image bound to their
  official card number and name. Each image is `600 x 838` PNG.
- The DON!! row and three sealed rows use exact product-bound TCGPlayer source
  references or same-product high-resolution derivatives.
- The regular deck package image is `521 x 1000`; the DON!! image is
  `500 x 702`. Both are valid images but below the preferred-width diagnostic.
- The three sealed rows have no target path because the sealed domain currently
  has no governed image-pointer contract.

## Fail-Closed Evidence

Two earlier attempts are preserved because they exposed a meaningful source
failure:

1. The first attempt accepted one `Image Coming Soon` hash for six products.
2. The repaired attempt rejected both the landscape and `200 x 115`
   TCGPlayer placeholders for those six products.

The final producer requires card-like aspect ratios, rejects selected hashes
shared across products, and uses official number/name-bound images rather than
guessing alternative product assets.

## What Must Never Be Broken

- A shared CDN placeholder must never become canonical image evidence.
- Image bytes must remain bound to exact source product or official card-number
  evidence.
- TCGPlayer category membership must never become blanket language authority.
- Card-print paths must not be invented for sealed products.
- Acquired bytes and proposed paths do not authorize upload or pointer changes.
- Numbered cards, DON!! variants, sealed products, and retailer bundles remain
  separate promotion lanes.

## Remaining Work

- Run a read-only Storage collision preflight for the 18 proposed card/DON
  paths and freeze an exact permanent-upload plan.
- Define the unnumbered DON!! variant identity contract before canonical apply.
- Define the sealed image-pointer contract before any sealed image upload.
- Freeze separate sealed deck, display, and multi-product bundle identities.
- Build fresh canonical/sealed collision preflights before promotion.
- Apply no public release or pricing publication until those independent gates
  pass.

## Artifacts

- Passing proof:
  `docs/audits/pricing/one_piece_st01_language_and_image_readiness_v1/st01_group_3189_v1/`
- Rejected placeholder attempt:
  `docs/audits/pricing/one_piece_st01_language_and_image_readiness_v1/attempt_1_rejected_shared_placeholder/`
- Failed-closed six-gap attempt:
  `docs/audits/pricing/one_piece_st01_language_and_image_readiness_v1/attempt_2_failed_tcgplayer_placeholders/`

## Exact Next Gate

Create and run a read-only Supabase Storage collision preflight for exactly the
18 proposed card/DON objects, bind it to this readiness fingerprint and exact
image hashes, and emit a no-write upload plan. Do not include the three sealed
rows and do not upload or update pointers in that gate.
