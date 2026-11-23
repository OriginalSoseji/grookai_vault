# Square integrated pricing and recovery capacity — November 23, 2026

Status: bounded isolated wave passed; full-backlog and live qualification remain
open. No production activation or daily freshness guarantee. The owner launch
target is 100 vendors with 1,000 active
cards each. The active duplicate-set release still pauses other main merges.

## Candidate and evidence boundaries

This branch integrates the pricing drain candidate `37b7e9b` with durable
merchant recovery `2e1dc022` and its existing live/sold target window. All three
new flags retain their false defaults. No application SQL, migration history,
normal hook, timeout, monetary authority or production setting changed here.

Retained operator evidence is under
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/capacity-v1`.
Private fixture manifests, credentials and provider snapshots are not checked in.
The exact executed backend/provider sources and SHA256 manifest are retained
separately for the small pilot and scale trial.

Each lab clones the already qualified retained 522 candidate into a new owned
database. It uses real PostgREST and Kong containers, the shared Supabase SDK
and the unchanged pricing, catalog, stock and sale authorities. Only Square's
HTTP transport is replaced with the checked-in local provider fixture. A fetch
allowlist restricts requests to the owned API and known synthetic Square tokens;
real Square requests and production writes are forbidden.

The provider models merchant isolation, full catalog replacement, object
versions, request-body-bound idempotency, absolute stock counts, completed order
and payment reads, one catalog writer per merchant, injected 429 responses and
accepted-but-lost catalog responses. Fixture tests distinguish seeded inventory
from writes. These semantics provide controlled failure cases, not a model of
every provider behavior or evidence of live Square capacity.

## Completed small pilot

The actual six-card pilot passed: four automatic copies rounded the governed
$10.10 reference to $11; two manual copies stayed at $7.77. Pricing made no inline
Square calls. Ordinary recovery created six exact-QR catalog items and confirmed
six exclusive stock allocations. Both merchants completed, with no overlapping
catalog writes, duplicate creates or version conflicts. Its 187 real SDK RPCs
had a local median of 8.96ms and p95 of 17.27ms. Pricing took 128ms and recovery
took 923ms against the zero-delay local provider.

Those numbers describe two synthetic merchants and six copies only. Artwork,
provider network delay and production database load were not represented.

## Scale fixture

The separate scale lab contains 100 synthetic vendors with 100,300 exact copies,
existing catalog mappings and active exclusive allocations. There are 99,900
automatic active prices, 100 manual active prices and 300 manual copies reserved
for synthetic sale reconciliation. Existing inventory is an explicit starting
fixture; it is not proof of onboarding 100,300 items through Square.

The first single-statement bulk copy insert hit its unchanged five-minute
statement timeout and rolled back. That failed receipt remains retained. The
forward fixture producer loads one vendor per statement through every installed
inventory guard and then reads each real offer to build the starting snapshots.
It committed exactly 100,300 copies/mappings/claims. No trigger was disabled.
Only the owned fixture tables' planner statistics were analyzed before timing.

All copies share one existing, nonprovisional canonical printing and one governed
synthetic market publication. This deliberately optimistic cache profile does
not qualify diverse-market reads, price ingestion or reference freshness.

## Timed scale trial

The first trial runs one actual bounded pricing drain, followed by one actual
four-worker merchant-recovery invocation with 250ms delay per synthetic provider
request and three completed-sale observations per merchant. It retains the
existing 5,000-price, 220-second pricing admission limit and 100-merchant,
five-target, 180-second recovery admission limits.

The immutable runtime receipt `scale-runtime-v1.json` passed, followed by the
separate SELECT-only `scale-readback-v2.json`. The first readback producer had
a JavaScript parse failure before connecting; its source remains retained and
the corrected producer has a new name. No database data changed for that fix.

| Measurement | Observed result |
| --- | --- |
| Governed pricing wave | 5,000 checked and updated in 123.95 seconds |
| Pricing admission | 100 unchanged 50-copy pages; work bound reached |
| Inline provider calls during pricing | 0; all 5,000 handoffs pending |
| Recovery wave | 100 unique merchants, 500 target checks, 158.54 seconds |
| Recovery failures, reviews, skipped or pending receipts | 0 |
| Confirmed new Square prices | 19; distinct from 5,000 calculated prices |
| Completed synthetic sales / unique canonical dispositions | 300 / 300 |
| Synthetic sale total | $2,331; no real payment or provider call |
| Remaining active copies / active allocations | 100,000 / 100,000 |
| Manual prices changed | 0 out of 400, including the 300 sold copies |
| Provider items / zero-stock sold variations | 100,300 / 300 |
| Provider catalog writes / inventory writes | 19 / 0 |
| Changed seller notes / concurrent seller writes / version conflicts | 0 / 0 / 0 |
| Real SDK RPCs / median / p95 | 15,645 / 9.47ms / 25.64ms |
| Controlled provider requests | 1,819 at 250ms per request |
| Unresolved catalog operations after completion | 0 |

The setup retained the insert-time copy-change events when it seeded existing
mappings and stock. The independent readback found 99,800 pending copy events,
including 94,819 whose existing Square price already matched the current ask.
Those older events shared selection priority with new price changes, so most
target checks did not produce a new price acknowledgement. This is evidence of
a large initial-change backlog, not a clean steady-state daily-price benchmark.
The original lab and failed bulk-load receipt remain retained; neither the
backlog nor the assertion set was cleared to manufacture more acknowledged work.

The measured calculation rate was about 2,420 copies/minute. A linear projection
would take about 41 minutes to calculate 99,900 automatic prices at the same
cache/load profile. That projection is not an observed complete drain, excludes
Square acknowledgement and does not establish daily freshness. The source proof
uses actual wall time; no scheduler clock or queue eligibility was accelerated.

## Release gates

One bounded wave cannot establish that all 100,000 active prices reach POS
overnight. With retained sold history, four live slots per merchant per
five-minute invocation give a theoretical single-clock floor of about 20 hours
50 minutes for 100,000 changed active prices. This assumes every slot succeeds,
every merchant is reached and no clock is missed; it is not a freshness promise.

Remaining qualification includes a full backlog drain, varied market references,
artwork, throttling and uncertain-response recovery through the complete service,
live provider measurements, hosted-clock delivery and missed-clock recovery,
monitoring/alert delivery, independent seller acceptance and the owner-deferred
reader sale. Current-main integration, normal source/hosted checks and exact
production schema/release gates remain separate. No source or local test result
grants production SQL, main-merge or activation authority.
