# CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1

## Context

`CONTROLLED_GROWTH_INGESTION_RULE_HARDENING_AUDIT_V1` proved that the largest false-promotion family in staging was not a canon gap. It was an upstream Trainer Kit deck-slot artifact lane.

Live rule gap:

- `NON_CANONICAL_FILTER_RULE_GAP = 19`
- dominant pattern = `TRAINER_KIT_DECK_SLOT_DISAMBIGUATION`
- source family = `tk-sm-l`

These rows are not real canonical cards. They are deck-composition artifacts that reuse underlying card identity without introducing a unique printed collectible identity.

## Rule Definition

The hardening rule is intentionally narrow. A staging row is reclassified as `NON_CANONICAL` only when all of the following hold:

1. `source = 'justtcg'`
2. `set_id = 'sm-trainer-kit-lycanroc-alolan-raichu-pokemon'`
3. `_grookai_ingestion_v1.candidate_set_mapping[0] = 'tk-sm-l'`
4. `candidate_bucket = 'CLEAN_CANON_CANDIDATE'`
5. `match_status = 'UNMATCHED'`
6. `_grookai_ingestion_v1.classification in ('PROMOTION_CANDIDATE', 'NEEDS_REVIEW')`
7. `_grookai_ingestion_v1.classification_reason = 'no_same_set_canonical_match_on_clean_surface'`
8. `name_raw like '%Energy (#%'`
9. `_grookai_ingestion_v1.candidate_card_print_ids` is empty

This targets the audited Trainer Kit energy-slot surface and excludes the nearby legitimate review rows that already carry partial candidate matches.

## Implementation

The worker updates staging classification metadata only:

- `_grookai_ingestion_v1.classification -> NON_CANONICAL`
- `_grookai_ingestion_v1.classification_reason -> trainer_kit_deck_slot_disambiguation`
- `_grookai_ingestion_v1.suppression_status -> SUPPRESSED_NON_CANONICAL`
- `_grookai_noncanonical_filter_v1` metadata is added for replay-safe provenance
- `classifier_version -> CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1`

No canonical table writes are allowed. Raw rows remain intact. No rows are deleted.

Because `external_discovery_candidates` does not expose a top-level `NON_CANONICAL` enum lane in `candidate_bucket` or `match_status`, the hardening result is encoded in payload classification plus explicit suppression metadata. This keeps the change bounded to staging classification while making the suppression idempotent and auditable.

## Impact

Expected bounded effect:

- `reclassified_rows = 19`
- `promotion_candidate_count_after = 12`
- `non_canonical_count_increase = 19`

This removes the dominant false-promotion family from the growth pipeline and leaves the smaller normalization, namespace, and heuristic rule gaps isolated for later hardening.

## Invariants Preserved

- canonical tables remain untouched
- no `gv_id` values change
- raw intake rows are preserved
- staging rows are updated only at classification metadata level
- the change is deterministic and idempotent on re-run

## Risks

- matching a broader Trainer Kit surface than the audited 19 rows
- suppressing legitimate review rows with real partial-candidate evidence
- introducing a hidden canonical write through an unintended code path

The worker hard-stops if the scoped target surface drifts away from the audited `19` rows or if canonical row counts change.
