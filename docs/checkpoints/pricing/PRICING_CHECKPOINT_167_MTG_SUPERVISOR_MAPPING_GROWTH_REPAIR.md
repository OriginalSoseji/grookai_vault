# Pricing Checkpoint 167: MTG Supervisor Mapping Growth Repair

## Status

The read-only MTG Catalog Supervisor now treats later exact printing-mapping
growth as a valid additive refresh when the set remains structurally complete.
The frozen August manifest remains the minimum reconciliation floor.

## Trigger

Scheduled workflow run `39839641785` stopped fail-closed on October 22, 2026.
Its preserved production readback classified 87 eligible sets as
`partial_or_drifted`. The emitted error listed only the first ten set codes.

Replaying the readback against the frozen manifest proved:

- all 87 sets retained their exact frozen set, parent, identity, printing, and
  Scryfall parent-mapping counts;
- every current parent had an identity, printing, and Scryfall mapping;
- no observed count was below its frozen floor;
- the only changed field was `external_printing_mappings`;
- the 87 sets gained 817 exact printing mappings in total.

These rows are governed mapping completion, not catalog drift.

## Repair

`complete_additive_superset` now permits the current parent count to equal the
frozen parent floor. Exact-count classification still wins when every count is
unchanged. A set with equal parents and additional exact printing mappings can
therefore reconcile as an additive superset.

The existing fail-closed requirements remain in force:

- exactly one set row;
- current parents at or above the frozen floor;
- exactly one active identity and Scryfall mapping per current parent;
- at least one printing per current parent;
- printing and exact printing-mapping counts at or above their frozen floors;
- no database, release-control, image, Storage, pricing-publication, or Vault
  writes by the supervisor.

## Verification

- contract regression covers exact parent counts with one additional exact
  printing mapping;
- existing under-count and missing-parent-coverage tests remain unchanged;
- the preserved October 22 readback is the production evidence for the repair.

## Production Effect

This is an observer repair. It changes no catalog or pricing rows. After the
workflow reaches the default branch, a manual shadow-only run must reconcile
the already-public eligible MTG catalog and dispatch no writer.
