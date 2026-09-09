# Blooming Waters Account-Only Add Preparation

Date: September 9, 2026 UTC. User reported no way to add sealed products, then
selected "blooming waters 151". This identifies the intended product; it does
not authorize fabricated inventory or global activation.

## Confirmed Cause

Production readback at 13:04 UTC resolves exactly one English Pokemon product:
Blooming Waters Premium Collection, variant
`4643eb90-c362-57cf-96ea-bca2cd08e82b`, TCGPlayer product 609597.
The released row has a self-hosted image and September 8 market evidence of
USD 326.70. The founder's capability is `add_enabled=false`. Both server
switches are off; no account or variant grants exist. Build 317 includes the
client feature, but `AddSealedButton` hides itself when capability is false.
This is incomplete activation, not a failed inventory write or a missing card.

## Narrow Repair

The original planner chose one alphabetic Pokemon and one alphabetic MTG item.
It could not represent the founder's chosen product. Optional `--selection-file`
now binds one or two exact Pokemon/MTG IDs and bounded search queries. Discovery
must resolve each ID exactly once through the governed read model. No fallback
or substitution. The original two-product plan remains compatible.

The selected IDs and queries are fingerprinted into snapshot and plan, replayed
at preflight and again under transaction locks. Expected variant insert counts
derive from the frozen exact list, not a hard-coded two. Existing limits,
freshness/image evidence, 24-hour window, 25-copy lifetime ceiling, single-owner
scope, immutable authority, rollback and global-off policy remain unchanged.

No schema/client changes, production activation, holdings, Storage or pricing
writes are included in this code repair. The allowed execution branch adds
`fix/sealed-canary-explicit-product`; full SHA/clean-tree/source-plan checks and
the existing exact activation authority remain mandatory.

## Evidence And Next Gate

83 focused contracts pass, including single-product affected-row assertions,
locked exact-selection replay, substitution/duplicate/extra-game rejection,
parameterized search and unchanged legacy plans. These are mocked transition
tests, not a fresh production activation or live owner lifecycle receipt.

Private evidence:
`C:/grookai_vault_operator_artifacts/sealed_ownership/20260909_blooming_waters/`.
Source lookup:
`C:/grookai_vault_operator_artifacts/release_closeout/20260909/blooming_waters_1788959055154.json`.

After clean committed producer checks, freeze a new plan and execution envelope
for only Blooming Waters. Preserve the earlier two-product artifacts unchanged.
Do not activate using the consumed schema approval or an invented approval file.
After the separately authorized activation/readback, reopen the product page
(capability is cached briefly) and verify the Add control and dialog before
requesting the founder's genuine ownership action. Do not click final Add for
the founder or create sale/trade history solely to satisfy acceptance.
