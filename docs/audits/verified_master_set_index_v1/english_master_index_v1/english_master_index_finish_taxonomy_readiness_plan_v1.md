# English Master Index Finish Taxonomy Readiness Plan V1

Audit-only plan for blocked Master Index finish labels that are not active child `finish_keys`.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- apply_paths_executed: false
- write_ready_now: 0

## Summary

| finish_key | strategy | decomposed_finish | global_non_present | current_bucket | readiness |
| --- | --- | --- | --- | --- | --- |
| first_edition_holo | canonical_finish_strategy | holo | 180 | 0 | not_child_insert_ready |
| first_edition_normal | canonical_finish_strategy | normal | 762 | 0 | not_child_insert_ready |
| stamped | blocked_evidence_required_strategy | none | 1370 | 0 | blocked_evidence_required |

## Decision

- `first_edition_holo` is not a finish key. It decomposes into canonical first-edition identity plus child `holo` only under that first-edition parent.
- `first_edition_normal` is not a finish key. It decomposes into canonical first-edition identity plus child `normal` only under that first-edition parent.
- `stamped` is not a finish key and is not specific enough to apply. It needs exact stamp identity evidence and a deterministic stamped canonical row strategy.

## Strategy Details

### first_edition_holo

- requested_strategy_bucket: canonical_finish_strategy
- final_identity_strategy: canonical_version_required_then_child_holo
- canonical_finish_key_after_decomposition: holo
- apply_readiness: not_child_insert_ready
- allowed_future_write_class: parent canonical version resolution first; child holo insert only under the first-edition parent after separate dry-run and approval
- forbidden_write_class: do not add finish_key first_edition_holo; do not insert holo under the unlimited/base parent as a proxy for first edition
- display_modifier_strategy: Display "1st Edition" from canonical version or edition metadata; do not display it as a finish.
- blocked_evidence_required_strategy: Blocked from child-only insert until the target first-edition canonical parent exists or is created through a separate canonical-version package.

Contract basis:
- VERSION_VS_FINISH_CONTRACT_V1: edition differences are version differences and must never be treated as finishes.
- CHILD_PRINTING_CONTRACT_V1: 1st Edition is already canonical / must not be reintroduced as child.

### first_edition_normal

- requested_strategy_bucket: canonical_finish_strategy
- final_identity_strategy: canonical_version_required_then_child_normal
- canonical_finish_key_after_decomposition: normal
- apply_readiness: not_child_insert_ready
- allowed_future_write_class: parent canonical version resolution first; child normal insert only under the first-edition parent after separate dry-run and approval
- forbidden_write_class: do not add finish_key first_edition_normal; do not insert normal under the unlimited/base parent as a proxy for first edition
- display_modifier_strategy: Display "1st Edition" from canonical version or edition metadata; do not display it as a finish.
- blocked_evidence_required_strategy: Blocked from child-only insert until the target first-edition canonical parent exists or is created through a separate canonical-version package.

Contract basis:
- VERSION_VS_FINISH_CONTRACT_V1: edition differences are version differences and must never be treated as finishes.
- CHILD_PRINTING_CONTRACT_V1: 1st Edition is already canonical / must not be reintroduced as child.

### stamped

- requested_strategy_bucket: blocked_evidence_required_strategy
- final_identity_strategy: exact_stamp_identity_required
- canonical_finish_key_after_decomposition: none
- apply_readiness: blocked_evidence_required
- allowed_future_write_class: separate stamped canonical identity package only after exact stamp evidence and base-route proof
- forbidden_write_class: do not add finish_key stamped; do not create a generic stamped child printing; do not collapse stamped rows into base canon
- display_modifier_strategy: Display the exact stamp label only after canonical stamped identity is resolved; generic "stamped" is not display-ready truth.
- blocked_evidence_required_strategy: Blocked until each row has exact stamp phrase, underlying base route, deterministic variant_key, and evidence proving the stamped printed identity.

Contract basis:
- VERSION_VS_FINISH_CONTRACT_V1: stamps are version differences and must never be treated as finishes.
- CHILD_PRINTING_CONTRACT_V1: stamped promos are canon-sensitive / provisional and require explicit review.
- STAMPED_IDENTITY_RULE_V1: lawful stamped identities need a known base plus deterministic stamped modifier.

## Current Bucket Set Counts

| set | rows |
| --- | --- |

## Next Safe Work

- Remove first_edition_holo, first_edition_normal, and stamped from child-only insert packages.
- Build a canonical-version readiness plan for first-edition parent resolution before any first-edition child finish inserts.
- Build a stamped identity evidence queue that captures exact stamp label, underlying base route, deterministic variant_key, and source URLs.
- Build the next active-finish child insert package by skipping inactive taxonomy keys and using only active finish_keys.

## Stop Rules

- Do not add first_edition_holo, first_edition_normal, or stamped to public.finish_keys from this report.
- Do not insert these labels into card_printings as child finishes.
- Do not use generic stamped evidence as canonical stamped identity.
- Do not create parent canonical version rows from this report.
- Do not execute apply, cleanup, quarantine, deletes, merges, or migrations from this report.
