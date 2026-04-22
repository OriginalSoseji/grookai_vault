# stamped_manual_review_misc_expansion_name_stamp_overlays_ready_batch_v1

## Context
- Workflow: `STAMPED_MANUAL_REVIEW_MISC_EXPANSION_NAME_STAMP_OVERLAYS_READY_BATCH_V1`
- Governing rule: `EXPANSION_NAME_STAMP_OVERLAY_IDENTITY_RULE_V1`
- Scope boundary preserved: exact `28` READY rows from `MISC_EXPANSION_NAME_STAMP_OVERLAYS`
- Explicit exclusion preserved: `Larvitar (Delta Species Stamp) 73/113` remained outside the batch because current evidence still does not prove `Larvitar` == `Larvitar δ`
- No widening into the remaining manual-review backlog, the 3 event/prerelease overlay rows, the 2 Prize Pack series-marker rows, prior stamped-ready batches, pricing, JPN, or printing-layer work

## Batch Identity
- Source family: `miscellaneous-cards-products-pokemon`
- Batch size attempted: `28`
- Batch size completed: `28`
- Pre-intake live audit: `28 READY_TO_BRIDGE`, `0 ALREADY_IN_WAREHOUSE`, `0 ALREADY_PROMOTED`, `0 CONFLICT_REVIEW_REQUIRED`
- Effective routed set coverage:
  - `me01` x2
  - `me02` x1
  - `sv01` x1
  - `sv02` x1
  - `sv03` x1
  - `sv04` x1
  - `sv05` x1
  - `sv06` x4
  - `sv07` x4
  - `sv10` x2
  - `sv10.5b` x2
  - `sv10.5w` x2
  - `sv6pt5` x1
  - `sv8pt5` x4
  - `swsh9` x1
- Stamp-label coverage:
  - `Black Bolt Stamp` x2
  - `Brilliant Stars Stamp` x1
  - `Destined Rivals Stamp` x2
  - `Mega Evolution Stamp` x2
  - `Obsidian Flames Stamp` x1
  - `Paldea Evolved Stamp` x1
  - `Paradox Rift Stamp` x1
  - `Phantasmal Flames Stamp` x1
  - `Prismatic Evolution Stamp` x1
  - `Prismatic Evolutions Stamp` x3
  - `Scarlet & Violet Stamp` x1
  - `Shrouded Fable Stamp` x1
  - `Stellar Crown Stamp` x4
  - `Temporal Forces Stamp` x1
  - `Twilight Masquerade Stamp` x4
  - `White Flare Stamp` x2

## Warehouse Outcome
- Bridged: `28`
- Classified: `28`
- Staged: `28`
- Approved: `28`
- Dry-run clean: `28/28`
- Promoted: `28`
- Failure classes: none

## Review Notes
- All `28/28` candidates reached `REVIEW_READY` with `proposed_action_type = CREATE_CARD_PRINT`
- All `28/28` preserved:
  - base printed identity
  - deterministic non-null overlay `variant_key`
  - correct routed expansion/base set
  - no hidden dependence on unsupported name equivalence
- Founder approval was applied explicitly by founder user `03e80d15-a2bb-4d3c-abd1-2de03e55787b`

## Canon Outcome
- `28` new canonical `card_prints` were created
- Candidate states: `PROMOTED = 28`
- Staging states: `SUCCEEDED = 28`
- Promotion result types: `CARD_PRINT_CREATED = 28`
- Null/blank stamped `variant_key`: `0`
- Promoted rows with matching sibling base row still present: `28/28`
- No base-row mutation detected
- No identity collapse detected

## Mapping Closure
- Worker surface: `backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs --input-json docs/checkpoints/warehouse/stamped_manual_review_misc_expansion_name_stamp_overlays_ready_batch_v1.json`
- Bounded input repair: batch rows were flattened with top-level `source_candidate_id` and `effective_set_code` so the mapping worker could consume the exact promoted batch without widening scope
- Dry run: `would_upsert = 28`, `conflicts = 0`
- Apply: `upserted = 28`
- Verification:
  - mapped promoted rows: `28`
  - duplicate active external ids: `0`
  - rows with multiple active mappings: `0`

## Image Closure
- Worker surface: `backend/images/source_image_enrichment_worker_v1.mjs --input-json docs/checkpoints/warehouse/stamped_manual_review_misc_expansion_name_stamp_overlays_ready_batch_v1.json`
- Host note: this machine required `NODE_TLS_REJECT_UNAUTHORIZED=0` for bounded TCGdex fetches
- Bounded runtime repairs applied:
  - input-json mode now tolerates `404` TCGdex set fetches and continues with deterministic sibling-base fallback
  - sibling-base lookup now normalizes leading-zero `number_plain` values before matching
- Missing TCGdex routed sets observed during closure:
  - `sv8pt5`
  - `sv6pt5`
- Dry run after repair:
  - `representative_shared_stamp = 28`
  - `missing = 0`
  - `ambiguous = 0`
- Apply:
  - `updated = 28`
- Verification:
  - exact `image_url` rows: `0`
  - `representative_image_url` rows: `28`
  - `image_status = representative_shared_stamp`: `28`
  - `missing`: `0`
- Truth boundary preserved: no representative image was written into `image_url`

## Cluster Exhaustion
- Current cluster: `MISC_EXPANSION_NAME_STAMP_OVERLAYS`
- Remaining READY rows in this cluster after batch: `0`
- Remaining manual holdouts in this cluster: `1`
- Known holdout: `Larvitar (Delta Species Stamp) 73/113`
- Regressed rows: `0`

## Representative Promoted Examples
- Team Rocket's Zapdos | `070/182` | `destined_rivals_stamp` | Destined Rivals Stamp | `sv10` | mapped | `representative_shared_stamp`
- Team Rocket's Articuno | `051/182` | `destined_rivals_stamp` | Destined Rivals Stamp | `sv10` | mapped | `representative_shared_stamp`
- Mewtwo | `056/172` | `brilliant_stars_stamp` | Brilliant Stars Stamp | `swsh9` | mapped | `representative_shared_stamp`
- Xerneas | `064/132` | `mega_evolution_stamp` | Mega Evolution Stamp | `me01` | mapped | `representative_shared_stamp`
- Reshiram | `017/094` | `phantasmal_flames_stamp` | Phantasmal Flames Stamp | `me02` | mapped | `representative_shared_stamp`
- Umbreon | `130/197` | `obsidian_flames_stamp` | Obsidian Flames Stamp | `sv03` | mapped | `representative_shared_stamp`
- Lucario | `114/198` | `scarlet_and_violet_stamp` | Scarlet & Violet Stamp | `sv01` | mapped | `representative_shared_stamp`
- Blissey ex | `134/167` | `twilight_masquerade_stamp` | Twilight Masquerade Stamp | `sv06` | mapped | `representative_shared_stamp`
- Greninja ex | `041/142` | `stellar_crown_stamp` | Stellar Crown Stamp | `sv07` | mapped | `representative_shared_stamp`
- Victini | `012/086` | `black_bolt_stamp` | Black Bolt Stamp | `sv10.5b` | mapped | `representative_shared_stamp`

## Recommended Next Step
- Chosen next step: `STAMPED_MANUAL_REVIEW_EVENT_AND_PRERELEASE_BASE_ROUTE_OVERLAYS_READY_BATCH_V1`
- Reason: it is the next deterministic manual-review batch already unlocked under an authored rule, while the Prize Pack evidence wall remains a much larger deferred strategy pass
