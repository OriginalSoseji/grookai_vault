# Buy-only workflow continuation

Isolated tree `C:/gv_product_buy_20261007`, branch feature/product-buy-20261007,
now includes qualified web review2dfc193bd. Read VENDOR_PURCHASE_V1 before edits.
The separate web cost-review normal hook passed7,587 contracts, web checks,
analysis and1,526 native tests; its source/lab freeze is lifted. Preserve that
clean tree and every retained lab. Integration preserved10 independent file hashes
and both documentation additions. Stashced7790e9cc55b0352ee26572b9de06ffb3bd1a6
remains retained, with receipts under pre-integrate-1791424119984.

The source audit confirms three existing checkout writers require outgoing sale
items. Batch intake is a separate copy/media workflow with its own isolated-pilot
gates, not a buy/payout ledger. Purchase completion will extend the existing receipt
book and request authority with an explicit receipt kind; no dummy sale lines.

The purchase request/receipt model and compatibility contract are implemented.
All39 Node cases and52 native tests pass, including51 fixed web/native vectors.
The vector fixture is bound to the web model's SHA256 and has18 accepted cases
and33 rejected cases. Scoped native analysis and TypeScript declaration checks
pass. Exact offers use integer arithmetic; agreed prices remain explicit and
pending acknowledgements bind identity, item amounts and payout entries without
depending on JSON property order. Caller objects remain unchanged; results are
deeply immutable. Customer projections omit private notes, contacts and copy IDs.

The initial tests caught an incorrect UUID expression; it was fixed before
qualification. Native lint fixes are limited to braces and package imports.
Compatible web/native readers now distinguish purchases in payment reporting,
history, receipt text, sharing and profit. Web mixed-book backup preserves the new
evidence. Purchase payouts have an explicit CSV column without changing the old
customer-payout column. Sales totals, averages, hours and sale-cost coverage omit
purchases; payment movements include them. Malformed purchase reads show a
recoverable report error. Private notes remain outside the shared receipt.

Focused Node checks pass121 cases. Native checks pass150 cases in reader-native-v3
plus the corrected receipt-history finder in reader-native-widget-v4 (151 total).
Native analysis and web type/lint checks pass. Five browser scenarios pass in
reader-browser-v3 at384/1440 widths, with four inspected screenshots and no
serious/critical accessibility findings. Visual inspection caught and fixed the
receipt header contrast on dark pages; a native check caught hidden purchase-only
payout metrics. Fixed vectors now reject sub-millisecond dates on both platforms.
These are synthetic reader proofs, not purchase writer/device acceptance.

The read-only `ProductPurchaseBaselineV1` gate passes in baseline-1791425138053:
live429 matches retained429 after the governed column-order reconciliation,
1,170 security objects match, source431 hashes are unchanged, and no writes occur.
The exact pending files remain deferred receipt delivery and cost evidence.
The additive migration20261008021000 implements the purchase-only v4 writer,
default-off control, strict receipt validation, compatible book dispatch and
explicit exclusion from sale-cost capture. The existing sale branch and capture
body are preserved byte-for-byte outside the new dispatch; five scope tests pass.
No earlier migration changed. SHA256:
`f5aed7be276c0dca27a2778ee23954a8412fbe678d42f8508b63e91c646f62b0`.

Fresh full432 replay/no-op push passes in full-432-v1. Read-only SQL parity passes
20 cases plus book-association and privilege/default-off checks. Authenticated
rpc-1791425789014 verifies concurrent identical completion, changed reuse rejection,
other-owner isolation, rollback on the last invalid printing, zero cost, mixed
quick/canonical items, 50 distinct incoming copies, feature-off recovery and a
legacy sale after purchase. Three purchases created53 synthetic copies; only the
subsequent sale produced a sale-cost snapshot. All local controls were restored
off. These fixture rows and journals are retained; never reset this populated lab.
Idempotency-1791425831569 passes with zero schema diff,1,196 security objects and
all captured rows unchanged after reapplying the same candidate locally.

The fresh retained431 upgrade passes with the retained copies/book unchanged,
zero schema difference and1,196 matching security definitions. Backend/readers
commit `2dff3ad7197c876fb30cfd34eb81d8f494381d3d` passes the normal hook in
checks-1791425963854:7,640 contracts (10 skipped), web types/lint/build, native
analysis and1,587 native tests (three skipped). Read-only full432 checks retain
all53 copies and two users. The source/lab check freeze is lifted. Preserve failed preflight
attempts and all prior labs. An occupied subnet rejected before fixture creation;
the subsequent fresh preparation uses10.246.69/70, DB33280/33300, Auth33281/33301.

Web Buy entry now extends SalesDesk with the same owner journal, held-deal queue
and v4 completion/recovery route. Purchase drafts upgrade that book to version3,
retaining prior sale drafts and pending requests; older clients reject the new
version. Catalog incoming items require an exact printing and condition and
explicitly opt into atomic intake at purchase completion. Quick lines cannot
create inventory. Optional percentage suggestions never overwrite an agreed
amount; private reference fields stay outside the seller preview. The payout
review requires explicit exchange confirmation. A bound receipt is required on
both completion and reload recovery. The web UI is committed at4edf35efc.

The final focused model/environment run passes97 cases and the refreshed,
semantically unchanged51 vectors pass52 native tests. The only vector-fixture
change is the web model hash after exposing existing validators. Web lint/types
pass. All20 browser/workspace scenarios pass in ui-browser-v4, including manual
override, zero cost, printing/intake choice, all payout methods, split balance,
held-sale preservation, failed local stage, exact retry, feature-off recovery and
late-response/account isolation. Two phone/desktop renders were inspected, with
no serious/critical accessibility findings. Initial browser failures were selector
ambiguity, the fixture sign-out button behind the mobile dock (keyboard activation
is used), and a checkbox assertion before its durable write had settled.

Actual browser-to-API proof passes in web-runtime-1791427528551. It uses real local
Auth and the actual account page, catalog search, printing options and purchase
writer. A held offer creates no inventory. Completion creates one USD6.50 copy
and one immutable receipt. The response is deliberately dropped after real commit;
reload with purchase/cart/cloud controls off recovers it. An identical POST returns
the same receipt; changed payload and wrong-owner requests reject. Sign-out clears
private content and invalidates authenticated reads. All13 prior-table snapshots
are preserved and all controls restored off. Four final runtime screens inspected.

Failed runtime fixtures are retained: the first hit the staging target guard;
the second harness closed the browser before the response handler settled and
requires its explicit rescue.json (zero purchases, flags restored,13 tables kept);
the third completed the purchase/recovery proof but expected one particular closed
heading while Next dev reloaded to the valid sign-in-required state. The final run
checks content removal,401 reads and closed/sign-in states. Full432 now retains55
copies and six synthetic accounts. No consumed intent was replayed or reset.

The new purchase-only local-test flag admits only127.0.0.1:33281 and rejects mixed
modes, hosted deployment, enabled telemetry and production release. Existing cost
guards still pass. The web normal-hook outcome belongs to the external checkpoint;
freeze this source and full432 while it runs.

The web normal hook passes in checks-1791427684423 at4edf35efc:7,657 contracts
(10 skipped), web types/lint/build, analysis and1,587 native tests (three skipped).
Its source/lab freeze is lifted. Native Buy now uses the existing owner draft and
pending-request keys, with book version2 and explicit purchase discrimination.
The service serializes purchase/catalog stages, verifies durable readback, rejects
changed pending requests, dispatches v4 explicitly and binds recovered receipts.
The native screen adds canonical/quick purchase entry, manual agreed prices and
optional suggestions, held offers, seller view, contact selection, split payouts,
explicit exchange confirmation and account-bound recovery. No early intake occurs.

All128 focused model/service/widget/regression tests pass in native-focused-v5,
including false storage success, competing stages, revision conflicts, malformed
acknowledgements and late owner replies. Native analysis passes. The later privacy
fix passes13 native cases and20 browser/workspace scenarios. Visual inspection
found private references readable behind the seller dialog's dim backdrop; both
native seller/customer views and web customer displays now use opaque backdrops.

Actual Samsung acceptance passes in device-1791429725795 with locked build412.
The real local web resolver33451 and Supabase33281 supply search/printing/intake.
A held offer survives reopening and creates no inventory. Completion creates two
distinct copies of the same printing with USD0.00 and USD6.50 costs and one receipt.
After a dropped response and actual process restart, all entry controls are off;
the same request recovers without another completion call. Private-safe receipt
text, opaque seller view, continuation and sign-out pass. Database readback proves
one purchase, two exact costs, zero sale snapshots and13 retained tables unchanged.
Controls are restored and servers stopped. Retain all59 copies and nine accounts.

Retain earlier attempts: device-1791429120418 failed before intake because its
native web resolver was not bound locally; restored flags and13 tables pass.
Its first build hit Maven TLS trust and the scoped truststore fixed compilation.
Device-1791429484811 passed transaction/restart proof, then visual review found
the translucent backdrop issue; its two copies and receipt remain retained.
No consumed fixture is replayed or reset. The final build includes the privacy fix.

External product_buy_20261007/CHECKPOINT.json owns the native normal-hook outcome;
freeze source/full432 while that check runs. Reusable offer policies, iOS purchase
acceptance, independent shadow/exact release gates, production activation and the
remaining overhaul are open. These local checks are not a released buy workflow.
