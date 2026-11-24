# Square current-main integration qualification

The candidate is prepared on `feat/square-bulk-price-release-523-20261124`, based
on canonical523 main `75fe32c06bb6d54a511c706e837fb9eac0faae7f`. No production
schema, runtime setting, inventory, feature flag or deployment was changed by
this qualification. The owner’s separate catalog release closed the shared
merge pause; that closure does not grant Square SQL application authority.

The old six candidates sort before the already-applied canonical523 migration.
They remain immutable in their original528 source and populated labs. This new
branch carries byte-identical payloads under six forward IDs:

- `20261124230000_square_recovery_target_window_release_v3.sql`
- `20261124231000_square_recovery_target_lanes_release_v3.sql`
- `20261124232000_square_durable_recovery_scheduler_release_v3.sql`
- `20261124233000_square_price_batch_authority_v3.sql`
- `20261124234000_square_price_batch_attempt_receipts_v3.sql`
- `20261124235000_square_price_batch_pause_recovery_v3.sql`

The V3 source manifest binds all523 canonical historical files and these exact
six payloads. The separately named baseline mode is audit-only: it rejects
PrePush, partial candidate source, combined modes and target/ID/environment
overrides before access. Both preparation-only and complete-source audits
passed against actual canonical523 with all four schemas and security exact.
The six negative invocations also passed. V1/V2 scopes remain unchanged.

Artifacts are retained outside the repository under
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1/current-main-523-v1/`:

| Receipt | Result |
| --- | --- |
| `starting-gate-v2/baseline.json` | Canonical523, complete529 source, four schemas/security exact, read only |
| `fresh529-v1/replay-proof.json` | Genuine CLI prefix reset, declared647-pair alias prerequisite,100 catalog-only fixture statements, all529 sources and no-op |
| `fresh529-schema-v1/result.json` | Four schemas,2,656 security objects, zero remaining comparison SQL |
| `official-pull529-v1/result.json` | Supported experimental CLI export; all488 table fingerprints and ledger unchanged; generated SQL never executed |
| `native523-v1/native523-proof.json` | Independent genuine CLI replay to523, no archive restore, no owners or copies |
| `populated529-v7/result.json` | Genuine523-to529 CLI upgrade and no-op with54 declared local copies, all prior table fingerprints except exact ledger append unchanged, roles unchanged |
| `populated529-schema-v7/result.json` | Upgraded and fresh529 equivalence across four schemas and all2,656 security objects |

Earlier archive-restore experiments remain failed evidence. They exposed empty
database prerequisites, an inherited platform constraint, and redundant owner
ACL representation changes introduced by dump/restore. None was accepted as
raw security equivalence, replayed over populated data or repaired by weakening
the comparator. The successful V7 lineage instead used genuine historical CLI
replay, checked raw canonical523 security before fixtures, and compared complete
raw security after the six forward migrations. The54-copy labs are populated
and must not be reset. The original fresh529 export lab remains preserved.

The restored server and all earlier failed labs are retained. No global role
attribute, platform cron setting, production ledger or historical SQL was
altered to force a pass. The successful upgrade changed only the six declared
schema payloads and their genuine ledger rows; it did not rewrite existing
inventory, market, stock, sale, credential or preference rows.

The separate100,000-copy model remains bound to its frozen528 component source.
Its runtime results must not be relabeled as combined529 source execution.
Current529 SQL equivalence and renewed source checks provide a separate
integration boundary. Managed/hosted checks and an exact production release
scope remain mandatory. Schema must precede matching server deployment because
admission-off recovery still calls the new RPCs.
