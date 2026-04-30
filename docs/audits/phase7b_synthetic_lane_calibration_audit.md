# Phase 7B Synthetic Lane Calibration Audit

## 1. Executive Summary

This audit checked why the Phase 7B synthetic scanner lane does not match the 9 warped local test photos in `.tmp/testimages4.26_extracted_20260426_214833/`.

Root cause classification:

- Primary: A) synthetic variants too weak
- Supporting: D) threshold impossible without false positives
- Contributing: B) warp crop/frame differs from canonical images
- Not supported for the first three verified cards: C) test images not in indexed scope

The scanner lane contains ME synthetic rows, and the lookup threshold is currently 9. Across 9 warped test images, the nearest global synthetic scanner distances were 13-18, so no match can pass threshold. For the three images whose true cards were visually provable, the nearest true-card synthetic distances were 28-30, while wrong global candidates were closer at 17-18. Raising the threshold would admit unrelated cards before the true card.

Conclusion: the current synthetic variants do not model the camera/warp domain closely enough. The dHash lane should not be abandoned yet, but the synthetic generator must be patched with calibrated camera-domain variants or paired with an additional hash before any threshold change is considered.

## 2. Scope And Source Evidence

Source of truth:

- `docs/contracts/phase7b_scanner_fingerprint_lane_contract_v1.md`
- `docs/audits/phase7_fingerprint_match_failure_root_cause.md`

Audited data path:

- local image file
- existing AI border detector
- existing warp service path
- `backend/fingerprint/fingerprint_hash_v1.mjs`
- `scanner_fingerprint_index`

No code, schema, thresholds, deployments, or rows were modified.

Observed scanner lane query scope:

- table: `public.scanner_fingerprint_index`
- joined table: `public.card_prints`
- set scope: `me01`, `me02`, `me02.5`
- source type: `synthetic`
- algorithm version: `scanner_synthetic_v1`
- verified rows only
- rows considered: 2443
- current threshold: 9

## 3. Distance Results

Distances were computed with Hamming distance against scanner-lane hashes. Each image hash was computed after the existing warp path, then compared globally across ME scanner rows. For visually provable true cards, an additional scoped comparison was made against the expected `card_print_id`.

| file_name | computed_hash_d | true card | nearest_global_candidate | nearest_global_distance | true_card_candidate_distance | nearest synthetic variant/source_detail | current threshold | conclusion |
|---|---:|---|---|---:|---:|---|---:|---|
| `20260427_033845453_iOS.jpg` | `-1880844493823680025` | Volcanion, `me01`, `025/132`, `8c6795af-3045-4bd9-8380-727872e79823` | Mega Latias ex, `me01`, `2edc02c9-95e0-4358-b70a-6d90e037fdee` | 18 | 28 | `blur_mild`; `set_code=me01`, `source_lane=image_url`, `source_url=https://assets.tcgdex.net/en/me/me01/181/high.webp`, `transform={sigma:0.65,jpeg_quality:92}` | 9 | No threshold match; wrong global candidate is closer than true card. |
| `20260427_033849351_iOS.jpg` | `-1808504320952111390` | Tinkatink, `me01`, `096/132`, `2979056b-be25-453d-8051-c560aa51d586` | Mawile, `me02.5`, `88dc9db6-9fbb-4ccc-877c-04a64009000f` | 17 | 29 | `crop_mild`; `set_code=me02.5`, `source_lane=image_url`, `source_url=https://assets.tcgdex.net/en/me/me02.5/246/high.webp`, `transform={crop_ratio:0.02}` | 9 | No threshold match; wrong global candidate is closer than true card. |
| `20260427_033853901_iOS.jpg` | `-2023270840646179356` | Clauncher, `me01`, `037/132`, `c2086597-f23d-4c0b-a9e7-e1c434beb51a` | Mawile, `me02.5`, `88dc9db6-9fbb-4ccc-877c-04a64009000f` | 17 | 30 | `crop_mild`; `set_code=me02.5`, `source_lane=image_url`, `source_url=https://assets.tcgdex.net/en/me/me02.5/246/high.webp`, `transform={crop_ratio:0.02}` | 9 | No threshold match; wrong global candidate is closer than true card. |
| `20260427_033857590_iOS.jpg` | `-1736447830704069663` | unknown; AI hint was Litleo `023/132`, not treated as proof | Ultra Ball, `me02.5`, `76ab7928-6f65-4fdd-adf2-c88903c074f2` | 16 | n/a | `crop_mild`; `set_code=me02.5`, `source_lane=image_url` | 9 | No threshold match; true-card distance not provable. |
| `20260427_033904299_iOS.jpg` | `-3688889218847807546` | unknown; AI hint was Sandshrew `002/102`, not treated as proof | Mega Dragonite ex, `me02.5`, `c6d7117a-76c4-437d-9f39-402d3f846097` | 13 | n/a | `blur_mild`; `set_code=me02.5`, `source_lane=image_url` | 9 | No threshold match; nearest wrong candidate is still above threshold. |
| `20260427_033906930_iOS.jpg` | `-1809630220925869081` | unknown; AI hint was Makuhita `072/132`, not treated as proof | Mega Scrafty ex, `me02.5`, `55e606f3-ce75-41c5-86b1-0137ff3a9023` | 16 | n/a | `brighten_mild`; `set_code=me02.5`, `source_lane=image_url` | 9 | No threshold match; true-card distance not provable. |
| `20260427_033911814_iOS.jpg` | `-2025560006658367003` | unknown; AI hint was Fearow `103/132`, not treated as proof | Mawile, `me02.5`, `88dc9db6-9fbb-4ccc-877c-04a64009000f` | 18 | n/a | `crop_mild`; `set_code=me02.5`, `source_lane=image_url` | 9 | No threshold match; true-card distance not provable. |
| `20260427_033915585_iOS.jpg` | `-2024959681832163867` | unknown; AI hint was Nincada `016/132`, not treated as proof | Mega Lucario ex, `me01`, `3d42f81f-a28e-4f38-9bc8-e69538e4feb4` | 16 | n/a | `rotate_mild`; `set_code=me01`, `source_lane=image_url` | 9 | No threshold match; true-card distance not provable. |
| `20260427_033919982_iOS.jpg` | `-4482516737681068337` | unknown; AI hint was Nacli `010/198`, not treated as proof | Mega Eelektross ex, `me02.5`, `d9939c76-c01e-49e7-b7bd-b976761e6e2d` | 16 | n/a | `brighten_mild`; `set_code=me02.5`, `source_lane=image_url` | 9 | No threshold match; true-card distance not provable. |

Summary:

- images tested: 9
- global threshold matches: 0
- nearest global distance range: 13-18
- true-card scoped rows proven: 3
- true-card scoped distance range: 28-30

## 4. True Card Identification Evidence

Three images were visually inspected and matched to indexed ME cards:

- `20260427_033845453_iOS.jpg`: card text shows Volcanion, set MEG EN, number `025/132`; matching `card_prints` row is `me01` number `25`.
- `20260427_033849351_iOS.jpg`: card text shows Tinkatink, set MEG EN, number `096/132`; matching `card_prints` row is `me01` number `96`.
- `20260427_033853901_iOS.jpg`: card text shows Clauncher, set MEG EN, number `037/132`; matching `card_prints` row is `me01` number `37`.

The remaining six images were not marked as proven true-card matches because only AI hints were available during this audit. Those hints were useful for orientation but were not treated as proof.

## 5. Warp Output Audit

No pre-existing saved warped output files were found under `.tmp`. To keep this audit to the requested single report file, the first three warped outputs were generated through the existing warp path in memory and inspected by dimensions, polygon, brightness, and the original visible card content.

| file_name | crop includes borders | card rotated | glare/foil dominates | frame differs from canonical image | text/art region distorted | evidence |
|---|---|---|---|---|---|---|
| `20260427_033845453_iOS.jpg` | yes, full card border retained | no material rotation after warp | no | yes | mild camera/warp difference, no severe distortion observed | border confidence `0.5268`; polygon `[[0.0769,0.1815],[0.8088,0.1644],[0.8083,0.8634],[0.0769,0.8601]]`; warped size `1024x1428`; edge luminance `154`; center luminance `136`; bright center pixels `0.87%` |
| `20260427_033849351_iOS.jpg` | yes, full card border retained | no material rotation after warp | mild highlights, not dominant | yes | mild camera/warp difference, no severe distortion observed | border confidence `0.4704`; polygon `[[0.1158,0.2034],[0.8108,0.2034],[0.8108,0.8803],[0.1158,0.8803]]`; warped size `1024x1428`; edge luminance `117`; center luminance `161`; bright center pixels `2.48%` |
| `20260427_033853901_iOS.jpg` | yes, full card border retained | no material rotation after warp | no | yes | mild camera/warp difference, no severe distortion observed | border confidence `0.5362`; polygon `[[0.0871,0.1319],[0.8264,0.1319],[0.8264,0.8571],[0.0871,0.8571]]`; warped size `1024x1428`; edge luminance `104`; center luminance `144`; bright center pixels `0.37%` |

The warp outputs appear usable as top-down card images, but they are not in the same visual distribution as pristine canonical web images. They include physical-card lighting, camera exposure, print texture, border/frame differences, and phone capture artifacts that are not represented by the current mild synthetic transforms.

## 6. Root Cause

The failure is not caused by missing ME scanner rows or by a simple threshold that is too strict.

For the three provable true cards, the nearest global synthetic candidate is an unrelated card and is much closer than the true card:

- Volcanion: wrong global distance 18, true-card distance 28
- Tinkatink: wrong global distance 17, true-card distance 29
- Clauncher: wrong global distance 17, true-card distance 30

That ordering means a larger threshold would produce false positives before it recovers the correct card. The current synthetic variants are too weak because they only perturb pristine canonical images mildly. They do not generate hashes in the same neighborhood as real warped phone captures.

## 7. Fix Options

Safe options:

- Patch the synthetic generator to create stronger camera-domain variants: perspective margins, border/frame retention differences, exposure shifts, shadow bands, compression, slight defocus, print texture/noise, and crop offsets calibrated against these 9 warped hashes.
- Add a calibration report before any threshold promotion: nearest true-card distance, nearest wrong-card distance, and margin distribution.
- Keep the AI-confirmed real-scan learning lane because real scanner hashes are the most direct bridge into the camera-photo domain.
- Consider adding a second hash signal for scanner lane matching if dHash remains unstable after camera-domain synthetic variants.

Unsafe options:

- Do not blindly increase threshold.
- Do not let representative images confirm identity.
- Do not couple this to ingestion.
- Do not make scanner fast-path decisions when a wrong candidate is closer than the known true card.

## 8. Recommendation

Patch the synthetic generator first, but patch it as a calibrated camera-domain generator rather than adding more mild transforms. Keep dHash as an experimental lane for one more calibration cycle, paired with the real-scan learning lane. If true-card distances still remain worse than nearest wrong-card distances after realistic synthetic variants, abandon dHash-only scanner fast-path matching and move to a stronger multi-signal fingerprint.
