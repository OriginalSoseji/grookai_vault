# External Mapping Alias Sidecar Migration Readiness V1

Operator-ready readiness packet for a future sidecar schema migration. This report does not create a migration and does not touch the database.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Sidecar created: false
- DDL executed: false

## Package

| metric | value |
| --- | --- |
| package_id | EXTMAP-ALIAS-01A-SIDECAR-SCHEMA-CREATE |
| migration_name | create_external_mapping_aliases_sidecar_v1 |
| table | public.external_mapping_aliases |
| draft_sql_hash_sha256 | f8181087b137446ba104e887ee742a6282a0b31681fd75b3e7448d047a22c94d |
| fingerprint_sha256 | d406c2026d841200bcc4a12796dbc1f0e8b9421cad398753cd4ec0c86287f0f5 |

## Readiness Checks

| check | status | evidence |
| --- | --- | --- |
| external_mappings_id_type | pass | Baseline schema defines public.external_mappings.id as bigint. |
| card_print_owner_fk_shape | pass | canonical_card_print_id references public.card_prints(id), matching existing canonical owner table. |
| gen_random_uuid_available | pass | Existing migrations already use gen_random_uuid() for uuid primary keys. |
| source_alias_uniqueness | pass | Draft includes partial unique index on source + alias_external_id where active = true. |
| migration_file_created | not_created | This packet is an audit artifact only; no supabase/migrations file was created. |
| rls_policy | defer | No runtime/public exposure is authorized in the schema package; RLS/read policy should be decided before app usage. |

## Readiness Projection

| metric | value |
| --- | --- |
| sidecar_ready_groups | 99 |
| projected_sidecar_alias_rows | 214 |
| projected_canonical_mapping_deactivations_after_sidecar | 214 |
| blocked_groups | 70 |
| by_alias_kind | {"battle_academy_alias":168,"prize_pack_alias":34,"prerelease_alias":6,"product_alias":4,"league_alias":2} |
| by_source | {"justtcg":214} |

## Draft SQL

```sql
-- DRAFT ONLY. Do not run from this report.
create table public.external_mapping_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_card_print_id uuid not null references public.card_prints(id) on delete cascade,
  canonical_external_mapping_id bigint null references public.external_mappings(id) on delete set null,
  source text not null,
  alias_external_id text not null,
  alias_kind text not null,
  alias_status text not null default 'active',
  source_domain text null,
  evidence_reason text not null,
  preserved_from_mapping_id bigint null references public.external_mappings(id) on delete set null,
  created_from_audit text not null,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index external_mapping_aliases_active_source_alias_uidx
  on public.external_mapping_aliases (source, alias_external_id)
  where active = true;

create index external_mapping_aliases_card_print_idx
  on public.external_mapping_aliases (canonical_card_print_id);

create index external_mapping_aliases_mapping_idx
  on public.external_mapping_aliases (canonical_external_mapping_id);

create index external_mapping_aliases_kind_idx
  on public.external_mapping_aliases (alias_kind)
  where active = true;
```

## Future Migration Guardrails

- Create only the sidecar table and indexes.
- Do not insert alias rows in the schema migration.
- Do not deactivate external_mappings in the schema migration.
- Do not alter card_prints, card_printings, card_print_identity, or Master Index tables.
- Do not add public app reads until RLS/API policy is explicitly approved.
- Run post-migration existence and index checks before any data package.

## Future Data Package After Schema

| metric | value |
| --- | --- |
| projected_alias_rows | 214 |
| source | justtcg |
| allowed_alias_kinds | battle_academy_alias, prize_pack_alias, prerelease_alias, product_alias, league_alias |

## Approval Boundary

Current packet authorizes: nothing; audit artifact only

Future schema approval would authorize: creating the sidecar table and indexes only

Future schema approval would not authorize:

- alias row inserts
- external_mappings deactivation
- cleanup
- app exposure
- parent or child card writes
