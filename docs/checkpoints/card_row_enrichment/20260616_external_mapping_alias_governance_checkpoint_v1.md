# External Mapping Alias Governance Checkpoint V1

Date: 2026-06-16

This checkpoint records the completion of the product/source alias governance lane for `external_mappings_source_card_duplicates`.

## What Changed

- Created `public.external_mapping_aliases` as the alias preservation sidecar.
- Preserved 214 product/source alias mappings in the sidecar.
- Deactivated 214 duplicate active `external_mappings` rows only after their aliases were preserved.
- Preserved 55 additional deterministic residual aliases and deactivated their duplicate active mappings.
- Preserved 3 final PokemonAPI suffix aliases and deactivated their duplicate active mappings.
- Transferred 8 PokemonAPI suffix/base source mappings to their correct owner parents.
- Reduced active `external_mappings_source_card_duplicates` from 169 groups to 5 blocked residual groups.
- Kept `external_mappings_source_external_duplicates` at 0.

No card identity rows, child printings, images, deletes, merges, or global apply paths were touched.

## Applied Packages

| package | result |
| --- | --- |
| `EXTMAP-ALIAS-01A-SIDECAR-SCHEMA-CREATE` | created sidecar schema with migration `20260616161500_create_external_mapping_aliases_sidecar_v1.sql` |
| `EXTMAP-ALIAS-01B-PRODUCT-ALIAS-PRESERVATION` | inserted 214 alias sidecar rows |
| `EXTMAP-ALIAS-01C-PRESERVED-MAPPING-DEACTIVATION` | updated 214 preserved duplicate mappings to `active=false` |
| `EXTMAP-ALIAS-02A-RESIDUAL-ALIAS-PRESERVATION-CLEANUP` | inserted 55 residual alias sidecar rows and updated 55 preserved duplicate mappings to `active=false` |
| `EXTMAP-ALIAS-03A-RESIDUAL-POKEMONAPI-SUFFIX-ALIAS-CLEANUP` | inserted 3 PokemonAPI suffix alias sidecar rows and updated 3 preserved duplicate mappings to `active=false` |
| `EXTMAP-ALIAS-04A-POKEMONAPI-SUFFIX-OWNER-TRANSFER` | transferred 8 PokemonAPI source mappings to their correct suffix/base owner parents |

## Proof

- `01B` fingerprint: `e8374bd891cc7ee12d38679fe201ee3673e8477bd289a568a2eea139ee540d95`
- `01B` dry-run proof: `2f44aec6549f670fee75f6504f139d917ae13eede3a51a70eaa24a727ddc55e3 == 2f44aec6549f670fee75f6504f139d917ae13eede3a51a70eaa24a727ddc55e3`
- `01C` fingerprint: `c8f4a94af4883968d56d9e6105ab48e7c9f6f38c0fa60d975d024798a8ac80c2`
- `01C` dry-run proof: `d78c98a055aa790f82ef2da5696f3a12db9407cb52e83cb41bf96bdea0f8e07c == d78c98a055aa790f82ef2da5696f3a12db9407cb52e83cb41bf96bdea0f8e07c`
- `02A` fingerprint: `95f6d2d3ac13446413508db37fd0d0a0d2124c19b1c591f03a57dfdc3c9b4ef9`
- `02A` dry-run proof: `88ff35a063c5ed0c821ce7928899a418cab4bc9a3f85b2c8e698b7da64547403 == 88ff35a063c5ed0c821ce7928899a418cab4bc9a3f85b2c8e698b7da64547403`
- `03A` fingerprint: `f9b89f1c9ee97bc65abf6cdf3d31c26b0f810c7c4dacd502ffe2c6f6a082ba09`
- `03A` dry-run proof: `aa3b4955680f22227867f5708b9aeb1868ab74636731de856dd2fa366c045270 == aa3b4955680f22227867f5708b9aeb1868ab74636731de856dd2fa366c045270`
- `04A` fingerprint: `4908bb9588c1666c7bce6ea921997b394ddd42a2a1b750196ebad0b724a84f22`
- `04A` dry-run proof: `72e219e1823ca74d04bbabb7357e869d0c38cdcd657c1131e7ffd7fd49a0ce70 == 72e219e1823ca74d04bbabb7357e869d0c38cdcd657c1131e7ffd7fd49a0ce70`

## Current Residual

The remaining external mapping duplicate bucket is blocked, not write-ready:

| actionability | groups |
| --- | --- |
| `blocked` | 5 |

Current regenerated blocker plan reports `write_ready_packages_now: 0`.

The final exception report is recorded at:

- `docs/audits/card_row_enrichment_v1/external_mapping_final_residual_exception_v1.md`
- `docs/audits/card_row_enrichment_v1/external_mapping_final_residual_exception_v1.json`

## Verification

- `npm run preflight`: `PASS_WITH_DEFERRED_DEBT`, critical failures `0`
- `node --test tests/contracts/contract_scope_v1.test.mjs`: pass
- `card_row_enrichment_status_v1` fingerprint: `dadbc7ae108a993d82c0b90019394ae8ad1736dc6f02854dcb333f5968fabb9b`
- `external_mapping_duplicate_triage_v1` fingerprint: `815215fe8f47aa25ddbfe21ff1f445776e925b8fbe9ab651a46c962b519f08ca`
- `external_mapping_alias_residual_governance_plan_v1` fingerprint: `0376a1c0e492e3e7b0f204d426d56e812aecb3f3abdc1db076f0c986426d5133`

## Migration Ledger

`20260616161500_create_external_mapping_aliases_sidecar_v1.sql` is applied remotely.

`20260523183000_printing_truth_review_sidecar_v1.sql` remains local-only pending and was intentionally not applied in this lane.

## Resume Point

Do not rerun the 214-row alias preservation lane, the 55-row residual alias cleanup lane, the 3-row suffix alias cleanup lane, or the 8-row owner transfer lane. They are complete.

Next DB work should start from the 5 blocked residual external mapping groups or from one of the non-write-ready enrichment lanes after new governance/source rules are created.
