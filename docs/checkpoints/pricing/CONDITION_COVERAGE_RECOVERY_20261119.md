# Exact condition coverage recovery — November 19, 2026

The production read-only census found existing mappings/publication authority
that the V2 condition reader could not consume: 27,890 English Pokemon printing
rows had no admitted V2 mapping route, while only14 One Piece printing rows had
explicit child mappings. One Piece nevertheless has6,900 governed exact product
parent mappings and6,475 children from its source-backed exact printing repair.
Counts are structural and do not imply that every condition has an upstream value.

The [V3 contract](../../contracts/TCGTRACKING_CONDITION_COVERAGE_V3.md) admits current
exact published-printing authority and the original governed One Piece product/
finish assertion. It preserves all current source identity, conflict, visibility,
freshness, condition and client privacy checks. No mapping or canonical row is
created or changed. Vault totals, existing market publication and asking prices
retain their authority.

The candidate is based on merged main `e702742bc` and includes the already
merged cross-TCG Binder work. The dirty original checkout and other working
trees remain intact. Private receipts are at
`C:/grookai_search_xy124_20261118/artifacts/pricing_completion_v3/20261119/`.

Nineteen focused tests pass. Actual changed backend modules against current
read-only production evidence recovered NM/LP source references for nine
previously blocked printings: six Pokemon Normal/Holo/Reverse children and three
distinct One Piece Luffy OP01-003 product/finish identities. Seventeen of eighteen
condition selections have real provider values; the absent eighteenth remains
unavailable. Supplied values, including a higher LP amount, remain unchanged.
This is backend/live-source proof and is not yet deployed-client acceptance.

The initial schema audit required linking this isolated checkout; official CLI
linking completed without tracked configuration changes. The subsequent normal
AuditLinkedSchema reached linked diff but its shadow replay failed. Retain that
failure. This reader has no migration; the separate market-publication expansion
must resolve and pass that gate before any schema/publication apply. No schema
apply, market activation or source import is claimed here.

Normal full managed commit/push, hosted review and final production acceptance
remain release gates. The compatible backend repair requires no APK reinstall.
