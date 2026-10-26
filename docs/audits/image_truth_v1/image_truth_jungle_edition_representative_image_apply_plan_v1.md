# IMG-JUNGLE-EDITION-REPRESENTATIVE-IMAGE-APPLY-V1 Plan

- Generated: 2026-10-26T11:36:43.457Z
- Mode: plan_only
- Project ref verified: true
- Canonical environment invariants passed: true
- Target rows: 128
- Source rows: 64
- Ready for apply: true
- Fingerprint: `d6dccce8f66d9bb552ec4fe1a3f6b924b942949c2ea4e7747f92475a91a2bc56`
- Rollback verified: true
- Database writes performed: false
- Updated rows: 0
- Pokemon text-only before: 211
- Pokemon text-only after: 211
- Exact image fields changed: false
- Child writes performed: false
- Identity writes performed: false
- Price writes performed: false
- Storage writes performed: false
- Stop findings: none

## Updates (first 20)

| target | edition | source | representative route |
| --- | --- | --- | --- |
| GV-PK-JU-1-FIRST-EDITION | edition:first_edition | GV-PK-JU-1 | /api/canon/cards/GV-PK-JU-1/image |
| GV-PK-JU-1-UNLIMITED | edition:unlimited | GV-PK-JU-1 | /api/canon/cards/GV-PK-JU-1/image |
| GV-PK-JU-10-FIRST-EDITION | edition:first_edition | GV-PK-JU-10 | /api/canon/cards/GV-PK-JU-10/image |
| GV-PK-JU-10-UNLIMITED | edition:unlimited | GV-PK-JU-10 | /api/canon/cards/GV-PK-JU-10/image |
| GV-PK-JU-11-FIRST-EDITION | edition:first_edition | GV-PK-JU-11 | /api/canon/cards/GV-PK-JU-11/image |
| GV-PK-JU-11-UNLIMITED | edition:unlimited | GV-PK-JU-11 | /api/canon/cards/GV-PK-JU-11/image |
| GV-PK-JU-12-FIRST-EDITION | edition:first_edition | GV-PK-JU-12 | /api/canon/cards/GV-PK-JU-12/image |
| GV-PK-JU-12-UNLIMITED | edition:unlimited | GV-PK-JU-12 | /api/canon/cards/GV-PK-JU-12/image |
| GV-PK-JU-13-FIRST-EDITION | edition:first_edition | GV-PK-JU-13 | /api/canon/cards/GV-PK-JU-13/image |
| GV-PK-JU-13-UNLIMITED | edition:unlimited | GV-PK-JU-13 | /api/canon/cards/GV-PK-JU-13/image |
| GV-PK-JU-14-FIRST-EDITION | edition:first_edition | GV-PK-JU-14 | /api/canon/cards/GV-PK-JU-14/image |
| GV-PK-JU-14-UNLIMITED | edition:unlimited | GV-PK-JU-14 | /api/canon/cards/GV-PK-JU-14/image |
| GV-PK-JU-15-FIRST-EDITION | edition:first_edition | GV-PK-JU-15 | /api/canon/cards/GV-PK-JU-15/image |
| GV-PK-JU-15-UNLIMITED | edition:unlimited | GV-PK-JU-15 | /api/canon/cards/GV-PK-JU-15/image |
| GV-PK-JU-16-FIRST-EDITION | edition:first_edition | GV-PK-JU-16 | /api/canon/cards/GV-PK-JU-16/image |
| GV-PK-JU-16-UNLIMITED | edition:unlimited | GV-PK-JU-16 | /api/canon/cards/GV-PK-JU-16/image |
| GV-PK-JU-17-FIRST-EDITION | edition:first_edition | GV-PK-JU-17 | /api/canon/cards/GV-PK-JU-17/image |
| GV-PK-JU-17-UNLIMITED | edition:unlimited | GV-PK-JU-17 | /api/canon/cards/GV-PK-JU-17/image |
| GV-PK-JU-18-FIRST-EDITION | edition:first_edition | GV-PK-JU-18 | /api/canon/cards/GV-PK-JU-18/image |
| GV-PK-JU-18-UNLIMITED | edition:unlimited | GV-PK-JU-18 | /api/canon/cards/GV-PK-JU-18/image |

## Evidence boundary

Each target is an existing Jungle edition identity. Its deterministic source is the one standard
Jungle row with the same set, number, and name. The source has an exact self-hosted identity image
and a preserved TCGdex source URL. The edition rows receive only a representative route and an
honest representative status; exact image fields remain unchanged.
