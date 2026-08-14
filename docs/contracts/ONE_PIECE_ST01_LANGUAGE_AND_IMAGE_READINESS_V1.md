# One Piece ST-01 Language And Image Readiness V1

## Purpose

Resolve source-backed language and image-acquisition readiness for the exact 21
rows already staged from TCGPlayer category 68, group 3189. This contract grants
no canonical, sealed, pricing, publication, Storage, or image-pointer authority.

## Language Authority

- Bandai's English ST-01 product page is authoritative for the English ST-01
  product, release date, MSRP, deck contents, and 17 card types.
- Bandai's English card list for series 569001 is authoritative for the exact
  ST01-001 through ST01-017 card-number/name pairs.
- Authority is bound only to TCGPlayer group 3189 and exact reconciled rows.
- TCGPlayer category 68 does not receive blanket English-language authority.
- The unnumbered DON variant, display packaging, and retailer set-of-four bundle
  remain context-only until their specific identity evidence is established.

## Image Acquisition

- Every staged image reference must be HTTPS, use the allowlisted TCGPlayer CDN,
  and bind to the same source product ID.
- The downloader may try the same product's `in_1000x1000` image before the exact
  staged `200w` reference.
- Response host, HTTP status, content type, byte signature, byte size,
  dimensions, and SHA-256 are verified.
- Downloaded bytes may exist only under ignored `.tmp` during this gate.
- Card and DON paths are content-addressed proposals under the established
  card-print image prefix. They are not upload authority.
- The sealed domain has no image-pointer contract. Sealed rows must report
  `pending_sealed_image_contract` and must not receive invented card-print paths.

## Boundaries

- No database connection or write.
- No Storage connection, collision query, upload, or deletion.
- No card-image or sealed-image pointer mutation.
- No canonical, sealed, pricing, Vault, or publication mutation.
- No raw official website content is persisted in tracked artifacts; only
  response metadata, hashes, and short verified markers are retained.

## Next Gate

After this proof passes, freeze a separate collision-preflight and permanent
upload plan for the 18 card/DON objects. Define the sealed image contract before
planning any sealed-object upload.
