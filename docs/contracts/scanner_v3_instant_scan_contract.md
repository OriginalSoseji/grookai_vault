# Scanner V3 Instant Scan Contract

## Status

This contract supersedes Scanner V2 OCR and Phase 7 / Phase 8 fast-path authority assumptions for future scanner instant-match work. It does not change production runtime behavior by itself.

## Core Requirements

Scanner V3 instant matching MUST follow this path:

```
quality-gated camera frame
  -> scan-normalized full-card artifact
  -> stable normalized artwork crop
  -> hash / visual candidate generation
  -> deterministic confidence gate
  -> instant match or AI fallback
```

## Authority Rules

1. OCR MUST NOT be the fast-path authority.
2. Embeddings MUST NOT be the identity authority.
3. Hash MUST run only on scan-normalized, quality-gated artifacts.
4. Raw camera frames MUST NOT be used for hash identity decisions.
5. Instant identity MUST require controlled input and a confidence threshold.
6. AI remains fallback and source of truth when instant confidence is insufficient.
7. No production scanner change may ship without a proof harness and documented measurements.
8. Runtime debt from failed attempts MUST NOT remain active unless explicitly converted under this contract.

## Capture Quality Gate

The quality gate MUST evaluate whether a frame is suitable for scan normalization. A frame that fails quality checks MUST NOT proceed to instant identity.

The gate SHOULD evaluate:

- border or polygon confidence
- corner visibility
- card fill ratio
- perspective plausibility
- blur or motion
- glare and exposure
- minimum resolution
- orientation
- warp validity

Failure at this stage MUST produce a reject or AI fallback reason.

## Normalized Artifact Contract

Scanner V3 matching inputs MUST be derived from a quality-gated scan-normalized image.

Required artifacts:

- `normalized_full_card`
- `artwork_crop`
- quality metadata
- normalization metadata

Metadata MUST include:

- trace id
- input dimensions
- polygon or quad
- normalized dimensions
- quality scores and reject flags
- normalization version
- artifact hash

Runtime artifacts MUST be bounded in size. Oversized normalized PNG payloads MUST NOT be used in the instant scanner path.

## Hash Rules

Hash matching MAY be used only when:

- the input is a normalized full-card or artwork crop artifact
- the artifact passed the quality gate
- a threshold was established by the Scanner V3 proof harness
- the best candidate is sufficiently separated from alternatives

Hash matching MUST fall back to AI when:

- the artifact is low quality
- no candidate exceeds threshold
- candidates are ambiguous
- a near-neighbor conflict is detected
- any required metadata is missing

## Visual Match Rules

Visual matching MAY generate candidates from normalized artifacts.

Visual matching MUST NOT define identity alone. It must be combined with deterministic confidence rules and fallback behavior. Embedding-style nearest-neighbor lookup is a candidate source only.

## OCR Rules

OCR MAY be used for diagnostics, debug visibility, or secondary evidence after identity is already constrained by other signals.

OCR MUST NOT:

- authorize an instant match
- override a stronger visual/hash mismatch
- keep Scanner V2 fast OCR runtime active as the default scanner path
- expand into additional tuning as a substitute for scan normalization

## Verifier And Fallback

The verifier or confidence gate MUST be fail-closed.

It MUST return fallback instead of an instant match when:

- required evidence is missing
- candidate sources disagree
- confidence is below threshold
- capture quality is insufficient
- the candidate is unsupported or ambiguous
- runtime errors occur

AI fallback MUST remain available and must not be bypassed by an uncertain instant path.

## Production Change Requirements

Before any production scanner change:

1. A Scanner V3 proof harness MUST exist.
2. The harness MUST produce normalized artifacts and decision reports.
3. Measurements MUST show wrong-accept risk, fallback rate, latency, and artifact stability.
4. Thresholds MUST be documented.
5. Rollback behavior MUST be defined.
6. Failed Phase 7, Phase 8, and Scanner V2 runtime debt MUST be inactive or explicitly converted.

## Prohibited Runtime Debt

The following MUST NOT remain active in a production instant scanner path unless reapproved under this contract:

- Phase 7 raw camera hash lookup
- synthetic scanner-lane hash authority
- Phase 8 embedding lookup as identity
- Scanner V2 OCR fast mode as identity authority
- OCR debug artifact writers enabled by default
- dual-read OCR warp/crop authority
- temporary local wrappers or proof scripts used as service contracts
