# MEE Reference Memory Repair - September 9, 2026 UTC

## Incident

Direct journal readback found `grookai-mee-reference-refresh.service` exiting
134 after the reference delta writer exhausted its approximately 512 MB Node
heap. The active MEE checkout is `/opt/grookai/releases/backend/87632e01b`.
The artifact directory contains 56 normalized JSON files totaling 954352386
bytes. The installed selector parses every file and retains every matching
payload before sorting to choose only the newest one.

## Narrow Repair

Sort file metadata first, then inspect payloads newest-first until the requested
source is found. Preserve modification-time ordering, stable tie ordering,
source-count membership checks, the selected artifact shape, and fail-closed
handling of malformed JSON encountered during selection. No history is deleted.

The selector now lives in
`backend/pricing/mee_reference_artifact_selection_v1.mjs`; the existing writer
delegates selection to it. Candidate hashing, warehouse lookup, insert policy,
review gates, counts, and public-pricing exclusions remain unchanged.

## Verification

- Four targeted selector tests cover ordering, skipped unrelated files, absent
  sources, malformed newest evidence, and bounded memory.
- A 72 MB historical fixture passes selection in a 64 MB child heap.
- A read-only host probe using the same metadata-first approach passes in a
  128 MB heap with 177556 KiB peak RSS, no DB access and no provider calls.
- Host selection: Pokemon evidence `2026-09-09T03-01-21-445Z`, 14048 rows,
  one payload read. TCGCSV evidence `2026-09-01T03-16-18-183Z`, 16795 rows,
  17 payloads inspected sequentially. This does not pretend TCGCSV refreshed today.

## Remaining Live Gate

This is source repair, not a successful production refresh. Deploy an immutable
tested runtime while preserving the old pointer. Run the writer's read-only
preflight against current artifacts and warehouse counts under a bounded heap.
Only then run the already-governed reference refresh and verify its phase ledger,
warehouse reconciliation, memory peak, and unchanged public-pricing boundary.
Other full-table warehouse reads remain outside this narrow selector repair;
the full dry run must expose any additional memory bottleneck before activation.

No DB, Storage, inventory, production pointer, service configuration, or retention
mutation was performed to obtain these receipts.

Artifacts: `C:/grookai_vault_operator_artifacts/release_closeout/20260909/`.
