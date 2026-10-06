# Collectr preview catalog timeout — October 6, 2026

## Problem and change

The successful USD import is already saved and verified. Do not replay it.
The next review exposed a separate `card_prints` preview failure: PostgreSQL
57014 (statement timeout). The previous reader sorted UUIDs across up to 100
sets, applying catalog visibility to thousands of records before returning
each page. Read-only production EXPLAIN confirmed the broad bitmap scan/sort.

The website preview now reads one indexed set at a time, with at most four
reads in flight. Every set still pages until empty, including under smaller
server row caps. A failed, repeated or unrelated page fails the entire preview;
outstanding reads settle before rejection, and later batches do not start.
Candidate ordering retains the original 100-set partition and UUID order.

Set-name normalization is reused per game. Identity evidence is fetched only
for numbers requested in that specific set, rather than numbers appearing
anywhere in the file. Matching, grade/edition/finish rules, saved source groups,
money precision, RLS, writer and receipt recovery are unchanged. No schema work.

## Verification and release authority

- Focused preview tests include 105 sets, capped pages, complete ambiguity
  choices, deterministic order, bounded concurrency and interrupted reads.
- The original 1,872-row export produces exactly equal before/after preview
  objects on the retained catalog: all source fields, selections, finishes,
  review candidates and ordering, including 1,375 eligible card copies.
- Read-only live evidence and measurements are private under
  `C:/grookai_vault_operator_artifacts/collectr_remaining_review_20261006`.
  Initial single-set measurement completed the full preview; the `optimized`
  subdirectory records the final implementation's measurement and parity.
- The same directory's `CHECKPOINT.json` records actual test/release outcomes.
  Source implementation and production read probes are not deployment proof.

## Remaining collection review

The verified saved import accounts for 1,540 copies, including the 165 sealed
additions. The historical source-bound review classification contains 578 rows:
253 without exact card matches; 119 ambiguous identities; 64 grade/game/number
holds; 57 finish/edition holds; and 85 sealed-path holds. Eighteen sealed rows
have fractional-cent costs, which must not be silently rounded. Foreign-language
labels and stamped variants must not be stripped to force matches. Current
catalog evidence is required before proposing new import selections.

This preview repair does not import any of those held rows or resolve their
physical identities. Retain the original CSV and every existing source mapping.
