# Sales desk fast entry — October 5, 2026

Isolated worktree: `C:/gv_sales_fast_entry_20261005`, branch
`feature/sales-fast-entry-20261005`, from current main
`499208eab306a0699be216907389a398ac7884c2` (merged PR594).
Read [the behavior contract](../contracts/SALES_FAST_ENTRY_V1.md).

The prior trade-in batch is complete and live at production427/TestFlight343.
Its external `sales_trade_ins_20261003/release-checkpoint.json` is authoritative;
never replay its consumed release, migration or upload intents.

This candidate implements continuous canonical entry, explicit paged search,
short-lived query reuse, owner-scoped targeted inventory refresh, concurrent
initial reads, and one-tap/drag saved-price cart entry. Owned search now matches
name, number, set, finish and ID tokens in any order. Exact printing selection,
uncertain-save recovery and the final payment-recording confirmation remain.
No production or database-schema changes have been made for this candidate.

Evidence lives under
`C:/grookai_vault_operator_artifacts/sales_fast_entry_20261005`.
The external checkpoint records current proof/release status and all failed
attempts; this document is not a release receipt. Initial focused regression
tests passed24, full Flutter passed1276 with2 existing skips. New native proof
uses only synthetic fixtures in the retained dedicated full427/653xx project,
never reset. Preserve the populated upgrade427 and all other database work.

Native source: `~/grookai_sales_fast_entry_20261005` on the existing Mac;
artifacts: `~/grookai_sales_fast_entry_artifacts_20261005`.
Use the working `~/flutter-3.44.9` toolchain. The retained task simulator is
`CC83C7DB-E6F5-4509-9034-060BCCF8983D`; forward both65301 (Auth/RPC) and65310
(real local resolver). The unchanged web resolver uses the prior qualified local
build with a clean loopback-only environment. Do not touch the unrelated Mac
printing project, its process, prior archives, or shared Docker service.

Receipt delivery remains pending: website environment names and Supabase Auth
configuration show no email/SMS sending service. The user was asked whether an
existing service exists; no answer is recorded yet. Build receipt-only,
owner-authorized, durable/idempotent sending and delivery status once provider
configuration is known. Never claim mailto/sms drafts are sent receipts. Do not
use Auth email as a transactional receipt service or send test customer messages.

Missing-card examples are also pending. The old limit30 applies only to some
resolver paths; recognized complete-name/combined searches already returned full
results. This batch does not claim to repair unverified catalog coverage. Capture
specific failing queries before changing canonical resolution or catalog truth.

## Local native proof

Actual iPad execution confirmed saved-price entry and two continuous canonical
adds with one initial full-desk load and two targeted copy reads. The final sale
produced one15000-cent receipt, three distinct disposition links and three
archived physical copies. Independent SQL readback checks the disposition links
stored alongside the immutable receipt; receipt item snapshots intentionally do
not duplicate instance-ID fields. Test-driver setup corrections and the initial
incorrect verifier-field assumption are retained in the external attempt logs.

The measured local add round trips include simulator animation/test settling and
are not a production latency promise. App Store read-only inventory still showed
343 as the latest valid build during this work. Publication requires a separate
verified upload; no new TestFlight build is implied by local proof.
