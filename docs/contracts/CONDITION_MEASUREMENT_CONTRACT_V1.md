# Condition Measurement Contract V1

8) Identity–Condition Separation (Fingerprint Safety Rule)
- Condition measurements must never define or modify identity.
- Fingerprints represent physical objects.
- Condition represents time-bound observations.
- A fingerprint may reference many condition snapshots.
- A condition snapshot may reference a fingerprint, but fingerprint creation must not depend on condition quality or confidence.
- Condition data must never be used as a primary key or identity discriminator.

9) Temporal Drift & Time-Series Guarantee
- Condition is a time series, not a single truth.
- No overwriting or merging condition snapshots.
- No “best condition wins” logic.
- Past condition snapshots remain valid historical artifacts even if newer scans disagree.
- Improvement (e.g., cleaning) and degradation are both valid trajectories.

10) Evidence Retention & Explainability Contract
- Every defect or measurement may optionally include evidence metadata (source image, bounding box / region, detection confidence, method identifier).
- Evidence is for explainability and audit.
- Evidence fields may be empty in early versions.
- Schema must allow evidence expansion without breaking compatibility.

11) Negative Knowledge Semantics (Unknown ≠ Clean)
- Explicitly distinguish “No defect detected” vs “Defect could not be evaluated.”
- Missing or insufficient data must lower confidence.
- Absence of defects must never be inferred from missing inputs.
- UI must surface “unknown” states where appropriate.

12) Scan Quality vs Condition Quality Separation
- Scan quality influences confidence only.
- Condition severity derives only from detected measurements/defects.
- Poor scan quality must not inflate or deflate condition severity.
- Repeated rescans may increase confidence but must not change past observations.

13) Explicit Non-Goals & Legal Safety
- Not a grading service.
- Not equivalent to PSA / TAG / CGC.
- No grade guarantees.
- No market value guarantees.
- No dispute arbitration.
- No authoritative certification claims.
- Grookai provides measurement-based observations only.

14) Multi-Modal Future Compatibility
- Schema must support future evidence types: multiple images per face, video, alternate lighting, external lab artifacts, user annotations.
- No assumption of RGB-only, single-image inputs.
- Measurement schema must be extensible without reinterpreting old data.

15) Trust Surfaces Are View-Only
- Users cannot directly edit condition outputs.
- Corrections occur via new snapshots or external evidence uploads.
- No manual override of measurements.

16) Deterministic Failure States
- Formal failure output model: analysis_status ∈ { ok, partial, failed }.
- failure_reason enum (lighting, blur, crop, occlusion, etc.).
- confidence must still be populated (low) even on failure.
- Failure is a valid analysis outcome.
- Failure must not be confused with a clean card.

17) Fingerprint Compatibility Guarantees
- Condition measurements may inform fingerprint confidence.
- Condition measurements must never create or split fingerprints.
- Fingerprints may exist without condition data.
- Condition intelligence upgrades must not invalidate fingerprints.

**Status: LOCKED — Condition Measurement Contract V1  
Any change requires a new version (V2+) and must preserve backward compatibility.**
