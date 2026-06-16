# Post Reconcile Integrity Audit V1

Read-only audit for failure classes exposed by SVP Grey Felt Hat.

## Summary

- db_writes_performed: false
- migrations_created: false
- master_verified_printings_loaded: 41195
- db_parent_rows_scanned: 22912
- db_child_printings_scanned: 37867
- duplicate_parent_identity_groups: 2
- duplicate_parent_identity_groups_actionable: 0
- duplicate_parent_identity_groups_governed_exceptions: 2
- duplicate_active_identity_normalized_groups: 2
- duplicate_active_identity_normalized_groups_actionable: 0
- duplicate_active_identity_normalized_groups_governed_exceptions: 2
- unsupported_child_printings_exact: 2791
- normalized_supported_child_printings: 2841
- display_image_risk_child_rows: 0

## Why Grey Felt Hat Slipped

The previous checks proved child finish truth and image evidence for targeted packages, but they did not assert that a card could not still have a second parent owner using an alternate number form. That allowed a padded canonical parent and an unpadded duplicate parent to coexist until Explore made the ambiguity visible.

## Required Regression Gates

- parent_normalized_identity_unique: no duplicate parent groups by set + normalized number + normalized name + identity modifier + variant.
- active_identity_normalized_unique: no active identity groups by domain + set + normalized printed number + normalized printed name + modifier/variant.
- child_printing_supported_by_master_index: every child printing must be exact-supported by the publishable Master Index, or explicitly classified as normalized-supported review debt.
- display_image_has_truthful_fallback: every visible child row must have either child image truth or parent display image truth; blocked variant rows must be explicitly marked.

## Top Duplicate Parent Groups

- svp|46|bulbasaur||: GV-PK-PR-SV-046 #046, GV-PK-PR-SV-46 #46
- svp|54|greninja ex||: GV-PK-PR-SV-054 #054, GV-PK-PR-SV-54 #54

## Governed Duplicate Parent Exceptions

- svp|46|bulbasaur||: append_only_feed_contract, feed_events=1
- svp|54|greninja ex||: append_only_feed_contract, feed_events=2

## Top Unsupported Child Printings

- GV-PK-OBF-196-PLAY-POKEMON-STAMP-COSMOS sv03 #196 Town Store cosmos
- GV-PK-ME03-012-HOLO me03 #012 Decidueye-EX holo
- GV-PK-TK-tk2b-11-STD tk2b #11 Fire Energy normal
- GV-PK-ME03-016-HOLO me03 #016 Salazzle-EX holo
- GV-PK-SLG-53-HOLO sm3.5 #53 Zoroark GX holo
- GV-PK-SLG-75-HOLO sm3.5 #75 Raichu GX holo
- GV-PK-LTR-RC1-STD bw11 #RC1 Snivy normal
- GV-PK-LTR-RC1-RH bw11 #RC1 Snivy reverse
- GV-PK-ME03-021-HOLO me03 #021 Mega Starmie-EX holo
- GV-PK-LTR-RC10-STD bw11 #RC10 Gardevoir normal
- GV-PK-LTR-RC10-RH bw11 #RC10 Gardevoir reverse
- GV-PK-LTR-RC12-STD bw11 #RC12 Stunfisk normal
- GV-PK-LTR-RC12-RH bw11 #RC12 Stunfisk reverse
- GV-PK-LTR-RC13-STD bw11 #RC13 Purrloin normal
- GV-PK-LTR-RC13-RH bw11 #RC13 Purrloin reverse
- GV-PK-LTR-RC14-STD bw11 #RC14 Eevee normal
- GV-PK-LTR-RC14-RH bw11 #RC14 Eevee reverse
- GV-PK-LTR-RC15-STD bw11 #RC15 Teddiursa normal
- GV-PK-LTR-RC15-RH bw11 #RC15 Teddiursa reverse
- GV-PK-LTR-RC16-STD bw11 #RC16 Ursaring normal
- GV-PK-LTR-RC16-RH bw11 #RC16 Ursaring reverse
- GV-PK-LTR-RC18-STD bw11 #RC18 Minccino normal
- GV-PK-LTR-RC18-RH bw11 #RC18 Minccino reverse
- GV-PK-LTR-RC19-STD bw11 #RC19 Cinccino normal
- GV-PK-LTR-RC19-RH bw11 #RC19 Cinccino reverse

## Top Normalized-Supported Child Printings

- GV-PK-MEP-068-COSMOS mep #068 Makuhita cosmos
- GV-PK-MEG-007-STD me01 #007 Tangrowth normal
- GV-PK-MEG-007-RH me01 #007 Tangrowth reverse
- GV-PK-CRI-003-HOLO me04 #003 Beedrill ex holo
- GV-PK-CRI-006-RH me04 #006 Quilladin reverse
- GV-PK-CRI-007-HOLO me04 #007 Chesnaught holo
- GV-PK-CRI-007-RH me04 #007 Chesnaught reverse
- GV-PK-CRI-008-RH me04 #008 Vulpix reverse
- GV-PK-CRI-009-RH me04 #009 Ninetales reverse
- GV-PK-CRI-010-HOLO me04 #010 Ho-Oh holo
- GV-PK-CRI-010-RH me04 #010 Ho-Oh reverse
- GV-PK-CRI-012-RH me04 #012 Braixen reverse
- GV-PK-CRI-013-HOLO me04 #013 Delphox holo
- GV-PK-CRI-013-RH me04 #013 Delphox reverse
- GV-PK-CRI-014-RH me04 #014 Litleo reverse
- GV-PK-CRI-015-HOLO me04 #015 Mega Pyroar ex holo
- GV-PK-CRI-016-RH me04 #016 Remoraid reverse
- GV-PK-CRI-017-RH me04 #017 Octillery reverse
- GV-PK-CRI-019-HOLO me04 #019 Keldeo holo
- GV-PK-CRI-019-RH me04 #019 Keldeo reverse
- GV-PK-CRI-020-RH me04 #020 Froakie reverse
- GV-PK-CRI-021-RH me04 #021 Frogadier reverse
- GV-PK-CRI-022-HOLO me04 #022 Mega Greninja ex holo
- GV-PK-CRI-023-RH me04 #023 Bergmite reverse
- GV-PK-CRI-024-RH me04 #024 Avalugg reverse

## Top Display Image Risk Rows

- none
