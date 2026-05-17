# Supabase Migration Drift Audit - 2026-05-16

Scope: read-only audit of local `supabase/migrations` versus remote `supabase_migrations.schema_migrations`.

No remote writes, repairs, pushes, schema changes, or data changes were performed.

## Initial Result

Strict preflight fails because the remote migration ledger has versions that local does not.

Counts:

| Check | Count |
| --- | ---: |
| Local migration files | 198 |
| Local migration versions | 198 |
| Remote migration rows | 201 |
| Remote migration versions | 201 |
| Shared versions | 198 |
| Local-only versions | 0 |
| Remote-only versions | 3 |
| Duplicate local versions | 0 |
| Duplicate remote versions | 0 |

Remote-only versions:

| Version | Remote name | Meaning |
| --- | --- | --- |
| `20260427090000` | `phase7_fingerprint_index_v1` | Creates `public.card_fingerprint_index` and indexes. |
| `20260428234000` | `phase8_embedding_lookup_foundation_v1` | Creates/ensures `public.card_embeddings` and intermediate `embedding_lookup_v1`. |
| `20260429002000` | `embedding_lookup_v1_pgvector_rpc` | Installs `vector` and replaces `embedding_lookup_v1` with pgvector-backed version. |

`pwsh -NoProfile -File scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema` failed with those same three remote-only IDs.

## Resolution Applied

The three missing local migration files were restored from the remote migration ledger statements:

- `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql`
- `supabase/migrations/20260428234000_phase8_embedding_lookup_foundation_v1.sql`
- `supabase/migrations/20260429002000_embedding_lookup_v1_pgvector_rpc.sql`

Post-fix ledger verification:

| Check | Count |
| --- | ---: |
| Local migration files | 201 |
| Remote migration rows | 201 |
| Shared versions | 201 |
| Local-only versions | 0 |
| Remote-only versions | 0 |
| Duplicate local versions | 0 |
| Duplicate remote versions | 0 |

`supabase migration list --linked` now shows the three restored versions aligned locally and remotely:

- `20260427090000 | 20260427090000`
- `20260428234000 | 20260428234000`
- `20260429002000 | 20260429002000`

`scripts/migration_preflight_strict.ps1 -Phase AuditLinkedSchema` now passes the linked ledger step. Its linked schema diff step could not be completed in this environment because `supabase db diff --linked` hung after creating a local shadow Postgres container. The orphaned shadow containers from the failed verification runs were removed. No remote database writes were performed.

## Live Object Evidence

Remote objects created by these migrations are present:

- `public.card_fingerprint_index` exists.
- `public.card_fingerprint_index` has 613 rows, all `source_type = exact`.
- `public.card_embeddings` exists and has 613 rows.
- `public.embedding_lookup_v1(double precision[], text, integer)` exists.
- `public.embedding_lookup_v1` final return shape is `TABLE(card_print_id uuid, model text, distance double precision)`.
- `vector` extension exists in schema `extensions`.

## Secondary Findings

Two historical local migrations use non-14-digit versions:

- `20251223_legacy_remote_stub.sql`
- `20260214____vault_add_or_increment_auth_guard.sql`

They are present both locally and remotely, so they are not the current drift. Do not rename them casually; renaming an applied migration would create new drift.

The older `scripts/drift_guard.ps1` helper currently fails to parse in PowerShell. The authoritative gate used for this audit was `scripts/migration_preflight_strict.ps1` plus direct read-only catalog queries.

## Fix Guidance

Do not run `supabase db push`, `supabase db pull`, or `supabase migration repair` as the first move.

The remote ledger already says these three migrations are applied. The local repo was missing the files. The narrow fix was to restore local migration files with the exact remote versions:

- `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql`
- `supabase/migrations/20260428234000_phase8_embedding_lookup_foundation_v1.sql`
- `supabase/migrations/20260429002000_embedding_lookup_v1_pgvector_rpc.sql`

The bodies were reconstructed from the remote `supabase_migrations.schema_migrations.statements` entries and reviewed against the archived scanner audit references before committing.

Before pushing additional migration work:

1. Run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema`.
2. Run `supabase migration list --linked` and confirm no remote-only rows remain.
3. Run `supabase db reset --local` to prove fresh replay.
4. If cleanup is desired for the Phase 7/8 scanner experiment, do it later with a new forward-only cleanup migration. Do not delete remote migration history.

## Do Not Do

- Do not delete rows from `supabase_migrations.schema_migrations`.
- Do not mark these remote-only versions reverted.
- Do not use a new `db pull` reconciliation migration as the primary fix; it would leave the remote-only ledger mismatch intact.
- Do not rename historical applied migration files.
- Do not push additional migrations until strict preflight passes.
