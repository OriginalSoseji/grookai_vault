# Intake baseline recovery evidence

This directory records the October 27 recovery investigation. These are bounded,
one-use scripts for the named local labs and canonical read-only target. They
are not a general reset utility or an authorized production apply path.

Read `docs/checkpoints/INTAKE_BACKEND_RECOVERY_20261027.md` and
`docs/audits/intake_recovery_20261027/REVIEW.md` first. The source candidate lives
in `C:/gv_intake_recovery_20261027`, based on main
`30b3c99a893c61e173204a5568f6d46a4969dfcb`. Private snapshots and local CLI logs
live under `C:/gv_intake_recovery_private_20261027`; never copy them into Git.

The successful sequence was:

1. Recover the exact committed historical lot-label SQL; compare its object
   shape offline with a schema-only live capture. This first comparison
   normalized CRLF for classification and is not exact-text qualification.
2. Capture the entire public catalog and governed security metadata with
   `catalog_snapshot.mjs remote`, in a repeatable-read read-only transaction.
3. Prepare a new internal-network v5 platform lab and perform the real CLI reset
   to the empty pre-alias prefix. The first v5 reset driver stopped before CLI
   invocation because its monitor readiness timeout was too short.
   `resume_unstarted_verified_reset.mjs` proved no reset had run and performed
   the genuine first reset. It did not retry a reset on a populated lab.
4. Insert the declared synthetic historical prerequisite and apply all unchanged
   476 source migrations with the real CLI. Verify exact ledger and no-op push.
5. Test the guarded forward-only reconciliation in the diagnostic lab; apply the
   exact candidate to the fresh v5 lab with CLI and prove retained data digests.
6. Capture `local-fresh`, compare `compare-fresh`, then take a separate
   `remote-final` / `compare-fresh-final` readback. No generated diff is executed.

`replay_gateway_ready_history.mjs` now contains the corrected 50-second monitor
startup bound and Windows file URL conversion. Its exact executed earlier bytes
are retained separately and bound to the original preparation receipt. **Do not
rerun prepare/reset/complete on any existing lab.** These consumed preparations
and all populated labs are preserved. `verify` is only for the earlier 476 state;
the final lab now has 477 and is checked by the reconciliation/catalog scripts.

The readiness relay forwards real responses. Its four behavior tests run inside
a separate network-disabled container. `INTAKE_PROOF_RELAY_PORT` is required and
accepts only the two declared variants, 60441 or 60481. No mutation is retried.

Earlier `replay_history_with_prerequisite.mjs`, `replay_platform_history.mjs`,
`replay_ready_history.mjs` and their failure receipts are retained investigation
history, not the successful operational route. The ordinary strict gate remains
unchanged and still fails at the immutable data-dependent alias migration.

No script here authorizes production writes, migration history repair, altered
historical SQL, fake health responses, disabled TLS verification, or a release
claim based only on stored receipts. Recovery is not complete until the required
governed qualification and committed reconciliation release are complete.
