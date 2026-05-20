# CAMEO_SEARCH_V1 Phase 4 Promotion Design

Date: 2026-05-20

## Scope

Promotion design only. No migration file, DB write, search integration, app change, or resolver change is authorized by this document.

This phase defines the eventual table and write boundary for cameo search promotion after Phase 3 proved deterministic matches.

## Current Evidence

Source audit:

- Data rows: `3,875`
- Pokemon cameo rows: `3,336`
- Trainer cameo rows: `539`
- Phase 1 match-ready rows: `2,393`

Phase 3 alias replay:

- `APPROVED_MATCH`: `1,360`
- `NEEDS_MANUAL_REVIEW`: `546`
- `BLOCKED_SET_ALIAS_MISSING`: `396`
- `BLOCKED_CARD_NOT_FOUND`: `44`
- `BLOCKED_AMBIGUOUS_CARD`: `47`

Phase 3 source-owned alias lift:

- Approved match lift: `+106`
- Set-alias-missing reduction: `168`

## Promotion Eligibility

Only Phase 3 rows classified as:

```text
APPROVED_MATCH
```

are eligible for future promotion.

The following rows must remain blocked:

- `NEEDS_MANUAL_REVIEW`
- `BLOCKED_SET_ALIAS_MISSING`
- `BLOCKED_CARD_NOT_FOUND`
- `BLOCKED_AMBIGUOUS_CARD`
- all Phase 1 rows not classified as `SOURCE_ROW_READY_FOR_CARD_MATCH_DRY_RUN`
- all Japanese promo-family rows intentionally left unmapped
- all language-scope rows until a language-scope review exists

## Recommended Schema

Future migration shape:

```sql
create table public.card_print_cameos (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  cameo_subject_type text not null,
  cameo_subject_name text not null,
  pokemon_ndex text,
  pokemon_species_id uuid references public.pokemon_species(id) on delete restrict,
  trainer_key text,
  source_name text not null,
  source_url text not null,
  source_tab text not null,
  source_gid text not null,
  source_row_index integer not null,
  source_row_hash text not null,
  card_name_raw text not null,
  set_name_raw text not null,
  number_raw text not null,
  notes_raw text,
  cameo_qualifiers text[] not null default '{}',
  match_status text not null,
  match_confidence text not null default 'deterministic',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_print_cameos_subject_type_check
    check (cameo_subject_type in ('pokemon', 'trainer')),
  constraint card_print_cameos_match_status_check
    check (match_status = 'APPROVED_MATCH')
);
```

Recommended indexes:

```sql
create unique index card_print_cameos_source_row_hash_key
on public.card_print_cameos(source_row_hash);

create index card_print_cameos_card_print_id_idx
on public.card_print_cameos(card_print_id)
where active;

create index card_print_cameos_subject_idx
on public.card_print_cameos(cameo_subject_type, lower(cameo_subject_name))
where active;

create index card_print_cameos_species_id_idx
on public.card_print_cameos(pokemon_species_id)
where active and pokemon_species_id is not null;
```

RLS direction:

- `anon` and `authenticated`: select active rows only through a public read view.
- `service_role`: full maintenance authority.
- No client-side insert/update/delete policy.

## Public Read Model

Recommended future view:

```sql
create view public.v_card_print_cameos_public_v1 as
select
  cpc.card_print_id,
  cp.gv_id,
  cp.name as card_name,
  cp.set_code,
  s.name as set_name,
  cp.number,
  cpc.cameo_subject_type,
  cpc.cameo_subject_name,
  cpc.pokemon_ndex,
  cpc.notes_raw,
  cpc.cameo_qualifiers,
  cpc.source_name
from public.card_print_cameos cpc
join public.card_prints cp on cp.id = cpc.card_print_id
left join public.sets s on s.id = cp.set_id
where cpc.active
  and cp.gv_id is not null;
```

The public view must not expose internal row ids by default.

## Future Search Integration

Search should index cameo text as secondary match context:

```text
cameo:<subject>
cameo pokemon:<subject>
cameo trainer:<subject>
<subject> cameo
<qualifier> cameo
```

Search result behavior:

- return parent `card_prints.gv_id`
- show match reason such as `Cameo: Bulbasaur`
- include qualifier only when useful, such as `silhouette`
- never route to `/card/<cameo>`
- never expose raw UUIDs

## Future Write Plan Shape

The eventual apply script must:

1. Load Phase 3 JSON evidence.
2. Select only rows with `classification = APPROVED_MATCH`.
3. Re-check every target `card_print_id` still exists.
4. Re-check every target parent still has non-null `gv_id`.
5. Re-check source row hashes are unique.
6. Re-check no target `source_row_hash` already exists in `card_print_cameos`.
7. Insert exactly the approved row count, currently `1,360`, unless a fresh replay changes the count and the audit is refreshed.
8. Commit only if the inserted row count equals the approved target count.

Write boundary:

```text
insert into public.card_print_cameos only
```

No updates to:

- `card_prints`
- `card_printings`
- `pokemon_species`
- `card_print_species`
- pricing tables
- scanner tables
- warehouse tables

## Rollback Plan

Rollback must be source-hash scoped:

```sql
delete from public.card_print_cameos
where source_name = 'rotomamiti_cameo_database'
  and source_row_hash = any(<approved_source_hashes>);
```

Rollback must verify:

- deleted rows count equals inserted rows count
- no non-cameo tables changed
- search falls back to previous behavior

## Post-Apply Verification Plan

If a later phase applies this design, verify:

- inserted cameo rows = approved candidate count
- blocked rows inserted = `0`
- `card_prints` row count unchanged
- `card_printings` row count unchanged
- Species Dex denominators unchanged
- Japanese promo-family rows remain absent
- public view exposes only active rows with parent `gv_id`
- search result routes remain parent `gv_id` routes

## Blocked Language Scope

These source families remain blocked:

- `SM-P Promos`
- `XY-P Promos`
- `SV-P Promos`
- `S-P Promos`
- `BW-P Promos`
- `DPt-P Promos`
- `PCG-P Promos`

They must not be promoted through English promo aliases without a separate language-scope review.

## Decision

Cameo search is worth promoting safely, but only as an additive relationship table and only for the current approved deterministic matches after a fresh pre-apply replay.

Do not apply yet.

## Confirmations

- No DB writes.
- No migrations.
- No search integration.
- No app changes.
- No pricing changes.
- No scanner changes.
- No Species Dex denominator changes.
- No public route changes.
