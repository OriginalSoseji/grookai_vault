# Attempt 1 Rejected: Shared CDN Placeholder

The first live readiness attempt from producer
`e9880b4ed87ebf27a9f628c754087aef7776ceac` passed byte-level validation but
selected the same TCGPlayer `Image Coming Soon` placeholder for six different
card products.

- Shared SHA-256:
  `4ff019368c7dec906850276302dfe0b548c00c94d90657919ba37e2ee86465ca`
- Affected source product IDs:
  `288234`, `288236`, `288243`, `288244`, `288245`, `288246`
- The `1000 x 573` landscape image is not card artwork.
- No database, Storage, pointer, canonical, sealed, pricing, or publication
  mutation occurred.

This attempt is retained as negative evidence and must not authorize an upload.
The repair requires card/DON candidates to have a card-like aspect ratio and
makes any selected image hash shared by different source products a hard
finding.
