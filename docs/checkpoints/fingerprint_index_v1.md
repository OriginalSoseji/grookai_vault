# Fingerprint Index V1 Checkpoint

## Why This System Exists

Phase 7A adds a canonical card fingerprint index so the scanner can resolve a captured card from a local perceptual hash before using the upload, border, AI identity, and resolver pipeline.

The target path is:

capture -> hash -> lookup -> instant match

The existing identity path remains the fallback:

capture -> upload -> AI -> resolver

## Why It Is Separate From Ingestion

Fingerprint generation is not part of TCGdex, PokemonAPI, JustTCG, or pricing ingestion.

Ingestion owns source discovery and canonical row normalization. The fingerprint index is a derived backend-highway artifact anchored to `card_print_id`. Keeping it separate prevents image processing failures, network fetch failures, or hash threshold changes from blocking catalog or pricing ingestion.

## Identity vs Fingerprint Separation

Identity contracts continue to own card identity resolution, ambiguity handling, AI hints, and scan event results.

The fingerprint index stores visual hashes only. It does not mutate identity keys, resolver contracts, card print schema, pricing rows, or ingestion rows. Scanner integration may short-circuit only when lookup confidence is high and ambiguity is low.

## Exact vs Representative Rules

Phase 7A indexes exact and alternate canonical image URLs from `card_prints.image_url` and `card_prints.image_alt_url`.

Representative images are low trust. The Phase 7A worker does not populate representative rows, and lookup filters out `source_type = 'representative'` and `is_representative = true`.

Future representative support must stay in a separate low-authority lane and must not be treated as an exact scanner confirmation without a new contract.

## Performance Expectations

The scanner fast path should keep lookup latency under 200 ms in normal operation.

The Phase 7A table includes indexes on `card_print_id`, `hash_d`, and `hash_norm`. The initial lookup uses indexed exact, one-bit, and narrow range candidate retrieval, then ranks candidates by Hamming distance in the Edge Function.

Future optimization is explicitly outside Phase 7A:

- bitwise Hamming search in database
- locality-sensitive hashing
- vector database indexing

## Failure Modes

The fingerprint system must fail closed.

Allowed fallback cases:

- no local hash
- lookup function unavailable
- no candidates
- low or medium confidence
- ambiguous nearest candidates
- representative-only candidates
- unverified fingerprint rows

In all fallback cases, the scanner continues through the existing upload, AI, resolver, and result path.

## Verification Targets

- Migration applies cleanly and creates only `public.card_fingerprint_index`.
- Batch worker reads canonical `card_prints` rows and writes only the new index table.
- Worker skips existing fingerprints and representative-status rows.
- Lookup returns `{ candidates, confidence, ambiguous }`.
- Scanner skips upload only for high-confidence, non-ambiguous lookup results.
- Scanner fallback path remains unchanged for all misses and failures.
