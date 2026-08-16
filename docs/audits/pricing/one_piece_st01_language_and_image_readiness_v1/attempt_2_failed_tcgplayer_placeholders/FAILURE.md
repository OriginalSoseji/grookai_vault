# Attempt 2 Failed Closed: Six Source Image Gaps

The hardened run from producer
`069e24dfca18d40c23c11d4c176424cc4255e70f` rejected shared landscape
placeholders for six numbered cards. Their exact staged `200w` references were
also the same `200 x 115` placeholder, so the run correctly stopped with six
`image_not_accepted` findings.

Affected source product IDs: `288234`, `288236`, `288243`, `288244`, `288245`,
and `288246`.

No database, Storage, pointer, canonical, sealed, pricing, or publication
mutation occurred. The repair uses the exact card-number/name-bound images from
Bandai's official English ST-01 card list instead of guessing another TCGPlayer
asset.
