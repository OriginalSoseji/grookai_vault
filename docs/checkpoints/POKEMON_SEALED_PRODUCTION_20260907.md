# Pokemon Sealed Production Progress

Date: 2026-09-07. Status: data and Storage verified; client activation in progress.
Authority: `docs/contracts/POKEMON_SEALED_PRODUCTION_V1.md`.

## Durable Evidence

- Inventory: 63,127 active source products across Pokemon and Pokemon Japan.
- Exact sealed foundation: 290 families, 2,525 variants/candidates/reviews/mappings,
  10,023 identity evidence rows, 2,294 qualifications, one frozen price release,
  and 1,756 price-release members. Total inserted: 24,464 rows.
- Pricing exclusions: 422 missing market prices, 116 stale observations, and
  231 qualification holds. Ambiguous source products remain in the inventory
  dispositions, not promoted by guessed package/identity information.
- Catalog price release: `6b50c0f5-79d2-581f-b471-890b0f196b58`.
- Catalog execution: `e6dfa8973db3af8fc2e69c095f7673c3af39fd06`;
  plan `feff127bd01aa549a7072883dccdedc2ed1e2bf3530001160b5a2dbfe5d1b662`.
- Full rollback canary, exact durable readback, and zero-row idempotency passed.
- Storage: 1,720 unique Pokemon-only objects uploaded with upsert disabled;
  all exact bytes read back, covering 1,721 variants. No deletes or overwrites.
- Storage execution: `865ff940608cc4c20a7c3af84cdd12049bccf4e5`;
  fingerprint `73f123ea2e3bb7b0a00ca8eece1be5ada784ba722a48973b789331546808bf42`.
- Image release: `0bf7970b-842e-556c-9c6f-d541d1456212`;
  manifest `37932130e4c0e9614a52797e6facf460e5d5de7d19472c08fbed8cb10e8c016d`.
- Image release inserts: 1,756 evidence, 1,720 objects, 1,721 assertions,
  one frozen release, and 1,721 members. Total inserted: 6,919.
- Image execution: `d181d809a960c770be46db34dd00402e1a0b6847`;
  plan `948e61fc646f62491d40f078c1a4f0a2f34038b032fe99e90b9492c1211c4205`.
- Image rollback, independent durable readback, and zero-row idempotency passed.
- 35 retrieval failures are explicit image exclusions, never replacement images.
- MTG/One Piece sealed records/pointers remain protected and unchanged.
- No card_prints, sets, Vault, or existing-game writes occurred.

## Schema And Verification

The foundation migration `20260907060000` is applied and independently verified.
Its SHA-256 is `6d3b86cb3448ce2eafa2e6bbc90e0b39d6a7c6219afd4a8037485b60c75741ff`.
The exact scoped executor preserved existing sealed data/routines and left the
unrelated pending `20260905120000` migration unapplied. The broad legacy strict
schema diff has pre-existing non-Pokemon differences; never apply that generated
diff or a broad `db push` to erase those differences.

The local database was backed up before reset. Full local migration replay passed,
including the additional Pokemon catalog filter endpoint `20260907070000`.
The filter migration still requires its exact scoped production apply/readback.

The local pre-commit shipcheck could not run from this isolated worktree because
its runtime preflight lacked SUPABASE_DB_URL. Commits used a per-command hook
override after independent secret, syntax, targeted contract, replay and diff
checks. This is not evidence that the entire repository shipcheck passed.

## Remaining

1. Apply/read back the filtered catalog RPC, deploy the Pokemon image signer,
   prove rollback activation, and atomically activate the two Pokemon pointers
   and signed-in control. Verify every published variant and anonymous denial.
2. Complete web/Android build verification, production deployment, feature flags,
   and Samsung smoke tests for images, search, filters, and multiple pages.
3. Configure bounded refresh/discovery monitoring and record exact ongoing
   automation boundaries. Update this checkpoint with final live readbacks.

## Resume Locations

Worktree: `C:/grookai_vault_pokemon_sealed` on
`agent/pokemon-sealed-production-v1`.
Frozen image executor: `C:/grookai_vault_pokemon_sealed_execution` at `d181d809a`.
Artifacts: `C:/grookai_vault_operator_artifacts/pokemon_sealed/`.
Production project: `ycdxbpibncqcchqiihfz`.
Local replay DB port is **54330**, not 54322; pass `--local` explicitly to the
schema operator. Broad app runtime flags default off until activation is proven.
