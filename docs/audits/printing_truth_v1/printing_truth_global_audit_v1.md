# Printing Truth Global Audit V1

Generated: 2026-05-23T17:58:59.649Z

## Scope

Read-only Phase 1 audit of `public.card_printings`. No database writes, deletes, updates, or migration repairs were performed.

## Totals

- total printings: 55661
- verified printings: 50524
- unsupported printings: 455
- conflicting printings: 0
- unverifiable rows: 167
- quarantine candidates: 4515
- reverse holo discrepancies: 2684
- source disagreement count: 12114

## Finish Distribution

| finish |rows |verified |unsupported |unverifiable |quarantine |
| --- |--- |--- |--- |--- |--- |
| normal |19919 |18196 |234 |0 |1489 |
| reverse |18629 |17099 |77 |0 |1453 |
| holo |16816 |15229 |14 |0 |1573 |
| pokeball |230 |0 |130 |100 |0 |
| masterball |67 |0 |0 |67 |0 |

## Stop-Rule Findings

- Potentially invalid printings are tied to legacy/generated rows with no provenance; quarantine must precede removal.
- Some card_printings are referenced by vault_item_instances; cleanup must not delete rows before ownership migration/retarget proof.
- Source disagreements exist and cannot be resolved deterministically in Phase 1.
- Generator code previously allowed finish rows from upstream boolean flags; this pass hardens that path to fail closed.

## Quarantine Strategy

- Add a non-destructive quarantine/status layer for card_printings before any deletion.
- Mark unsupported/unverifiable/quarantined_candidate rows invisible to public checklists only after ownership/provenance impact audit.
- Retain row IDs during quarantine so vault ownership and historical references remain stable.
- Require exact source evidence or manual proof artifact before restoring a quarantined printing.
- Use forward-only migrations only after audit approval.
