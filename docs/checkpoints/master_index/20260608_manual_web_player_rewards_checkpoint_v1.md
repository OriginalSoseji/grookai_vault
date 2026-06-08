# Manual Web Player Rewards Checkpoint V1

Generated: 2026-06-08

## Scope

Audit-only English Master Index checkpoint for a manual web-evidence pass over Player Rewards, Crosshatch, and League Promo stamped rows.

No DB writes, migrations, cleanup, quarantine, public hiding, or apply paths were executed.

## Accepted Evidence

Thirteen finish-second-source rows were promoted after exact independent evidence was accepted:

| set | number | card | finish | accepted source |
| --- | --- | --- | --- | --- |
| Noble Victories | 91 | Eviolite | stamped | Bulbapedia release info |
| Dragons Exalted | 117 | Blend Energy GrassFirePsychicDarkness | stamped | Bulbapedia release info |
| Dragons Exalted | 118 | Blend Energy WaterLightningFightingMetal | stamped | Bulbapedia release info |
| HS-Triumphant | 87 | Junk Arm | stamped | Bulbapedia release info |
| Rising Rivals | 92 | Lucian's Assignment | stamped | Pokumon Player Rewards page |
| Rising Rivals | 102 | Upper Energy | stamped | Pokumon Player Rewards page |
| HeartGold & SoulSilver | 104 | Rainbow Energy | stamped | Pokumon Player Rewards page |
| HeartGold & SoulSilver | 98 | Pokemon Communication | stamped | Pokumon Player Rewards page |
| HS-Unleashed | 83 | Super Scoop Up | stamped | Pokumon Player Rewards page |
| Platinum | 112 | PlusPower | stamped | Pokumon Player Rewards page |
| Call of Legends | 91 | Lightning Energy | stamped | Pokumon Player Rewards page |
| Plasma Freeze | 106 | Plasma Energy | stamped | Pokumon Player Rewards page |
| Dark Explorers | 94 | Enhanced Hammer | stamped | Big Orbit League Promo page |

Accepted source domains:

```text
bulbapedia.bulbagarden.net
pokumon.com
bigorbitcards.co.uk
```

## Fixture

Manual source fixture:

```text
docs/audits/verified_master_set_index_v1/source_fixtures/generated_manual_web_exact_finish_v1/player_rewards_and_league_promos_20260608.json
```

The fixture stores URLs and evidence labels only. It does not store copied page dumps.

## Baseline Comparison

| metric | prior baseline | new baseline |
| --- | ---: | ---: |
| master_verified_cards | 21,511 | 21,511 |
| master_verified_printings | 38,792 | 38,805 |
| human_source_verified_printings | 54 | 41 |
| evidence_rows | 232,600 | 232,613 |
| candidate_unconfirmed printings | 0 | 0 |
| conflicts | 0 | 0 |
| remaining finish_second_source_needed | 54 | 41 |
| write_ready_now | 0 | 0 |

## Guarded Promotion

Promoted staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-06-08T15-17-59-595Z-manual-web-player-rewards-v1
```

Guard floors used:

```text
min-master-verified-printings: 38,792
min-master-verified-cards: 21,511
min-evidence-rows: 232,600
max-candidate-printings: 0
max-conflicts: 0
allow-canonical-dedupe: true
```

Guard result:

```text
passed: true
master_verified_printing_regressions: 0
candidate_unconfirmed: 0
conflicts: 0
```

## Delta Recheck

After promotion, the manual web source delta was re-run.

Result:

```text
manual_web_exact_finish_batch_20260608 useful_candidate_matches: 0
manual_web_exact_finish_batch_20260608 already_in_current_index_master_verified: 13
```

The only useful unabsorbed source lane remaining is still:

```text
tcgcollector_card_variants: 1 suppressed_claim_review_evidence
```

This remains review-only and was not promoted.

## Remaining Work

Remaining active finish-second-source queue:

```text
total_rows: 41
holo: 9
normal: 6
reverse: 1
cosmos: 6
stamped: 19
```

Current source split:

```text
thepricedex_price_list: 40
cardtrader_blueprint_index: 1
```

## Regenerated Reports

After guarded promotion, downstream reports were regenerated:

- completion report
- publishable report
- source exhaustion report
- source attempt outcomes
- source delta summary
- action plan
- source acquisition queue
- write readiness report
- remaining finish-second-source queue

Current completion snapshot:

```text
complete_master_index_sets: 165
publishable_complete_sets: 165
master_admissible_printing_facts: 38,805
write_ready_now: 0
```

## Safety Confirmation

```text
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
apply_paths_executed: false
```
