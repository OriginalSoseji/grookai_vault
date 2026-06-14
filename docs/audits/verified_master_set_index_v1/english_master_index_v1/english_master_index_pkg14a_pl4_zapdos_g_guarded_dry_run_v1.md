# PKG-14A PL4 Zapdos G Guarded Dry Run V1

Rollback-only dry-run for the PL4 Zapdos G parent-name and mapping-transfer correction.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_name_updates: 1
- card_print_identity_updates: 1
- external_mapping_transfers: 2
- child_writes: 0
- deletes: 0
- preserve Shinx SH12: true

## Result

- dry_run_status: pkg14a_zapdos_g_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `b674004802f4f36363a4a694ce4c48d444aca03e9c0d96877c360399973674e0`
- dry_run_proof_sha256: `108007ab690a57541e588b51584ecedbb2ce0502ecc93ea5cdae120e854b9d8c`
- stop_findings: 0

| write_inside_rolled_back_transaction | count |
| --- | --- |
| parent_name_updates | 1 |
| card_print_identity_updates | 1 |
| external_mapping_transfers | 2 |
| child_writes | 0 |
| deletes | 0 |

## Guardrail

This package may only become a real apply if the proof hash is unchanged, rollback is verified, Shinx SH12 retains `tcgdex:pl4-SH12`, and no child rows or deletes are introduced.
