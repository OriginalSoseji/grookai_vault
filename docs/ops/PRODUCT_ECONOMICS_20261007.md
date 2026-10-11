# Product economics — October 7

## Backend implementation and release preparation

Backend commit `3f3a30e88ba35519514af1b7e3e65efcc8010032` passed ordinary hooks:
7,480 contracts (10 skipped), web types/lint/build, native analysis and 1,382
native tests (two skipped). All four current replay/upgrade labs passed; both
real Auth suites and the V2 idempotency proof passed. External LOCAL_COMPLETE.json
is an implementation receipt, not release completion or application authority.

`ProductEconomicsReleaseV1` admits only read-only AuditLinkedSchema and PrePush
for migration20261007180000. It rereads all four retained labs, checks private
RPC proof, costs/receipts retained through upgrade, disabled controls and unchanged
backend source, then compares fresh live429 to its qualified baseline. PrePush
also requires clean current-main ancestry and fresh ordinary hooks. The fixed
CLI inspection package supports only preparation and dry-run; it excludes deferred
receipt delivery while retaining all source history. Shadow inspection and actual
production release remain separate outstanding gates.

Worktree: `C:/gv_product_economics_20261007`, branch
`feature/product-economics-20261007`, based on verified daily-workflow commit
`2c7bd72427191fdf8ebacdc23fc8f1fc692d6429`.

Read [Vendor cost evidence V1](../contracts/VENDOR_COST_EVIDENCE_V1.md).
Private results live in
`C:/grookai_vault_operator_artifacts/product_economics_20261007/`.
The original daily-workflow candidate remains intact. No push, deployment,
production mutation or activation belongs to this checkpoint.

## Baseline and candidate

The read-only `ProductEconomicsBaselineV1` gate verifies live429 against the
qualified split-payments429 replay, rereads that retained lab and compares schema,
ACLs and migration ledger. `BASELINE_429.json` records the latest passing audit.
Production sanity: 171,181 cards, 3,401 sets, 32,903 traits at the October7 audit.
The gate uses the system certificate store; it never disables TLS verification.

All 430 existing source migrations are unchanged. Deferred receipt delivery is
still present in source and absent from live429. New cost evidence makes the full
local candidate431. A future production package would need a separate exact
429-to430 qualification excluding receipt delivery. No prior release gate grants
authority for this candidate.

The additive migration reuses exact-copy cost fields and the cart receipt ledger.
Both cost-edit and sale-capture controls default off. Cost snapshots are private
and transactionally captured through existing cart completion. No app interface
depends on this schema yet. Events, expenses and reports remain subsequent work.

## Dedicated local qualification

`scripts/schema/product_economics_lab_v1.mjs full|upgrade` uses new one-use labs:

- Full431: `product-cost-full-431-v2-20261007`, loopback33060/33061/33064,
  internal10.246.56.0/24.
- Retained430-to431: `product-cost-upgrade-431-v2-20261007`,
  loopback33080/33081/33084, internal10.246.57.0/24.

The original V1 labs on3302x/3304x passed replay, upgrade, initial Auth/concurrency
and idempotency proofs. An added oversized-legacy-cost regression correctly failed
there. The bounded-evidence fix requires the fresh V2 labs above; V1 remains
retained historical evidence, not qualification of current source.

`product_economics_release_lab_v1.mjs full|upgrade` additionally qualifies the
exact candidate package excluding deferred receipt delivery: full430 on3314x /
internal10.246.60 and retained429-to430 on3316x / internal10.246.61. Project IDs
are `cost-full-430-r2-20261007` and
`cost-upgrade-430-r2-20261007`. These local package proofs confer
no production application authority. The Auth proof's `--release-package` switch
uses only the fixed full430 package and verifies delivery remains absent.

The first release-package attempt on3310x is retained: Supabase truncated its
overlong project identifier and startup could not reach the intended relay
destination. No qualification was issued. The R2 package uses shorter identifiers
and fresh ports; do not reuse the earlier start intent.

Each script verifies source/config hashes, empty initial state and internal network
before its one-use reset; workers remain zero. Never rerun a consumed lab intent.
The upgrade retains exact copies including a zero CAD cost and a legacy amount
with unknown currency, plus the prior receipt book. All prior labs are preserved.

`scripts/receipts/prove_vendor_cost_evidence_v1.mjs` binds real Auth and PostgREST
proof to the completed full431 replay. It retains its synthetic users and results,
restores switches off and never resets after population. It temporarily injects a
local check failure to prove sale rollback and removes that check in `finally`.
Only the task-owned lab is used. Historical failure receipts must be preserved.

`scripts/tests/run_product_economics_checks_v1.mjs` runs ordinary shipcheck or
the managed commit hook against the attested V2 lab using read-only credentials.
It records source and before/after account/copy/ledger counts externally. Do not
edit source during a commit hook. `verify_product_economics_idempotency_v1.mjs`
repeats only the exact frozen migration in that local lab, verifies all retained
financial/copy rows and compares schema/security before and after.

Actual pass/fail and process state belong to external `CHECKPOINT.json`; source
alone is not proof. Full replay, upgrade, runtime, idempotency, strict release
package and shadow inspection all need their own receipts before schema completion.

## Daily workflow milestone

The pricing follow-up is committed at `2c7bd7242`. Normal hooks passed 7,476
contracts (10 skipped), web types/lint/production build, native analysis and
1,382 native tests (two skipped). Its combined browser suite passed23 cases,
and the actual local-auth price-edit flow passed independently. The shared local430
lab retained its original two users and four copies. Samsung sale/retry acceptance
is recorded separately; iOS proof remains pending disk capacity.
