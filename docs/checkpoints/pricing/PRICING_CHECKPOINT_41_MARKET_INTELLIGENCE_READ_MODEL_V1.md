# Pricing Checkpoint 41: Market Intelligence Read Model V1

## Context

The Market Evidence Engine held millions of active-listing observations and
hundreds of thousands of deterministic printing assignments, but the collector
product used only TCGPlayer Market. The active-ask materialized snapshot was
empty, and the existing shared pricing RPC exposed only a lowest ask when a
TCGPlayer Market row also existed.

## Problem

Existing evidence could not answer basic signed-in collector questions such as:

- What is the lowest exact-printing active ask today?
- What is the median ask?
- How many listings and distinct sellers support the range?
- How far is the lowest ask from the median?
- How fresh and dense is the evidence?

The newest acquisition runs also had no variant-assignment sidecars because the
legacy backfill scanned the full warehouse and had not completed after recent
ingestion.

## Risk

- Active asks could be mislabeled as completed sales or market value.
- Parent-card evidence could be shown for the wrong printing or finish.
- Product requests could scan the raw listing warehouse.
- A broad backfill could create an unbounded production write.
- Deferred pricing migrations could be applied accidentally by a broad push.
- Currency floating-point artifacts could suppress otherwise valid rows.

## Decision

Production V1 keeps TCGPlayer `marketPrice` as the market-close authority.

A separate authenticated interface,
`get_market_intelligence_read_model_v1(uuid[], uuid[])`, exposes exact-printing
eBay active asks from the replaceable materialized snapshot only. It reports
lowest and median ask, listing and seller counts, spread, freshness, and evidence
strength. Every returned row declares:

```text
source_name = ebay_active
evidence_kind = active_listing_ask
is_market_value = false
is_completed_sale = false
```

The signed-in card-pricing API returns TCGPlayer Market and market intelligence
as independent records. The card page labels the new lane `Available Today` and
states that it is asking-price evidence, not a sale, market close, or market
value.

## Alternatives Rejected

- Replacing TCGPlayer Market with an active ask.
- Creating Grookai Value from listing evidence.
- Reading raw warehouse tables inside a customer request.
- Exposing the snapshot directly to anonymous or authenticated clients.
- Applying all locally pending migrations with `--include-all`.
- Running the legacy full-warehouse assignment backfill for the first proof.
- Treating a zero-row snapshot as proof that no evidence existed.

## Frozen Implementation

Current-main integration branch:

```text
agent/market-intelligence-main-integration
```

Integrated implementation commit at checkpoint creation:

```text
eb76f08ac
```

The branch was created from current `origin/main` at:

```text
0cacd5fd89a46e88df1734da85badb478728ca0f
```

## Migrations Applied

Production migration ledger now includes:

| Migration | Purpose | Source commit | SHA-256 |
| --- | --- | --- | --- |
| `20260803183000` | authenticated exact-printing market-intelligence RPC | `159f6e548d29e575e0bdd4995b80e1febe8ab5f8` | `301ac9553692b181ec6dcc9e965244894d3f551e76e9aa261a6d65a630d222b3` |
| `20260803190000` | normalize positive USD active asks to cents | `66528efc3e0759d02763264a3239383fec54c05f` | `deed156109c4c67dac696e5cefdea673c478241b62fb0effb81e43bf14b84c69` |

Both were targeted, additive applies. Deferred older migrations remained
untouched. No canonical identity, source evidence, price publication, Vault, or
ownership rows were changed by either migration.

## Assignment Proof

The bounded proof used completed acquisition run:

```text
2f75dd94-8f1f-ec38-a66e-bd816965741d
MEE-11L-DAILY-BATCH-b040d39fa851
```

Dry-run and apply reconciled the same frozen candidate selection:

```text
selected rows: 7,088
selection SHA-256: 64fe9d5df5df2be205fcd930f36818fab5bb277c827d192a50f62fbf4f3431bc
exact_child_finish: 4,478
single_child_inferred: 321
unknown_finish_needs_review: 2,145
no_matching_child_finish: 144
```

Every inserted sidecar row remained:

```text
needs_review = true
publishable = false
app_visible = false
market_truth = false
```

Boundary leak rows: `0`.

Permanent operational artifacts on the MEE host:

```text
/var/lib/grookai/market-intelligence/variant-assignment/2026-08-03T18-40-43-537Z
/var/lib/grookai/market-intelligence/variant-assignment/2026-08-03T18-41-08-221Z
```

## Snapshot And Read Model Proof

The final cache refresh completed in `211.5` seconds under:

```text
statement_timeout = 20min
enable_nestloop = off
```

Final production readback:

```text
snapshot rows: 527
distinct parent cards: 377
non-USD rows: 0
invalid rows: 0
stale rows: 0
```

The RPC returned `500/500` requested available rows with:

```text
market value claims: 0
completed sale claims: 0
authority mismatches: 0
```

A 25-printing direct production RPC proof completed in approximately `217 ms`.

Final refresh artifact:

```text
/var/lib/grookai/market-intelligence/active-ask-refresh/2026-08-03T18-47-09-840Z
```

## Schema And Security Readback

- Function exists with a hardened catalog-first search path.
- `anon`: execute denied.
- `authenticated`: execute granted.
- `service_role`: execute granted.
- Raw warehouse and snapshot reads remain service-only.
- The RPC is bounded to `500` requested printings.
- Stale, invalid, non-USD, and non-positive evidence is unavailable.

## Verification

Current-main integration verification passed:

```text
relevant pricing/MEE contracts: 749/749
Node syntax checks: passed
TypeScript: passed
ESLint: passed
Next.js production build: passed
git diff --check: passed
```

The credential-dependent full pre-commit shipcheck was not run from the local
clean worktree because it intentionally contains no production database secret.
Production schema and data boundaries were verified separately through the
protected MEE host environment.

## Current Truths

- The production database read model is functional and nonempty.
- Existing source evidence was reused; no provider acquisition was purchased.
- The first bounded data slice covers 527 exact printings across 377 cards.
- TCGPlayer Market remains unchanged and authoritative for Production V1.
- The web implementation is build-clean on current main.
- The active MEE timer and its scheduled activation were not changed by this
  work.
- The incremental assignment worker is proven for one completed acquisition
  run but is not yet installed as the authoritative nightly assignment step.

## What Must Never Be Broken

1. Active asks never become market value, completed sales, or TCGPlayer Market.
2. Active asks are exact-printing and exact-finish only.
3. Customer requests never scan raw listing warehouse tables.
4. Anonymous users cannot execute the market-intelligence RPC.
5. Sidecar assignment writes remain review-gated and non-public.
6. Missing or stale evidence renders as unavailable, never zero or fabricated.
7. Deferred migrations are not pulled into a broad apply.
8. Canonical identity and existing pricing publication rows remain untouched.

## Explicit Next Gate

1. Push the current-main integration branch once.
2. Let required GitHub checks and the Vercel preview complete.
3. Merge through the governed repository path.
4. Verify a signed-in production card with one of the 527 exact-printing rows.
5. Confirm the selected finish changes the active-ask record without fallback to
   another printing.
6. Promote the incremental assignment worker into the post-ingest schedule only
   after an offline and bounded latest-run canary.
7. Expand assignment coverage in bounded acquisition-run batches; do not rerun
   provider ingestion solely for market-intelligence population.
