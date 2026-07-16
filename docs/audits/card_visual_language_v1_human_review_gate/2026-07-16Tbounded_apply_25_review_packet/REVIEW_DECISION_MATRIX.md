# Visual Description Review Decision Matrix

Date: 2026-07-16

This matrix is a decision aid for the 25-row human review gate. It is read-only and does not approve, reject, or update any database row.

## Decision Rule

- `approve_later_gate`: image confirms subject/structure, no material overclaim remains, semantic tags are visual, and description is useful.
- `needs_revision`: subject is basically right but language, tags, surface claims, anatomy wording, or uncertainty need correction.
- `reject`: primary subject, subject count, card branch, or core visual identity is materially wrong.
- `leave_pending`: reviewer cannot decide from available evidence.

## Triage Summary

- Identity / Subject risk: `1`
- Surface / Material risk: `3`
- Metadata / Tags risk: `9`
- Language / Interpretation risk: `9`
- Clean candidates: `3`

## Review Order

| Priority | GV-ID | Name | Branch | Status | Risk | Review focus |
| ---: | --- | --- | --- | --- | --- | --- |
| 10 | `GV-PK-JPN-M5-072` | 古びたたての化石 | Item / Tool / Supporter | `needs_review` | Identity / Subject | Start by checking whether the described subject, count, face, anatomy, and named object match the image. |
| 14 | `GV-PK-JPN-M5-106` | Tremendous Bomb | Item / Tool / Supporter | `needs_review` | Surface / Material | Start by separating illustrated material from physical card finish. Physical foil/gloss/texture claims need visible evidence. |
| 16 | `GV-PK-JPN-M5-073` | ごうかいボム | Item / Tool / Supporter | `needs_review` | Surface / Material | Start by separating illustrated material from physical card finish. Physical foil/gloss/texture claims need visible evidence. |
| 17 | `GV-PK-JPN-M5-105` | Dark Bell | Item / Tool / Supporter | `needs_review` | Surface / Material | Start by separating illustrated material from physical card finish. Physical foil/gloss/texture claims need visible evidence. |
| 2 | `GV-PK-JPN-M5-112` | Mega Zeraora ex | Pokemon | `needs_review` | Metadata / Tags | Start by checking whether tags and attributes describe visible artwork instead of card metadata, type labels, or set/card names. |
| 4 | `GV-PK-JPN-M5-108` | Misty's Vitality | Trainer | `needs_review` | Metadata / Tags | Start by checking whether tags and attributes describe visible artwork instead of card metadata, type labels, or set/card names. |
| 6 | `GV-PK-JPN-M5-096` | Mega Zeraora ex | Pokemon | `needs_review` | Metadata / Tags | Start by checking whether tags and attributes describe visible artwork instead of card metadata, type labels, or set/card names. |
| 7 | `GV-PK-JPN-SM1PLUS-069` | Basic Grass Energy | Energy | `needs_review` | Metadata / Tags | Start by checking whether tags and attributes describe visible artwork instead of card metadata, type labels, or set/card names. |
| 8 | `GV-PK-JPN-S6A-100` | Turffield Stadium | Stadium | `needs_review` | Metadata / Tags | Start by checking whether tags and attributes describe visible artwork instead of card metadata, type labels, or set/card names. |
| 11 | `GV-PK-JPN-M5-109` | Gladion's Final Battle | Trainer | `needs_review` | Metadata / Tags | Start by checking whether tags and attributes describe visible artwork instead of card metadata, type labels, or set/card names. |
| 18 | `GV-PK-JPN-TCGCOLLECTOR11194-057` | Water Energy | Energy | `needs_review` | Metadata / Tags | Start by checking whether tags and attributes describe visible artwork instead of card metadata, type labels, or set/card names. |
| 22 | `GV-PK-JPN-SMG-039` | Dimension Valley | Stadium | `needs_review` | Metadata / Tags | Start by checking whether tags and attributes describe visible artwork instead of card metadata, type labels, or set/card names. |
| 25 | `GV-PK-JPN-TCGCOLLECTOR11541-013` | Psychic Energy | Energy | `needs_review` | Metadata / Tags | Start by checking whether tags and attributes describe visible artwork instead of card metadata, type labels, or set/card names. |
| 1 | `GV-PK-JPN-M5-118` | Mega Darkrai ex | Pokemon | `needs_review` | Language / Interpretation | Start by checking whether mood, action, personality, lore, or setting claims are visible rather than inferred. |
| 3 | `GV-PK-JPN-L1BSS-070` | Rainbow Energy | Energy | `needs_review` | Language / Interpretation | Start by checking whether mood, action, personality, lore, or setting claims are visible rather than inferred. |
| 5 | `GV-PK-JPN-M5-074` | リトライバッジ | Item / Tool / Supporter | `needs_review` | Language / Interpretation | Start by checking whether mood, action, personality, lore, or setting claims are visible rather than inferred. |
| 12 | `GV-PK-JPN-TCGCOLLECTOR11526-019` | Magnetic Storm | Stadium | `needs_review` | Language / Interpretation | Start by checking whether mood, action, personality, lore, or setting claims are visible rather than inferred. |
| 15 | `GV-PK-JPN-M5-117` | Gwynn | Trainer | `needs_review` | Language / Interpretation | Start by checking whether mood, action, personality, lore, or setting claims are visible rather than inferred. |
| 19 | `GV-PK-JPN-M5-101` | Mega Excadrill ex | Pokemon | `needs_review` | Language / Interpretation | Start by checking whether mood, action, personality, lore, or setting claims are visible rather than inferred. |
| 20 | `GV-PK-JPN-M5-116` | Gladion's Final Battle | Trainer | `needs_review` | Language / Interpretation | Start by checking whether mood, action, personality, lore, or setting claims are visible rather than inferred. |
| 21 | `GV-PK-JPN-M5-113` | Mega Chandelure ex | Pokemon | `needs_review` | Language / Interpretation | Start by checking whether mood, action, personality, lore, or setting claims are visible rather than inferred. |
| 23 | `GV-PK-JPN-M5-111` | Gwynn | Trainer | `needs_review` | Language / Interpretation | Start by checking whether mood, action, personality, lore, or setting claims are visible rather than inferred. |
| 9 | `GV-PK-JPN-PMCG6-085` | Cinnabar City Gym | Stadium | `pending` | Clean Candidate | Verify the row is genuinely safe for later approval: correct subject, useful description, visual tags, and no hidden surface claim. |
| 13 | `GV-PK-JPN-TCGCOLLECTOR11515-020` | Dark Metal Energy | Energy | `pending` | Clean Candidate | Verify the row is genuinely safe for later approval: correct subject, useful description, visual tags, and no hidden surface claim. |
| 24 | `GV-PK-JPN-TCGCOLLECTOR11525-019` | High Pressure System | Stadium | `pending` | Clean Candidate | Verify the row is genuinely safe for later approval: correct subject, useful description, visual tags, and no hidden surface claim. |

## Clean Candidate Rows

- `GV-PK-JPN-PMCG6-085` - Cinnabar City Gym - verify image, then consider `approve_later_gate`.
- `GV-PK-JPN-TCGCOLLECTOR11515-020` - Dark Metal Energy - verify image, then consider `approve_later_gate`.
- `GV-PK-JPN-TCGCOLLECTOR11525-019` - High Pressure System - verify image, then consider `approve_later_gate`.

## Dashboard

Open the local dashboard to review with images and export decisions:

```text
docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet/REVIEW_DECISION_DASHBOARD.html
```
