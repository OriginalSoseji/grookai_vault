# One Piece ST-01 Printing And Image Readiness V1

- Status: `pass_with_expected_finish_taxonomy_blockers`
- Readiness fingerprint: `430a9b54a5820078934fbf6900cc6ebc7073c86514ed912cb10af26a679251b1`
- Parent artwork pointers ready: `17`
- Normal child printings ready: `14`
- Foil children blocked by taxonomy: `3`
- Child image pointers ready: `0`
- Database writes: `0`
- Storage writes: `0`
- Findings: `0`

## Evidence Decision

The TCGPlayer source price lane proves each product's source finish subtype. The official Bandai image proves parent artwork identity only. The global `foil` finish key is currently scoped to MTG, so the three One Piece foil rows remain blocked rather than being translated to `holo`.

| Card | Name | Source finish | Child printing | Parent artwork pointer |
| --- | --- | --- | --- | --- |
| ST01-001 | Monkey.D.Luffy | foil | blocked_finish_taxonomy | ready_for_separate_guarded_apply |
| ST01-002 | Usopp | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-003 | Karoo | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-004 | Sanji | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-005 | Jinbe | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-006 | Tony Tony.Chopper | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-007 | Nami | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-008 | Nico Robin | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-009 | Nefeltari Vivi | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-010 | Franky | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-011 | Brook | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-012 | Monkey.D.Luffy | foil | blocked_finish_taxonomy | ready_for_separate_guarded_apply |
| ST01-013 | Roronoa Zoro | foil | blocked_finish_taxonomy | ready_for_separate_guarded_apply |
| ST01-014 | Guard Point | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-015 | Gum-Gum Jet Pistol | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-016 | Diable Jambe | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |
| ST01-017 | Thousand Sunny | normal | ready_for_separate_guarded_apply | ready_for_separate_guarded_apply |

## Boundaries

No database, Storage, pointer, pricing, publication, Vault, or visibility writes occurred. No child image is claimed from the shared parent artwork evidence.
