# PKG-14A PL4 Zapdos G Guarded Dry Run Checkpoint V1

- package_id: PKG-14A-PL4-ZAPDOS-G-PARENT-NAME-MAPPING-TRANSFER
- generated_at: 2026-06-11T11:19:52.255Z
- package_fingerprint_sha256: `b674004802f4f36363a4a694ce4c48d444aca03e9c0d96877c360399973674e0`
- dry_run_status: pkg14a_zapdos_g_completed_rolled_back_no_durable_change
- dry_run_proof_sha256: `108007ab690a57541e588b51584ecedbb2ce0502ecc93ea5cdae120e854b9d8c`
- rollback_verified: true
- stop_findings: 0

## Scope

- 1 parent name update: Zapdos -> Zapdos G
- 1 card_print_identity projection update
- 2 external mapping transfers from Shinx SH12 to Zapdos G
- 0 child writes
- 0 deletes
- 0 migrations

## Safety

Shinx SH12 remains untouched as a parent and keeps `tcgdex:pl4-SH12`. This dry-run performed no durable DB writes.
