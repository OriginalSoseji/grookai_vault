# Pitch Black bulk identity recovery — October 2

Continue from the private operator directory
`C:/grookai_vault_operator_artifacts/pokemon_me05_relationships_20261002` and its
`CHECKPOINT.md`. Read `docs/contracts/ME05_EXISTING_IDENTITY_RECOVERY_V1.md`.

Fresh production inspection found 120 existing parents, no identity rows, 199
verified child printings and 120 active namespaced TCGCSV mappings. The previous
coverage reader discarded those namespaced external IDs. The 112-product review
is therefore a subset of one whole-set identity repair, not 112 new cards.

The fixed plan in `docs/audits/me05_identity_recovery_20261002/plan.json` binds all
120 verified English Master facts. Qualification includes rejected scope/evidence
changes, existing-ID preservation, and actual PostgreSQL rollback, apply,
independent readback and rejected repeat. The native PostgreSQL16 fixture listens
only on 127.0.0.1:65470; preserve its populated v3 database and failed setup v1/v2
databases. It uses actual typed rows, uniqueness and projection/hash functions;
unrelated generated columns are retained as snapshot values. Production rollback
and readback remain necessary because this fixture is not a full schema replay.

Run the normal commit/push hooks. Use one fresh TEMP/TMP directory per hook. Keep
tracked source frozen during qualification and execution. Plan, rollback, apply,
independent verification and recurring-reader rollout must have separate receipts.
Do not replay completed scopes based on this source note; the private checkpoint
records actual execution and the active worker release.

The hourly discovery worker was healthy at inspection (jobs763–769 succeeded).
Preserve its memory-recovery release and policy. The new reader is a separate
deployment; local passing tests or committing this repair do not update the host.
The six-hour audit also has its own pinned release and needs separate readback.

GameStop's seven remaining distribution, material and variant cases remain held.
This scope adds no GameStop stamp, finish, price or public-card identity.
