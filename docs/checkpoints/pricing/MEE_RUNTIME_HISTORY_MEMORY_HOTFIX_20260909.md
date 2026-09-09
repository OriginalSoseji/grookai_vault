# MEE Runtime History Memory Hotfix - September 9, 2026 UTC

## Authority and scope

Founder requested launch-critical operational repair. Actual deployed baseline:
`87632e01b4ebb47a7b3ae35684b2fbe3935907b9` at
`/opt/grookai/releases/backend/87632e01b`, reached by `/opt/grookai_mee_current`.

This runtime-only branch adds the tested metadata-first artifact selector from
main and replaces only the writer's historical selection function. Existing
runtime-root handling, bounded warehouse lookups, same-day acquisition reuse,
phase policy, call ceilings and warehouse write boundaries remain unchanged.
No dependency, client, pricing, schema, timer or scanner changes belong here.

Do not replace MEE wholesale from application main: that tree does not contain
all deployed runtime recovery behavior. Do not merge this older application
tree into main or deploy its web/mobile code. The selector already exists on
main; future runtime convergence needs a separate explicit parity audit.

## Evidence and deployment gate

The incident is a real Node heap exhaustion during selection of approximately
954 MB of normalized JSON history. Keep history intact. Select by metadata
mtime, then parse newest-first until the requested source is present; malformed
newer evidence fails closed.

Require targeted selector/runtime/writer contracts, syntax and diff checks,
normal commit/push gates, and an exact source delta from the deployed baseline.
Before changing the MEE pointer, prepare an immutable runtime, compare the
preserved baseline, and run the full writer preflight read-only against current
artifacts with a bounded heap. Production refresh must remain under its existing
automated reference warehouse apply contract. Never introduce a pricing write.

Artifacts: `C:/grookai_vault_operator_artifacts/release_closeout/20260909/`.
Source preparation alone does not prove successful production execution.
# Follow-up: source pairing

Read-only host preflight of fc26dda used 286248 KiB peak RSS without OOM,
but correctly blocked 10372 normalized rows without matching candidate hashes.
The installed unit normalized the two newest acquisitions globally: today's
Pokemon acquisition, then yesterday's Pokemon acquisition. The latter became
the newest normalized artifact and mismatched the writer's latest acquisition.

The follow-up replaces that loop with `--latest-per-source`, selecting exactly
one latest Pokemon and one latest TCGCSV acquisition. Missing inputs fail closed.
Normalized JSON now records the exact input path and SHA-256. Original artifacts
remain untouched. Candidate hashes, writer policy, pricing and identity rules
remain unchanged. No provider reacquisition is needed for recovery.

Runtime-only deployment must update the unit as well as the immutable pointer,
preserving the old unit/pointer and all failed evidence. First normalize preserved
inputs offline, then require clean writer read-only preflight before any write.
Do not merge this older runtime application tree into main.
