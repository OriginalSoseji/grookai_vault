# Pricing Checkpoint 68: One Piece Canonical Foundation Apply Ready

## Current Truth

The One Piece canonical foundation migration now has a frozen durable apply
plan, a guarded atomic writer, an independent post-apply verifier, exact failure
evidence handling, and a fresh zero-finding production preflight from the final
writer SHA.

The migration remains unapplied. Production still has no One Piece game,
release-control, set, card, identity, printing, or mapping row.

## Frozen Apply Scope

- Migration version: `20260814150000`
- Migration SHA-256:
  `a072e55f5bf3362aefcf1056b37e93a4e861b64ffeb529e0fd554d046586fbba`
- Apply-plan fingerprint:
  `7a4458002aa0f30133b875e784ee4050b4209605797701aae92ef6e994842aec`
- Expected migration parent: `20260814120000`
- Ledger rows authorized: `1`
- Game rows authorized: `1`
- Hidden release-control rows authorized: `1`
- Identity constraint replacements authorized: `1`
- Set/card/identity/printing/mapping rows authorized: `0 / 0 / 0 / 0 / 0`
- Sealed/Storage/pointer/pricing/publication/Vault writes authorized:
  `0 / 0 / 0 / 0 / 0 / 0`
- App visibility enabled: `false`

## Authority Chain

- Original production preflight fingerprint:
  `c3dc1ab6bdc2d6d1c434cddbc4c6a47fd447d65d396c1eec6feaf2bfb9978a1b`
- Rollback proof:
  `c055c08d0231ad99b7958afc5e915b5bb9841a5169628d8523f5c3fa29472fe1`
- Independent zero-residue proof:
  `42fa494f412c03395a39bc3bd63b8ab9956fcdff4e8263f61ccea734c720eec5`
- Guarded writer implementation SHA:
  `04fe5a97d658a77824f084531e366364fac2860d`
- Frozen plan commit:
  `3857a62516f96a6ba574ae06752f2d1cae4ea57e`
- Failure-evidence-hardened writer SHA:
  `dfdea2971e49da52ccc6283a7594a0b6ce8655c8`

## Fresh Production Preflight

- Final producer SHA:
  `dfdea2971e49da52ccc6283a7594a0b6ce8655c8`
- Final preflight fingerprint:
  `33becf521965c3683b1aa7cfdb8cf4ebf49cb6a460d105698f2a062bc539dd01`
- Status: `foundation_preflight_passed_no_writes`
- Findings: `0`
- Latest migration: `20260814120000`
- Candidate/later migration rows: `0 / 0`
- One Piece game/release rows: `0 / 0`
- ST-01 canonical set rows: `0`
- Staged source rows: `21`
- Database writes: `0`
- Artifact hash mismatches: `0`

An earlier fresh preflight from the initial frozen-plan SHA also passed. It is
preserved as evidence but superseded for execution readiness by the final
preflight after failure-artifact hardening.

## Writer Safety Contract

- Defaults to offline `--plan-only` mode.
- Requires `--execute-foundation-apply` for any writable path.
- Requires an exact clean producer SHA and the governed branch.
- Requires the full guard token through
  `ONE_PIECE_CANONICAL_FOUNDATION_APPLY_APPROVAL`.
- Regenerates the plan and compares it with the checked-in plan before access.
- Writes `run_plan.json` before database access.
- Runs a new production read-only preflight immediately before the transaction.
- Executes the exact migration and exact ledger row in one transaction.
- Uses transaction-local attribution and accepts only one insert into `games`
  and one insert into `catalog_game_release_controls`.
- Rolls back any failure before commit.
- Records whether commit occurred if any failure happens after connection or
  during post-commit readback.
- Requires hidden visibility and zero canonical card rows before success.
- Requires a fresh read-only post-apply readback and a separately executed
  independent verifier.

## Tests

- Node syntax checks: passed
- Apply-plan and authority-drift contracts: passed
- Hidden durable readback contracts: passed
- Transaction attribution contracts: passed
- Writer/verifier boundary contracts: passed
- Full One Piece contract suite: `128 / 128` passed
- `git diff --check`: passed

## Preserved Boundaries

- The 17 numbered ST-01 cards are not part of this apply.
- The DON!! card is not part of this apply.
- The three sealed candidates are not part of this apply.
- The 18 permanent Storage objects are not modified or repointed.
- No Pokemon, Japanese, MTG, pricing, publication, Vault, or image-pointer row
  is authorized to change.
- One Piece remains hidden even after the foundation is applied.

## Artifacts

- Frozen plan:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/foundation_apply_plan_v1/`
- Initial fresh preflight:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/fresh_production_preflight_v1/`
- Final fresh preflight:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/fresh_production_preflight_final_v1/`
- Guarded writer:
  `scripts/audits/one_piece_canonical_catalog_foundation_apply_v1.mjs`
- Independent verifier:
  `scripts/audits/one_piece_canonical_catalog_foundation_post_apply_v1.mjs`

## Required Authorization

Durable apply remains closed until the exact scope is explicitly authorized.
The required guard token is:

```text
EXECUTE_ONE_PIECE_CANONICAL_FOUNDATION_ONLY:a072e55f5bf3362aefcf1056b37e93a4e861b64ffeb529e0fd554d046586fbba:c055c08d0231ad99b7958afc5e915b5bb9841a5169628d8523f5c3fa29472fe1:42fa494f412c03395a39bc3bd63b8ab9956fcdff4e8263f61ccea734c720eec5:7a4458002aa0f30133b875e784ee4050b4209605797701aae92ef6e994842aec:KEEP_ONE_PIECE_HIDDEN:ZERO_CANONICAL_CARD_ROWS
```

## Exact Next Gate

After exact authorization, execute the frozen foundation apply once from a new
clean producer SHA. Stop after transaction-local proof, migration-ledger
readback, fresh read-only post-apply verification, and independent verification.
Do not promote ST-01 cards in the same task. If the apply succeeds, checkpoint
the durable hidden foundation before building the separate 17-card canonical
parent payload.
