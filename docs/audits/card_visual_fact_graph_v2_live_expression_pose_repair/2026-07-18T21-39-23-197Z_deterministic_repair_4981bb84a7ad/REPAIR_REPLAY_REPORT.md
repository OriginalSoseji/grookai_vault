# Fact Graph V2 Live Expression/Pose Repair Replay

Source paid run: `docs/audits/card_visual_fact_graph_v2_evidence_backed_claim_repair_live_25_dry_run/2026-07-18T21-10-40-349Z_dry_run_1975a670b3f2`

## Before

- Attempted: 25
- Structurally validated: 22
- Validation failures: 3
- Needs review: 20
- Pending: 2
- Paid run cost: $0.2430256

## Offline Replay After Repair

- Replayed rows: 25
- Structurally validated: 25
- Validation failures: 0
- Previously failed rows repaired: 3/3
- Previously valid rows still valid: 22/22
- Replay status counts: {"needs_review":20,"pending":5}

## Repaired Failure Classes

- `face side profile visible` is evidence-only facial-position data and is dropped from semantic visual facts.
- `upright` validates as a state/action label only with visible pose or body-position evidence.
- `smirking` validates as an expression only with mouth evidence and is removed when unsupported.

## Per-Card Replay

| GV-ID | Name | Previous | Replay | Status | Findings |
|---|---|---:|---:|---|---|
| GV-PK-JPN-M5-063 | メガドリュウズex | validated | valid | needs_review |  |
| GV-PK-JPN-M5-073 | ごうかいボム | validated | valid | needs_review |  |
| GV-PK-JPN-M5-074 | リトライバッジ | validated | valid | needs_review |  |
| GV-PK-JPN-M5-075 | カスミの元気 | validated | valid | needs_review |  |
| GV-PK-JPN-M5-078 | ムク | validated | valid | needs_review |  |
| GV-PK-JPN-M5-096 | Mega Zeraora ex | failed | valid | pending |  |
| GV-PK-JPN-M5-097 | Mega Chandelure ex | validated | valid | needs_review |  |
| GV-PK-JPN-M5-099 | Mega Darkrai ex | validated | valid | needs_review |  |
| GV-PK-JPN-M5-101 | Mega Excadrill ex | failed | valid | pending |  |
| GV-PK-JPN-M5-105 | Dark Bell | validated | valid | needs_review |  |
| GV-PK-JPN-M5-106 | Tremendous Bomb | validated | valid | needs_review |  |
| GV-PK-JPN-M5-108 | Misty's Vitality | validated | valid | needs_review |  |
| GV-PK-JPN-M5-109 | Gladion's Final Battle | validated | valid | pending |  |
| GV-PK-JPN-M5-110 | Rust Syndicate Grunt | failed | valid | pending |  |
| GV-PK-JPN-M5-111 | Gwynn | validated | valid | needs_review |  |
| GV-PK-JPN-M5-112 | Mega Zeraora ex | validated | valid | needs_review |  |
| GV-PK-JPN-M5-113 | Mega Chandelure ex | validated | valid | needs_review |  |
| GV-PK-JPN-M5-114 | Mega Darkrai ex | validated | valid | pending |  |
| GV-PK-JPN-M5-116 | Gladion's Final Battle | validated | valid | needs_review |  |
| GV-PK-JPN-M5-117 | Gwynn | validated | valid | needs_review |  |
| GV-PK-JPN-M5-118 | Mega Darkrai ex | validated | valid | needs_review |  |
| GV-PK-JPN-PMCG6-085 | Cinnabar City Gym | validated | valid | needs_review |  |
| GV-PK-JPN-S6A-100 | Turffield Stadium | validated | valid | needs_review |  |
| GV-PK-JPN-TCGCOLLECTOR11525-019 | High Pressure System | validated | valid | needs_review |  |
| GV-PK-JPN-TCGCOLLECTOR11526-019 | Magnetic Storm | validated | valid | needs_review |  |

## Boundaries

- OpenAI calls: 0
- Database writes: 0
- Approvals: 0
- Embeddings: 0
