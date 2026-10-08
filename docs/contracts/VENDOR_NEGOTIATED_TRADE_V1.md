# Negotiated trade consideration

This is the next CR-07 implementation scope, not a release receipt. Read
VENDOR_OFFER_POLICIES_V1 and VENDOR_PURCHASE_V1. The read-only baseline at
product_offer_policy_20261007/baseline-1791434818799 compares production429 with
source432: all1170 security definitions match and normalized drift is zero.
The three deferred local migrations remain separate from production authority.
No new migration has been applied or activated by this contract.

## Additive authority

Introduce vendor_sales_cart_complete_v5 with request version5 for a sale with
negotiated trade consideration. Require1–50 outgoing lines and1–50 incoming
trade lines. Incoming-only purchases continue through v4. Preserve v1–v4 writer
definitions, old pending payloads and historical receipts. Never encode a chosen
credit by altering a reference value, rate, outgoing sale or tax.

The new writer uses the existing owner receipt-book lock, durable request journal,
printing eligibility reader, copy creator, outgoing disposition and external
payment validator. Recovery returns an identical previously committed request
before checking new-entry controls. Changed reuse rejects. A separate default-off
control governs new negotiated trades and depends on the existing sale, trade
and external-payment capabilities. Switch-off leaves recovery and reading intact.

## Exact incoming terms

A request trade line has the existing eight fields plus explicit creditMinor.
creditMinor is the agreed whole-line USD amount, an integer0–100,000,000. It is
never recomputed from a policy. Quantity is1–999; a canonical line has quantity1,
one exact card/printing/condition and explicit addToVault. A quick line cannot
create inventory or claim canonical identity. No draft or preview writes stock.

valueMinor and rateBps are either both null or both present. A present reference
is positive integer USD cents up to100,000,000 and a rate is1–10,000 basis points.
Known reference extensions and their sum remain bounded at100,000,000. Missing
references remain unknown. Policies may propose credit using exact whole-line
rounding and an inclusive per-unit tier, but a direct manual agreement needs no
reference. Choosing a default, refreshing a quote or changing quantity does not
silently replace an existing agreed amount. An explicit suggestion action does.

The sum of agreed credits is bounded at100,000,000. Balance equals outgoing sales
including tax minus that sum. Existing payment snapshots must reconcile positive,
zero and negative balances exactly, including split methods and cash change.
Trade consideration is part of this exchange, never a transferable balance.

## Receipt, costs and privacy

Keep the sale receipt envelope version1; tradeIn version2 is the explicit new
semantic discriminator. Its five fields remain version, items, totalValueMinor,
totalCreditMinor and balanceMinor. Recorded items retain their12 fields; creditMinor
now means explicit agreed credit and optional reference/rate can be null.
totalValueMinor is null if any item lacks reference evidence; otherwise it equals
the bounded extended reference sum. Never substitute zero or a partial known sum.
Version1 snapshots retain their strict derived-credit equality check.

The server records each newly created canonical copy's agreed credit as explicit
USD acquisition cost in the same transaction, independently of the later cost
editor switch. Zero credit is a known zero cost. It does not retroactively infer
cost for old trades. The existing sale-cost trigger still records outgoing
cost-at-sale evidence. Preserve prior cost requests and snapshots unchanged.

Private receipt/backup readers preserve optional reference evidence without
asserting it is a provider-certified price. Customer-facing deal and share views
show descriptions, quantities, agreed credit, sales and settlement. They omit
private policies, reference percentages, contacts, notes and inventory identifiers;
an opaque presentation must also conceal the underlying private desk.

## Reader and journal rollout

Deploy strict compatible web/native/cloud readers before enabling v5 entry.
Book validation dispatches trade snapshot versions explicitly and rejects unknown
versions. Text, print, export, import, customer history, reports, profit and
payment summaries must accept mixed old/new books. Incoming credits remain
consideration and acquisition costs; do not count them as additional sales or
event expenses. Missing reference totals must never become displayed zero.

Use a distinct negotiated-trade draft discriminator and an additive version of
each existing owner journal, retaining its key, all held deals and pending
requests. Old clients must reject unsupported books rather than derive a
different credit. Existing held trades are not silently upgraded or repriced.
Preserve the exact v5 request with verified storage acknowledgement before RPC.
Bind every returned or recovered receipt to that full request, including agreed
credit and external settlement. Failed storage, changed account, uncertain
outcome or mismatched reply cannot authorize a replacement request.

## Required evidence

Shared JS/Dart/SQL fixtures cover explicit credit above/below its suggestion,
rounding to zero, no reference, mixed unknown totals, quantities, every amount
boundary and malformed fields. Retain version1 vectors and exact request bytes.
Prove default/manual/held behavior and source/condition review on web and native.

Authenticated local tests must prove canonical identity and owner isolation,
last-line rollback, exact acquired costs, outgoing cost snapshots, concurrent
identical/changed retries, feature-off recovery and mixed receipt-book round trips.
Perform real browser and Samsung restart journeys; iOS remains separately
qualified. Fresh replay, retained upgrade, shadow comparison, ordinary hooks and
the exact release gate precede any activation. Never reset a populated lab or
reuse a consumed test request. Measure workflow speed before claiming an advantage.
