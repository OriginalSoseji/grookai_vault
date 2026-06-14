# English Master Index Recovery Vault-Safe Subset V1

This report splits the refreshed physical-recovery dry-run packages into a no-vault-reference subset and a vault-blocked subset.

It is audit-only: no DB writes, migrations, cleanup, quarantine, or apply execution were performed.

## Status

| Field | Value |
| --- | --- |
| split_status | vault_safe_subset_prepared_no_write |
| review_gate_status | stop_review_required_before_any_apply_design |
| apply_design_status | apply_design_blocked_stop_findings_present |
| write_ready_now | 0 |
| stop_findings | 0 |

## Summary

| Metric | Count |
| --- | ---: |
| Total packages | 18 |
| Safe packages | 15 |
| Safe card_print rows | 185 |
| Safe child printings | 275 |
| Blocked packages | 3 |
| Blocked card_print rows | 237 |
| Blocked child printings | 368 |
| Blocked vault references | 4 |

## Safe Packages

| Set | Name | Cards | Printings | Vault refs | Status |
| --- | --- | ---: | ---: | ---: | --- |
| 2021swsh | McDonald's Collection 2021 | 25 | 50 | 0 | vault_safe_future_review_candidate |
| col1 | Call of Legends | 2 | 6 | 0 | vault_safe_future_review_candidate |
| dp7 | Stormfront | 8 | 10 | 0 | vault_safe_future_review_candidate |
| ecard2 | Aquapolis | 13 | 26 | 0 | vault_safe_future_review_candidate |
| ecard3 | Skyridge | 15 | 19 | 0 | vault_safe_future_review_candidate |
| ex10 | Unseen Forces | 3 | 3 | 0 | vault_safe_future_review_candidate |
| mep | MEP Black Star Promos | 10 | 10 | 0 | vault_safe_future_review_candidate |
| pl1 | Platinum | 9 | 10 | 0 | vault_safe_future_review_candidate |
| pl2 | Rising Rivals | 17 | 24 | 0 | vault_safe_future_review_candidate |
| pl3 | Supreme Victors | 9 | 9 | 0 | vault_safe_future_review_candidate |
| pl4 | Arceus | 18 | 23 | 0 | vault_safe_future_review_candidate |
| sv08.5 | Prismatic Evolutions | 20 | 40 | 0 | vault_safe_future_review_candidate |
| swsh10.5 | Pokémon GO | 33 | 39 | 0 | vault_safe_future_review_candidate |
| swsh2 | Rebel Clash | 1 | 2 | 0 | vault_safe_future_review_candidate |
| swsh4.5 | Shining Fates | 2 | 4 | 0 | vault_safe_future_review_candidate |

## Vault-Blocked Packages

| Set | Name | Cards | Printings | Vault refs | Status |
| --- | --- | ---: | ---: | ---: | --- |
| me01 | Mega Evolution | 77 | 151 | 2 | blocked_vault_references_require_ownership_review |
| sv04.5 | Paldean Fates | 108 | 148 | 1 | blocked_vault_references_require_ownership_review |
| sv06.5 | Shrouded Fable | 52 | 69 | 1 | blocked_vault_references_require_ownership_review |

## Stop Findings

None.

