# Phase 7A Fingerprint Index Contract V1

## 1. System Purpose

Phase 7A MUST provide a canonical card fingerprint index that enables scanner recognition through `capture -> hash -> lookup -> instant match` while preserving `capture -> upload -> AI -> resolver` as the fallback path.

## 2. Required Data Model

The fingerprint index data model MUST contain the following fields:

- `card_print_id`
  - REQUIRED.
  - MUST anchor every fingerprint row to a canonical card print.
- `source_type`
  - REQUIRED.
  - MUST be one of: `exact`, `alt`, `representative`.
- `hash_d`
  - REQUIRED.
  - MUST store the primary perceptual dHash value.
- `hash_norm`
  - OPTIONAL.
  - MUST store the normalized scanner-compatible hash when available.
- `algorithm_version`
  - REQUIRED.
  - MUST identify the hash algorithm and preprocessing contract used.
- `computed_at`
  - REQUIRED.
  - MUST record when the fingerprint was computed.
- `image_source`
  - MUST identify the image origin when available.
- `is_exact_image`
  - REQUIRED boolean.
  - MUST indicate whether the source image is exact-authority imagery.
- `is_representative`
  - REQUIRED boolean.
  - MUST indicate whether the source image is representative or fallback imagery.
- `is_verified`
  - REQUIRED boolean.
  - MUST indicate whether the fingerprint row is eligible for lookup.

## 3. Data Rules

- The system MUST support multiple fingerprints per `card_print_id`.
- The system MUST be append-only for fingerprint generation and MUST NOT overwrite existing fingerprint rows.
- The system MUST NOT store only one fingerprint per card.
- The system MUST differentiate exact, alternate, and representative image sources.
- The system MUST NOT treat representative imagery as exact imagery.
- The system MUST keep the fingerprint index separate from identity, pricing, ingestion, and condition fingerprint binding data.

## 4. Generation Rules

- Generation MUST read canonical card rows from `card_prints`.
- Generation MUST use `card_prints.image_url` OR `card_prints.image_alt_url` as Phase 7A image inputs.
- Generation MUST NOT run inside ingestion workers.
- Generation MUST run as an independent backend worker.
- Generation MUST skip representative images in Phase 7A.
- Generation MUST NOT mutate identity keys, resolver contracts, card print schema, pricing rows, or ingestion rows.

## 5. Lookup Rules

- Lookup MUST use Hamming distance for perceptual hash similarity.
- Lookup MUST NOT use numeric subtraction distance as the similarity measure.
- Lookup MUST return multiple candidates when multiple candidates satisfy the threshold.
- Lookup MUST apply threshold filtering before returning match candidates.
- Lookup output MUST include:
  - `candidates`
  - `confidence`
  - `ambiguous`
- Lookup MUST filter out representative fingerprints in Phase 7A.
- Lookup MUST filter out unverified fingerprint rows.

## 6. Scanner Integration Rules

- Scanner fingerprint lookup MUST run before upload.
- Scanner integration MUST skip AI only if all of the following are true:
  - `confidence == high`
  - `ambiguous == false`
  - `candidates` exist
- Scanner integration MUST fall back to the existing AI identity path otherwise.
- Scanner integration MUST NOT break the existing upload, AI, resolver, and result path.
- Scanner integration MUST treat fingerprint matches as a fast-path signal, not as a replacement for identity contracts.

## 7. Failure Rules

The fingerprint system MUST fail closed and fall back to the existing AI path on:

- no local hash
- no match
- lookup function unavailable
- low confidence
- medium confidence
- ambiguity
- representative-only candidates
- unverified fingerprint rows
- lookup errors

## 8. Forbidden Behaviors

- MUST NOT modify `card_prints`.
- MUST NOT mutate existing schema except through additive fingerprint-index schema.
- MUST NOT reuse `fingerprint_bindings`.
- MUST NOT treat fingerprint data as identity truth.
- MUST NOT block the ingestion pipeline.
- MUST NOT run inside TCGdex, PokemonAPI, JustTCG, or pricing ingestion.
- MUST NOT treat representative images as exact scanner confirmations.

## 9. Validation Requirements

- A valid implementation MUST create a separate fingerprint index anchored to `card_print_id`.
- A valid implementation MUST preserve the existing scanner fallback path.
- A valid implementation MUST use Hamming distance for lookup ranking and thresholding.
- A valid implementation MUST exclude representative and unverified rows from Phase 7A fast-path confirmation.
- A valid implementation MUST keep generation independent from ingestion workers.
