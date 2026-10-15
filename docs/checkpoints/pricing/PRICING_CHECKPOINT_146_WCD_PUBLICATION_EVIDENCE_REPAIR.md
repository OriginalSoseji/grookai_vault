# Pricing Checkpoint 146: Team Rushdown Publication Evidence Repair

Date: 2026-10-15

The full-source Team Rushdown shadow completed successfully and the global
coverage gate passed at 97.786%, but all 24 Team Rushdown rows were excluded as
`wcd_team_rushdown_identity_mismatch`.

Independent artifact and production readback showed that every source mapping,
parent ID, printing ID, finish, and GV ID was exact. The publication query only
joined parent and truth-review evidence for two older Trainer Kit products.
Consequently, Team Rushdown candidates reached the policy with null set,
canonical-name, canonical-number, variant, provisional, and truth-review fields.

The repair centralizes the reviewed special-product list and enriches both the
canary and full publication queries for the two Trainer Kit products plus all 24
Team Rushdown products. It adds no mappings and authorizes no publication by
itself. A fresh exact-commit full-source shadow must show all 24 Team Rushdown
rows publishing before production activation.
