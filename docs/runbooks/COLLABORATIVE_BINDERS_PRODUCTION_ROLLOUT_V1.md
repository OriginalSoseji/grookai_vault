# Collaborative Binders V1 Production Rollout

Status: prepared, not applied

Package: `COLLABORATIVE-BINDERS-DB-V1`

Production project: `ycdxbpibncqcchqiihfz`

Package fingerprint:
`14a235d9ca9bc2172ddd3bfb8e2ba8b8812849079fe0469b73f35d02b6b47fb9`

## Purpose and boundary

This runbook installs the reviewed Collaborative Binders database package. It
does not activate Binders, change application environment variables, deploy
the web or mobile app, or enable any feature flag.

The five migrations are individually transactional. They are not one atomic
five-migration transaction. If a command or readback fails, stop. Do not retry
the push, change migration history, or attempt an automatic rollback.

The following flags remain explicitly outside this rollout:

- `set_binders`
- `notifications`
- `pulse_milestones`

P8 is excluded. All 11 Binder flags must remain disabled after installation.

## Reviewed migration set

Only these pending migrations are allowed, in this order:

1. `20260723100000_collaborative_binders_schema_v1.sql`
2. `20260723101000_collaborative_binders_core_rpcs_v1.sql`
3. `20260723102000_collaborative_binders_collaboration_rpcs_v1.sql`
4. `20260723103000_collaborative_binders_read_rpcs_v1.sql`
5. `20260723104000_collaborative_binders_service_rpcs_v1.sql`

The immutable filenames, byte hashes, cumulative object counts, expected final
shape, and disabled flags are recorded in
`scripts/ops/collaborative_binders_production_manifest_v1.json`.
The two linked readback SQL files are byte-hash pinned into the same package
fingerprint. The cumulative stage counts are evidence from the completed
disposable five-stage replay; the production command still applies the exact
pending set in one CLI invocation and performs a final readback afterward.
Before this first rollout, the still-pending schema migration was amended to
remove raw `anon` and `authenticated` access to the Binder rate-limit identity
sequence and reserve that sequence for `service_role`. This is part of the
reviewed first migration, not a sixth migration.

This is not an inert schema-only change even while flags are off. The package
also hardens Trust privileges and policies, installs Trust/Vault/slab Binder
guards, publishes `binder_refresh_signals`, and wraps Pulse/card-event read
paths. That is why recovery evidence and immediate post-apply readback are
mandatory.

## Preconditions

Complete all of these before running the linked preflight:

1. Merge the rollout guard package to `main`.
2. Pull the exact reviewed `origin/main` commit into a clean `main` worktree.
3. Record that 40-character commit SHA. It is the `ExpectedHeadSha`.
4. Use Supabase CLI `2.90.0`, the version exercised by this package.
5. Confirm the linked database is PostgreSQL major 17. The read-only preflight
   rejects every other major version before an apply can be authorized.
6. Explicitly link the worktree to project `ycdxbpibncqcchqiihfz`. The scripts
   never link a project automatically.
7. Set `SUPABASE_URL` to
   `https://ycdxbpibncqcchqiihfz.supabase.co`.
8. Remove database-routing overrides such as `DATABASE_URL`,
   `SUPABASE_DB_URL`, and `PG*`.
9. Confirm a recent recoverable production backup or PITR point.
10. Choose a new absolute artifact directory outside every Git worktree.

The guard requires `HEAD`, `origin/main`, and the reviewed SHA to be identical.
It also requires the Binder base commit to be an ancestor. A feature branch,
dirty tree, untracked file, wrong project, stale backup, ledger drift, hash
drift, or dry-run drift stops before the apply command can be constructed. The
reviewed Supabase launcher, binary, and Scoop shim descriptor are known-hash
pinned. Before the push, the guard opens read-only exclusive seals over all
migration files, the project link/config, pinned readbacks, package manifest,
backup evidence, and those CLI components. It keeps the seals through the
decisive post-apply ledger and catalog readback, and through any diagnostic
reads on a stopped apply. The migration directory must contain exactly the SQL
files tracked by Git; ignored or untracked SQL is not allowed. The guard then
copies that exact locked source into a temporary sealed Supabase worktree,
denies file creation and writes in its migration directory, locks every staged
input, rehashes the staged copy, and runs the single push from that sealed
copy.

## Backup evidence

The operator creates a JSON evidence file outside the repository. The rollout
does not create or claim a backup.

```json
{
  "schema_version": 1,
  "project_ref": "ycdxbpibncqcchqiihfz",
  "backup_kind": "supabase_pitr",
  "verified_at_utc": "2026-07-23T12:00:00Z",
  "recoverable_through_utc": "2026-07-23T12:00:00Z",
  "evidence_reference": "operator-visible backup or PITR reference",
  "restore_path_reviewed": true,
  "operator": "operator name"
}
```

`backup_kind` may be `supabase_pitr`, `supabase_platform_backup`, or
`verified_logical_backup`. Verification must be no more than 24 hours old, and
the recoverable horizon must be within 15 minutes of the preflight.

## Source-only validation

This mode is local-only. It verifies the package fingerprint, exact migration
bytes, project config, SQL read-only boundary, repository identity, and pinned
CLI version. It does not inspect or change production.

```powershell
pwsh -NoProfile -File scripts/ops/collaborative_binders_production_preflight_v1.ps1 `
  -ValidateSourceOnly
```

## Linked production preflight

Run from the clean, reviewed `main` worktree:

```powershell
pwsh -NoProfile -File scripts/ops/collaborative_binders_production_preflight_v1.ps1 `
  -ExpectedHeadSha "<reviewed-main-sha>" `
  -BackupEvidencePath "C:\secure-ops\binder-backup-evidence.json" `
  -ArtifactRoot "C:\secure-ops\binder-rollout-<timestamp>"
```

The preflight is read-only. It checks the production binding, linked migration
ledger, exact five-file dry run, baseline Trust/Pulse/card-event fingerprints,
the exact relevant default-ACL baseline, client schema-creation denial, exact
Realtime publication configuration, absence of pre-existing Binder
objects/data, and the recovery evidence. It writes a four-hour preflight
manifest and two exact acknowledgement strings to the external artifact
directory.

The linked catalog reads are one static CTE `SELECT` each. Supabase CLI 2.90.0
executes linked queries as one prepared statement, so the source validator
rejects semicolons, multiple statements, and mutation-capable SQL keywords.
An external 45-second process timeout bounds each read.

Review every artifact, especially:

- `repository.json`
- `project-binding.json`
- `ledger.before.json`
- `readback.before.json`
- `dry-run.parsed.json`
- `preflight-manifest.json`
- `approval.txt`

Do not continue if the preflight reports anything other than `pass`.

## Apply

Copy the two exact values from `approval.txt` into the current PowerShell
process. Do not edit, normalize, or shorten them.

```powershell
$env:GROOKAI_BINDER_PROD_BACKUP_ACK = "<exact BACKUP-VERIFIED value>"
$env:GROOKAI_BINDER_PROD_APPLY_ACK = "<exact APPLY-COLLABORATIVE-BINDERS-V1 value>"

pwsh -NoProfile -File scripts/ops/collaborative_binders_production_apply_v1.ps1 `
  -ManifestPath "C:\secure-ops\binder-rollout-<timestamp>\preflight-manifest.json" `
  -ConfirmProduction
```

PowerShell asks for high-impact confirmation unless the operator deliberately
supplies its standard confirmation override. Immediately before applying, the
guard revalidates the manifest, expiry, source bytes, CLI binary, clean main
SHA, origin SHA, production binding, recovery evidence, exact ledger, baseline
catalog readback, and dry run. It also rechecks the exact tracked migration
directory before constructing the sealed temporary source.

There is exactly one permitted remote mutation command:

```text
supabase db push --linked --yes
```

The package has no arbitrary command or SQL passthrough. It never includes
seeds, roles, a database URL, or a password. It never links, pulls, resets,
changes migration history, or writes feature flags.

The mutator runs inside a gated Windows Job Object. The reviewed executable
cannot start until its supervisor is inside the job, and source cleanup cannot
begin until both the supervisor and its entire process tree have exited. If
the push times out, the guard terminates the job, preserves bounded
stdout/stderr, marks remote mutation as possible, performs only a diagnostic
ledger/readback after termination is confirmed, and stops. If termination
cannot be confirmed, the runner fails fast while the kill-on-close job handle
and source seals are still held; it does not clean the staged source or begin
diagnostic reads. It never claims that flags or migration state are unchanged
after a timed-out or failed push.

After process-tree termination is confirmed, the sealed temporary source is
deleted. It contains no copied pooler URL or database password. A sanitized
manifest of staged filenames and hashes is retained in the external apply
evidence directory. If ordinary cleanup cannot safely unseal and remove the
temporary source, the guard stops. In the exceptional fail-fast containment
path, ordinary cleanup deliberately does not run; treat any matching sealed
temporary directory as incident evidence until the process tree is confirmed
absent and recovery is directed.

## Mandatory post-apply readback

After a successful push, the apply guard automatically requires:

- the exact ledger delta is only the five reviewed migration versions, with no
  removed or additional version
- all five migrations shared in the linked ledger, with no local-only or
  remote-only row
- 21 Binder tables, all with RLS
- 124 Binder functions with the reviewed aggregate body fingerprint
- 65 indexes, 22 policies, and 22 introduced triggers
- exact fixed `search_path` distribution
- zero default PUBLIC Binder-function execution
- reviewed anon/authenticated/service RPC execution counts
- no raw anonymous Binder-table access
- no raw anonymous or authenticated Binder-sequence access
- no authenticated raw Binder mutations
- authenticated raw `SELECT` only on `binder_refresh_signals`
- `binder_refresh_signals` as the only Binder Realtime table
- exact Realtime publication owner/options and the reviewed
  `binder_refresh_signals` column projection with no row filter
- no effective `CREATE` privilege for client roles on `public` or `extensions`
- exactly 11 flags and zero enabled flags
- empty Binder domain tables before activation
- no Binder events or Binder trust reports seeded by installation

The apply result is not `pass` unless every assertion succeeds.

## Smoke and observation

After the automatic readback passes, perform read-only smoke checks against the
existing production behavior:

1. Web: sign in, Discover, Vault, Wall, Pulse, and a card detail.
2. Android: the same signed-in paths on the production build.
3. Trust: open report/block entry points without submitting test abuse data.
4. Messaging and public card-event feeds: verify ordinary existing reads.
5. Images: verify hosted card thumbnails and high-quality card detail images.
6. Observe database latency, API errors, auth errors, and Realtime errors for a
   defined stabilization window.

Because every Binder flag is off, no Binder UI or client traffic should be
activated by this database installation.

## Stop conditions

Stop immediately on any of these:

- partial or unexpected migration ledger
- wrong project, URL, database host, branch, or SHA
- missing, stale, or changed recovery evidence
- changed migration byte hash or package fingerprint
- unexpected pre-existing Binder object or domain data
- Trust/Pulse/card-event baseline drift
- push failure or timeout
- post-apply ledger or catalog mismatch
- any enabled Binder flag
- unexpected app, API, auth, latency, or Realtime regression

On a stop, preserve the external artifacts and `STOP-incident.json`. Leave all
flags off. Do not use migration-history repair, force inclusion, manual SQL, an
automatic retry, or an improvised rollback. Escalate with the exact ledger and
readback evidence and choose recovery deliberately.

## Later activation boundary

Feature activation is a separate reviewed project. The intended sequence is:

1. `schema_internal`
2. `personal`
3. `shared`
4. `view_links`, then `public`
5. `community`, `custom`, and `templates`

Each step needs its own smoke/observation gate. `set_binders`,
`notifications`, and `pulse_milestones` remain excluded, and P8 is not part of
this runbook.
