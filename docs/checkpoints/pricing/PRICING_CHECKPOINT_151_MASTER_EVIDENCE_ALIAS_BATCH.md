# Pricing Checkpoint 151: Master-Evidence Alias Batch

Date: 2026-10-15

## Admitted scope

This batch freezes exactly seven TCGPlayer products and seven distinct canonical
parents across Dragons Exalted (`bw6`), Dragon Majesty (`sm75`), Celebrations:
Classic Collection (`cel25c`), and Black Bolt (`sv10.5b`). It covers ten
missing-price observations: four Holo, three Normal, and three Reverse printings.

The admitted products are Blend Energy GFPD 117/124, Blend Energy WLFM 118/124,
Victini Prism Star 7/70, Lance Prism Star 61/70, Blaine's Last Stand (Full Art)
69/70, Umbreon Star 17/17, and Professor's Research [Professor Juniper] 085/086.
Every tuple binds the exact source product, group, title, printed coordinate,
canonical parent, and source-listed finish.

## Evidence reconciliation

The checked-in English Master Index already contains complete verified card and
printing evidence for every row. Dragons Exalted records the full canonical
names `Blend Energy GrassFirePsychicDarkness` and `Blend Energy
WaterLightningFightingMetal`; the TCGPlayer products use the product-specific
abbreviations `GFPD` and `WLFM`. Dragon Majesty is published under Master Index
key `sm7.5` while the production parent set code is `sm75`. Celebrations records
the card as `Umbreon Star` and its Holo printing as `Umbreon ★`, matching the
TCGPlayer display name and canonical production name respectively. Black Bolt
stores collector number `85` while the production parent preserves `085`.

These differences are frozen inside this seven-product authority. No global
normalization rule is added.

## Live rehearsal

A verified-TLS, repeatable-read production probe found all seven current source
products, seven unique active standard parents, and ten active non-provisional
children. None has an active source or target TCGPlayer mapping, and none of the
ten selected children has an active truth review.

The combined exact-mapping planner moved all seven products from blocked to
reviewed candidates. The working-tree plan contains 38 candidates covering 52
missing-price observations, leaves 461 products explicitly blocked, and has zero
findings. Canon maintenance dry-run
`efea00ee-ba3b-4d5c-b72f-f04e8cd4bc61` planned all ten truth reviews, proved
rollback, and made zero durable writes. Its working authority fingerprint is
`ad3187fb513438ea01da3c9003101dca2caefec3e2684ace67c7e39856eb2a77`;
regenerate the plan and rehearsal from the exact merged commit before production
apply.

## Release boundary

Merge the authority and executors, regenerate the plan and truth-review dry-run
from the exact merge commit, apply and independently read back the ten reviews,
build the four-set mapping authority, apply and independently read back the seven
mappings, then include them in a later full-source shadow and guarded production
publication. Mapping does not publish prices.
