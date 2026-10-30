# TCGPlayer pricing completion agent V5

Status: Active. This contract supersedes the exact-planner connection section of
`TCGPLAYER_PRICING_COMPLETION_AGENT_V4`; every other V4 boundary remains binding.

## Credential-free exact planning

The production completion agent must not receive or require
`TCGPLAYER_EXACT_MAPPING_READER_DB_URL`. The dedicated-reader proposal remains
blocked by `PRICING_COMPLETION_READER_CAPABILITY_V1` and must not be activated,
repaired, or replaced with the broad production login.

Instead, the hosted agent uses its already-required backlog-census connection in
one isolated capture subprocess. The capture must use verified TLS and a
repeatable-read, read-only transaction. It may read only the current Pokemon
mapping scope needed by the existing V1.3 planner: the bound completed full
source run, scoped product/observation reconciliation and active mapping counts,
exact embedded targets, group mapping consensus, reviewed set authorities, target
sets, canonical parents, active standard identities, and active TCGPlayer
mappings. It performs zero database writes and rolls back before emitting data.

The capture writes a new `PRICING_COMPLETION_EXACT_MAPPING_SNAPSHOT_V1` file with
exclusive-create semantics. The snapshot contains no connection string,
password, service key, or database login. It binds the exact source-sync ID and
SHA-256 of the Pokemon coverage-gap artifact; records capture time, row counts,
verified-TLS/read-only/isolation boundaries, and the complete scoped source and
target inputs; and expires after 24 hours. Missing rows, duplicate scope keys,
count drift, foreign scope rows, stale/future timestamps, changed hashes,
unverified TLS, or any write-capable boundary fail closed.

After the capture connection is closed, the exact planner runs in a separate
subprocess whose environment removes every Supabase, database, PostgreSQL,
service-role, secret-key, and PG connection variable. It accepts only the bound
snapshot and original coverage-gap bytes. The planner reuses the unchanged
`TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_3` candidate and collision rules.
It cannot query a database in this mode.

Snapshot creation or offline validation failure holds the automatic exact lane
with a fixed unavailable status. It must not fail or erase the independent
pricing census, Pokemon diagnostic queue, founder review lane, or local Ollama
triage. The scheduled artifact preserves the snapshot hash, offline plan hash,
candidate/blocked counts, and both subprocess receipts.

## Authority boundary

This lane generates review candidates only. A candidate does not create or
modify a canonical card, printing, external mapping, qualification decision,
publication snapshot, price, Vault record, or customer state. Existing Master
Index authority, founder review, bounded mapping release, transactional
revalidation, approval, rollback, and durable readback gates remain mandatory.
The exact planner must never invoke an apply script or convert snapshot evidence
directly into mapping or publication authority.

## Future-release triage

The operations agent may maintain an exact, source-group-bound future-release
hold registry backed by an official publisher release date. Before that date,
blocked source products from the reviewed group are reported separately from
actionable mapping failures. The hold is telemetry only: it grants no catalog,
mapping, pricing, publication, or customer-state write authority. It must match
both the numeric source group and exact source group name, remain bound to the
completed source run's `observed_on` date, and expire automatically on the
official release date. After expiration, still-unresolved products return to
the actionable blocked queue.

Each hosted run preserves two hashed artifacts: the future-release catalog
holds and the remaining actionable exact-mapping blocks. A malformed source
date, duplicate source product, changed group identity, or non-authority block
reason fails closed instead of suppressing work.

