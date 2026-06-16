# ENRICH-31C Modifier Child Printing GV-ID Guarded Dry-Run V1

Package: `ENRICH-31C-MODIFIER-CHILD-PRINTING-GV-ID-BACKFILL`

## Safety

- Real DB writes performed: false
- Transaction rolled back: true
- Migrations created: false
- Parent writes performed: false
- Identity writes performed: false
- Deletes performed: false

## Scope

| set | number | name | finish | proposed printing gv_id |
| --- | --- | --- | --- | --- |
| basep | 1 | Pikachu | normal | GV-PK-PR-1-FIRST-EDITION-STD |
| swsh2 | 154 | Boss's Orders (Giovanni) | holo | GV-PK-RCL-154-GIOVANNI-HOLO |
| swsh2 | 154 | Boss's Orders (Giovanni) | reverse | GV-PK-RCL-154-GIOVANNI-RH |
| swsh4.5 | 58 | Boss's Orders (Lysandre) | normal | GV-PK-SHF-58-LYSANDRE-STD |
| swsh4.5 | 58 | Boss's Orders (Lysandre) | reverse | GV-PK-SHF-58-LYSANDRE-RH |
| swsh4.5 | 60 | Professor's Research (Professor Juniper) | normal | GV-PK-SHF-60-PROFESSOR-JUNIPER-STD |
| swsh4.5 | 60 | Professor's Research (Professor Juniper) | reverse | GV-PK-SHF-60-PROFESSOR-JUNIPER-RH |

## Proof

- Pass: true
- Updated rows inside rollback: 7
- Before snapshot hash: `a046adff9d4c3e4ccd63b991ec0ff097f8dbf578780faa6f44459558c77a5df9`
- After rollback snapshot hash: `a046adff9d4c3e4ccd63b991ec0ff097f8dbf578780faa6f44459558c77a5df9`
- Dry-run status: completed_rolled_back_no_durable_change

Fingerprint: `e92b767dbaa6751ac11ad8c3e26bea8474f1df6e84c899f7a445c8d853eaa93a`
