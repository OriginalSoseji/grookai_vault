# Recurring Pokemon discovery — October 1, 2026

Read `docs/contracts/POKEMON_WAREHOUSE_DISCOVERY_RUNTIME_V1.md`. Actual rollout,
service and timer receipts live in
`C:/grookai_vault_operator_artifacts/pokemon_discovery_recurring_20261001/CHECKPOINT.md`.
The prior 20,511-product manual intake is complete; never replay its consumed
write intents. Seven GameStop canonical relationships remain separate review work.

Build from the clean normally qualified commit with
`node scripts/releases/build_pokemon_discovery_release_v1.mjs <sha> <new-directory>`.
The minimal lockfile is under `deploy/pokemon-discovery`. Transport the bundle
with an independently checked archive hash; retain all source/release receipts.
Do not change an existing active or rollback release. Create a separate immutable
`/opt/grookai/releases/pokemon-discovery/<sha>` release and
`/opt/grookai_pokemon_discovery_current` link after checking their current state.
The source and dependencies must be root-owned and not writable by grookai.

Private configuration is `/etc/grookai/pokemon-discovery.env` (root 0600,
existing SUPABASE_URL/SUPABASE_DB_URL only), `pokemon-discovery-ca.pem`, and
`pokemon-discovery-policy.json` (root-owned, readable by grookai). Policy records
the actual standing user request, exact producer and manifest hash, categories
[3,85], tables raw_imports/external_discovery_candidates/ingestion_jobs,
batch_size 500 and max_new_products 5000. It never represents a founder UI click
or canonical promotion approval. State/runs belong to grookai under the private
`/var/lib/grookai/pokemon-discovery` directory.

The checked-in installer takes `install <qualified-unit-directory>` first.
Start the actual service manually, read its terminal job and zero-write/no-duplicate
result independently, then run `enable <qualified-unit-directory>`. Observe the
first timer-triggered cycle (30 seconds plus up to 15 seconds jitter) and the
next hourly deadline. Do not infer timer execution from an enabled unit alone.

Monitor `systemctl status grookai-pokemon-discovery-intake.service`,
`systemctl list-timers grookai-pokemon-discovery-intake.timer`, the private
`last-run.json` and ingestion_jobs with job_type
`POKEMON_WAREHOUSE_DISCOVERY_CYCLE_V1`. Compare run IDs, timestamps, producer and
child intake job IDs. Successful intake can still report unresolved catalog work.

On failure, stop the dedicated timer, retain inflight.json and all pending/commit
receipts, and independently inspect source/raw/discovery/job state. Remove only
the exact owned marker after a documented reconciliation. Qualify any repaired
producer before a fresh run. Rollback is disabling this dedicated timer; previous
raw and discovery facts remain. Never reset unrelated service failures or timers.

Local proof commands: the intake PostgreSQL fixture documented in
`POKEMON_DISCOVERY_INTAKE_20261001.md`, plus
`node --test tests/contracts/pokemon_warehouse_discovery_runtime_v1.test.mjs`.
Qualification includes live Node 20 source/dependency verification and tests;
Windows Node 22 tests alone do not prove the deployed runtime.
