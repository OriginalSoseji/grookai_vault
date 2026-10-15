# Pricing Checkpoint 151: Master-Evidence Alias Batch

Date: 2026-10-15

## Admitted scope

This batch freezes exactly five TCGPlayer products and five distinct canonical
parents across Dragon Majesty (`sm75`), Celebrations: Classic Collection
(`cel25c`), and Black Bolt (`sv10.5b`). It covers six missing-price
observations: four Holo, one Normal, and one Reverse printing.

The admitted products are Victini Prism Star 7/70, Lance Prism Star 61/70,
Blaine's Last Stand (Full Art) 69/70, Umbreon Star 17/17, and Professor's
Research [Professor Juniper] 085/086. Every tuple binds the exact source product,
group, title, printed coordinate, canonical parent, and source-listed finish.

## Evidence reconciliation

The checked-in English Master Index already contains complete verified card and
printing evidence for every row. Dragon Majesty is published under Master Index
key `sm7.5` while the production parent set code is `sm75`. Celebrations records
the card as `Umbreon Star` and its Holo printing as `Umbreon ★`, matching the
TCGPlayer display name and canonical production name respectively. Black Bolt
stores collector number `85` while the production parent preserves `085`.

These differences are frozen inside this five-product authority. No global
normalization rule is added.

## Live rehearsal

A verified-TLS, repeatable-read production probe found all five current source
products, five unique active standard parents, and six active non-provisional
children. None has an active source or target TCGPlayer mapping, and none of the
six selected children has an active truth review.

The combined exact-mapping planner moved all five products from blocked to
reviewed candidates. The plan now contains 36 candidates covering 48 missing
price observations with zero findings. Canon maintenance dry-run
`5051711f-3fc2-43f8-a9b8-b7be180c7132` planned all six truth reviews, proved
rollback, and made zero durable writes. Its working authority fingerprint is
`67a4650e98e0e8d8398e419c01fdeef2a4c4c56cb12d287e9809b97e41c8d9e4`;
regenerate it from the exact merged commit before production apply.

## Release boundary

Merge the authority and executors, regenerate the plan and truth-review dry-run
from the exact merge commit, apply and independently read back the six reviews,
build the three-set mapping authority, apply and independently read back the five
mappings, then include them in a later full-source shadow and guarded production
publication. Mapping does not publish prices.
