# CHECKPOINT - Stamped Manual Review Clusters V1

## Context

- Source artifact: `docs/checkpoints/warehouse/stamped_identity_rule_apply_v1.json`
- Manual-review input rows: `745`
- Output JSON: `docs/checkpoints/warehouse/stamped_manual_review_clusters_v1.json`
- Output MD: `docs/checkpoints/warehouse/stamped_manual_review_clusters_v1.md`

## Cluster Summary

| Cluster | Disposition | Rule | Rows | Ready | Still Manual | Rejected |
|---|---|---|---:|---:|---:|---:|
| Prize Pack Family-Only Rows | `NEEDS_EXTERNAL_EVIDENCE` | - | 670 | 0 | 670 | 0 |
| Prize Pack Series Marker Rows | `EXTENSION_OF_EXISTING_RULE` | `PRIZE_PACK_SERIES_MARKER_IDENTITY_RULE_V1` | 2 | 2 | 0 | 0 |
| Expansion-Name Stamp Overlays | `NEW_IDENTITY_RULE` | `EXPANSION_NAME_STAMP_OVERLAY_IDENTITY_RULE_V1` | 29 | 28 | 1 | 0 |
| Event And Prerelease Base-Route Overlays | `EXTENSION_OF_EXISTING_RULE` | `EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1` | 3 | 3 | 0 | 0 |
| Battle Academy Overlay Rows | `NOT_CANON` | `BATTLE_ACADEMY_CANON_CONTRACT_V1` | 26 | 0 | 0 | 26 |
| Mega Evolution Promo Staff/Prerelease Rows | `NEEDS_EXTERNAL_EVIDENCE` | - | 12 | 0 | 12 | 0 |
| Professor Program Family-Hint Rows | `NEEDS_EXTERNAL_EVIDENCE` | - | 3 | 0 | 3 | 0 |

## Rebucket Result

- `READY_FOR_WAREHOUSE = 33`
- `STILL_MANUAL = 686`
- `REJECTED = 26`

## Rule Outcomes

### Prize Pack Family-Only Rows

- Disposition: `NEEDS_EXTERNAL_EVIDENCE`
- Rule: none; evidence still missing
- Summary: Source family alone is not enough to create stamped identity. Rows still need explicit printed series or stamp evidence before lawful canon routing.
- Representative blocked examples:
  - Charizard VMAX | 020/189 | no stamp label | Prize Pack family rows still lack an explicit printed series or stamp phrase.
  - Gengar VMAX | 157/264 | no stamp label | Prize Pack family rows still lack an explicit printed series or stamp phrase.
  - Charizard VSTAR | 018/172 | no stamp label | Prize Pack family rows still lack an explicit printed series or stamp phrase.

### Prize Pack Series Marker Rows

- Disposition: `EXTENSION_OF_EXISTING_RULE`
- Rule: `PRIZE_PACK_SERIES_MARKER_IDENTITY_RULE_V1`
- Summary: Explicit "Prize Pack Series N" markers are identity-bearing and can route to a unique underlying base row by stripped name plus printed number and total.
- Representative ready examples:
  - Charizard V (Prize Pack Series 1) | 019/189 | Prize Pack Series 1 Stamp | swsh3 (Darkness Ablaze)
  - Charizard V (Prize Pack Series 2) | 017/172 | Prize Pack Series 2 Stamp | swsh9 (Brilliant Stars)

### Expansion-Name Stamp Overlays

- Disposition: `NEW_IDENTITY_RULE`
- Rule: `EXPANSION_NAME_STAMP_OVERLAY_IDENTITY_RULE_V1`
- Summary: Explicit expansion-name stamp phrases route through the named expansion first, then resolve the unique base card by stripped name plus printed number and total.
- Representative ready examples:
  - Team Rocket's Zapdos (Destined Rivals Stamp) | 070/182 | Destined Rivals Stamp | sv10 (Destined Rivals)
  - Mewtwo - 056/172 (Brilliant Stars Stamped) | 056/172 | Brilliant Stars Stamp | swsh9 (Brilliant Stars)
  - Team Rocket's Articuno (Destined Rivals Stamp) | 051/182 | Destined Rivals Stamp | sv10 (Destined Rivals)
  - Yveltal (Mega Evolution Stamped) | 088/132 | Mega Evolution Stamp | me01 (Mega Evolution)
  - Umbreon (Obsidian Flames Stamped) | 130/197 | Obsidian Flames Stamp | sv03 (Obsidian Flames)
- Representative blocked examples:
  - Larvitar (Delta Species Stamp) | 73/113 | Delta Species Stamp | Expansion-name stamp did not resolve to exactly one matching base row after normalized number and printed-total routing.

### Event And Prerelease Base-Route Overlays

- Disposition: `EXTENSION_OF_EXISTING_RULE`
- Rule: `EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1`
- Summary: Explicit event or prerelease overlays can reuse the existing stamped rule when the underlying base row is globally unique by stripped name plus printed number and total.
- Representative ready examples:
  - Sawsbuck - 16/236 (Prerelease Kit Exclusive) | 016/236 | Prerelease Stamp | sm12 (Cosmic Eclipse)
  - Shellos West Sea (SDCC 2007 Staff) | 107/132 | SDCC 2007 Staff Stamp | dp3 (Secret Wonders)
  - Aerodactyl (01/62) (Prerelease) | 01/62 | Prerelease Stamp | base3 (Fossil)

### Battle Academy Overlay Rows

- Disposition: `NOT_CANON`
- Rule: `BATTLE_ACADEMY_CANON_CONTRACT_V1`
- Summary: These rows belong to the Battle Academy curated-product overlay domain and must not be forced through the stamped backlog.
- Representative blocked examples:
  - Pokemon Catcher - 175/202 (#49 Cinderace Stamped) | 175/202 | Cinderace Stamp | Battle Academy rows are governed by the separate Battle Academy canon contract.
  - Victini - 007/073 (#53 Cinderace Stamped) | 007/073 | Cinderace Stamp | Battle Academy rows are governed by the separate Battle Academy canon contract.
  - Victini - 007/073 (#4 Cinderace Stamped) | 007/073 | Cinderace Stamp | Battle Academy rows are governed by the separate Battle Academy canon contract.

### Mega Evolution Promo Staff/Prerelease Rows

- Disposition: `NEEDS_EXTERNAL_EVIDENCE`
- Rule: none; evidence still missing
- Summary: The current backlog proves stamped modifiers exist, but it does not yet prove whether the underlying identity space is a promo family or routed expansion base row.
- Representative blocked examples:
  - Zacian (Prerelease) [Staff] | 015 | Staff Prerelease Stamp | Mega Evolution promo rows still need authoritative proof for promo-family identity space versus routed base-set reuse.
  - Ceruledge (Prerelease) [Staff] | 014 | Staff Prerelease Stamp | Mega Evolution promo rows still need authoritative proof for promo-family identity space versus routed base-set reuse.
  - Tyrantrum - 066 [Staff] | 066 | Staff Stamp | Mega Evolution promo rows still need authoritative proof for promo-family identity space versus routed base-set reuse.

### Professor Program Family-Hint Rows

- Disposition: `NEEDS_EXTERNAL_EVIDENCE`
- Rule: none; evidence still missing
- Summary: Professor Program source-family hints do not capture enough printed evidence to create stamped identity without a stronger external proof surface.
- Representative blocked examples:
  - Voltorb - 066/193 | 066/193 | no stamp label | Professor Program family hints do not include enough printed modifier evidence to define stamped identity.
  - Voltorb - 100/165 | 100/165 | no stamp label | Professor Program family hints do not include enough printed modifier evidence to define stamped identity.
  - Friends in Paldea - 109/131 | 109/131 | no stamp label | Professor Program family hints do not include enough printed modifier evidence to define stamped identity.

## Next Executable Batches

- `STAMPED_MANUAL_REVIEW_MISC_EXPANSION_NAME_STAMP_OVERLAYS_READY_BATCH_V1` - 28 rows - EXPANSION_NAME_STAMP_OVERLAY_IDENTITY_RULE_V1
- `STAMPED_MANUAL_REVIEW_EVENT_AND_PRERELEASE_BASE_ROUTE_OVERLAYS_READY_BATCH_V1` - 3 rows - EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1
- `STAMPED_MANUAL_REVIEW_PRIZE_PACK_SERIES_MARKER_READY_BATCH_V1` - 2 rows - PRIZE_PACK_SERIES_MARKER_IDENTITY_RULE_V1
