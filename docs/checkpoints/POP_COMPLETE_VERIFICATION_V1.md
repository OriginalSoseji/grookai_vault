# POP_COMPLETE_VERIFICATION_V1

## Context

The POP bucket is fully resolved:

- `pop2`
- `pop5`
- `pop8`

This checkpoint is read-only verification, not mutation. Its purpose is to prove that the POP surface remains clean after the Class F normalization passes and that no residual drift, hidden duplicate parents, or FK inconsistencies remain.

## Verification Results

Live verification was run on 2026-04-07 against the current database state.

Schema-accurate equivalents used during verification:

- active identity uniqueness was checked with `card_print_identity.is_active = true`
- `vault_items` FK integrity was checked through `vault_items.card_id`

Scope snapshot:

- `pop2` canonical rows = `17`
- `pop5` canonical rows = `17`
- `pop8` canonical rows = `17`

Check results:

1. unresolved POP parents with `gv_id is null` = `0`
2. duplicate POP canonical parents by `set_code + number_plain` = `0`
3. multiple active identities on a POP canonical parent = `0`
4. FK orphan counts:
   - `card_print_identity = 0`
   - `card_print_traits = 0`
   - `card_printings = 0`
   - `external_mappings = 0`
   - `vault_items = 0`
5. normalization drift rows in POP scope (`GX ` / `EX ` / unicode apostrophe) = `0`
6. token consistency violations by `set_code + number_plain` = `0`

Representative canonical rows:

- `44e64f01-3bc9-4de3-8319-d32a026169e7 / pop2 / Mr. Briney's Compassion / 8 / GV-PK-POP2-8`
- `644fe84d-7098-4b48-8a40-21dee4f3c8ef / pop5 / Bill's Maintenance / 6 / GV-PK-POP5-6`
- `b12fb97d-7f8a-42f9-a574-1efcf8d995da / pop8 / Roseanne's Research / 11 / GV-PK-POP8-11`

## Invariants Confirmed

- no POP rows remain with `gv_id is null`
- no duplicate POP parents remain by printed token
- exactly one active identity exists per POP canonical parent
- no FK orphans remain in the checked referencing tables
- unicode and punctuation normalization is fully applied across POP scope

## Risks Checked

- hidden fan-in after normalization
- residual unicode or punctuation drift
- latent FK inconsistencies after collapse
- token duplication by `number_plain`

## Final System Truth

The POP bucket is fully clean and canonical.

- all three POP sets now present as single-row canonical namespaces by token
- no residual identity drift remains in POP scope
- no POP-specific active identity uniqueness violations remain
- no checked FK orphan surface remains
