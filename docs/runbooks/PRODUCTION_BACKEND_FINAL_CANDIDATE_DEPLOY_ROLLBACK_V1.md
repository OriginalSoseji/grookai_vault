# Production Backend Final Candidate Deploy And Rollback V1

## Entry Criteria

Do not freeze or deploy the final candidate until Supabase security, capacity,
backup/restore, load/failure, and same-candidate client gates all pass.

## Freeze

1. Merge the release branch through the normal protected path.
2. Record the resulting source commit and confirm the tracked tree is clean.
3. Freeze every migration version and SHA-256 after the live migration head.
4. Freeze control-plane, TCGPlayer source, MEE, pricing publication, and
   new-set-discovery service definitions from the same source commit.
5. Freeze web deployment, signed Android, and TestFlight iOS build IDs and
   hashes.
6. Write the final candidate manifest from
   `docs/release/production_backend_final_candidate_manifest_v1.example.json`.
7. Require the manifest evaluator to return `ready_for_canary`.

## Deployment Order

1. Confirm current production health and backup freshness.
2. Apply only frozen, preflighted migrations in ledger order.
3. Read back schema, grants, RLS, counts, and migration hashes.
4. Deploy server workers and confirm exact commit plus inactive/paused state.
5. Deploy web and run signed-out and signed-in smoke tests.
6. Activate workers one at a time: control plane, source intake, MEE, pricing,
   then discovery. Reconcile each before activating the next.
7. Distribute signed Android and TestFlight builds.
8. Complete the same-candidate client gate.
9. Start the canary only after all prior steps reconcile.

## Rollback Manifest

The manifest must identify:

- previous source commit;
- previous production web deployment;
- previous signed Android and TestFlight build IDs;
- every candidate migration and its rollback class;
- prior systemd units, timers, environment hashes, and worker commit;
- publication pointer and release-control state before deployment; and
- exact commands and readbacks for each rollback unit.

Database restore cannot be the ordinary rollback strategy. Candidate
migrations must be backward-compatible and either transactionally reversible
or have a tested forward correction. Mobile rollback means halting release and
redistributing a prior governed build; it does not imply remotely replacing an
installed binary.

## Automatic Rollback Triggers

- authentication or authorization boundary failure;
- unresolved SEV-1 or SEV-2 incident;
- source, pricing, publication, or Vault reconciliation mismatch;
- candidate commit drift across any workload or client;
- search/API p95, user error, image failure, or connection utilization outside
  the frozen objective for two consecutive observations;
- silent worker failure or stale control-plane state; or
- migration/read-model incompatibility.

## Rollback Verification

After rollback, prove:

- previous web deployment is active;
- previous worker definitions and schedules are active;
- migration and publication state are internally consistent;
- search, pricing, Vault, images, sharing, and Memory links pass;
- no candidate-only row or pointer leaks to clients; and
- incident and rollback artifacts reconcile with zero unexplained mismatch.

Public rollout remains a separate decision after a clean canary.
