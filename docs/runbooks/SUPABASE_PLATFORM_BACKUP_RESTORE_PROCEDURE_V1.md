# Supabase Platform Backup Restore Procedure V1

Status: review-required, human-operated disaster-recovery procedure

Production project: `ycdxbpibncqcchqiihfz`

Official reference reviewed on 2026-07-24:
<https://supabase.com/docs/guides/platform/backups>

This is the only restore procedure accepted by the Collaborative Binders V1
unattended-supervisor authorization contract. The authorization envelope binds
the exact bytes of this file by SHA-256 and by this fixed URI:

`repo:///docs/runbooks/SUPABASE_PLATFORM_BACKUP_RESTORE_PROCEDURE_V1.md`

For this one-shot V1 contract, `inserted_at` from the pinned Supabase CLI
physical-backup row is the only machine-verifiable backup timestamp and is
therefore recorded as `recoverable_through_utc`. It is a selection and
guard-horizon marker, not an independent guarantee about transaction-level
coverage. Before any restore, the human operator must compare it with the
Dashboard's displayed backup/recovery point. If Supabase displays a different
time or does not make the coverage clear, stop and obtain Supabase Support
confirmation; calculate potential data loss from the earlier defensible point.

## Hard boundary

The unattended supervisor never starts, schedules, or approves a restore. A
restore replaces database state and can discard every database write after the
selected recovery point. It is a separate destructive control-plane action
requiring an awake owner, current incident evidence, and a new explicit
authorization after the rollout process has stopped.

Do not improvise a rollback with migration-history repair, manual SQL, a second
database push, an internal API, or an automatic retry.

## Required access and evidence

Before proposing a restore:

1. Stop the rollout and prevent any automated restart. Preserve the supervisor
   state directory, authorization envelope, immutable attempt and mutation
   claims, rollout artifact directory, `STOP-incident.json`, process output,
   migration ledger, and catalog readbacks.
2. Treat a started, timed-out, interrupted, or indeterminate database push as
   `mutation_possible`.
3. Sign in to the Supabase Dashboard with an account authorized to restore the
   production project. Independently verify the organization, project name,
   project ref `ycdxbpibncqcchqiihfz`, and current incident.
4. In **Database > Backups**, verify that the exact physical backup recorded by
   the supervisor still appears as completed and restorable. Its UTC
   `inserted_at` value is the recovery horizon used by this contract.
5. Calculate and document the data-loss window from that recovery horizon to
   the proposed restore start. Identify user writes, purchases, messages,
   collection changes, authentication changes, and operational updates that
   could be lost or need reconciliation.
6. Plan for the project to be inaccessible during restoration. Pause or drain
   application writes and integrations only under a separately approved
   incident plan.
7. If the project has non-Realtime replication slots or subscriptions, make a
   reviewed plan to drop them before restoration and recreate them afterward.
   Supabase handles its own Realtime slot.
8. Record that database backups do not restore Storage objects deleted after
   the recovery point; they restore database metadata, not the missing object
   bytes. Plan a separate Storage reconciliation if needed.
9. Record every custom login role whose password must be reset after a daily
   backup restore; Supabase daily backups do not retain custom-role passwords.
10. Obtain explicit owner approval naming the exact project, exact backup UTC
    recovery horizon, estimated downtime, and accepted data-loss window.

If the backup, project, access level, or data-loss window is uncertain, stop
and contact Supabase Support. Do not guess.

## Human restore execution

1. Keep the application in the separately approved incident state and confirm
   no rollout or remediation process is running.
2. Open the verified production project in the Supabase Dashboard.
3. Open **Database > Backups** and select the exact reviewed completed physical
   backup. Do not select a merely nearby backup or a different timestamp.
4. Recheck the displayed project and recovery point against the written owner
   authorization.
5. Use the Dashboard restore action and review its confirmation prompt. If the
   Dashboard flow, project, recovery point, or warnings differ from this
   procedure or the owner authorization, cancel and escalate.
6. Confirm the restore only after the final human comparison. Record the
   operator, UTC start time, selected recovery point, Dashboard notification or
   operation identifier, screenshots, and incident identifier.
7. Wait for the Dashboard to report completion. Do not run migrations, repair
   history, enable feature flags, or resume writes while the restore is in
   progress.

## Verification before reopening traffic

1. Confirm the project and database report healthy and record the UTC
   completion time.
2. Reset and test any affected custom-role passwords without recording secrets
   in rollout artifacts.
3. Recreate and validate any separately managed replication slots or
   subscriptions.
4. Compare the migration ledger, database catalog, Trust/Pulse/card-event
   fingerprints, and key row counts with the preserved pre-apply evidence and
   the approved recovery point.
5. Verify authentication, Vault, Wall, Pulse, Discover, messaging, Trust,
   hosted image delivery, Storage object availability, and Realtime behavior.
6. Confirm all 11 Binder feature flags remain disabled. P8 remains excluded.
7. Reconcile or deliberately discard post-recovery-point writes according to
   the incident plan.
8. Preserve new recovery evidence before any separately reviewed remediation
   or traffic reopening.
9. Record the final outcome, unresolved data loss, follow-up owners, and the
   exact time normal writes resume.
