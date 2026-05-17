# Scanner V3 Instant Scan Plan

## Objective

Scanner V3 makes instant scanner results possible by controlling capture quality before matching. The scanner must produce a stable scan-normalized card image, then perform hash or visual matching on normalized artifacts only. AI remains the fallback and source of truth when confidence is insufficient.

Locked path:

1. Camera quality gate
2. Scan-normalized card image
3. Stable full-card and artwork crops
4. Hash or visual match on normalized artifacts
5. Deterministic confidence gate
6. AI fallback when uncertain

## Non-Goals

- Do not use OCR as fast-path authority.
- Do not use embeddings as identity authority.
- Do not run hash matching on raw camera frames.
- Do not change production scanner behavior before proof harness validation.
- Do not modify backend identity worker, schema, verifier rules, or production AI fallback as part of the first proof.
- Do not tune thresholds to force accepts.

## Architecture

```
camera frame
  -> capture quality gate
  -> border / polygon detection
  -> perspective warp
  -> scan-normalized full-card artifact
  -> stable artwork crop artifact
  -> hash and visual candidate generation
  -> deterministic confidence gate
  -> instant accept or AI fallback
```

The fast path returns identity only when input quality and match confidence both satisfy the Scanner V3 contract. Otherwise it returns no instant identity and the existing AI path handles resolution.

## Capture Quality Gate

The quality gate must reject or defer frames before matching when the input is not stable enough.

Required checks:

- Card border is detected with sufficient confidence.
- Four corners or a usable polygon are visible.
- Perspective warp is geometrically plausible.
- Card aspect ratio is within tolerance after warp.
- Resolution is sufficient for full-card and artwork crops.
- Blur, motion, glare, overexposure, and underexposure are below configured limits.
- Card occupies enough of the frame.
- Orientation can be normalized.

The gate is allowed to produce "try again" or "fallback to AI" outcomes. It must not lower confidence thresholds to force an instant match.

## Scan-Normalized Image Contract

The normalized full-card artifact must be generated from a quality-gated frame and a detected polygon or quad.

Minimum artifact requirements:

- Perspective-corrected card image.
- Orientation normalized to the expected card layout.
- Bounded compressed image, preferably JPEG for runtime artifacts.
- No oversized normalized PNG payloads in runtime scanner paths.
- Stable dimensions or long-edge target defined by the harness.
- Metadata with source image path or frame id, polygon, dimensions, quality scores, normalization version, and artifact hash.

The normalized artifact is the only valid input for Scanner V3 hash or visual matching.

## Normalized Artifact Shape

Scanner V3 proof harness should write an artifact folder per frame or test image:

```
scanner_v3_artifacts/<trace_id>/
  normalized_full_card.jpg
  artwork_crop.jpg
  optional_bottom_band_debug.jpg
  quality.json
  match_debug.json
```

`quality.json` should include:

- trace id
- original dimensions
- polygon or quad
- normalized dimensions
- blur score
- glare or exposure flags
- card fill ratio
- warp elapsed milliseconds
- normalization version
- reject or accept reason

`match_debug.json` should include:

- hash candidates and distances
- visual candidates and scores
- selected candidate, if any
- confidence gate decision
- AI fallback reason when no instant match is accepted

## Hash Retest Strategy

Hash matching may be revisited only after normalized artifacts exist.

Retest requirements:

- Use normalized full-card and artwork crop inputs, never raw camera frames.
- Measure repeated captures of the same physical card.
- Measure near-neighbor wrong cards and variant cards.
- Measure distance distributions for same-card, same-art different print, and different-card pairs.
- Lock thresholds from the harness before production use.
- Treat hash as candidate generation until confidence is proven.

The hash retest passes only if it produces stable same-card matches without wrong instant accepts. Uncertain or ambiguous results must fall back to AI.

## Visual Match Retest Strategy

Visual matching can be retested on the same normalized artifacts.

Rules:

- Visual match may generate candidates.
- Visual match does not define identity by itself.
- Candidate scores must be calibrated on normalized full-card and artwork crops.
- Any disagreement between hash, visual match, metadata, or quality gate sends the scan to AI fallback.
- Embeddings from Phase 8 are research-only unless reintroduced behind this normalized-artifact contract.

## AI Fallback Boundary

AI remains the source of truth when instant confidence is insufficient.

Fallback is required when:

- Capture quality gate fails.
- Border or warp is unstable.
- Normalized artifact is missing or invalid.
- Hash and visual candidates disagree.
- Best candidate is below threshold.
- Multiple candidates are too close.
- Card variant, set, language, foil, stamped, or altered presentation is uncertain.
- Any runtime error occurs in instant matching.

Fallback must preserve the existing AI identity behavior and must not be blocked by the instant path.

## Acceptance Criteria

Scanner V3 proof harness must demonstrate:

- 0 known wrong instant accepts in the controlled test corpus.
- Deterministic fallback instead of guessing on uncertain frames.
- Stable normalized artifacts across repeated captures.
- Hash and visual matching run only on normalized artifacts.
- A documented confidence threshold and reject reason for every non-accepted scan.
- AI fallback remains available for every rejected or uncertain scan.
- Runtime artifacts are bounded and do not contain oversized PNG payloads.
- Production scanner is unchanged until proof results are reviewed.

Suggested first proof target:

- Build a local harness over the existing test images plus repeated real scanner captures.
- Measure artifact quality, match distances, candidate agreement, latency, and fallback rate.
- Expand only after wrong-accept risk is understood.

## Rollout Plan

1. Build Scanner V3 proof harness that outputs normalized full-card and artwork artifacts.
2. Run hash and visual retests offline against normalized artifacts.
3. Lock confidence thresholds and fallback reasons from harness results.
4. Add shadow-mode scanner integration that records decisions without changing user-facing identity.
5. Compare shadow instant decisions to AI identity outcomes.
6. Enable internal-only instant accepts behind a feature flag when wrong-accept risk is acceptable.
7. Roll out gradually with telemetry and a fast disable switch.

## Rollback Plan

- Disable Scanner V3 instant match feature flag.
- Continue existing scanner upload and AI identity flow.
- Keep normalized artifacts for debugging only if explicitly enabled.
- Do not require schema rollback for first rollout.
- Remove or quarantine any newly introduced V3 runtime callers if shadow results regress.

## First Implementation Target

The next implementation target should be a Scanner V3 proof harness that:

1. Reads scanner test images or captured frames.
2. Applies the capture quality gate.
3. Produces scan-normalized full-card and artwork crop artifacts.
4. Runs hash and visual candidate generation only on those artifacts.
5. Emits a decision report with instant accept, reject, or AI fallback.
