# Sealed Ownership Implementation

Historical in-progress snapshot. Superseded by
`SEALED_OWNERSHIP_LOCAL_ACCEPTANCE_20260907.md` for current status and remaining work.

Date: 2026-09-07. Status: in progress, local only. Not production-ready or deployed.

Worktree: `C:\grookai_vault_pokemon_sealed`, branch
`feature/sealed-owned-collectibles-v1`, base `0688a21a1d5f54c4d0c90dabfebe43927bb4e98a`.
All current changes are intentionally uncommitted. Preserve the root worktree.

## Implemented Locally

- `20260907180000_sealed_owned_instances_v1.sql`: real sealed variant ownership,
  one-anchor checks, conditions, stable GVVI allocation, request-bound addition,
  archive/sale/trade and condition/asking-price mutation. Add control defaults off.
- `20260907183000_sealed_owned_read_models_v1.sql`: owned copies/totals,
  visibility/block checks, private-field withholding, exact market/image evidence,
  filtered/paged Wall inventory and exact-copy GVVI lookup.
- Flutter typed service, persistent request recovery, Vault subtotal/combined
  USD total, browse Add controls, bulk archive, vendor sealed mode, section
  assignment, sale/trade/cash forms, copy landing, QR/share/print controls.
- Web equivalents in Vault, browse, Wall/public sections and GVVI; signed-out
  sealed links require login rather than exposing licensed prices/images.
- Default-off client flags: `SEALED_OWNERSHIP_V1_ENABLED` (Flutter) and
  `NEXT_PUBLIC_SEALED_OWNERSHIP_V1_ENABLED` (web).

## Verification So Far

- 29 real PostgreSQL integration scenarios passed, including positive pricing,
  stale/future/malformed price withholding, unknown-condition preservation,
  private/blocked access, section withdrawal, anonymous denial and actual races.
- Ten concurrent retries create one three-copy addition. Ten distinct concurrent
  two-copy additions allocate 20 unique copies. Competing sale/trade commits once.
- 24 targeted Flutter service/existing pricing/catalog tests passed.
- 12 targeted web typed-contract/existing sealed catalog tests passed.
- Web TypeScript check passed. Final lint/analysis and screen tests still pending.

Tests use only Docker `supabase_db_sealed-ownership-replay-20260907`, port 55430.
They never load production credentials. The optional `--concurrency` integration
run commits synthetic fixtures in that disposable DB; a final isolated replay
is required. Normal scenarios roll back their fixture transaction. Neither mode
writes to production or Storage. New migrations have been applied manually to
this local DB twice for idempotency but are not yet in its migration ledger.

## Still Required

1. Complete remaining lifecycle integrations: history, mixed sharing/lots and
   personal media/notes; verify messaging/transfer boundaries without fake card IDs.
2. Screen-level tests on web and Flutter, plus existing card/slab SQL regressions.
   Correct any stale totals, pagination, retry and UI issues found.
3. Synchronize only new migrations into the isolated replay worktree; perform
   full fresh replay and strict pending-set preflight. Never reset original 54330.
4. Freeze migration hashes and an exact governed apply/rollout plan. The earlier
   image-dimension and 32-function source-reconciliation migrations also remain
   unapplied. The previous two-ID baseline audit is prerequisite evidence, not
   authority to ignore the new ownership schema footprint.
5. Production apply/readback through the governing migration authority, bounded
   owner canary, client deployment, verification and deliberate flag activation.

No production schema, ownership, release, pricing, Storage, or deployment writes
have occurred during this implementation. Existing ingestion/MTG work is untouched.
Do not call the feature complete based solely on test counts or this checkpoint.
