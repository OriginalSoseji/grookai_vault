# External Mapping Alias Sidecar Schema Plan V1

No-write, no-migration schema plan for preserving useful source aliases before future external mapping cleanup.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Sidecar created: false
- DDL executed: false

## Proposed Table

`public.external_mapping_aliases`

## Readiness Projection

| metric | value |
| --- | --- |
| sidecar_ready_groups | 99 |
| projected_sidecar_alias_rows | 214 |
| projected_canonical_mapping_deactivations_after_sidecar | 214 |
| blocked_groups | 70 |
| by_alias_kind | {"battle_academy_alias":168,"prize_pack_alias":34,"prerelease_alias":6,"product_alias":4,"league_alias":2} |
| by_source | {"justtcg":214} |

## Proposed Columns

| column | type | role |
| --- | --- | --- |
| id | uuid | sidecar row identity |
| canonical_card_print_id | uuid | canonical Grookai card owner |
| canonical_external_mapping_id | bigint nullable | canonical active external_mappings owner row when known |
| source | text | source namespace such as justtcg |
| alias_external_id | text | preserved upstream alias identifier |
| alias_kind | text | product/deck/prize-pack/suffix/text category |
| alias_status | text | active, retired, superseded, blocked |
| source_domain | text nullable | identity domain at preservation time |
| evidence_reason | text | why the alias was preserved |
| preserved_from_mapping_id | bigint nullable | external_mappings row that would later be safe to deactivate |
| created_from_audit | text | audit package provenance |
| metadata | jsonb | non-authoritative source context |
| active | boolean | active sidecar alias flag |
| created_at | timestamptz | creation timestamp |
| updated_at | timestamptz | update timestamp |

## Proposed Constraints

- primary key on id
- foreign key canonical_card_print_id -> public.card_prints(id)
- foreign key canonical_external_mapping_id -> public.external_mappings(id) on delete set null
- foreign key preserved_from_mapping_id -> public.external_mappings(id) on delete set null
- partial unique index on (source, alias_external_id) where active = true

## Draft DDL

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

## Draft Insert Shape

```sql
-- DRAFT ONLY. Populate only after schema approval.
insert into public.external_mapping_aliases (
  canonical_card_print_id,
  canonical_external_mapping_id,
  source,
  alias_external_id,
  alias_kind,
  alias_status,
  source_domain,
  evidence_reason,
  preserved_from_mapping_id,
  created_from_audit,
  metadata,
  active
) values (...);
```

## Migration Prerequisites

- Review and approve table name and FK behavior.
- Confirm bigint matches live external_mappings.id type.
- Confirm gen_random_uuid() availability in the live database.
- Confirm RLS/permission posture before public/runtime exposure.
- Generate migration only after explicit approval.
- Run guarded dry-run insert for the 214 projected aliases before any external_mappings deactivation package.

## Future Apply Order

1. Create sidecar schema by migration after approval.
2. Insert projected sidecar alias rows in guarded dry-run transaction.
3. Verify sidecar row count and unique source/alias constraints.
4. Only then prepare deactivation package for preserved duplicate external_mappings rows.
5. Verify external_mappings_source_card_duplicates falls from 169 to the remaining blocked groups only.

## Blocked Until Later

- 52 suffix/base source-owner policy groups
- 14 non-product alias groups
- 3 groups without a unique canonical source id
- 1 Pocket product alias group

Fingerprint: `c6e7997e6862d073933bcaad000751e2bb97eeae4f683d238769c2574adaebaf`
