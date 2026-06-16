# ENRICH-31B Modifier Parent GV-ID Guarded Dry-Run V1

Package: `ENRICH-31B-MODIFIER-PARENT-GV-ID-BACKFILL`

## Safety

- Real DB writes performed: false
- Transaction rolled back: true
- Migrations created: false
- Child writes performed: false
- Identity writes performed: false
- Deletes performed: false

## Scope

| set | number | name | modifier | proposed gv_id |
| --- | --- | --- | --- | --- |
| basep | 1 | Pikachu | edition:first_edition | GV-PK-PR-1-FIRST-EDITION |
| swsh2 | 154 | Boss's Orders (Giovanni) | trainer_subject:giovanni | GV-PK-RCL-154-GIOVANNI |
| swsh4.5 | 58 | Boss's Orders (Lysandre) | trainer_subject:lysandre | GV-PK-SHF-58-LYSANDRE |
| swsh4.5 | 60 | Professor's Research (Professor Juniper) | trainer_subject:professor_juniper | GV-PK-SHF-60-PROFESSOR-JUNIPER |

## Proof

- Pass: true
- Updated rows inside rollback: 4
- Before snapshot hash: `0d1e934406db1228d6f4dae7282c1d38317be8e4b48a886933089f0339c08b54`
- After rollback snapshot hash: `0d1e934406db1228d6f4dae7282c1d38317be8e4b48a886933089f0339c08b54`
- Dry-run status: completed_rolled_back_no_durable_change

Fingerprint: `c5b9b3eb58342bbb2e7e7499a79be2aac503d69e63f062990e79b740740fdbb7`
