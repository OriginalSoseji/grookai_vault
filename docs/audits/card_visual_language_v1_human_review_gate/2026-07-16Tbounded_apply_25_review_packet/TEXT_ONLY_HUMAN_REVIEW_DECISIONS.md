# Text-Only Human Review Decisions

Date: 2026-07-16

These are human review decisions based on descriptions, semantic tags, quality flags, and policy results only. They are not database approvals because image review was not confirmed in this step.

## Boundary

- no database writes
- no approved rows applied
- no embeddings
- no app-facing reads
- image review not confirmed

## Summary

- Approve later gate: `4`
- Needs revision: `21`
- Reject: `0`
- Leave pending: `0`

## Approve Later Gate

- 9. `GV-PK-JPN-PMCG6-085` - Cinnabar City Gym - current DB status `pending`
- 12. `GV-PK-JPN-TCGCOLLECTOR11526-019` - Magnetic Storm - current DB status `needs_review`
- 13. `GV-PK-JPN-TCGCOLLECTOR11515-020` - Dark Metal Energy - current DB status `pending`
- 24. `GV-PK-JPN-TCGCOLLECTOR11525-019` - High Pressure System - current DB status `pending`

## Needs Revision

- 1. `GV-PK-JPN-M5-118` - Mega Darkrai ex - current DB status `needs_review`
- 2. `GV-PK-JPN-M5-112` - Mega Zeraora ex - current DB status `needs_review`
- 3. `GV-PK-JPN-L1BSS-070` - Rainbow Energy - current DB status `needs_review`
- 4. `GV-PK-JPN-M5-108` - Misty's Vitality - current DB status `needs_review`
- 5. `GV-PK-JPN-M5-074` - リトライバッジ - current DB status `needs_review`
- 6. `GV-PK-JPN-M5-096` - Mega Zeraora ex - current DB status `needs_review`
- 7. `GV-PK-JPN-SM1PLUS-069` - Basic Grass Energy - current DB status `needs_review`
- 8. `GV-PK-JPN-S6A-100` - Turffield Stadium - current DB status `needs_review`
- 10. `GV-PK-JPN-M5-072` - 古びたたての化石 - current DB status `needs_review`
- 11. `GV-PK-JPN-M5-109` - Gladion's Final Battle - current DB status `needs_review`
- 14. `GV-PK-JPN-M5-106` - Tremendous Bomb - current DB status `needs_review`
- 15. `GV-PK-JPN-M5-117` - Gwynn - current DB status `needs_review`
- 16. `GV-PK-JPN-M5-073` - ごうかいボム - current DB status `needs_review`
- 17. `GV-PK-JPN-M5-105` - Dark Bell - current DB status `needs_review`
- 18. `GV-PK-JPN-TCGCOLLECTOR11194-057` - Water Energy - current DB status `needs_review`
- 19. `GV-PK-JPN-M5-101` - Mega Excadrill ex - current DB status `needs_review`
- 20. `GV-PK-JPN-M5-116` - Gladion's Final Battle - current DB status `needs_review`
- 21. `GV-PK-JPN-M5-113` - Mega Chandelure ex - current DB status `needs_review`
- 22. `GV-PK-JPN-SMG-039` - Dimension Valley - current DB status `needs_review`
- 23. `GV-PK-JPN-M5-111` - Gwynn - current DB status `needs_review`
- 25. `GV-PK-JPN-TCGCOLLECTOR11541-013` - Psychic Energy - current DB status `needs_review`

## Exact Next Gate

Confirm image-based review for the four `approve_later_gate` rows before applying database approval, or explicitly authorize a text-only approval exception. The safer path is image-confirmed review first.
