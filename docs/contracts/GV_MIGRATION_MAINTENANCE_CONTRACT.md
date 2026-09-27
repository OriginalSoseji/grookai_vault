# Grookai Vault — Migration Maintenance Contract (v1)

## Store team baseline (2026-09-27)

`VendorStoreTeamBaselineAudit` permits only the fixed read-only AuditLinkedSchema
comparison of production402 and the preserved290xx baseline. Combined modes,
target overrides and PrePush are rejected. It changes no apply authority.
The separate294xx synthetic lab has403 replay proof, preserving10355 existing
objects and adding73 team objects. Original preparation bytes remain preserved;
final replay uses a new one-use directory. See STORE_TEAM_CHECKPOINT_20260927.md.

`VendorStoreTeamReleaseV1` additionally permits AuditLinkedSchema/PrePush with
only20260927060000. The unchanged duplicate-object scan remains mandatory. It
binds403 replay,11 role/concurrency tests,6 real HTTP/Auth/Storage tests, browser
source hashes, the normal commit-hook receipt, fresh402 production schema and
paused catalog checkpoint. The gate performs no apply. The separate one-use CLI
package allows only this migration, keeps team disabled, preserves other rollout
controls and verifies retained data plus403 schema/security parity afterward.

## Production storefront package (2026-09-26)

`-StorefrontProductionTrialsV1` separately permits only `20260926200000` over
the now-applied 401 baseline. It retains the same strict pending-object scan,
read-only pinned schema/security comparison and fixed production target. The
dedicated 402 upgrade changes one entitlement reader and adds 26 invitation
objects; all other objects and existing permissions are retained. Full402 replay,
seven real permission/concurrency/expiry tests, eighteen intake regression checks,
HTTP handler checks and normal shipcheck are required. It never grants access or
creates invitations itself. Production application remains a separate one-use
CLI push with retained-data readback and disabled controls.

`-StorefrontProductionReleaseV1` permits only `20260926190000`, the fixed
`ycdxbpibncqcchqiihfz` target, and AuditLinkedSchema/PrePush. Combined modes,
other IDs and target/output overrides fail before access. The unchanged pending
object scanner runs. The gate compares a fresh read-only production snapshot
with the recovered 400-file baseline, including owner/ACL/RLS/configuration;
only the already-governed three-table column-order reconciliation is permitted.
It verifies the dedicated 290xx full 401-file replay, exact equality with the
tested 419-file development schema, six shared-admission checks, eighteen real
Auth/Storage/HTTP checks and the normal repository shipcheck. It binds source,
payload, current production footprint and the paused catalog checkpoint.
The nineteen unapplied originals remain byte-exact in the package audit archive.
This gate performs no apply. Production application still requires the exact
package through `supabase db push`, disabled rollout controls, fresh binding,
post-apply schema/security/readback proof, and separate web activation.

## Isolated cancellation overlay (2026-09-23)

`VendorBatchCancellationBaselineAudit` is read-only against the new276xx lab,
with exactly17 pending prerequisites and optionally20260923060000. Its full418
replay passes. `PrePush -VendorBatchCancellationPilotApply` accepts only that
one cancellation migration and the fixed hrtbjchobencariqclab bootstrap pilot.
It binds current empty/off local state,418 frozen migrations, application proof,
payload/tool hashes and the complete remote schema footprint. Wrong modes,
targets, combined exceptions and extra IDs fail before access. The one-use apply
changes2 functions and adds14 objects, preserves owner data and existing receipt
rows, and invents no ledger entries. It grants no production apply authority.
See docs/audits/vendor_batch_cancellation_v1/IMPLEMENTATION_20260923.md.

## Isolated batch pilot overlay (2026-09-23)

`PrePush -VendorBatchCommitPilotApply` accepts only IDs `20260923040000,20260923050000`
and the fixed `hrtbjchobencariqclab` bootstrap pilot. The gate binds the frozen 417-file
replay, current empty/off local guard, tested application hashes, exact payload,
tool and remote schema fingerprints. Combined exceptions and arbitrary targets
fail before access. The one-use apply retains profiles, copies, stores and grants,
keeps batch control disabled, and verifies all 28 additions against the local
replay while preserving every previous schema object. No ledger rows are invented.
This is not production application or catalog integration authorization.

## Batch intake development baselines (2026-09-23)

VendorBatchCommitBaselineAudit is read-only and fixed to new260xx, the exact
15 pending prerequisites and optionally 20260923040000. VendorBatchPrivateCopyBaselineAudit
is fixed to new264xx, the exact16 prerequisites and optionally 20260923050000.
Neither accepts PrePush, other IDs, target overrides or combined exceptions.
Both compare the400-row linked baseline with the unchanged inspection/security
engine. Complete416 and417 local resets pass. The first preserves10,248 prior
objects and adds28 intake objects. The correction changes only the finalization
function, preserves its permissions and all10,275 other objects, and leaves earlier
migration bytes intact. Both prepared resets are consumed. The264xx initial start
mistakenly included one pending migration; a hash-bound recovery preserved its
failed log and removed only that copied file before completing the400-file baseline.
No remote apply authority or catalog fingerprint exemption is introduced.
See docs/audits/vendor_batch_commit_v1 and vendor_batch_private_copy_v1.

## Order notifications after catalog recovery (2026-09-22)

AuditLinkedSchema -VendorOrderNotificationsV2BaselineAudit uses only the new240xx
400-row baseline with the exact eleven prior pending storefront IDs. Apply,
arbitrary targets/IDs and combined exceptions fail before remote access. The
fresh read-only comparison passes with895 security objects and no normalized
schema delta. Full412 replay preserves411 source files and10,132 schema objects;
six function definitions change with grants preserved and25 objects are added.
Preparation/reset are consumed. See VENDOR_ORDER_NOTIFICATIONS_V1.md; this grants
no remote application or catalog dependency exemption.

## Storefront recovered catalog baseline (2026-09-21)

AuditLinkedSchema -VendorStoreCatalogBaselineAudit uses only new236xx400-row
baseline and the exact eleven pending storefront IDs through20260920090000.
PrePush, arbitrary IDs/targets, and combined exceptions fail before remote access.
Three already-applied migrations are recovered byte-exact from the ledger, with
408 earlier source files retained. Strict comparison passes with895 security
objects and no normalized schema delta. Full411 reset preserves10,133 objects;
only the two recovered function definitions, three additions, and one replaced
constraint differ. Existing function permissions remain unchanged. Preparation
and full reset are consumed. See VENDOR_STORE_CATALOG_RECOVERY_V1.md; no remote
apply, catalog execution, shared reset, or release authorization is introduced.

## Durable refund baseline (2026-09-20)

AuditLinkedSchema -VendorOrderRefundsBaselineAudit checks only new228xx397-row
baseline read-only, accepting ten prior pending IDs through20260920080000 and
optionally20260920090000. PrePush/arbitrary/combined modes fail before remote
access. Full408 replay retains407 files and10,067 objects, changes two fulfillment
definitions without permission changes, and adds67 refund objects. Prepare/reset
are consumed. No remote apply or catalog fingerprint gate is relaxed.

## Order fulfillment baseline (2026-09-20)

AuditLinkedSchema -VendorOrderFulfillmentBaselineAudit compares only the new224xx
397-row baseline. Exactly nine prior pending IDs through20260919210000, optionally
20260920080000, are accepted. PrePush, arbitrary and combined modes fail before
remote access. Full407 replay retains406 prior files and10,035 objects, adding34
fulfillment objects. No remote apply gate or repair fingerprint rule is relaxed.
Preparation/baseline/full reset are complete; preserve all preceding projects.

## Order retry queue baseline (2026-09-19)

AuditLinkedSchema -VendorOrderRetryBaselineAudit compares the final220xx397-row
baseline read-only with the pinned inspection/security engine. Exactly eight prior
pending IDs through200000, optionally210000, are accepted. PrePush, arbitrary and
combined exceptions fail before remote access. Full406 replay preserves405 prior
files and9,967 objects, adding68 queue objects. The earlier216xx draft is retained
after lock-order review; completed resets must not be rerun. No remote apply gate
is relaxed. Recheck catalog dependency fingerprints before separate integration.

## Unstarted order cancellation baseline (2026-09-19)

AuditLinkedSchema -VendorUnstartedOrderBaselineAudit compares the fixed212xx397-row
baseline read-only. Exactly seven prior pending IDs through180000, optionally
200000, are accepted; arbitrary/combined/PrePush exceptions fail before CLI access.
Inspection/security authority is unchanged. Full405-file replay preserves404 prior
source files and9940 unrelated objects; only two stock constraints and the stock
transition function change, with24 cancellation additions. Completed208xx and
earlier databases remain untouched. No remote apply authorization.

## Order cancellation recovered baseline (2026-09-19)

AuditLinkedSchema -VendorOrderCancellationBaselineAudit compares only the fixed
208xx397-row baseline, including already-applied193000 recovered byte-exact from
the ledger. Exactly seven pending IDs through20260919180000 are allowed. PrePush,
combined exceptions and arbitrary IDs fail before remote access. The inspection
and security engine is unchanged. Full404-file replay preserves all403 prior
source files and permits only the recovered Japanese identity objects to differ
from the prior403-object footprint. No production apply or catalog execution is
authorized. Read VENDOR_ORDER_CANCELLATION_BASELINE_V1.md for exact provenance.

## Private checkout baseline (2026-09-19)

AuditLinkedSchema -VendorCheckoutBaselineAudit compares the new fixed 200xx 396-row
baseline read-only with the unchanged pinned inspection/security engine. Exact
prerequisites are 20260919050000,080000,120000,130000,150000 and170000 (same date),
optionally 20260919180000. Arbitrary IDs, combined exceptions and PrePush fail before
remote access. Full 403-file local reset is separate proof, preserving every prior
object and adding only two private checkout functions. Default gates and duplicate
scanning stay unchanged. Preserve all earlier environments and do not rerun
completed resets. This is not remote apply or catalog integration authorization.

## Private orders baseline (2026-09-19)

AuditLinkedSchema -VendorOrdersBaselineAudit compares only the new fixed 196xx
396-row baseline read-only with the unchanged pinned inspection/security engine.
Exact prerequisites are storefront050000, billing080000, custom120000,
seller130000 and stock150000 on 20260919, optionally order170000. PrePush,
arbitrary IDs and combined exceptions fail before remote access. Default gates
and duplicate scanning remain intact. Full 402-file reset is separate proof;
five exact stock objects change and all others remain preserved. The first
unapplied draft had a SQL quoting error; its bytes/log are retained and the
empty196xx correction is bound to their exact digests. Do not reuse completed
replay/recovery tools. Neither local exception authorizes remote apply or waives
catalog dependencies.
_November 2025_

This document defines how schema changes must be made and validated for Grookai Vault.
The goal is to **never** repeat the migration drift and shadow DB errors we just fixed.

## Migration Drift Guardrail (No-Drift Rule)

- The only source of truth for schema is `supabase/migrations` in git.
- Schema changes never happen directly in Studio or via ad-hoc SQL; they only happen via migrations.
- Before any schema work starts, we must run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema`.
- Before any `supabase db push`, we must run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>`.
- `supabase db reset --local` is mandatory proof that the migration chain is replayable.

### No-Drift Checklist (Run Before Any `supabase db push`)

1. `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema`
2. `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>`
3. Confirm:
   - No rows where **Remote has a version and Local is blank** (remote-only drift).
   - Local-only rows are exactly the migrations you intend to push.
   - `supabase db reset --local` passed as part of strict preflight.
4. If remote-only drift exists:
   - STOP.
   - Follow `docs/playbooks/REMOTE_SCHEMA_DRIFT_RECOVERY_V1.md`.
5. Only then run: `supabase db push`.

### Forbidden moves

- ❌ No schema edits directly in Supabase Studio.
- ❌ No `ALTER TABLE` / `CREATE TABLE` in random SQL tabs without a migration file.
- ❌ No `db push` without strict preflight passing.
- ❌ No continuing migration work after an emergency remote edit until reconciliation is complete.

## 1. Principles

### Stock reservation baseline (2026-09-19)

`AuditLinkedSchema -VendorStockBaselineAudit` compares the new fixed 192xx
396-migration baseline read-only using the unchanged pinned inspection/security
engine. It accepts exactly the pending storefront, billing, custom-import and
seller-binding IDs, optionally followed by `20260919150000`. PrePush, arbitrary
IDs and combined exceptions fail before CLI access. The full 401-file local reset
is separate proof, with all prior objects preserved and only named stock objects
added. All earlier proof projects remain intact. Neither completed reset helpers
nor this baseline exception authorize remote apply or waive catalog dependencies.

### Seller binding baseline (2026-09-19)

`AuditLinkedSchema -SellerBindingsBaselineAudit` compares the new fixed 188xx
396-migration baseline read-only. It accepts exactly the pending storefront,
billing and custom-import IDs, optionally followed by `20260919130000`. PrePush,
arbitrary IDs and all combined exceptions are rejected before CLI access. The
same pinned inspection/security engine and exact column-order reconciliation
apply; default gates and duplicate scanning are unchanged. The subsequent 400-file
reset is separate local proof. A reproduced first-binding/deauthorization race
required one narrowly bound revision of this new empty development project; its
initial migration, footprint and receipt are retained. All earlier projects remain
untouched. Read `VENDOR_SELLER_BINDINGS_V1.md` and its proof; do not reuse completed
replay commands or treat local proof as remote apply authority.

### Custom-product import baseline (2026-09-19)

`AuditLinkedSchema -CustomImportBaselineAudit` is a read-only comparison against
the new fixed 184xx project. The exact pending set must be storefront `20260919050000`
and billing `20260919080000`, optionally followed by import `20260919120000`.
Other IDs, combined exceptions and PrePush are rejected before remote access.
The 396-row baseline uses the unchanged pinned inspection/security engine and
exact three-table column-order reconciliation. Earlier proof databases are retained.
The subsequent full 399-file local reset and schema footprint are separate proof.
`replay_custom_import_v1.mjs --verify` can finish verification after a proven reset;
it cannot reset anything and requires the exact retained ledger, hashes and log.
Remote PrePush, pending-order and catalog-dependency gates are unchanged.

### Applied catalog index recovery (2026-09-19)

`AuditLinkedSchema -StoreIndexBaselineAudit -ExpectedLocalOnlyIds
20260919050000,20260919080000` compares the fixed empty 180xx baseline with the
396-row production ledger, including recovered applied index `20260919100500`.
It verifies source/copy hashes, pinned image, internal network, empty fixtures,
zero workers and the unchanged schema/security comparison. It rejects PrePush,
other pending IDs and combined exceptions before CLI access. It cannot apply or
reset anything. Read `docs/audits/vendor_storefront_index_reconcile_v1/RECONCILIATION.md`.
The separate one-time 398-file reset proves the complete candidate; 164/168/172/176
proof projects remain intact. Existing remote PrePush and catalog dependency gates
still apply, including explicit handling of the two older pending migrations.

### Vendor billing baseline audit (2026-09-19)

The later billing foundation uses a separate 176xx runtime, leaving the reconciled
172xx proof intact. Its 397-file reset is recorded in
`docs/audits/vendor_stripe_billing_schema_v1/FOUNDATION_PROOF.md`. Postgres
17.6.1.113 is pinned per project because .106 crashes on permission-denial tests.
The runtime's explicit internal `--network-id` is mandatory for both start and
reset. Rollback/idempotence and real concurrent-connection tests pass without
changing client permissions. This local receipt does not waive PrePush, authorize
production apply or replace the baseline/security/catalog-dependency gates below.

`AuditLinkedSchema -VendorBillingBaselineAudit -ExpectedLocalOnlyIds 20260919050000`
compares the separately prepared, empty 172xx project with production using the
same pinned inspection engine and exact column-order reconciliation. The audited
baseline includes the already-applied, byte-bound One Piece migration
`20260919054500`; the source recovered from its repair worktree must match the
production ledger's SQL. No catalog data executor is replayed remotely.

This option is read-only and cannot be combined with other exceptions or used
for PrePush. It permits the storefront prerequisite and, once authored, only the
named billing migration `20260919080000`. It checks exact ledger/source hashes,
configuration, isolated internal network, empty local application data and disabled
workers. Both schema SQL and supplementary security attributes must match. It
neither authorizes a production apply nor waives the unchanged PrePush duplicate
checks. The new project's real baseline reset is recorded separately; the preserved
164xx and 168xx proof databases must not be reset.

The added production ledger row invalidates the old 394-row release preflight as
current evidence. Reconcile the applied migration into repository history and
refresh the release gates before production application. The still-unapplied
storefront ID precedes the new remote head; any later apply plan must explicitly
account for that ordering and verify the exact pending set by dry run.

### Storefront Release Isolated Replay (2026-09-19 UTC)

The unapplied storefront candidate consolidates its three historical migrations
into `20260919050000_vendor_storefront_release_v1.sql`. Their original bytes remain
under `docs/audits/vendor_storefront_release_package_v1/historical_migrations`.
This is valid only while none of those three migration IDs has been applied remotely.

For this sole pending release, both strict phases accept
`-StorefrontReleaseIsolatedReplay -ExpectedLocalOnlyIds 20260919050000`.
Combining exceptions or supplying other pending IDs fails before CLI access.
The duplicate-object scanner is unchanged.

The baseline phase uses the pinned 0.6.1 inspection engine in a repeatable-read,
read-only production transaction through authenticated CLI access. It compares
the complete 394-migration local baseline, including a separate security comparison.
Only the existing exact three-table column-order reconciliation is allowed; no
function/view SQL is suppressed. Generated SQL stays private and is never executed.

The replay phase requires a fresh baseline receipt bound to source and tool hashes.
It resets only `C:/gv_store_release_20260919/.local/integration/release-replay`,
project `grookai-storefront-release-20260919`, database port 16822. The configuration,
release hash, 395 source/copy hashes, internal database network, disabled background
workers, and empty application data are checked before reset. The actual CLI command
includes `--local --no-seed --yes`, the explicit workdir and dedicated network.
Afterward the complete ledger, disabled rollout flags, and exact schema/definition/
ACL/policy footprint against the original 397-migration candidate must match.

This path does not reset the populated 164xx proof environment, weaken the default
gate, authorize production application, or replace catalog dependency coordination.
The hard-bound rehearsal is intentionally not a general-purpose database reset tool.

### Collector Cameo Isolated Replay (2026-09-12)

For the sole pending migration `20260912050000`, the strict gate accepts
`-CollectorCameoIsolatedReplay -ExpectedLocalOnlyIds 20260912050000`.
Other pending IDs and combining reconciliation exceptions are rejected.

In `AuditLinkedSchema`, require explicit `-AuditEnvFile` and a new `-AuditOutDir`.
The collector baseline audit compares all 393 applied migrations and requires
zero remaining SQL or security differences. Its three-table column-order
reconciliation uses the same exact column-definition checks described below;
no function/view SQL is suppressed. Optional `-InspectionDeps` must supply the
already pinned 0.6.1 inspection packages.

In `PrePush`, every existing ledger/pending/object check remains mandatory.
Replay resets only the separately created `collector-cameo-replay-20260912`
project on port 56530, never the existing preview database. The verifier checks
its resolved path, project/config hash, running container/port, empty application
data, exact 394-file inventory, and source/copy hashes before running the real
`supabase db reset --local --yes`. It verifies the complete ledger afterward.
An old success receipt alone cannot satisfy this gate. Default behavior is
unchanged. This option grants no production apply or broader reset authority.

### Scoped Replay Comparison (2026-09-07)

For the sealed-ownership prerequisite only, `AuditLinkedSchema` may use
`-ReconciledReplayAudit -ExpectedLocalOnlyIds 20260905120000,20260907160000`
with an explicit `-AuditEnvFile` and new `-AuditOutDir`. This is a read-only
baseline audit, not permission to apply either migration.

The pinned CLI inspection engine compares production with the isolated replay
database on port 55430. It may reorder inspection metadata for only
`card_prints`, `pricing_jobs`, and `sets`, and only after every named column's
definition matches exactly. It never alters database column order, normalizes
function text, or suppresses view SQL. View output order remains significant.
Owners, table/column/function grants, forced RLS, and function configuration are
checked separately. The only accepted remaining SQL delta is the exact
fingerprint-bound, still-pending image-dimension constraint repair.

Both reconciliation sources, the full replay ledger, and exact pending IDs must
match. Raw and reconciled SQL are retained as diagnostics and never executed.
Unexpected differences fail closed. The default raw-diff audit is unchanged.
`PrePush`, isolated replay, frozen apply authority, and remote readback remain
required. This exception must not be expanded to unrelated migrations or used
to justify dropping/recreating live views or canonical tables.

1. The **live database** (Supabase project) is the current state of the world.
2. The **migrations in this repo** are the story of how to build that world from scratch.
3. These two must always agree: a brand-new database must be able to replay all migrations
   (and any baseline) without errors and end up identical to prod.

## 2. Rule 1 — No schema changes outside migrations

- If it changes the **schema**, it must be represented in a migration file in
  `supabase/migrations/`.
- Do **not**:
  - Create or alter tables directly in the Supabase UI or SQL editor (except for
    short-lived experiments).
- Do:
  - Convert any UI/SQL experiments into proper migrations before relying on them.
  - Treat migrations as the **single source of truth** for schema evolution.

## 3. Rule 2 — Migrations must be idempotent and fresh-DB-safe

Every migration must be safe to run:

- On an already-migrated DB (no duplicate-column / duplicate-index errors).
- On a **fresh DB** where tables might not exist yet (e.g., `supabase db pull` shadow DB).

### 3.1 Guarding ALTERs and new columns

When altering existing tables or adding columns, always:

- Check that the table exists.
- Check that the column doesn’t already exist.

Example pattern:

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'my_table'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = 'my_table'
        AND column_name = 'new_col'
    ) THEN
      ALTER TABLE public.my_table
        ADD COLUMN new_col text;
    END IF;
  END IF;
END $$;
```

### 3.2 Guarding COMMENTs on legacy tables

When commenting on legacy tables (e.g. `cards`):

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cards'
  ) THEN
    COMMENT ON TABLE public.cards IS
      'LEGACY TABLE: superseded by card_prints. Do not build new features on this.';
  END IF;
END $$;
```

### 3.3 Guarding FKs to card_prints (no inline refs in CREATE TABLE)

Do **not** reference `public.card_prints` inline in `CREATE TABLE` in a way that will fail
on a fresh DB.

Instead:

```sql
CREATE TABLE public.external_mappings (
  id            bigserial PRIMARY KEY,
  card_print_id uuid NOT NULL,
  ...
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'card_prints'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'external_mappings'
        AND kcu.column_name = 'card_print_id'
    ) THEN
      ALTER TABLE public.external_mappings
        ADD CONSTRAINT external_mappings_card_print_id_fkey
        FOREIGN KEY (card_print_id)
        REFERENCES public.card_prints(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
```

## 4. Rule 3 — The replay trifecta (must pass before schema changes are “done”)

Whenever we add or modify migrations, the **minimum** validation sequence is:

1. Linked audit before any apply:

   ```bash
   pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
   ```

2. Apply to the target DB (remote or local):

   ```bash
   supabase db push
   ```

3. Fresh local DB replay:

   ```bash
   supabase db reset --local
   ```

4. Strict pre-push proof for the exact pending set:

   ```bash
   pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>
   ```

5. Shadow DB + baseline replay:

   ```bash
   supabase db pull
   ```

All three must succeed with no errors. If any step fails, fix migrations **before**
building additional features on top of that schema.

## 5. Rule 4 — No ad-hoc prod schema edits

* Production schema must be the result of migrations + `supabase db push`, not manual edits.
* In an emergency hotfix:

  * Document the exact change.
  * Stop all other migration work.
  * Run `supabase db pull` immediately in a clean reconciliation worktree.
  * Follow `docs/playbooks/REMOTE_SCHEMA_DRIFT_RECOVERY_V1.md` before any additional migration work.

## 6. Rule 5 — Card-print rules are sacred

Because `card_prints` is the canonical identity for all prints:

* `card_prints.id` is **uuid** and must remain so.
* Any table that references a print must use `card_print_id uuid` referencing
  `public.card_prints(id)`.
* No new migrations may introduce `bigint` print IDs or break the unique
  `(set_id, number_plain, variant_key)` identity.
* Any migration that touches `card_prints` must be carefully guarded and tested with
  the replay trifecta.

## 7. Syncing ChatGPT + Repo Rules

* ChatGPT is used as a co-architect and holds these rules in its long-term memory.
* This file is the **authoritative** copy inside the repo.
* **Whenever we change a rule in ChatGPT memory, we must also update this document and commit it.**
* If there is ever a disagreement between ChatGPT’s memory and this file, this file wins.

## 8. Why this matters

Following this contract guarantees:

* No more “relation does not exist” surprises in migrations.
* No more drift between remote schema and migrations.
* The ability to spin up fresh environments easily.
* Confidence that schema changes are intentional, reproducible, and safe.
* `supabase db reset --local` remains a mandatory gate, not an optional confidence check.

## Notification audit stopped on new catalog index (September20)

The new read-only VendorOrderNotificationsBaselineAudit uses isolated232xx and
exact eleven prior pending IDs, optionally20260920110000. It rejects apply and
combined/arbitrary modes. Its first strict audit FAILED on the printing-reference
index; no notification migration was authored or applied. Source remains408files.
Preparation is consumed; preserve232xx and all preceding projects. Fresh readback
now proves20260920095000 recorded/valid after the catalog build recovered. Exact
applied-ledger source recovery precedes further schema work; no index reapply.
