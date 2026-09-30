# TCGPlayer Trainer Kit pricing pilot V1

This policy permits only two reviewed normal-finish Trainer Kit identities to
proceed through the existing mapping and publication gates. It does not grant
mapping execution authority, introduce child printings, or admit other kits.

| Product | Canonical card | Printed source coordinate | Child finish |
| --- | --- | --- | --- |
| 88393, Professor Elm's Training Method | GV-PK-TK-tk-hs-g-25 | 25/30 | normal |
| 84427, Copycat | GV-PK-TK-tk-hs-r-21 | 21/30 | normal |

Both source products belong to group 1540, `HGSS Trainer Kit: Gyarados & Raichu`.
The immutable registry in `backend/pricing/tcgplayer_trainer_kit_pilot_v1.mjs`
records exact parent, set and child UUIDs, GV-IDs and original evidence hashes.
The preserved TCGdex card bodies explicitly bind the normal printing to each
TCGPlayer product ID. Normalized name similarity alone is not this authority.

Generic product scope V1.1/V1.2/V1.3 retains its Trainer Kit exclusion. The
separately versioned `TCGPLAYER_TRAINER_KIT_PILOT_V1` exception is recorded in
candidate fingerprints, mapping metadata and successful qualification evidence.
It can override only the existing deck-exclusive exclusion after exact identity
validation. A known pilot product with drifted group or target is rejected even
if its changed label would pass the generic classifier.

Mapping requires exact source name, group, full printed coordinate, normal-only
subtypes, canonical parent, set, GV-ID, raw name/number and blank base variant.
The apply validator independently rechecks scope and the exception after candidate
fingerprint verification; its live preflight checks source and target again.
The existing unique identity, unmapped target, collision, producer and transaction
checks remain required. Fresh mapping assertions must have a projection-bound
Master Index review. A historical printing-only review cannot approve them.
See `MASTER_INDEX_MAPPING_AUTHORITY_V1.md`.

Publication additionally requires the exact normal child UUID/GV-ID, a
nonprovisional printing and active verified-visible truth review with no active
conflicting review. Missing identity columns fail closed. The worker obtains
these fields from one-to-one parent/child joins and correlated review checks in
both canary and full queries. Source number evidence must be unique and exact.
The existing reconciled current source, positive USD market price, freshness,
one-to-one mapping and exact finish checks still determine publication.
No price is supplied by this registry.

Coverage re-evaluates the same full candidate evidence. It does not trust a
successful decision label or exception version alone to admit a kit.

Deployment requires a new immutable producer and fresh shadow/reconciliation
proof. Do not modify an existing release or replay prior mapping applies.
Read-only simulations of the proposed two mappings are diagnostic evidence;
they prove neither committed mappings nor collector-visible prices.
