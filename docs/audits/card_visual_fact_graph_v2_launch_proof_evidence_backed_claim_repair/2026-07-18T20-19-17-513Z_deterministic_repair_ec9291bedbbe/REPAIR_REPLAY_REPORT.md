# Fact Graph V2 Evidence-Backed Claim Repair Replay

Source paid run: `docs\audits\card_visual_fact_graph_v2_launch_value_25_after_search_fallback_repair_dry_run\2026-07-18T19-37-53-735Z_dry_run_48aa5c767f3b`

## Before

- Attempted: 25
- Structurally validated: 17
- Validation failures: 8
- Needs review: 15
- Pending: 2
- Paid run cost: $0.2537088

## Offline Replay After Repair

- Replayed rows: 25
- Structurally validated: 25
- Validation failures: 0
- Previously failed rows repaired: 8/8
- Previously valid rows still valid: 17/17
- Replay status counts: {"needs_review":21,"pending":4}

## Repaired Failure Classes

- Evidence-backed object/environment/motif semantic labels can validate when the supporting evidence directly names the visible fact.
- Unsupported physical foil language is normalized out of semantic labels/search terms rather than stored as a physical-card claim.
- Circular expression evidence is stripped from non-semantic facial evidence fields; supported semantic expression facts remain allowed.
- Missing module reviews are derived conservatively as explicit `uncertain` reviews for populated modules or explicit empty reviews for empty covered modules.

## Per-Card Replay

| GV-ID | Name | Previous | Replay | Status | Findings |
|---|---|---:|---:|---|---|
| GV-PK-JPN-M5-063 | メガドリュウズex | validated | valid | needs_review |  |
| GV-PK-JPN-M5-073 | ごうかいボム | validated | valid | needs_review |  |
| GV-PK-JPN-M5-074 | リトライバッジ | validated | valid | needs_review |  |
| GV-PK-JPN-M5-075 | カスミの元気 | validated | valid | needs_review |  |
| GV-PK-JPN-M5-078 | ムク | validated | valid | needs_review |  |
| GV-PK-JPN-M5-096 | Mega Zeraora ex | validated | valid | pending |  |
| GV-PK-JPN-M5-097 | Mega Chandelure ex | validated | valid | needs_review |  |
| GV-PK-JPN-M5-099 | Mega Darkrai ex | validated | valid | needs_review |  |
| GV-PK-JPN-M5-101 | Mega Excadrill ex | validated | valid | pending |  |
| GV-PK-JPN-M5-105 | Dark Bell | validated | valid | needs_review |  |
| GV-PK-JPN-M5-106 | Tremendous Bomb | failed | valid | pending |  |
| GV-PK-JPN-M5-108 | Misty's Vitality | validated | valid | needs_review |  |
| GV-PK-JPN-M5-109 | Gladion's Final Battle | failed | valid | needs_review |  |
| GV-PK-JPN-M5-110 | Rust Syndicate Grunt | failed | valid | needs_review |  |
| GV-PK-JPN-M5-111 | Gwynn | failed | valid | needs_review |  |
| GV-PK-JPN-M5-112 | Mega Zeraora ex | failed | valid | needs_review |  |
| GV-PK-JPN-M5-113 | Mega Chandelure ex | validated | valid | needs_review |  |
| GV-PK-JPN-M5-114 | Mega Darkrai ex | failed | valid | pending |  |
| GV-PK-JPN-M5-116 | Gladion's Final Battle | validated | valid | needs_review |  |
| GV-PK-JPN-M5-117 | Gwynn | validated | valid | needs_review |  |
| GV-PK-JPN-M5-118 | Mega Darkrai ex | failed | valid | needs_review |  |
| GV-PK-JPN-PMCG6-085 | Cinnabar City Gym | validated | valid | needs_review |  |
| GV-PK-JPN-S6A-100 | Turffield Stadium | validated | valid | needs_review |  |
| GV-PK-JPN-TCGCOLLECTOR11525-019 | High Pressure System | failed | valid | needs_review |  |
| GV-PK-JPN-TCGCOLLECTOR11526-019 | Magnetic Storm | validated | valid | needs_review |  |

## Boundaries

- OpenAI calls: 0
- Database writes: 0
- Approvals: 0
- Embeddings: 0
