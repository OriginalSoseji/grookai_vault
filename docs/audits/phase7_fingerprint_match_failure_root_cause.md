# Phase 7A Fingerprint Match Failure Root-Cause Audit

## 1. Executive Summary

Root cause found: the current 64-bit dHash fingerprint space is not robust enough for physical camera images after border/warp when compared against pristine canonical image fingerprints. This is not a local/remote target mismatch, not missing ME index data, not JSON/int64 serialization, and not lookup filtering.

Confidence level: high.

Classification: algorithm/data-domain mismatch. The indexed data is canonical digital card imagery; the local test inputs are physical card photos with lighting, glare, print, camera, and crop artifacts. Even after successful warp, the computed hashes remain outside the lookup threshold.

Key proof:

- Same remote Supabase project is used by local env and RPC URL: `ycdxbpibncqcchqiihfz`.
- The same remote DB contains exactly `613` total fingerprint rows, all ME rows and all lookup-eligible.
- All 9 test images successfully reached border and warp.
- All 9 warped-image hashes are farther than threshold `9` from the nearest indexed ME hash. Nearest distances are `12` to `20`.
- Visual inspection of `20260427_033845453_iOS.jpg` shows a ME card, `Volcanion`; `Volcanion (me01)` exists in the indexed scope, but the warped photo hash is distance `29` from its indexed `hash_d` and `30` from its indexed `hash_norm`.

## 2. Known Verified State

- ME fingerprint index exists.
- ME rows indexed: `613`.
- Source lanes: exact only.
- Representative rows: `0`.
- Canonical-image diagnostic passed: DB hash equals local hash for canonical image.
- Local camera/warped image test returns `0/9` matches.
- ME index was rebuilt after hash normalization alignment and still returns `0/9`.
- `docs/contracts/phase7_fingerprint_index_contract_v1.md` requires Hamming distance and fallback on no match / low confidence / ambiguity / errors.
- `docs/audits/phase7_contract_enforcement_audit.md` previously drove the lookup patch away from numeric distance prefilters and toward Hamming threshold matching.

## 3. Environment Target Audit

Worker/index target:

- `backend/supabase_backend_client.mjs` uses `SUPABASE_URL` and `SUPABASE_SECRET_KEY` for backend workers.
- `backend/fingerprint/fingerprint_index_worker_v1.mjs` imports `createBackendClient` at line 3 and creates the client at line 276.

Local environment target:

- `SUPABASE_URL` host: `ycdxbpibncqcchqiihfz.supabase.co`.
- `SUPABASE_DB_URL` host: `db.ycdxbpibncqcchqiihfz.supabase.co:5432`.
- Required env keys present without printing values: `SUPABASE_URL`, `SUPABASE_DB_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `GV_AI_BORDER_URL`, `GV_AI_BORDER_ENABLE`.

Test runner / deployed function target:

- `.tmp/fingerprint_test/run_local_tests.mjs` line 13 hardcodes RPC URL `https://ycdxbpibncqcchqiihfz.supabase.co/functions/v1/fingerprint_lookup_v1`.
- RPC URL project ref: `ycdxbpibncqcchqiihfz`.
- `supabase/functions/fingerprint_lookup_v1/config.toml` sets `verify_jwt = false`, but `index.ts` still performs application-level `requireValidUser`.

Conclusion: worker/index DB target, local DB target, and deployed function URL target all point at the same Supabase project ref.

Note: an authenticated function visibility check was not rerun in this audit because no existing user JWT is present in env and creating a temporary auth user would violate the no-data-change audit rule. A service-role bearer attempt returned HTTP `401`, which is consistent with `requireValidUser` requiring a real user access token.

## 4. Data Presence Audit

Read-only DB query results against `SUPABASE_DB_URL`:

- `total_index_rows`: `613`
- `me_rows`: `613`
- `me_lookup_eligible_rows`: `613`
- `me_sets_with_rows`: `3`

Lookup eligibility matched the deployed function filters:

- `is_verified = true`
- `is_representative = false`
- `source_type != representative`

The deployed lookup has `CANDIDATE_POOL_LIMIT = 3000` at `supabase/functions/fingerprint_lookup_v1/index.ts:19`. Since the table currently has only `613` total rows, candidate-pool limiting cannot be the cause of `0/9` matches.

## 5. Test Runner Flow Audit

The local runner is hashing the warped output.

Evidence:

- Imports hash and warp helpers: `.tmp/fingerprint_test/run_local_tests.mjs:10-11`.
- Uses the deployed function URL: `.tmp/fingerprint_test/run_local_tests.mjs:13`.
- Border detection happens before warp: `.tmp/fingerprint_test/run_local_tests.mjs:106`.
- Warp happens through existing `warpCardQuadAI`: `.tmp/fingerprint_test/run_local_tests.mjs:111`.
- Lookup POST happens to `RPC_URL`: `.tmp/fingerprint_test/run_local_tests.mjs:132`.
- Final lookup hash is computed from `warpedBuffer`: `.tmp/fingerprint_test/run_local_tests.mjs:187`.

Hash module evidence:

- `normalizeForHash` exists at `backend/fingerprint/fingerprint_hash_v1.mjs:36`.
- It resizes to the shared fixed hash size at `backend/fingerprint/fingerprint_hash_v1.mjs:39`.
- `computeDHash64` uses `normalizeForHash` at `backend/fingerprint/fingerprint_hash_v1.mjs:89-90`.
- `computeFingerprintHashes` uses `computeDHash64` for both stored lanes at `backend/fingerprint/fingerprint_hash_v1.mjs:306-320`.

Worker evidence:

- Worker chooses `image_url` before `image_alt_url`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:89` and `98`.
- Worker computes hashes using `computeFingerprintHashes(fetched.data)`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:218`.
- Worker writes `is_representative: false`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:241`.

## 6. Warp Output Audit

All 9 local test images successfully completed border detection and warp:

- `border_ok_count`: `9`
- `warp_ok_count`: `9`
- Each warped output was JPEG with dimensions `1024 x 1428`.
- Warped output byte sizes ranged from `340996` to `479637`.
- Border confidences were low/moderate, approximately `0.45` to `0.54`.

Conclusion: warp endpoint is returning structurally valid top-down card images. The outputs are usable enough to hash, but the resulting hashes are still not close enough to canonical indexed hashes.

## 7. Hash Distance Audit

Threshold: `9`.

For each test image, the final hash used for lookup was computed from the warped image output. Nearest distance was computed locally against the same `613` ME indexed rows and the same Hamming behavior used by the deployed lookup.

| file_name | computed_hash_d | nearest_candidate | nearest_distance | nearest_lane | threshold | match_possible |
|---|---:|---|---:|---|---:|---|
| 20260427_033845453_iOS.jpg | -1880844493823680025 | Ignition Energy (me02) | 20 | hash_norm | 9 | no |
| 20260427_033849351_iOS.jpg | -1808504320952111390 | Kirlia (me01) | 20 | hash_norm | 9 | no |
| 20260427_033853901_iOS.jpg | -2023270840646179356 | Mega Manectric ex (me01) | 19 | hash_d | 9 | no |
| 20260427_033857590_iOS.jpg | -1736447830704069663 | Mega Sharpedo ex (me02) | 18 | hash_norm | 9 | no |
| 20260427_033904299_iOS.jpg | -3688889218847807546 | Mega Dragonite ex (me02.5) | 12 | hash_d | 9 | no |
| 20260427_033906930_iOS.jpg | -1809630220925869081 | Mega Scrafty ex (me02.5) | 15 | hash_norm | 9 | no |
| 20260427_033911814_iOS.jpg | -2025560006658367003 | Heliolisk (me02.5) | 19 | hash_norm | 9 | no |
| 20260427_033915585_iOS.jpg | -2024959681832163867 | Mega Lucario ex (me01) | 19 | hash_norm | 9 | no |
| 20260427_033919982_iOS.jpg | -4482516737681068337 | Mega Eelektross ex (me02.5) | 16 | hash_norm | 9 | no |

Additional scope proof:

- Visual inspection of `20260427_033845453_iOS.jpg` identifies the card as `Volcanion`.
- DB query confirms `Volcanion (me01)` exists in indexed scope with an indexed fingerprint.
- Distance from the warped test image hash to the actual indexed `Volcanion (me01)` row:
  - `hash_d` distance: `29`
  - `hash_norm` distance: `30`
  - threshold: `9`

This proves at least one known in-scope ME card is failing because its physical-photo/warped hash is far from its canonical-image hash, not because the card is absent from the index.

## 8. Root Cause

The root cause is a fingerprint robustness mismatch between canonical digital images and physical camera captures.

The scanner-side hash is computed from warped physical photos. The index-side hash is computed from pristine canonical image URLs. The current `64-bit dHash` over `32x32 grayscale/normalized` image data does not preserve enough identity similarity across that domain gap. Lighting, glare, print texture, camera optics, border/crop variation, and perspective-warp resampling move the physical-card hash outside threshold `9`.

Secondary observations:

- The local runner is hashing the warped output as intended.
- The warp service returns valid JPEG outputs at the requested dimensions.
- The test target and DB target align.
- Lookup filters are not excluding rows incorrectly; the table has only `613` rows and all are eligible.
- RPC threshold/confidence logic matches the local audit assumption: Hamming threshold `9`, high confidence only when best distance `<= 4` and unambiguous.
- Hash serialization is compatible: Node sends signed decimal strings through `dbInt64String`; Deno `parseHashInput` accepts decimal strings and converts signed int64 values.

## 9. Fix Options

Safe options only, not implemented:

1. Add a physical-photo fingerprint lane.
   - Generate index fingerprints from warp-like synthetic variants or captured/augmented canonical images.
   - Keep existing exact canonical lane and add a new `algorithm_version`.

2. Use a more robust perceptual hash.
   - Add pHash/aHash/block hash or a combined multi-hash score.
   - Keep Hamming contract, but compare multiple lanes and require agreement.

3. Add scanner-side feature validation after hash shortlist.
   - Use a looser first-pass threshold only to produce candidates, then verify with OCR/name/set/number or image similarity before any fast-path success.

4. Use the existing AI/resolver fallback as the source of truth for hard cases.
   - Cache confirmed physical-photo hashes only after AI/resolver confirmation.
   - This avoids treating representative/canonical similarity as identity by itself.

5. Improve warp/crop quality separately.
   - Border confidences are only around `0.45-0.54`; higher-quality card crops may reduce distance.
   - This is not sufficient alone, because the known Volcanion physical photo still landed distance `29/30` from its true canonical row.

## 10. Recommendation

Proceed to a Phase 7A architecture patch for a separate scanner-capture fingerprint lane, not a threshold increase.

Recommended next step:

- Create a read-only calibration script that takes confirmed card pairs:
  - canonical image
  - warped physical photo
  - AI/resolver-confirmed `card_print_id`
- Measure distance distributions for `hash_d`, `hash_norm`, and at least one stronger perceptual hash.
- Use those measurements to define a new `algorithm_version` and safe fast-path gate.

Do not raise the current threshold blindly. The nearest candidates are often the wrong card, and the true known Volcanion row is much farther away than unrelated nearest rows.
