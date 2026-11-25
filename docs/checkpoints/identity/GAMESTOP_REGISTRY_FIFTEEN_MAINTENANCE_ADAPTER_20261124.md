# Fifteen GameStop identities — maintenance adapter preparation

Status: implemented and locally qualified; production execution is not approved.

Follow the [master rulebook](../../GROOKAI_RULEBOOK.md), the frozen
[identity subsystem](../../contracts/CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md),
[production readiness gate](../../release/PRODUCTION_READINESS_GATE_V1.md), and
[maintenance write-path inventory](../../contracts/RUNTIME_WRITE_PATH_AUDIT_V1.md).
The [initial local checkpoint](GAMESTOP_REGISTRY_FIFTEEN_LOCAL_QUALIFICATION_20261124.md)
and its retained fixtures remain historical qualification evidence.

Initial component `d978761bac4007273ae09377e9ba8954497bcd3d` passed full normal
pre-commit and pre-push, including 2,115 Flutter tests and two declared skips.
All 421 platform-specific Windows tests passed with no skips. Those receipts
qualify that component, not the new adapter source in this change.

A fresh canonical read-only audit still found fifteen missing registry entries,
fifteen existing children and fifteen active reviews. There is no new physical
identity, finish, parent, printing or review admission here. The existing finishes
remain eight Cosmos, three Holo and four Reverse. All target UUIDs and exact
standard-v1 projections remain frozen and disjoint from the 298 held parents.

## Execution boundary

`backend/identity/gamestop_registry_fifteen_repair_v1.mjs` is an explicit task of
the existing `backend/identity/run_identity_maintenance_v1.mjs` launcher. It
installs the existing query boundary and requires explicit enable/mode/entrypoint
flags. Dry-run remains the default. `--apply` alone does not grant authority;
write modes require a matching owner decision, exact plan and complete source
fingerprint, an approved unique run ID, a maximum 24-hour authority window and,
for apply, a matching production rollback less than one hour old. A zero-identity
replay also requires the original persisted fifteen-row apply receipt.

The production entry point repeats canonical project/session/TLS/maturity checks.
It requires fresh dedicated main and audit connections, not a shared pricing
session. Both pricing scheduler/current-source advisory locks must be acquired
without waiting before registry execution. An active pricing window is a stop.
No writer retries, `ON CONFLICT` suppression, UPDATE or DELETE are introduced.

The shared SERIALIZABLE transaction rechecks schema, all frozen parent/printing/
review fields, current SQL identity projections, global collision state, old
identity rows, all incoming references, public options and owned-copy footprints.
The only canonical mutation is fifteen exact `card_print_identity` INSERTs.

## Durable outcomes

The initial registry-only design allowed no other table writes. This adapter
explicitly proposes one additional operational audit row per approved write run,
under the mandatory readiness gate. No approval of that additional scope is
asserted by preparation.

Existing `public.ingestion_jobs` stores a terminal `succeeded` or `failed` outcome
with job type `gamestop_registry_fifteen_run_v1`, plan/source/run correlation,
server timestamps, error detail and uncertainty flags. Explicit deterministic
negative bigint IDs avoid advancing a sequence. Every old job is preserved;
collisions stop instead of being overwritten. The independently captured schema
has no INSERT trigger, rewrite rule or incoming foreign key, and its complete
reviewed effects are recursively frozen in source.

For apply, the success row commits atomically with the identities. After a
failed canonical transaction, a separate connection persists its failure.
Rollback qualification leaves no identities behind and then persists one outcome
row. If an acknowledged outcome is uncertain, an existing matching terminal row
is retained and independent diagnosis is required; it is never replaced by a
new write. Storage failures are retained in exclusive operator failure artifacts
and prevent closure. An audit-ID collision cannot result in a successful run.

These are distinct counts: initial apply is fifteen identities plus one audit
row; a committed replay is zero identities plus one audit row. It is not called
a zero-total-write replay. Read-only preparation/readback does not append rows.

## Actual qualification

The newly owned `gamestop_registry_fifteen_audited_qualification_v1` database was
cloned from the retained 523-schema lab without changing that lab. No Docker
image, volume or persistent container was created. All earlier labs remain
retained. Only synthetic `.invalid` account data was seeded; there are no sessions.

Actual PostgreSQL 17.6 tests passed: rollback (fifteen tentative identities, none
durable, one audit row), apply (fifteen identities and one atomic success row),
independent readback, and committed replay (zero identities and one audit row).
All thirty synthetic copies, assigned/unassigned relationships, old jobs,
unrelated identity and sequences stayed exact.

Seven rejection cases covered persisted database errors, unrelated identity
mutation, inactive identity mutation, old-job mutation, owner UPDATE rejection,
a pricing lock held by a real independent session, and a colliding audit ID.
The collision case preserves the original row and reports unavailable outcome
storage; it does not falsely claim a new failure row. A simulated lost receipt
after an actual zero-identity audited replay commit retained its one successful
outcome and required independent readback. No initial fifteen-row commit-loss
claim is made. Owner UPDATE was stopped by the existing stock isolation guard.

Eight actual maintenance CLI boundary checks passed without any production
connection. They cover disabled/wrong launchers, missing explicit apply intent,
default dry-run, rejection of prepare mode under apply, operator output scope
and source binding.
Focused tests cover immutable review data, exact owner/source/plan/run limits,
expiry, stale/partial/local rollback rejection, audited scope and replay receipts.

Artifacts live under
`C:/grookai_vault_operator_artifacts/all_stamped_reverse_holos_20261124/`:
`gamestop-audited-local-lab-v1/`, `gamestop-audited-local-owned-v1/`,
`gamestop-audited-local-qualification-v1/`,
`gamestop-maintenance-cli-qualification-v3/` and the fresh
`gamestop-run-record-storage-audit-v2.json` / `stamped-identity-flags-v2/`.
The replayable SQL harness is
`scripts/audits/gamestop_registry_audited_local_qualification_v1.mjs`.
Use a separately prepared owned before fixture and a new exclusive output;
never reset the retained successful fixture to repeat these writes.

After the final production-guard/CLI refinements, a separate process confirmed
all fifteen committed identities and thirty copies and committed a current-source
zero-identity replay with one audit row. The initial fifteen-row apply belongs
to the retained shared-protocol qualification; a new fifteen-row apply from the
final refined source is not claimed. The current-source proof is retained under
`gamestop-audited-final-source-v2/`.

An actual canonical read-only invocation through the maintenance launcher also
passed project/TLS/maturity checks and matched the fifteen frozen gaps and public
printing options. `gamestop-canonical-adapter-diagnostic-v1/` is explicitly a
diagnostic, not a release execution baseline. It wrote no database rows. Obtain
a fresh release plan only after the final source and pricing-window gates.

## Release remains separate

The first full adapter pre-commit stopped at the existing maintenance-source
inventory assertion: the new task lacked its required maintenance-only banner
and documented environment names. Runtime guard checks passed separately. The
task now documents that existing boundary without changing execution behavior;
the failed check is retained and full normal checks must pass on the corrected
source. No commit or production execution resulted from that failed attempt.

Complete source/platform/hosted checks on the final adapter. After the active
pricing window closes, prepare a fresh canonical read-only plan, exact bounded
owner packet and actual rollback. Apply requires that matching rollback, then
independent data/public/security readback and an audited zero-identity replay.
No source/data approval or production execution is inferred from this checkpoint.

The separate seventeen-printing Japanese pricing exception remains bound to
source `7da8a525-2fdb-4437-9cb5-3daa2d11e0a5`. A live read found a different source,
`2509953d-5deb-4fa2-b844-d90440bdef0e`, while another production pricing run was
active. Do not restart the frozen exception or carry its IDs, limits or expiry
onto that source. Preserve all failed preflights and old preparation evidence.

Non-secret operator configuration uses `GAMESTOP_REGISTRY_RELEASE_CONFIG`, a
path to a private JSON file listing mode/output/input paths, run ID and exact
source fingerprint. Existing database environment and verified CA files are
referenced by path; credentials are not copied into source or printed. The
launcher uses the existing maintenance variables and defaults to read-only.
