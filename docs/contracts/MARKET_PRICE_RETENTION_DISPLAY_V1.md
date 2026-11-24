# MARKET_PRICE_RETENTION_DISPLAY_V1

Status: Active product rule; database rollout pending.
Owner instruction: November 23, 2026 — pricing must remain visible even when old,
with a transparent last-updated timestamp.

## Display rule

Age alone must never remove a previously qualified TCGPlayer Market price from
card detail, grids, Search, Compare, Vault, or other web and native price surfaces.
Show the most recent qualified exact-printing price that was actually published
through an accepted production publication. Retain it without an age cutoff until
a newer qualified price replaces it. A missing/null quote in a newer generation
must not erase a prior published quote. Never expose failed, shadow-only, staging,
rolled-back, or otherwise unaccepted publications as a retained price.

An old price keeps its original amount, currency, exact identity, source timestamp,
publication timestamp, and provenance. Return `status = available` and
`freshness = stale` once its source is older than 36 hours. Never relabel stale
evidence as fresh or change its timestamp because a page was loaded or a source
check reported no changes. Unknown freshness or incomplete provenance still fails
closed. Identity invalidation, hidden printing truth, and access controls remain
enforced; this rule changes age-based disappearance only.

## Transparency

Show **Last updated** using the source observation time with an unambiguous date,
year, and time zone on card detail. Label stale quotes **Last known price**.
Compact surfaces expose the original source date visibly or through an accessible
tooltip; they must not imply live data. Unknown timestamps say **Update time
unavailable**, never **Updated recently**. Publication time is a separate audit
timestamp and must not be substituted for source age.

Vault retains exact-copy values and coverage when their qualified prices age.
Duplicate copies remain independently counted; parent `From` values never become
owned-copy values. A mixed-age total must identify its update range or clearly
label a displayed date as the latest included price update, rather than claiming
that every constituent price was refreshed at that time.

## Unchanged ingestion and activation rules

New publication qualification still requires fresh, positive source quotes,
exact source/printing mappings, provenance and normal reconciliation. Retained
quotes do not count as newly refreshed coverage. The 0.1% Japanese cohort loss
guard, source freshness health alerts, exact truth reviews, and public/private
access boundaries remain in force. Do not blend condition references, low/mid/high,
active asks, guesses or stale observations into a fresh snapshot to fill a gap.

## Supersession and release

This explicitly supersedes age-based display withholding in
`TCGPLAYER_MARKET_PRICING_PRODUCT_V1`, its client bridge and reader contracts, and
the current-price display aspects of related pricing contracts. Their ingestion,
publication, exact identity, security, history, and operational rules remain
binding. Existing failed baselines remain unchanged evidence.

Implementation requires a forward reader migration, both clients, and verification
of retained exact prices across time and accepted generations. Deployment requires
normal schema qualification and release gates. This product rule grants no remote
SQL, main-merge, protection-change, or unrelated data-write authority.
