# CardTrader Promo Stamped Checkpoint V1

Generated: 2026-06-08

## Scope

Audit-only English Master Index checkpoint for a scaled-back CardTrader promo/stamped finish-second-source pass.

No DB writes, migrations, cleanup, quarantine, public hiding, or apply paths were executed.

## Accepted Evidence

Five finish-second-source rows were promoted after exact independent CardTrader evidence was accepted:

| set | number | card | finish | prior status | new status | accepted source |
| --- | --- | --- | --- | --- | --- | --- |
| Majestic Dawn | 92 | Call Energy | stamped | human_source_verified | master_verified | CardTrader blueprint row |
| Celestial Storm | 127 | Copycat | stamped | human_source_verified | master_verified | CardTrader blueprint row |
| Lost Thunder | 188 | Professor Elm's Lecture | stamped | human_source_verified | master_verified | CardTrader blueprint row |
| BREAKpoint | 104 | Misty's Determination | stamped | human_source_verified | master_verified | CardTrader blueprint row |
| BREAKpoint | 110 | Reverse Valley | stamped | human_source_verified | master_verified | CardTrader blueprint row |

Accepted source URLs:

- https://www.cardtrader.com/en/cards/262486-call-energy-league-promo-reverse-holo-league-promos
- https://www.cardtrader.com/en/cards/112856-copycat-staff-regional-championships-127-168-celestial-storm-promos
- https://www.cardtrader.com/en/cards/122731-professor-elm-s-lecture-staff-regional-championships-188-214-lost-thunder-promos
- https://www.cardtrader.com/en/cards/110612-misty-s-determination-staff-regional-championships-104-122-breakpoint-promos
- https://www.cardtrader.com/en/cards/110616-reverse-valley-staff-state-championships-110-122-league-promos

## Source Adapter Change

The CardTrader finish acquisition pass now safely recognizes these labels as `stamped` candidates when exact set, card number, card name, and finish still match:

```text
player rewards
league promo
pokemon league
regional championships
staff
```

It also allows CardTrader promo-family set labels such as `<base set> Promos` and `League Promos` only for exact stamped matches. This does not promote broad marketplace rows directly; only source-delta exact matches are accepted.

## Baseline Comparison

| metric | prior baseline | new baseline |
| --- | ---: | ---: |
| master_verified_cards | 21,511 | 21,511 |
| master_verified_printings | 38,787 | 38,792 |
| human_source_verified_printings | 59 | 54 |
| evidence_rows | 232,595 | 232,600 |
| candidate_unconfirmed printings | 0 | 0 |
| conflicts | 0 | 0 |
| remaining finish_second_source_needed | 59 | 54 |
| write_ready_now | 0 | 0 |

## Guarded Promotion

Promoted staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-06-08T13-10-00-000Z-cardtrader-promo-stamped-v1
```

Guard floors used:

```text
min-master-verified-printings: 38,787
min-master-verified-cards: 21,511
min-evidence-rows: 232,595
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

After promotion, the CardTrader source delta was re-run.

Result:

```text
cardtrader_blueprint_index useful_candidate_matches: 0
cardtrader_blueprint_index remaining match: same_source_or_authority only
```

The only useful unabsorbed source lane remaining is:

```text
tcgcollector_card_variants: 1 suppressed_claim_review_evidence
```

This remains review-only and was not promoted.

## Remaining Work

Remaining active finish-second-source queue:

```text
total_rows: 54
holo: 9
normal: 6
reverse: 1
cosmos: 6
stamped: 32
```

Top remaining current-source split:

```text
thepricedex_price_list: 53
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

Current readiness snapshot:

```text
proof_ready: 8
high_confidence: 75
source_limited: 29
blocked: 124
write_ready_now: 0
```

## Verification Commands

```powershell
node --check scripts\audits\english_master_index_cardtrader_finish_acquisition_v1.mjs
node scripts\audits\english_master_index_source_delta_audit_v1.mjs --source-key cardtrader_blueprint_index --source-kind marketplace_checklist --fixture-dir docs\audits\verified_master_set_index_v1\source_fixtures\generated_cardtrader_v1
node scripts\audits\english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-06-08T13-10-00-000Z-cardtrader-promo-stamped-v1 --min-master-verified-printings 38787 --min-master-verified-cards 21511 --min-evidence-rows 232595 --max-candidate-printings 0 --max-conflicts 0 --allow-canonical-dedupe
node scripts\audits\english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-06-08T13-10-00-000Z-cardtrader-promo-stamped-v1 --min-master-verified-printings 38787 --min-master-verified-cards 21511 --min-evidence-rows 232595 --max-candidate-printings 0 --max-conflicts 0 --allow-canonical-dedupe --promote
```

## Safety Confirmation

```text
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
apply_paths_executed: false
```
