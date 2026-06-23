# IMG-21A-RUNTIME-IMAGE-SURFACE-SMOKE

- Generated: 2026-06-23T04:31:15.350Z
- Mode: read_only_runtime_http_smoke
- Base URL: `http://127.0.0.1:3087`
- Proof hash: `9456699a6cc4a14c71d6549e8770e20b61b9e31e3ab3f5b6abb5052713ace35b`
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
| card_trainer_kit_ex_latios_alias | 200 | PASS | none | none |
| card_trainer_kit_hs_gyarados_residual | 200 | PASS | none | none |
| card_wrong_rc5_blocked | 200 | PASS | none | none |

## Policy

- No database writes.
- No image uploads.
- This smoke checks rendered runtime behavior only.
- RC5 Torchic is expected to remain blocked until a verified exact/replacement image is sourced.
