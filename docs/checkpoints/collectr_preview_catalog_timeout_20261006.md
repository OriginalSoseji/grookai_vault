# Collectr preview and padded purchase costs — October 6, 2026

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

## Padded purchase costs

A subsequent inspection distinguished formatting from actual fractional cents:
16 of the 18 cost holds contain values such as `45.0000` or `34.9900`. The shared
metadata parser now accepts zeroes beyond two decimal places while preserving
the exact amount and original source text. `4.9980`, nonzero sub-cent digits,
exponents, negative costs, malformed commas and currency conflicts still reject.
Zero still requires an explicit currency. The existing SQL writer already
accepts these exact cent amounts; no rounding or migration is needed.

The source-bound plan qualifies 16 additional rows / 50 sealed copies, with all
prior targets unchanged: 1,590 eligible copies and 562 held rows. These are planned
counts until the private live import receipt confirms an actual addition.
Real Auth/handler/SQL proof on the retained task-owned lab verifies incremental
additions, exact costs, original source, preserved prior copies and a zero-add
retry. All existing lab rows remain unchanged. Private `cost-padding` evidence
includes this proof and a fresh released sealed-catalog capture.

## Verification and release authority

PR600/main0a8737267 landed during hosted qualification. Its Sales Desk and
receipt-delivery sources are preserved in the combined candidate; the importer
implementation and its five new regression tests are unchanged. Only the shared
checkpoint notes conflicted, and both histories are retained. The private
`integrated-main-600` folder records the first qualification attempt, deliberately
stopped when the cost-format fix was added. Final combined-source normal-hook
and release receipts are under `cost-padding`.
Receipt schema, sender activation and native releases remain owned by their
separate release checkpoints; this change must not replay those operations.

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
were held for cost formatting or precision; only two contain genuine fractional
cents. Foreign-language
labels and stamped variants must not be stripped to force matches. Current
catalog evidence is required before proposing new import selections.

The preview change alone does not import held rows. The cost-format correction
can qualify the 16 exact matches for a separate verified incremental save after
release. Retain the original CSV and every existing source mapping.
