# Cash and trade offer policies

This continues CR-07 after qualified named presets atf5d5b69a. Preserve that
candidate, all owner journals and immutable receipts. Policies propose terms;
the existing transaction ledger remains authoritative for agreed amounts.

## Policy and settings

Use version2 of the existing owner-local offer settings key. Read version1
percentage presets without writing: convert each to a cash policy, manual
reference, unspecified condition basis, nearest-cent rounding, no tier and no
default. Explicit saves upgrade to version2; older clients reject it. Preserve
revision conflicts, serialization, verified readback, owner closure and malformed
raw data. Keep20 policies maximum. Optional cash/trade default IDs must refer to
policies of the corresponding intent. Deleting a default clears that default;
no other policy is silently substituted. No cloud synchronization is implied.

A policy contains UUID, name, intent cash/trade, percentage, reference source,
condition basis, rounding and an optional low-value tier. Sources are manual
reference and the existing governed TCGPlayer Market reader. Do not revive
retired reference pricing, convert an outbound provider link into a quote, use
active asks as sold evidence, or fetch raw publication tables. Market evidence
must retain exact parent/printing identity, provenance and both timestamps.
Its condition is unspecified; do not present it as a condition-adjusted value.

Condition basis is selected item condition, an explicit raw condition, or
unspecified. Missing/mismatched basis cannot silently fall back. An explicitly
chosen different or unspecified condition basis requires a visible review before
use. Never adjust a price between conditions or borrow an unrelated printing.
Missing, stale, future, non-USD or unqualified evidence produces no offer.
Manual evidence is labelled entered by the vendor, never provider-verified.

## Exact proposal arithmetic

Percentages use integer basis points from1 to10,000. References use positive
integer USD cents up to100,000,000. The optional tier specifies an inclusive
per-unit reference ceiling and alternate percentage. Quantity does not change
which tier applies. Rounding increments are1,5,10,25,50 or100 cents, with either
down or nearest/half-up rounding. Round the exact rational amount once to the
chosen increment; do not first round to cents and then round that result again.

Cash suggestions are per unit, then extended by quantity. Trade suggestions are
per extended line, retaining the existing trade calculation convention. Display
reference, effective percentage/tier, calculated amount, rounded proposal and
negotiated amount with the appropriate unit/line labels. Totals must stay within
the existing transaction limits. Zero from rounding is explicit, not missing.

Applying a default or choosing a policy fills proposal settings only. It cannot
overwrite an agreed amount. Use suggested offer remains an explicit action.
Editing/deleting a policy never reprices held lines, unresolved requests or old
receipts. Every item/deal can bypass policies and use manual terms.

## Trade completion boundary

Current v2/v3 trade writers derive credit from value, quantity and percentage;
they have no independent negotiated credit field. Do not manufacture a desired
credit by falsifying its reference value or percentage. Full negotiated trade
support requires additive, strict request/receipt semantics with compatible
readers, default-off entry, exact bound recovery and the existing book lock,
intake/disposition and cost authority. Preserve old writer meanings and snapshots.
Use a fresh governed schema baseline before that backend change. Trade credit
remains consideration in the deal, never a stored balance or payment processor.

## Exit evidence

Cross-platform fixed vectors must cover rounding boundaries, cash/trade quantity
differences, inclusive tiers, missing source, exact-printing and condition mismatch,
stale/future evidence, limits and immutable inputs. Prove version1 migration,
defaults/deletion, concurrent edits, failed storage and account changes. Verify
web/native UI and actual restart recovery without repricing held or completed
deals. Full trade writer changes also require SQL/Auth rollback/idempotency,
printing/owner isolation, compatible receipt/report/export readers and full
release qualification. Measure the ten-card buy workflow before claiming a
speed advantage over DeckTradr. This contract is scope, not completion evidence.
