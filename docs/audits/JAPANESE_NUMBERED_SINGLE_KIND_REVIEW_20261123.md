# Japanese numbered single-card kind review

The retained unlimited V1_27 shadow from source
`a3591eb1-7e55-48ac-8996-b36afdd0d3df` contains 249,657 decisions, including 29,369
Japanese rows and 2,540 eligible Japanese printings. Its decision artifact SHA256
is `bcbe6f6118c25dead6d1f59ef91294d588608af238432afe03f1a2e6da68e513`.
This is historical diagnostic evidence, not V1_29 runtime qualification.

All 20,607 positive Japanese rows withheld from publication were inspected.
Of these, 20,603 lack an exact canonical mapping and remain withheld. Only four already
mapped printings had the sole `unsupported_product_kind` reason:

| TCGplayer product | Source name | Number | Source CardType |
| --- | --- | --- | --- |
| 570729 | Box of Disaster - 066/071 | 066/071 | Trainer - Item |
| 574415 | Surprise Box | 044/055 | Trainer - Item |
| 602399 | Iron Bundle | 047/187 | Water |
| 669598 | Energy Coin | 637/742 | Trainer - Item |

A verified-TLS read-only production inspection independently retained their
source product metadata, full staged candidate inputs, current canonical
parents/children, and original governed mapping assertions. The packaging words
in their names do not change the independently retained individual-card facts.
The closed registry retains those exact identities and mapping metadata; all
underlying source/canonical/mapping tables remain unchanged.

The separate 12 lost Japanese quotes remain 11 genuinely absent original source
rows and one null Market quote. Their eight original price artifacts were
independently matched to production SHA/lengths. The four-card correction does
not invent those lost prices, replace their values or extend freshness.

Against the observed 2,545 baseline, 2,540 fails the existing threshold and 2,544
would pass its numeric comparison. That projection is conditional: actual
source, visibility, mapping and freshness must still pass a new full V1_29
shadow and ordinary atomic activation. No partial replay, older shadow,
registry entry, local test or merge preview grants publication authority.
