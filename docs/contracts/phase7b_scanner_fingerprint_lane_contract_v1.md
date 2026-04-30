# Phase 7B Scanner Fingerprint Lane Contract V1

## 1. Purpose

Phase 7B MUST provide a scanner fingerprint lane that matches real or realistic scanner captures, not pristine canonical card images, while preserving the existing canonical fingerprint lane and AI/resolver fallback path.

## 2. Required Lanes

The scanner fingerprint system MUST support both of these lanes:

- `synthetic`
  - Generated from canonical images using scanner-like transforms.
  - MUST approximate camera, crop, warp, lighting, and compression effects.
  - MUST be generated outside ingestion workers.
- `real_scan`
  - Learned from real scanner captures only after the existing AI/resolver path confirms a `card_print_id`.
  - MUST be treated as AI-backed learned evidence, not identity truth.

The system MUST support multiple scanner fingerprint rows per `card_print_id`.

## 3. No-Latency Rule

- Fast lookup MAY run before upload.
- Fast lookup MUST fail closed to canonical lookup and/or the existing upload -> AI -> resolver path.
- Learning writes MUST happen only after AI/resolver success.
- Learning writes MUST NOT block scan result delivery.
- No extra blocking API call, worker step, remote fetch, or database write MAY be added to the critical scan result path.
- Scanner fingerprint learning MAY run as fire-and-forget backend work or an async follow-up job after the result has already been persisted.

## 4. Required Data Model

A scanner fingerprint lane row MUST contain:

- `card_print_id`
  - REQUIRED.
  - MUST anchor every row to `card_prints.id`.
- `hash_d`
  - REQUIRED.
  - MUST store the primary scanner-lane perceptual hash.
- `hash_norm`
  - OPTIONAL.
  - MAY store a second normalized scanner-lane hash when available.
- `algorithm_version`
  - REQUIRED.
  - MUST identify the scanner-lane preprocessing and hash algorithm.
- `source_type`
  - REQUIRED.
  - MUST be one of: `synthetic`, `real_scan`.
- `source_detail`
  - REQUIRED.
  - MUST describe safe provenance without secrets or raw image payloads.
- `is_verified`
  - REQUIRED boolean.
  - MUST control lookup eligibility.
- `created_at`
  - REQUIRED.
  - MUST record when the row was created.

The data model MUST be additive and MUST NOT modify `card_prints`.

## 5. Bootstrap Rule

- Synthetic scanner fingerprints MUST be generated from canonical `card_prints.image_url` or `card_prints.image_alt_url`.
- Bootstrap MUST start with ME sets before expanding to the full catalog.
- Bootstrap MUST NOT use representative images.
- Bootstrap MUST NOT mutate identity, resolver, pricing, ingestion, or `card_prints` data.
- Bootstrap MUST write only scanner-lane fingerprint rows.
- Bootstrap MUST use a distinct `algorithm_version` from Phase 7A canonical fingerprints.

## 6. Learning Rule

- Real scanner fingerprints MUST be stored only after the existing AI/resolver pipeline confirms a `card_print_id`.
- Real scanner fingerprint learning MUST require a high-confidence resolver outcome.
- Fingerprint data MUST NEVER define identity.
- Learned fingerprints MUST be append-only or duplicate-skipped; they MUST NOT overwrite existing scanner fingerprint rows.
- Failed, ambiguous, low-confidence, medium-confidence, or no-candidate AI/resolver outcomes MUST NOT create verified `real_scan` rows.
- Learning MUST NOT alter the scan result contract.

## 7. Lookup Rule

- Scanner lane lookup MUST be checked before the canonical lane.
- Scanner lane lookup MUST use Hamming distance.
- Scanner lane lookup MUST return multiple candidates when multiple scanner candidates satisfy threshold.
- Scanner lane lookup MAY short-circuit only if:
  - candidates exist
  - confidence is high
  - ambiguous is false
  - candidate rows are verified
- If scanner lane lookup has no safe match, the system MUST fall back to the canonical lane and/or the existing AI path.
- Canonical lane fallback MUST remain available.
- No threshold increase is allowed without calibration evidence.

## 8. Calibration Requirement

Before scanner-lane thresholds are promoted:

- Calibration MUST report distance distributions for confirmed canonical/physical pairs.
- Calibration MUST include true-match and nearest-wrong-match distances.
- Calibration MUST include ambiguity rates.
- Calibration MUST identify the tested `algorithm_version`.
- Calibration MUST be run on ME sets first.
- Calibration MUST prove that proposed thresholds do not create incorrect high-confidence matches.

## 9. Failure Rules

The scanner lane MUST fail closed and fall back on:

- no scanner hash
- no scanner-lane candidates
- low confidence
- medium confidence
- ambiguity
- unverified rows
- lookup errors
- malformed hash input
- scanner-lane table unavailable
- calibration not complete for the active `algorithm_version`

## 10. Forbidden Behaviors

- MUST NOT blindly increase thresholds.
- MUST NOT use representative images for scanner confirmation.
- MUST NOT couple scanner fingerprint generation to TCGdex, PokemonAPI, JustTCG, pricing, or ingestion workers.
- MUST NOT add latency to scan result delivery.
- MUST NOT mutate `card_prints`.
- MUST NOT reuse `fingerprint_bindings`.
- MUST NOT treat fingerprints as identity truth.
- MUST NOT replace the AI/resolver fallback path.
- MUST NOT create verified `real_scan` fingerprints from ambiguous or low-confidence outcomes.

## 11. Validation Requirements

A valid Phase 7B implementation MUST demonstrate:

- Synthetic scanner fingerprints exist for ME sets.
- AI-confirmed real scan fingerprints can be learned after fallback success.
- Scanner-lane lookup runs before canonical lookup.
- Scanner-lane lookup falls back safely when no high-confidence unambiguous match exists.
- Existing canonical lookup remains intact.
- Existing upload -> AI -> resolver -> result flow remains intact.
- No additional blocking work is added before scan result delivery.
- Thresholds are backed by calibration evidence.
