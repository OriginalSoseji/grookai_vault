# IMG-21A-RUNTIME-IMAGE-SURFACE-SMOKE

- Generated: 2026-06-24T18:14:22.018Z
- Mode: read_only_runtime_http_smoke
- Base URL: `https://grookaivault.com`
- Proof hash: `d6957b7452d603e71e7fc5a45eeb4596d983ca9fcb723ea2883f9bbf8db47273`
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
| card_ltr_rc5_self_hosted_torchic | 200 | PASS | none | none |

## Policy

- No database writes.
- No image uploads.
- This smoke checks rendered runtime behavior only.
- RC5 Torchic must render its self-hosted Torchic image and must not regress to the old wrong Carnivine/PokemonTCG image signals.
