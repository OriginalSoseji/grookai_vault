# Scanner Fixed-Slot Amaura Crop Audit V1

## Status
- Status: ACTIVE
- Type: Scanner crop-quality audit
- Date: 2026-05-16
- Scope: Fixed-slot still-capture normalization only

## Test Card
- Actual card: Amaura, POR EN, 023/088
- Expected scanner ID: `GV-PK-ME03-023`
- Expected set code / number: `me03` / `023`

## Backend Context
- Endpoint tested: staged full ANN service on droplet, `http://127.0.0.1:8790/scanner-v3/resolve-crops`
- Stage index artifact: `scanner_v3_ann_index_v1`
- Stage reference count: `24,715`
- Stage reference view count: `173,005`
- OCR status: disabled by `SCANNER_NO_OCR_IDENTITY_AUTHORITY_CONTRACT_V1`

## Failed Phone Artifact
- Source normalized artifact: `.tmp/scanner_fixed_slot_device/latest/latest_fixed_slot_normalized.png`
- Failed replay report: `.tmp/scanner_fixed_slot_device/latest/amaura_stage_retest_current_crops_rgba_20260516.json`
- Normalized crop dimensions: `716 x 1000`
- Phone request latency: about `1.52s` service time

### Current Wrong Result
Per-crop top candidates from the failed phone artifact:

| Crop | Top result | Returned ID | Distance |
| --- | --- | --- | --- |
| `title_band` | Voltorb | `GV-PK-BS-67` | `0.149773` |
| `full_card_core` | Golduck | `GV-PK-TEU-27` | `0.180944` |
| `full_card_core_identity` | Sneasel | `GV-PK-FLF-51` | `0.141289` |
| `artwork_zoom_in_10_gray` | Mew | `GV-PK-PR-9` | `0.212915` |

The expected card appears only as a nearby name-family candidate for a different Amaura print in one crop, not as the expected `GV-PK-ME03-023`.

## Visible Crop Defects
The normalized phone artifact is readable, but it is not aligned like the indexed reference:

- Background included: yes. The crop includes black desk padding above, left, and right of the card.
- Card clipped: no major identity fields are clipped.
- Padding too much: yes. The normalized crop contains non-card border area that shifts the fixed internal crop regions away from the reference geometry.
- Rotated: slightly.
- Perspective-skewed: yes, mild trapezoid skew remains after fixed-slot normalization.
- Title/top present: yes.
- Lower number area present: yes, including `POR EN 023/088`.
- Color/alpha malformed: no evidence. RGBA replay crops were valid after harness correction.

## Reference Self-Query Comparison
- Reference self-query report: `.tmp/scanner_fixed_slot_device/latest/amaura_stage_reference_self_query_20260516.json`
- Reference image source: staged metadata for `GV-PK-ME03-023`
- Result: `full_card_core` and `full_card_core_identity` return `GV-PK-ME03-023` rank 1.
- Reference self-query latency: about `1.41s` service time.

## Conclusion
The staged ANN index contains the correct Amaura print and can retrieve it from the canonical reference. OCR and backend coverage are not the failure.

The failure is fixed-slot still-capture normalization quality: the exported phone crop is not tight and perspective-corrected to the card plane before deterministic ANN crop generation. The next fix should improve the crop geometry inside the fixed slot, preserving fixed-slot authority while using edge detection only as an in-slot refinement.
