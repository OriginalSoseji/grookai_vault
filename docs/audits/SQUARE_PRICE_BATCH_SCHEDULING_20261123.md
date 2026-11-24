# Square scheduled price batches — November 23, 2026

Status: prepared/default-off candidate. Bounded local scheduling and recovery
passed; production, hosted clocks and the100-vendor/100,000-copy launch remain
unqualified. No production SQL, provider inventory, flag, merge or app install
was performed. The shared duplicate-set release pause remains binding.

Source: `feat/square-bulk-price-authority-20261123`, based on canonical522 source
`4b5489e4dd4bc43d7f12933f63783c63e9a73dd6`. Evidence root:
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1/scheduled-batches-v1`.
The source seal/checkpoint records the actual prepared tree; HEAD alone does
not include this uncommitted candidate. Earlier checkpoints/labs are retained.

## Final behavior

Settlement and enrollment remain first. Every real commerce call recovers an
existing price parent, even with new admission disabled or during manual/focused
work. Unresolved catalog work prevents new catalog/artwork publication and new
positive allocations; existing stock/withdrawal/settlement remain reachable.
A racing database writer barrier follows the same rule. Focused readiness stays
pending until catalog uncertainty clears, even when an existing stock read says
ready. A stock failure in that race is counted once.

After at most five ordinary automatic targets, an enabled/unfocused scheduled
call can admit one new price parent. Recovering an earlier parent never admits
another in that call. Manual/focused work admits no unrelated price parent.
Batch acknowledgements and batch failure/review outcomes are separate from
ordinary target counts and the25-per-field worker journal. An independent batch
failure still persists a failed child/queue outcome, including when its ordinary
failed-target count is zero. A fully skipped batch review remains review.

`GROOKAI_SQUARE_PRICE_BATCH_ENABLED` defaults false in config and the GitHub
adapter/workflow. True requires durable recovery; malformed/unsafe combinations
fail before initialization. Cloud and scheduled paths use the shared durable
scheduler. No remote environment setting or repository variable was enabled.
Provider factory injection is a JavaScript test seam; deployed callers retain
the existing Square client and shared Supabase SDK.

## Forward pause repair and database qualification

The retained pre-fix actual-role RPC counterexample prepared a valid batch,
paused its vendor, and still began sending it. The initial counterexample
harness failed because private admission was off; both receipts are preserved.
A rollback-only correction reproduced cancellation before persistent application.

The sixth forward SQL is
`20261124006000_square_price_batch_pause_recovery_v1.sql`, SHA256
`34f52613cad54f3e6760cfc84aeef41df4cfe808e9e1400565fa64659105131e`.
It pins and replaces only the two exact prior authority bodies. Current auto-sync
is required for admission; an unsent/no-attempt parent cancels after pause.
Unresolved prepared/sending/uncertain parents keep their connection eligible
even when sale/enrollment preferences are off and no active allocation remains.
Requests/membership, stock/sale/payment writers and all security metadata remain.

- Actual official CLI2.90.0 populated527-to528 upgrade and no-op passed. The
  first audit incorrectly compared the expected ledger append as unchanged;
  its apply receipt was reused by a read-only corrected audit, without reapply.
  All488 existing table fingerprints match except the exact single ledger row.
- Four-schema comparison and full owner/ACL/RLS/function security comparison
  admit only the two intended body changes. The persistently upgraded actual
  service-role policy proof confirms cancellation, pending-only eligibility and
  unchanged original rows after transaction rollback.
- A newly owned `sq-price-fresh528-20261123-v1` lab completed genuine CLI prefix
  reset, declared647-pair historical prerequisite,100 unchanged catalog-only
  fixture INSERTs, all528 source files and a no-op push. No owner rows were
  copied. This does not qualify ordinary historical empty shadow replay.
- Fresh/populated comparison passes all four schemas and2,656 security objects.
  Official experimental CLI pull/export produced1,887 SQL exports and preserved
  all488 table fingerprints and ledger. Generated SQL was never executed.
- The separate audit-only V2 strict gate checks canonical522 plus the exact six
  candidates. Four denial tests reject PrePush, combined scope and expected-ID/
  environment overrides before database access. V1 remains unchanged. This
  audit is not production PrePush/apply authority and retains the shared catalog
  reliability failure. Current-canonical release ordering still needs integration.

All six locally applied SQL files are immutable. The old527 project is now528
but retains its four-copy discounted-sale/zero-stock-review fixture. The new528
lab now contains61 synthetic copies and two real local Auth users. Neither may
be reset. Earlier54-copy/prototype labs are also retained.

## Actual local runtime evidence

After replay/schema/export receipts, two local Auth users and60 synthetic copies
were created in the new lab. Connections carry local production-environment
tags so the unchanged production-only durable selector is exercised; the SDK
client itself connects only to loopback55861. No JWT was manually minted, RPC
environment rewritten or raw Supabase HTTP substituted. The real backend factory,
commerce/catalog services, credential envelopes, writer leases, Square client,
SDK HTTP and SQL queue/child/stock authorities execute. Square transport is an
explicit in-process synthetic provider with complete replacement, version,
SKU uniqueness and immutable idempotency checks. It performs no real Square IO.

Both actual clock functions ran concurrently. Each admitted one different
merchant, with two real terminal queue/child receipts and no duplicate seller.
They checked10 ordinary targets, acknowledged50 separate batch members and
created10 positive stock allocations. All60 prices and quantities matched
independent readback. The50 other catalog acknowledgements did not claim stock
or POS readiness. The2.4-second synthetic run is not a throughput claim.

Twenty-five additional source-price changes were then introduced as local
fixture input, followed by one new unmapped61st copy. A real focused call created
its canonical QR/SKU item and positive stock automatically. Its ordinary bound
also checked four existing copies, leaving21 source-price changes pending and15
positive stock allocations. The original harness incorrectly expected all30
old provider prices unchanged and stopped after accepted effects. Its failed
receipt/provider state remain. The corrected read-only continuation repeats
neither clock nor focus and verifies all61 mappings/prices/stock. This is a
backend-input proof, not a native/web save UI or physical checkout acceptance.

An additional actual leased batch accepted the21 changed prices, then lost both
its synthetic response and catalog readback. Its whole request stayed uncertain.
After genuine queue due times elapsed (none rewritten), overlapping actual
clock functions with admission off recorded one failed child for the affected
merchant and one successful child for the other. The failure retains five
checked/skipped ordinary targets and zero failed ordinary targets; its separate
batch failure is persisted correctly. No duplicate provider mutation occurred.
Restored readback with admission still off finalized the same21-member parent
with no additional mutation. All61 mappings/prices/stock match;20 allocations
are positive after the other merchant's ordinary work. Admission is off at exit.

## Reproduction and remaining gates

Key retained receipts/producers under the evidence root:

- `starting-gate-v1/baseline.json`, `baseline-denials-v1.json`.
- `auto-pause-counterexample-v2.json`, `auto-pause-correction-rollback-v1.json`,
  `persistent-pause-policy-v1.json`; the latter rolls fixture inputs back.
- `upgrade528-v1` (retained initial audit failure), `upgrade528-v2/result.json`
  (same immutable apply receipt; no reapply).
- `fresh528-v1/replay-proof.json`, `fresh-retained-schema-v1/result.json`,
  `official-pull-v1/result.json`, `post-runtime-schema-v1/result.json`.
- `clock-concurrency-v1/runtime-result-v1.json` (retained harness failure),
  `runtime-result-v2.json` (read-only continuation), and `fault-result-v1.json`.
- Exact producer/source snapshots, private local fixture/provider states,
  consumed intents and CLI logs remain beside those receipts. Never rerun a
  consumed write phase. Reproduction needs a new named isolated lab/intent.

Node22.23.5 checks pass201 Square backend/web-route tests and30 pricing tests.
These include actual scheduled adapter serialization/defaults and once-CLI
fixture routing,25-target manual journals, race/failure accounting and legacy
clock review handling. They do not replace normal managed/hosted release checks.

Remaining: varied canonical references, rule/manual-price/artwork interactions,
the complete100,000-copy pricing-to-POS backlog and missed-clock/rate-limit/restart
recovery; real provider throughput and hosted clock delivery; full normal managed
and hosted exact-source checks; current-canonical integration and a separately
qualified exact PrePush/release packet after shared closure. The owner-deferred
reader sale remains a separate physical acceptance check. No public/mass-ready
claim follows from this bounded local proof.
