# Pricing Checkpoint 163: MTG Reviewed Printing Correction

## Status

`IMPLEMENTED - PRODUCTION-SHAPED ROLLBACK REHEARSAL PASSED`

## Failure

Production pricing run `39486729222` built and reconciled 176,836 snapshots,
then correctly rolled activation back when the current-price readback contained
176,835 distinct printings. The active publication pointer stayed on the prior
verified run.

The one duplicate target was TCGPlayer product `269823`, `Treasure Token (017)`
Normal. Its legacy parent and finish mappings both pointed to the Scryfall
`tsnc` collector-number `13` Normal child. Product `269807`, the real
`Treasure Token (013)`, also maps there. The publisher therefore produced two
source snapshots for one canonical printing, while its current-price view
correctly retained only one.

## Reviewed Authority

The source product supplies group `3026`, printed number `17`, subtype `Normal`,
and a positive source market value. The existing English paper Scryfall parent
`93116d98-2dad-4b80-a3af-9e36e34da6d4` is `tsnc` number `17` and owns one
visible, nonprovisional Normal child. The correction is frozen to the exact
source observation, source run, mapping row IDs, old number-13 targets, and new
number-17 parent/child IDs.

The bounded writer may update only parent mapping `306816` and printing mapping
`07751bc7-c883-49bd-9857-ca52d67e6037`. It uses a serializable transaction,
an advisory lock, exact before-state predicates, a plan-derived acknowledgement,
transaction readback, rollback proof, and independent post-commit readback.
It does not update cards, identities, printings, source observations, historical
assignments, snapshots, customer inventory, or any Pokemon row.

## Candidate Repair

Migration `20261020220000_mtg_reviewed_printing_correction_bridge_v1.sql` adds
candidate V7. V7 preserves the prior exact-finish and missing-number lanes. An
active printing mapping may override stale generic parent/assignment lineage
only when its metadata carries both the reviewed-correction contract and method,
and binds the same source product and normalized finish. The output uses only
`mtg_printing_mapping_id`; generic source and assignment IDs become null. The
existing MTG decision and snapshot triggers revalidate the exact mapping and
source row.

## Rehearsal

The production-shaped rehearsal created V7, updated both frozen mapping rows,
and verified product `269823` resolved only to the number-17 Normal child through
the exact MTG printing lane. It then rolled the schema and both data updates back.
The original mappings and absence of V7 were restored.

Evidence:
`C:\grookai_vault_operator_artifacts\pokemon_pricing_repair_20261012\mtg_reviewed_printing_correction_20261020\unmerged_schema_rehearsal_v2`.

Focused pricing and correction contracts passed 74/74. The linked CLI dry-run
identified only `20261020220000_mtg_reviewed_printing_correction_bridge_v1.sql`
as pending. The default linked-schema diff remains blocked before reaching this
migration by the known zero-state replay requirement in already-applied
`20261012010000_card_print_identity_aliases_v1.sql`: an empty replay contains
zero of its required 647 production catalog pairs. The candidate itself passed
the production-schema transaction rehearsal described above.

The complete contract suite passed with 7,980 passing, zero failing, and 10
skipped tests. Runtime preflight passed with no critical failures, runtime
health passed, and the quarantine report contained zero unresolved rows. The
seven deferred paths remain the already-recorded blocked or maintenance-only
architecture debt and are outside this bounded pricing correction.

## Release Gate

Merge an exact tested commit. Run the migration dry-run and apply from that
merged SHA, then the reviewed correction plan, rollback dry-run, apply, and
independent readback. Correction apply must receive the exact successful dry-run
workflow run ID; the workflow re-downloads its immutable artifact and verifies
the commit, source run, plan fingerprint, two selected updates, rollback status,
and transaction readback before it can write. Start a new full-scope shadow from
the same current source run and exact merged pricing worker. Production
activation must reconcile snapshot rows and distinct current printings exactly
before switching the customer-facing pointer.
