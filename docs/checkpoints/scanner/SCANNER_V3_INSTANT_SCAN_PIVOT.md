# Scanner V3 Instant Scan Pivot Checkpoint

## Decision

Scanner work pivots from OCR, embedding, and raw-camera hash fast paths to Scanner V3 Instant Scan:

```
camera quality gate
  -> scan-normalized card image
  -> stable full-card / artwork crop
  -> hash or visual candidate generation
  -> confidence gate
  -> instant match or AI fallback
```

## Why OCR Was Abandoned As Authority

Scanner V2 OCR work fixed several infrastructure problems:

- oversized OCR payloads from normalized PNGs
- OCR service reachability and request shape
- broad synchronous Tesseract latency
- missing local Tesseract runtime
- insufficient visibility into crops and raw text
- noisy number crop selection
- warp-first and crop fallback comparisons

Even after those fixes, the OCR path only reached 4 valid collector-number reads out of 15 test images, with 0 verifier accepts and 15 fallbacks. The result was fast enough but still not reliable enough to define identity. Further OCR tuning would optimize the wrong authority path.

## Why Hash Is Revisited Only After Scan Normalization

Phase 7 hash failed because capture quality was uncontrolled. Raw scanner frames and synthetic scanner-lane variants did not provide a stable enough signal for safe identity decisions.

Hash is still a useful idea, but only under a different precondition: the input must be a quality-gated, perspective-corrected, scan-normalized card artifact. Hash must be retested on normalized full-card and artwork crops before it can participate in instant matching.

## What Was Learned

- Capture quality controls every downstream matcher.
- OCR is sensitive to crop, scale, glare, contrast, and text placement.
- Warping helps only when geometry is correct; a bad warp can make OCR worse.
- Embedding lookup did not prove identity safety and must stay research-only.
- Hash on raw camera frames is not a valid production proof.
- The verifier fail-closed behavior was correct: uncertain scans fell back instead of accepting.
- AI fallback must remain the source of truth when instant confidence is not sufficient.

## New Direction

Scanner V3 starts with controlled capture and normalized artifacts, not with another recognition shortcut. The first implementation target is a proof harness that produces:

- quality gate decisions
- normalized full-card images
- normalized artwork crops
- hash and visual candidate reports
- deterministic accept or fallback decisions

No production scanner behavior changes until the proof harness shows safe results.

## Do Not Re-Litigate

- OCR as the fast-path authority.
- Embeddings as identity authority.
- Hash on raw camera frames.
- Synthetic scanner-lane hash as production proof.
- Threshold lowering to force instant accepts.
- Production scanner changes before a Scanner V3 proof harness.
- Removing or weakening AI fallback.

## Next Checkpoint

The next checkpoint should be created after the Scanner V3 proof harness can generate scan-normalized artifacts and report hash / visual match outcomes on a controlled test corpus.
