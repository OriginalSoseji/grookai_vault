# PokemonTCG Live + Snapshot Union Checkpoint V1

Generated: 2026-05-26

## Scope

Audit only. No DB writes, migrations, cleanup, quarantine, apply runners, or canonical mutations were performed.

This checkpoint records the Master Index builder hardening that makes PokemonTCG.io and TCGplayer source evidence additive across live API runs and cached snapshot fallback.

## Invariant

PokemonTCG live evidence may add rows, but live availability must not delete or hide cached snapshot evidence.

## Builder Change

- Live set configs are enriched with PokemonTCG snapshot aliases when a snapshot is available.
- Snapshot evidence rows are resolved through the canonical set alias index before dedupe.
- Snapshot rows can survive live alias differences such as `sv1` versus `sv01`.
- Snapshot-backed availability rows are recorded under canonical set keys.
- Snapshot rows are merged before the main evidence canonicalization pass.

## Final Audit Numbers

Source reports:

- Master Index report: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_v1.json`
- Completion report: `docs/audits/english_master_index_completion_v1/english_master_index_completion_v1.json`
- Write readiness report: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_write_readiness_v1.json`
- Source exhaustion report: `docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json`

Final counts:

| Metric | Value |
| --- | ---: |
| master_verified card facts | 21,549 |
| api_agreed card facts | 9 |
| candidate_unconfirmed card facts | 28 |
| human_source_verified card facts | 2 |
| master_verified printing facts | 37,818 |
| human_source_verified printing facts | 929 |
| candidate_unconfirmed printing facts | 114 |
| complete publishable sets | 71 |
| incomplete sets | 132 |
| remaining gap facts | 2,700 |
| write_ready_now | 0 |

## Alias Normalization

| Metric | Value |
| --- | ---: |
| evidence rows examined | 232,190 |
| evidence rows after dedupe | 231,491 |
| evidence rows remapped | 5,685 |
| duplicate rows collapsed | 699 |
| unresolved evidence rows | 0 |
| ambiguous aliases | 0 |
| source availability rows remapped | 0 |

## PokemonTCG Snapshot Evidence

Snapshot-backed source availability survived under canonical set keys.

Observed cached snapshot lanes included:

| Set | Source | Rows |
| --- | --- | ---: |
| bw10 Plasma Blast | pokemontcg_api | 295 |
| bw10 Plasma Blast | tcgplayer_price_guide | 74 |
| xy6 Roaring Skies | pokemontcg_api | 308 |
| xy6 Roaring Skies | tcgplayer_price_guide | 76 |
| det1 Detective Pikachu | pokemontcg_api | 36 |
| sm10 Unbroken Bonds | pokemontcg_api | 648 |
| sm10 Unbroken Bonds | tcgplayer_price_guide | 154 |
| sm11 Unified Minds | pokemontcg_api | 715 |
| sm11 Unified Minds | tcgplayer_price_guide | 175 |
| swsh5 Battle Styles | pokemontcg_api | 489 |
| swsh5 Battle Styles | tcgplayer_price_guide | 306 |
| swsh10 Astral Radiance | pokemontcg_api | 560 |
| swsh10 Astral Radiance | tcgplayer_price_guide | 344 |

## Non-Degradation Result

The rebuild was accepted as non-degraded because:

- `master_verified printing facts` remained at the last healthy baseline: 37,818.
- Alias normalization had 0 unresolved evidence rows.
- Alias normalization had 0 ambiguous aliases.
- Cached PokemonTCG/Tcgplayer snapshot evidence appeared in source availability under canonical set keys.
- `write_ready_now` stayed 0.
- No migration files changed.

## Remaining Gaps

| Gap Type | Rows |
| --- | ---: |
| card_identity_second_source_needed | 30 |
| finish_human_checklist_evidence_needed | 114 |
| finish_second_source_needed | 929 |
| suppressed_structured_claim_reviewed | 1,627 |

## Write Readiness

The Master Index is still not ready for DB writes.

Reason:

Finish truth still requires human-readable/checklist evidence and master_verified promotion.

## Verification

Commands run:

```powershell
node --check scripts\audits\verified_master_set_index_v1_build_english_master_index.mjs
node scripts\audits\verified_master_set_index_v1_build_english_master_index.mjs --sources tcgdex,pokemontcg_api,thepricedex,pkmncards,bulbapedia --dry-run
node scripts\audits\verified_master_set_index_v1_build_english_master_index.mjs --sources tcgdex,pokemontcg_api,thepricedex,pkmncards,bulbapedia
node scripts\audits\english_master_index_source_exhaustion_v1_build.mjs
node scripts\audits\english_master_index_completion_v1_build.mjs
node scripts\audits\english_master_index_publishable_v1_build.mjs
node scripts\audits\verified_master_set_index_v1_build_action_plan.mjs
node scripts\audits\verified_master_set_index_v1_build_source_acquisition.mjs
node scripts\audits\verified_master_set_index_v1_build_write_readiness_plan.mjs
node scripts\audits\english_master_index_source_attempt_outcomes_v1_build.mjs
```

Final verification commands are tracked separately in the active Codex run.
