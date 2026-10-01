# Pokemon bulk warehouse discovery — October 1, 2026

Worktree `C:/gv_gamestop_zoroark_20261001`, draft PR569. Previous ten GameStop
promotions are complete; preserve their receipts and do not replay them.

Read `docs/contracts/POKEMON_WAREHOUSE_DISCOVERY_INTAKE_V1.md`. Private artifacts
and actual execution status: `C:/grookai_vault_operator_artifacts/gamestop_relationships_20261001/CHECKPOINT.md`.
The seven remaining products were audited together. They include unstamped
distribution, a missing sheen finish, a metal card, a disputed stamped finish,
duplicate EB Games identities and Ho-Oh missing discovery entirely.

Use `scripts/workers/pokemon_warehouse_discovery_intake_v1.mjs` with the canonical
database URL and verified CA. Keep `.env.local` authoritative and receipts private.
`--mode=plan --out-dir=<new-directory>` reads the entire warehouse and writes a
frozen `plan.json`. It performs no writes. Review eligible/held counts and source
coverage before freezing the qualified producer through normal commit hooks.

Apply takes `--mode=apply --plan=<file> --out-dir=<new-directory>
--producer-commit=<qualified-sha> --authorization=<private-json>`. Authorization
records `approved:true`, exact `plan_fingerprint`, `producer_commit`, operator,
and the actual user request. Do not invent founder UI review or approval events.
Independent verification takes `--mode=verify --plan=<file> --out-dir=<new-directory>`.
Every output directory is newly created; completed receipts are never overwritten.
If a pending receipt lacks a commit receipt, resolve it through readback first.

Only preserved raw ingress, review-state discovery and operational job receipts are authorized by this
lane. The automatic coverage job remains read-only; scheduling a writer or
claiming these candidates are searchable canonical cards is a separate change.
After execution, use the private checkpoint's readbacks for actual counts and
preserve any failed attempt. Keep normal hooks enabled and use unique TEMP/TMP.

Replay the synthetic SQL proof with a loopback-only `DISCOVERY_INTAKE_PROOF_URL`
whose database is `postgres`, then run
`node scripts/proofs/pokemon_warehouse_discovery_intake_v1.mjs grookai_tcgcsv_discovery_<unique> <new-output-directory>`.
It creates and retains a fresh database, checks the actual connected database,
and refuses to replace an existing lab. This is a focused SQL fixture, not a
production schema replay. Run the pure tests with
`node --test tests/contracts/pokemon_warehouse_discovery_intake_v1.test.mjs`.
