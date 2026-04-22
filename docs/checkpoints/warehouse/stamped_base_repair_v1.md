# STAMPED_BASE_REPAIR_V1

## context
- Scope stayed locked to the 7 blocked rows discovered in `stamped_ready_batch_warehouse_intake_v1`.
- No wider stamped backlog was touched.
- No founder approval, staging, executor, or canon write ran in this pass.

## exact 7 blocked inputs
- 1. pokemon-black-and-white-promos-arcanine-12-99-prerelease-promo | Arcanine - 12/99 (Prerelease) | 12/99 | prerelease_stamp | conflicting=Zorua BW12 | underlying_base=bw4 Arcanine 12
- 2. pokemon-black-and-white-promos-arcanine-12-99-prerelease-staff-promo | Arcanine - 12/99 (Prerelease) [Staff] | 12/99 | staff_prerelease_stamp | conflicting=Zorua BW12 | underlying_base=bw4 Arcanine 12
- 3. pokemon-black-and-white-promos-darmanitan-25-114-prerelease-promo | Darmanitan - 25/114 (Prerelease) | 25/114 | prerelease_stamp | conflicting=Scraggy BW25 | underlying_base=bw1 Darmanitan 25
- 4. pokemon-black-and-white-promos-darmanitan-25-114-prerelease-staff-promo | Darmanitan - 25/114 (Prerelease) [Staff] | 25/114 | staff_prerelease_stamp | conflicting=Scraggy BW25 | underlying_base=bw1 Darmanitan 25
- 5. pokemon-black-and-white-promos-victini-43-101-prerelease-promo | Victini - 43/101 (Prerelease) | 43/101 | prerelease_stamp | conflicting=Landorus BW43 | underlying_base=bw3 Victini 43
- 6. pokemon-black-and-white-promos-victini-43-101-prerelease-staff-promo | Victini - 43/101 (Prerelease) [Staff] | 43/101 | staff_prerelease_stamp | conflicting=Landorus BW43 | underlying_base=bw3 Victini 43
- 7. pokemon-black-and-white-promos-gigalith-53-98-prerelease-promo | Gigalith - 53/98 (Prerelease) | 53/98 | prerelease_stamp | conflicting=Flygon BW53 | underlying_base=bw2 Gigalith 53

## root cause classification
- Root cause class: `SET_FAMILY_ROUTING_REPAIR_REQUIRED`
- Proven failure mode: the blocked rows are declared under the `bwp` source family, but their printed slash-number identities (`12/99`, `25/114`, `43/101`, `53/98`) belong to proven expansion-base rows in `bw4`, `bw1`, `bw3`, and `bw2`.
- The old route normalized the left side of the slash and audited slot occupancy under `bwp`, which collapsed these rows onto occupied `BW12`, `BW25`, `BW43`, and `BW53` promo-slot canon rows.
- This is not a stamped rule failure and not a source alias failure.

## repair implemented
- Added `PROMO_SLOT_IDENTITY_RULE_V1` and wired it into the source-backed routing layer.
- Repair surfaces:
  - backend/warehouse/source_identity_contract_v1.mjs
  - backend/warehouse/classification_worker_v1.mjs
  - backend/identity/identity_slot_audit_v1.mjs
  - backend/identity/identity_slot_audit_v1.test.mjs
  - docs/contracts/PROMO_SLOT_IDENTITY_RULE_V1.md
- New rule: source-backed stamped `black-and-white-promos-pokemon` rows with slash-number printed identity and `PROVEN` underlying base proof now route canonical `set_code` through the proven underlying base set before slot audit, staging, and executor planning.

## post-repair dry-run outcomes
- 1. Arcanine 12/99 | declared=bwp | effective=bw4 | VARIANT_IDENTITY | PROMOTE_VARIANT | CREATE_CARD_PRINT
- 2. Arcanine 12/99 | declared=bwp | effective=bw4 | VARIANT_IDENTITY | PROMOTE_VARIANT | CREATE_CARD_PRINT
- 3. Darmanitan 25/114 | declared=bwp | effective=bw1 | VARIANT_IDENTITY | PROMOTE_VARIANT | CREATE_CARD_PRINT
- 4. Darmanitan 25/114 | declared=bwp | effective=bw1 | VARIANT_IDENTITY | PROMOTE_VARIANT | CREATE_CARD_PRINT
- 5. Victini 43/101 | declared=bwp | effective=bw3 | VARIANT_IDENTITY | PROMOTE_VARIANT | CREATE_CARD_PRINT
- 6. Victini 43/101 | declared=bwp | effective=bw3 | VARIANT_IDENTITY | PROMOTE_VARIANT | CREATE_CARD_PRINT
- 7. Gigalith 53/98 | declared=bwp | effective=bw2 | VARIANT_IDENTITY | PROMOTE_VARIANT | CREATE_CARD_PRINT

## outcome summary
- identity_audit_counts: {"VARIANT_IDENTITY":7}
- identity_resolution_counts: {"PROMOTE_VARIANT":7}
- proposed_action_counts: {"CREATE_CARD_PRINT":7}
- warehouse_state_counts: {"RAW":7}
- No blocked row remained in `SLOT_OCCUPIED_BY_DIFFERENT_NAME`.
- All 7 now dry-run as `VARIANT_IDENTITY` / `PROMOTE_VARIANT` / `CREATE_CARD_PRINT`.

## can the original 25 resume
- YES
- Reason: the original 18 rows were already clean in the prior checkpoint, and the formerly blocked 7 now resolve onto the correct underlying base families with no remaining slot conflicts.
- The full 25-row batch was not rerun in this repair pass by design.

## recommendation
- `RESUME_ORIGINAL_25_BATCH`
