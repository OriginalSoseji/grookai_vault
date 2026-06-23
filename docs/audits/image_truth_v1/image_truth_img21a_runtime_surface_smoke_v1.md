# IMG-21A-RUNTIME-IMAGE-SURFACE-SMOKE

- Generated: 2026-06-23T20:47:24.520Z
- Mode: read_only_runtime_http_smoke
- Base URL: `http://127.0.0.1:3087`
- Proof hash: `1b1e43f8b6d742d92d45eed588dab6879e7a2325924941425612f890d0296094`
- Failures: 0

## Runtime Routes

| Route | Status | Result | Missing expected signals | Forbidden signals present |
| --- | ---: | --- | --- | --- |
| card_mcd2021_oshawott | 200 | PASS | none | none |
| set_mcd2021 | 200 | PASS | none | none |
| dex_oshawott_child_fallback | 200 | PASS | none | none |
| card_mep_oshawott_exact | 200 | PASS | none | none |
| set_trainer_kit_sm_lycanroc | 200 | PASS | none | none |
| set_trainer_kit_dp_lucario_residual | 200 | PASS | none | none |
| card_trainer_kit_sm_lycanroc_representative | 200 | PASS | none | none |
| card_trainer_kit_dp_lucario_representative | 200 | PASS | none | none |
| card_trainer_kit_ex_latios_alias | 200 | PASS | none | none |
| card_trainer_kit_hs_gyarados_residual | 200 | PASS | none | none |
| card_wrong_rc5_blocked | 200 | PASS | none | none |

## Policy

- No database writes.
- No image uploads.
- This smoke checks rendered runtime behavior only.
- RC5 Torchic is expected to remain blocked until a verified exact/replacement image is sourced.
