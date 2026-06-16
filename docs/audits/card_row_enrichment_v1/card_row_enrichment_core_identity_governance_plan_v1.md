# Card Row Enrichment Core Identity Governance Plan V1

Read-only governance plan for the remaining core identity blockers.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- This report is not apply authority.

## Summary

- Total core identity gap rows: 332
- Pocket/domain rows: 203
- Proposed identity collision rows: 125
- Subset alias rows: 4
- Write-ready rows now: 0

## Pocket Domain Governance

| set_code | set_name | rows |
| --- | --- | --- |
| A3a | Extradimensional Crisis | 103 |
| P-A | Promos-A | 100 |

Decision: keep these out of English physical enrichment until Pocket/non-physical governance exists.

## Collision Buckets

| bucket | rows |
| --- | --- |
| promo_prefix_duplicate_name_normalization | 58 |
| same_name_same_number_duplicate_collision | 22 |
| radiant_collection_prefix_identity_governance | 20 |
| platinum_owner_shorthand_alias_collision | 19 |
| number_suffix_variant_collision | 3 |
| platinum_g_suffix_name_alias_collision | 2 |
| manual_collision_adjudication_required | 1 |

## Collision Rows By Set

| set_code | set_name | rows |
| --- | --- | --- |
| xyp | XY Black Star Promos | 61 |
| bw11 | Legendary Treasures | 20 |
| pl2 | Rising Rivals | 20 |
| xy4 | Phantom Forces | 16 |
| col1 | Call of Legends | 3 |
| bw9 | Plasma Freeze | 2 |
| pl4 | Arceus | 2 |
| xy9 | BREAKpoint | 1 |

## Subset Alias Rows

| set_code | card_name | external_ids | proposed_number |
| --- | --- | --- | --- |
| cel25 | Claydol | {"tcgdex":"cel25-15A4"} | 15A4 |
| cel25 | Here Comes Team Rocket! | {"tcgdex":"cel25-15A2"} | 15A2 |
| cel25 | Rocket's Zapdos | {"tcgdex":"cel25-15A3"} | 15A3 |
| cel25 | Venusaur | {"tcgdex":"cel25-15A1"} | 15A1 |

## Recommended Package Order

| package | mode | rows | writes_ready_now | reason |
| --- | --- | --- | --- | --- |
| ENRICH-13B-POCKET-DOMAIN-EXCLUSION-PLAN | governance_only_first | 203 | false | These rows are not safe to mutate as English physical enrichment. |
| ENRICH-13C-RADIANT-COLLECTION-PREFIX-GOVERNANCE | design_then_dry_run | 20 | false | RC-prefixed numbers collide with main-set numeric rows unless prefix identity is governed. |
| ENRICH-13D-PROMO-PREFIX-DUPLICATE-ADJUDICATION | design_then_dry_run | 58 | false | Promo rows appear to be duplicate/name-normalization collisions and require dependency-aware adjudication. |
| ENRICH-13E-NAME-ALIAS-COLLISION-ADJUDICATION | design_then_dry_run | 43 | false | Rows are blocked by name-style differences or same-name duplicates; dependency transfer/delete must be proven separately. |
| ENRICH-13F-SUFFIX-VARIANT-COLLISION-ADJUDICATION | design_then_dry_run | 3 | false | Suffix variants need explicit identity modifier/parent split rules. |

## Conclusion

No core identity write is ready. The next safe move is bucket-specific governance, starting with Pocket exclusion and RC/subset prefix policy.

Fingerprint: `58c1bb3c132c917acfaf905f697e9a2d1e4d05447ed06f9fecdc28998ee548e4`
