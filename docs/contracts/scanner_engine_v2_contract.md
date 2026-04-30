# Scanner Engine V2 Contract

## 1. Purpose

Scanner Engine V2 defines the next-generation card recognition architecture for Grookai Vault.

The goal is a hybrid scanner pipeline that can produce near-instant candidates while preserving deterministic identity rules and safe fallback behavior.

Targets:

- Near-instant candidate generation with a fast-path target under 300ms.
- Deterministic identity confirmation before any instant result is accepted.
- AI fallback for uncertain, low-quality, ambiguous, or unsupported captures.
- No added latency to confirmed fast-path results.
- No regression to the existing upload -> AI -> resolver path.

The fast path is an acceleration layer. It is not a replacement for identity contracts, resolver authority, or fallback AI.

## 2. System Overview

The Scanner Engine V2 pipeline is:

capture
-> card detection / crop
-> embedding retrieval candidate shortlist
-> deterministic verifier
-> decision
-> fallback AI when needed

Layer responsibilities:

- Capture: obtain a usable image with the full card visible.
- Card detection / crop: isolate the card region and normalize perspective enough for downstream retrieval and verification.
- Embedding retrieval: return visually similar candidate `card_print_id` values.
- Verifier: confirm or reject candidate identity using deterministic signals.
- Decision: accept exactly one verified candidate or route to fallback.
- AI fallback: run the existing slower recognition pipeline when fast-path confidence is insufficient.

The system must fail closed. Any uncertainty routes to fallback instead of returning an instant identity.

## 3. Input Requirements

Scanner Engine V2 requires capture quality before fast-path recognition is eligible.

Required input conditions:

- Full card visible within the frame.
- Upright or reliably normalizable orientation.
- Minimal glare across name, artwork, set/number, and stamp regions.
- Sufficient resolution for OCR and variant-region inspection.
- Card boundary detectable with enough confidence to crop or normalize.

Capture quality is a hard prerequisite. The engine must not compensate for poor capture by lowering identity thresholds. Bad captures must fall back, request recapture, or continue through the existing slower path.

## 4. Retrieval Layer (Embedding)

Purpose:

- Generate the top N visually similar candidate card prints from a normalized capture or crop.

Requirements:

- Use an image embedding model suited to card-level visual retrieval, such as a DINOv2, SigLIP, or comparable visual embedding class.
- Store candidate vectors in a vector store. `pgvector` is acceptable initially.
- Perform nearest-neighbor search and return a shortlist, typically top 5 to top 20.
- Return candidate identifiers and retrieval scores only.
- Support model/version metadata so candidates are comparable and testable.

Rules:

- Embedding retrieval never defines identity.
- Embedding retrieval only produces candidates.
- Retrieval output must be bounded to a candidate set for verification.
- Retrieval must not bypass deterministic verification.
- Retrieval must not be tuned only against happy-path demos; it must be evaluated on real scanner captures.

## 5. Verifier Layer (Deterministic)

Purpose:

- Confirm whether one retrieved candidate is the captured card.

Verifier signals:

- OCR: collector number, printed set abbreviation, set text, card name, and visible HP/label context when useful.
- Layout constraints: expected card frame, title region, number region, set/rarity region, and language/layout family.
- Stamp and variant region detection: Play Pokemon stamp, prerelease stamp, set-specific stamp, promo marker, special finish/variant cues, and known variant overlays.
- Candidate metadata: known card name, set code, printed number, printed total, variant key, identity domain, and allowed visible markers.

Rules:

- The verifier must reject ambiguous results.
- The verifier must not rely on fuzzy matching alone.
- The verifier must operate within the retrieval candidate set.
- The verifier must require deterministic agreement between visible capture signals and candidate metadata.
- A candidate with matching artwork but mismatched number, set, stamp, or variant must not be accepted as an instant identity.
- Missing OCR is not automatically fatal, but missing OCR plus ambiguous visual candidates must fall back.

## 6. Decision Layer

The decision layer accepts a fast-path result only when exactly one candidate passes verification confidently.

Decision rule:

IF one candidate passes deterministic verification with sufficient confidence:

-> return the candidate instantly

ELSE:

-> route to fallback AI resolver

The decision output must include enough internal reason codes for audit and tuning, such as:

- accepted_candidate
- no_candidates
- ambiguous_candidates
- ocr_mismatch
- low_confidence
- variant_uncertain
- capture_quality_failed
- image_decode_failed

Instant results must be explainable by verifier signals, not only by embedding distance.

## 7. AI Fallback

The fallback path remains the existing pipeline:

upload -> AI -> resolver

Rules:

- Fallback remains the source of truth when fast-path verification is uncertain.
- Fallback behavior must not regress while fast path is introduced.
- Fast path must not block fallback.
- Fast path must not mutate canonical identity before fallback has a chance to resolve uncertain cases.
- Existing append-only scan/result event behavior must be preserved.

Fallback is required for any unsupported, ambiguous, low-quality, or low-confidence case.

## 8. Learning Layer

After a successful high-confidence AI or resolver outcome, the system may record learning artifacts for future retrieval and verification.

Store:

- Embedding for the normalized capture or approved canonical image representation.
- OCR features observed from the successful scan.
- Confirmed `card_print_id`.
- Capture quality metadata.
- Model/version metadata for retrieval and verifier components.
- Provenance linking the learned artifact to the successful scan outcome.

Purpose:

- Improve retrieval candidate quality over time.
- Improve verifier expectations for real scanner captures.
- Build evidence from successful real-world scans without weakening identity rules.

Rules:

- Learning records must be append-only.
- Learning records must be high-confidence only.
- Learning records must not override canonical identity.
- Learning records must not train the system on failed or ambiguous scans as truth.
- Learning must be separable by model/version so bad experiments can be retired.

## 9. Performance Targets

Targets for clean captures on supported hardware/network conditions:

- Retrieval: under 150ms.
- Verifier: under 150ms.
- Total fast path: under 300ms.
- Fallback path: unchanged from current behavior, currently about 10-15 seconds.

Performance rules:

- Fast path must not add latency to accepted instant results.
- Fast path must not slow fallback materially when it cannot decide.
- Network calls in the fast path must be justified by measured latency and reliability.
- Any local/on-device step must remain bounded and observable.

## 10. Failure Rules

The system must fall back when any of these occur:

- No candidates returned.
- Candidate set is ambiguous.
- OCR contradicts candidate metadata.
- Set, number, name, stamp, or variant evidence conflicts.
- Confidence is low or not measurable.
- Capture quality is below the fast-path threshold.
- Card crop or orientation normalization fails.
- Image decode or preprocessing fails.
- Retrieval service is unavailable.
- Verifier service is unavailable.
- Candidate coverage is incomplete for the suspected card domain.

Fallback is the safe default. A failed fast-path attempt must not be treated as a failed scan.

## 11. Forbidden Behaviors

Forbidden:

- Embedding-only identity.
- Hash-only identity.
- Blind threshold tuning without real-scan evaluation.
- Skipping deterministic verification.
- Bypassing AI without confidence.
- Returning an instant match when multiple candidates remain plausible.
- Treating representative/shared artwork as exact identity.
- Treating stamp or variant rows as equivalent without visible proof.
- Training or storing learning artifacts from ambiguous outcomes as truth.
- Slowing the existing fallback path to support the fast path.

## 12. Rollout Strategy

Rollout order:

1. Camera quality stabilization.
2. ME set embedding plus verifier prototype.
3. Internal testing with real scans.
4. Expand coverage.
5. Enable fast path behind a confidence gate.

Gate requirements:

- Camera capture quality must be stable before fast-path matching is judged.
- Prototype must prove retrieval and verifier behavior separately.
- Internal test sets must include clean scans, glare, partial crops, rotated captures, stamped variants, similar artwork, and unsupported cards.
- Expansion must be by documented coverage domain, not blanket enablement.
- Fast path must remain behind a kill switch or confidence gate until no-wrong-instant-match criteria are met.

## 13. Success Criteria

Scanner Engine V2 is successful when:

- A majority of clean, supported scans resolve instantly.
- No incorrect instant matches are accepted.
- Ambiguous cases reliably fall back.
- Existing fallback remains correct.
- User experience feels like "point -> done" for supported clean captures.
- Observability can explain why each scan was accepted or routed to fallback.

Readiness for implementation requires separate implementation plans for capture quality, retrieval storage, verifier signals, decision gates, learning storage, and measurement.
